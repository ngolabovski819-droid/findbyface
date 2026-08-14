export type FinderKind = 'onlyfans' | 'pornstar';
export type FinderOutcome = 'found' | 'close' | 'not_yet';
export type FinderCommentStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'removed';
export type FinderReportReason =
  | 'private_identity' | 'personal_information' | 'underage' | 'non_consensual'
  | 'harassment' | 'spam' | 'other';
export type ModerationAction = 'approve' | 'reject' | 'remove' | 'restore' | 'review';

export interface PublicFinderComment {
  id: string;
  finder: FinderKind;
  parentId: string | null;
  alias: string;
  outcome: FinderOutcome | null;
  subjectName: string | null;
  body: string;
  createdAt: string;
  helpfulCount: number;
  viewerHelpful: boolean;
  replies: PublicFinderComment[];
}

export interface FinderCommentSubmission {
  finder: FinderKind;
  parentId?: string | null;
  outcome?: FinderOutcome | null;
  subjectName?: string | null;
  body: string;
  notifyReplies?: boolean;
  searchNonce?: string | null;
  alias?: string | null;
  /** Internal idempotency key used only after a verified email-link draft. */
  verificationDraftId?: string | null;
}

export interface FinderCommentProfile {
  id: string;
  alias: string;
}

export interface VerificationDraftPayload {
  parentId?: string | null;
  outcome?: FinderOutcome | null;
  subjectName?: string | null;
  body: string;
  notifyReplies?: boolean;
  searchNonce?: string | null;
  alias?: string | null;
}

export interface VerificationDraftResult {
  id: string;
  email: string;
  finder: FinderKind;
  payload: VerificationDraftPayload;
  consumedAt: string | null;
  commentId: string | null;
  canConsume: boolean;
}

export interface ModerationReport {
  id: string;
  reason: FinderReportReason;
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface ModerationEvent {
  action: string;
  fromStatus: FinderCommentStatus | null;
  toStatus: FinderCommentStatus;
  moderatorLabel: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ModerationComment {
  id: string;
  finder: FinderKind;
  parentId: string | null;
  alias: string;
  outcome: FinderOutcome | null;
  subjectName: string | null;
  body: string;
  status: FinderCommentStatus;
  notifyReplies: boolean;
  helpfulCount: number;
  reportCount: number;
  openReportCount: number;
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  reports: ModerationReport[];
  history: ModerationEvent[];
}

interface DbComment {
  id: string;
  finder: FinderKind;
  parent_id: string | null;
  author_profile_id: string;
  author_alias: string;
  outcome: FinderOutcome | null;
  subject_name: string | null;
  body: string;
  status: FinderCommentStatus;
  notify_replies: boolean;
  helpful_count: number;
  report_count: number;
  moderated_at: string | null;
  moderated_by: string | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
}

const FINDERS = new Set<FinderKind>(['onlyfans', 'pornstar']);
const OUTCOMES = new Set<FinderOutcome>(['found', 'close', 'not_yet']);
const STATUSES = new Set<FinderCommentStatus>(['pending', 'approved', 'rejected', 'under_review', 'removed']);
const REPORT_REASONS = new Set<FinderReportReason>([
  'private_identity', 'personal_information', 'underage', 'non_consensual', 'harassment', 'spam', 'other',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_OR_CONTACT_RE = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|gg|tv|xyz)\b|(?:^|\s)@[\p{L}\p{N}_.-]{2,}|\b(?:telegram|whatsapp|signal|discord|snapchat)\b|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?\d[\d ()-]{7,}\d))/iu;
const DISALLOWED_IDENTITY_RE = /\b(?:real\s+name|legal\s+name|home\s+address|lives?\s+at|phone\s+number|doxx?(?:ed|ing)?)\b/iu;
const aliasAdjectives = ['Bright', 'Calm', 'Clever', 'Cosmic', 'Gentle', 'Golden', 'Happy', 'Kind', 'Lively', 'Lucky', 'Mellow', 'Neon', 'Quiet', 'Swift', 'Sunny', 'Vivid'];
const aliasNouns = ['Badger', 'Comet', 'Dolphin', 'Falcon', 'Fox', 'Koala', 'Otter', 'Panda', 'Robin', 'Sparrow', 'Tiger', 'Turtle', 'Willow', 'Wolf'];

function env(): { url: string; key: string } {
  const url = import.meta.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Finder comments service is unavailable');
  return { url, key };
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const { key } = env();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
    ...extra,
  };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const { url } = env();
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
}

async function responseRows<T>(response: Response, label: string): Promise<T[]> {
  if (!response.ok) {
    // PostgREST error details can echo an entire rejected row, including private draft emails
    // and contribution text. Preserve only the machine code needed for duplicate handling.
    let code = '';
    try {
      const payload = await response.json() as { code?: unknown };
      if (typeof payload.code === 'string' && /^[A-Z0-9_]{2,20}$/i.test(payload.code)) code = payload.code;
    } catch { /* response bodies are intentionally discarded */ }
    throw new Error(`${label} failed (${response.status})${code ? ` [${code}]` : ''}`);
  }
  return response.json() as Promise<T[]>;
}

