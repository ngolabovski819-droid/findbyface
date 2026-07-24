// WHERE a creator appears — paid placement config.
// Scopes: 'home' and 'category:<slug>' (slugs come from src/config/categories.ts).
// pinned positions are 1-based and GLOBAL across the full paginated list for that scope —
// e.g. position 21 is page 2, item 1 at page_size=20. The fetch orchestrator in
// src/lib/creatorFetch.ts fetches pinned records separately and slots them into these
// exact positions, excluding them from the organic query so pagination stays aligned.
import { categories } from './categories';

export interface Placement {
  pinned: { username: string; position: number }[];
  excluded: string[];
}

export const placements: Record<string, Placement> = {
  home: { pinned: [{ username: 'emilylopz', position: 1 }], excluded: [] },
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
