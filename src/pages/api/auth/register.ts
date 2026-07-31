import type { APIRoute } from 'astro';

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
    user?: { email?: string; user_metadata?: { full_name?: string; avatar_url?: string }; identities?: unknown[] };
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.user) {
    return json({ error: payload.error_description || payload.msg || 'Could not create your account.' }, response.status || 400);
  }

  const sessionReady = Boolean(payload.access_token);
  return json({
    requiresConfirmation: !sessionReady,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    user: sessionReady ? {
      email: payload.user.email,
      name: payload.user.user_metadata?.full_name || payload.user.email,
      avatar: payload.user.user_metadata?.avatar_url || null,
    } : undefined,
  });
};
