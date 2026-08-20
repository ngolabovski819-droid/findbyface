// Fetch orchestrator for placement-aware scopes ('home', 'category:<slug>').
// Fetches organic results with pinned+excluded usernames excluded at the DB level (so
// pagination offsets stay aligned and nothing shows twice), fetches pinned records
// separately by exact username, and slots them into their exact global 1-based position.
//
// Resilience: if a filtered (category) organic query comes back empty, retries once
// without the filter terms (general "popular" list) so the page always shows a
// reasonable amount of content instead of just a lone pinned/sponsored card.
import { getPlacement } from '../config/placements';

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
});

interface RawCreatorRow {
  id: number | string;
  username: string;
  name?: string;
  avatar?: string;
  header?: string;
  isverified?: boolean;
  subscribeprice?: number | null;
  favoritedcount?: number | null;
}

export interface MappedCreator {
  id: number | string;
  username: string;
  name?: string;
  avatar?: string;
  header?: string;
  isVerified?: boolean;
  subscribePrice?: number | null;
  favoritedCount?: number | null;
  sponsored?: boolean;
}

function mapRow(c: RawCreatorRow): MappedCreator {
  return {
    id: c.id,
    username: c.username,
    name: c.name,
    avatar: c.avatar,
    header: c.header,
    isVerified: c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
  };
}

function supabaseCreds() {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
  return { SUPABASE_URL, SUPABASE_KEY };
}

interface FetchOrganicParams {
  termsOr?: string[];
  excludeUsernames?: string[];
  /** Omitted → 'favoritedcount.desc'. Pass `null` to send NO order clause at all —
   * some category term sets only complete without one (see src/lib/categoryStatic.ts). */
  order?: string | null;
  limit: number;
  offset: number;
  timeoutMs?: number;
  /** Mirrors the plain-search filters in src/pages/api/search.ts — only 'onlyfans-search'
   * scope actually sets these today; 'home'/'category:<slug>' never pass them. */
  verified?: boolean;
  bundles?: boolean;
  price?: string;
}

interface FetchOrganicResult {
  rows: MappedCreator[];
  total: number;
  failed: boolean;
}

// Swallows failures internally — callers decide whether to retry/fallback.
export async function fetchOrganicCreators(params: FetchOrganicParams): Promise<FetchOrganicResult> {
  const { SUPABASE_URL, SUPABASE_KEY } = supabaseCreds();
  if (!SUPABASE_URL || !SUPABASE_KEY) return { rows: [], total: 0, failed: true };

  const { termsOr, excludeUsernames, order, limit, offset, timeoutMs = 8000, verified, bundles, price } = params;
  if (limit <= 0) return { rows: [], total: 0, failed: false };

  const qp = new URLSearchParams();
  qp.set('select', 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount');
  // `null` means "no order clause" — deliberately distinct from undefined (use the default).
  if (order !== null) qp.set('order', order ?? 'favoritedcount.desc');
  qp.set('limit', String(limit));
  qp.set('offset', String(offset));

  if (termsOr && termsOr.length) {
    const exprs = termsOr.flatMap(t => [
      `username.ilike.*${t}*`,
      `name.ilike.*${t}*`,
      `about.ilike.*${t}*`,
    ]);
    qp.set('or', `(${exprs.join(',')})`);
  }
  if (excludeUsernames && excludeUsernames.length) {
    qp.set('username', `not.in.(${excludeUsernames.join(',')})`);
  }
  if (verified) qp.set('isverified', 'eq.true');
  if (bundles) qp.set('bundle1_price', 'not.is.null');
  if (price === '0') qp.set('subscribeprice', 'eq.0');
  else if (price === '5') qp.set('subscribeprice', 'lte.5');
  else if (price === '10') qp.set('subscribeprice', 'lte.10');

  const ctrl = new AbortController();
  const tId = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${qp}`, {
      headers: { ...SUPABASE_HEADERS(SUPABASE_KEY), Prefer: 'count=estimated' },
      signal: ctrl.signal,
    });
    clearTimeout(tId);
    if (!resp.ok) return { rows: [], total: 0, failed: true };
    const raw: RawCreatorRow[] = await resp.json();
    const cr = resp.headers.get('Content-Range') ?? '';
    const total = parseInt(cr.split('/')[1] ?? '0') || 0;
    return { rows: raw.map(mapRow), total, failed: false };
  } catch {
    clearTimeout(tId);
    return { rows: [], total: 0, failed: true };
  }
}

// Cached count of $0-subscription creators, for the site-wide promo strip.
// Base.astro renders on every page, so this must never be a per-request query —
// one estimated-count call per TTL per server instance is the whole budget.
let freeCountCache: { value: number; expires: number } | null = null;
const FREE_COUNT_TTL_MS = 10 * 60 * 1000;

export async function fetchFreeCreatorCount(): Promise<number | null> {
  if (freeCountCache && freeCountCache.expires > Date.now()) return freeCountCache.value;

  const { SUPABASE_URL, SUPABASE_KEY } = supabaseCreds();
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const qp = new URLSearchParams();
  qp.set('select', 'id');
  qp.set('subscribeprice', 'eq.0');
  qp.set('limit', '1');

  const ctrl = new AbortController();
  const tId = setTimeout(() => ctrl.abort(), 3000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${qp}`, {
      headers: { ...SUPABASE_HEADERS(SUPABASE_KEY), Prefer: 'count=estimated' },
      signal: ctrl.signal,
    });
    clearTimeout(tId);
    if (!resp.ok) return freeCountCache?.value ?? null;
    const total = parseInt((resp.headers.get('Content-Range') ?? '').split('/')[1] ?? '0') || 0;
    if (!total) return freeCountCache?.value ?? null;
    freeCountCache = { value: total, expires: Date.now() + FREE_COUNT_TTL_MS };
    return total;
  } catch {
    clearTimeout(tId);
    // Serve the last known good value rather than hiding the strip on a blip.
    return freeCountCache?.value ?? null;
  }
}

