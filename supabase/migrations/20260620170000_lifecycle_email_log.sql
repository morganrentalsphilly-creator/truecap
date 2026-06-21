-- Lifecycle email send log.
--
-- Idempotency + per-user history for event-triggered lifecycle emails:
-- welcome, the onboarding drip (day 1..30), the free->Pro nudge, and the
-- win-back. One row per (user_id, email_key). The lifecycle cron
-- (app/api/cron/send-lifecycle-emails) checks this table before sending,
-- so each lifecycle email goes out at most once per user.
--
-- Writes happen only from the cron via the service-role client
-- (lib/supabase/admin.ts). RLS is enabled with NO policies so the anon
-- and authenticated keys can neither read nor write it; the service role
-- bypasses RLS.

create table if not exists public.lifecycle_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email_key text not null,
  sent_at timestamptz not null default now(),
  resend_id text,
  constraint lifecycle_email_log_user_key_unique unique (user_id, email_key)
);

create index if not exists lifecycle_email_log_user_idx
  on public.lifecycle_email_log (user_id);

alter table public.lifecycle_email_log enable row level security;
