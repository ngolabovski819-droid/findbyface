-- Migration: face_metrics for /ai-discover/ visual preference discovery
-- ====================================================================
-- Adds per-creator interpretable face geometry + color metrics.
-- Unlike face_embedding (opaque 128-D identity vector), face_metrics is a
-- structured JSON object whose keys map 1:1 to slider/swatch controls in the UI.
--
-- Run in Supabase SQL editor.

ALTER TABLE onlyfans_profiles
  ADD COLUMN IF NOT EXISTS face_metrics         JSONB,
  ADD COLUMN IF NOT EXISTS face_metrics_version SMALLINT,
  ADD COLUMN IF NOT EXISTS face_metrics_at      TIMESTAMPTZ;

-- Filter index: extractor scans rows where version is null OR < current.
CREATE INDEX IF NOT EXISTS idx_onlyfans_profiles_face_metrics_version
  ON onlyfans_profiles (face_metrics_version)
  WHERE face_metrics IS NOT NULL;

-- Composite index supporting the "ranked candidate pool" query in the search RPC.
-- We pull top creators by favoritedcount that already have metrics.
CREATE INDEX IF NOT EXISTS idx_onlyfans_profiles_metrics_favorited
  ON onlyfans_profiles (favoritedcount DESC)
  WHERE face_metrics IS NOT NULL;

-- Categorical hard-filter indexes (eye / hair / shape) — extracted from JSONB.
-- These are expression indexes on the JSONB attribute path.
CREATE INDEX IF NOT EXISTS idx_face_metrics_eye_color
  ON onlyfans_profiles ((face_metrics->>'eyeColor'))
  WHERE face_metrics IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_face_metrics_hair_color
  ON onlyfans_profiles ((face_metrics->>'hairColor'))
  WHERE face_metrics IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_face_metrics_eye_shape
  ON onlyfans_profiles ((face_metrics->>'eyeShape'))
  WHERE face_metrics IS NOT NULL;

COMMENT ON COLUMN onlyfans_profiles.face_metrics IS
  'Interpretable face geometry + color metrics extracted from avatar via MediaPipe FaceMesh. Schema: see scripts/extract_face_metrics.py SCHEMA_VERSION=1.';
