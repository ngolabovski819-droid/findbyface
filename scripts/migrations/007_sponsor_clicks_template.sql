-- Migration 007: sponsor click-log table TEMPLATE — do not run as-is.
-- ================================================================
-- Problem: each paid placement campaign needs its own click log so delivered-click
-- counts are trivially isolated per client, easy to report on, and easy to archive when
-- the campaign ends. The Supabase REST API has no DDL, so this can't be created by the
-- app at runtime.
--
-- This Supabase project is shared across multiple sites (e.g. fanspedia) — table names
-- are suffixed _fbf so a findbyface campaign never collides with another site's table
-- for the same creator.
--
-- Usage: for each new campaign that needs click tracking, copy this file to
-- scripts/migrations/0NN_sponsor_clicks_<username>_fbf.sql, replace <username> below
-- with the actual (lowercased, underscore-safe) username, and have the user run it once
-- directly against the database. Then set clickTable: 'sponsor_clicks_<username>_fbf'
-- on that creator's entry in src/config/sponsors.ts — src/pages/go/[username].ts logs
-- into whatever table name is configured there.

CREATE TABLE IF NOT EXISTS sponsor_clicks_<username>_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT
);

COMMENT ON TABLE sponsor_clicks_<username>_fbf IS
  'findbyface click log for the <username> paid placement campaign. One row per non-bot click through /go/<username>. placement is derived server-side from the Referer header (home / category:<slug> / search / external:<hostname> / null when no referrer arrived).';
