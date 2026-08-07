// Click-tracking redirect for sponsored creators. Looks up the sponsor override for
// `username`, logs a click (timestamp/user_agent/referrer/placement/salted-IP-hash/raw IP/
// country/city) when a click table is configured, the request isn't a bot/crawler
// (src/lib/botDetection.ts), and the same IP hasn't already hit this exact link several times
// in the last few seconds (src/lib/clickIntegrity.ts) — then redirects to the real destination
// either way. Route every sponsored card/CTA link through this — never link straight to the
// destination for a creator with a linkOverride or clickTable configured.
//
// The raw ip_address column exists only for admin-panel fraud investigation ("did the same
// visitor click this repeatedly") — src/lib/panelStats.ts gates it on session.role === 'admin'
// and it must never be exposed to a guest/client login. country/city come free from Vercel's
// edge geolocation headers (no third-party service) and are shown to every panel role.
//
// GOTCHA: never link here with rel="noreferrer" — it stops the browser from sending a
// Referer to this route, silently zeroing placement data even for internal traffic. Use
// noopener/nofollow(+sponsored) instead.
// GOTCHA: never enable client-side prefetching (e.g. Astro's `data-astro-prefetch`) on a
// link pointing here — a same-origin prefetch fires this route (and the click log) before
// any real click happens, logging impressions as clicks.
//
// An optional `?slot=<label>` query param overrides the referrer-derived placement with
// an explicit one — use this when the same creator can appear in more than one distinct
// widget on the same page (e.g. the search-history dropdown ad row vs. an organic card),
// so each placement's performance can be measured separately even though the Referer is
// identical for both.
import type { APIRoute } from 'astro';
import { getSponsorOverride } from '../../config/sponsors';
import { isBotUserAgent } from '../../lib/botDetection';
import { extractClientIp, hashIp, isDatacenterIp, isRateLimited, extractGeo } from '../../lib/clickIntegrity';
import { verifyClickToken } from '../../lib/clickToken';

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
  const isBot = isBotUserAgent(userAgent);

  if (override?.clickTable && !isBot) {
    const referer = request.headers.get('referer');
    const requestUrl = new URL(request.url);
    const slot = requestUrl.searchParams.get('slot');
    const placement = slot || derivePlacement(referer, requestUrl.host);

    const clientIp = extractClientIp(request.headers.get('x-forwarded-for'));
    const CLICK_IP_SALT = import.meta.env.CLICK_IP_SALT;
    const ipHash = clientIp && CLICK_IP_SALT ? hashIp(clientIp, CLICK_IP_SALT) : null;
    const isDatacenter = isDatacenterIp(clientIp);
    const geo = extractGeo(request.headers);

    // Proof this click's link came from a page rendered just now (src/lib/clickToken.ts,
    // minted in src/lib/sponsorOverrides.ts) — not a hard gate, see that file for why. Purely
    // a reporting signal on the row for now. botIdFlagged rides along inside the same token
    // (captured at mint time in src/pages/api/click-token.ts) and is stored as its own column
    // — independent of linkVerified, since a click can be provably-real-render AND
    // BotID-flagged at the same time, or neither, or either alone.
    const CLICK_TOKEN_SECRET = import.meta.env.CLICK_TOKEN_SECRET;
    const tokenVerification = CLICK_TOKEN_SECRET
      ? verifyClickToken(requestUrl.searchParams.get('t'), username, CLICK_TOKEN_SECRET)
      : { valid: false, botIdFlagged: null };
    const linkVerified = tokenVerification.valid;
    const botIdFlagged = tokenVerification.botIdFlagged;

    const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
    const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Same IP hammering this exact link is a script, whatever UA it claims — checked before
        // logging so a rate-limited hit still gets its redirect but never counts as a click.
        const rateLimited = ipHash
          ? await isRateLimited({
              supabaseUrl: SUPABASE_URL,
              supabaseKey: SUPABASE_KEY,
              table: override.clickTable,
              timestampColumn: 'created_at',
              ipHash,
            })
          : false;

        if (!rateLimited) {
          await fetch(`${SUPABASE_URL}/rest/v1/${override.clickTable}`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Accept-Profile': 'public',
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              user_agent: userAgent,
              referrer: referer,
              placement,
              ip_hash: ipHash,
              is_datacenter_ip: isDatacenter,
              link_verified: linkVerified,
              botid_flagged: botIdFlagged,
              ip_address: clientIp,
              country: geo.country,
              city: geo.city,
            }),
          });
        }
      } catch {
        // Logging failure must never block the redirect.
      }
    }
  }

  return new Response(null, { status: 302, headers: { Location: destination } });
};
