import type { APIRoute } from 'astro';
import { setPanelCookies, toPanelSession } from '../../../lib/panelAuth';

export const prerender = false;

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

// Converts an already-verified consumer Google session into the separate, HttpOnly
// panel session. Authorization is still read from server-controlled app_metadata after
// Supabase verifies the access token; nothing in localStorage can grant panel access.
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);

  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Panel login is unavailable.' }, 500);

  let accessToken = '';
  let refreshToken = '';
  try {
    const body = await request.json() as { access_token?: unknown; refresh_token?: unknown };
    accessToken = typeof body.access_token === 'string' ? body.access_token : '';
    refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token : '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (accessToken.length < 20 || accessToken.length > 4096
    || refreshToken.length < 8 || refreshToken.length > 4096) {
    return json({ error: 'Your Google session has expired. Sign in again.' }, 401);
  }

  // Verify the caller's current access token, then read current authorization from the Admin
  // API. An older JWT can legitimately predate a newly granted panel role, so its embedded
  // app_metadata is not authoritative here.
  const verifiedResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!verifiedResponse.ok) return json({ error: 'Your Google session has expired. Sign in again.' }, 401);
  const verifiedUser = await verifiedResponse.json() as { id?: string };
  if (!verifiedUser.id) return json({ error: 'Your Google session has expired. Sign in again.' }, 401);

  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  const currentResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(verifiedUser.id)}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!currentResponse.ok) return json({ error: 'Panel authorization could not be checked.' }, 503);
  const currentUser = await currentResponse.json() as {
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
  if (!toPanelSession(currentUser)) return json({ error: 'This account does not have panel access.' }, 403);

  // Now rotate the token pair so the access JWT and future refreshes both carry the current
  // role. The browser receives the rotated pair below to keep its consumer session in sync.
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return json({ error: 'Your Google session has expired. Sign in again.' }, 401);

  const refreshed = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: {
      id?: string;
      email?: string;
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    };
  };
  if (!refreshed.access_token || !refreshed.refresh_token || !refreshed.user) {
    return json({ error: 'Your Google session has expired. Sign in again.' }, 401);
  }
  if (refreshed.user.id && refreshed.user.id !== verifiedUser.id) {
    return json({ error: 'Your Google session could not be verified.' }, 401);
  }

  const session = toPanelSession(refreshed.user);
  if (!session) return json({ error: 'This account does not have panel access.' }, 403);

  setPanelCookies(cookies, {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_in: refreshed.expires_in,
  });

  // Keep the consumer session in localStorage aligned with Supabase's rotated refresh token.
  // These values are returned only to the same-origin caller that supplied the original pair.
  return json({
    role: session.role,
    clientSlugs: session.clientSlugs,
    name: session.name,
    consumerSession: {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_in: refreshed.expires_in ?? 3600,
    },
  });
};