export function isFinderKind(value: unknown): value is FinderKind {
  return typeof value === 'string' && FINDERS.has(value as FinderKind);
}

export function isFinderOutcome(value: unknown): value is FinderOutcome {
  return typeof value === 'string' && OUTCOMES.has(value as FinderOutcome);
}

export function isFinderCommentStatus(value: unknown): value is FinderCommentStatus {
  return typeof value === 'string' && STATUSES.has(value as FinderCommentStatus);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function sanitizePlainText(value: unknown, min: number, max: number, field: string): string {
  if (typeof value !== 'string') throw new Error(`${field} must be text`);
  const cleaned = value.normalize('NFKC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const length = Array.from(cleaned).length;
  if (length < min || length > max) throw new Error(`${field} must contain ${min}–${max} characters`);
  if (/[<>]/.test(cleaned) || URL_OR_CONTACT_RE.test(cleaned)) {
    throw new Error(`${field} cannot contain links, contact details, or social handles`);
  }
  if (DISALLOWED_IDENTITY_RE.test(cleaned)) throw new Error(`${field} cannot identify someone privately`);
  return cleaned;
}

export function sanitizeSubjectName(value: unknown, finder: FinderKind): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('subjectName must be text');
  let cleaned = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
  if (finder === 'onlyfans') cleaned = cleaned.replace(/^@/, '');
  const length = Array.from(cleaned).length;
  if (length < 2 || length > 64) throw new Error('Public name must contain 2–64 characters');
  const allowed = finder === 'onlyfans'
    ? /^[A-Za-z0-9][A-Za-z0-9_.-]{1,63}$/.test(cleaned)
    : /^[\p{L}\p{N}][\p{L}\p{N} .\-']{1,63}$/u.test(cleaned);
  if (!allowed) {
    throw new Error(finder === 'onlyfans'
      ? 'Use only the creator’s public username'
      : 'Use only the performer’s public stage name');
  }
  if (URL_OR_CONTACT_RE.test(cleaned) || DISALLOWED_IDENTITY_RE.test(cleaned)) {
    throw new Error('Only a public creator username or stage name is allowed');
  }
  return cleaned;
}

export function sanitizeAlias(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Alias must be text');
  const alias = value.normalize('NFKC').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  if (!/^[A-Za-z][A-Za-z0-9]{2,31}$/.test(alias)) {
    throw new Error('Alias must contain 3–32 letters or numbers and start with a letter');
  }
  return alias;
}

export function generateFinderAlias(): string {
  const random = crypto.getRandomValues(new Uint32Array(3));
  return `${aliasAdjectives[random[0] % aliasAdjectives.length]}${aliasNouns[random[1] % aliasNouns.length]}${String(random[2] % 100_000_000).padStart(8, '0')}`;
}

export function validateSubmission(input: FinderCommentSubmission): FinderCommentSubmission & { subjectName: string | null; notifyReplies: boolean } {
  if (!isFinderKind(input.finder)) throw new Error('Invalid finder');
  const parentId = input.parentId ?? null;
  if (parentId && !isUuid(parentId)) throw new Error('Invalid parent comment');
  const outcome = input.outcome ?? null;
  if (!parentId && !isFinderOutcome(outcome)) throw new Error('Choose a search outcome');
  if (parentId && outcome != null) throw new Error('Replies do not have a search outcome');
  const searchNonce = input.searchNonce ?? null;
  if (!parentId && (typeof searchNonce !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(searchNonce))) {
    throw new Error('A valid completed-search proof is required');
  }
  if (parentId && searchNonce != null) throw new Error('Replies cannot store search proof data');
  const verificationDraftId = input.verificationDraftId ?? null;
  if (verificationDraftId && !isUuid(verificationDraftId)) throw new Error('Invalid verification draft');
  return {
    finder: input.finder,
    parentId,
    outcome,
    subjectName: sanitizeSubjectName(input.subjectName, input.finder),
    body: sanitizePlainText(input.body, parentId ? 20 : 60, 600, parentId ? 'Reply' : 'Story'),
    notifyReplies: input.notifyReplies === true,
    searchNonce,
    alias: input.alias == null ? null : sanitizeAlias(input.alias),
    verificationDraftId,
  };
}

const privacyEncoder = new TextEncoder();

async function privacyKey(): Promise<CryptoKey> {
  const dedicated = import.meta.env.COMMENT_PRIVACY_SECRET?.trim();
  if (dedicated && privacyEncoder.encode(dedicated).byteLength >= 32) {
    return crypto.subtle.importKey(
      'raw', privacyEncoder.encode(dedicated), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
  }

  const searchStoryRoot = import.meta.env.SEARCH_STORY_SECRET?.trim();
  const clickTokenRoot = import.meta.env.CLICK_TOKEN_SECRET?.trim();
  const root = searchStoryRoot && privacyEncoder.encode(searchStoryRoot).byteLength >= 32
    ? searchStoryRoot
    : clickTokenRoot && privacyEncoder.encode(clickTokenRoot).byteLength >= 32
      ? clickTokenRoot
      : null;
  if (!root) {
    throw new Error('Finder comment privacy service is unavailable');
  }
  const rootKey = await crypto.subtle.importKey(
    'raw', privacyEncoder.encode(root), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const derived = await crypto.subtle.sign(
    'HMAC', rootKey, privacyEncoder.encode('findbyface/comment-privacy/v1'),
  );
  return crypto.subtle.importKey(
    'raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.sign('HMAC', await privacyKey(), privacyEncoder.encode(`browser-key:${value}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

type FinderPrivacyPurpose = 'comment' | 'feedback' | 'verification-email-window';

export async function privacyPreservingFinderIdentifier(
  purpose: FinderPrivacyPurpose,
  value: string,
): Promise<string> {
  if (!value || value.length > 1_024) throw new Error('Invalid private identifier');
  const signature = await crypto.subtle.sign(
    'HMAC', await privacyKey(), privacyEncoder.encode(`${purpose}:${value}`),
  );
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function privacyPreservingSearchNonce(
  purpose: 'comment' | 'feedback', nonce: string,
): Promise<string> {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new Error('Invalid search proof nonce');
  return privacyPreservingFinderIdentifier(purpose, nonce);
}

function normalizeEmail(value: string): string {
  const email = value.normalize('NFKC').trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address');
  }
  return email;
}

async function uniqueAlias(preferred?: string | null): Promise<string> {
  if (preferred) return sanitizeAlias(preferred);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const alias = generateFinderAlias();
    const params = new URLSearchParams({ select: 'id', alias: `eq.${alias}`, limit: '1' });
    const rows = await responseRows<{ id: string }>(await rest(`finder_comment_profiles?${params}`), 'alias check');
    if (!rows.length) return alias;
  }
  throw new Error('Could not create a public alias');
}

export async function getOrCreateFinderProfile(userId: string, email?: string | null, preferredAlias?: string | null): Promise<FinderCommentProfile> {
  if (!isUuid(userId)) throw new Error('Invalid user');
  const find = new URLSearchParams({ select: 'id,alias', user_id: `eq.${userId}`, limit: '1' });
  let rows = await responseRows<{ id: string; alias: string; email?: string | null }>(await rest(`finder_comment_profiles?${find}`), 'profile read');
  if (rows[0]) {
    const normalized = email ? normalizeEmail(email) : null;
    if (normalized && !rows[0].email) {
      const updated = await responseRows<{ id: string; alias: string }>(await rest(`finder_comment_profiles?id=eq.${rows[0].id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ email: normalized, email_normalized: normalized, updated_at: new Date().toISOString() }),
      }), 'profile email update');
      rows[0] = updated[0];
    }
    if (preferredAlias && sanitizeAlias(preferredAlias) !== rows[0].alias) return updateFinderProfileAlias(rows[0].id, preferredAlias);
    return rows[0];
  }
  const alias = await uniqueAlias(preferredAlias);
  const normalized = email ? normalizeEmail(email) : null;
  if (normalized) {
    const emailFind = new URLSearchParams({ select: 'id,alias,user_id', email_normalized: `eq.${normalized}`, limit: '1' });
    const emailProfile = (await responseRows<{ id: string; alias: string; user_id: string | null }>(await rest(`finder_comment_profiles?${emailFind}`), 'profile email read'))[0];
    if (emailProfile && !emailProfile.user_id) {
      const linked = await responseRows<{ id: string; alias: string }>(await rest(`finder_comment_profiles?id=eq.${emailProfile.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString(), ...(preferredAlias ? { alias } : {}) }),
      }), 'profile link');
      return linked[0];
    }
  }
  const response = await rest('finder_comment_profiles', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, email: normalized, email_normalized: normalized, alias }),
  });
  if (response.status === 409) {
    rows = await responseRows<{ id: string; alias: string }>(await rest(`finder_comment_profiles?${find}`), 'profile reread');
    if (rows[0]) return rows[0];
  }
  return (await responseRows<{ id: string; alias: string }>(response, 'profile create'))[0];
}

