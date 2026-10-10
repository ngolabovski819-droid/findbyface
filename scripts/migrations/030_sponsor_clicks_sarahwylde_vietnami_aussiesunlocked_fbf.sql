-- Click logs for the sarahwylde, vietnami and aussiesunlocked placements (onboarded 2026-10-10).
-- Full current schema, copied from 029_sponsor_clicks_sophiescrts_fbf.sql.
-- Confirmed 2026-10-10 all three names were free (REST 404).
-- Same shared Supabase project as every prior click migration — run once in the SQL Editor.

CREATE TABLE IF NOT EXISTS sponsor_clicks_sarahwylde_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT,
  ip_hash TEXT,
  is_datacenter_ip BOOLEAN,
  link_verified BOOLEAN,
  botid_flagged BOOLEAN,
  ip_address TEXT,
  country TEXT,
  city TEXT
);

COMMENT ON TABLE sponsor_clicks_sarahwylde_fbf IS
  'findbyface click log for the sarahwylde paid placement campaign. One row per non-bot click through /go/sarahwylde.';

CREATE TABLE IF NOT EXISTS sponsor_clicks_vietnami_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT,
  ip_hash TEXT,
  is_datacenter_ip BOOLEAN,
  link_verified BOOLEAN,
  botid_flagged BOOLEAN,
  ip_address TEXT,
  country TEXT,
  city TEXT
);

COMMENT ON TABLE sponsor_clicks_vietnami_fbf IS
  'findbyface click log for the vietnami paid placement campaign. One row per non-bot click through /go/vietnami.';

CREATE TABLE IF NOT EXISTS sponsor_clicks_aussiesunlocked_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT,
  ip_hash TEXT,
  is_datacenter_ip BOOLEAN,
  link_verified BOOLEAN,
  botid_flagged BOOLEAN,
  ip_address TEXT,
  country TEXT,
  city TEXT
);

COMMENT ON TABLE sponsor_clicks_aussiesunlocked_fbf IS
  'findbyface click log for the aussiesunlocked paid placement campaign. One row per non-bot click through /go/aussiesunlocked.';
