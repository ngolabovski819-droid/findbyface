-- Adds botid_flagged to every sponsor_clicks_* table across the whole network. Same shared
-- Supabase project as 013/014 — run once, copied into each site's own migrations folder for
-- that repo's history. Safe to re-run.
--
-- botid_flagged: the Vercel BotID verdict (src/pages/api/click-token.ts) captured when the
-- click-verification token was minted, carried inside the token itself (src/lib/clickToken.ts)
-- so it survives to the click and lands here. true = BotID classified that browser session as
-- automated; false = checked and cleared; null = no valid token on the click at all (BotID
-- never got a chance to run — a missing signal, not a "not a bot" result). Independent of
-- link_verified: a click can be a provably-real page render AND BotID-flagged at the same
-- time (e.g. a real browser exhibiting bot-like signals), or either alone. Reporting only, not
-- wired into any block/skip decision — same rollout posture as link_verified/is_datacenter_ip.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sponsor_clicks_emilylopz_fbf', 'sponsor_clicks_rocketreynaxo_fbf', 'sponsor_clicks_hannazuki_fbf',
    'sponsor_clicks_emilylopz', 'sponsor_clicks_rocketreynaxo', 'sponsor_clicks_hannazuki',
    'sponsor_clicks_emilylopz_oaf', 'sponsor_clicks_rocketreynaxo_oaf', 'sponsor_clicks_hannazuki_oaf',
    'sponsor_clicks_oaussief_emilylopz', 'sponsor_clicks_oaussief_rocketreynaxo', 'sponsor_clicks_oaussief_hannazuki'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS botid_flagged boolean', t);
    END IF;
  END LOOP;
END $$;
