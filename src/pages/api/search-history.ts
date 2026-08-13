import type { APIRoute } from 'astro';
import { extractBearerToken, verifySupabaseUser } from '../../lib/verifyUser';

export const prerender = false;

const SEARCH_TYPES = new Set(['directory', 'creator_face', 'video_face']);
const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BATCH_SIZE = 10;
const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_FILTER_BYTES = 2 * 1024;
const MAX_INCOMING_RESULTS_BYTES = 64 * 1024;
const MAX_RESULTS_BYTES = 32 * 1024;
const MAX_INCOMING_RESULTS = 25;
const MAX_SAVED_RESULTS = 10;
const MAX_RESULT_COUNT = 10_000_000;
const MAX_URL_LENGTH = 2_048;
const RATE_WINDOW_MS = 60_000;
const RATE_BUCKET_MAX = 2_000;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

const ENTRY_FIELDS = new Set([
  'clientSearchId', 'searchType', 'query', 'label', 'resultCount', 'filters', 'results', 'createdAt',
]);
const DIRECTORY_FILTER_FIELDS = new Set(['verified', 'price', 'sort', 'bundles']);
const VIDEO_FILTER_FIELDS = new Set(['indexedVideos', 'elapsedSeconds']);
const DIRECTORY_RESULT_FIELDS = new Set([
  'username', 'name', 'avatar', 'subscribePrice', 'subscribeprice', 'profileUrl',
]);
const CREATOR_RESULT_FIELDS = new Set([...DIRECTORY_RESULT_FIELDS, 'matchPct']);
const VIDEO_RESULT_FIELDS = new Set([
  'videoId', 'externalId', 'title', 'sourceUrl', 'thumbnailUrl', 'durationSeconds',
  'similarity', 'robustSimilarity', 'supportingEmbeddings',
]);

type SearchType = 'directory' | 'creator_face' | 'video_face';

interface IncomingEntry {
  clientSearchId?: unknown;
  searchType?: unknown;
  query?: unknown;
  label?: unknown;
  resultCount?: unknown;
  filters?: unknown;
  results?: unknown;
  createdAt?: unknown;
}

interface SearchHistoryRow {
  id: string;
  client_search_id: string;
  search_type: SearchType;
  query: string | null;
  label: string | null;
  result_count: number;
  filters: Record<string, unknown>;
  results: Record<string, unknown>[];
  created_at: string;
}

interface AuthenticatedContext {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
}

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function withinRateLimit(userId: string, operation: string, maximum: number): boolean {
  const now = Date.now();
  const key = `${operation}:${userId}`;
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (rateBuckets.size >= RATE_BUCKET_MAX) {
      for (const [bucketKey, bucket] of rateBuckets) {
        if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
      }
      if (rateBuckets.size >= RATE_BUCKET_MAX) rateBuckets.delete(rateBuckets.keys().next().value!);
    }
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= maximum) return false;
  existing.count += 1;
  return true;
}

function serviceHeaders(serviceKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
    ...extra,
  };
}

async function authenticate(request: Request): Promise<AuthenticatedContext | Response> {
  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  // SUPABASE_KEY is this project's existing server-only service-role credential.
  // Prefer the explicit name as deployments migrate to it.
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !serviceKey) return json({ error: 'Search history is unavailable' }, 503);

  const user = await verifySupabaseUser(extractBearerToken(request), supabaseUrl, serviceKey);
  if (!user) return json({ error: 'Sign in to access search history' }, 401);
  return { supabaseUrl, serviceKey, userId: user.id };
}

function isResponse(value: AuthenticatedContext | Response): value is Response {
  return value instanceof Response;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: Set<string>, field: string): void {
  const unsupported = Object.keys(value).find(key => !allowed.has(key));
  if (unsupported) throw new Error(`${field} contains unsupported field ${unsupported}`);
}

function cleanText(value: unknown, maxLength: number, field: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be text`);
  const cleaned = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (Array.from(cleaned).length > maxLength) throw new Error(`${field} is too long`);
  return cleaned || null;
}

function validatedCreatedAt(value: unknown): string {
  if (value == null || value === '') return new Date().toISOString();
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('createdAt is invalid');
  const date = new Date(value);
  const timestamp = date.getTime();
  const earliest = Date.UTC(2000, 0, 1);
  if (!Number.isFinite(timestamp) || timestamp < earliest || timestamp > Date.now() + 5 * 60_000) {
    throw new Error('createdAt is invalid');
  }
  return date.toISOString();
}

function optionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  integer = false,
): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error(`${field} must be a number`);
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${field} is invalid`);
  }
  return parsed;
}

