import type { APIRoute } from 'astro';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';

// Bump this whenever scripts/extract_face_metrics.py SCHEMA_VERSION changes.
// Rows older than this are excluded from search until reprocessed.
const CURRENT_METRICS_VERSION = 16;

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

// Numeric attributes that are stored 0..1 normalized in face_metrics.
const NUMERIC_KEYS = [
  'jawWidth','cheekboneProminence','fwhr','midfaceRatio','lowerThirdWidth',
  'gonialAngle','ramusLength','chinProjection','browRidge','frankfurtRecession',
  'eyeSpacing','canthalTilt','eyebrowDensity','eyebrowPosition','eyebrowTilt',
  'lipFullness','vermillionRatio','skinTone','jawlineVisibility',
] as const;

const CATEGORICAL_HARD_FILTERS = ['eyeColor', 'hairColor', 'eyeShape'] as const;

type Metrics = Record<string, number | string | undefined>;

interface CreatorRow {
  id: number | string;
  username: string;
  name?: string;
  avatar?: string;
  header?: string;
  isverified?: boolean;
  subscribeprice?: number | null;
  favoritedcount?: number | null;
  face_metrics?: Metrics | null;
  score?: number;
}

interface ReqBody {
  target?: Metrics;
  weights?: Record<string, number>;
  filters?: {
    verified?: boolean;
    maxPrice?: number | null;
    eyeColor?: string;
    hairColor?: string;
    eyeShape?: string;
  };
  limit?: number;
}

// 60s in-memory cache, keyed by hash(body+limit).
const cache = new Map<string, { ts: number; payload: string }>();
const CACHE_TTL_MS = 60_000;

