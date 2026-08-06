// Backs client-side range/data refreshes on the dashboard. src/middleware.ts has already
// verified the session and populated locals.panelUser for any /api/panel/* request by the
// time this runs — this route just checks it's present (401 otherwise) and resolves which
// client's data to return.
import type { APIRoute } from 'astro';
import { getPanelStats } from '../../../lib/panelStats';
import { resolveClientSlug } from '../../../lib/panelAuth';
import { DEFAULT_CLIENT_SLUG } from '../../../config/panelClients';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const session = locals.panelUser;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // resolveClientSlug enforces that a guest can only ever land on a slug from their own
  // clientSlugs — a ?client= for a model they don't own is ignored, not trusted.
  const clientSlug = resolveClientSlug(session, url.searchParams.get('client'), DEFAULT_CLIENT_SLUG);
  if (!clientSlug) {
    return new Response(JSON.stringify({ error: 'No client selected.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const stats = await getPanelStats(clientSlug);
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
