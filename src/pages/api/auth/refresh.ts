import type { APIRoute } from 'astro';
import { getBattleAccountProfile } from '../../../lib/accountProfile';

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
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Authentication is unavailable.' }, 500);
  }

  let refreshToken = '';
  try {
    const body = await request.json() as { refresh_token?: string };
    refreshToken = body.refresh_token ?? '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (!refreshToken) return json({ error: 'No refresh token was supplied.' }, 400);

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: {
      id?: string;
      email?: string;
      user_metadata?: { full_name?: string; avatar_url?: string };
    };
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.access_token || !payload.user) {
    return json({
      error: payload.error_description || payload.msg || 'Your session expired.',
    }, 401);
  }

  if (!payload.user.id) return json({ error: 'Invalid user account.' }, 401);
  const battleProfile = await getBattleAccountProfile(supabaseUrl, supabaseKey, payload.user.id);

  return json({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || refreshToken,
    expires_in: payload.expires_in,
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: battleProfile.displayName || payload.user.user_metadata?.full_name || payload.user.email,
      avatar: battleProfile.avatarUrl,
    },
  });
};
