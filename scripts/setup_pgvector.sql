-- ============================================================
-- findbyface — pgvector setup for face similarity search
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Enable the pgvector extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add the face_embedding column (128-dimensional dlib/face-api.js vector)
ALTER TABLE onlyfans_profiles
  ADD COLUMN IF NOT EXISTS face_embedding vector(128);

-- 3. Create an IVFFlat index for fast cosine similarity search
--    (run AFTER you have at least 1000 embeddings for good performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_face_embedding
  ON onlyfans_profiles
  USING ivfflat (face_embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create the RPC function used by face-search.ts (pgvector approach)
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
LANGUAGE sql STABLE
AS $$
  SELECT
    id, username, name, avatar, isverified, subscribeprice, favoritedcount,
    1 - (face_embedding <=> query_embedding) AS similarity
  FROM onlyfans_profiles
  WHERE face_embedding IS NOT NULL
  ORDER BY face_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- After running this SQL:
--   1. Set SUPABASE_URL and SUPABASE_KEY in your .env file
--   2. Install Python deps: pip install face_recognition requests Pillow tqdm python-dotenv
--   3. Run: python scripts/generate_embeddings.py
--      (This processes creators in batches — can take hours for 10k+ creators)
-- ============================================================
