-- ============================================================
-- Atomic subscription Checkout intent ledger
--
-- DEPLOY BEFORE the matching application release. The old application does
-- not reference this table, while the new billing action fails closed if it
-- is unavailable. No Stripe Product, Price, Customer, or Subscription is
-- mutated by this migration.
-- ============================================================

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception using
      errcode = '55000',
      message = 'subscription_checkout_intents requires public.set_updated_at()';
  end if;
  if to_regclass('public.one_time_pdf_purchase_claims') is null then
    raise exception using
      errcode = '55000',
      message = 'subscription_checkout_intents requires one_time_pdf_purchase_claims';
  end if;
end;
$$;

create table public.subscription_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_slug text not null,
  stripe_price_id text not null,
  stripe_discount_coupon_id text,
  trial_days integer not null default 0,
  status text not null default 'creating',
  lease_expires_at timestamptz not null,
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  stripe_expires_at timestamptz,
  pack_credit_claim_id uuid references public.one_time_pdf_purchase_claims(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_checkout_intents_plan_check
    check (plan_slug in ('pro_monthly', 'pro_annual', 'agent_pro_monthly', 'agent_pro_annual')),
  constraint subscription_checkout_intents_price_check
    check (stripe_price_id ~ '^price_[A-Za-z0-9_]+$'),
  constraint subscription_checkout_intents_coupon_check
    check (
      stripe_discount_coupon_id is null
      or char_length(stripe_discount_coupon_id) between 1 and 255
    ),
  constraint subscription_checkout_intents_trial_check
    check (trial_days between 0 and 90),
  constraint subscription_checkout_intents_status_check
    check (status in ('creating', 'open', 'completed', 'expired', 'failed')),
  constraint subscription_checkout_intents_customer_check
    check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9_]+$'),
  constraint subscription_checkout_intents_session_check
    check (
      stripe_checkout_session_id is null
      or stripe_checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'
    ),
  constraint subscription_checkout_intents_open_shape_check
    check (
      status <> 'open'
      or (
        stripe_customer_id is not null
        and stripe_checkout_session_id is not null
        and stripe_expires_at is not null
      )
    ),
  constraint subscription_checkout_intents_terminal_credit_check
    check (status not in ('expired', 'failed') or pack_credit_claim_id is null),
  constraint subscription_checkout_intents_expiry_check
    check (stripe_expires_at is null or stripe_expires_at >= created_at)
);

comment on table public.subscription_checkout_intents is
  'Server-only serialization ledger for subscription Checkout creation. One active row per user prevents duplicate Customers, open Sessions, and subscriptions.';
comment on column public.subscription_checkout_intents.pack_credit_claim_id is
  'Exclusive Deal Decision Pack credit reservation. Retained after completion for audit; cleared only when Checkout expires or fails.';

-- This partial UNIQUE index is the atomic checkout lock. Concurrent requests
-- for the same user cannot both become Stripe-creating leaders.
create unique index subscription_checkout_intents_one_active_per_user_idx
  on public.subscription_checkout_intents (user_id)
  where status in ('creating', 'open');

-- A claim can be attached to only one intent across all time. Expired/failed
-- intents clear the value so a never-used credit becomes reservable again.
create unique index subscription_checkout_intents_one_pack_credit_idx
  on public.subscription_checkout_intents (pack_credit_claim_id)
  where pack_credit_claim_id is not null;

create index subscription_checkout_intents_active_lease_idx
  on public.subscription_checkout_intents (lease_expires_at)
  where status in ('creating', 'open');

create or replace function public.enforce_subscription_checkout_intent_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.id,
    new.user_id,
    new.plan_slug,
    new.stripe_price_id,
    new.stripe_discount_coupon_id,
    new.trial_days,
    new.created_at
  ) is distinct from row(
    old.id,
    old.user_id,
    old.plan_slug,
    old.stripe_price_id,
    old.stripe_discount_coupon_id,
    old.trial_days,
    old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'subscription checkout configuration is immutable';
  end if;

  if old.stripe_customer_id is not null
     and new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception using errcode = '23514', message = 'Stripe customer binding is immutable';
  end if;
  if old.stripe_checkout_session_id is not null
     and new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id then
    raise exception using errcode = '23514', message = 'Stripe Session binding is immutable';
  end if;
  if old.stripe_expires_at is not null
     and new.stripe_expires_at is distinct from old.stripe_expires_at then
    raise exception using errcode = '23514', message = 'Stripe Session expiry is immutable';
  end if;

  if old.pack_credit_claim_id is distinct from new.pack_credit_claim_id
     and not (
       old.pack_credit_claim_id is not null
       and new.pack_credit_claim_id is null
       and new.status in ('expired', 'failed')
     ) then
    raise exception using errcode = '23514', message = 'Pack credit reservation is immutable';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'creating' and new.status in ('open', 'completed', 'expired', 'failed'))
    or (old.status = 'open' and new.status in ('completed', 'expired', 'failed'))
  ) then
    raise exception using errcode = '23514', message = 'invalid subscription checkout transition';
  end if;

  if old.status <> 'creating'
     and new.lease_expires_at is distinct from old.lease_expires_at then
    raise exception using errcode = '23514', message = 'only a creating intent can renew its lease';
  end if;

  if old.status in ('completed', 'expired', 'failed') and new is distinct from old then
    raise exception using errcode = '23514', message = 'terminal checkout intent is immutable';
  end if;

  return new;
