-- Billing: durable record of paid Stripe events the webhook could not bind to
-- a user. Before this table, an unbindable checkout.session.completed was
-- logged, reported to Sentry as a categorical message, and then dropped —
-- the money moved and the entitlement did not, with no row to act on.
--
-- Additive and idempotent: safe to re-run. Service-role only (RLS enabled,
-- no policies), like stripe_webhook_events.

create table if not exists public.billing_unresolved_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_customer_id text,
  customer_email text,
  amount_cents bigint,
  currency text,
  reason text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_user_id uuid references auth.users (id) on delete set null,
  resolution_note text
);

create index if not exists billing_unresolved_events_open_idx
  on public.billing_unresolved_events (created_at desc)
  where resolved_at is null;

create index if not exists billing_unresolved_events_customer_idx
  on public.billing_unresolved_events (stripe_customer_id);

alter table public.billing_unresolved_events enable row level security;
-- No policies: anon/authenticated get nothing; the service role bypasses RLS.

comment on table public.billing_unresolved_events is
  'Paid Stripe events the webhook could not bind to a TrueCap user. Rows are never deleted; resolve by setting resolved_at (and resolved_user_id) after the mapping is repaired.';
