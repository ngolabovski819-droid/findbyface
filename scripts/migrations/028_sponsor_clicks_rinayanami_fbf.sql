-- Click log for the rinayanami paid placement campaign (onboarded 2026-08-26).
-- Copied from the 007 template, but including the columns migrations 013-015 later
-- added to every sponsor_clicks_* table — a fresh table should start with the full
-- current schema instead of waiting for someone to notice /go/ inserts are failing.
-- Same shared Supabase project as every prior click migration — run once in the SQL Editor.

CREATE TABLE IF NOT EXISTS sponsor_clicks_rinayanami_fbf (
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

COMMENT ON TABLE sponsor_clicks_rinayanami_fbf IS
  'findbyface click log for the rinayanami paid placement campaign. One row per non-bot click through /go/rinayanami.';