export async function getOrCreateVerifiedGuestProfile(email: string, preferredAlias?: string | null): Promise<FinderCommentProfile> {
  const normalized = normalizeEmail(email);
  const find = new URLSearchParams({ select: 'id,alias', email_normalized: `eq.${normalized}`, limit: '1' });
  let rows = await responseRows<{ id: string; alias: string }>(await rest(`finder_comment_profiles?${find}`), 'guest profile read');
  if (rows[0]) {
    if (preferredAlias && sanitizeAlias(preferredAlias) !== rows[0].alias) return updateFinderProfileAlias(rows[0].id, preferredAlias);
    return rows[0];
  }
  const alias = await uniqueAlias(preferredAlias);
  const response = await rest('finder_comment_profiles', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ email: normalized, email_normalized: normalized, alias }),
  });
  if (response.status === 409) {
    rows = await responseRows(await rest(`finder_comment_profiles?${find}`), 'guest profile reread');
    if (rows[0]) return rows[0];
  }
  return (await responseRows<{ id: string; alias: string }>(response, 'guest profile create'))[0];
}

export async function updateFinderProfileAlias(profileId: string, aliasValue: unknown): Promise<FinderCommentProfile> {
  if (!isUuid(profileId)) throw new Error('Invalid profile');
  const alias = sanitizeAlias(aliasValue);
  const response = await rest(`finder_comment_profiles?id=eq.${profileId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ alias, updated_at: new Date().toISOString() }),
  });
  const rows = await responseRows<{ id: string; alias: string }>(response, 'profile update');
  if (!rows[0]) throw new Error('Profile not found');
  return rows[0];
}

export async function getFinderProfileByUserId(userId: string): Promise<FinderCommentProfile | null> {
  if (!isUuid(userId)) return null;
  const params = new URLSearchParams({ select: 'id,alias', user_id: `eq.${userId}`, limit: '1' });
  return (await responseRows<FinderCommentProfile>(await rest(`finder_comment_profiles?${params}`), 'profile read'))[0] ?? null;
}

function publicComment(row: DbComment, voted: Set<string>): PublicFinderComment {
  return {
    id: row.id, finder: row.finder, parentId: row.parent_id, alias: row.author_alias,
    outcome: row.outcome, subjectName: row.subject_name, body: row.body, createdAt: row.created_at,
    helpfulCount: row.helpful_count, viewerHelpful: voted.has(row.id), replies: [],
  };
}

export async function getPublishedFinderComments(
  finder: FinderKind,
  limit = 20,
  voterKey?: string,
  cursor?: string,
): Promise<{ comments: PublicFinderComment[]; nextCursor?: string }> {
  if (!isFinderKind(finder)) return { comments: [] };
  const take = Math.max(1, Math.min(50, Math.trunc(limit)));
  const params = new URLSearchParams({
    select: 'id,finder,parent_id,author_alias,outcome,subject_name,body,helpful_count,created_at',
    finder: `eq.${finder}`, parent_id: 'is.null', status: 'eq.approved',
    order: 'created_at.desc,id.desc', limit: String(take + 1),
  });
  if (cursor) {
    const [created] = cursor.split('|');
    if (created && Number.isFinite(Date.parse(created))) params.set('created_at', `lt.${created}`);
  }
  const stories = await responseRows<DbComment>(await rest(`finder_comments?${params}`), 'comments read');
  const hasMore = stories.length > take;
  const page = stories.slice(0, take);
  if (!page.length) return { comments: [] };
  const ids = page.map(row => row.id);
  const replyParams = new URLSearchParams({
    select: params.get('select')!, parent_id: `in.(${ids.join(',')})`, status: 'eq.approved',
    order: 'created_at.asc,id.asc', limit: String(Math.min(500, ids.length * 20)),
  });
  const replies = await responseRows<DbComment>(await rest(`finder_comments?${replyParams}`), 'replies read');
  const visibleIds = [...ids, ...replies.map(row => row.id)];
  const voted = new Set<string>();
  if (voterKey && visibleIds.length) {
    try {
      const voterHash = await hash(voterKey);
      const voteParams = new URLSearchParams({
        select: 'comment_id', voter_key_hash: `eq.${voterHash}`, comment_id: `in.(${visibleIds.join(',')})`,
      });
      const votes = await responseRows<{ comment_id: string }>(await rest(`finder_comment_helpful_votes?${voteParams}`), 'helpful read');
      for (const vote of votes) voted.add(vote.comment_id);
    } catch {
      // Missing privacy secret must never make otherwise-public stories unavailable.
    }
  }
  const mapped = page.map(row => publicComment(row, voted));
  const byId = new Map(mapped.map(comment => [comment.id, comment]));
  for (const row of replies) byId.get(row.parent_id!)?.replies.push(publicComment(row, voted));
  const last = page[page.length - 1];
  return { comments: mapped, ...(hasMore ? { nextCursor: `${last.created_at}|${last.id}` } : {}) };
}

export async function createFinderCommentForProfile(profileId: string, raw: FinderCommentSubmission): Promise<{ id: string; status: FinderCommentStatus }> {
  if (!isUuid(profileId)) throw new Error('Invalid profile');
  const input = validateSubmission(raw);
  if (input.parentId) {
    const parentParams = new URLSearchParams({ select: 'id,finder,parent_id,status', id: `eq.${input.parentId}`, limit: '1' });
    const parent = (await responseRows<{ id: string; finder: FinderKind; parent_id: string | null; status: FinderCommentStatus }>(await rest(`finder_comments?${parentParams}`), 'parent read'))[0];
    if (!parent || parent.parent_id || parent.finder !== input.finder || parent.status !== 'approved') {
      throw new Error('That story cannot receive a reply');
    }
  }
  const profileParams = new URLSearchParams({ select: 'id,alias', id: `eq.${profileId}`, limit: '1' });
  const profile = (await responseRows<{ id: string; alias: string }>(await rest(`finder_comment_profiles?${profileParams}`), 'profile read'))[0];
  if (!profile) throw new Error('Profile not found');
  const response = await rest('finder_comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      finder: input.finder, parent_id: input.parentId, author_profile_id: profile.id,
      author_alias: profile.alias, outcome: input.outcome, subject_name: input.subjectName,
      body: input.body, notify_replies: input.notifyReplies, search_nonce: input.searchNonce,
      verification_draft_id: input.verificationDraftId,
      status: 'pending',
    }),
  });
  const row = (await responseRows<{ id: string; status: FinderCommentStatus }>(response, 'comment create'))[0];
  return row;
}

export async function createAuthenticatedFinderComment(
  user: { id: string; email?: string | null }, input: FinderCommentSubmission,
): Promise<{ id: string; status: FinderCommentStatus }> {
  const profile = await getOrCreateFinderProfile(user.id, user.email, input.alias);
  return createFinderCommentForProfile(profile.id, input);
}

export async function createFinderCommentFromVerificationDraft(
  profileId: string,
  draft: VerificationDraftResult,
): Promise<{ id: string; status: FinderCommentStatus }> {
  if (draft.commentId) return { id: draft.commentId, status: 'pending' };
  if (!draft.canConsume) throw new Error('Verification is already being processed');
  try {
    const created = await createFinderCommentForProfile(profileId, {
      finder: draft.finder, ...draft.payload, verificationDraftId: draft.id,
    });
    await markVerificationDraftConsumed(draft.id, created.id);
    return created;
  } catch (error) {
    const params = new URLSearchParams({ select: 'id,status', verification_draft_id: `eq.${draft.id}`, limit: '1' });
    const existing = (await responseRows<{ id: string; status: FinderCommentStatus }>(await rest(`finder_comments?${params}`), 'verified comment reread'))[0];
    if (existing) {
      await markVerificationDraftConsumed(draft.id, existing.id);
      return existing;
    }
    throw error;
  }
}

export async function authorHasFinderComment(userId: string): Promise<boolean> {
  const profile = await getFinderProfileByUserId(userId);
  if (!profile) return false;
  const params = new URLSearchParams({ select: 'id', author_profile_id: `eq.${profile.id}`, limit: '1' });
  return (await responseRows<{ id: string }>(await rest(`finder_comments?${params}`), 'author comments read')).length > 0;
}

export async function toggleHelpfulVote(commentId: string, voterKey: string): Promise<{ helpful: boolean; helpfulCount: number }> {
  if (!isUuid(commentId) || voterKey.length < 16 || voterKey.length > 256) throw new Error('Invalid helpful vote');
  const voterHash = await hash(voterKey);
  const commentParams = new URLSearchParams({ select: 'id,helpful_count,status', id: `eq.${commentId}`, status: 'eq.approved', limit: '1' });
  const comment = (await responseRows<{ id: string; helpful_count: number }>(await rest(`finder_comments?${commentParams}`), 'comment read'))[0];
  if (!comment) throw new Error('Comment not found');
  const voteParams = new URLSearchParams({ comment_id: `eq.${commentId}`, voter_key_hash: `eq.${voterHash}` });
  const existing = await responseRows<{ comment_id: string }>(await rest(`finder_comment_helpful_votes?select=comment_id&${voteParams}`), 'helpful read');
  let helpful: boolean;
  if (existing.length) {
    await responseRows(await rest(`finder_comment_helpful_votes?${voteParams}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }), 'helpful remove');
    helpful = false;
  } else {
    await responseRows(await rest('finder_comment_helpful_votes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ comment_id: commentId, voter_key_hash: voterHash }),
    }), 'helpful add');
    helpful = true;
  }
  const refreshed = (await responseRows<{ helpful_count: number }>(await rest(`finder_comments?select=helpful_count&id=eq.${commentId}&limit=1`), 'comment count read'))[0];
  return { helpful, helpfulCount: refreshed?.helpful_count ?? Math.max(0, comment.helpful_count + (helpful ? 1 : -1)) };
}

