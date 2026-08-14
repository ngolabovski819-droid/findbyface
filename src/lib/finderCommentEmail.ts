import { Resend } from 'resend';
import type { FinderKind } from './finderComments';

type ModerationDecision = 'approved' | 'rejected' | 'removed';

function emailConfig(): { apiKey: string; from: string } | null {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const configuredFrom = import.meta.env.COMMENT_EMAIL_FROM?.trim();
  if (!apiKey) return null;
  const from = configuredFrom || (import.meta.env.PROD
    ? 'FindByFace Search Stories <community@findbyface.org>'
    : 'FindByFace Search Stories <onboarding@resend.dev>');
  return { apiKey, from };
}

function finderPath(finder: FinderKind): string {
  return finder === 'pornstar'
    ? '/pornstar-finder-by-face/#search-stories-title-pornstar'
    : '/onlyfans-finder-by-face/#search-stories-title-onlyfans';
}

function publicSiteUrl(): string {
  return (import.meta.env.PUBLIC_SITE_URL || 'https://findbyface.org').replace(/\/+$/, '');
}

async function send(to: string, subject: string, text: string): Promise<boolean> {
  const config = emailConfig();
  if (!config) {
    console.error('[finder-comments] transactional mail is unavailable; email was not sent');
    return false;
  }

  try {
    const resend = new Resend(config.apiKey);
    const result = await resend.emails.send({ from: config.from, to, subject, text });
    if (result.error) {
      console.error('[finder-comments] email rejected:', result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[finder-comments] email failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function sendCommentVerificationEmail(
  to: string,
  verificationUrl: string,
): Promise<boolean> {
  return send(
    to,
    'Verify your FindByFace comment',
    [
      'Use the secure link below to verify your email and send your comment for review.',
      '',
      verificationUrl,
      '',
      'The link expires soon and works once. Your email address will never appear with your comment.',
      'If you did not submit a comment, you can ignore this message.',
    ].join('\n'),
  );
}

export async function sendCommentModerationEmail(input: {
  to: string;
  finder: FinderKind;
  decision: ModerationDecision;
  reason?: string | null;
}): Promise<boolean> {
  const url = `${publicSiteUrl()}${finderPath(input.finder)}`;
  const explanation = input.reason?.trim()
    ? `Reason: ${input.reason.trim()}`
    : null;
  const copy: Record<ModerationDecision, string> = {
    approved: 'Your FindByFace comment is now public.',
    rejected: 'Your FindByFace comment was not published.',
    removed: 'Your FindByFace comment has been removed from public view.',
  };

  return send(
    input.to,
    'Update on your FindByFace comment',
    [copy[input.decision], explanation, '', input.decision === 'approved' ? url : null]
      .filter((value): value is string => typeof value === 'string')
      .join('\n'),
  );
}

export async function sendApprovedReplyEmail(input: {
  to: string;
  finder: FinderKind;
}): Promise<boolean> {
  return send(
    input.to,
    'You have a new reply on FindByFace',
    [
      'Someone replied to your Search Story. The reply passed moderation and is now public.',
      '',
      `${publicSiteUrl()}${finderPath(input.finder)}`,
      '',
      'This notification does not include creator names or adult-search details for your privacy.',
    ].join('\n'),
  );
}

export async function sendCommentModerationDigest(input: {
  to: string;
  pendingCount: number;
  reportedCount: number;
}): Promise<boolean> {
  return send(
    input.to,
    'FindByFace moderation queue summary',
    [
      `${input.pendingCount} comment${input.pendingCount === 1 ? '' : 's'} waiting for review.`,
      `${input.reportedCount} reported comment${input.reportedCount === 1 ? '' : 's'} need attention.`,
      '',
      `${publicSiteUrl()}/panel/comments/`,
    ].join('\n'),
  );
}
