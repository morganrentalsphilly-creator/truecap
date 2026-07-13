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