export async function reportFinderComment(input: {
  commentId: string; reporterKey: string; reason: FinderReportReason; details?: unknown;
}): Promise<{ reported: true; underReview: boolean }> {
  if (!isUuid(input.commentId) || input.reporterKey.length < 16 || input.reporterKey.length > 256) throw new Error('Invalid report');
  if (!REPORT_REASONS.has(input.reason)) throw new Error('Choose a valid report reason');
  const details = input.details == null || input.details === '' ? null : sanitizePlainText(input.details, 3, 500, 'Details');
  const reporterHash = await hash(input.reporterKey);
  const targetParams = new URLSearchParams({ select: 'id,status', id: `eq.${input.commentId}`, status: 'eq.approved', limit: '1' });
  const target = (await responseRows<{ id: string; status: FinderCommentStatus }>(
    await rest(`finder_comments?${targetParams}`), 'reported comment read',
  ))[0];
  if (!target) throw new Error('Comment not found');
  const response = await rest('finder_comment_reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ comment_id: input.commentId, reporter_key_hash: reporterHash, reason: input.reason, details }),
  });
  if (response.status !== 409) await responseRows(response, 'report create');
  // Reports are signals for the human moderation queue, not anonymous takedown
  // controls. Keeping the approved status prevents one visitor from hiding content;
  // report_count still makes the item appear in the Reported admin tab immediately.
  return { reported: true, underReview: false };
}

