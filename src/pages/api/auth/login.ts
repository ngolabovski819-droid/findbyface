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

  if (!email || !password) return json({ error: 'Enter your email and password.' }, 400);

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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
    user?: { email?: string; user_metadata?: { full_name?: string; avatar_url?: string } };
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.access_token || !payload.user) {
    return json({ error: payload.error_description || payload.msg || 'Invalid email or password.' }, 401);
  }

  return json({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    user: {
      email: payload.user.email,
      name: payload.user.user_metadata?.full_name || payload.user.email,
      avatar: payload.user.user_metadata?.avatar_url || null,
    },
  });
};