end;
$$;

create trigger enforce_subscription_checkout_intent_integrity
  before update on public.subscription_checkout_intents
  for each row execute function public.enforce_subscription_checkout_intent_integrity();

create trigger set_subscription_checkout_intents_updated_at
  before update on public.subscription_checkout_intents
  for each row execute function public.set_updated_at();

-- Replace a stale, Session-unbound creator and reserve its successor in one
-- database transaction. Before reconciling Stripe, the caller CAS-renews the
-- stale lease; that exact future lease plus the observed Customer binding are
-- fencing tokens. If another worker won or progressed the row, this function
-- does nothing and the caller must inspect the new winner instead.
--
-- Customer-bound callers must first converge the old Stripe idempotency key
-- to a known complete/expired Session or a definitive pre-creation rejection.
-- PostgreSQL cannot prove that external fact, but it can guarantee there is no
-- gap between releasing the old user / Pack-credit locks and acquiring the
-- replacement locks.
create or replace function public.replace_stale_subscription_checkout_intent(
  p_stale_intent_id uuid,
  p_expected_lease_expires_at timestamptz,
  p_expected_stripe_customer_id text,
  p_replacement_stripe_customer_id text,
  p_user_id uuid,
  p_plan_slug text,
  p_stripe_price_id text,
  p_stripe_discount_coupon_id text,
  p_trial_days integer,
  p_pack_credit_claim_id uuid
)
returns public.subscription_checkout_intents
language plpgsql
set search_path = ''
as $$
declare
  replacement public.subscription_checkout_intents;
begin
  if p_replacement_stripe_customer_id is not null
     and p_replacement_stripe_customer_id is distinct from p_expected_stripe_customer_id then
    raise exception using
      errcode = '23514',
      message = 'replacement Customer must retain or clear the reconciled binding';
  end if;

  update public.subscription_checkout_intents
  set
    status = 'failed',
    pack_credit_claim_id = null
  where id = p_stale_intent_id
    and user_id = p_user_id
    and status = 'creating'
    and stripe_checkout_session_id is null
    and lease_expires_at = p_expected_lease_expires_at
    -- A future lease proves the caller claimed this stale row before doing
    -- external reconciliation; an unclaimed expired row cannot be replaced.
    and lease_expires_at > clock_timestamp()
    and stripe_customer_id is not distinct from p_expected_stripe_customer_id;

  if not found then
    return null;
  end if;

  insert into public.subscription_checkout_intents (
    user_id,
    plan_slug,
    stripe_price_id,
    stripe_discount_coupon_id,
    trial_days,
    status,
    lease_expires_at,
    stripe_customer_id,
    pack_credit_claim_id
  ) values (
    p_user_id,
    p_plan_slug,
    p_stripe_price_id,
    p_stripe_discount_coupon_id,
    p_trial_days,
    'creating',
    clock_timestamp() + interval '5 minutes',
    p_replacement_stripe_customer_id,
    p_pack_credit_claim_id
  )
  returning * into replacement;

  return replacement;
end;
$$;

alter table public.subscription_checkout_intents enable row level security;
alter table public.subscription_checkout_intents force row level security;

-- No browser/session client can inspect Stripe ids, coupon ids, Pack claims,
-- or mutate the lock. Only trusted service-role code may use this ledger.
revoke all on table public.subscription_checkout_intents from public, anon, authenticated;
grant select, insert, update on table public.subscription_checkout_intents to service_role;
revoke all on function public.enforce_subscription_checkout_intent_integrity() from public;
grant execute on function public.enforce_subscription_checkout_intent_integrity() to service_role;
revoke all on function public.replace_stale_subscription_checkout_intent(
  uuid, timestamptz, text, text, uuid, text, text, text, integer, uuid
) from public, anon, authenticated;
grant execute on function public.replace_stale_subscription_checkout_intent(
  uuid, timestamptz, text, text, uuid, text, text, text, integer, uuid
) to service_role;
