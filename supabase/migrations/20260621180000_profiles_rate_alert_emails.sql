-- Per-user opt-in for the weekly rate-alert email.
--
-- The send-rate-alerts cron (app/api/cron/send-rate-alerts) is a Pro
-- retention feature that ships dormant. This column is the user-facing
-- consent toggle: the cron only emails users with rate_alert_emails = true,
-- so flipping RATE_ALERTS_MODE to "live" never emails someone who didn't
-- opt in. Default false = explicit opt-in required.
--
-- Lives on profiles (owner-RLS already lets a user update their own row).
-- Additive + nullable-safe (not null default false).

alter table public.profiles
  add column if not exists rate_alert_emails boolean not null default false;

comment on column public.profiles.rate_alert_emails is
  'User opt-in for the weekly rate-alert email. The send-rate-alerts cron only emails users with this true. Default false = opt-in required.';
