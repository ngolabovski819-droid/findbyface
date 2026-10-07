import type { APIRoute } from 'astro';
import { renderChildSitemap } from '../../lib/sitemap';

// Child sitemaps /sitemap/0, /sitemap/1, ... — see src/lib/sitemap.ts for what each holds.
//
// Rendered on demand rather than prerendered: a prerendered /sitemap/0 is an extensionless
// static file, and Vercel picks a static file's Content-Type from its extension, so it
// would not go out as XML. The work is trivial (config + bundled content collections, no
// database), and s-maxage lets Vercel's CDN answer repeat fetches without running the
// function. Vercel's CDN cache is per-deployment, so a redeploy still refreshes it.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const body = await renderChildSitemap(params.id ?? '');
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
};