function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value == null) return null;
  if (typeof value !== 'boolean') throw new Error(`${field} must be true or false`);
  return value;
}

function unsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host === '::' || host === '::1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host)) return true;

  const parts = host.split('.').map(value => Number(value));
  if (parts.length !== 4 || parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [first, second] = parts;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first >= 224;
}

function optionalHttpUrl(value: unknown, field: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be an HTTP URL`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) throw new Error(`${field} must be an HTTP URL`);
  if (/^(?:data|blob|javascript|vbscript|file):/i.test(trimmed)) {
    throw new Error(`${field} uses an unsupported URL scheme`);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${field} must be an absolute HTTP URL`);
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:')
    || url.username
    || url.password
    || unsafeHostname(url.hostname)) {
    throw new Error(`${field} must be a public HTTP URL`);
  }
  url.hash = '';
  return url.toString();
}

function setIfPresent(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== null && value !== undefined) target[key] = value;
}

function sanitizeFilters(searchType: SearchType, raw: unknown): Record<string, unknown> {
  const filters = raw ?? {};
  if (!plainObject(filters)) throw new Error('filters must be an object');

  if (searchType === 'creator_face') {
    assertAllowedKeys(filters, new Set(), 'filters');
    return {};
  }

  if (searchType === 'directory') {
    assertAllowedKeys(filters, DIRECTORY_FILTER_FIELDS, 'filters');
    const output: Record<string, unknown> = {};
    setIfPresent(output, 'verified', optionalBoolean(filters.verified, 'filters.verified'));
    setIfPresent(output, 'bundles', optionalBoolean(filters.bundles, 'filters.bundles'));

    if (filters.price != null && filters.price !== '') {
      if (typeof filters.price !== 'string' || !['0', '5', '10'].includes(filters.price)) {
        throw new Error('filters.price is invalid');
      }
      output.price = filters.price;
    }
    if (filters.sort != null && filters.sort !== '') {
      if (typeof filters.sort !== 'string' || !['popular', 'newest'].includes(filters.sort)) {
        throw new Error('filters.sort is invalid');
      }
      output.sort = filters.sort;
    }
    return output;
  }

  assertAllowedKeys(filters, VIDEO_FILTER_FIELDS, 'filters');
  const output: Record<string, unknown> = {};
  setIfPresent(output, 'indexedVideos', optionalNumber(filters.indexedVideos, 'filters.indexedVideos', 0, 100_000_000, true));
  setIfPresent(output, 'elapsedSeconds', optionalNumber(filters.elapsedSeconds, 'filters.elapsedSeconds', 0, 86_400));
  return output;
}

function sanitizeCreatorResult(
  raw: Record<string, unknown>,
  searchType: 'directory' | 'creator_face',
): Record<string, unknown> {
  assertAllowedKeys(raw, searchType === 'directory' ? DIRECTORY_RESULT_FIELDS : CREATOR_RESULT_FIELDS, 'creator result');
  const username = cleanText(raw.username, 100, 'results.username');
  if (!username) throw new Error('results.username is required');

  const output: Record<string, unknown> = { username };
  setIfPresent(output, 'name', cleanText(raw.name, 200, 'results.name'));
  setIfPresent(output, 'avatar', optionalHttpUrl(raw.avatar, 'results.avatar'));
  setIfPresent(output, 'profileUrl', optionalHttpUrl(raw.profileUrl, 'results.profileUrl'));
  const price = raw.subscribePrice ?? raw.subscribeprice;
  setIfPresent(output, 'subscribePrice', optionalNumber(price, 'results.subscribePrice', 0, 1_000_000));
  if (searchType === 'creator_face') {
    setIfPresent(output, 'matchPct', optionalNumber(raw.matchPct, 'results.matchPct', 0, 100));
  }
  return output;
}

