import type { APIRoute } from 'astro';
import { createHash, randomBytes } from 'node:crypto';
import {
  consumeVerificationDraft,
  createFinderCommentFromVerificationDraft,
  createVerificationDraft,
  discardUnsentVerificationDraft,
  getOrCreateVerifiedGuestProfile,
  isFinderKind,
  privacyPreservingFinderIdentifier,
  type FinderCommentSubmission,
  type VerificationDraftPayload,
} from '../../../lib/finderComments';
import { sendCommentVerificationEmail } from '../../../lib/finderCommentEmail';
import { verifySearchStoryProof } from '../../../lib/searchStoryProof';
import { verifyTurnstileToken } from '../../../lib/turnstile';
import { clientIp, json, parseJson, publicError, sameOrigin, withinRateLimit } from './_shared';

export const prerender = false;

const LINK_TTL_MS = 30 * 60_000;
const EMAIL_QUOTA_WINDOW_MS = 15 * 60_000;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// The token remains an unguessable bearer credential, but is deterministic for one
// normalized email address during a short time window. The drafts table already has a
// unique token_hash constraint, so concurrent requests across separate Vercel instances
// can create/send at most one verification email per address per window without new DDL.
async function verificationToken(email: string): Promise<string> {
  const window = Math.floor(Date.now() / EMAIL_QUOTA_WINDOW_MS);
  try {
    // This helper uses COMMENT_PRIVACY_SECRET when configured, otherwise a
    // purpose-derived SEARCH_STORY_SECRET/CLICK_TOKEN_SECRET key. Root secrets
    // never leave the server-side helper.
    return await privacyPreservingFinderIdentifier(
      'verification-email-window', `${window}:${email}`,
    );
  } catch (error) {
    if (import.meta.env.PROD) throw error;
    return randomBytes(32).toString('base64url');
  }
}

function finderDestination(finder: 'onlyfans' | 'pornstar', state: 'verified' | 'failed'): string {
  const path = finder === 'pornstar'
    ? '/pornstar-finder-by-face/'
    : '/onlyfans-finder-by-face/';
  const anchor = `search-stories-title-${finder}`;
  return `${path}?${state === 'verified' ? 'comment_verified=1' : 'comment_error=verification'}#${anchor}`;
}

