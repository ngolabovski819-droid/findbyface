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

function isLocalRequest(request: Request): boolean {
  try {
    const requestUrl = new URL(request.url);
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    const origin = request.headers.get('origin');
    return import.meta.env.DEV
      && localHosts.has(requestUrl.hostname)
      && Boolean(origin)
      && new URL(origin!).origin === requestUrl.origin;
  } catch {
    return false;
  }
}

// Development-only bootstrap for the site owner. It avoids requiring localhost to be added
// to the production OAuth redirect allowlist. The route is compiled closed in production,
// accepts only same-origin loopback requests, and still requires the configured Supabase user
// to carry the server-controlled admin role.
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isLocalRequest(request)) return json({ error: 'Not found.' }, 404);

  const supabaseUrl = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_KEY;
  const email = import.meta.env.LOCAL_PANEL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!supabaseUrl || !serviceKey || !email) return json({ error: 'Local admin login is not configured.' }, 503);

  const generatedResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!generatedResponse.ok) return json({ error: 'Local admin session could not be created.' }, 503);

  const generated = await generatedResponse.json() as {
    id?: string;
    email?: string;
    hashed_token?: string;
    verification_type?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
  if (generated.email?.toLowerCase() !== email || !generated.hashed_token
    || generated.verification_type !== 'magiclink' || toPanelSession(generated)?.role !== 'admin') {
    return json({ error: 'The configured account does not have admin access.' }, 403);
  }

  const verifiedResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_hash: generated.hashed_token, type: generated.verification_type }),
  });
  if (!verifiedResponse.ok) return json({ error: 'Local admin session could not be verified.' }, 503);

  const verified = await verifiedResponse.json() as {
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
  const session = toPanelSession(verified.user);
  if (!verified.access_token || !verified.refresh_token || !session || session.role !== 'admin'
    || (generated.id && verified.user?.id !== generated.id)) {
    return json({ error: 'Local admin session could not be verified.' }, 503);
  }

  setPanelCookies(cookies, {
    access_token: verified.access_token,
    refresh_token: verified.refresh_token,
    expires_in: verified.expires_in,
  });
  return json({ ok: true });
};
