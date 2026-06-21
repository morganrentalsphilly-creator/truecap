-- Global "analyses run" counter for the homepage social-proof ticker.
-- Single-row counter seeded to an honest floor (count of real, non-deleted
-- saved analyses), RLS-locked so only the service-role client can touch it,
-- with an atomic increment_analysis_runs() function callable only by the
-- service role. Idempotent: safe to re-run even though it was first applied by
-- hand in the Supabase SQL editor.

create table if not exists public.app_counters (
  key text primary key,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.app_counters is
  'Internal global counters (e.g. total analyses run). Read/written only via the service-role client; not user-facing rows.';

insert into public.app_counters (key, count)
values (
  'analysis_runs',
  coalesce((select count(*) from public.saved_analyses where deleted_at is null), 0)
)
on conflict (key) do nothing;

alter table public.app_counters enable row level security;

create or replace function public.increment_analysis_runs()
returns void
language sql
as $$
  update public.app_counters
  set count = count + 1, updated_at = now()
  where key = 'analysis_runs';
$$;

revoke all on function public.increment_analysis_runs() from public;
grant execute on function public.increment_analysis_runs() to service_role;
