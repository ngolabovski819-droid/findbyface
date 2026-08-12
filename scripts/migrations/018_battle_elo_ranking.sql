-- Migration 018: Battle Elo ranking
-- ======================================================================
-- Battle is a preference vote, not a guessing game. Every vote is valid: the selected
-- creator gains Elo rating and the other creator loses the same amount. Daily remains
-- limited to the shared three rounds; Unlimited remains uncapped.
--
-- This migration is additive and preserves the old `correct` values as historical data,
-- but new votes leave that deprecated column NULL. Run this in the Supabase SQL editor
-- before deploying the matching application code.

BEGIN;

-- Creator rating and player participation counters.
ALTER TABLE performer_vote_stats
  ADD COLUMN IF NOT EXISTS rating NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
  ADD COLUMN IF NOT EXISTS seed_rating NUMERIC(10,2) NOT NULL DEFAULT 1500.00;

ALTER TABLE user_battle_stats
  ADD COLUMN IF NOT EXISTS total_battles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_battles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlimited_battles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_battles_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_battles_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlimited_battles_won INTEGER NOT NULL DEFAULT 0;

-- Keep the old column for audit compatibility, but correctness no longer applies.
ALTER TABLE battle_guesses
  ALTER COLUMN correct DROP NOT NULL;

COMMENT ON COLUMN battle_guesses.correct IS
  'Deprecated pre-Elo verdict. NULL for Elo preference votes.';

ALTER TABLE battle_guesses
  ADD COLUMN IF NOT EXISTS selected_rating_before NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS other_rating_before NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rating_delta NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS battle_won BOOLEAN;

COMMENT ON COLUMN battle_guesses.battle_won IS
  'True when the user selected the higher-rated creator before this Elo vote.';

-- The former frozen answer is no longer needed for new daily rounds. It stays in place so
-- historical rows and older deployments remain readable.
ALTER TABLE daily_battle_rounds
  ALTER COLUMN higher_id DROP NOT NULL;

COMMENT ON COLUMN daily_battle_rounds.higher_id IS
  'Deprecated pre-Elo answer. NULL for rounds created after migration 018.';

-- Rebuild player counters from the append-only vote log. Resetting first makes this safe to
-- re-run and ensures existing users immediately receive their full history.
UPDATE user_battle_stats
SET total_battles = 0,
    daily_battles = 0,
    unlimited_battles = 0,
    total_battles_won = 0,
    daily_battles_won = 0,
    unlimited_battles_won = 0;

UPDATE user_battle_stats s
SET total_battles = totals.total_battles,
    daily_battles = totals.daily_battles,
    unlimited_battles = totals.unlimited_battles
FROM (
  SELECT user_id,
         COUNT(*)::int AS total_battles,
         COUNT(*) FILTER (WHERE mode = 'daily')::int AS daily_battles,
         COUNT(*) FILTER (WHERE mode = 'unlimited')::int AS unlimited_battles
  FROM battle_guesses
  GROUP BY user_id
) totals
WHERE totals.user_id = s.user_id;

-- Seed the top-10K pool from its existing favoritedcount signal before replaying Battle
-- history. Log scaling compresses the very wide popularity range into 1200-1800 Elo while
-- preserving meaningful separation: an early #1-vs-#1000 upset already creates the larger
-- swing expected from a ranked arena. From this point forward, Battle votes move the rating.
UPDATE performer_vote_stats
SET rating = 1500.00,
    seed_rating = 1500.00,
    upvotes = 0,
    total_battles = 0;

WITH pool AS (
  SELECT p.id, p.favoritedcount::numeric AS favorites
  FROM onlyfans_profiles p
  WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
  ORDER BY p.favoritedcount DESC, p.id
  LIMIT 10000
), seeded AS (
  SELECT pool.id,
         ROUND(
           1200.0 + 600.0 *
           (ln(pool.favorites) - min(ln(pool.favorites)) OVER ()) /
           NULLIF(max(ln(pool.favorites)) OVER () - min(ln(pool.favorites)) OVER (), 0),
           2
         ) AS initial_rating
  FROM pool
)
INSERT INTO performer_vote_stats (
  performer_id,
  rating,
  seed_rating,
  upvotes,
  total_battles
)
SELECT seeded.id, seeded.initial_rating, seeded.initial_rating, 0, 0
FROM seeded
ON CONFLICT (performer_id) DO UPDATE
SET rating = EXCLUDED.rating,
    seed_rating = EXCLUDED.seed_rating,
    upvotes = 0,
    total_battles = 0,
    updated_at = now();

