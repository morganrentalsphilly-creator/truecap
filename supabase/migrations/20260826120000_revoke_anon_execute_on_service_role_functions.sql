-- Remove unauthenticated EXECUTE on four service-role-only functions.
--
-- Postgres grants EXECUTE to PUBLIC by default when a function is created, and
-- PostgREST exposes every non-trigger function in the `public` schema that the
-- request role may execute. Four functions therefore sat on the open internet
-- at /rest/v1/rpc/<name> for the `anon` role:
--
--   sms_invoke_sender()            SECURITY DEFINER. Reads an admin passcode
--                                  out of sms_config (bypassing RLS) and POSTs
--                                  it to the sms-admin edge function with
--                                  action "send_due" — i.e. any anonymous
--                                  caller could trigger a privileged SMS run.
--   increment_analysis_runs()      Increments the public "analyses run"
--                                  counter, bypassing the app's per-IP brake,
--                                  so the number shown on the marketing site
--                                  could be inflated arbitrarily.
--   increment_app_counter_if_under() Reserves budget in app_counters. An
--                                  anonymous caller could exhaust the RentCast
--                                  / AI monthly cap and deny enrichment to
--                                  every user.
--   decrement_app_counter()        Releases that budget, so an anonymous caller
--                                  could reset the cap and drive spend on a
--                                  metered third-party API.
--
-- Every application caller uses the service-role client
-- (app/actions/track-analysis-run.ts, app/actions/property-comps.ts,
-- lib/ai-spend-guard.ts, app/api/cron/send-rent-alerts/route.ts), and
-- service_role keeps its grant below, so no product path changes. The
-- PUBLIC revoke is the load-bearing one: revoking `anon` alone leaves the
-- default PUBLIC grant, which `anon` still inherits.
--
-- ROLLBACK (only if a non-service-role caller is discovered):
--   grant execute on function public.<name>(<args>) to anon, authenticated;
-- Prefer moving that caller to the service-role client instead.

begin;

do $$
declare
  target record;
  revoked_count integer := 0;
begin
  for target in
    select format(
             '%I.%I(%s)',
             n.nspname,
             p.proname,
             pg_get_function_identity_arguments(p.oid)
           ) as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'sms_invoke_sender',
        'increment_analysis_runs',
        'increment_app_counter_if_under',
        'decrement_app_counter'
      )
      -- Trigger/event-trigger functions are not PostgREST-callable and are
      -- excluded defensively in case a same-named trigger helper is added.
      and p.prorettype not in ('pg_catalog.trigger'::regtype, 'pg_catalog.event_trigger'::regtype)
  loop
    execute format('revoke execute on function %s from public', target.signature);
    execute format('revoke execute on function %s from anon', target.signature);
    execute format('revoke execute on function %s from authenticated', target.signature);
    -- Re-assert the only grant the application actually uses, so the
    -- migration is safe to run even if a prior grant was dropped by hand.
    execute format('grant execute on function %s to service_role', target.signature);
    revoked_count := revoked_count + 1;
  end loop;

  if revoked_count = 0 then
    raise exception using
      errcode = '55000',
      message = 'expected at least one service-role-only function to harden',
      hint = 'Verify the function names still exist in the public schema.';
  end if;

  raise notice 'hardened % service-role-only function(s)', revoked_count;
end;
$$;

commit;

-- Verification (expect zero rows: no PUBLIC/anon/authenticated EXECUTE left):
--   select p.proname, array_to_string(p.proacl, ' | ') as acl
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('sms_invoke_sender','increment_analysis_runs',
--                       'increment_app_counter_if_under','decrement_app_counter')
--     and (array_to_string(p.proacl,'|') like '%anon=X%'
--          or array_to_string(p.proacl,'|') like '%authenticated=X%'
--          or array_to_string(p.proacl,'|') ~ '(^|\|)=X');
