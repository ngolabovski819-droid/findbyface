-- Migration 010: Direct video-face embeddings
-- ============================================
-- Supabase becomes the source of truth for:
--   * video metadata and thumbnails (`videos`)
--   * processing state and sampling policy
--   * every searchable 512-D face embedding
--
-- This deliberately avoids a required global performer identity layer.
-- Search finds the nearest face rows and groups them directly by video.
--
-- Requires pgvector >= 0.7.0 for halfvec.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.video_face_processing_runs (
  id                    BIGSERIAL PRIMARY KEY,
  video_id              BIGINT NOT NULL
                        REFERENCES public.videos(id) ON DELETE CASCADE,
  pipeline_version      TEXT NOT NULL,
  model_version         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN (
                          'queued', 'processing', 'completed',
                          'failed', 'superseded', 'skipped'
                        )),
  skip_intro_seconds    INTEGER NOT NULL DEFAULT 20
                        CHECK (skip_intro_seconds >= 0),
  skip_outro_seconds    INTEGER NOT NULL DEFAULT 20
                        CHECK (skip_outro_seconds >= 0),
  frame_interval_seconds REAL NOT NULL DEFAULT 8
                        CHECK (frame_interval_seconds > 0),
  max_frames            INTEGER NOT NULL DEFAULT 120
                        CHECK (max_frames > 0),
  frames_sampled        INTEGER CHECK (frames_sampled >= 0),
  faces_detected        INTEGER CHECK (faces_detected >= 0),
  embeddings_stored     INTEGER CHECK (embeddings_stored >= 0),
  error_message         TEXT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_video_face_run_version
    UNIQUE (video_id, pipeline_version, model_version),
  CONSTRAINT uq_video_face_run_id_video
    UNIQUE (id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_face_runs_status
  ON public.video_face_processing_runs (status, id);


CREATE TABLE IF NOT EXISTS public.video_face_embeddings (
  id                BIGSERIAL PRIMARY KEY,
  run_id            BIGINT NOT NULL,
  video_id          BIGINT NOT NULL,
  timestamp_ms      INTEGER NOT NULL CHECK (timestamp_ms >= 0),
  face_index        SMALLINT NOT NULL CHECK (face_index >= 0),
  quality_score     REAL NOT NULL
                    CHECK (quality_score >= 0 AND quality_score <= 1),
  detector_score    REAL CHECK (
                      detector_score >= 0 AND detector_score <= 1
                    ),
  face_size_px      SMALLINT CHECK (face_size_px > 0),
  embedding         halfvec(512) NOT NULL,
  searchable        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_video_face_embedding_run
    FOREIGN KEY (run_id, video_id)
    REFERENCES public.video_face_processing_runs(id, video_id)
    ON DELETE CASCADE,
  CONSTRAINT uq_video_face_embedding_sample
    UNIQUE (run_id, timestamp_ms, face_index)
);

CREATE INDEX IF NOT EXISTS idx_video_face_embeddings_run
  ON public.video_face_embeddings (run_id);

CREATE INDEX IF NOT EXISTS idx_video_face_embeddings_video_searchable
  ON public.video_face_embeddings (video_id)
  WHERE searchable;

CREATE INDEX IF NOT EXISTS idx_video_face_embeddings_hnsw
  ON public.video_face_embeddings
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 128)
  WHERE searchable;