export async function recordAnonymousFinderFeedback(finder: FinderKind, outcome: FinderOutcome, searchNonce: string): Promise<void> {
  if (!isFinderKind(finder) || !isFinderOutcome(outcome) || !/^[A-Za-z0-9_-]{16,128}$/.test(searchNonce)) throw new Error('Invalid feedback');
  const response = await rest('finder_search_feedback', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ finder, outcome, search_nonce: searchNonce }),
  });
  if (!response.ok && response.status !== 409) throw new Error(`feedback create failed (${response.status})`);
}

export async function createVerificationDraft(input: {
  email: string; finder: FinderKind; payload: VerificationDraftPayload; tokenHash: string;
  expiresAt: string; requesterKey?: string | null;
}): Promise<{ id: string }> {
  const email = normalizeEmail(input.email);
  if (!isFinderKind(input.finder) || !/^[a-f0-9]{64}$/.test(input.tokenHash)) throw new Error('Invalid verification draft');
  const expiry = new Date(input.expiresAt);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 60 * 60_000) {
    throw new Error('Verification link expiry must be within one hour');
  }
  const validated = validateSubmission({ finder: input.finder, ...input.payload });
  const payload: VerificationDraftPayload = {
    parentId: validated.parentId, outcome: validated.outcome, subjectName: validated.subjectName,
    body: validated.body, notifyReplies: validated.notifyReplies,
    searchNonce: validated.searchNonce ? await privacyPreservingSearchNonce('comment', validated.searchNonce) : null,
    alias: validated.alias,
  };
  const requesterHash = input.requesterKey ? await hash(input.requesterKey) : null;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const emailCountParams = new URLSearchParams({ select: 'id', email: `eq.${email}`, created_at: `gte.${since}`, limit: '6' });
  const recentEmail = await responseRows<{ id: string }>(await rest(`finder_comment_verification_drafts?${emailCountParams}`), 'draft rate read');
  if (recentEmail.length >= 5) throw new Error('Too many verification emails. Try again later');
  if (requesterHash) {
    const requesterParams = new URLSearchParams({ select: 'id', requester_key_hash: `eq.${requesterHash}`, created_at: `gte.${since}`, limit: '11' });
    const recentRequester = await responseRows<{ id: string }>(await rest(`finder_comment_verification_drafts?${requesterParams}`), 'draft requester rate read');
    if (recentRequester.length >= 10) throw new Error('Too many verification requests. Try again later');
  }
  const response = await rest('finder_comment_verification_drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ email, finder: input.finder, payload, token_hash: input.tokenHash, requester_key_hash: requesterHash, expires_at: expiry.toISOString() }),
  });
  if (response.status === 409) throw new Error('Please wait before requesting another verification email');
  const rows = await responseRows<{ id: string }>(response, 'draft create');
  return rows[0];
}

