// WHERE a creator appears — paid placement config.
// Scopes: 'home', 'category:<slug>' (slugs come from src/config/categories.ts),
// 'face-search' (the AI face-match results in UploadBox.astro / api/face-search.ts), and
// 'search-dropdown' (the ranked sponsored rows in every recent-searches dropdown, see
// api/search-ad.ts).
//
// For 'home' and 'category:<slug>', pinned positions are 1-based and GLOBAL across the
// full paginated list for that scope — e.g. position 21 is page 2, item 1 at
// page_size=20. The fetch orchestrator in src/lib/creatorFetch.ts fetches pinned records
// separately and slots them into these exact positions, excluding them from the organic
// query so pagination stays aligned.
//
// 'face-search' positions count SPONSORED SLOTS rather than literal grid cards. Each paid
// card is followed by one organic card, which is the locked "Unlock" card for signed-out
// visitors: sponsor position 1 renders at grid card 1, position 2 at grid card 3, position
// 3 at grid card 5, and so on. UploadBox.astro locks every even 1-based grid card.
import { categories } from './categories';

export interface Placement {
  pinned: { username: string; position: number }[];
  excluded: string[];
}

export const placements: Record<string, Placement> = {
  home: {
    pinned: [
      { username: 'emilylopz', position: 1 },
      { username: 'rocketreynaxo', position: 2 },
      { username: 'hannazuki', position: 3 },
    ],
    excluded: [],
  },
  'face-search': {
    pinned: [
      { username: 'emilylopz', position: 1 },
      { username: 'rocketreynaxo', position: 2 },
      { username: 'hannazuki', position: 3 },
    ],
    excluded: [],
  },
  'search-dropdown': {
    pinned: [
      { username: 'emilylopz', position: 1 },
      { username: 'rocketreynaxo', position: 2 },
      { username: 'hannazuki', position: 3 },
    ],
    excluded: [],
  },
};

export function getPlacement(scope: string): Placement {
  return placements[scope] ?? { pinned: [], excluded: [] };
}

// Pin the same creator across many category scopes at once instead of hand-listing
// dozens of near-identical entries. Pass `slugs` for a specific subset (e.g. a
// "Tier 1" grouping); omit it to pin across every category.
export function pinAcrossCategories(username: string, position: number, slugs?: string[]): void {
  const targetSlugs = slugs ?? categories.map(c => c.slug);
  for (const slug of targetSlugs) {
    const scope = `category:${slug}`;
    const existing = placements[scope] ?? { pinned: [], excluded: [] };
    existing.pinned.push({ username, position });
    placements[scope] = existing;
  }
}

// Active paid placements — one call per order.
pinAcrossCategories('emilylopz', 1);
pinAcrossCategories('rocketreynaxo', 2);
pinAcrossCategories('hannazuki', 3);
