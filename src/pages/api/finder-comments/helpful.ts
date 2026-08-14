import type { APIRoute } from 'astro';
import { toggleHelpfulVote } from '../../../lib/finderComments';
import { clientIp, cookieOptions, cookieValue, json, parseJson, publicError, randomVoterKey, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;
const COOKIE = 'fbf_story_voter';

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  if (!withinRateLimit(`helpful:${clientIp(request)}`, 30, 10 * 60_000)) return json({ error: 'Too many votes. Try again later' }, 429);
  const body = await parseJson(request, 2_048);
  if (!body) return json({ error: 'Invalid request' }, 400);
  const existingKey = cookieValue(request, COOKIE);
  const voterKey = existingKey && /^[A-Za-z0-9_-]{24,256}$/.test(existingKey) ? existingKey : randomVoterKey();
  try {
    const result = await toggleHelpfulVote(String(body.commentId ?? ''), voterKey);
    const headers = existingKey ? {} : { 'Set-Cookie': `${COOKIE}=${encodeURIComponent(voterKey)}; ${cookieOptions(request)}` };
    return json(result, 200, headers);
  } catch (error) {
    return json({ error: publicError(error, 'Could not update helpful vote') }, 400);
  }
};