export interface TopCreatorRow extends MappedCreator {
  about?: string | null;
}

// Dedicated query for the category-page "Best Creators" showcase: top N by real
// favorite count, with the `about` bio column included (used to quote a short,
// real excerpt in the creator's own words rather than inventing biographical
// claims). Deliberately bypasses resolvePlacements/sponsored-slot logic — this
// list must be pure organic ranking, matching the "ranked by real engagement,
// not hand-picked" claim made in the copy that renders it.
export async function fetchTopCreatorsForCategory(termsOr: string[], limit = 10): Promise<TopCreatorRow[]> {
  const { SUPABASE_URL, SUPABASE_KEY } = supabaseCreds();
  if (!SUPABASE_URL || !SUPABASE_KEY || !termsOr.length) return [];

  const qp = new URLSearchParams();
  qp.set('select', 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount,about');
  qp.set('order', 'favoritedcount.desc');
  qp.set('limit', String(limit));
  const exprs = termsOr.flatMap(t => [
    `username.ilike.*${t}*`,
    `name.ilike.*${t}*`,
    `about.ilike.*${t}*`,
  ]);
  qp.set('or', `(${exprs.join(',')})`);

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${qp}`, {
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
    });
    if (!resp.ok) return [];
    const raw: (RawCreatorRow & { about?: string | null })[] = await resp.json();
    return raw.map(c => ({ ...mapRow(c), about: c.about }));
  } catch {
    return [];
  }
}

export async function fetchCreatorsByUsernames(usernames: string[]): Promise<MappedCreator[]> {
  if (!usernames.length) return [];
  const { SUPABASE_URL, SUPABASE_KEY } = supabaseCreds();
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const qp = new URLSearchParams();
  qp.set('select', 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount');
  qp.set('username', `in.(${usernames.join(',')})`);

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${qp}`, {
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
    });
    if (!resp.ok) return [];
    const raw: RawCreatorRow[] = await resp.json();
    return raw.map(mapRow);
  } catch {
    return [];
  }
}

