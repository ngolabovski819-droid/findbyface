import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  let access_token: string;
  try {
    const body = await request.json();
    access_token = body.access_token;
    if (!access_token) throw new Error('No token');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  // Verify the user's access token with Supabase Auth
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const user = await resp.json() as {
    email: string;
    user_metadata?: { full_name?: string; avatar_url?: string };
  };

  return new Response(JSON.stringify({
    email: user.email,
    name: user.user_metadata?.full_name || user.email,
    avatar: user.user_metadata?.avatar_url || null,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
