-- Persistent Battle nicknames and reliable built-in player avatars.

BEGIN;

-- Replace missing or third-party avatar URLs with one of eight deterministic local avatars.
-- Player-selected avatars use the same allowlisted URL format.
UPDATE user_battle_stats
SET avatar_url = '/api/player-avatar?style=' ||
  ((get_byte(decode(replace(user_id::text, '-', ''), 'hex'), 0) % 8) + 1)::text
WHERE avatar_url IS NULL
   OR avatar_url !~ '^/api/player-avatar\?style=[1-8]$';

-- Nicknames are player identities on both Daily and Unlimited boards.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_battle_stats_display_name_ci
  ON user_battle_stats (lower(display_name))
  WHERE display_name IS NOT NULL;

DROP FUNCTION IF EXISTS update_battle_player_profile(uuid, text, int);

CREATE FUNCTION update_battle_player_profile(
  p_user_id uuid,
  p_display_name text,
  p_avatar_style int
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_display_name text := regexp_replace(btrim(p_display_name), '\s+', ' ', 'g');
  v_avatar_url text;
BEGIN
  IF char_length(v_display_name) < 3 OR char_length(v_display_name) > 24 THEN
    RAISE EXCEPTION 'nickname must contain between 3 and 24 characters';
  END IF;
  IF v_display_name ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'nickname contains unsupported characters';
  END IF;
  IF p_avatar_style < 1 OR p_avatar_style > 8 THEN
    RAISE EXCEPTION 'avatar style must be between 1 and 8';
  END IF;

  v_avatar_url := '/api/player-avatar?style=' || p_avatar_style::text;

  INSERT INTO user_battle_stats (user_id, display_name, avatar_url)
  VALUES (p_user_id, v_display_name, v_avatar_url)
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now();

  RETURN QUERY
  SELECT s.user_id, s.display_name, s.avatar_url
  FROM user_battle_stats s
  WHERE s.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION update_battle_player_profile(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_battle_player_profile(uuid, text, int) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
