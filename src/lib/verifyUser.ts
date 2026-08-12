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

export async function verifySupabaseUser(
  accessToken: string | null | undefined,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<VerifiedUser | null> {
  if (!accessToken) return null;
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
    return {
      id: user.id,
      email: user.email ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    };
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