function sanitizeVideoResult(raw: Record<string, unknown>): Record<string, unknown> {
  assertAllowedKeys(raw, VIDEO_RESULT_FIELDS, 'video result');
  const output: Record<string, unknown> = {};
  setIfPresent(output, 'videoId', optionalNumber(raw.videoId, 'results.videoId', 0, Number.MAX_SAFE_INTEGER, true));
  setIfPresent(output, 'externalId', cleanText(raw.externalId, 200, 'results.externalId'));
  setIfPresent(output, 'title', cleanText(raw.title, 500, 'results.title'));
  setIfPresent(output, 'sourceUrl', optionalHttpUrl(raw.sourceUrl, 'results.sourceUrl'));
  setIfPresent(output, 'thumbnailUrl', optionalHttpUrl(raw.thumbnailUrl, 'results.thumbnailUrl'));
  setIfPresent(output, 'durationSeconds', optionalNumber(raw.durationSeconds, 'results.durationSeconds', 0, 604_800));
  setIfPresent(output, 'similarity', optionalNumber(raw.similarity, 'results.similarity', 0, 1));
  setIfPresent(output, 'robustSimilarity', optionalNumber(raw.robustSimilarity, 'results.robustSimilarity', 0, 1));
  setIfPresent(output, 'supportingEmbeddings', optionalNumber(raw.supportingEmbeddings, 'results.supportingEmbeddings', 0, 1_000_000, true));
  return output;
}

function sanitizeResults(searchType: SearchType, raw: unknown): Record<string, unknown>[] {
  const results = raw ?? [];
  if (!Array.isArray(results) || results.length > MAX_INCOMING_RESULTS) {
    throw new Error(`results must contain at most ${MAX_INCOMING_RESULTS} items`);
  }
  if (!results.every(plainObject) || jsonBytes(results) > MAX_INCOMING_RESULTS_BYTES) {
    throw new Error(`results must contain objects and be no larger than ${MAX_INCOMING_RESULTS_BYTES / 1024} KB`);
  }

  const sanitized = results.slice(0, MAX_SAVED_RESULTS).map(result => (
    searchType === 'video_face'
      ? sanitizeVideoResult(result)
      : sanitizeCreatorResult(result, searchType)
  ));
  if (jsonBytes(sanitized) > MAX_RESULTS_BYTES) {
    throw new Error(`saved results must be no larger than ${MAX_RESULTS_BYTES / 1024} KB`);
  }
  return sanitized;
}

function validateEntry(raw: unknown, userId: string): Record<string, unknown> {
  if (!plainObject(raw)) throw new Error('Each history entry must be an object');
  assertAllowedKeys(raw, ENTRY_FIELDS, 'history entry');
  const entry = raw as IncomingEntry;
  const clientSearchId = typeof entry.clientSearchId === 'number'
    ? String(entry.clientSearchId)
    : entry.clientSearchId;
  if (typeof clientSearchId !== 'string' || !CLIENT_ID_PATTERN.test(clientSearchId)) {
    throw new Error('clientSearchId must be a safe identifier of at most 128 characters');
  }
  if (typeof entry.searchType !== 'string' || !SEARCH_TYPES.has(entry.searchType)) {
    throw new Error('searchType must be directory, creator_face, or video_face');
  }

  const query = cleanText(entry.query, 200, 'query');
  const label = cleanText(entry.label, 200, 'label');
  if (entry.searchType === 'directory' && !query) {
    throw new Error('query is required for directory searches');
  }

  const resultCount = entry.resultCount == null ? 0 : Number(entry.resultCount);
  if (!Number.isInteger(resultCount) || resultCount < 0 || resultCount > MAX_RESULT_COUNT) {
    throw new Error(`resultCount must be an integer between 0 and ${MAX_RESULT_COUNT}`);
  }

  const searchType = entry.searchType as SearchType;
  const filters = sanitizeFilters(searchType, entry.filters);
  if (jsonBytes(filters) > MAX_FILTER_BYTES) {
    throw new Error(`filters must be no larger than ${MAX_FILTER_BYTES / 1024} KB`);
  }
  const results = sanitizeResults(searchType, entry.results);

  return {
    user_id: userId,
    client_search_id: clientSearchId,
    search_type: entry.searchType,
    query,
    label,
    result_count: resultCount,
    filters,
    results,
    created_at: validatedCreatedAt(entry.createdAt),
  };
}

