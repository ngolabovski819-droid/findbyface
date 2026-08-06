// Session handling for panel.findbyface.org — completely separate from the consumer site's
// localStorage-based auth (fbf_user in Nav.astro). That pattern is a soft UX gate; this one
// protects a real client's business data, so it's real server-side verification against
// Supabase Auth on every request, backed by httpOnly cookies instead of localStorage.
//
// Accounts are ordinary Supabase Auth users (provisioned via scripts/provision_panel_user.mjs)
// tagged with user_metadata: { panel_role: 'admin'|'guest', client_slugs: string[], name }. A
// login only grants panel access if panel_role is present — a regular consumer account is
// rejected even with a correct password (see toPanelSession()).
import type { AstroCookies } from 'astro';

export type PanelRole = 'admin' | 'guest';

export interface PanelSession {
  role: PanelRole;
  // A guest can now own more than one model (an agency running several creators) — this is
  // every slug their login is allowed to view. Empty for admin, who isn't scoped to any fixed
  // set and instead picks from every configured client via resolveClientSlug() below.
  clientSlugs: string[];
  name: string;
  email: string;
}

const AT_COOKIE = 'fbf_panel_at';
const RT_COOKIE = 'fbf_panel_rt';

// secure:false in dev is required, not optional — panel.localhost is plain HTTP, and a
// Secure-flagged cookie is silently dropped by the browser over HTTP with no visible error
// (login looks like it succeeds, the very next request just has no cookie).
const BASE_COOKIE_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
  path: '/',
};

interface SupabaseAuthUser {
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface TokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseAuthUser;
}

export function toPanelSession(user: SupabaseAuthUser | undefined | null): PanelSession | null {
  const role = user?.user_metadata?.panel_role;
  if (role !== 'admin' && role !== 'guest') return null;
  const meta = user?.user_metadata ?? {};
  // Prefer the new array field; fall back to the original singular client_slug so an account
  // provisioned before this change (emilylopz.guest1) keeps working without re-provisioning.
  let clientSlugs: string[] = [];
  if (Array.isArray(meta.client_slugs)) {
    clientSlugs = meta.client_slugs.filter((s): s is string => typeof s === 'string' && s.length > 0);
  } else if (typeof meta.client_slug === 'string' && meta.client_slug) {
    clientSlugs = [meta.client_slug];
  }
  return {
    role,
    clientSlugs,
    name: (meta.name as string) || user?.email || 'there',
    email: user?.email ?? '',
  };
}

// Which model a page should actually render: an admin can view any configured client via
// ?client=; a guest can only ever land on a slug from their OWN clientSlugs (a guest with two
// models can't type a third client's slug into the URL and see it — membership is checked
// against their verified token, never trusted from the request). Falls back to the first
// available slug (guest) or the platform default (admin) when nothing was requested.
export function resolveClientSlug(session: PanelSession, requested: string | null, fallback: string): string {
  if (session.role === 'admin') return requested || fallback;
  if (requested && session.clientSlugs.includes(requested)) return requested;
  return session.clientSlugs[0] ?? fallback;
}

export function setPanelCookies(cookies: AstroCookies, tokens: { access_token: string; refresh_token: string; expires_in?: number }): void {
  cookies.set(AT_COOKIE, tokens.access_token, { ...BASE_COOKIE_OPTS, maxAge: tokens.expires_in ?? 3600 });
  // Refresh tokens aren't time-boxed the same way — give them a long window; Supabase rotates
  // the value itself on every use, so this cookie's lifetime is really "how long since your
  // last visit", not a fixed session length.
  cookies.set(RT_COOKIE, tokens.refresh_token, { ...BASE_COOKIE_OPTS, maxAge: 60 * 60 * 24 * 30 });
}

export function clearPanelCookies(cookies: AstroCookies): void {
  cookies.delete(AT_COOKIE, { path: '/' });
  cookies.delete(RT_COOKIE, { path: '/' });
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = import.meta.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function fetchUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const resp = await fetch(`${env.url}/auth/v1/user`, {
      headers: { apikey: env.key, Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function refreshTokens(refreshToken: string): Promise<TokenPayload | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const resp = await fetch(`${env.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: env.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!resp.ok) return null;
    const payload = await resp.json();
    if (!payload.access_token || !payload.refresh_token || !payload.user) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// Verifies the current panel session from cookies, transparently refreshing when the access
// token has expired. On a successful refresh, BOTH cookies are re-set — Supabase rotates and
// invalidates the old refresh token on every use, so re-setting only the access token would
// strand the session on the very next refresh attempt.
export async function verifyPanelSession(cookies: AstroCookies): Promise<PanelSession | null> {
  const accessToken = cookies.get(AT_COOKIE)?.value;
  if (accessToken) {
    const user = await fetchUser(accessToken);
    const session = toPanelSession(user);
    if (session) return session;
  }

  const refreshToken = cookies.get(RT_COOKIE)?.value;
  if (!refreshToken) return null;

  const refreshed = await refreshTokens(refreshToken);
  if (!refreshed) return null;

  const session = toPanelSession(refreshed.user);
  if (!session) return null;

  setPanelCookies(cookies, refreshed);
  return session;
}

export function loginPathFor(onPanelHost: boolean): string {
  return onPanelHost ? '/login/' : '/panel/login/';
}

export function dashboardPathFor(onPanelHost: boolean): string {
  return onPanelHost ? '/' : '/panel/';
}
