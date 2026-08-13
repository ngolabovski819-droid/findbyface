-- ============================================================
-- Migration 005: Replace IVFFlat with HNSW for face embeddings
-- ============================================================
-- Problem: IVFFlat index with lists=100 uses probes=1 by default,
-- meaning only ~1% of the index is searched per query. With 34k+
-- embeddings, this causes correct matches (same person, different
-- photo) to be missed entirely from results.
--
-- Fix: HNSW index has ~99.9% recall by default and is much better
-- suited for face similarity search. Also update match_faces to
-- set hnsw.ef_search >= match_count for guaranteed recall.
--
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Drop the old approximate IVFFlat index
DROP INDEX IF EXISTS idx_face_embedding;

-- 2. Create HNSW index (pgvector 0.5+ — available on all Supabase plans)
--    m=16 and ef_construction=200 are good defaults for 128-dim embeddings
CREATE INDEX idx_face_embedding_hnsw
  ON onlyfans_profiles
  USING hnsw (face_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- 3. Replace match_faces RPC with a plpgsql version that sets ef_search
--    to guarantee high recall when match_count is large.
--    ef_search must be >= match_count for HNSW to return enough candidates.

DROP FUNCTION IF EXISTS match_faces(vector(128), int);

CREATE OR REPLACE FUNCTION match_faces(
  query_embedding vector(128),
  match_count     int DEFAULT 12
)
RETURNS TABLE (
  id              bigint,
  username        text,
  name            text,
  avatar          text,
  isverified      boolean,
  subscribeprice  numeric,
  favoritedcount  integer,
  similarity      float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Set ef_search to max(200, match_count * 2) so HNSW considers enough
  -- candidates to guarantee the match_count nearest neighbours are found.
  PERFORM set_config(
    'hnsw.ef_search',
    GREATEST(200, match_count * 2)::text,
    true   -- local to this transaction
  );

  RETURN QUERY
  SELECT
    p.id::bigint,
    p.username::text,
    p.name::text,
    p.avatar::text,
    p.isverified::boolean,
    p.subscribeprice::numeric,
    p.favoritedcount::integer,
    (1 - (p.face_embedding <=> query_embedding))::float AS similarity
  FROM onlyfans_profiles p
  WHERE p.face_embedding IS NOT NULL
  ORDER BY p.face_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
