import type { APIRoute } from 'astro';
import { isFinderKind, isFinderOutcome, privacyPreservingSearchNonce, recordAnonymousFinderFeedback } from '../../../lib/finderComments';
import { verifySearchStoryProof } from '../../../lib/searchStoryProof';
import { clientIp, json, parseJson, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  if (!withinRateLimit(`feedback:${clientIp(request)}`, 15, 60 * 60_000)) return json({ error: 'Too many feedback requests' }, 429);
  const body = await parseJson(request, 4_096);
  if (!body || !isFinderKind(body.finder) || !isFinderOutcome(body.outcome)) return json({ error: 'Invalid feedback' }, 400);
  const proof = await verifySearchStoryProof(typeof body.proof === 'string' ? body.proof : null, body.finder);
  if (!proof) return json({ error: 'A valid completed-search proof is required' }, 403);
  try {
    await recordAnonymousFinderFeedback(body.finder, body.outcome, await privacyPreservingSearchNonce('feedback', proof.nonce));
    return json({ ok: true });
  } catch (error) {
    console.error('[finder-comments] feedback failed', error);
    return json({ error: 'Could not save feedback' }, 500);
  }
};
