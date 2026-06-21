-- Generic atomic counter increment for app_counters, so features beyond the
-- homepage "analyses run" ticker can keep their own monthly usage counters.
-- Used by the RentCast enrichment spend guard, keyed
-- 'rentcast_enrichments_YYYY-MM'. Upserts the key, so a new month's counter
-- auto-creates on first use. Service-role only (matches increment_analysis_runs).

create or replace function public.increment_app_counter(counter_key text)
returns bigint
language plpgsql
as $$
declare
  new_count bigint;
begin
  insert into public.app_counters (key, count)
  values (counter_key, 1)
  on conflict (key) do update
    set count = public.app_counters.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_app_counter(text) from public;
grant execute on function public.increment_app_counter(text) to service_role;
