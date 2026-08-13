-- Persistent, account-scoped search history for the creator directory and both
-- face-search tools. The API writes with the service role after independently
-- verifying the caller's Supabase access token; clients never choose user_id.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.user_search_history (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_search_id text NOT NULL,
  search_type text NOT NULL,
  query text,
  label text,
  result_count integer NOT NULL DEFAULT 0,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_search_history_user_client_unique
    UNIQUE (user_id, client_search_id),
  CONSTRAINT user_search_history_client_id_valid CHECK (
    char_length(client_search_id) BETWEEN 1 AND 128
    AND client_search_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  CONSTRAINT user_search_history_type_valid CHECK (
    search_type IN ('directory', 'creator_face', 'video_face')
  ),
  CONSTRAINT user_search_history_query_length CHECK (
    query IS NULL OR char_length(query) <= 200
  ),
  CONSTRAINT user_search_history_label_length CHECK (
    label IS NULL OR char_length(label) <= 200
  ),
  CONSTRAINT user_search_history_result_count_valid CHECK (
    result_count BETWEEN 0 AND 10000000
  ),
  CONSTRAINT user_search_history_filters_valid CHECK (
    jsonb_typeof(filters) = 'object'
    AND octet_length(filters::text) <= 16384
  ),
  CONSTRAINT user_search_history_results_valid CHECK (
    jsonb_typeof(results) = 'array'
    AND jsonb_array_length(results) <= 25
    AND octet_length(results::text) <= 131072
  )
);

CREATE INDEX IF NOT EXISTS idx_user_search_history_user_created
  ON public.user_search_history (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_search_history_user_type_created
  ON public.user_search_history (user_id, search_type, created_at DESC, id DESC);

-- Keep account storage bounded even if a client is modified or automated. The
-- oldest records are removed after each statement; normal app batches are <= 10.
DROP FUNCTION IF EXISTS public.trim_user_search_history();

CREATE OR REPLACE FUNCTION public.trim_user_search_history(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.user_search_history AS history
  WHERE history.user_id = target_user_id
    AND history.id IN (
      SELECT id
      FROM public.user_search_history
      WHERE user_id = target_user_id
      ORDER BY created_at DESC, id DESC
      OFFSET 1000
    );
END;
$$;

REVOKE ALL ON FUNCTION public.trim_user_search_history(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trim_user_search_history(uuid) TO service_role;


ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_history FORCE ROW LEVEL SECURITY;

-- Defense in depth if direct authenticated-table grants are introduced later.
-- Current grants below still keep all browser access behind the validating API.
DROP POLICY IF EXISTS user_search_history_select_own ON public.user_search_history;
CREATE POLICY user_search_history_select_own
  ON public.user_search_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_search_history_insert_own ON public.user_search_history;
CREATE POLICY user_search_history_insert_own
  ON public.user_search_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_search_history_update_own ON public.user_search_history;
CREATE POLICY user_search_history_update_own
  ON public.user_search_history
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_search_history_delete_own ON public.user_search_history;
CREATE POLICY user_search_history_delete_own
  ON public.user_search_history
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.user_search_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_search_history TO service_role;

COMMENT ON TABLE public.user_search_history IS
  'Private, durable search history. Rows are owned by auth.users and written through the authenticated application API.';
COMMENT ON COLUMN public.user_search_history.client_search_id IS
  'Stable client-generated id used to make retries and one-time local-history imports idempotent per user.';

NOTIFY pgrst, 'reload schema';

COMMIT;
