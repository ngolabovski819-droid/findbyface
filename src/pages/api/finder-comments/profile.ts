import type { APIRoute } from 'astro';
import { getFinderProfileByUserId, getOrCreateFinderProfile, updateFinderProfileAlias } from '../../../lib/finderComments';
import { authenticated, json, parseJson, publicError, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await authenticated(request);
  if (!user) return json({ error: 'Sign in to view your comment profile' }, 401);
  try {
    const profile = await getFinderProfileByUserId(user.id);
    return json({ profile });
  } catch (error) {
    console.error('[finder-comments] profile read failed', error);
    return json({ error: 'Could not load your comment profile' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  const body = await parseJson(request, 2_048);
  if (!body) return json({ error: 'Invalid request' }, 400);
  const user = await authenticated(request, typeof body.accessToken === 'string' ? body.accessToken : null);
  if (!user) return json({ error: 'Sign in to update your alias' }, 401);
  if (!withinRateLimit(`profile:${user.id}`, 10, 60 * 60_000)) return json({ error: 'Too many profile updates' }, 429);
  try {
    const existing = await getFinderProfileByUserId(user.id);
    const profile = existing
      ? await updateFinderProfileAlias(existing.id, body.alias)
      : await getOrCreateFinderProfile(user.id, user.email, body.alias as string);
    return json({ profile });
  } catch (error) {
    const conflict = error instanceof Error && (error.message.includes('23505') || error.message.includes('409'));
    return json({ error: conflict ? 'That alias is already taken' : publicError(error, 'Could not update your alias') }, conflict ? 409 : 400);
  }
};
