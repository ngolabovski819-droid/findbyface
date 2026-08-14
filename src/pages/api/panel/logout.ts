import type { APIRoute } from 'astro';
import { clearPanelCookies } from '../../../lib/panelAuth';

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

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Prevent another origin from forcing an authenticated panel user out. Check this before
  // touching either cookie; a rejected request must leave the session intact.
  if (!isSameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  clearPanelCookies(cookies);
  return json({ ok: true });
};
