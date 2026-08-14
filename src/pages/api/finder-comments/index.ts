import type { APIRoute } from 'astro';
import {
  createAuthenticatedFinderComment, getPublishedFinderComments,
  isFinderKind, privacyPreservingSearchNonce, type FinderCommentSubmission,
} from '../../../lib/finderComments';
import { verifySearchStoryProof } from '../../../lib/searchStoryProof';
import { authenticated, clientIp, cookieValue, json, parseJson, publicError, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const finder = url.searchParams.get('finder');
  if (!isFinderKind(finder)) return json({ error: 'Invalid finder' }, 400);
  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit == null ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return json({ error: 'Invalid pagination' }, 400);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  if (cursor && cursor.length > 200) return json({ error: 'Invalid pagination' }, 400);
  if (!withinRateLimit(`comments:get:${clientIp(request)}`, 120)) return json({ error: 'Too many requests' }, 429);
  try {
    return json(await getPublishedFinderComments(finder, limit, cookieValue(request, 'fbf_story_voter') ?? undefined, cursor));
  } catch (error) {
    console.error('[finder-comments] public read failed', error);
    return json({ error: 'Could not load search stories' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  const body = await parseJson(request);
  if (!body) return json({ error: 'Invalid request' }, 400);
  const user = await authenticated(request, typeof body.accessToken === 'string' ? body.accessToken : null);
  if (!user) return json({ error: 'Verify your email or sign in to submit' }, 401);
  if (!withinRateLimit(`comments:post:${user.id}`, 5, 10 * 60_000)) return json({ error: 'Too many submissions. Try again later' }, 429);
  const finder = body.finder;
  if (!isFinderKind(finder)) return json({ error: 'Invalid finder' }, 400);
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  const proofToken = typeof body.proof === 'string' ? body.proof : null;
  let searchNonce: string | null = null;
  const proof = await verifySearchStoryProof(proofToken, finder);
  if (!proof) return json({ error: 'A valid completed-search proof is required' }, 403);
  if (!parentId) {
    searchNonce = await privacyPreservingSearchNonce('comment', proof.nonce);
  }
  const submission: FinderCommentSubmission = {
    finder,
    parentId,
    outcome: body.outcome as FinderCommentSubmission['outcome'],
    subjectName: body.subjectName as string | null,
    body: body.body as string,
    notifyReplies: body.notifyReplies === true,
    searchNonce,
    alias: body.alias as string | null,
  };
  try {
    const created = await createAuthenticatedFinderComment(user, submission);
    return json({ id: created.id, status: created.status, message: 'Your comment is waiting for approval' }, 201);
  } catch (error) {
    console.error('[finder-comments] submission failed', error);
    const duplicate = error instanceof Error && (error.message.includes('23505') || error.message.includes('409'));
    return json({ error: duplicate ? 'That search has already been used for a story' : publicError(error, 'Could not submit your comment') }, duplicate ? 409 : 400);
  }
};
