-- Migration 009: Performer video identity subsystem ("Corn Performers")
-- =======================================================================
-- New, independent identity re-identification subsystem: given a photo of
-- a performer, find videos they appear in. This is deliberately separate
-- from onlyfans_profiles.face_embedding (128-D face-api.js descriptor used
-- for lookalike DISCOVERY, where near-misses are fine). Here the goal is
-- exact identity re-identification, so we use 512-D ArcFace/AdaFace
-- (InsightFace) embeddings instead — better pose/lighting/blur robustness
-- and inter-class separation than the older dlib-based descriptor.
--
-- Run in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── videos ──────────────────────────────────────────────────────────────
-- One row per source video. Populated from the caller's video catalog
-- before/independently of face processing; `processed_at` tracks whether
-- the ingestion pipeline has run face detection on it yet.
CREATE TABLE IF NOT EXISTS videos (
  id               BIGSERIAL PRIMARY KEY,
  title            TEXT,
  source_url       TEXT NOT NULL,        -- public link shown to end users
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  external_id      TEXT UNIQUE,          -- id from the source catalog, for de-dupe on re-import
  processed_at     TIMESTAMPTZ,
  process_error    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_unprocessed
  ON videos (id) WHERE processed_at IS NULL;

-- ── performers ──────────────────────────────────────────────────────────
-- One row per resolved on-screen identity. display_name is nullable —
-- performers are created anonymously from clustering and can be named later.
CREATE TABLE IF NOT EXISTS performers (
  id           BIGSERIAL PRIMARY KEY,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── performer_exemplars ─────────────────────────────────────────────────
-- A small gallery of embeddings per performer (captured across different
-- videos/appearances) instead of one centroid. Pose/lighting variance
-- across scenes is high enough that a single averaged embedding drifts and
-- degrades matching over time; gallery (max-similarity-across-exemplars)
-- matching is the standard fix.
CREATE TABLE IF NOT EXISTS performer_exemplars (
  id            BIGSERIAL PRIMARY KEY,
  performer_id  BIGINT NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
  embedding     vector(512) NOT NULL,
  video_id      BIGINT REFERENCES videos(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performer_exemplars_performer
  ON performer_exemplars (performer_id);

CREATE INDEX IF NOT EXISTS idx_performer_exemplars_hnsw
  ON performer_exemplars
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- ── performer_videos ────────────────────────────────────────────────────
-- Join table: which performers appear in which videos, plus per-appearance
-- metadata used to build the "jump to timestamp" deep link and thumbnail.
CREATE TABLE IF NOT EXISTS performer_videos (
  performer_id        BIGINT NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
  video_id             BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  first_seen_seconds   INTEGER,
  screen_time_seconds  INTEGER,
  thumbnail_url        TEXT,
  match_confidence     FLOAT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (performer_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_performer_videos_video
  ON performer_videos (video_id);

-- ── match_performers RPC ────────────────────────────────────────────────
-- Gallery search: pull the nearest exemplar rows (which may include several
-- per performer), then collapse to one row per performer using the best
-- (max) similarity across their exemplars. Mirrors match_faces's
-- ef_search bump (see 005_fix_index_hnsw.sql) for guaranteed HNSW recall.
DROP FUNCTION IF EXISTS match_performers(vector(512), int, int);

CREATE OR REPLACE FUNCTION match_performers(
  query_embedding vector(512),
  match_count     int DEFAULT 5,
  pool_size       int DEFAULT 50
)
RETURNS TABLE (
  performer_id bigint,
  similarity   float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  PERFORM set_config('hnsw.ef_search', GREATEST(200, pool_size * 2)::text, true);

  RETURN QUERY
  SELECT e.pid::bigint,
         MAX(1 - (e.embedding <=> query_embedding))::float AS sim
  FROM (
    SELECT performer_exemplars.performer_id AS pid, performer_exemplars.embedding
    FROM performer_exemplars
    ORDER BY performer_exemplars.embedding <=> query_embedding
    LIMIT pool_size
  ) e
  GROUP BY e.pid
  ORDER BY sim DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_performers(vector(512), int, int)
  TO anon, authenticated, service_role;
