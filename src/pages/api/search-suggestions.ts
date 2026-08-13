import type { APIRoute } from 'astro';

export const prerender = false;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 64;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 6;
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 250;
const RPC_TIMEOUT_MS = 3_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 90;
const MAX_RATE_KEYS = 2_000;

interface RawSuggestionRow {
  id?: number | string;
  username?: string;
  name?: string | null;
  avatar?: string | null;
  isverified?: boolean | null;
  favoritedcount?: number | string | null;
}

export interface CreatorSuggestion {
  id: number | string;
  username: string;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
  favoritedCount: number;
  profileUrl: string;
}

const cache = new Map<string, { creators: CreatorSuggestion[]; expiresAt: number }>();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = request.headers.get('x-real-ip')?.trim() || forwarded;
  if (!key) return false;

  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (rateBuckets.size >= MAX_RATE_KEYS) {
      for (const [candidate, bucket] of rateBuckets) {
        if (bucket.resetAt <= now) rateBuckets.delete(candidate);
      }
      if (rateBuckets.size >= MAX_RATE_KEYS) {
        const oldest = rateBuckets.keys().next().value as string | undefined;
        if (oldest) rateBuckets.delete(oldest);
      }
    }
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > RATE_LIMIT;
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function normalizeQuery(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, ' ');
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

function mapSuggestion(row: RawSuggestionRow): CreatorSuggestion | null {
  const username = typeof row.username === 'string' ? row.username.trim() : '';
  if (!username || (typeof row.id !== 'number' && typeof row.id !== 'string')) return null;

  const favoriteValue = Number(row.favoritedcount ?? 0);
  return {
    id: row.id,
    username,
    name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null,
    avatar: typeof row.avatar === 'string' && row.avatar.trim() ? row.avatar : null,
    isVerified: row.isverified === true,
    favoritedCount: Number.isFinite(favoriteValue) ? favoriteValue : 0,
    profileUrl: `https://onlyfans.com/${encodeURIComponent(username)}`,
  };
}

function setCached(key: string, creators: CreatorSuggestion[]): void {
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { creators, expiresAt: Date.now() + CACHE_TTL_MS });
}

export const GET: APIRoute = async ({ url, request }) => {
  const rawQuery = url.searchParams.get('q') ?? '';

  // Keep encoded control characters out of logs, caches, and the database call.
  if (/[\u0000-\u001f\u007f]/.test(rawQuery)) {
    return json({ error: 'Invalid search query' }, 400, { 'Cache-Control': 'no-store' });
  }

  const query = normalizeQuery(rawQuery);
  const queryLength = Array.from(query).length;
  if (queryLength > MAX_QUERY_LENGTH) {
    return json(
      { error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` },
      400,
      { 'Cache-Control': 'no-store' },
    );
  }

  // One-character input is handled by local category suggestions in the browser.
  // It intentionally performs no database work.
  if (queryLength < MIN_QUERY_LENGTH) {
    return json(
      { query, creators: [] },
      200,
      { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    );
  }

  if (isRateLimited(request)) {
    return json(
      { error: 'Too many suggestion requests' },
      429,
      { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    );
  }

  const limit = parseLimit(url.searchParams.get('limit'));
  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return json(
      { query, creators: cached.creators },
      200,
      {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    );
  }
  if (cached) cache.delete(cacheKey);

  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Search is temporarily unavailable' }, 500, { 'Cache-Control': 'no-store' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_search_creator_suggestions`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Accept-Profile': 'public',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_query: query, p_limit: limit }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return json({ error: 'Search is temporarily unavailable' }, 502, { 'Cache-Control': 'no-store' });
    }

    const body: unknown = await response.json();
    if (!Array.isArray(body)) {
      return json({ error: 'Search is temporarily unavailable' }, 502, { 'Cache-Control': 'no-store' });
    }

    const creators = body
      .slice(0, limit)
      .map(row => mapSuggestion(row as RawSuggestionRow))
      .filter((row): row is CreatorSuggestion => row !== null);

    setCached(cacheKey, creators);
    return json(
      { query, creators },
      200,
      { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    );
  } catch {
    return json({ error: 'Search is temporarily unavailable' }, 502, { 'Cache-Control': 'no-store' });
  } finally {
    clearTimeout(timeoutId);
  }
};
