-- Infinite-scroll pagination for the top-10K creator Elo leaderboard.
-- Rank is calculated before OFFSET/LIMIT so every page carries its true global position.

BEGIN;

DROP FUNCTION IF EXISTS get_creator_battle_leaderboard(int);
DROP FUNCTION IF EXISTS get_creator_battle_leaderboard(int, int);

CREATE FUNCTION get_creator_battle_leaderboard(
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  rank_position bigint,
  performer_id bigint,
  username text,
  display_name text,
  avatar_url text,
  rating numeric,
  votes_received int,
  appearances int,
  losses int,
  win_rate_percent numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH pool AS (
    SELECT p.id, p.username, p.name, p.avatar
    FROM onlyfans_profiles p
    WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
    ORDER BY p.favoritedcount DESC, p.id
    LIMIT 10000
  ), ranked AS (
    SELECT ROW_NUMBER() OVER (
             ORDER BY s.rating DESC,
                      s.upvotes DESC,
                      s.total_battles DESC,
                      p.id
           ) AS rank_position,
           p.id AS performer_id,
           p.username,
           p.name AS display_name,
           p.avatar AS avatar_url,
           s.rating,
           s.upvotes AS votes_received,
           s.total_battles AS appearances,
           (s.total_battles - s.upvotes)::int AS losses,
           ROUND(100.0 * s.upvotes / NULLIF(s.total_battles, 0), 1) AS win_rate_percent
    FROM performer_vote_stats s
    JOIN pool p ON p.id = s.performer_id
  )
  SELECT r.rank_position,
         r.performer_id,
         r.username,
         r.display_name,
         r.avatar_url,
         r.rating,
         r.votes_received,
         r.appearances,
         r.losses,
         r.win_rate_percent
  FROM ranked r
  ORDER BY r.rank_position
  OFFSET LEAST(GREATEST(offset_count, 0), 10000)
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION get_creator_battle_leaderboard(int, int)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
