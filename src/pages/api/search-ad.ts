import type { APIRoute } from 'astro';
import { getPlacement } from '../../config/placements';
import { fetchCreatorsByUsernames } from '../../lib/creatorFetch';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';

const CACHE_TTL = 60_000;
let cached: { data: unknown; ts: number } | null = null;

// Serves the ranked sponsored rows shown above recent searches in every
// search-history dropdown (src/lib/searchDropdown.ts). Tags its outbound link with
// ?slot=search-dropdown so /go/[username].ts records clicks from this specific widget
// under a distinct `placement` value, separate from that creator's other appearances.
export const GET: APIRoute = async () => {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const pins = [...getPlacement('search-dropdown').pinned].sort((a, b) => a.position - b.position);
  const rows = pins.length ? await fetchCreatorsByUsernames(pins.map(pin => pin.username)) : [];
  const byUsername = new Map(
    applySponsorOverrides(rows).map(row => [row.username.toLowerCase(), row]),
  );
  const ads = pins.flatMap(pin => {
    const creator = byUsername.get(pin.username.toLowerCase());
    if (!creator) return [];
    const profileUrl = creator.profileUrl.startsWith('/go/')
      ? `${creator.profileUrl}?slot=search-dropdown`
      : creator.profileUrl;
    return [{
      username: creator.username,
      name: creator.name ?? creator.username,
      avatar: creator.avatar ?? '',
      profileUrl,
    }];
  });

  const data = { ads, ad: ads[0] ?? null };
  cached = { data, ts: Date.now() };
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
