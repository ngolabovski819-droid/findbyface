// Build-time creator data for the fully prerendered category pages.
//
// /categories/[slug]/[...page] and /es/categorias/[slug]/[...page] are generated at
// build time (`export const prerender = true` + getStaticPaths), so a visitor never
// waits on Supabase — the whole point of this module. It replaces the per-request
// resolvePlacements() call those two pages used to make. /onlyfans-search is now the
// only surface that still queries the database on a visitor request.
//
// Consequence to keep in mind: these pages are frozen until the next deploy. That was
// already true of placements/sponsors (src/config/placements.ts + sponsors.ts are code,
// so a sponsor change has always needed a redeploy) — this just extends it to the
// organic creator list too.
//
// TWO FETCH STRATEGIES, because this table can't serve every category the same way:
//
//   A. Ordered chunks — `order=favoritedcount.desc`, 200 rows per request. Fast for
//      ~36 of the 38 categories (a full 1000 takes 2-5s).
//   B. Unordered sweep — the same filter with NO order clause, 500 rows per request,
//      sorted by favoritedcount in memory afterwards. Some term sets make the planner
//      walk the favoritedcount index and blow Postgres' 8s statement timeout (error
//      57014) on EVERY ordered request, at any limit — 'korean' is the standing
//      example, and it's why /categories/korean/ used to ship with nothing but its 3
//      pinned sponsor cards. The identical filter with no order clause returns all 651
//      matching rows in ~150ms.
//
// B only runs when A stopped short of the 1000 cap, and its rows are MERGED into A's
// rather than replacing them — A's rows are the exact top of the ranking, B fills in
// below. A category A handles cleanly never pays for a sweep, which matters: sweeping
// 'top'/'free'/'footjob' (40k+ matches each) costs far more than A's five requests.
//
// Both strategies keep partial results. These timeouts are transient — the same chunk
// that fails now usually succeeds seconds later — so a category that loses a chunk
// ships with fewer pages instead of failing the whole build.
import { categories, type Category } from '../config/categories';
import { getPlacement } from '../config/placements';
import { fetchOrganicCreators, fetchCreatorsByUsernames, type MappedCreator } from './creatorFetch';

/** Creators per page. Matches the grid the SSR page used to render. */
export const CATEGORY_PAGE_SIZE = 20;

/** Hard cap on how deep a category paginates, mirroring onlyamericanfans' cappedPageCount().
 *  Nobody scrolls 50 pages deep; this bounds how many pages get pre-built per category. */
export const MAX_STATIC_RESULTS = 1000;

/** Effective per-category fetch cap. In `astro dev` this whole module runs on the FIRST
 *  request to any category route (getStaticPaths), and again on every edit that
 *  invalidates it (e.g. touching placements.ts) — at the full 1000 cap that's a ~6-minute
 *  stall before a single category page renders. Dev doesn't need the real depth, so cap
 *  it hard: one ~200-row request per category, no sweeps, whole thing in seconds.
 *  Production builds keep the true 1000. */
const FETCH_CAP = import.meta.env.PROD ? MAX_STATIC_RESULTS : 60;
// In dev, don't rank (the `order=favoritedcount.desc` clause is exactly what tips the
// pathological categories over Postgres' 8s timeout) and don't retry — an unordered,
// single-attempt fetch of FETCH_CAP rows is ~150ms-1s per category, so the whole
// getStaticPaths run is seconds, not minutes. Ranking/depth is a production concern.
const DEV_FAST = !import.meta.env.PROD;

const ORDERED_CHUNK = 200;
/** 1000 per sweep request tips several term sets ('bj', 'korea') over the statement
 *  timeout that 500 clears comfortably. */
const SWEEP_CHUNK = 500;
/** Sweep ceiling. Strategy B only ever runs for categories strategy A got nothing from,
 *  which are small — but a runaway sweep would page through 500k rows at build time. */
