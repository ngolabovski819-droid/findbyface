import type { APIRoute } from 'astro';
import {
  cleanupExpiredVerificationDrafts,
  getCommentNotificationContext,
  listModerationComments,
  moderateFinderComment,
} from '../../../lib/finderComments';
import { sendApprovedReplyEmail, sendCommentModerationEmail } from '../../../lib/finderCommentEmail';

export const prerender = false;

type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'removed';
type FinderKind = 'onlyfans' | 'pornstar';
type PublicAction = 'approve' | 'reject' | 'remove' | 'restore' | 'review';
type BackendAction = 'approve' | 'reject' | 'remove' | 'restore' | 'review';

const STATUSES: ModerationStatus[] = ['pending', 'approved', 'rejected', 'under_review', 'removed'];
const FINDERS = new Set<FinderKind>(['onlyfans', 'pornstar']);
const ACTIONS = new Set<PublicAction>(['approve', 'reject', 'remove', 'restore', 'review']);
const REJECTION_REASONS = new Set([
  'private_identity',
  'personal_information',
  'underage_safety',
  'non_consensual_content',
  'harassment',
  'explicit_description',
  'spam',
  'duplicate',
  'off_topic',
  'low_quality',
  'other',
]);
let lastMaintenanceAt = 0;

async function runThrottledMaintenance(): Promise<void> {
  const now = Date.now();
  if (now - lastMaintenanceAt < 24 * 60 * 60_000) return;
  lastMaintenanceAt = now;
  try {
    await cleanupExpiredVerificationDrafts();
  } catch {
    // The authenticated moderation queue must stay usable during a cleanup outage. The cron
    // route and a later admin visit will retry the same idempotent retention operation.
    console.error('[panel-comments] scheduled draft cleanup failed');
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function requireAdmin(locals: { panelUser?: { role: string } }): Response | null {
  if (!locals.panelUser) return json({ error: 'Not signed in.' }, 401);
  if (locals.panelUser.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403);
  return null;
}

function sameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

const PUBLIC_REASON_LABELS: Record<string, string> = {
  private_identity: 'It could reveal a private or hidden identity.',
  personal_information: 'It included personal information.',
  underage_safety: 'It raised an age-safety concern.',
  non_consensual_content: 'It raised a consent or privacy concern.',
  harassment: 'It included harassment or abuse.',
  explicit_description: 'It was too explicit for the community discussion.',
  spam: 'It appeared to be spam or promotional content.',
  duplicate: 'It duplicated an existing contribution.',
  off_topic: 'It was not relevant to the search experience.',
  low_quality: 'It did not include enough useful search detail.',
  other: 'It did not meet the Community Guidelines.',
};

function positiveInteger(value: string | null, fallback: number, max: number): number | null {
  if (value === null || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

// The moderation data layer may need the private address in order to deliver a status email,
// but the browser never does. Strip it (including future nested email fields) at the API edge.
function stripPrivateFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPrivateFields);
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalised = key.toLowerCase().replace(/[^a-z]/g, '');
    if (normalised.includes('email') || normalised.includes('accesstoken') || normalised.includes('refreshtoken')) continue;
    output[key] = stripPrivateFields(child);
  }
  return output;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const authFailure = requireAdmin(locals);
  if (authFailure) return authFailure;

  const requestedStatus = url.searchParams.get('status') ?? 'pending';
  const status = requestedStatus === 'reported' ? 'under_review' : requestedStatus;
  if (!STATUSES.includes(status as ModerationStatus)) {
    return json({ error: 'Invalid status filter.' }, 400);
  }

  const finderValue = url.searchParams.get('finder') ?? '';
  if (finderValue && finderValue !== 'all' && !FINDERS.has(finderValue as FinderKind)) {
    return json({ error: 'Invalid finder filter.' }, 400);
  }

  const page = positiveInteger(url.searchParams.get('page'), 1, 100_000);
  const limit = positiveInteger(url.searchParams.get('limit'), 30, 100);
  if (page === null || limit === null) return json({ error: 'Invalid pagination.' }, 400);

  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length > 80 || q.includes('\0')) return json({ error: 'Search is too long.' }, 400);
  const finder = finderValue && finderValue !== 'all' ? finderValue as FinderKind : 'all';
  const offset = (page - 1) * limit;

  try {
    await runThrottledMaintenance();
    // Counts use the same finder and search filters as the queue, so switching a tab never
    // presents a badge count that belongs to a different result set.
    const includeCounts = url.searchParams.get('counts') !== '0';
    const otherStatuses = includeCounts ? STATUSES.filter(countStatus => countStatus !== status) : [];
    const listStatus = status === 'under_review' ? 'reported' : status;
    const [result, ...countResults] = await Promise.all([
      listModerationComments({ status: listStatus, finder, q: q || undefined, limit, offset }),
      ...otherStatuses.map(countStatus => listModerationComments({ status: countStatus === 'under_review' ? 'reported' : countStatus, finder, q: q || undefined, limit: 1, offset: 0 })),
    ]);
    const counts: Partial<Record<ModerationStatus, number>> = { [status]: result.total };
    otherStatuses.forEach((countStatus, index) => { counts[countStatus] = countResults[index]?.total ?? 0; });
    const totalPages = Math.max(1, Math.ceil(result.total / limit));
    return json({
      comments: stripPrivateFields(result.items),
      counts,
      total: result.total,
      page,
      pageSize: limit,
      totalPages,
    });
  } catch (error) {
    console.error('[panel-comments] Failed to list moderation comments', error);
    return json({ error: 'Could not load the moderation queue.' }, 500);
  }
};

