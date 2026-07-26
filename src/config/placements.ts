// WHERE a creator appears — paid placement config.
// Scopes: 'home', 'category:<slug>' (slugs come from src/config/categories.ts), and
// 'face-search' (the AI face-match results in UploadBox.astro / api/face-search.ts).
//
// For 'home' and 'category:<slug>', pinned positions are 1-based and GLOBAL across the
// full paginated list for that scope — e.g. position 21 is page 2, item 1 at
// page_size=20. The fetch orchestrator in src/lib/creatorFetch.ts fetches pinned records
// separately and slots them into these exact positions, excluding them from the organic
// query so pagination stays aligned.
//
// 'face-search' is different: results are a single ranked list per uploaded photo, not a
// paginated offset query, so pinning here INSERTS at the given 1-based position (bumping
// the total match count) rather than slotting into a fixed global offset. UploadBox.astro
// blurs every odd 0-based index (1, 3, 5… = every 2nd card) until the visitor signs in, so
// a sponsored card placed on one of those could render blurred/unclickable for anonymous
// visitors. Keep sponsored face-search positions ODD (1, 3, 5…) — 1-based position 1 =
// 0-based index 0, which is never blurred — to stay out of the blurred slots.
import { categories } from './categories';

export interface Placement {
  pinned: { username: string; position: number }[];
  excluded: string[];
}

export const placements: Record<string, Placement> = {
  home: { pinned: [{ username: 'emilylopz', position: 1 }], excluded: [] },
  'face-search': { pinned: [{ username: 'emilylopz', position: 1 }], excluded: [] },
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