export async function discardUnsentVerificationDraft(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const response = await rest(`finder_comment_verification_drafts?id=eq.${id}&consumed_at=is.null`, {
    method: 'DELETE', headers: { Prefer: 'return=minimal' },
  });
  if (!response.ok) throw new Error(`unsent draft cleanup failed (${response.status})`);
}

export async function consumeVerificationDraft(tokenHash: string): Promise<VerificationDraftResult | null> {
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) return null;
  const claimTokenHash = await hash(`draft-claim:${crypto.randomUUID()}`);
  const response = await rest('rpc/consume_finder_comment_verification_draft', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token_hash: tokenHash, p_claim_token_hash: claimTokenHash }),
  });
  const row = (await responseRows<{
    id: string; email: string; finder: FinderKind; payload: VerificationDraftPayload;
    consumed_at: string | null; comment_id: string | null; can_consume: boolean;
  }>(response, 'draft consume'))[0];
  return row ? { id: row.id, email: row.email, finder: row.finder, payload: row.payload, consumedAt: row.consumed_at, commentId: row.comment_id, canConsume: row.can_consume } : null;
}

export async function markVerificationDraftConsumed(id: string, commentId: string): Promise<void> {
  if (!isUuid(id) || !isUuid(commentId)) throw new Error('Invalid verification completion');
  const response = await rest(`finder_comment_verification_drafts?id=eq.${id}&consumed_at=is.null`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ consumed_at: new Date().toISOString(), comment_id: commentId, claim_token_hash: null }),
  });
  const rows = await responseRows<{ id: string }>(response, 'draft completion');
  if (!rows.length) {
    const check = await responseRows<{ comment_id: string | null }>(await rest(`finder_comment_verification_drafts?select=comment_id&id=eq.${id}&limit=1`), 'draft completion read');
    if (check[0]?.comment_id !== commentId) throw new Error('Verification draft was already consumed');
  }
}

