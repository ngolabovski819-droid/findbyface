import type { APIRoute } from 'astro';
import { clearPanelCookies } from '../../../lib/panelAuth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  clearPanelCookies(cookies);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
