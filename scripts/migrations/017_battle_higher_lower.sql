-- Migration 017: Battle — crowd-vote rating game
-- =======================================================================
-- Two creators, player picks who's more beautiful. The "correct" answer isn't a database
-- column — it's whichever side currently has more upvotes from OTHER players
-- (performer_vote_stats), and every guess is itself a vote that adds to that tally. So the
-- game is guessing the crowd's current consensus, and playing simultaneously builds that
-- consensus for the next player. favoritedcount is only used to pick the eligible pool (top
-- 10,000 by favoritedcount — "our top creators"), never as the thing being guessed.
--
-- Two modes:
--   daily      — same 3 pairs for every player, deterministic per calendar date (Wordle-
--                style: comparable scores, shareable "3/3" result). 10 pts/correct.
--   unlimited  — sudden-death run against random pairs, ends on first miss. 1 pt/correct.
-- Both feed one lifetime total_points number that drives the all-time user leaderboard;
-- daily is weighted 10x so a bounded, fair, once-a-day puzzle can't be drowned out by
-- someone grinding unlimited mode all afternoon.
--
-- Run in Supabase SQL editor.

-- ── indexes on the shared table ─────────────────────────────────────────
-- Additive only — safe for fanspedia and other sites sharing onlyfans_profiles, doesn't
-- change any existing query's results. Needed so "top 10k by favoritedcount" is an index
-- scan, not a full-table sort, on every pair request.
CREATE INDEX IF NOT EXISTS idx_onlyfans_profiles_favoritedcount
  ON onlyfans_profiles (favoritedcount DESC)
  WHERE avatar IS NOT NULL AND favoritedcount IS NOT NULL;

-- ── daily_battle_rounds ─────────────────────────────────────────────────
-- The day's 3 pairs, generated once and frozen — including higher_id, the correct answer.
-- Freezing it at generation time (rather than comparing live favoritedcount at guess time)
-- matters: favoritedcount can drift during the day, and two players answering the same
-- round at different times must get the same verdict for the puzzle to be a fair, shared,
-- shareable "everyone played the same thing" experience.
CREATE TABLE IF NOT EXISTS daily_battle_rounds (
  battle_date DATE NOT NULL,
  round_index SMALLINT NOT NULL CHECK (round_index BETWEEN 1 AND 3),
  left_id     BIGINT NOT NULL REFERENCES onlyfans_profiles(id),
  right_id    BIGINT NOT NULL REFERENCES onlyfans_profiles(id),
  higher_id   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_date, round_index)
);