export async function cleanupExpiredVerificationDrafts(): Promise<number> {
  const response = await rest('rpc/cleanup_finder_comment_verification_drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!response.ok) throw new Error(`draft cleanup failed (${response.status})`);
  const value = await response.json() as number;
  return Number.isInteger(value) ? value : 0;
}

export async function listModerationComments(options: {
  id?: string; status?: FinderCommentStatus | 'reported' | 'all'; finder?: FinderKind | 'all'; q?: string; limit?: number; offset?: number;
} = {}): Promise<{ items: ModerationComment[]; total: number }> {
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 30)));
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const params = new URLSearchParams({
    select: 'id,finder,parent_id,author_profile_id,author_alias,outcome,subject_name,body,status,notify_replies,helpful_count,report_count,moderated_at,moderated_by,moderation_reason,created_at,updated_at',
    order: 'created_at.desc,id.desc', limit: String(limit), offset: String(offset),
  });
  if (options.id) {
    if (!isUuid(options.id)) throw new Error('Invalid comment filter');
    params.set('id', `eq.${options.id}`);
  }
  if (options.finder && options.finder !== 'all') {
    if (!isFinderKind(options.finder)) throw new Error('Invalid finder filter');
    params.set('finder', `eq.${options.finder}`);
  }
  if (options.status && options.status !== 'all' && options.status !== 'reported') {
    if (!isFinderCommentStatus(options.status)) throw new Error('Invalid status filter');
    params.set('status', `eq.${options.status}`);
  }
  if (options.status === 'reported') params.set('or', '(report_count.gt.0,status.eq.under_review)');
  if (options.q) {
    const q = options.q.normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
      .replace(/[^\p{L}\p{N} _.'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!q || Array.from(q).length > 80) throw new Error('Invalid search filter');
    if (options.status === 'reported') {
      params.delete('or');
      params.set('and', `(or(report_count.gt.0,status.eq.under_review),or(author_alias.ilike.*${q}*,subject_name.ilike.*${q}*,body.ilike.*${q}*))`);
    } else params.set('or', `(author_alias.ilike.*${q}*,subject_name.ilike.*${q}*,body.ilike.*${q}*)`);
  }
  const response = await rest(`finder_comments?${params}`, { headers: { Prefer: 'count=exact' } });
  const rows = await responseRows<DbComment>(response, 'moderation comments read');
  const countRaw = response.headers.get('content-range')?.split('/').pop();
  const total = countRaw && countRaw !== '*' ? Number(countRaw) || rows.length : rows.length;
  const ids = rows.map(row => row.id);
  if (!ids.length) return { items: [], total };
  const reports = await responseRows<{ id: string; comment_id: string; reason: FinderReportReason; details: string | null; status: 'open' | 'resolved' | 'dismissed'; created_at: string }>(
    await rest(`finder_comment_reports?select=id,comment_id,reason,details,status,created_at&comment_id=in.(${ids.join(',')})&order=created_at.desc`), 'moderation reports read',
  );
  const events = await responseRows<{ comment_id: string; action: string; from_status: FinderCommentStatus | null; to_status: FinderCommentStatus; moderator_label: string | null; reason: string | null; notes: string | null; created_at: string }>(
    await rest(`finder_comment_moderation_events?select=comment_id,action,from_status,to_status,moderator_label,reason,notes,created_at&comment_id=in.(${ids.join(',')})&order=created_at.desc`), 'moderation events read',
  );
  const reportMap = new Map<string, ModerationReport[]>();
  for (const report of reports) {
    const list = reportMap.get(report.comment_id) ?? [];
    list.push({ id: report.id, reason: report.reason, details: report.details, status: report.status, createdAt: report.created_at });
    reportMap.set(report.comment_id, list);
  }
  const eventMap = new Map<string, ModerationEvent[]>();
  for (const event of events) {
    const list = eventMap.get(event.comment_id) ?? [];
    list.push({ action: event.action, fromStatus: event.from_status, toStatus: event.to_status, moderatorLabel: event.moderator_label, reason: event.reason, notes: event.notes, createdAt: event.created_at });
    eventMap.set(event.comment_id, list);
  }
  let items = rows.map(row => {
    const itemReports = reportMap.get(row.id) ?? [];
    return {
      id: row.id, finder: row.finder, parentId: row.parent_id, alias: row.author_alias,
      outcome: row.outcome, subjectName: row.subject_name, body: row.body, status: row.status,
      notifyReplies: row.notify_replies, helpfulCount: row.helpful_count, reportCount: row.report_count,
      openReportCount: itemReports.filter(report => report.status === 'open').length,
      moderationReason: row.moderation_reason, moderatedAt: row.moderated_at, moderatedBy: row.moderated_by,
      createdAt: row.created_at, updatedAt: row.updated_at, reports: itemReports, history: eventMap.get(row.id) ?? [],
    } satisfies ModerationComment;
  });
  if (options.status === 'reported') items = items.filter(item => item.openReportCount > 0 || item.status === 'under_review');
  return { items, total };
}

export async function moderateFinderComment(input: {
  commentId: string; action: ModerationAction; moderatorLabel?: string | null; reason?: string | null; notes?: string | null;
}): Promise<ModerationComment> {
  if (!isUuid(input.commentId)) throw new Error('Invalid comment');
  const target: Record<ModerationAction, FinderCommentStatus> = {
    approve: 'approved', reject: 'rejected', remove: 'removed', restore: 'pending', review: 'under_review',
  };
  if (!(input.action in target)) throw new Error('Invalid moderation action');
  const currentParams = new URLSearchParams({ select: '*', id: `eq.${input.commentId}`, limit: '1' });
  const current = (await responseRows<DbComment>(await rest(`finder_comments?${currentParams}`), 'moderation comment read'))[0];
  if (!current) throw new Error('Comment not found');
  const reason = input.reason ? sanitizePlainText(input.reason, 2, 80, 'Reason') : null;
  const notes = input.notes ? sanitizePlainText(input.notes, 2, 500, 'Notes') : null;
  const moderatorLabel = input.moderatorLabel
    ? input.moderatorLabel.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
    : null;
  const status = target[input.action];
  const rpcResponse = await rest('rpc/moderate_finder_comment', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_comment_id: input.commentId, p_action: input.action, p_moderator_label: moderatorLabel, p_reason: reason, p_notes: notes }),
  });
  if (!rpcResponse.ok) throw new Error(`comment moderation failed (${rpcResponse.status})`);
  await rpcResponse.text();
  const refreshed = (await listModerationComments({ id: input.commentId, limit: 1 })).items[0];
  if (refreshed) return refreshed;
  throw new Error('Moderated comment could not be reloaded');
}

