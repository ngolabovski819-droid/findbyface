import type { APIRoute } from 'astro';
import { getMineByUser, safelyDeleteMine } from '../../../lib/finderComments';
import { authenticated, json, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await authenticated(request);
  if (!user) return json({ error: 'Sign in to view your comments' }, 401);
  try {
    return json({ comments: await getMineByUser(user.id) });
  } catch (error) {
    console.error('[finder-comments] own comments read failed', error);
    return json({ error: 'Could not load your comments' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  const user = await authenticated(request);
  if (!user) return json({ error: 'Sign in to remove your comment' }, 401);
  if (!withinRateLimit(`mine:delete:${user.id}`, 10, 60 * 60_000)) return json({ error: 'Too many removal requests' }, 429);
  const id = url.searchParams.get('id') ?? '';
  try {
    const removed = await safelyDeleteMine(user.id, id);
    if (!removed) return json({ error: 'Comment not found' }, 404);
    return json({ removed: true });
  } catch (error) {
    console.error('[finder-comments] own comment removal failed', error);
    return json({ error: 'Could not remove your comment' }, 500);
  }
};