// Inserts sponsored creators into a ranked, non-paginated result list (face-search
// matches). Configured positions count sponsored slots, producing an ad/match/ad/match
// sequence. Excluded usernames are dropped from the organic list first so a pinned or
// excluded creator never appears twice or in the wrong slot.
export async function applyFaceSearchPlacements<T extends { username: string; matchPct?: number | null }>(
  results: T[],
): Promise<T[]> {
  const { pinned, excluded } = getPlacement('face-search');
  const dropSet = new Set([...excluded, ...pinned.map(p => p.username)].map(u => u.toLowerCase()));
  const organic = dropSet.size ? results.filter(r => !dropSet.has(r.username.toLowerCase())) : results;

  if (!pinned.length) return organic;

  const pinnedRows = await fetchCreatorsByUsernames(pinned.map(p => p.username));
  const pinnedByUsername = new Map(pinnedRows.map(r => [r.username.toLowerCase(), r]));

  const out = [...organic];
  const sortedPins = [...pinned].sort((a, b) => a.position - b.position);
  for (const pin of sortedPins) {
    const row = pinnedByUsername.get(pin.username.toLowerCase());
    if (!row) continue; // misconfigured username — skip rather than crash the page
    const gridPosition = pin.position * 2 - 1;
    const insertAt = Math.min(Math.max(gridPosition - 1, 0), out.length);
    // matchPct intentionally omitted — this isn't a real similarity score, and the
    // The card-level "Ad" label (driven by `sponsored: true`) discloses the placement.
    out.splice(insertAt, 0, { ...row, sponsored: true } as unknown as T);
  }
  return out;
}

export interface ResolvePlacementsParams {
  page: number;
  pageSize: number;
  termsOr?: string[];
  order?: string;
  verified?: boolean;
  bundles?: boolean;
  price?: string;
  /** Category pages may use a popular-results fallback. Free-text search disables it. */
  allowFallback?: boolean;
}

export interface ResolvePlacementsResult {
  creators: MappedCreator[];
  total: number;
  organicTotal: number;
  sponsoredCount: number;
  usedFallback: boolean;
  failed: boolean;
}

export async function resolvePlacements(
  scope: string,
  params: ResolvePlacementsParams,
): Promise<ResolvePlacementsResult> {
  const {
    page, pageSize, termsOr, order, verified, bundles, price,
    allowFallback = true,
  } = params;
  const { pinned, excluded } = getPlacement(scope);

  const excludeUsernames = Array.from(new Set([...excluded, ...pinned.map(p => p.username)]));

  const windowStart = (page - 1) * pageSize + 1;
  const windowEnd = page * pageSize;
  const pinsInWindow = pinned
    .filter(p => p.position >= windowStart && p.position <= windowEnd)
    .sort((a, b) => a.position - b.position);
  const pinsBeforeWindow = pinned.filter(p => p.position < windowStart).length;

  const organicOffset = windowStart - 1 - pinsBeforeWindow;
  const organicLimit = pageSize - pinsInWindow.length;

  let organic = await fetchOrganicCreators({ termsOr, excludeUsernames, order, limit: organicLimit, offset: organicOffset, verified, bundles, price });
  const matchedOrganicTotal = organic.total;

  let usedFallback = false;
  if (
    allowFallback
    && page === 1
    && termsOr && termsOr.length
    && !organic.failed
    && matchedOrganicTotal === 0
  ) {
    organic = await fetchOrganicCreators({ excludeUsernames, order, limit: organicLimit, offset: organicOffset, verified, bundles, price });
    usedFallback = true;
  }

  const pinnedRows = pinsInWindow.length ? await fetchCreatorsByUsernames(pinsInWindow.map(p => p.username)) : [];
  const pinnedByUsername = new Map(pinnedRows.map(r => [r.username, r]));

  const creators: MappedCreator[] = [];
  let organicIdx = 0;
  for (let pos = windowStart; pos <= windowEnd; pos++) {
    const pin = pinsInWindow.find(p => p.position === pos);
    if (pin) {
      const row = pinnedByUsername.get(pin.username);
      // If the pinned username isn't found in the DB (typo, not yet ingested), leave
      // this slot empty rather than crash the page or misalign the organic cursor.
      if (row) creators.push({ ...row, sponsored: true });
      continue;
    }
    const row = organic.rows[organicIdx++];
    if (row) creators.push(row);
  }

  // Fallback total is capped to what's actually on this page — the real total would be
  // the unfiltered table's row count, which is meaningless under a category heading.
  const total = usedFallback ? creators.length : organic.total + pinned.length;
  const sponsoredCount = creators.reduce((count, creator) => count + (creator.sponsored ? 1 : 0), 0);

  return {
    creators,
    total,
    organicTotal: usedFallback ? 0 : matchedOrganicTotal,
    sponsoredCount,
    usedFallback,
    failed: organic.failed,
  };
}