-- Replay all existing selections chronologically so the initial creator ranking also
-- includes every vote already cast. The original selection is battle_guesses.guessed_id.

UPDATE battle_guesses
SET selected_rating_before = NULL,
    other_rating_before = NULL,
    rating_delta = NULL,
    battle_won = NULL;

DO $$
DECLARE
  vote_record record;
  selected_id bigint;
  other_id bigint;
  selected_before numeric(10,2);
  other_before numeric(10,2);
  expected_selected numeric;
  elo_delta numeric(8,2);
BEGIN
  FOR vote_record IN
    SELECT id, left_id, right_id, guessed_id
    FROM battle_guesses
    ORDER BY created_at, id
  LOOP
    IF vote_record.guessed_id NOT IN (vote_record.left_id, vote_record.right_id) THEN
      CONTINUE;
    END IF;

    selected_id := vote_record.guessed_id;
    other_id := CASE
      WHEN selected_id = vote_record.left_id THEN vote_record.right_id
      ELSE vote_record.left_id
    END;

    INSERT INTO performer_vote_stats (performer_id)
    VALUES (selected_id), (other_id)
    ON CONFLICT (performer_id) DO NOTHING;

    SELECT rating INTO selected_before
    FROM performer_vote_stats
    WHERE performer_id = selected_id;

    SELECT rating INTO other_before
    FROM performer_vote_stats
    WHERE performer_id = other_id;

    expected_selected := 1.0 / (
      1.0 + power(10::numeric, (other_before - selected_before) / 400.0)
    );
    elo_delta := ROUND((32.0 * (1.0 - expected_selected))::numeric, 2);

    UPDATE performer_vote_stats
    SET rating = rating + elo_delta,
        upvotes = upvotes + 1,
        total_battles = total_battles + 1,
        updated_at = now()
    WHERE performer_id = selected_id;

    UPDATE performer_vote_stats
    SET rating = rating - elo_delta,
        total_battles = total_battles + 1,
        updated_at = now()
    WHERE performer_id = other_id;

    UPDATE battle_guesses
    SET selected_rating_before = selected_before,
        other_rating_before = other_before,
        rating_delta = elo_delta,
        battle_won = selected_before > other_before
    WHERE id = vote_record.id;
  END LOOP;
END;
$$;

-- Now that replay established each vote's pre-vote ratings, backfill the player win record.
-- Exact rating ties are even matchups: they count as battles, but not battles won.
UPDATE user_battle_stats s
SET total_battles_won = totals.total_battles_won,
    daily_battles_won = totals.daily_battles_won,
    unlimited_battles_won = totals.unlimited_battles_won
FROM (
  SELECT user_id,
         COUNT(*) FILTER (WHERE battle_won)::int AS total_battles_won,
         COUNT(*) FILTER (WHERE mode = 'daily' AND battle_won)::int AS daily_battles_won,
         COUNT(*) FILTER (WHERE mode = 'unlimited' AND battle_won)::int AS unlimited_battles_won
  FROM battle_guesses
  GROUP BY user_id
) totals
WHERE totals.user_id = s.user_id;

DROP INDEX IF EXISTS idx_performer_vote_stats_rating;
CREATE INDEX idx_performer_vote_stats_rating
  ON performer_vote_stats (rating DESC);

CREATE INDEX IF NOT EXISTS idx_battle_guesses_daily_leaderboard
  ON battle_guesses (mode, battle_date, user_id);

-- New daily rounds contain only a frozen pair. There is deliberately no frozen answer.
DROP FUNCTION IF EXISTS get_or_create_daily_rounds(date);

