import type { APIRoute } from 'astro';
import { getBattleAccountProfile } from '../../../lib/accountProfile';

export const prerender = false;

function json(payload: Record<string, unknown>, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

export const POST: APIRoute = async ({ request }) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Authentication is unavailable.' }, 500);

  let email = '';
  let password = '';
  try {
    const body = await request.json() as { email?: string; password?: string };
    email = body.email?.trim().toLowerCase() ?? '';
    password = body.password ?? '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (password.length < 8) return json({ error: 'Use at least 8 characters for your password.' }, 400);

  const callbackUrl = new URL('/auth/callback', request.url).href;
  const response = await fetch(`${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(callbackUrl)}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string }; identities?: unknown[] };
    error_description?: string;
    code?: string;
    error_code?: string;
    message?: string;
    msg?: string;
  };

  if (!response.ok || !payload.user) {
    const upstreamError = payload.error_description || payload.message || payload.msg || 'Could not create your account.';
    if (response.status === 429 || payload.code === 'over_email_send_rate_limit' || /email rate limit/i.test(upstreamError)) {
      return json({
        code: 'email_rate_limited',
        error: 'Confirmation email capacity is temporarily full. Use Google sign-in or try email signup again later.',
      }, 429);
    }
    return json({ error: upstreamError }, response.status || 400);
  }

  const sessionReady = Boolean(payload.access_token);
  const battleProfile = payload.user.id
    ? await getBattleAccountProfile(supabaseUrl, supabaseKey, payload.user.id)
    : null;
  return json({
    requiresConfirmation: !sessionReady,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    user: sessionReady ? {
      id: payload.user.id,
      email: payload.user.email,
      name: battleProfile?.displayName || payload.user.user_metadata?.full_name || payload.user.email,
      avatar: battleProfile?.avatarUrl || null,
    } : undefined,
  }, 200, !sessionReady ? {
    'Set-Cookie': 'fbf_pending_signup=1; Path=/; Max-Age=1800; SameSite=Lax; Secure',
  } : {
    'Set-Cookie': 'fbf_pending_signup=; Path=/; Max-Age=0; SameSite=Lax; Secure',
  });
};
