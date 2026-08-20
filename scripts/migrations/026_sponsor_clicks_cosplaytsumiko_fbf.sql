-- Click log for the cosplaytsumiko paid placement campaign (started 2026-08-20).
-- Copied from the 007 template, but including the columns migrations 013-015 later
-- added to every sponsor_clicks_* table — a fresh table should start with the full
-- current schema instead of waiting for someone to notice /go/ inserts are failing.

CREATE TABLE IF NOT EXISTS sponsor_clicks_cosplaytsumiko_fbf (
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

COMMENT ON TABLE sponsor_clicks_cosplaytsumiko_fbf IS
  'findbyface click log for the cosplaytsumiko (Tsumiko) paid placement campaign. One row per non-bot click through /go/cosplaytsumiko.';
