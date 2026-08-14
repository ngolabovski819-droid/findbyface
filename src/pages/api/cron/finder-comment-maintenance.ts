import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { cleanupExpiredVerificationDrafts, listModerationComments } from '../../../lib/finderComments';
import { sendCommentModerationDigest } from '../../../lib/finderCommentEmail';

export const prerender = false;

function authorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);

  try {
    const [deletedDrafts, pending, reported] = await Promise.all([
      cleanupExpiredVerificationDrafts(),
      listModerationComments({ status: 'pending', limit: 1 }),
      listModerationComments({ status: 'reported', limit: 1 }),
    ]);

    let digestSent = false;
    const moderationEmail = (import.meta.env.COMMENT_MODERATION_EMAIL
      || import.meta.env.CONTACT_NOTIFY_EMAIL)?.trim();
    if (moderationEmail && (pending.total > 0 || reported.total > 0)) {
      digestSent = await sendCommentModerationDigest({
        to: moderationEmail,
        pendingCount: pending.total,
        reportedCount: reported.total,
      });
    }

    return json({
      ok: true,
      deletedDrafts,
      pendingCount: pending.total,
      reportedCount: reported.total,
      digestSent,
    });
  } catch (error) {
    console.error('[finder-comments] scheduled maintenance failed',
      error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Maintenance failed' }, 500);
  }
};