const handleModeration: APIRoute = async ({ request, locals }) => {
  const authFailure = requireAdmin(locals);
  if (authFailure) return authFailure;
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 4_096) return json({ error: 'Request is too large.' }, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'A valid JSON body is required.' }, 400);
  }

  const allowedKeys = new Set(['id', 'action', 'reason', 'note']);
  if (Object.keys(body).some(key => !allowedKeys.has(key))) return json({ error: 'Request contains unsupported fields.' }, 400);

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const action = typeof body.action === 'string' ? body.action as PublicAction : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return json({ error: 'Invalid comment ID.' }, 400);
  if (!ACTIONS.has(action as PublicAction)) return json({ error: 'Invalid moderation action.' }, 400);
  if (action === 'reject' && !REJECTION_REASONS.has(reason)) return json({ error: 'Choose a valid rejection reason.' }, 400);
  if (action !== 'reject' && reason) return json({ error: 'A rejection reason is only valid when rejecting.' }, 400);
  if (note.length > 500 || note.includes('\0')) return json({ error: 'Moderator note is too long.' }, 400);

  const backendAction = action as BackendAction;
  // moderatorLabel is derived solely from the verified session. A caller cannot impersonate
  // another moderator by putting an identity in the request body.
  const moderatorLabel = locals.panelUser!.email || locals.panelUser!.name;

  try {
    const comment = await moderateFinderComment({
      commentId: id,
      action: backendAction,
      moderatorLabel,
      reason: reason || null,
      notes: note || null,
    });

    // Notification delivery is best-effort and intentionally stays server-side, so the admin
    // browser never receives an email address. A mail outage must not roll back moderation.
    if (action === 'approve' || action === 'reject' || action === 'remove') {
      try {
        const context = await getCommentNotificationContext(id);
        if (context) {
          const decision = action === 'reject' ? 'rejected' : action === 'remove' ? 'removed' : 'approved';
          const messages: Array<Promise<boolean>> = [];
          if (context.authorEmail) {
            messages.push(sendCommentModerationEmail({
              to: context.authorEmail,
              finder: comment.finder,
              decision,
              reason: action === 'reject' ? PUBLIC_REASON_LABELS[reason] : null,
            }));
          }
          if (decision === 'approved' && context.isReply && context.parentAuthorEmail
            && context.parentAuthorNotifyReplies && context.parentAuthorEmail !== context.authorEmail) {
            messages.push(sendApprovedReplyEmail({ to: context.parentAuthorEmail, finder: comment.finder }));
          }
          await Promise.allSettled(messages);
        }
      } catch (notificationError) {
        console.error('[panel-comments] Moderation notification failed',
          notificationError instanceof Error ? notificationError.message : 'unknown error');
      }
    }

    // Keep both the public action and resulting comment in the response. The notification
    // layer can use this context to send the neutral approval/rejection/removal email without
    // making the admin browser handle or receive the commenter's email address.
    return json({ ok: true, action, moderationAction: backendAction, comment: stripPrivateFields(comment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/not found/i.test(message)) return json({ error: 'Comment not found.' }, 404);
    if (/invalid|transition|already|reason/i.test(message)) return json({ error: 'That moderation action is not valid for this comment.' }, 409);
    console.error('[panel-comments] Moderation action failed', { commentId: id, action: backendAction, moderatorLabel, error });
    return json({ error: 'Could not update this comment.' }, 500);
  }
};

export const PATCH: APIRoute = handleModeration;
export const POST: APIRoute = handleModeration;
