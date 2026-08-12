-- Return exact live leaderboard positions for the two creators in a completed Battle.
-- The ordering intentionally matches get_creator_battle_leaderboard from migration 019.

BEGIN;

DROP FUNCTION IF EXISTS get_creator_battle_positions(bigint[]);

CREATE FUNCTION get_creator_battle_positions(performer_ids bigint[])
RETURNS TABLE (
  performer_id bigint,
  rank_position bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH pool AS (
    SELECT p.id
    FROM onlyfans_profiles p
    WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
    ORDER BY p.favoritedcount DESC, p.id
    LIMIT 10000
  ), ranked AS (
    SELECT s.performer_id,
           ROW_NUMBER() OVER (
             ORDER BY s.rating DESC,
                      s.upvotes DESC,
                      s.total_battles DESC,
                      s.performer_id
           ) AS rank_position
    FROM performer_vote_stats s
    JOIN pool p ON p.id = s.performer_id
  )
  SELECT r.performer_id, r.rank_position
  FROM ranked r
  WHERE r.performer_id = ANY(COALESCE(performer_ids, ARRAY[]::bigint[]))
  ORDER BY r.rank_position;
$$;

GRANT EXECUTE ON FUNCTION get_creator_battle_positions(bigint[])
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
