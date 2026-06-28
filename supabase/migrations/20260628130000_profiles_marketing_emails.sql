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