function redirect(request: Request, finder: 'onlyfans' | 'pornstar', state: 'verified' | 'failed'): Response {
  const configuredOrigin = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  const origin = configuredOrigin || (import.meta.env.PROD ? 'https://findbyface.org' : new URL(request.url).origin);
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(finderDestination(finder, state), `${origin}/`).toString(),
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Invalid request origin' }, 403);
  }

  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY?.trim();
  if (import.meta.env.PROD && !turnstileSecret) {
    console.error('[finder-comments] guest verification disabled: TURNSTILE_SECRET_KEY is missing');
    return json({ error: 'Comment verification is temporarily unavailable' }, 503);
  }

  const ip = clientIp(request);
  if (!withinRateLimit(`comment-verify:${ip}`, 10, 60 * 60_000)) {
    return json({ error: 'Too many verification requests. Try again later' }, 429);
  }

  const body = await parseJson(request, 12_288);
  if (!body) return json({ error: 'Invalid request' }, 400);

  // Do not reveal the honeypot to automated submitters.
  if ((typeof body.company === 'string' && body.company.trim())
    || (typeof body.website === 'string' && body.website.trim())) {
    return json({ ok: true, message: 'Check your inbox for the verification link' }, 202);
  }

  if (!isFinderKind(body.finder)) return json({ error: 'Invalid finder' }, 400);
  const finder = body.finder;
  const email = typeof body.email === 'string'
    ? body.email.normalize('NFKC').trim().toLowerCase()
    : '';
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email address' }, 400);
  }

  if (turnstileSecret) {
    const human = await verifyTurnstileToken(
      typeof body.turnstileToken === 'string' ? body.turnstileToken : null,
      turnstileSecret,
      ip,
    );
    if (!human) return json({ error: 'Verification failed. Please try again' }, 400);
  }

  const proof = await verifySearchStoryProof(typeof body.proof === 'string' ? body.proof : null, finder);
  if (!proof) return json({ error: 'A valid completed-search proof is required' }, 403);

  const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
  const payload: VerificationDraftPayload = {
    parentId,
    outcome: body.outcome as FinderCommentSubmission['outcome'],
    subjectName: body.subjectName as string | null,
    body: body.body as string,
    notifyReplies: body.notifyReplies === true,
    // The proof is checked for replies too, but only top-level stories retain its anonymous
    // nonce. No photo, result, account, or IP is ever attached to the public contribution.
    searchNonce: parentId ? null : proof.nonce,
    alias: body.alias as string | null,
  };

  let opaqueToken: string;
  try {
    opaqueToken = await verificationToken(email);
  } catch (error) {
    console.error('[finder-comments] verification token unavailable',
      error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Comment verification is temporarily unavailable' }, 503);
  }
  const hash = tokenHash(opaqueToken);
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  // createVerificationDraft applies the private HMAC internally; pass only the raw rate-limit
  // dimension here so a secret is never duplicated into stored/request data.
  const requesterKey = ip !== 'unknown' ? `verification-ip:${ip}` : null;

  try {
    const draft = await createVerificationDraft({
      email,
      finder,
      payload,
      tokenHash: hash,
      expiresAt,
      requesterKey,
    });

    const base = (import.meta.env.PUBLIC_SITE_URL
      || (import.meta.env.PROD ? 'https://findbyface.org' : new URL(request.url).origin)).replace(/\/+$/, '');
    const verificationUrl = new URL('/api/finder-comments/verify', `${base}/`);
    verificationUrl.searchParams.set('token', opaqueToken);
    const sent = await sendCommentVerificationEmail(email, verificationUrl.toString());
    if (!sent) {
      try { await discardUnsentVerificationDraft(draft.id); } catch { /* daily cleanup is the fallback */ }
      return json({ error: 'Could not send the verification email. Please try again later' }, 503);
    }

    return json({ ok: true, message: 'Check your inbox for the verification link' }, 202);
  } catch (error) {
    console.error('[finder-comments] verification request failed', error);
    const message = publicError(error, 'Could not request email verification');
    const status = message.startsWith('Too many ') || message.startsWith('Please wait ') ? 429 : 400;
    return json({ error: message }, status);
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  const token = url.searchParams.get('token') ?? '';
  // A malformed link has no trusted finder information, so use the more privacy-sensitive
  // finder as the neutral fallback destination.
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return redirect(request, 'onlyfans', 'failed');

  let finder: 'onlyfans' | 'pornstar' = 'onlyfans';
  try {
    const draft = await consumeVerificationDraft(tokenHash(token));
    if (!draft) return redirect(request, finder, 'failed');
    finder = draft.finder;

    // Reopening the same link (including an email provider's safety scan followed by the user)
    // is harmless and returns the same success state without creating another contribution.
    if (draft.commentId) return redirect(request, finder, 'verified');
    if (!draft.canConsume) return redirect(request, finder, 'failed');

    const profile = await getOrCreateVerifiedGuestProfile(draft.email, draft.payload.alias);
    await createFinderCommentFromVerificationDraft(profile.id, draft);
    return redirect(request, finder, 'verified');
  } catch (error) {
    // Never log or reflect the token, email, story text, or creator field from the private draft.
    console.error('[finder-comments] verification completion failed',
      error instanceof Error ? error.message.replace(/[\r\n]/g, ' ').slice(0, 240) : 'unknown error');
    try {
      const completed = await consumeVerificationDraft(tokenHash(token));
      if (completed?.commentId) return redirect(request, completed.finder, 'verified');
      if (completed) finder = completed.finder;
    } catch { /* use the neutral failure redirect */ }
    return redirect(request, finder, 'failed');
  }
};
