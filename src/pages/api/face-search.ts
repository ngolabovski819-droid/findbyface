import type { APIRoute } from 'astro';
import { applySponsorOverrides } from '../../lib/sponsorOverrides';
import { applyFaceSearchPlacements } from '../../lib/creatorFetch';
import { createSearchStoryProof } from '../../lib/searchStoryProof';

type FaceResult = { username: string; matchPct?: number | null };
async function finalizeResults(results: Record<string, unknown>[]) {
  return applySponsorOverrides(await applyFaceSearchPlacements(results as unknown as FaceResult[]));
}

async function success(payload: Record<string, unknown>, completedFaceSearch = true): Promise<Response> {
  if (completedFaceSearch) {
    try {
      const proof = await createSearchStoryProof('onlyfans');
      payload.searchProof = proof.token;
    } catch (error) {
      // Search remains available if community proof signing is not configured. The
      // client simply keeps the Search Story composer locked for that search.
      console.error('[finder-comments] could not sign OnlyFans search proof:', error instanceof Error ? error.message : String(error));
    }
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

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
    descriptor = Array.isArray(body.descriptor) ? body.descriptor : [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  // Face-api descriptors are finite, normalized float vectors. Reject strings, infinities,
  // extreme values, empty vectors, and trivial direct-API payloads before issuing a proof.
  const hasRealDescriptor = descriptor.length === 128
    && descriptor.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 5)
    && descriptor.some(v => Math.abs(v) > 1e-8)
    && Math.sqrt(descriptor.reduce((sum, v) => sum + v * v, 0)) >= 0.1;
  let results: Record<string, unknown>[];

  if (hasRealDescriptor) {
    // Try pgvector similarity search using Supabase RPC
    try {
      const vectorStr = `[${descriptor.join(',')}]`;
      const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_faces`, {
        method: 'POST',
        headers: SUPABASE_HEADERS(SUPABASE_KEY),
        body: JSON.stringify({ query_embedding: vectorStr, match_count: 100 }),
      });

      if (rpcResp.ok) {
        const rpcData: Record<string, unknown>[] = await rpcResp.json();
        if (Array.isArray(rpcData) && rpcData.length > 0) {
          results = rpcData.map(c => ({
            id:             c.id,
            username:       c.username,
            name:           c.name,
            avatar:         c.avatar,
            header:         c.header,
            isVerified:     c.isverified,
            subscribePrice: c.subscribeprice,
            favoritedCount: c.favoritedcount,
            matchPct:       Math.round(((c.similarity as number) ?? 0) * 100),
          }));
          return success({ results: await finalizeResults(results), mode: 'vector' });
        }
      }
    } catch {
      // fall through to fallback
    }

    // Fallback: fetch creators with embeddings and compute cosine similarity server-side
    const embParams = new URLSearchParams({
      select: 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount,face_embedding',
      'face_embedding': 'not.is.null',
      order: 'favoritedcount.desc',
      limit: '1000',
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
          .slice(0, 100);

        results = scored.map(c => ({
          id:             c.id,
          username:       c.username,
          name:           c.name,
          avatar:         c.avatar,
          header:         c.header,
          isVerified:     c.isverified,
          subscribePrice: c.subscribeprice,
          favoritedCount: c.favoritedcount,
          matchPct:       Math.round(Math.min(100, Math.max(0, (c._sim as number) * 100))),
        }));

        return success({ results: await finalizeResults(results), mode: 'cosine' });
      }
    }
  }

  // Final fallback: no embeddings in DB yet — return popular creators, no match %
  const params = new URLSearchParams({
    select: 'id,username,name,avatar,header,isverified,subscribeprice,favoritedcount',
    order:  'favoritedcount.desc',
    limit:  '100',
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
    header:         c.header,
    isVerified:     c.isverified,
    subscribePrice: c.subscribeprice,
    favoritedCount: c.favoritedcount,
    matchPct:       null, // no embeddings yet
  }));

  // Popular-profile fallback remains useful when embeddings are not yet available, but an
  // invalid or empty descriptor is not a completed face search and must never unlock UGC.
  return success({ results: await finalizeResults(results), mode: 'fallback' }, hasRealDescriptor);
};
