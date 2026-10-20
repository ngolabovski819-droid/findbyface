-- Click log for the zoeprvx placement (onboarded 2026-10-20).
-- Full current schema, copied from 030_sponsor_clicks_sarahwylde_vietnami_aussiesunlocked_fbf.sql.
-- Confirmed 2026-10-20 the name was free (REST 404).
-- Same shared Supabase project as every prior click migration — run once in the SQL Editor.

CREATE TABLE IF NOT EXISTS sponsor_clicks_zoeprvx_fbf (
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

COMMENT ON TABLE sponsor_clicks_zoeprvx_fbf IS
  'findbyface click log for the zoeprvx paid placement campaign. One row per non-bot click through /go/zoeprvx.';
