import type { APIRoute } from 'astro';
import { reportFinderComment, type FinderReportReason } from '../../../lib/finderComments';
import { clientIp, cookieOptions, cookieValue, json, parseJson, publicError, randomVoterKey, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;
const COOKIE = 'fbf_story_reporter';
const REASONS = new Set<FinderReportReason>(['private_identity', 'personal_information', 'underage', 'non_consensual', 'harassment', 'spam', 'other']);

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
  const ip = clientIp(request);
  if (!withinRateLimit(`report:${ip}`, 8, 60 * 60_000)) return json({ error: 'Too many reports. Try again later' }, 429);
  const body = await parseJson(request, 8_192);
  if (!body) return json({ error: 'Invalid request' }, 400);
  // Honeypot bots receive a harmless success so it is not useful as an oracle.
  if (typeof body.website === 'string' && body.website.trim()) return json({ reported: true, underReview: false });
  const reason = body.reason;
  if (typeof reason !== 'string' || !REASONS.has(reason as FinderReportReason)) return json({ error: 'Choose a valid report reason' }, 400);
  const existingKey = cookieValue(request, COOKIE);
  const reporterKey = existingKey && /^[A-Za-z0-9_-]{24,256}$/.test(existingKey) ? existingKey : randomVoterKey();
  try {
    const result = await reportFinderComment({
      commentId: String(body.commentId ?? ''), reporterKey,
      reason: reason as FinderReportReason, details: body.details,
    });
    const headers = existingKey ? {} : { 'Set-Cookie': `${COOKIE}=${encodeURIComponent(reporterKey)}; ${cookieOptions(request)}` };
    return json(result, 200, headers);
  } catch (error) {
    return json({ error: publicError(error, 'Could not submit report') }, 400);
  }
};