const SWEEP_MAX_REQUESTS = 40;
/** These timeouts are transient — this table sits right at the edge of Postgres' 8s
 *  statement timeout, so the same chunk that fails now usually succeeds a second later.
 *  Worth waiting out at build time; it costs one deploy nothing and saves a whole page set. */
const ATTEMPTS = DEV_FAST ? 1 : 4;

export interface CategoryPageData {
  /** Creator lists, already placement-adjusted and chunked. `pages[0]` is page 1. */
  pages: MappedCreator[][];
  /** Count shown under the H1. Real match count when known, planner estimate otherwise. */
  total: number;
  /** True when the category matched nothing and the generic popular list stood in. */
  usedFallback: boolean;
  /** Which strategy produced the rows — logged per category so a deploy that silently
   *  under-generates a category is visible in the build output instead of only in prod. */
  strategy: 'ordered' | 'sweep' | 'ordered+sweep' | 'fallback';
}

/** Both locales build the same 38 categories off the same rows — fetch each one once. */
const cache = new Map<string, Promise<CategoryPageData>>();

async function attempt<T>(fn: () => Promise<T>, ok: (r: T) => boolean, tries = ATTEMPTS): Promise<T> {
  let last = await fn();
  for (let i = 1; i < tries && !ok(last); i++) {
    await new Promise(r => setTimeout(r, 1000 * 2 ** (i - 1)));
    last = await fn();
  }
  return last;
}

/** Strategy A — see the header comment. A chunk that keeps failing ends the walk but
 *  KEEPS everything fetched so far: rows come back ranked, so a partial result is the
 *  correct top-N prefix of the list, just shorter. Dropping it (an earlier version of
 *  this did) turns one blipped request into a whole category losing its pages. */
async function fetchOrdered(
  termsOr: string[],
  excludeUsernames: string[],
): Promise<{ rows: MappedCreator[]; estimatedTotal: number; complete: boolean }> {
  const rows: MappedCreator[] = [];
  let estimatedTotal = 0;
  let complete = false;

  for (let offset = 0; offset < FETCH_CAP; offset += ORDERED_CHUNK) {
    const res = await attempt(
      () => fetchOrganicCreators({
        termsOr, excludeUsernames,
        order: DEV_FAST ? null : undefined,
        limit: DEV_FAST ? FETCH_CAP : ORDERED_CHUNK,
        offset, timeoutMs: 15000,
      }),
      r => !r.failed,
    );
    if (res.failed) break;
    if (offset === 0) estimatedTotal = res.total;
    rows.push(...res.rows);
    if (res.rows.length < ORDERED_CHUNK) { complete = true; break; }
    if (rows.length >= FETCH_CAP) { complete = true; break; }
  }

  return { rows, estimatedTotal, complete };
}

/** Strategy B — see the header comment. Same partial-result rule as strategy A. */
async function fetchUnorderedSweep(
  termsOr: string[],
  excludeUsernames: string[],
): Promise<{ rows: MappedCreator[]; exactTotal: number | null }> {
  const rows: MappedCreator[] = [];
  let complete = false;

  for (let i = 0; i < SWEEP_MAX_REQUESTS; i++) {
    const res = await attempt(
      () => fetchOrganicCreators({
        termsOr,
        excludeUsernames,
        order: null,
        limit: SWEEP_CHUNK,
        offset: i * SWEEP_CHUNK,
        timeoutMs: 20000,
      }),
      r => !r.failed,
    );
    if (res.failed) break;
    rows.push(...res.rows);
    if (res.rows.length < SWEEP_CHUNK) { complete = true; break; }
  }

  // An unordered limit/offset walk has no stable sort to page against, so the same row
  // can come back in two chunks — dedupe before ranking or it renders as a duplicate card.
  const seen = new Set<string>();
  const unique = rows.filter(r => {
    if (seen.has(r.username)) return false;
    seen.add(r.username);
    return true;
  });

  // Unordered rows arrive in physical table order, so the ranking has to happen here.
  // When the sweep hit its ceiling this is the top 1000 of a partial match set rather
  // than of the whole thing — an approximation we accept over failing the build, and
  // one no category currently reaches.
  unique.sort((a, b) => (b.favoritedCount ?? 0) - (a.favoritedCount ?? 0));
  return { rows: unique, exactTotal: complete ? unique.length : null };
}

