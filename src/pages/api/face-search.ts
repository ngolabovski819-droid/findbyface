import type { APIRoute } from 'astro';

// MVP: ignores the descriptor, returns top 12 creators by favoritedcount with mock match %
// Phase 2: use pgvector cosine similarity
//   SELECT *, 1 - (face_embedding <=> $1::vector) AS score
//   FROM onlyfans_profiles WHERE face_embedding IS NOT NULL
//   ORDER BY score DESC LIMIT 12

export const POST: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  let _descriptor: number[] = [];
  try {
    const body = await request.json();
    _descriptor = body.descriptor ?? [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const params = new URLSearchParams({
    select: 'id,username,name,avatar,isverified,subscribeprice,favoritedcount',
    order:  'favoritedcount.desc',
    limit:  '12',
  });

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Accept-Profile': 'public',
    },
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Supabase error' }), { status: 502 });
  }

  const raw: Record<string, unknown>[] = await resp.json();

  const results = raw.map(c => ({
    id:             c.id,
    username:       c.username,
    name:           c.name,
    avatar:         c.avatar,
    isVerified:     c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
    matchPct:       Math.floor(Math.random() * 22) + 75, // 75–97% mock
  }));

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
