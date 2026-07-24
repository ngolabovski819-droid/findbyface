// Click-tracking redirect for sponsored creators. Looks up the sponsor override for
// `username`, logs a click (timestamp/user_agent/referrer/placement) when a click table
// is configured and the request isn't a bot/crawler, then redirects to the real
// destination. Route every sponsored card/CTA link through this — never link straight to
// the destination for a creator with a linkOverride or clickTable configured.
//
// GOTCHA: never link here with rel="noreferrer" — it stops the browser from sending a
// Referer to this route, silently zeroing placement data even for internal traffic. Use
// noopener/nofollow(+sponsored) instead.
// GOTCHA: never enable client-side prefetching (e.g. Astro's `data-astro-prefetch`) on a
// link pointing here — a same-origin prefetch fires this route (and the click log) before
// any real click happens, logging impressions as clicks.
import type { APIRoute } from 'astro';
import { getSponsorOverride } from '../../config/sponsors';

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|curl|wget|python-requests|python-urllib|go-http-client|headless|phantomjs|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|embedly|pinterest|semrushbot|ahrefsbot|mj12bot|petalbot|bytespider|yandexbot|baiduspider|duckduckbot|applebot|bingpreview|okhttp/i;

function derivePlacement(referer: string | null, ownHost: string): string | null {
  if (!referer) return null; // legitimate — pasted links, in-app browsers strip referrers
  let refUrl: URL;
  try {
    refUrl = new URL(referer);
  } catch {
    return null;
  }
  if (refUrl.host !== ownHost) return `external:${refUrl.host}`;

  const path = refUrl.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return 'home';
  const catMatch = path.match(/^\/categories\/([^/]+)$/);
  if (catMatch) return `category:${catMatch[1]}`;
  if (path === '/onlyfans-search') return 'search';
  if (path === '/ai-discover') return 'ai-discover';
  if (path === '/dashboard') return 'dashboard';
  return `internal:${path}`;
}

export const GET: APIRoute = async ({ params, request }) => {
  const username = params.username ?? '';
  if (!username) return new Response('Not found', { status: 404 });

  const override = getSponsorOverride(username);
  const destination = override?.linkOverride || `https://onlyfans.com/${encodeURIComponent(username)}`;

  const userAgent = request.headers.get('user-agent') ?? '';
  const isBot = BOT_UA_PATTERN.test(userAgent);

  if (override?.clickTable && !isBot) {
    const referer = request.headers.get('referer');
    const ownHost = new URL(request.url).host;
    const placement = derivePlacement(referer, ownHost);

    const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
    const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/${override.clickTable}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Accept-Profile': 'public',
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ user_agent: userAgent, referrer: referer, placement }),
        });
      } catch {
        // Logging failure must never block the redirect.
      }
    }
  }

  return new Response(null, { status: 302, headers: { Location: destination } });
};
