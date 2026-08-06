// Mints short-lived click-verification tokens (src/lib/clickToken.ts) for sponsored creators,
// called by client-side JS after a page has actually loaded (src/components/
// CreatorCardEnhancements.astro) — never at page-render time, since the pages that render
// sponsored cards are CDN-cached and a token baked into cached HTML would be shared by every
// visitor for up to 24h.
//
// Always uncached (Cache-Control: no-store) — the whole point is that this reflects "someone's
// browser is looking at this page right now," not a value that can be fetched once and reused.
//
// What this actually proves, and what it doesn't: a plain HTTP client (curl/requests/aiohttp/
// Go/Java — every bot UA actually seen in this network's click logs) never executes page
// JavaScript at all, so it never calls this endpoint in the normal course of hitting /go/
// directly, which is the exact pattern behind every confirmed bot hit audited so far. What it
// does NOT prove: this endpoint was tried gated on the `Sec-Fetch-Site` header too, on the
// theory that only a real same-origin browser fetch() sends it — dropped after testing showed
// that's unreliable in both directions: not consistently present on genuine browser requests,
// and trivially forgeable by any script willing to set it (headers are just data an attacker
// fully controls; nothing header-based is ever a hard proof). So this endpoint is a real, if
// modest, hurdle against the passive/naive scripts actually observed here, not a wall against
// someone who deliberately reverse-engineers and replicates this exact call.
import type { APIRoute } from 'astro';
import { getSponsorOverride } from '../../config/sponsors';
import { isBotUserAgent } from '../../lib/botDetection';
import { mintClickToken } from '../../lib/clickToken';

export const prerender = false;

const NO_STORE = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };

export const GET: APIRoute = async ({ url, request }) => {
  const usernames = (url.searchParams.get('u') ?? '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean)
    .slice(0, 20); // defensive cap — no real page renders anywhere near this many sponsored cards

  const userAgent = request.headers.get('user-agent') ?? '';
  const CLICK_TOKEN_SECRET = import.meta.env.CLICK_TOKEN_SECRET;

  const tokens: Record<string, string> = {};

  if (!isBotUserAgent(userAgent) && CLICK_TOKEN_SECRET) {
    for (const username of usernames) {
      const override = getSponsorOverride(username);
      if (override?.clickTable || override?.linkOverride) {
        tokens[username.toLowerCase()] = mintClickToken(username, CLICK_TOKEN_SECRET);
      }
    }
  }

  return new Response(JSON.stringify({ tokens }), { status: 200, headers: NO_STORE });
};
