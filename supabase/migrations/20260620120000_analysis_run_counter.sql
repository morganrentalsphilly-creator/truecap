-- Global "analyses run" counter for the homepage social-proof ticker.
--
-- The homepage badge should show how many times "Run analysis" has been
-- clicked (every underwrite), NOT the number of saved deals — saved deals are
-- only the small fraction of runs a user chose to keep, so they dramatically
-- undercount real usage.
--
-- Storage choice — a single-row counter (not an append-only events table):
-- we only need the aggregate total, so an O(1) counter row is simpler and
-- cheaper than count(*) over an unbounded events table, and it seeds cleanly to
-- an honest starting value.
--
-- Honest baseline — we seed the counter with the count of existing
-- (non-deleted) saved_analyses rows. Every saved deal was really analyzed, so
-- this is a true FLOOR for "analyses run": it under-counts (it ignores the
-- larger number of unsaved runs) rather than inventing a number. From deploy
-- forward every Run click increments it, so the figure only gets more accurate
-- over time. Morgan can later set the row to the real all-time PostHog
-- `analyzer_started` total with a one-line UPDATE if he wants history reflected
-- exactly; nothing here fabricates usage.

create table public.app_counters (
  key text primary key,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.app_counters is
  'Internal global counters (e.g. total analyses run). Read/written only via the service-role client; not user-facing rows.';

-- Seed the analyses-run total with an honest floor: the number of real,
-- non-deleted saved analyses that already exist. Idempotent on re-run.
insert into public.app_counters (key, count)
values (
  'analysis_runs',
  coalesce((select count(*) from public.saved_analyses where deleted_at is null), 0)
)
on conflict (key) do nothing;

-- Lock the table down. RLS is enabled with NO policies, so neither the anon
-- nor the authenticated role can read or write it directly — only the
-- service-role client (which bypasses RLS) touches it. This prevents anyone
-- from inflating the public counter by hitting the API directly.
alter table public.app_counters enable row level security;

-- Atomic increment. Kept as a DB function so the read-modify-write happens in a
-- single statement and can't race under concurrent runs (a plain JS
-- read-then-write could lose increments).
create or replace function public.increment_analysis_runs()
returns void
language sql
as $$
  update public.app_counters
  set count = count + 1, updated_at = now()
  where key = 'analysis_runs';
$$;

-- Only the service role may run the increment (the server action calls it with
-- the admin client). Revoke the default PUBLIC execute grant so anon /
-- authenticated callers can't bump the counter directly.
revoke all on function public.increment_analysis_runs() from public;
grant execute on function public.increment_analysis_runs() to service_role;
