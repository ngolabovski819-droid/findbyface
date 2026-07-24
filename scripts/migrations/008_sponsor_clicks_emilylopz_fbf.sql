-- Migration 008: click-log table for the emilylopz paid placement campaign.
-- ================================================================
-- Pinned position 1 on home + every category page, link overridden to
-- https://onlyfans.com/emilylopz/c545 (src/config/placements.ts / sponsors.ts).
-- Run this once directly against the database — the Supabase REST API has no DDL.
--
-- _fbf suffix: this Supabase project is shared with other sites (e.g. fanspedia), so
-- every findbyface click table is suffixed to keep it distinguishable from same-named
-- campaigns tracked by other sites against the same creator.

CREATE TABLE IF NOT EXISTS sponsor_clicks_emilylopz_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT
);

COMMENT ON TABLE sponsor_clicks_emilylopz_fbf IS
  'findbyface click log for the emilylopz paid placement campaign. One row per non-bot click through /go/emilylopz. placement is derived server-side from the Referer header (home / category:<slug> / search / external:<hostname> / null when no referrer arrived).';
