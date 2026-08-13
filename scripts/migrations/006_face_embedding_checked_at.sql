-- Migration 006: attempt-tracking for face_embedding extraction
-- ================================================================
-- Problem: scripts/generate-embeddings.mjs only writes face_embedding on
-- success. Creators where no face was detected, or whose avatar image is
-- permanently unreachable (dead CDN object, deleted account), never get
-- any marker — so every future run re-downloads and re-fails the exact
-- same ~15k+ rows before reaching anything new.
--
-- Fix: stamp every attempted row (success, no-face, or confirmed-dead
-- download) with face_embedding_checked_at. The extractor's WHERE clause
-- excludes rows that already have this set, so future runs only see
-- genuinely unattempted creators.

ALTER TABLE onlyfans_profiles
  ADD COLUMN IF NOT EXISTS face_embedding_checked_at TIMESTAMPTZ;

-- Supports "WHERE face_embedding IS NULL AND face_embedding_checked_at IS NULL"
CREATE INDEX IF NOT EXISTS idx_onlyfans_profiles_face_embedding_pending
  ON onlyfans_profiles (favoritedcount DESC)
  WHERE face_embedding IS NULL AND face_embedding_checked_at IS NULL;

COMMENT ON COLUMN onlyfans_profiles.face_embedding_checked_at IS
  'Set by scripts/generate-embeddings.mjs whenever a creator was attempted (success, no-face, or confirmed-dead avatar) so future runs do not re-process them. NULL = never attempted.';
