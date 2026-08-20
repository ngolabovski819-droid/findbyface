import type { APIRoute } from 'astro';
import { slugToCategory } from '../../config/categories';
import { resolvePlacements } from '../../lib/creatorFetch';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';

const CACHE_TTL = 60_000;
const CACHE_MAX_ENTRIES = 250;
const SEARCH_TIMEOUT_MS = 8_000;
const cache = new Map<string, { data: unknown; ts: number }>();

function setCached(key: string, data: unknown): void {
  const now = Date.now();
  for (const [candidate, entry] of cache) {
    if (now - entry.ts >= CACHE_TTL) cache.delete(candidate);
  }
  while (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
  cache.set(key, { data, ts: now });
}

function parseTerms(query: string): string[] {
  return query
    .normalize('NFKC')
    .split(/[|,]/)
    .map(term => term
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/[()*%_"\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80))
    .filter(Boolean)
    .slice(0, 5);
}

const CARD_COLS = [
  'id', 'username', 'name', 'about', 'avatar', 'header',
  'isverified', 'subscribeprice', 'favoritedcount', 'subscriberscount',
  'photoscount', 'videoscount',
  'bundle1_price', 'bundle1_discount',
].join(',');

export const GET: APIRoute = async ({ url }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Cache': 'HIT',
      },
    });
  }

  const q        = (url.searchParams.get('q')?.trim() ?? '').slice(0, 160);
  const verified = url.searchParams.get('verified') ?? '';
  const bundles  = url.searchParams.get('bundles') ?? '';
  const price    = url.searchParams.get('price') ?? '';
  const sort     = url.searchParams.get('sort') ?? '';
  const scope    = url.searchParams.get('scope') ?? '';
  const page     = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') ?? '20') || 20, 100);
  const order    = sort === 'newest'
    ? 'first_seen_at.desc.nullslast,favoritedcount.desc'
    : 'favoritedcount.desc,subscribeprice.asc';
  const queryTerms = q ? parseTerms(q) : [];

  if (q && queryTerms.length === 0) {
    const data = { creators: [], total: 0, organicTotal: 0, sponsoredCount: 0, usedFallback: false, hasMore: false };
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  // Pinning only ever activates for the fixed 'home' / 'category:<slug>' / 'onlyfans-search'
  // scopes that index.astro and onlyfans-search.astro explicitly opt into — a bare free-text
  // search (no scope param) always falls through to the plain query below untouched. The
  // 'category:<slug>' branch has no caller left now that the category pages are prerendered
  // (src/lib/categoryStatic.ts does that fetch at build time); it stays because it's the
  // documented scope contract, not because anything on the site still hits it.
  if (scope === 'home' || scope.startsWith('category:') || scope === 'onlyfans-search') {
    let termsOr: string[] | undefined;
    if (scope.startsWith('category:')) {
      const category = slugToCategory(scope.slice('category:'.length));
      if (category) termsOr = category.terms;
    } else if (scope === 'onlyfans-search' && q) {
      termsOr = queryTerms;
    }
    const { creators: placedCreators, total, organicTotal, sponsoredCount, usedFallback, failed } = await resolvePlacements(scope, {
      page, pageSize, order, termsOr,
      verified: verified === 'true',
      bundles: bundles === 'true',
      price,
      allowFallback: scope !== 'onlyfans-search',
    });
    if (failed) {
      return new Response(JSON.stringify({ error: 'Search is temporarily unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    const creators = applySponsorOverrides(placedCreators);
    const hasMore = (page - 1) * pageSize + creators.length < total;
    const data = { creators, total, organicTotal, sponsoredCount, usedFallback, hasMore };
    setCached(cacheKey, data);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  const params = new URLSearchParams();
  params.set('select', CARD_COLS);
  params.set('limit', String(pageSize));
  params.set('offset', String((page - 1) * pageSize));

  params.set('order', order);

  if (q) {
    const exprs = queryTerms.flatMap(t => [
      `username.ilike.*${t}*`,
      `name.ilike.*${t}*`,
      `about.ilike.*${t}*`,
    ]);
    params.set('or', `(${exprs.join(',')})`);
  }

  if (verified === 'true') params.set('isverified', 'eq.true');
  if (bundles  === 'true') params.set('bundle1_price', 'not.is.null');
  if (price === '0')       params.set('subscribeprice', 'eq.0');
  else if (price === '5')  params.set('subscribeprice', 'lte.5');
  else if (price === '10') params.set('subscribeprice', 'lte.10');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': 'public',
        Prefer: 'count=estimated',
      },
      signal: controller.signal,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Search request timed out' }), {
      status: 504,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Supabase error', status: resp.status }), { status: 502 });
  }

  const raw: Record<string, unknown>[] = await resp.json();
  const contentRange = resp.headers.get('Content-Range') ?? '';
  const total = parseInt(contentRange.split('/')[1] ?? '0') || 0;
  const hasMore = (page - 1) * pageSize + raw.length < total;

  const creators = applySponsorOverrides(raw.map(c => ({
    id:               c.id,
    username:         c.username as string,
    name:             c.name,
    about:            c.about,
    avatar:           c.avatar as string | undefined,
    header:           c.header as string | undefined,
    isVerified:       c.isverified,
    subscribePrice:   c.subscribeprice,
    favoritedCount:   c.favoritedcount,
    subscribersCount: c.subscriberscount,
    photosCount:      c.photoscount,
    videosCount:      c.videoscount,
    bundle1Price:     c.bundle1_price,
    bundle1Discount:  c.bundle1_discount,
  })));

  const data = { creators, total, hasMore };
  setCached(cacheKey, data);

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};