export async function getCommentNotificationContext(commentId: string): Promise<{
  commentId: string; status: FinderCommentStatus; isReply: boolean; authorEmail: string | null;
  authorNotifyReplies: boolean; parentAuthorEmail: string | null; parentAuthorNotifyReplies: boolean;
} | null> {
  if (!isUuid(commentId)) return null;
  const row = (await responseRows<DbComment>(await rest(`finder_comments?select=*&id=eq.${commentId}&limit=1`), 'notification comment read'))[0];
  if (!row) return null;
  const profiles = new Set([row.author_profile_id]);
  let parent: DbComment | null = null;
  if (row.parent_id) {
    parent = (await responseRows<DbComment>(await rest(`finder_comments?select=*&id=eq.${row.parent_id}&limit=1`), 'notification parent read'))[0] ?? null;
    if (parent) profiles.add(parent.author_profile_id);
  }
  const profileRows = await responseRows<{ id: string; email: string | null }>(await rest(`finder_comment_profiles?select=id,email&id=in.(${[...profiles].join(',')})`), 'notification profile read');
  const emails = new Map(profileRows.map(profile => [profile.id, profile.email]));
  return {
    commentId: row.id, status: row.status, isReply: Boolean(row.parent_id),
    authorEmail: emails.get(row.author_profile_id) ?? null, authorNotifyReplies: row.notify_replies,
    parentAuthorEmail: parent ? emails.get(parent.author_profile_id) ?? null : null,
    parentAuthorNotifyReplies: parent?.notify_replies ?? false,
  };
}

export async function getMineByUser(userId: string): Promise<Array<{ id: string; parentId: string | null; finder: FinderKind; status: FinderCommentStatus; createdAt: string }>> {
  const profile = await getFinderProfileByUserId(userId);
  if (!profile) return [];
  const params = new URLSearchParams({ select: 'id,parent_id,finder,status,created_at', author_profile_id: `eq.${profile.id}`, order: 'created_at.desc', limit: '200' });
  const rows = await responseRows<{ id: string; parent_id: string | null; finder: FinderKind; status: FinderCommentStatus; created_at: string }>(await rest(`finder_comments?${params}`), 'own comments read');
  return rows.map(row => ({ id: row.id, parentId: row.parent_id, finder: row.finder, status: row.status, createdAt: row.created_at }));
}

export async function safelyDeleteMine(userId: string, commentId: string): Promise<boolean> {
  const profile = await getFinderProfileByUserId(userId);
  if (!profile || !isUuid(commentId)) return false;
  const current = (await responseRows<{ id: string; status: FinderCommentStatus }>(await rest(`finder_comments?select=id,status&id=eq.${commentId}&author_profile_id=eq.${profile.id}&limit=1`), 'own comment read'))[0];
  if (!current) return false;
  if (current.status === 'approved' || current.status === 'under_review') {
    await responseRows(await rest(`finder_comments?id=eq.${commentId}&author_profile_id=eq.${profile.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'removed', updated_at: new Date().toISOString() }),
    }), 'own comment remove');
  } else {
    await responseRows(await rest(`finder_comments?id=eq.${commentId}&author_profile_id=eq.${profile.id}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }), 'own comment delete');
  }
  return true;
}