function toItem(row: SearchHistoryRow): Record<string, unknown> {
  return {
    id: row.id,
    clientSearchId: row.client_search_id,
    searchType: row.search_type,
    query: row.query,
    label: row.label,
    resultCount: row.result_count,
    filters: row.filters,
    results: row.results,
    createdAt: row.created_at,
  };
}

function strictInteger(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function countFromContentRange(value: string | null): number {
  const raw = value?.split('/').pop();
  return raw && raw !== '*' ? Number(raw) || 0 : 0;
}

function safeSearchFilter(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f,().%*_\\"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export const GET: APIRoute = async ({ request, url }) => {
  const context = await authenticate(request);
  if (isResponse(context)) return context;
  if (!withinRateLimit(context.userId, 'read', 120)) return json({ error: 'Too many history requests' }, 429);

  const limit = strictInteger(url.searchParams.get('limit'), 25, 1, 100);
  const offset = strictInteger(url.searchParams.get('offset'), 0, 0, 1_000_000);
  if (limit == null || offset == null) return json({ error: 'Invalid pagination' }, 400);

  const type = url.searchParams.get('type');
  if (type && !SEARCH_TYPES.has(type)) return json({ error: 'Invalid history type' }, 400);
  const q = safeSearchFilter(url.searchParams.get('q') ?? '');

  const params = new URLSearchParams({
    select: 'id,client_search_id,search_type,query,label,result_count,filters,results,created_at',
    user_id: `eq.${context.userId}`,
    order: 'created_at.desc,id.desc',
    limit: String(limit),
    offset: String(offset),
  });
  if (type) params.set('search_type', `eq.${type}`);
  if (q) params.set('or', `(query.ilike.*${q}*,label.ilike.*${q}*)`);

  try {
    const response = await fetch(`${context.supabaseUrl}/rest/v1/user_search_history?${params}`, {
      headers: serviceHeaders(context.serviceKey, { Prefer: 'count=exact' }),
    });
    if (!response.ok) throw new Error(`history GET failed: ${response.status}`);
    const rows = await response.json() as SearchHistoryRow[];
    const total = countFromContentRange(response.headers.get('content-range'));
    const nextOffset = offset + rows.length;
    return json({
      items: rows.map(toItem),
      total,
      hasMore: nextOffset < total,
      nextOffset: nextOffset < total ? nextOffset : null,
    });
  } catch (error) {
    console.error('[search-history] read failed', error);
    return json({ error: 'Could not load search history' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const context = await authenticate(request);
  if (isResponse(context)) return context;
  if (!withinRateLimit(context.userId, 'write', 30)) return json({ error: 'Too many history saves' }, 429);

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ error: 'Request is too large' }, 413);
  }

  let parsed: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: 'Request is too large' }, 413);
    }
    parsed = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  let rawEntries: unknown[];
  if (plainObject(parsed) && Object.prototype.hasOwnProperty.call(parsed, 'entries')) {
    try {
      assertAllowedKeys(parsed, new Set(['entries']), 'request');
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid request' }, 400);
    }
    if (!Array.isArray(parsed.entries)) return json({ error: 'entries must be an array' }, 400);
    rawEntries = parsed.entries;
  } else {
    rawEntries = [parsed];
  }
  if (rawEntries.length < 1 || rawEntries.length > MAX_BATCH_SIZE) {
    return json({ error: `Submit between 1 and ${MAX_BATCH_SIZE} history entries` }, 400);
  }

  let entries: Record<string, unknown>[];
  try {
    entries = rawEntries.map(entry => validateEntry(entry, context.userId));
    const ids = entries.map(entry => String(entry.client_search_id));
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate clientSearchId values in one request');
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid history entry' }, 400);
  }

  try {
    const params = new URLSearchParams({ on_conflict: 'user_id,client_search_id' });
    const response = await fetch(`${context.supabaseUrl}/rest/v1/user_search_history?${params}`, {
      method: 'POST',
      headers: serviceHeaders(context.serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(entries),
    });
    if (!response.ok) throw new Error(`history POST failed: ${response.status}`);
    const rows = await response.json() as SearchHistoryRow[];
    const trimResponse = await fetch(`${context.supabaseUrl}/rest/v1/rpc/trim_user_search_history`, {
      method: 'POST',
      headers: serviceHeaders(context.serviceKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ target_user_id: context.userId }),
    });
    if (!trimResponse.ok) throw new Error(`history quota trim failed: ${trimResponse.status}`);
    return json({ items: rows.map(toItem) }, 200);
  } catch (error) {
    console.error('[search-history] save failed', error);
    return json({ error: 'Could not save search history' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const context = await authenticate(request);
  if (isResponse(context)) return context;
  if (!withinRateLimit(context.userId, 'delete', 30)) return json({ error: 'Too many history deletions' }, 429);

  const id = url.searchParams.get('id');
  const clientSearchId = url.searchParams.get('clientSearchId');
  const hasExactQuery = url.searchParams.has('query');
  const rawExactQuery = url.searchParams.get('query');
  const deleteAll = url.searchParams.get('all') === 'true';
  const type = url.searchParams.get('type');
  if (type && !SEARCH_TYPES.has(type)) return json({ error: 'Invalid history type' }, 400);
  const selectors = Number(Boolean(id)) + Number(Boolean(clientSearchId)) + Number(deleteAll) + Number(hasExactQuery);
  if (selectors !== 1) {
    return json({ error: 'Provide exactly one of id, clientSearchId, query, or all=true' }, 400);
  }
  if (id && !UUID_PATTERN.test(id)) return json({ error: 'Invalid history id' }, 400);
  if (clientSearchId && !CLIENT_ID_PATTERN.test(clientSearchId)) {
    return json({ error: 'Invalid clientSearchId' }, 400);
  }
  let exactQuery: string | null = null;
  if (hasExactQuery) {
    if (type && type !== 'directory') return json({ error: 'Query deletion is only available for directory history' }, 400);
    try {
      exactQuery = cleanText(rawExactQuery, 200, 'query');
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid query' }, 400);
    }
    if (!exactQuery) return json({ error: 'query must not be empty' }, 400);
  }

  const filter = new URLSearchParams({ user_id: `eq.${context.userId}` });
  if (id) filter.set('id', `eq.${id}`);
  if (clientSearchId) filter.set('client_search_id', `eq.${clientSearchId}`);
  if (exactQuery) {
    filter.set('search_type', 'eq.directory');
  } else if (type) {
    filter.set('search_type', `eq.${type}`);
  }

  try {
    // Count first so bulk deletion can remain return=minimal instead of echoing a
    // potentially large private history payload into server memory.
    const countParams = new URLSearchParams(filter);
    countParams.set('select', exactQuery ? 'id,query' : 'id');
    if (!exactQuery) countParams.set('limit', '1');
    const countResponse = await fetch(`${context.supabaseUrl}/rest/v1/user_search_history?${countParams}`, {
      headers: serviceHeaders(context.serviceKey, exactQuery
        ? { Prefer: 'count=exact' }
        : { Prefer: 'count=exact', Range: '0-0' }),
    });
    if (!countResponse.ok) throw new Error(`history count failed: ${countResponse.status}`);
    let deleted = countFromContentRange(countResponse.headers.get('content-range'));

    if (exactQuery) {
      const candidates = await countResponse.json() as Array<{ id?: string; query?: string }>;
      const target = exactQuery.toLocaleLowerCase();
      const matchingIds = candidates
        .filter(row => row.id && row.query?.toLocaleLowerCase() === target)
        .map(row => row.id as string);
      deleted = matchingIds.length;
      if (matchingIds.length) filter.set('id', `in.(${matchingIds.join(',')})`);
      else filter.set('id', 'eq.00000000-0000-0000-0000-000000000000');
    } else {
      // Consume the body so the connection can be reused in long-lived runtimes.
      await countResponse.text();
    }

    if (deleted > 0) {
      const response = await fetch(`${context.supabaseUrl}/rest/v1/user_search_history?${filter}`, {
        method: 'DELETE',
        headers: serviceHeaders(context.serviceKey, { Prefer: 'return=minimal' }),
      });
      if (!response.ok) throw new Error(`history DELETE failed: ${response.status}`);
    }
    return json({ deleted });
  } catch (error) {
    console.error('[search-history] delete failed', error);
    return json({ error: 'Could not delete search history' }, 500);
  }
};
