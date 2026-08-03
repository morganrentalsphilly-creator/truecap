-- Revoke the default PUBLIC execute grant on archive_stale_saved_analyses().
--
-- SECURITY FIX. public.archive_stale_saved_analyses() is SECURITY DEFINER
-- (owned by postgres) and was created without a revoke, so it kept Postgres's
-- default `EXECUTE TO PUBLIC` grant. PostgREST therefore exposes it at
--   POST /rest/v1/rpc/archive_stale_saved_analyses
-- to the anon role — and the anon key ships in the public JS bundle. Because
-- the function runs as its owner and saved_analyses is not FORCE ROW LEVEL
-- SECURITY, the UPDATE inside it is unfiltered by user_id: any unauthenticated
-- caller could archive (is_archived = true, pipeline_stage = 'passed') every
-- user's deals older than 60 days, across every account. Confirmed reachable
-- in production: a GET to that RPC with the public anon key returns
-- 25006 "cannot execute UPDATE in a read-only transaction" — the body had
-- already started executing; a POST would have committed.
--
-- The function is cron-only by design
-- (cron.schedule('archive-stale-saved-analyses-daily', '0 2 * * *', ...)), so
-- service_role is the only role that needs it. This matches the pattern the
-- sibling counters already use — see 20260620120000_analysis_run_counter.sql
-- and 20260621220000_increment_app_counter.sql.
--
-- Note the un-archive path is user-facing, so the damage would be mostly
-- reversible, EXCEPT that the BEFORE UPDATE trigger
-- set_saved_analysis_last_activity_at rewrites last_activity_at = now() on
-- every touched row — those timestamps cannot be restored.
--
-- Verify after applying (should return 404 / PGRST202 instead of 25006):
--   curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     "$SUPABASE_URL/rest/v1/rpc/archive_stale_saved_analyses"

revoke all on function public.archive_stale_saved_analyses() from public;
revoke all on function public.archive_stale_saved_analyses() from anon;
revoke all on function public.archive_stale_saved_analyses() from authenticated;
grant execute on function public.archive_stale_saved_analyses() to service_role;

comment on function public.archive_stale_saved_analyses() is
  'Cron-only housekeeping: archives saved deals with no activity for 60 days. SECURITY DEFINER and RLS-bypassing, so EXECUTE is service_role only — do not re-grant to anon/authenticated.';
