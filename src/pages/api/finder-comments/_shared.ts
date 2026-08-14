import { extractBearerToken, verifySupabaseUser, type VerifiedUser } from '../../../lib/verifyUser';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function sameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;
  const origin = request.headers.get('origin');
  // Non-browser clients may omit Origin, but modern cross-site browser requests
  // identify themselves above. Authentication/rate limits remain authoritative.
  if (!origin) return fetchSite == null || fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return requestUrl.protocol === originUrl.protocol && requestUrl.host === originUrl.host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

export function withinRateLimit(key: string, maximum: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size > 5_000) {
      for (const [candidate, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(candidate);
      if (buckets.size > 5_000) buckets.delete(buckets.keys().next().value!);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}

export async function authenticated(request: Request, bodyToken?: string | null): Promise<VerifiedUser | null> {
  const url = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return verifySupabaseUser(extractBearerToken(request, bodyToken), url, key);
}

export async function parseJson(request: Request, maximumBytes = 16_384): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) return null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > maximumBytes) return null;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function cookieOptions(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
}

export function randomVoterKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function cookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') ?? '';
  for (const item of raw.split(';')) {
    const [key, ...rest] = item.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function publicError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const safePrefixes = [
    'Invalid ', 'Choose ', 'A valid ', 'Replies ', 'Reply ', 'Story ', 'Public name ',
    'Use only ', 'Only a public ', 'Alias ', 'That story ', 'Comment not found',
    'Too many ', 'Enter a valid ', 'Verification link ',
    'Please wait ',
  ];
  return safePrefixes.some(prefix => error.message.startsWith(prefix)) ? error.message : fallback;
}
