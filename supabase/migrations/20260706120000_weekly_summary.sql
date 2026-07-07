-- Weekly summary email (G4) — consent column + idempotency log.
--
-- The send-weekly-summary cron (app/api/cron/send-weekly-summary) is a Pro
-- retention feature that ships DORMANT (WEEKLY_SUMMARY_MODE defaults off).
-- This migration is the other half of the double gate:
--
--  1. profiles.weekly_summary_emails — the user-facing consent toggle.
--     The weekly summary is a DIFFERENT consent surface than rate alerts
--     (a recurring digest vs an event-triggered alert), so it gets its own
--     column instead of reusing rate_alert_emails. Default false = nobody
--     gets an email until they opt in AND Morgan flips the mode to live.
--
--  2. weekly_summary_log — per-user per-ISO-week idempotency. The cron
--     CLAIMS a (user_id, iso_week) row before sending (the stripe-events
--     pattern); the unique constraint guarantees at most ONE summary per
--     user per ISO week across overlapping or retried runs.
--
-- Writes to the log happen only from the cron via the service-role client
-- (lib/supabase/admin.ts). RLS is enabled with an explicit deny-all policy
-- so the anon and authenticated keys can neither read nor write it; the
-- service role bypasses RLS.

-- 1. Consent toggle (additive + nullable-safe; owner-RLS on profiles
--    already lets a user update their own row via the Settings toggle).
alter table public.profiles
  add column if not exists weekly_summary_emails boolean not null default false;

comment on column public.profiles.weekly_summary_emails is
  'User opt-in for the weekly portfolio summary email. The send-weekly-summary cron only emails users with this true. Default false = explicit opt-in required (double-gated with WEEKLY_SUMMARY_MODE).';

-- 2. Idempotency log — one row per (user, ISO week) summary send.
create table if not exists public.weekly_summary_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- ISO-8601 week key, e.g. '2026-W28' (lib/weekly-summary.ts isoWeekKey).
  iso_week text not null,
  sent_at timestamptz not null default now(),
  resend_id text,
  constraint weekly_summary_log_user_week_unique unique (user_id, iso_week)
);

comment on table public.weekly_summary_log is
  'Idempotency log for the weekly summary email: at most one send per user per ISO week. Service-role only (deny-all RLS).';

create index if not exists weekly_summary_log_week_idx
  on public.weekly_summary_log (iso_week);

-- Service-role only: RLS on, with an explicit deny-all policy (documents
-- intent beyond "no policies"; the service role bypasses RLS either way).
alter table public.weekly_summary_log enable row level security;

drop policy if exists "weekly_summary_log_deny_all" on public.weekly_summary_log;
create policy "weekly_summary_log_deny_all"
  on public.weekly_summary_log
  for all
  using (false)
  with check (false);