CREATE FUNCTION get_or_create_daily_rounds(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  battle_date date,
  round_index smallint,
  left_id bigint,
  left_username text,
  left_name text,
  left_avatar text,
  right_id bigint,
  right_username text,
  right_name text,
  right_avatar text
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM daily_battle_rounds d WHERE d.battle_date = target_date
  ) THEN
    INSERT INTO daily_battle_rounds (battle_date, round_index, left_id, right_id)
    SELECT target_date,
           grouped.round_index,
           grouped.left_id,
           grouped.right_id
    FROM (
      WITH pool AS (
        SELECT id
        FROM onlyfans_profiles
        WHERE avatar IS NOT NULL AND favoritedcount > 0
        ORDER BY favoritedcount DESC, id
        LIMIT 10000
      ), picked AS (
        SELECT six.id, row_number() OVER () AS rn
        FROM (SELECT id FROM pool ORDER BY random() LIMIT 6) six
      )
      SELECT ((rn - 1) / 2 + 1)::smallint AS round_index,
             (array_agg(id ORDER BY rn))[1] AS left_id,
             (array_agg(id ORDER BY rn))[2] AS right_id
      FROM picked
      GROUP BY ((rn - 1) / 2 + 1)
    ) grouped
    ON CONFLICT (battle_date, round_index) DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT d.battle_date,
         d.round_index,
         lp.id,
         lp.username,
         lp.name,
         lp.avatar,
         rp.id,
         rp.username,
         rp.name,
         rp.avatar
  FROM daily_battle_rounds d
  JOIN onlyfans_profiles lp ON lp.id = d.left_id
  JOIN onlyfans_profiles rp ON rp.id = d.right_id
  WHERE d.battle_date = target_date
  ORDER BY d.round_index;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_daily_rounds(date)
  TO anon, authenticated, service_role;

-- Unlimited draws from exactly the same deterministic top-10K eligibility pool. The final
-- random ordering affects only which two eligible creators appear in this matchup.
DROP FUNCTION IF EXISTS get_unlimited_pair();

CREATE FUNCTION get_unlimited_pair()
RETURNS TABLE (id bigint, username text, name text, avatar text)
LANGUAGE sql
AS $$
  WITH pool AS (
    SELECT p.id, p.username, p.name, p.avatar
    FROM onlyfans_profiles p
    WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
    ORDER BY p.favoritedcount DESC, p.id
    LIMIT 10000
  )
  SELECT pool.id, pool.username, pool.name, pool.avatar
  FROM pool
  ORDER BY random()
  LIMIT 2;
$$;

GRANT EXECUTE ON FUNCTION get_unlimited_pair()
  TO anon, authenticated, service_role;

-- Sponsorship may increase how often an eligible creator appears, but it never expands the
-- first-phase pool beyond the top 10,000 profiles by favoritedcount.
DROP FUNCTION IF EXISTS get_eligible_battle_creator(text);

