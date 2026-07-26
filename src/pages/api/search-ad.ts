import type { APIRoute } from 'astro';
import { getPlacement } from '../../config/placements';
import { fetchCreatorsByUsernames } from '../../lib/creatorFetch';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';

const CACHE_TTL = 60_000;
let cached: { data: unknown; ts: number } | null = null;

// Serves the single pinned sponsored row shown above recent searches in every
// search-history dropdown (src/lib/searchDropdown.ts). Tags its outbound link with
// ?slot=search-dropdown so /go/[username].ts records clicks from this specific widget
// under a distinct `placement` value, separate from that creator's other appearances.
export const GET: APIRoute = async () => {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const pin = getPlacement('search-dropdown').pinned[0];
  let ad: { username: string; name: string; avatar: string; profileUrl: string } | null = null;

  if (pin) {
    const rows = await fetchCreatorsByUsernames([pin.username]);
    if (rows[0]) {
      const [withOverride] = applySponsorOverrides(rows);
      const profileUrl = withOverride.profileUrl.startsWith('/go/')
        ? `${withOverride.profileUrl}?slot=search-dropdown`
        : withOverride.profileUrl;
      ad = {
        username: withOverride.username,
        name: withOverride.name ?? withOverride.username,
        avatar: withOverride.avatar ?? '',
        profileUrl,
      };
    }
  }

  const data = { ad };
  cached = { data, ts: Date.now() };
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
