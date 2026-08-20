-- creator_face history now stores the FULL result set of a face search (up to 100
-- organic matches + pinned sponsors ≈ 103 rows; the API allows 120 — see
-- MAX_SAVED_RESULTS in src/pages/api/search-history.ts). 023's results cap of 25 was
-- sized for the old 10-result previews and silently 400s the bigger payloads at the
-- database, which the API surfaced as a 500 on every creator_face save.
--
-- The 128 KB octet guard stays: a real 103-result payload measures ~20 KB, so the byte
-- ceiling still bounds worst-case row size without ever biting a legitimate save.

BEGIN;

ALTER TABLE public.user_search_history
  DROP CONSTRAINT user_search_history_results_valid;

ALTER TABLE public.user_search_history
  ADD CONSTRAINT user_search_history_results_valid CHECK (
    jsonb_typeof(results) = 'array'
    AND jsonb_array_length(results) <= 120
    AND octet_length(results::text) <= 131072
  );

COMMIT;
