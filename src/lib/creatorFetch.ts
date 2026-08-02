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
  order?: string;
  limit: number;
  offset: number;
  timeoutMs?: number;
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

  const { termsOr, excludeUsernames, order, limit, offset, timeoutMs = 8000 } = params;
  if (limit <= 0) return { rows: [], total: 0, failed: false };

  const qp = new URLSearchParams();
  qp.set('select', 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount');
  qp.set('order', order ?? 'favoritedcount.desc');
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
}

export interface ResolvePlacementsResult {
  creators: MappedCreator[];
  total: number;
  usedFallback: boolean;
}

export async function resolvePlacements(
  scope: string,
  params: ResolvePlacementsParams,
): Promise<ResolvePlacementsResult> {
  const { page, pageSize, termsOr, order } = params;
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

  let organic = await fetchOrganicCreators({ termsOr, excludeUsernames, order, limit: organicLimit, offset: organicOffset });

  let usedFallback = false;
  if (termsOr && termsOr.length && organic.rows.length === 0) {
    organic = await fetchOrganicCreators({ excludeUsernames, order, limit: organicLimit, offset: organicOffset });
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

  return { creators, total, usedFallback };
}