function hashBody(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

function score(target: Metrics, candidate: Metrics, weights: Record<string, number>): { score: number; nFeatures: number } {
  let sum = 0;
  let nFeatures = 0;
  for (const k of NUMERIC_KEYS) {
    // Skip features the user didn't specify — don't penalize candidates for
    // attributes the user doesn't care about. Only score on user-specified
    // numerics OR features with explicit non-default weight.
    const tRaw = target[k];
    const cRaw = candidate[k];
    if (tRaw === undefined || cRaw === undefined) continue;
    const tv = Number(tRaw);
    const cv = Number(cRaw);
    if (!Number.isFinite(tv) || !Number.isFinite(cv)) continue;
    const w = weights[k] ?? 1.0;
    const d = tv - cv;
    sum += w * d * d;
    nFeatures += 1;
  }
  const catPenalty = weights._categorical ?? 0.25;
  for (const k of ['eyeColor', 'hairColor'] as const) {
    const tv = target[k];
    const cv = candidate[k];
    if (!tv) continue;
    // Treat missing / "unknown" candidate values as no-info, not a mismatch.
    if (cv === undefined || cv === null || cv === '' || cv === 'unknown') continue;
    if (cv !== tv) {
      sum += catPenalty;
      nFeatures += 1;
    } else {
      nFeatures += 1;
    }
  }
  for (const k of ['eyeShape', 'hairTexture'] as const) {
    const tv = target[k];
    const cv = candidate[k];
    if (!tv) continue;
    if (cv === undefined || cv === null || cv === '' || cv === 'unknown') continue;
    if (cv !== tv) {
      sum += catPenalty * 0.5;
      nFeatures += 1;
    } else {
      nFeatures += 1;
    }
  }
  return { score: sum, nFeatures };
}

function shape(c: CreatorRow & { _nFeatures?: number }) {
  // matchPct: lower score = better. We normalize by number of compared
  // features so a 1-feature query and a 19-feature query produce comparable
  // percentages. mean squared diff ~0 -> 99%, ~0.4 -> ~40%.
  const s = c.score ?? 0;
  const n = c._nFeatures ?? 1;
  const meanSq = n > 0 ? s / n : 0;
  // Stretch: meanSq 0.0 -> 99, 0.05 -> 82, 0.15 -> 68, 0.4 -> 40.
  const matchPct = Math.round(Math.max(40, Math.min(99, 99 - Math.sqrt(meanSq) * 95)));
  return {
    id:             c.id,
    username:       c.username,
    name:           c.name,
    avatar:         c.avatar,
    header:         c.header,
    isVerified:     c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
    matchPct,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  let body: ReqBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const target = body.target ?? {};
  const weights = body.weights ?? {};
  const filters = body.filters ?? {};
  const limit = Math.max(1, Math.min(48, body.limit ?? 24));

  const cacheKey = hashBody(JSON.stringify({ target, weights, filters, limit }));
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return new Response(cached.payload, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  // --- 1) Try the Postgres RPC -------------------------------------------
  try {
    const rpcBody = {
      target,
      weights,
      pool_size:        2000,
      match_count:      limit,
      filter_verified:  filters.verified ?? false,
      filter_max_price: filters.maxPrice ?? null,
      filter_eye_color: filters.eyeColor ?? null,
      filter_hair_color: filters.hairColor ?? null,
      filter_eye_shape: filters.eyeShape ?? null,
      min_metrics_version: CURRENT_METRICS_VERSION,
    };
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_face_metrics`, {
      method: 'POST',
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
      body: JSON.stringify(rpcBody),
    });
    if (rpc.ok) {
      const rows = (await rpc.json()) as CreatorRow[];
      if (Array.isArray(rows) && rows.length > 0) {
        const payload = JSON.stringify({
          results: applySponsorOverrides(rows.map(shape)),
          mode: 'rpc',
        });
        cache.set(cacheKey, { ts: Date.now(), payload });
        return new Response(payload, {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
        });
      }
    }
  } catch {
    // fall through
  }

  // --- 2) Fallback: pull pool, score in Node -----------------------------
  // We filter on face_metrics_version (which already excludes nulls). We do
  // NOT add face_metrics IS NOT NULL — that combined with the version
  // predicate plus the favoritedcount sort exceeds Postgres statement timeout.
  // Sorting by id asc is cheap (PK index) and we accept that the candidate
  // pool isn't strictly the most-favorited; final ranking happens in Node.
  const params = new URLSearchParams({
    select:          'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount,face_metrics',
    'face_metrics_version': `eq.${CURRENT_METRICS_VERSION}`,
    order:           'favoritedcount.desc.nullslast',
    limit:           '1500',
  });
  if (filters.verified) params.append('isverified', 'eq.true');
  if (filters.maxPrice != null) params.append('subscribeprice', `lte.${filters.maxPrice}`);
  for (const k of CATEGORICAL_HARD_FILTERS) {
    const v = filters[k];
    if (v) params.append(`face_metrics->>${k}`, `eq.${encodeURIComponent(v)}`);
  }

  // 8s upper bound on the Supabase round-trip; if it's slower we'd rather
  // return a partial result than 502.
  const ctrl = new AbortController();
  const tId = setTimeout(() => ctrl.abort(), 8000);
  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(tId);
    // Retry without order clause (the heavy part). Postgres can pick a faster
    // plan when it doesn't have to sort the full filtered set.
    const params2 = new URLSearchParams(params);
    params2.delete('order');
    resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params2}`, {
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
    });
  }
  clearTimeout(tId);
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Supabase fetch failed', status: resp.status }), {
      status: 502,
    });
  }
  let pool = (await resp.json()) as CreatorRow[];

  // Heuristic: exclude likely-male creators. The site doesn't store gender,
  // but on OnlyFans men tend to have markedly higher fwhr (face width-to-
  // height), jawWidth, gonialAngle, and visible jawline. We score each
  // candidate's "masculinity" 0..1 and drop the top tail. Users can opt out
  // by setting filters.allowMale=true (not exposed in UI yet).
  const allowMale = (body.filters as { allowMale?: boolean } | undefined)?.allowMale === true;
  if (!allowMale) {
    pool = pool.filter(c => {
      const m = c.face_metrics ?? {};
      const fwhr = Number(m.fwhr ?? 0.5);
      const jaw  = Number(m.jawWidth ?? 0.5);
      const jvis = Number(m.jawlineVisibility ?? 0.5);
      const gon  = Number(m.gonialAngle ?? 0.5);
      // Each term contributes if clearly above female median (~0.5).
      const masc = (fwhr - 0.5) * 1.4
                 + (jaw  - 0.5) * 1.2
                 + (jvis - 0.5) * 1.4
                 + (gon  - 0.5) * 0.6;
      return masc < 0.55; // tune threshold
    });
  }

  if (pool.length === 0) {
    return new Response(JSON.stringify({
      results: [],
      mode: 'empty',
      hint: 'No creators have face_metrics yet. Run scripts/extract_face_metrics.py.',
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const scored = pool
    .map(c => {
      const { score: s, nFeatures } = score(target, c.face_metrics ?? {}, weights);
      return { ...c, score: s, _nFeatures: nFeatures };
    })
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, limit);

  const payload = JSON.stringify({
    results: applySponsorOverrides(scored.map(shape)),
    mode: 'fallback',
    pool_size: pool.length,
  });
  cache.set(cacheKey, { ts: Date.now(), payload });
  return new Response(payload, {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