-- ── performer_vote_stats ────────────────────────────────────────────────
-- The crowd's opinion, built entirely from play. One row per performer who's appeared in at
-- least one battle (created lazily, same as user_battle_stats). upvotes is how many times
-- they were picked; total_battles is how many times they were shown at all — kept mainly for
-- future exposure-fairness weighting, not used in the correctness check today.
CREATE TABLE IF NOT EXISTS performer_vote_stats (
  performer_id  BIGINT PRIMARY KEY REFERENCES onlyfans_profiles(id) ON DELETE CASCADE,
  upvotes       INTEGER NOT NULL DEFAULT 0,
  total_battles INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performer_vote_stats_upvotes
  ON performer_vote_stats (upvotes DESC);

-- ── user_battle_stats ───────────────────────────────────────────────────
-- One row per signed-in player. user_id is a real Supabase auth.users id, verified
-- server-side per request (src/lib/verifyUser.ts) — never trusted from the client, or
-- anyone could POST guesses "as" the current leaderboard leader.
-- display_name/avatar_url are denormalized from the Google OAuth profile (same fields
-- api/auth/session.ts already exposes to the client) rather than joined from auth.users at
-- read time — PostgREST only exposes the public schema, so a leaderboard page has no other
-- way to show who a row belongs to. Refreshed on every guess (see submit_guess) so a
-- changed Google name/photo doesn't go stale.
CREATE TABLE IF NOT EXISTS user_battle_stats (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT,
  avatar_url           TEXT,
  total_points         INTEGER NOT NULL DEFAULT 0,
  daily_points         INTEGER NOT NULL DEFAULT 0,
  unlimited_points     INTEGER NOT NULL DEFAULT 0,
  current_run          INTEGER NOT NULL DEFAULT 0,  -- active unlimited sudden-death streak
  best_run             INTEGER NOT NULL DEFAULT 0,
  current_streak_days  INTEGER NOT NULL DEFAULT 0,  -- consecutive calendar days daily mode was played
  best_streak_days     INTEGER NOT NULL DEFAULT 0,
  last_daily_played_on DATE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_battle_stats_total_points
  ON user_battle_stats (total_points DESC);

-- ── battle_guesses ──────────────────────────────────────────────────────
-- Append-only log of every guess, both modes. Doubles as: (1) the mechanism that blocks
-- replaying an already-answered daily round (unique index below — enforced in the
-- database, not just client-side UI discipline), (2) an audit trail if a score is ever
-- disputed, (3) raw material for a future "most underrated creator" leaderboard (creators
-- who get guessed as lower more than their real rank would suggest).
CREATE TABLE IF NOT EXISTS battle_guesses (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL CHECK (mode IN ('daily', 'unlimited')),
  battle_date     DATE,        -- set only for mode='daily'
  round_index     SMALLINT,    -- set only for mode='daily'
  left_id         BIGINT NOT NULL REFERENCES onlyfans_profiles(id),
  right_id        BIGINT NOT NULL REFERENCES onlyfans_profiles(id),
  guessed_id      BIGINT NOT NULL,
  correct         BOOLEAN NOT NULL,
  sponsored_slot  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocks a user from answering the same daily round twice — the actual server-side
-- enforcement of "3 casts per day," not just a UI convention.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily_guess_per_round
  ON battle_guesses (user_id, battle_date, round_index)
  WHERE mode = 'daily';

CREATE INDEX IF NOT EXISTS idx_battle_guesses_user_created
  ON battle_guesses (user_id, created_at);

-- ── get_or_create_daily_rounds RPC ──────────────────────────────────────
-- Returns today's 3 pairs (id/username/name/avatar only — never higher_id or upvote counts,
-- or the client could just read the answer out of the response). Generates them on the
-- first call of the day; every later call that day just reads what's already there. Two
-- concurrent "first call of the day" requests are safe: both may attempt the insert, but the
-- (battle_date, round_index) primary key + ON CONFLICT DO NOTHING means only one
-- generation's rows for a given round_index actually stick — no duplicates, no corruption,
-- and whichever commits first defines that round for the whole day.
--
-- higher_id is frozen against upvotes AS OF GENERATION TIME (LEFT JOIN performer_vote_stats,
-- COALESCE to 0 for anyone with no votes yet). Freezing matters here even more than it would
-- for a static column: upvotes are being changed continuously by other players' guesses (see
-- submit_guess), so without freezing, two players answering the same round minutes apart
-- could get different verdicts — breaking the "everyone played the same puzzle" premise the
-- whole daily/shareable mechanic depends on.
DROP FUNCTION IF EXISTS get_or_create_daily_rounds(date);

CREATE OR REPLACE FUNCTION get_or_create_daily_rounds(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  battle_date date,
  round_index smallint,
  left_id     bigint, left_username text, left_name text, left_avatar text,
  right_id    bigint, right_username text, right_name text, right_avatar text
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  -- Draw 6 distinct rows ONCE and split them into 3 pairs, rather than running the random
  -- pick 3 separate times. A CROSS JOIN LATERAL per round_index looks like it should force 3
  -- independent draws, but since the subquery never actually references the outer row, the
  -- planner is free to (and did, in testing) evaluate it once and reuse the same result for
  -- all 3 rounds — every "daily round" ended up an identical matchup. Drawing all 6 in one
  -- query sidesteps that ambiguity entirely instead of relying on planner behavior.
  IF NOT EXISTS (SELECT 1 FROM daily_battle_rounds d WHERE d.battle_date = target_date) THEN
    INSERT INTO daily_battle_rounds (battle_date, round_index, left_id, right_id, higher_id)
    SELECT target_date, grouped.round_index, grouped.left_id, grouped.right_id,
           CASE WHEN grouped.left_uv > grouped.right_uv THEN grouped.left_id ELSE grouped.right_id END
    FROM (
      WITH pool AS (
        SELECT id
        FROM onlyfans_profiles
        WHERE avatar IS NOT NULL AND favoritedcount IS NOT NULL
        ORDER BY favoritedcount DESC
        LIMIT 10000
      ), picked AS (
        SELECT six.id, COALESCE(v.upvotes, 0) AS upvotes, row_number() OVER () AS rn
        FROM (SELECT id FROM pool ORDER BY random() LIMIT 6) six
        LEFT JOIN performer_vote_stats v ON v.performer_id = six.id
      )
      SELECT ((rn - 1) / 2 + 1)::smallint AS round_index,
             (array_agg(id ORDER BY rn))[1] AS left_id, (array_agg(upvotes ORDER BY rn))[1] AS left_uv,
             (array_agg(id ORDER BY rn))[2] AS right_id, (array_agg(upvotes ORDER BY rn))[2] AS right_uv
      FROM picked
      GROUP BY ((rn - 1) / 2 + 1)
    ) AS grouped
    ON CONFLICT (battle_date, round_index) DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT d.battle_date, d.round_index,
         lp.id, lp.username, lp.name, lp.avatar,
         rp.id, rp.username, rp.name, rp.avatar
  FROM daily_battle_rounds d
  JOIN onlyfans_profiles lp ON lp.id = d.left_id
  JOIN onlyfans_profiles rp ON rp.id = d.right_id
  WHERE d.battle_date = target_date
  ORDER BY d.round_index;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_daily_rounds(date) TO anon, authenticated, service_role;

-- ── get_unlimited_pair RPC ──────────────────────────────────────────────
-- Random pair from the same top-10k-by-favoritedcount eligibility pool — favoritedcount is
-- only ever used here to pick who's allowed to appear, never as what's compared. Doesn't
-- need to touch performer_vote_stats at all: unlimited mode's correctness check reads live
-- upvotes at guess time (submit_guess), not at pair-fetch time — same "never leak the
-- answer" rule as before, just now the answer is upvotes instead of favoritedcount.
DROP FUNCTION IF EXISTS get_unlimited_pair();

CREATE OR REPLACE FUNCTION get_unlimited_pair()
RETURNS TABLE (id bigint, username text, name text, avatar text)
LANGUAGE sql
STABLE
AS $$
  WITH pool AS (
    SELECT id, username, name, avatar
    FROM onlyfans_profiles
    WHERE avatar IS NOT NULL AND favoritedcount IS NOT NULL
    ORDER BY favoritedcount DESC
    LIMIT 10000
  )
  SELECT id, username, name, avatar FROM pool ORDER BY random() LIMIT 2;
$$;

GRANT EXECUTE ON FUNCTION get_unlimited_pair() TO anon, authenticated, service_role;

-- ── submit_guess RPC ─────────────────────────────────────────────────────
-- Atomically: looks up the correct answer (frozen higher_id for daily, live upvotes
-- comparison for unlimited — fine to be live there since it's a personal, not shared,
-- round), registers the guess itself as a real vote (whichever side the player picked gets
-- +1 upvote in performer_vote_stats — this is how the crowd consensus that daily rounds
-- freeze against actually gets built), logs the guess (the unique index above rejects a
-- daily replay by raising unique_violation, which the API layer maps to a friendly "already
-- answered" response instead of a generic 500), and updates points/streak/run.
--
-- Locks the caller's own stats row with FOR UPDATE before reading it, so two guesses
-- landing in the same instant (e.g. a double-click) can't both read the same "before"
-- state and drop an update — no cross-user lock ordering issue here since only one row
-- (the caller's own) is ever locked per call. The performer_vote_stats increments don't need
-- the same treatment: each is a single atomic UPDATE (via ON CONFLICT), so there's no
-- separate read-then-write step that could race.
DROP FUNCTION IF EXISTS submit_guess(uuid, text, smallint, bigint, bigint, bigint, boolean);
DROP FUNCTION IF EXISTS submit_guess(uuid, text, smallint, bigint, bigint, bigint, boolean, text, text);
DROP FUNCTION IF EXISTS submit_guess(uuid, text, bigint, smallint, bigint, bigint, boolean, text, text);
DROP FUNCTION IF EXISTS submit_guess(uuid, text, bigint, smallint, bigint, bigint, boolean, text);

-- Postgres requires every parameter after the first one with a DEFAULT to also have a
-- DEFAULT, so the three required params (user/mode/guess) come first, defaulted ones after
-- — PostgREST calls this by name (JSON keys), so the order here doesn't affect callers.
-- No p_display_name parameter — display_name is generated server-side, once, the first time
-- a player's row is created (see the INSERT below), never taken from the client. A public
-- leaderboard showing someone's real Google name/email is a privacy leak waiting to happen;
-- a stable, anonymous "Adjective Animal###" handle (Reddit-style) avoids that entirely.
CREATE OR REPLACE FUNCTION submit_guess(
  p_user_id        uuid,
  p_mode           text,
  p_guessed_id     bigint,
  p_round_index    smallint DEFAULT NULL,  -- required for mode='daily'
  p_left_id        bigint DEFAULT NULL,    -- required for mode='unlimited' (echoes the pair shown)
  p_right_id       bigint DEFAULT NULL,
  p_sponsored_slot boolean DEFAULT false,
  p_avatar_url     text DEFAULT NULL
)
RETURNS TABLE (
  correct boolean, correct_id bigint,
  total_points int, daily_points int, unlimited_points int,
  current_run int, best_run int,
  current_streak_days int, best_streak_days int
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_left bigint;
  v_right bigint;
  v_higher bigint;
  v_correct boolean;
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
    SELECT left_id, right_id, higher_id INTO v_left, v_right, v_higher
      FROM daily_battle_rounds WHERE battle_date = v_today AND round_index = p_round_index;
    IF v_higher IS NULL THEN
      RAISE EXCEPTION 'daily round % not found for %', p_round_index, v_today;
    END IF;
  ELSE
    IF p_left_id IS NULL OR p_right_id IS NULL THEN
      RAISE EXCEPTION 'left_id/right_id required for unlimited mode';
    END IF;
    v_left := p_left_id;
    v_right := p_right_id;
    SELECT p.id INTO v_higher FROM onlyfans_profiles p
      LEFT JOIN performer_vote_stats v ON v.performer_id = p.id
      WHERE p.id IN (p_left_id, p_right_id)
      ORDER BY COALESCE(v.upvotes, 0) DESC LIMIT 1;
  END IF;

  IF p_guessed_id NOT IN (v_left, v_right) THEN
    RAISE EXCEPTION 'guessed_id must be one of the two candidates shown';
  END IF;

  v_correct := (p_guessed_id = v_higher);

  -- The guess itself is a vote: the picked side gets +1 upvote, both sides count as having
  -- appeared in one more battle. Deliberately after the correctness check above, so a guess
  -- never influences whether it was itself correct.
  INSERT INTO performer_vote_stats (performer_id, upvotes, total_battles)
    VALUES (p_guessed_id, 1, 1)
    ON CONFLICT (performer_id) DO UPDATE
      SET upvotes = performer_vote_stats.upvotes + 1,
          total_battles = performer_vote_stats.total_battles + 1,
          updated_at = now();
  INSERT INTO performer_vote_stats (performer_id, total_battles)
    VALUES (CASE WHEN p_guessed_id = v_left THEN v_right ELSE v_left END, 1)
    ON CONFLICT (performer_id) DO UPDATE
      SET total_battles = performer_vote_stats.total_battles + 1,
          updated_at = now();

  -- display_name is only ever set here, on first insert — deliberately absent from the
  -- ON CONFLICT SET below, so it can never be overwritten by a later guess. avatar_url still
  -- refreshes each time (a changed Google photo shouldn't go stale), that's a much weaker
  -- privacy signal than a name and the user already asked specifically about names.
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
  PERFORM 1 FROM user_battle_stats WHERE user_id = p_user_id FOR UPDATE;

  IF p_mode = 'daily' THEN
    -- Raises unique_violation on a replay attempt, rolling back before any points are
    -- touched. That's intentional — let it propagate.
    INSERT INTO battle_guesses (user_id, mode, battle_date, round_index, left_id, right_id, guessed_id, correct, sponsored_slot)
      VALUES (p_user_id, 'daily', v_today, p_round_index, v_left, v_right, p_guessed_id, v_correct, p_sponsored_slot);

    SELECT last_daily_played_on, current_streak_days INTO v_last_played, v_new_streak
      FROM user_battle_stats WHERE user_id = p_user_id;

    v_new_streak := CASE
      WHEN v_last_played = v_today THEN v_new_streak            -- 2nd/3rd round of the same day
      WHEN v_last_played = v_today - 1 THEN v_new_streak + 1     -- consecutive day
      ELSE 1                                                     -- gap, or first time ever
    END;

    UPDATE user_battle_stats SET
      total_points = total_points + CASE WHEN v_correct THEN 10 ELSE 0 END,
      daily_points = daily_points + CASE WHEN v_correct THEN 10 ELSE 0 END,
      current_streak_days = v_new_streak,
      best_streak_days = GREATEST(best_streak_days, v_new_streak),
      last_daily_played_on = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO battle_guesses (user_id, mode, left_id, right_id, guessed_id, correct, sponsored_slot)
      VALUES (p_user_id, 'unlimited', v_left, v_right, p_guessed_id, v_correct, p_sponsored_slot);

    UPDATE user_battle_stats SET
      total_points = total_points + CASE WHEN v_correct THEN 1 ELSE 0 END,
      unlimited_points = unlimited_points + CASE WHEN v_correct THEN 1 ELSE 0 END,
      current_run = CASE WHEN v_correct THEN current_run + 1 ELSE 0 END,
      best_run = GREATEST(best_run, CASE WHEN v_correct THEN current_run + 1 ELSE current_run END),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT v_correct, v_higher, s.total_points, s.daily_points, s.unlimited_points,
         s.current_run, s.best_run, s.current_streak_days, s.best_streak_days
  FROM user_battle_stats s WHERE s.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_guess(uuid, text, bigint, smallint, bigint, bigint, boolean, text)
  TO anon, authenticated, service_role;

-- ── get_daily_leaderboard RPC ────────────────────────────────────────────
-- "Today" user leaderboard: only counts today's daily-mode correct guesses, never
-- unlimited-mode grinding — the whole point of a bounded, once-a-day, shared-seed puzzle is
-- that it's a fair comparison, and folding in unbounded unlimited-mode play would erase
-- that. The all-time board (ORDER BY total_points DESC on user_battle_stats, queried
-- directly — no RPC needed) is where unlimited grinding is meant to matter.
DROP FUNCTION IF EXISTS get_daily_leaderboard(date, int);

CREATE OR REPLACE FUNCTION get_daily_leaderboard(target_date date DEFAULT CURRENT_DATE, limit_count int DEFAULT 50)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, correct_count int, points int)
LANGUAGE sql
STABLE
AS $$
  SELECT g.user_id, s.display_name, s.avatar_url,
         COUNT(*) FILTER (WHERE g.correct)::int AS correct_count,
         (COUNT(*) FILTER (WHERE g.correct) * 10)::int AS points
  FROM battle_guesses g
  JOIN user_battle_stats s ON s.user_id = g.user_id
  WHERE g.mode = 'daily' AND g.battle_date = target_date
  GROUP BY g.user_id, s.display_name, s.avatar_url
  ORDER BY points DESC, correct_count DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_daily_leaderboard(date, int) TO anon, authenticated, service_role;
