// WHERE a creator appears — paid placement config.
// Scopes: 'home', 'category:<slug>' (slugs come from src/config/categories.ts),
// 'face-search' (the AI face-match results in UploadBox.astro / api/face-search.ts),
// 'search-dropdown' (the ranked sponsored rows in every recent-searches dropdown, see
// api/search-ad.ts), and 'battle' (api/battle-unlimited.ts) — pinned creators here get
// boosted odds of appearing as an Unlimited-mode Battle candidate (SPONSOR_SLOT_RATE in
// that file), never a fake/inflated answer. `position` is unused for this scope — it's a
// flat pool, not a ranked list — pick a random pin each time a sponsored slot triggers.
//
// For 'home' and 'category:<slug>', pinned positions are 1-based and GLOBAL across the
// full paginated list for that scope — e.g. position 21 is page 2, item 1 at
// page_size=20. The fetch orchestrator in src/lib/creatorFetch.ts fetches pinned records
// separately and slots them into these exact positions, excluding them from the organic
// query so pagination stays aligned.
//
// 'face-search' positions count sponsored slots. Sponsor position 1 renders as the first
// card, position 2 as the third card, and so on, producing an ad/match/ad/match sequence.
// UploadBox.astro counts organic results separately, so ads never consume a free slot.
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
      { username: 'cosplaytsumiko', position: 1 },
      { username: 'rocketreynaxo', position: 2 },
      { username: 'rinayanami', position: 3 },
      { username: 'hannazuki', position: 4 },
      { username: 'emilylopz', position: 6 },
    ],
    excluded: [],
  },
  // Intentionally no sponsored row in the search-bar dropdown right now (owner's call,
  // 2026-08-20). api/search-ad.ts returns an empty list for an empty pin array and
  // searchDropdown.ts hides the ad slot on no ads — so this cleanly shows recent
  // searches + popular categories with no "Sponsored" entry. Re-add { username, position }
  // entries here to bring it back.
  'search-dropdown': {
    pinned: [],
    excluded: [],
  },
  // No one's bought a Battle slot yet — add { username, position } entries here (position
  // is ignored for this scope, see note above) once a placement is sold.
  battle: {
    pinned: [],
    excluded: [],
  },
  // The main results grid on /onlyfans-search.astro (src/pages/api/search.ts, scope=
  // 'onlyfans-search') — distinct from 'search-dropdown' above, which only covers that
  // page's recent-searches dropdown, not its actual result cards.
  'onlyfans-search': {
    pinned: [
      { username: 'cosplaytsumiko', position: 1 },
      { username: 'rocketreynaxo', position: 2 },
      { username: 'rinayanami', position: 4 },
      { username: 'hannazuki', position: 5 },
      { username: 'emilylopz', position: 6 },
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
// Current order (onlyfans-search / categories): cosplaytsumiko 1, rocketreynaxo 2,
// rinayanami 4, hannazuki 5, emilylopz 6. Position 3 is left to organic creators.
// rinayanami (added 2026-08-26) bought onlyfans-search + all categories + face-search, which
// bumped hannazuki 4 → 5 on the first two. face-search is pinned separately above and its
// numbers count AD slots (pos N → grid card 2N-1): tsumiko 1, rocket 2, rinayanami 3,
// hannazuki 4, emily 6 → cards 1/3/5/7/11, i.e. ad, match, ad, match, ad, match, ad —
// hannazuki didn't move there, rinayanami just filled the empty slot 3. Home keeps its own
// pins (hannazuki 3).
// emilylopz still holds position 1 on the 'home' scope — untouched by these deals.
pinAcrossCategories('cosplaytsumiko', 1);
pinAcrossCategories('rocketreynaxo', 2);
pinAcrossCategories('rinayanami', 4);
pinAcrossCategories('hannazuki', 5);
pinAcrossCategories('emilylopz', 6);
