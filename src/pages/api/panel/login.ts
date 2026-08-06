// Panel-only login — separate from src/pages/api/auth/login.ts (the consumer site's login,
// which stores its session client-side in localStorage). This one issues real httpOnly
// cookies via setPanelCookies() because it's gating a client's real business data, and it
// rejects the login outright (403) unless the account carries panel_role metadata, even when
// the Supabase password grant itself succeeds — so a normal consumer account can never get in
// here just by knowing this URL exists.
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

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Panel login is unavailable.' }, 500);

  let email = '';
  let password = '';
  try {
    const body = await request.json() as { email?: string; password?: string };
    email = body.email?.trim().toLowerCase() ?? '';
    password = body.password ?? '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (!email || !password) return json({ error: 'Enter your email and password.' }, 400);

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { email?: string; user_metadata?: Record<string, unknown> };
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.user) {
    return json({ error: payload.error_description || payload.msg || 'Invalid email or password.' }, 401);
  }

  const session = toPanelSession(payload.user);
  if (!session) {
    return json({ error: 'This account does not have panel access.' }, 403);
  }

  setPanelCookies(cookies, {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
  });

  return json({ role: session.role, clientSlugs: session.clientSlugs, name: session.name });
};
