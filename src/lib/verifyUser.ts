// Verifies a Supabase access token server-side and returns the real auth.users id.
// Used anywhere an endpoint must know who's actually calling it (the Battle points system)
// rather than trusting a client-supplied id — same underlying call as api/auth/session.ts
// (POST /auth/v1/user), but that route only forwards email/name/avatar to the client and
// never the uuid, so it can't be reused as-is here.
export interface VerifiedUser {
  id: string;
  email: string | null;
  avatarUrl: string | null;
}

interface CachedVerification {
  user: VerifiedUser;
  expiresAt: number;
}

// A player commonly casts several votes within a minute. Re-validating the same Supabase
// token over the network for every round adds visible latency without improving security in
// that tiny window. Serverless instances reuse this bounded cache when warm; cold instances
// simply fall back to the authoritative Auth request below.
const verificationCache = new Map<string, CachedVerification>();
const VERIFICATION_CACHE_MS = 45_000;
const VERIFICATION_CACHE_MAX = 500;

function cachedUser(accessToken: string): VerifiedUser | null {
  const cached = verificationCache.get(accessToken);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    verificationCache.delete(accessToken);
    return null;
  }
  return cached.user;
}

function cacheUser(accessToken: string, user: VerifiedUser): void {
  if (verificationCache.size >= VERIFICATION_CACHE_MAX) {
    const oldestKey = verificationCache.keys().next().value;
    if (oldestKey) verificationCache.delete(oldestKey);
  }
  verificationCache.set(accessToken, { user, expiresAt: Date.now() + VERIFICATION_CACHE_MS });
}

export async function verifySupabaseUser(
  accessToken: string | null | undefined,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<VerifiedUser | null> {
  if (!accessToken) return null;
  const cached = cachedUser(accessToken);
  if (cached) return cached;
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!resp.ok) return null;
    const user = (await resp.json()) as {
      id?: string;
      email?: string;
      user_metadata?: { avatar_url?: string };
    };
    if (!user.id) return null;
    const verifiedUser = {
      id: user.id,
      email: user.email ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    };
    cacheUser(accessToken, verifiedUser);
    return verifiedUser;
  } catch {
    return null;
  }
}

// Battle routes accept the token as `Authorization: Bearer <token>` (preferred) or an
// `access_token` field in a JSON body, since fbf_user in localStorage already holds the
// token and different call sites find it more convenient one way or the other.
export function extractBearerToken(request: Request, bodyToken?: string | null): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return bodyToken ?? null;
}
