-- RPC: match_face_metrics
-- =======================
-- Given a target metrics JSON (numeric fields) and weights, return the top N
-- creators ranked by weighted Euclidean distance over numeric attributes plus
-- a categorical-mismatch penalty.
--
-- Inputs:
--   target          JSONB — same shape as onlyfans_profiles.face_metrics
--                          numeric fields are 0..1 normalized
--   weights         JSONB — per-numeric-field weight (default 1.0)
--                   Special keys: "_categorical" -> weight applied per
--                   categorical mismatch (default 0.25 of total numeric weight).
--   pool_size       INT   — initial candidate pool size sorted by favoritedcount
--   match_count     INT   — final number of results to return
--   filter_verified BOOL  — if true, only verified creators
--   filter_max_price NUMERIC — if not null, only creators with subscribeprice <= this
--
-- Returns: id, username, name, avatar, isverified, subscribeprice,
--          favoritedcount, score (lower = better, 0..~3).

-- Drop prior signatures so adding a new param doesn't error.
DROP FUNCTION IF EXISTS match_face_metrics(JSONB, JSONB, INT, INT, BOOL, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS match_face_metrics(JSONB, JSONB, INT, INT, BOOL, NUMERIC, TEXT, TEXT, TEXT, SMALLINT);

CREATE OR REPLACE FUNCTION match_face_metrics(
  target           JSONB,
  weights          JSONB DEFAULT '{}'::jsonb,
  pool_size        INT   DEFAULT 2000,
  match_count      INT   DEFAULT 24,
  filter_verified  BOOL  DEFAULT FALSE,
  filter_max_price NUMERIC DEFAULT NULL,
  filter_eye_color TEXT  DEFAULT NULL,
  filter_hair_color TEXT DEFAULT NULL,
  filter_eye_shape TEXT  DEFAULT NULL,
  min_metrics_version SMALLINT DEFAULT 0
)
RETURNS TABLE (
  id              BIGINT,
  username        TEXT,
  name            TEXT,
  avatar          TEXT,
  isverified      BOOLEAN,
  subscribeprice  NUMERIC,
  favoritedcount  BIGINT,
  score           DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  numeric_keys TEXT[] := ARRAY[
    'jawWidth','cheekboneProminence','fwhr','midfaceRatio','lowerThirdWidth',
    'gonialAngle','ramusLength','chinProjection','browRidge','frankfurtRecession',
    'eyeSpacing','canthalTilt','eyebrowDensity','eyebrowPosition','eyebrowTilt',
    'lipFullness','vermillionRatio','skinTone','jawlineVisibility'
  ];
  cat_penalty NUMERIC := COALESCE((weights->>'_categorical')::NUMERIC, 0.25);
BEGIN
  RETURN QUERY
  WITH pool AS (
    SELECT p.id::BIGINT AS id,
           p.username::TEXT AS username,
           p.name::TEXT AS name,
           p.avatar::TEXT AS avatar,
           p.isverified,
           p.subscribeprice::NUMERIC AS subscribeprice,
           p.favoritedcount::BIGINT AS favoritedcount,
           p.face_metrics
    FROM onlyfans_profiles p
    WHERE p.face_metrics IS NOT NULL
      AND COALESCE(p.face_metrics_version, 0) >= min_metrics_version
      AND (NOT filter_verified OR p.isverified = TRUE)
      AND (filter_max_price IS NULL OR COALESCE(p.subscribeprice, 0) <= filter_max_price)
      AND (filter_eye_color IS NULL OR p.face_metrics->>'eyeColor' = filter_eye_color)
      AND (filter_hair_color IS NULL OR p.face_metrics->>'hairColor' = filter_hair_color)
      AND (filter_eye_shape IS NULL OR p.face_metrics->>'eyeShape' = filter_eye_shape)
    ORDER BY p.favoritedcount DESC NULLS LAST
    LIMIT pool_size
  ),
  scored AS (
    SELECT
      p.*,
      (
        -- numeric weighted squared-difference sum
        (SELECT COALESCE(SUM(
            COALESCE((weights->>k)::NUMERIC, 1.0) *
            POWER(
              COALESCE((p.face_metrics->>k)::NUMERIC, 0.5)
              - COALESCE((target->>k)::NUMERIC, 0.5),
              2
            )
          ), 0)
          FROM unnest(numeric_keys) AS k
        )
        +
        -- categorical mismatch penalty (only when target specifies)
        CASE WHEN (target->>'eyeColor') IS NOT NULL
             AND (p.face_metrics->>'eyeColor') IS DISTINCT FROM (target->>'eyeColor')
             THEN cat_penalty ELSE 0 END
        +
        CASE WHEN (target->>'hairColor') IS NOT NULL
             AND (p.face_metrics->>'hairColor') IS DISTINCT FROM (target->>'hairColor')
             THEN cat_penalty ELSE 0 END
        +
        CASE WHEN (target->>'eyeShape') IS NOT NULL
             AND (p.face_metrics->>'eyeShape') IS DISTINCT FROM (target->>'eyeShape')
             THEN cat_penalty * 0.5 ELSE 0 END
        +
        CASE WHEN (target->>'hairTexture') IS NOT NULL
             AND (p.face_metrics->>'hairTexture') IS DISTINCT FROM (target->>'hairTexture')
             THEN cat_penalty * 0.5 ELSE 0 END
      )::DOUBLE PRECISION AS score
    FROM pool p
  )
  SELECT s.id, s.username, s.name, s.avatar, s.isverified,
         s.subscribeprice, s.favoritedcount, s.score
  FROM scored s
  ORDER BY s.score ASC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_face_metrics(JSONB, JSONB, INT, INT, BOOL, NUMERIC, TEXT, TEXT, TEXT, SMALLINT)
  TO anon, authenticated, service_role;
