-- Moderated, privacy-preserving Search Stories for the OnlyFans and Pornstar
-- finders. Every browser request goes through the application API; all tables
-- are deliberately service-role-only and contain no uploaded images, face
-- descriptors, result lists, or other raw search data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.finder_kind AS ENUM ('onlyfans', 'pornstar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finder_comment_outcome AS ENUM ('found', 'close', 'not_yet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.finder_comment_status AS ENUM
    ('pending', 'approved', 'rejected', 'under_review', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.finder_comment_profiles (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  email_normalized text UNIQUE,
  alias text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finder_comment_profiles_alias_valid CHECK (
    char_length(alias) BETWEEN 3 AND 32
    AND alias ~ '^[A-Za-z][A-Za-z0-9]{2,31}$'
  ),
  CONSTRAINT finder_comment_profiles_identity_valid CHECK (
    user_id IS NOT NULL OR email_normalized IS NOT NULL
  ),
  CONSTRAINT finder_comment_profiles_email_valid CHECK (
    email IS NULL OR char_length(email) BETWEEN 3 AND 320
  )
);

CREATE TABLE IF NOT EXISTS public.finder_comments (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  finder public.finder_kind NOT NULL,
  parent_id uuid REFERENCES public.finder_comments(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.finder_comment_profiles(id) ON DELETE CASCADE,
  author_alias text NOT NULL,
  outcome public.finder_comment_outcome,
  subject_name text,
  body text NOT NULL,
  status public.finder_comment_status NOT NULL DEFAULT 'pending',
  notify_replies boolean NOT NULL DEFAULT false,
  search_nonce text,
  helpful_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  moderated_at timestamptz,
  moderated_by text,
  moderation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finder_comments_alias_valid CHECK (
    char_length(author_alias) BETWEEN 3 AND 32
    AND author_alias ~ '^[A-Za-z][A-Za-z0-9]{2,31}$'
  ),
  CONSTRAINT finder_comments_subject_valid CHECK (
    subject_name IS NULL OR char_length(subject_name) BETWEEN 2 AND 64
  ),
  CONSTRAINT finder_comments_body_valid CHECK (
    (parent_id IS NULL AND char_length(body) BETWEEN 60 AND 600)
    OR (parent_id IS NOT NULL AND char_length(body) BETWEEN 20 AND 600)
  ),
  CONSTRAINT finder_comments_story_fields_valid CHECK (
    (parent_id IS NULL AND outcome IS NOT NULL AND search_nonce IS NOT NULL
      AND char_length(search_nonce) BETWEEN 16 AND 128)
    OR (parent_id IS NOT NULL AND outcome IS NULL AND search_nonce IS NULL)
  ),
  CONSTRAINT finder_comments_counts_valid CHECK (helpful_count >= 0 AND report_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finder_comment_profiles_alias_lower_unique
  ON public.finder_comment_profiles (lower(alias));

CREATE UNIQUE INDEX IF NOT EXISTS idx_finder_comments_search_nonce_unique
  ON public.finder_comments (search_nonce) WHERE search_nonce IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finder_comments_public
  ON public.finder_comments (finder, created_at DESC, id DESC)
  WHERE status = 'approved' AND parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_finder_comments_replies
  ON public.finder_comments (parent_id, created_at, id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finder_comments_moderation
  ON public.finder_comments (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_finder_comments_author
  ON public.finder_comments (author_profile_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.finder_comment_parent_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE parent_row public.finder_comments%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO parent_row FROM public.finder_comments WHERE id = NEW.parent_id;
  IF NOT FOUND OR parent_row.parent_id IS NOT NULL OR parent_row.finder <> NEW.finder THEN
    RAISE EXCEPTION 'Replies must belong to a top-level story in the same finder';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finder_comment_parent_guard ON public.finder_comments;
CREATE TRIGGER trg_finder_comment_parent_guard
BEFORE INSERT OR UPDATE OF parent_id, finder ON public.finder_comments
FOR EACH ROW EXECUTE FUNCTION public.finder_comment_parent_guard();

CREATE TABLE IF NOT EXISTS public.finder_comment_helpful_votes (
  comment_id uuid NOT NULL REFERENCES public.finder_comments(id) ON DELETE CASCADE,
  voter_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, voter_key_hash),
  CONSTRAINT finder_helpful_voter_hash_valid CHECK (char_length(voter_key_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_finder_helpful_voter_created
  ON public.finder_comment_helpful_votes (voter_key_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.finder_comment_reports (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.finder_comments(id) ON DELETE CASCADE,
  reporter_key_hash text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  CONSTRAINT finder_reports_reporter_hash_valid CHECK (char_length(reporter_key_hash) = 64),
  CONSTRAINT finder_reports_reason_valid CHECK (
    reason IN ('private_identity', 'personal_information', 'underage',
      'non_consensual', 'harassment', 'spam', 'other')
  ),
  CONSTRAINT finder_reports_details_valid CHECK (
    details IS NULL OR char_length(details) BETWEEN 3 AND 500
  ),
  CONSTRAINT finder_reports_status_valid CHECK (status IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT finder_reports_one_per_browser UNIQUE (comment_id, reporter_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_finder_reports_open
  ON public.finder_comment_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.finder_comment_moderation_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.finder_comments(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status public.finder_comment_status,
  to_status public.finder_comment_status NOT NULL,
  moderator_label text,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finder_moderation_action_valid CHECK (
    action IN ('approve', 'reject', 'remove', 'restore', 'review', 'auto_review')
  ),
  CONSTRAINT finder_moderation_text_valid CHECK (
    (moderator_label IS NULL OR char_length(moderator_label) <= 160)
    AND (reason IS NULL OR char_length(reason) <= 80)
    AND (notes IS NULL OR char_length(notes) <= 500)
  )
);

CREATE INDEX IF NOT EXISTS idx_finder_moderation_events_comment
  ON public.finder_comment_moderation_events (comment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.finder_search_feedback (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  finder public.finder_kind NOT NULL,
  outcome public.finder_comment_outcome NOT NULL,
  search_nonce text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finder_feedback_nonce_valid CHECK (char_length(search_nonce) BETWEEN 16 AND 128)
);

CREATE INDEX IF NOT EXISTS idx_finder_feedback_summary
  ON public.finder_search_feedback (finder, outcome, created_at DESC);

CREATE TABLE IF NOT EXISTS public.finder_comment_verification_drafts (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  email text NOT NULL,
  finder public.finder_kind NOT NULL,
  payload jsonb NOT NULL,
  token_hash text NOT NULL UNIQUE,
  requester_key_hash text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  comment_id uuid REFERENCES public.finder_comments(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  claim_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finder_drafts_email_length CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT finder_drafts_payload_valid CHECK (
    jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 8192
  ),
  CONSTRAINT finder_drafts_token_hash_valid CHECK (char_length(token_hash) = 64),
  CONSTRAINT finder_drafts_requester_hash_valid CHECK (
    requester_key_hash IS NULL OR char_length(requester_key_hash) = 64
  ),
  CONSTRAINT finder_drafts_claim_hash_valid CHECK (
    claim_token_hash IS NULL OR char_length(claim_token_hash) = 64
  )
);

CREATE INDEX IF NOT EXISTS idx_finder_drafts_expiry
  ON public.finder_comment_verification_drafts (expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_finder_drafts_email_created
  ON public.finder_comment_verification_drafts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finder_drafts_requester_created
  ON public.finder_comment_verification_drafts (requester_key_hash, created_at DESC)
  WHERE requester_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finder_drafts_consumed
  ON public.finder_comment_verification_drafts (consumed_at)
  WHERE consumed_at IS NOT NULL;

ALTER TABLE public.finder_comments
  ADD COLUMN IF NOT EXISTS verification_draft_id uuid
  REFERENCES public.finder_comment_verification_drafts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_finder_comments_verification_draft_unique
  ON public.finder_comments (verification_draft_id)
  WHERE verification_draft_id IS NOT NULL;

-- Atomic counter maintenance keeps public reads cheap without exposing voters.
CREATE OR REPLACE FUNCTION public.finder_comment_helpful_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.finder_comments SET helpful_count = helpful_count + 1,
      updated_at = now() WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  UPDATE public.finder_comments SET helpful_count = GREATEST(0, helpful_count - 1),
    updated_at = now() WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_finder_comment_helpful_count ON public.finder_comment_helpful_votes;
CREATE TRIGGER trg_finder_comment_helpful_count
AFTER INSERT OR DELETE ON public.finder_comment_helpful_votes
FOR EACH ROW EXECUTE FUNCTION public.finder_comment_helpful_count_sync();

CREATE OR REPLACE FUNCTION public.finder_comment_report_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.finder_comments SET report_count = report_count + 1,
      updated_at = now() WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.finder_comments SET report_count = GREATEST(0, report_count - 1),
      updated_at = now() WHERE id = OLD.comment_id;
    RETURN OLD;
  ELSIF OLD.status = 'open' AND NEW.status <> 'open' THEN
    UPDATE public.finder_comments SET report_count = GREATEST(0, report_count - 1),
      updated_at = now() WHERE id = NEW.comment_id;
  ELSIF OLD.status <> 'open' AND NEW.status = 'open' THEN
    UPDATE public.finder_comments SET report_count = report_count + 1,
      updated_at = now() WHERE id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finder_comment_report_count ON public.finder_comment_reports;
CREATE TRIGGER trg_finder_comment_report_count
AFTER INSERT OR DELETE OR UPDATE OF status ON public.finder_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.finder_comment_report_count_sync();

-- Consume a verification draft exactly once and return its private payload only
-- to the service role calling this function.
DROP FUNCTION IF EXISTS public.consume_finder_comment_verification_draft(text);
CREATE OR REPLACE FUNCTION public.consume_finder_comment_verification_draft(
  p_token_hash text, p_claim_token_hash text)
RETURNS TABLE(id uuid, email text, finder public.finder_kind, payload jsonb,
  consumed_at timestamptz, comment_id uuid, can_consume boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.finder_comment_verification_drafts AS claim
  SET claimed_at = now(), claim_token_hash = p_claim_token_hash
  WHERE claim.token_hash = p_token_hash
    AND claim.consumed_at IS NULL
    AND claim.expires_at > now()
    AND (claim.claimed_at IS NULL OR claim.claimed_at < now() - interval '5 minutes');

  RETURN QUERY
  SELECT draft.id, draft.email, draft.finder, draft.payload, draft.consumed_at,
    draft.comment_id,
    (draft.consumed_at IS NULL AND draft.expires_at > now()
      AND draft.claim_token_hash = p_claim_token_hash) AS can_consume
  FROM public.finder_comment_verification_drafts AS draft
  WHERE draft.token_hash = p_token_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_finder_comment(
  p_comment_id uuid, p_action text, p_moderator_label text,
  p_reason text, p_notes text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_status public.finder_comment_status;
  next_status public.finder_comment_status;
BEGIN
  SELECT status INTO previous_status FROM public.finder_comments
  WHERE id = p_comment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found'; END IF;

  next_status := CASE p_action
    WHEN 'approve' THEN 'approved'::public.finder_comment_status
    WHEN 'reject' THEN 'rejected'::public.finder_comment_status
    WHEN 'remove' THEN 'removed'::public.finder_comment_status
    WHEN 'restore' THEN 'pending'::public.finder_comment_status
    WHEN 'review' THEN 'under_review'::public.finder_comment_status
    ELSE NULL
  END;
  IF next_status IS NULL THEN RAISE EXCEPTION 'Invalid moderation action'; END IF;

  UPDATE public.finder_comments SET status = next_status,
    moderation_reason = p_reason, moderated_at = now(),
    moderated_by = p_moderator_label, updated_at = now()
  WHERE id = p_comment_id;

  INSERT INTO public.finder_comment_moderation_events
    (comment_id, action, from_status, to_status, moderator_label, reason, notes)
  VALUES (p_comment_id, p_action, previous_status, next_status,
    p_moderator_label, p_reason, p_notes);

  IF p_action <> 'review' THEN
    UPDATE public.finder_comment_reports
    SET status = CASE WHEN p_action IN ('reject', 'remove') THEN 'resolved' ELSE 'dismissed' END,
      reviewed_at = now(), reviewed_by = p_moderator_label
    WHERE comment_id = p_comment_id AND status = 'open';
  END IF;
  RETURN p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_finder_comment_verification_drafts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.finder_comment_verification_drafts
  WHERE (consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days')
    OR (consumed_at IS NULL AND expires_at < now() - interval '24 hours');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finder_comment_helpful_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finder_comment_report_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finder_comment_parent_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_finder_comment_verification_draft(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_finder_comment_verification_draft(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.moderate_finder_comment(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_finder_comment(uuid, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_finder_comment_verification_drafts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_finder_comment_verification_drafts() TO service_role;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'finder_comment_profiles', 'finder_comments', 'finder_comment_helpful_votes',
    'finder_comment_reports', 'finder_comment_moderation_events',
    'finder_search_feedback', 'finder_comment_verification_drafts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

COMMENT ON TABLE public.finder_comments IS
  'Premoderated Search Stories and one-level replies; never stores uploaded/search-result data.';
COMMENT ON COLUMN public.finder_comments.subject_name IS
  'Optional public stage name (Pornstar Finder) or public creator username (OnlyFans Finder), never an offline identity.';
COMMENT ON COLUMN public.finder_comments.author_alias IS
  'Public alias snapshot; auth user id remains private.';
COMMENT ON TABLE public.finder_comment_verification_drafts IS
  'Short-lived private drafts used by the passwordless email verification flow.';

NOTIFY pgrst, 'reload schema';

COMMIT;