CREATE OR REPLACE FUNCTION public.complete_video_face_run(
  p_run_id               BIGINT,
  p_expected_embeddings  INTEGER,
  p_frames_sampled       INTEGER,
  p_faces_detected       INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_run          public.video_face_processing_runs%ROWTYPE;
  v_actual_count INTEGER;
BEGIN
  SELECT *
  INTO v_run
  FROM public.video_face_processing_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'video face run % does not exist', p_run_id;
  END IF;

  IF v_run.status = 'completed' THEN
    RETURN COALESCE(v_run.embeddings_stored, 0);
  END IF;

  IF v_run.status <> 'processing' THEN
    RAISE EXCEPTION 'run % is not processing (status=%)', p_run_id, v_run.status;
  END IF;

  SELECT count(*)::INTEGER
  INTO v_actual_count
  FROM public.video_face_embeddings
  WHERE run_id = p_run_id;

  IF v_actual_count <> p_expected_embeddings THEN
    RAISE EXCEPTION
      'embedding count mismatch for run %: expected %, found %',
      p_run_id, p_expected_embeddings, v_actual_count;
  END IF;

  UPDATE public.video_face_processing_runs
  SET status = 'superseded',
      updated_at = now()
  WHERE video_id = v_run.video_id
    AND id <> p_run_id
    AND status = 'completed';

  UPDATE public.video_face_embeddings
  SET searchable = false
  WHERE video_id = v_run.video_id
    AND searchable;

  UPDATE public.video_face_embeddings
  SET searchable = true
  WHERE run_id = p_run_id;

  UPDATE public.video_face_processing_runs
  SET status = 'completed',
      frames_sampled = p_frames_sampled,
      faces_detected = p_faces_detected,
      embeddings_stored = v_actual_count,
      completed_at = now(),
      error_message = NULL,
      updated_at = now()
  WHERE id = p_run_id;

  RETURN v_actual_count;
END;
$$;


DROP FUNCTION IF EXISTS public.match_video_faces(
  vector, INTEGER, REAL, INTEGER
);

CREATE OR REPLACE FUNCTION public.match_video_faces(
  query_embedding  vector(512),
  match_count      INTEGER DEFAULT 50,
  min_similarity   REAL DEFAULT 0.324,
  candidate_count  INTEGER DEFAULT 2000
)
RETURNS TABLE (
  video_id               BIGINT,
  external_id            TEXT,
  title                   TEXT,
  source_url              TEXT,
  thumbnail_url           TEXT,
  duration_seconds        INTEGER,
  similarity              REAL,
  robust_similarity       REAL,
  supporting_embeddings   INTEGER,
  best_timestamp_seconds  REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_query           halfvec(512);
  v_match_count     INTEGER;
  v_candidate_count INTEGER;
  v_min_similarity  REAL;
BEGIN
  IF query_embedding IS NULL THEN
    RAISE EXCEPTION 'query_embedding is required';
  END IF;

  v_query := query_embedding::halfvec(512);
  v_match_count := LEAST(500, GREATEST(1, COALESCE(match_count, 50)));
  v_candidate_count := LEAST(
    10000,
    GREATEST(v_match_count * 20, COALESCE(candidate_count, 2000))
  );
  v_min_similarity := LEAST(
    1.0,
    GREATEST(-1.0, COALESCE(min_similarity, 0.324))
  );

  PERFORM set_config(
    'hnsw.ef_search',
    LEAST(v_candidate_count, 1000)::TEXT,
    true
  );

  RETURN QUERY
  WITH nearest AS MATERIALIZED (
    SELECT
      e.video_id,
      e.timestamp_ms,
      e.quality_score,
      e.embedding <=> v_query AS distance
    FROM public.video_face_embeddings e
    WHERE e.searchable
    ORDER BY e.embedding <=> v_query
    LIMIT v_candidate_count
  ),
  ranked AS (
    SELECT
      n.*,
      (1.0 - n.distance)::REAL AS face_similarity,
      row_number() OVER (
        PARTITION BY n.video_id
        ORDER BY n.distance, n.quality_score DESC
      ) AS evidence_rank
    FROM nearest n
    WHERE n.distance <= (1.0 - v_min_similarity)
  ),
  grouped AS (
    SELECT
      r.video_id,
      max(r.face_similarity)::REAL AS max_similarity,
      (
        avg(r.face_similarity)
        FILTER (WHERE r.evidence_rank <= 3)
      )::REAL AS mean_top_three,
      count(*)::INTEGER AS evidence_count,
      (
        array_agg(
          r.timestamp_ms
          ORDER BY r.face_similarity DESC, r.quality_score DESC
        )
      )[1] AS best_timestamp_ms
    FROM ranked r
    GROUP BY r.video_id
  )
  SELECT
    v.id,
    v.external_id,
    v.title,
    v.source_url,
    v.thumbnail_url,
    v.duration_seconds,
    g.max_similarity,
    CASE
      WHEN g.evidence_count >= 2 THEN g.mean_top_three
      ELSE GREATEST(-1.0, g.max_similarity - 0.05)::REAL
    END,
    g.evidence_count,
    (g.best_timestamp_ms / 1000.0)::REAL
  FROM grouped g
  JOIN public.videos v ON v.id = g.video_id
  ORDER BY
    g.max_similarity DESC,
    g.evidence_count DESC,
    v.id
  LIMIT v_match_count;
END;
$$;


ALTER TABLE public.video_face_processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_face_embeddings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.video_face_processing_runs FROM anon, authenticated;
REVOKE ALL ON public.video_face_embeddings FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.video_face_processing_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.video_face_embeddings TO service_role;
GRANT USAGE, SELECT
  ON SEQUENCE public.video_face_processing_runs_id_seq TO service_role;
GRANT USAGE, SELECT
  ON SEQUENCE public.video_face_embeddings_id_seq TO service_role;

REVOKE ALL ON FUNCTION
  public.complete_video_face_run(BIGINT, INTEGER, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.complete_video_face_run(BIGINT, INTEGER, INTEGER, INTEGER)
  TO service_role;

REVOKE ALL ON FUNCTION
  public.match_video_faces(vector, INTEGER, REAL, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.match_video_faces(vector, INTEGER, REAL, INTEGER)
  TO anon, authenticated, service_role;