/** Union of two favoritedCount-ranked lists, deduped by username. `exact` wins ties —
 *  it's the authoritative top of the ranking; `extra` only fills in below it. */
function mergeRanked(exact: MappedCreator[], extra: MappedCreator[]): MappedCreator[] {
  const seen = new Set(exact.map(r => r.username));
  const merged = [...exact];
  for (const row of extra) {
    if (seen.has(row.username)) continue;
    seen.add(row.username);
    merged.push(row);
  }
  merged.sort((a, b) => (b.favoritedCount ?? 0) - (a.favoritedCount ?? 0));
  return merged;
}

/** Slots pinned (paid) creators into their exact 1-based global positions across the
 *  whole capped list, the same contract src/config/placements.ts documents for the
 *  per-request path. A pin whose username isn't in the table is skipped rather than
 *  left as a hole in the grid. */
function applyPlacements(
  organic: MappedCreator[],
  pins: { username: string; position: number }[],
  pinnedRows: MappedCreator[],
): MappedCreator[] {
  if (!pins.length) return organic.slice(0, FETCH_CAP);

  const byUsername = new Map(pinnedRows.map(r => [r.username.toLowerCase(), r]));
  const usable = pins
    .filter(p => byUsername.has(p.username.toLowerCase()))
    .sort((a, b) => a.position - b.position);

  const out: MappedCreator[] = [];
  const limit = Math.min(organic.length + usable.length, FETCH_CAP);
  let organicIdx = 0;

  for (let position = 1; position <= limit; position++) {
    const pin = usable.find(p => p.position === position);
    if (pin) {
      out.push({ ...byUsername.get(pin.username.toLowerCase())!, sponsored: true });
      continue;
    }
    const row = organic[organicIdx++];
    if (!row) break;
    out.push(row);
  }

  return out;
}

