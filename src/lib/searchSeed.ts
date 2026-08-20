// Build-time seed for the prerendered /onlyfans-search grid — the sibling of
// src/lib/categoryStatic.ts, doing the same job for the one page that stays live.
//
// Only the DEFAULT, unfiltered first page is baked. Everything a visitor actually does
// on that page (typing, filtering, sorting, Load More) still hits /api/search at request
// time; this just removes the guaranteed round trip that used to happen before anyone had
// asked for anything.
//
// Memoized because /onlyfans-search/ and /es/buscador-de-onlyfans/ render the same
// component with the same data and differ only in labels — one query, not two.
import { resolvePlacements } from './creatorFetch';
import { applySponsorOverrides } from './sponsorOverrides';
import { getPlacement } from '../config/placements';

/** Both MUST track src/pages/api/search.ts. If the baked page 1 and the client's page 2
 *  came from different orderings or page sizes, Load More would skip or repeat creators. */
export const SEARCH_SEED_PAGE_SIZE = 20;
export const SEARCH_SEED_ORDER = 'favoritedcount.desc,subscribeprice.asc';

export interface SearchSeed {
  creators: Awaited<ReturnType<typeof applySponsorOverrides>>;
  total: number;
  hasMore: boolean;
}

let pending: Promise<SearchSeed> | null = null;

async function load(): Promise<SearchSeed> {
  const { creators, total } = await resolvePlacements('onlyfans-search', {
    page: 1,
    pageSize: SEARCH_SEED_PAGE_SIZE,
    order: SEARCH_SEED_ORDER,
    // Matches the API: the free-text scope never falls back to the generic popular list.
    allowFallback: false,
  });
  const placed = applySponsorOverrides(creators);

  // Same guard as categoryStatic: a pinned sponsor missing from onlyfans_profiles is
  // silently skipped by resolvePlacements, which for the baked page 1 would mean a paid
  // slot shipping empty until someone eyeballs the page. Every configured first-page pin
  // must actually be present in what got baked.
  const baked = new Set(placed.map(c => c.username.toLowerCase()));
  const missing = getPlacement('onlyfans-search').pinned
    .filter(p => p.position <= SEARCH_SEED_PAGE_SIZE && !baked.has(p.username.toLowerCase()));
  if (placed.length > 0 && missing.length) {
    // Same policy as categoryStatic: hard-fail a production build (a paid first-page slot
    // shipping empty is a real defect), but only warn in dev so an unscraped sponsor
    // doesn't break /onlyfans-search locally while onboarding is still in progress.
    const message =
      `[searchSeed] Pinned sponsor(s) missing from the baked first page: ` +
      missing.map(p => p.username).join(', ') +
      `. Run onlyfans-scraper/scrape_sponsor_once.py <username> before deploying.`;
    if (import.meta.env.PROD) throw new Error(message);
    console.warn('⚠️  ' + message);
  }

  return { creators: placed, total, hasMore: placed.length > 0 && placed.length < total };
}

export function getSearchSeed(): Promise<SearchSeed> {
  pending ??= load();
  return pending;
}
