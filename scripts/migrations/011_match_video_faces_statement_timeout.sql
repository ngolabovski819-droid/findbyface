-- Migration 011: Give match_video_faces headroom against cold-cache HNSW scans
-- ==============================================================================
-- Root cause of the intermittent 502s from the video-face matcher (found via
-- direct RPC reproduction on 2026-08-07): the HNSW index over
-- video_face_embeddings has grown to ~132k rows, and match_video_faces sets
-- hnsw.ef_search as high as 1000 for recall. When the index isn't warm in
-- shared_buffers (e.g. after an idle period), a single search has to pull
-- graph pages from disk and can take 9-13s. The role's statement_timeout was
-- killing it around ~8.8s (Postgres error 57014), which the REST layer
-- surfaces as a 502. Once a query has run once (even a cancelled one), the
-- pages it touched are cached and the next call is sub-second -- consistent
-- with the observed pattern of a slow/failing call followed by instant
-- successes.
--
-- This doesn't change what the function does, only how long it's allowed to
-- run before Postgres cancels it. 15s leaves the RPC itself comfortable
-- headroom above the observed cold-cache cost while still leaving most of
-- the Astro proxy's 25s abort budget free for face detection and thumbnail
-- caching, which run around the same call. The Modal matcher also now
-- retries once immediately on failure (see video_face_matcher_modal.py) --
-- a warm retry right after a cancelled query reliably lands under 1.1s, so
-- the two changes are meant to work together rather than either alone
-- needing to cover the whole gap.

ALTER FUNCTION public.match_video_faces(vector, INTEGER, REAL, INTEGER)
  SET statement_timeout = '15s';