async function buildCategory(category: Category): Promise<CategoryPageData> {
  const scope = `category:${category.slug}`;
  const { pinned, excluded } = getPlacement(scope);
  const excludeUsernames = Array.from(new Set([...excluded, ...pinned.map(p => p.username)]));

  const startedAt = Date.now();
  const ordered = await fetchOrdered(category.terms, excludeUsernames);
  let organic = ordered.rows;
  let total = ordered.estimatedTotal;
  let strategy: CategoryPageData['strategy'] = 'ordered';
  let complete = ordered.complete;

  // The ordered walk stopping short means a chunk kept timing out, not that the category
  // ran out of creators. The sweep can usually supply the rest, so MERGE the two rather
  // than picking one: the ordered rows are the exact top of the ranking (nothing outside
  // them can outrank them), and the sweep only contributes what comes after. Sorting the
  // union by favoritedCount therefore keeps the ordered prefix exactly where it was.
  if (!complete && organic.length < FETCH_CAP) {
    const swept = await fetchUnorderedSweep(category.terms, excludeUsernames);
    if (swept.rows.length) {
      strategy = organic.length ? 'ordered+sweep' : 'sweep';
      organic = mergeRanked(organic, swept.rows);
      complete = swept.exactTotal !== null;
      total = Math.max(total, swept.exactTotal ?? 0, organic.length);
    }
  }

  organic = organic.slice(0, FETCH_CAP);

  // A category that genuinely matches nothing falls back to the general popular list,
  // same as the SSR page did — better than an empty grid under the heading. The total
  // is capped to what's on the page, since the unfiltered row count would be a lie
  // under a category H1.
  let usedFallback = false;
  if (organic.length === 0) {
    const popular = await attempt(
      () => fetchOrganicCreators({ excludeUsernames, limit: CATEGORY_PAGE_SIZE, offset: 0, timeoutMs: 15000 }),
      r => !r.failed,
    );
    // Nothing filtered, nothing unfiltered — Supabase itself is unreachable, not a quirk
    // of this category's terms. Fail the build rather than deploying 38 empty grids.
    if (popular.failed) {
      throw new Error(
        `[categoryStatic] Supabase returned nothing for "${category.slug}" AND nothing for the ` +
        `unfiltered popular query — treating this as an outage and aborting the build.`,
      );
    }
    organic = popular.rows;
    usedFallback = true;
    strategy = 'fallback';
    complete = true;
  }

  const pinsInRange = pinned.filter(p => p.position <= FETCH_CAP);
  const pinnedRows = pinsInRange.length ? await fetchCreatorsByUsernames(pinsInRange.map(p => p.username)) : [];

  // A pinned username with no onlyfans_profiles row would be SILENTLY skipped — for a
  // paid placement that means shipping a campaign that renders nowhere. New sponsors
  // must be scraped into the table first (onlyfans-scraper/scrape_sponsor_once.py);
  // fail the build loudly instead of letting the deploy quietly not deliver the order.
  const foundPinned = new Set(pinnedRows.map(r => r.username.toLowerCase()));
  const missingPins = pinsInRange.filter(p => !foundPinned.has(p.username.toLowerCase()));
  if (missingPins.length) {
    // A paid pin with no onlyfans_profiles row renders nowhere. FAIL a production build so
    // a dead campaign can't ship — but only WARN in dev, where an unscraped sponsor is the
    // normal state mid-onboarding and a hard throw would break every category page locally.
    const message =
      `[categoryStatic] Pinned sponsor(s) missing from onlyfans_profiles: ` +
      missingPins.map(p => p.username).join(', ') +
      `. Run onlyfans-scraper/scrape_sponsor_once.py <username> before deploying.`;
    if (import.meta.env.PROD) throw new Error(message);
    console.warn('⚠️  ' + message);
  }
  const placed = usedFallback ? organic : applyPlacements(organic, pinsInRange, pinnedRows);

  const pages: MappedCreator[][] = [];
  for (let i = 0; i < placed.length; i += CATEGORY_PAGE_SIZE) {
    pages.push(placed.slice(i, i + CATEGORY_PAGE_SIZE));
  }
  if (!pages.length) pages.push([]);

  const flags = [strategy === 'ordered' ? '' : strategy.toUpperCase(), complete ? '' : 'PARTIAL']
    .filter(Boolean).join(' ');
  const note = flags ? `  ← ${flags}` : '';
  console.log(
    `[categoryStatic] ${category.slug.padEnd(16)} ${String(placed.length).padStart(4)} creators` +
    ` → ${String(pages.length).padStart(2)} pages  ${Date.now() - startedAt}ms${note}`,
  );

  return {
    pages,
    total: usedFallback ? placed.length : Math.max(total, placed.length),
    usedFallback,
    strategy,
  };
}

/** Build-time entry point. Memoized per category so the EN and ES routes share one fetch. */
export function getCategoryPageData(category: Category): Promise<CategoryPageData> {
  const cached = cache.get(category.slug);
  if (cached) return cached;
  const pending = buildCategory(category);
  cache.set(category.slug, pending);
  return pending;
}

export interface CategoryStaticPath {
  category: Category;
  /** 1-based. Page 1 renders at the bare category URL. */
  page: number;
  totalPages: number;
  creators: MappedCreator[];
  total: number;
}

/** Every (category, page) pair to prerender. Shared by both locale routes. */
export async function allCategoryStaticPaths(): Promise<CategoryStaticPath[]> {
  const out: CategoryStaticPath[] = [];
  for (const category of categories) {
    const { pages, total } = await getCategoryPageData(category);
    pages.forEach((creators, i) => {
      out.push({ category, page: i + 1, totalPages: pages.length, creators, total });
    });
  }
  return out;
}
