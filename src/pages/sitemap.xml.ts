import type { APIRoute } from 'astro';
import { renderSitemapIndex } from '../lib/sitemap';

// Sitemap index for the per-template child sitemaps at /sitemap/<n> — see src/lib/sitemap.ts.
// Kept at /sitemap.xml so the long-standing GSC submission and every crawler that already
// knows this URL keep working; the children are submitted individually as well.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(renderSitemapIndex(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
