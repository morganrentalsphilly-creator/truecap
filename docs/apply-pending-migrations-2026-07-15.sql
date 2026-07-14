-- ============================================================
-- TrueCap prod catch-up bundle — generated 2026-07-15
-- Confirmed missing in prod (read-only 42703 probes):
--   profiles.comps_free_used / marketing_emails / weekly_summary_emails,
--   analysis_templates.pmi_annual_rate_pct, stripe_webhook_events.claimed_at.
-- Every statement is idempotent (if not exists / or replace):
-- safe to paste ONCE into the Supabase SQL editor, in this order,
-- even over the current partially-applied state.
-- ============================================================

-- ─────────── from supabase/migrations/20260621230000_profiles_comps_free_used.sql
-- One free comps lookup for free users.
--
-- Free users get a single live RentCast comps lookup as a taste, then are
-- gated to Pro. This flag tracks whether they've spent it. Cached views do
-- NOT set this (they cost no API quota); only a live lookup does. Default
-- false = freebie available.

alter table public.profiles
  add column if not exists comps_free_used boolean not null default false;

comment on column public.profiles.comps_free_used is
  'True once a free user has spent their single free RentCast comps lookup. Pro users are unlimited and ignore this.';

-- ─────────── from supabase/migrations/20260628130000_profiles_marketing_emails.sql
-- Dedicated marketing-email consent (separate from rate_alert_emails).
--
-- The lifecycle cron's PROMOTIONAL kinds (pro_nudge, winback) are marketing,
-- not transactional onboarding (welcome/drip). They must only go to users who
-- explicitly opted in — reusing the rate-alert consent would conflate a
-- service alert with marketing. The cron gates promos on this column and fails
-- CLOSED (no promo) when it can't read consent.
--
-- Default false = explicit opt-in required (CAN-SPAM / GDPR-friendly).
-- Additive + nullable-safe; owner-RLS on profiles already lets a user update
-- their own row, so the settings toggle needs no policy change.

alter table public.profiles
  add column if not exists marketing_emails boolean not null default false;

comment on column public.profiles.marketing_emails is
  'User opt-in for promotional/marketing emails (lifecycle pro_nudge + winback). Default false = opt-in required. Distinct from rate_alert_emails (a per-deal service alert).';

-- ─────────── from supabase/migrations/20260628140000_analysis_templates_pmi.sql
-- Persist PMI / FHA-MIP overrides on saved analysis templates.
--
-- The investment form + calc-analysis support a template-level PMI override
-- (pmiAnnualRatePct) and an FHA "MIP never cancels" flag (pmiNoCancel) — the
-- FHA starter template sets 0.55% + no-cancel. But the templates table never
-- stored them, so saving a template DROPPED the PMI assumption and applying it
-- re-underwrote at the default 0.8% conventional PMI (wrong for FHA/custom).
--
-- Additive + nullable (null = "use the calc default"). Apply this alongside the
-- deploy of the matching code (TEMPLATE_ROW_FIELDS selects these columns), the
-- same way the buy_box column was rolled out.

alter table public.analysis_templates
  add column if not exists pmi_annual_rate_pct numeric;

alter table public.analysis_templates
  add column if not exists pmi_no_cancel boolean;

comment on column public.analysis_templates.pmi_annual_rate_pct is
  'Optional PMI/MIP annual rate override (% of loan). Null = use the calc default (0.8% conventional).';
comment on column public.analysis_templates.pmi_no_cancel is
  'When true, PMI/MIP never auto-cancels at 80% LTV (FHA MIP). Null/false = cancels.';

-- ─────────── from supabase/migrations/20260628150000_atomic_app_counters.sql
-- Atomic reserve/refund for app_counters, to make the RentCast monthly budget
-- cap race-free.
--
-- Today property-comps reads the counter, checks it against the cap, then
-- increments AFTER the live fetch. Under concurrency every in-flight request
-- can clear the same read-gate and overshoot the cap by the number of
-- concurrent lookups — each one a billable RentCast call beyond the budget.
--
-- increment_app_counter_if_under() reserves atomically: it bumps the counter by
-- `amount` ONLY while the current value is still under `max_value`, and returns
-- the new count — or NULL when it's already at/over the cap (caller treats NULL
-- as "at cap"). decrement_app_counter() refunds a reservation when the live
-- fetch fails (floored at 0). Both are additive; the existing
-- increment_app_counter() RPC is untouched, and property-comps falls back to
-- the legacy read-then-increment path if these functions aren't present yet.

create or replace function public.increment_app_counter_if_under(
  counter_key text,
  max_value integer,
  amount integer default 1
)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.app_counters as c (key, count)
    values (counter_key, amount)
    on conflict (key) do update
      set count = c.count + amount
      where c.count < max_value
    returning c.count into new_count;
  -- NULL = the conflict-update was skipped because count was already >= cap.
  return new_count;
end;
$$;

create or replace function public.decrement_app_counter(
  counter_key text,
  amount integer default 1
)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update public.app_counters
    set count = greatest(0, count - amount)
    where key = counter_key
    returning count into new_count;
  return new_count;
end;
$$;

-- ─────────── from supabase/migrations/20260706120000_weekly_summary.sql
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

-- ─────────── from supabase/migrations/20260713120000_webhook_claim_lock.sql
-- Webhook claim lease: closes the concurrent-delivery race in the Stripe
-- webhook idempotency contract (app/api/stripe/webhooks/route.ts).
--
-- Problem: the 23505 -> "processed_at IS NULL" retry branch was
-- select-then-fallthrough, so a Stripe retry of a still-in-flight first
-- attempt processed the same event twice in parallel (duplicate
-- abandoned-cart emails, double PostHog funnel events).
--
-- Fix: `claimed_at` is a short-lived processing lease. The route claims the
-- retry atomically with a compare-and-swap UPDATE:
--
--   update stripe_webhook_events set claimed_at = now()
--    where stripe_event_id = $1
--      and processed_at is null
--      and (claimed_at is null or claimed_at < now() - interval '60 seconds')
--    returning stripe_event_id;
--
-- and only reprocesses when a row comes back. A lease older than 60s is
-- treated as a dead attempt and can be stolen.
--
-- `default now()` is deliberate: the initial INSERT is itself the first
-- claim, so new rows self-claim at insert time — without it, a retry
-- arriving while the very first attempt is still running would see
-- claimed_at NULL and win the lease anyway. Backfilling existing rows with
-- the migration timestamp is harmless: any stuck lease is stealable 60s
-- after this migration runs.
--
-- The route code is tolerant of this column NOT existing yet (42703 /
-- PGRST204 fallback to the old select-then-fallthrough), so code can deploy
-- before this migration is applied.

alter table public.stripe_webhook_events
  add column if not exists claimed_at timestamptz null default now();

comment on column public.stripe_webhook_events.claimed_at is
  'Processing lease for the webhook route: set on insert (default) and re-set via atomic compare-and-swap when a Stripe retry re-claims an unprocessed event. A lease older than 60s is considered dead and stealable. NULL only on rows created before this column existed.';

-- ─────────── post-apply verification (should all return one row / no error)
select comps_free_used, marketing_emails, weekly_summary_emails from public.profiles limit 1;
select pmi_annual_rate_pct from public.analysis_templates limit 1;
select claimed_at from public.stripe_webhook_events limit 1;
