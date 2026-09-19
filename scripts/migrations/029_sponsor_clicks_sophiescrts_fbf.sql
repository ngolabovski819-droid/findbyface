-- Click log for the sophiescrts face-search placement (onboarded 2026-09-19).
-- Full current schema, copied from 028_sponsor_clicks_rinayanami_fbf.sql.
-- Confirmed 2026-09-19 the name was free (REST 404). NOT sponsor_clicks_sophiescrts — that one
-- exists and is fanspedia.net's live table.
-- Same shared Supabase project as every prior click migration — run once in the SQL Editor.

CREATE TABLE IF NOT EXISTS sponsor_clicks_sophiescrts_fbf (
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

COMMENT ON TABLE sponsor_clicks_sophiescrts_fbf IS
  'findbyface click log for the sophiescrts paid placement campaign. One row per non-bot click through /go/sophiescrts.';