CREATE FUNCTION get_eligible_battle_creator(target_username text)
RETURNS TABLE (id bigint, username text, name text, avatar text)
LANGUAGE sql
STABLE
AS $$
  WITH pool AS (
    SELECT p.id, p.username, p.name, p.avatar
    FROM onlyfans_profiles p
    WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
    ORDER BY p.favoritedcount DESC, p.id
    LIMIT 10000
  )
  SELECT pool.id, pool.username, pool.name, pool.avatar
  FROM pool
  WHERE lower(pool.username) = lower(target_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_eligible_battle_creator(text)
  TO anon, authenticated, service_role;

-- One atomic vote event: validate the pair, calculate standard K=32 Elo, update both
-- creators, append the audit row, and update the player's participation/streak counters.
DROP FUNCTION IF EXISTS submit_guess(uuid, text, bigint, smallint, bigint, bigint, boolean, text);

CREATE FUNCTION submit_guess(
  p_user_id uuid,
  p_mode text,
  p_guessed_id bigint,
  p_round_index smallint DEFAULT NULL,
  p_left_id bigint DEFAULT NULL,
  p_right_id bigint DEFAULT NULL,
  p_sponsored_slot boolean DEFAULT false,
  p_avatar_url text DEFAULT NULL
)
RETURNS TABLE (
  selected_id bigint,
  other_id bigint,
  rating_delta numeric,
  selected_rating numeric,
  other_rating numeric,
  battle_won boolean,
  total_battles int,
  daily_battles int,
  unlimited_battles int,
  total_battles_won int,
  daily_battles_won int,
  unlimited_battles_won int,
  current_streak_days int,
  best_streak_days int,
  votes_this_hour bigint
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_left bigint;
  v_right bigint;
  v_other bigint;
  v_selected_before numeric(10,2);
  v_other_before numeric(10,2);
  v_expected_selected numeric;
  v_delta numeric(8,2);
  v_battle_won boolean;
  v_today date := CURRENT_DATE;
  v_last_played date;
  v_new_streak int;
BEGIN
  IF p_mode NOT IN ('daily', 'unlimited') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  IF p_mode = 'daily' THEN
    IF p_round_index IS NULL THEN
      RAISE EXCEPTION 'round_index required for daily mode';
    END IF;

    SELECT d.left_id, d.right_id
    INTO v_left, v_right
    FROM daily_battle_rounds d
    WHERE d.battle_date = v_today AND d.round_index = p_round_index;

    IF v_left IS NULL OR v_right IS NULL THEN
      RAISE EXCEPTION 'daily round % not found for %', p_round_index, v_today;
    END IF;
  ELSE
    IF p_left_id IS NULL OR p_right_id IS NULL OR p_left_id = p_right_id THEN
      RAISE EXCEPTION 'two distinct creator ids are required for unlimited mode';
    END IF;
    v_left := p_left_id;
    v_right := p_right_id;

    -- Never trust client-echoed ids as proof of pool membership. Both candidates must still
    -- belong to the current top 10,000-by-favoritedcount pool at submission time.
    IF (
      SELECT COUNT(*)
      FROM (
        SELECT p.id
        FROM onlyfans_profiles p
        WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
        ORDER BY p.favoritedcount DESC, p.id
        LIMIT 10000
      ) pool
      WHERE pool.id IN (v_left, v_right)
    ) <> 2 THEN
      RAISE EXCEPTION 'unlimited matchup contains an ineligible creator';
    END IF;
  END IF;

  IF p_guessed_id NOT IN (v_left, v_right) THEN
    RAISE EXCEPTION 'selected creator must be one of the two candidates shown';
  END IF;

  v_other := CASE WHEN p_guessed_id = v_left THEN v_right ELSE v_left END;

  -- Create and lock both creator rows in a deterministic order. This prevents concurrent
  -- matchups involving the same creator from overwriting one another or deadlocking.
  WITH pool AS (
    SELECT p.id, p.favoritedcount::numeric AS favorites
    FROM onlyfans_profiles p
    WHERE p.avatar IS NOT NULL AND p.favoritedcount > 0
    ORDER BY p.favoritedcount DESC, p.id
    LIMIT 10000
  ), seeded AS (
    SELECT pool.id,
           ROUND(
             1200.0 + 600.0 *
             (ln(pool.favorites) - min(ln(pool.favorites)) OVER ()) /
             NULLIF(max(ln(pool.favorites)) OVER () - min(ln(pool.favorites)) OVER (), 0),
             2
           ) AS initial_rating
    FROM pool
  )
  INSERT INTO performer_vote_stats (performer_id, rating, seed_rating)
  SELECT seeded.id, seeded.initial_rating, seeded.initial_rating
  FROM seeded
  WHERE seeded.id IN (v_left, v_right)
  ORDER BY seeded.id
  ON CONFLICT (performer_id) DO UPDATE
  SET rating = CASE
        WHEN performer_vote_stats.total_battles = 0 THEN EXCLUDED.rating
        ELSE performer_vote_stats.rating
      END,
      seed_rating = CASE
        WHEN performer_vote_stats.total_battles = 0 THEN EXCLUDED.seed_rating
        ELSE performer_vote_stats.seed_rating
      END;

  PERFORM 1
  FROM performer_vote_stats
  WHERE performer_id IN (v_left, v_right)
  ORDER BY performer_id
  FOR UPDATE;

  SELECT rating INTO v_selected_before
  FROM performer_vote_stats
  WHERE performer_id = p_guessed_id;

  SELECT rating INTO v_other_before
  FROM performer_vote_stats
  WHERE performer_id = v_other;

  v_expected_selected := 1.0 / (
    1.0 + power(10::numeric, (v_other_before - v_selected_before) / 400.0)
  );
  v_delta := ROUND((32.0 * (1.0 - v_expected_selected))::numeric, 2);
  v_battle_won := v_selected_before > v_other_before;

  INSERT INTO user_battle_stats (user_id, display_name, avatar_url)
  VALUES (
    p_user_id,
    (ARRAY['Sneaky','Bold','Mysterious','Charming','Witty','Fearless','Curious','Gentle',
           'Wild','Clever','Sly','Bright','Quiet','Fierce','Playful','Daring'])[floor(random() * 16 + 1)]
      || ' ' ||
    (ARRAY['Panda','Fox','Tiger','Otter','Wolf','Raven','Falcon','Lynx',
           'Hawk','Panther','Cobra','Phoenix','Badger','Heron','Puma','Orca'])[floor(random() * 16 + 1)]
      || floor(random() * 900 + 100)::text,
    p_avatar_url
  )
  ON CONFLICT (user_id) DO UPDATE
    SET avatar_url = COALESCE(EXCLUDED.avatar_url, user_battle_stats.avatar_url);

  PERFORM 1
  FROM user_battle_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- The daily unique index rejects a replay of the same round. Any error rolls the entire
  -- function back, including both Elo changes.
  INSERT INTO battle_guesses (
    user_id,
    mode,
    battle_date,
    round_index,
    left_id,
    right_id,
    guessed_id,
    correct,
    sponsored_slot,
    selected_rating_before,
    other_rating_before,
    rating_delta,
    battle_won
  ) VALUES (
    p_user_id,
    p_mode,
    CASE WHEN p_mode = 'daily' THEN v_today ELSE NULL END,
    CASE WHEN p_mode = 'daily' THEN p_round_index ELSE NULL END,
    v_left,
    v_right,
    p_guessed_id,
    NULL,
    p_sponsored_slot,
    v_selected_before,
    v_other_before,
    v_delta,
    v_battle_won
  );

  UPDATE performer_vote_stats
  SET rating = rating + v_delta,
      upvotes = upvotes + 1,
      total_battles = total_battles + 1,
      updated_at = now()
  WHERE performer_id = p_guessed_id;

  UPDATE performer_vote_stats
  SET rating = rating - v_delta,
      total_battles = total_battles + 1,
      updated_at = now()
  WHERE performer_id = v_other;

  IF p_mode = 'daily' THEN
    SELECT s.last_daily_played_on, s.current_streak_days
    INTO v_last_played, v_new_streak
    FROM user_battle_stats s
    WHERE s.user_id = p_user_id;

    v_new_streak := CASE
      WHEN v_last_played = v_today THEN v_new_streak
      WHEN v_last_played = v_today - 1 THEN v_new_streak + 1
      ELSE 1
    END;

    UPDATE user_battle_stats
    SET total_battles = total_battles + 1,
        daily_battles = daily_battles + 1,
        total_battles_won = total_battles_won + CASE WHEN v_battle_won THEN 1 ELSE 0 END,
        daily_battles_won = daily_battles_won + CASE WHEN v_battle_won THEN 1 ELSE 0 END,
        current_streak_days = v_new_streak,
        best_streak_days = GREATEST(best_streak_days, v_new_streak),
        last_daily_played_on = v_today,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_battle_stats
    SET total_battles = total_battles + 1,
        unlimited_battles = unlimited_battles + 1,
        total_battles_won = total_battles_won + CASE WHEN v_battle_won THEN 1 ELSE 0 END,
        unlimited_battles_won = unlimited_battles_won + CASE WHEN v_battle_won THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT p_guessed_id,
         v_other,
         v_delta,
         v_selected_before + v_delta,
         v_other_before - v_delta,
         v_battle_won,
         s.total_battles,
         s.daily_battles,
         s.unlimited_battles,
         s.total_battles_won,
         s.daily_battles_won,
         s.unlimited_battles_won,
         s.current_streak_days,
         s.best_streak_days,
         (SELECT COUNT(*) FROM battle_guesses g WHERE g.created_at >= now() - interval '1 hour')
  FROM user_battle_stats s
  WHERE s.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_guess(uuid, text, bigint, smallint, bigint, bigint, boolean, text)
  TO anon, authenticated, service_role;

-- Player boards rank prediction records: a battle is won when the user selected the
-- higher-rated creator before the vote. Daily covers today's shared three-vote puzzle;
-- Unlimited covers the lifetime uncapped mode.
DROP FUNCTION IF EXISTS get_battle_player_leaderboard(text, date, int);

CREATE FUNCTION get_battle_player_leaderboard(
  board_mode text,
  target_date date DEFAULT CURRENT_DATE,
  limit_count int DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  battles_played int,
  battles_won int,
  win_rate_percent numeric,
  current_streak_days int,
  best_streak_days int
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
  IF board_mode = 'daily' THEN
    RETURN QUERY
    SELECT g.user_id,
           s.display_name,
           s.avatar_url,
           COUNT(*)::int AS battles_played,
           COUNT(*) FILTER (WHERE g.battle_won)::int AS battles_won,
           ROUND(
             100.0 * COUNT(*) FILTER (WHERE g.battle_won) / NULLIF(COUNT(*), 0),
             1
           ) AS win_rate_percent,
           s.current_streak_days,
           s.best_streak_days
    FROM battle_guesses g
    JOIN user_battle_stats s ON s.user_id = g.user_id
    WHERE g.mode = 'daily' AND g.battle_date = target_date
    GROUP BY g.user_id, s.display_name, s.avatar_url,
             s.current_streak_days, s.best_streak_days
    ORDER BY battles_won DESC, battles_played DESC, s.current_streak_days DESC, g.user_id
    LIMIT LEAST(GREATEST(limit_count, 1), 100);
  ELSIF board_mode = 'unlimited' THEN
    RETURN QUERY
    SELECT s.user_id,
           s.display_name,
           s.avatar_url,
           s.unlimited_battles,
           s.unlimited_battles_won,
           ROUND(100.0 * s.unlimited_battles_won / NULLIF(s.unlimited_battles, 0), 1),
           s.current_streak_days,
           s.best_streak_days
    FROM user_battle_stats s
    WHERE s.unlimited_battles > 0
    ORDER BY s.unlimited_battles_won DESC,
             s.unlimited_battles DESC,
             s.current_streak_days DESC,
             s.user_id
    LIMIT LEAST(GREATEST(limit_count, 1), 100);
  ELSE
    RAISE EXCEPTION 'invalid leaderboard mode: %', board_mode;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_battle_player_leaderboard(text, date, int)
  TO anon, authenticated, service_role;

-- The creator board is the real competitive ranking: Elo first, then record/exposure as
-- context and deterministic tie-breakers.
DROP FUNCTION IF EXISTS get_creator_battle_leaderboard(int);

CREATE FUNCTION get_creator_battle_leaderboard(limit_count int DEFAULT 50)
RETURNS TABLE (
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
  )
  SELECT p.id,
         p.username,
         p.name,
         p.avatar,
         s.rating,
         s.upvotes,
         s.total_battles,
         (s.total_battles - s.upvotes)::int AS losses,
         ROUND(100.0 * s.upvotes / NULLIF(s.total_battles, 0), 1) AS win_rate_percent
  FROM performer_vote_stats s
  JOIN pool p ON p.id = s.performer_id
  ORDER BY s.rating DESC,
           s.upvotes DESC,
           s.total_battles DESC,
           p.id
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION get_creator_battle_leaderboard(int)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
