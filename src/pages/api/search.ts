import type { APIRoute } from 'astro';

const CACHE_TTL = 60_000;
const cache = new Map<string, { data: unknown; ts: number }>();

const CARD_COLS = [
  'id', 'username', 'name', 'about', 'avatar',
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
  const page     = parseInt(url.searchParams.get('page') ?? '1') || 1;
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') ?? '20') || 20, 100);

  const params = new URLSearchParams();
  params.set('select', CARD_COLS);
  params.set('limit', String(pageSize));
  params.set('offset', String((page - 1) * pageSize));

  if (sort === 'newest') {
    params.set('order', 'first_seen_at.desc.nullslast,favoritedcount.desc');
  } else {
    params.set('order', 'favoritedcount.desc,subscribeprice.asc');
  }

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

  const creators = raw.map(c => ({
    id:               c.id,
    username:         c.username,
    name:             c.name,
    about:            c.about,
    avatar:           c.avatar,
    isVerified:       c.isverified,
    subscribePrice:   c.subscribeprice,
    favoritedCount:   c.favoritedcount,
    subscribersCount: c.subscriberscount,
    photosCount:      c.photoscount,
    videosCount:      c.videoscount,
    bundle1Price:     c.bundle1_price,
    bundle1Discount:  c.bundle1_discount,
  }));

  const data = { creators, total, hasMore };
  cache.set(cacheKey, { data, ts: Date.now() });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
