-- Fast, relevance-ranked creator suggestions for the search combobox.
--
-- The production table already has pg_trgm GIN indexes on username and name
-- (`idx_username_trgm` and `idx_name_trgm`), which fuzzy matching reuses. The
-- smaller functional B-tree indexes below keep full-table, case-insensitive exact
-- username and name lookups fast. Prefix suggestions are bounded later in the
-- function so an uncommon term cannot scan all 1.9M creator rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

SET search_path = public, extensions;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onlyfans_profiles_username_search_prefix
  ON public.onlyfans_profiles (lower(username) text_pattern_ops)
  WHERE username IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onlyfans_profiles_name_search_prefix
  ON public.onlyfans_profiles (lower(name) text_pattern_ops)
  WHERE name IS NOT NULL;

BEGIN;

DROP FUNCTION IF EXISTS public.get_search_creator_suggestions(text, integer);

CREATE FUNCTION public.get_search_creator_suggestions(
  p_query text,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  id bigint,
  username text,
  name text,
  avatar text,
  isverified boolean,
  favoritedcount bigint
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$
DECLARE
  v_query text := lower(
    regexp_replace(
      btrim(regexp_replace(COALESCE(p_query, ''), '^@+', '')),
      '\s+', ' ', 'g'
    )
  );
  v_pattern text;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 6);
BEGIN
  IF char_length(v_query) NOT BETWEEN 2 AND 64 THEN
    RETURN;
  END IF;

  v_pattern := replace(
    replace(
      replace(v_query, E'\\', E'\\\\'),
      '%', E'\\%'
    ),
    '_', E'\\_'
  ) || '%';

  -- Dynamic execution is intentional. It gives exact and fuzzy predicates a
  -- custom plan instead of caching a generic full-table plan for every query.
  RETURN QUERY EXECUTE format($query$
    WITH exact_username AS MATERIALIZED (
      SELECT p.id,
             p.username,
             p.name,
             p.avatar,
             p.isverified,
             p.favoritedcount,
             0 AS match_tier,
             1.0::double precision AS match_score
      FROM public.onlyfans_profiles p
      WHERE p.username IS NOT NULL
        AND lower(p.username) = %1$L
      LIMIT %3$s
    ),
    exact_name_source AS MATERIALIZED (
      SELECT p.id,
             p.username,
             p.name,
             p.avatar,
             p.isverified,
             p.favoritedcount
      FROM public.onlyfans_profiles p
      WHERE p.username IS NOT NULL
        AND p.name IS NOT NULL
        AND lower(p.name) = %1$L
        AND lower(p.username) <> %1$L
    ),
    exact_name AS MATERIALIZED (
      SELECT n.id,
             n.username,
             n.name,
             n.avatar,
             n.isverified,
             n.favoritedcount,
             1 AS match_tier,
             1.0::double precision AS match_score
      FROM exact_name_source n
      ORDER BY n.favoritedcount DESC NULLS LAST, n.id
      LIMIT %3$s
    ),
    -- Autocomplete is deliberately bounded to the 25,000 most-favorited
    -- creators. Exact username/name matches above still cover the full table,
    -- and the UI always offers a full search for the typed term. This prevents
    -- an uncommon prefix from walking the entire favorites index.
    popular_pool AS MATERIALIZED (
      SELECT p.id,
             p.username,
             p.name,
             p.avatar,
             p.isverified,
             p.favoritedcount
      FROM public.onlyfans_profiles p
      WHERE p.username IS NOT NULL
      ORDER BY p.favoritedcount DESC NULLS LAST, p.id
      LIMIT 25000
    ),
    popular_prefix AS MATERIALIZED (
      SELECT p.id,
             p.username,
             p.name,
             p.avatar,
             p.isverified,
             p.favoritedcount,
             CASE
               WHEN lower(p.username) LIKE %2$L ESCAPE E'\\' THEN 2
               ELSE 3
             END AS match_tier,
             1.0::double precision AS match_score
      FROM popular_pool p
      WHERE (
          lower(p.username) LIKE %2$L ESCAPE E'\\'
          OR (p.name IS NOT NULL AND lower(p.name) LIKE %2$L ESCAPE E'\\')
        )
        AND lower(p.username) <> %1$L
        AND (p.name IS NULL OR lower(p.name) <> %1$L)
      ORDER BY match_tier,
               p.favoritedcount DESC NULLS LAST,
               p.id
      LIMIT %3$s
    ),
    direct_best AS MATERIALIZED (
      SELECT d.*
      FROM (
        SELECT * FROM exact_username
        UNION ALL
        SELECT * FROM exact_name
        UNION ALL
        SELECT * FROM popular_prefix
      ) d
      ORDER BY d.match_tier,
               d.favoritedcount DESC NULLS LAST,
               d.id
      LIMIT %3$s
    ),
    direct_count AS (
      SELECT count(*)::integer AS value
      FROM direct_best
    ),
    fuzzy_best AS MATERIALIZED (
      SELECT p.id,
             p.username,
             p.name,
             p.avatar,
             p.isverified,
             p.favoritedcount,
             4 AS match_tier,
             GREATEST(
               similarity(p.username, %1$L),
               CASE
                 WHEN p.name IS NULL THEN 0.0
                 ELSE similarity(p.name, %1$L)
               END
             ) AS match_score
      FROM public.onlyfans_profiles p
      CROSS JOIN direct_count dc
      -- Short or punctuation-heavy terms produce noisy trigram sets. Keep typo
      -- correction for sufficiently specific input; exact and popular-prefix
      -- suggestions above still handle every query from two characters onward.
      WHERE char_length(regexp_replace(%1$L, '[^[:alnum:]]', '', 'g')) >= 5
        AND dc.value < %3$s
        AND p.username IS NOT NULL
        AND (
          p.username %% %1$L
          OR (p.name IS NOT NULL AND p.name %% %1$L)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM direct_best d
          WHERE d.id = p.id
        )
      ORDER BY match_score DESC,
               p.favoritedcount DESC NULLS LAST,
               p.id
      LIMIT (
        SELECT GREATEST(%3$s - dc.value, 0)
        FROM direct_count dc
      )
    ),
    combined AS (
      SELECT * FROM direct_best
      UNION ALL
      SELECT * FROM fuzzy_best
    )
    SELECT c.id,
           c.username,
           c.name,
           c.avatar,
           c.isverified,
           c.favoritedcount
    FROM combined c
    ORDER BY c.match_tier,
             c.match_score DESC,
             c.favoritedcount DESC NULLS LAST,
             c.id
    LIMIT %3$s
  $query$, v_query, v_pattern, v_limit);
END;
$$;

COMMENT ON FUNCTION public.get_search_creator_suggestions(text, integer) IS
  'Returns at most six narrow creator suggestions: exact username/name, popular prefixes, then typo-tolerant matches for sufficiently specific terms.';

-- Supabase can grant anon/authenticated explicitly through default privileges,
-- so revoke all three rather than relying on PUBLIC alone.
REVOKE ALL ON FUNCTION public.get_search_creator_suggestions(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_creator_suggestions(text, integer)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
