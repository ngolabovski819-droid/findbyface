import type { APIRoute } from 'astro';
import { slugToCategory } from '../../config/categories';
import { resolvePlacements } from '../../lib/creatorFetch';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';

const CACHE_TTL = 60_000;
const cache = new Map<string, { data: unknown; ts: number }>();

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
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const q        = url.searchParams.get('q')?.trim() ?? '';
  const verified = url.searchParams.get('verified') ?? '';
  const bundles  = url.searchParams.get('bundles') ?? '';
  const price    = url.searchParams.get('price') ?? '';
  const sort     = url.searchParams.get('sort') ?? '';
  const scope    = url.searchParams.get('scope') ?? '';
  const page     = parseInt(url.searchParams.get('page') ?? '1') || 1;
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') ?? '20') || 20, 100);
  const order    = sort === 'newest'
    ? 'first_seen_at.desc.nullslast,favoritedcount.desc'
    : 'favoritedcount.desc,subscribeprice.asc';

  // Pinning only ever activates for the fixed 'home' / 'category:<slug>' / 'onlyfans-search'
  // scopes that index.astro, categories/[slug].astro, and onlyfans-search.astro explicitly
  // opt into — a bare free-text search (no scope param) always falls through to the plain
  // query below untouched.
  if (scope === 'home' || scope.startsWith('category:') || scope === 'onlyfans-search') {
    let termsOr: string[] | undefined;
    if (scope.startsWith('category:')) {
      const category = slugToCategory(scope.slice('category:'.length));
      if (category) termsOr = category.terms;
    } else if (scope === 'onlyfans-search' && q) {
      termsOr = q.split(/[|,]/).map(s => s.trim()).filter(Boolean);
    }
    const { creators: placedCreators, total } = await resolvePlacements(scope, {
      page, pageSize, order, termsOr,
      verified: verified === 'true',
      bundles: bundles === 'true',
      price,
    });
    const creators = applySponsorOverrides(placedCreators);
    const hasMore = (page - 1) * pageSize + creators.length < total;
    const data = { creators, total, hasMore };
    cache.set(cacheKey, { data, ts: Date.now() });
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
    const terms = q.split(/[|,]/).map(s => s.trim()).filter(Boolean);
    const exprs = terms.flatMap(t => [
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

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Accept-Profile': 'public',
      Prefer: 'count=estimated',
    },
  });

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
  cache.set(cacheKey, { data, ts: Date.now() });

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
};
