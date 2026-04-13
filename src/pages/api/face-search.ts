import type { APIRoute } from 'astro';

const SUPABASE_HEADERS = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Accept-Profile': 'public',
  'Content-Type': 'application/json',
});

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export const POST: APIRoute = async ({ request }) => {
  const SUPABASE_URL = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  let descriptor: number[] = [];
  try {
    const body = await request.json();
    descriptor = body.descriptor ?? [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const hasRealDescriptor = descriptor.length === 128 && descriptor.some(v => v !== 0);
  let results: Record<string, unknown>[];

  if (hasRealDescriptor) {
    // Try pgvector similarity search using Supabase RPC
    try {
      const vectorStr = `[${descriptor.join(',')}]`;
      const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_faces`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({ query_embedding: vectorStr, match_count: 12 }),
      });

      if (rpcResp.ok) {
        const rpcData: Record<string, unknown>[] = await rpcResp.json();
        if (Array.isArray(rpcData) && rpcData.length > 0) {
          results = rpcData.map(c => ({
            id:             c.id,
            username:       c.username,
            name:           c.name,
            avatar:         c.avatar,
            isVerified:     c.isverified,
            subscribePrice: c.subscribeprice,
            favoritedCount: c.favoritedcount,
            matchPct:       Math.round(((c.similarity as number) ?? 0) * 100),
          }));
          return new Response(JSON.stringify({ results, mode: 'vector' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch {
      // fall through to fallback
    }

    // Fallback: fetch 200 creators with embeddings and compute cosine similarity server-side
    const embParams = new URLSearchParams({
      select: 'id,username,name,avatar,isverified,subscribeprice,favoritedcount,face_embedding',
      'face_embedding': 'not.is.null',
      order: 'favoritedcount.desc',
      limit: '200',
    });

    const embResp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${embParams}`, {
      headers: SUPABASE_HEADERS(SUPABASE_KEY),
    });

    if (embResp.ok) {
      const pool: Record<string, unknown>[] = await embResp.json();
      if (pool.length > 0) {
        const scored = pool
          .map(c => {
            let emb: number[] = [];
            try {
              const raw = c.face_embedding as string;
              emb = JSON.parse(raw.replace(/^\[|\]$/g, '') ? raw : '[]');
            } catch { emb = []; }
            const sim = emb.length === 128 ? cosineSimilarity(descriptor, emb) : 0;
            return { ...c, _sim: sim };
          })
          .sort((a, b) => (b._sim as number) - (a._sim as number))
          .slice(0, 12);

        results = scored.map(c => ({
          id:             c.id,
          username:       c.username,
          name:           c.name,
          avatar:         c.avatar,
          isVerified:     c.isverified,
          subscribePrice: c.subscribeprice,
          favoritedCount: c.favoritedcount,
          matchPct:       Math.round(Math.min(100, Math.max(0, (c._sim as number) * 100))),
        }));

        return new Response(JSON.stringify({ results, mode: 'cosine' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Final fallback: no embeddings in DB yet — return popular creators, no match %
  const params = new URLSearchParams({
    select: 'id,username,name,avatar,isverified,subscribeprice,favoritedcount',
    order:  'favoritedcount.desc',
    limit:  '12',
  });

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/onlyfans_profiles?${params}`, {
    headers: SUPABASE_HEADERS(SUPABASE_KEY),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'Supabase error' }), { status: 502 });
  }

  const raw: Record<string, unknown>[] = await resp.json();
  results = raw.map(c => ({
    id:             c.id,
    username:       c.username,
    name:           c.name,
    avatar:         c.avatar,
    isVerified:     c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
    matchPct:       null, // no embeddings yet
  }));

  return new Response(JSON.stringify({ results, mode: 'fallback' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
