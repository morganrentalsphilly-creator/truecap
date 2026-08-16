-- ============================================================
-- One-time Deal Decision Pack purchase claims
--
-- SURFACED FOR REVIEW — apply before deploying the matching application code.
-- This replaces reusable Stripe Checkout Session ids in browser URLs with a
-- non-secret claim id + a separate high-entropy, same-tab browser binding.
-- No public/authenticated client may read or mutate this ledger.
-- ============================================================

-- Fail before creating any ledger objects when the shared timestamp trigger
-- prerequisite is missing. Production receives this function from the base
-- InvestCalc schema migration; the explicit preflight also keeps an
-- accidentally out-of-order/manual run free of a partially configured table.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception using
      errcode = '55000',
      message = 'one_time_pdf_purchase_claims requires public.set_updated_at()';
  end if;
end;
$$;

create table if not exists public.one_time_pdf_purchase_claims (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  claim_secret_hash text not null,
  deal_fingerprint text not null,
  deal_schema_version integer not null,
  user_id uuid references auth.users(id) on delete set null,
  price_variant text,
  checkout_created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  consumed_at timestamptz,
  purchase_amount_cents bigint,
  purchase_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Dormant/auditable hooks for a future approved "100% of this purchase
  -- toward Pro" policy. The security release records purchase facts only;
  -- it does not mark anyone eligible or mutate Stripe.
  pro_credit_status text not null default 'not_configured',
  pro_credit_policy_version text,
  pro_credit_amount_cents bigint,
  pro_credit_eligible_until timestamptz,
  pro_credit_applied_at timestamptz,
  pro_credit_reference text,
  pro_credit_user_id uuid references auth.users(id) on delete set null,

  constraint one_time_pdf_checkout_session_check
    check (checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  constraint one_time_pdf_claim_secret_hash_check
    check (claim_secret_hash ~ '^[0-9a-f]{64}$'),
  constraint one_time_pdf_deal_fingerprint_check
    check (deal_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint one_time_pdf_deal_schema_version_check
    check (deal_schema_version >= 1),
  constraint one_time_pdf_price_variant_check
    check (price_variant is null or char_length(price_variant) between 1 and 32),
  constraint one_time_pdf_lifecycle_check
    check (
      expires_at > checkout_created_at
      and (paid_at is null or paid_at >= checkout_created_at)
      and (consumed_at is null or paid_at is not null)
      and (consumed_at is null or consumed_at >= paid_at)
    ),
  constraint one_time_pdf_purchase_amount_check
    check (purchase_amount_cents is null or purchase_amount_cents > 0),
  constraint one_time_pdf_purchase_currency_check
    check (purchase_currency is null or purchase_currency ~ '^[a-z]{3}$'),
  constraint one_time_pdf_payment_facts_check
    check (
      (paid_at is null and purchase_amount_cents is null and purchase_currency is null)
      or
      (paid_at is not null and purchase_amount_cents is not null and purchase_currency is not null)
    ),
  constraint one_time_pdf_credit_status_check
    check (pro_credit_status in ('not_configured', 'eligible', 'applied', 'expired', 'denied', 'reversed')),
  constraint one_time_pdf_credit_amount_check
    check (
      pro_credit_amount_cents is null
      or (
        pro_credit_amount_cents > 0
        and purchase_amount_cents is not null
        and pro_credit_amount_cents <= purchase_amount_cents
      )
    ),
  constraint one_time_pdf_credit_not_configured_check
    check (
      pro_credit_status <> 'not_configured'
      or (
        pro_credit_policy_version is null
        and pro_credit_amount_cents is null
        and pro_credit_eligible_until is null
        and pro_credit_applied_at is null
        and pro_credit_reference is null
        and pro_credit_user_id is null
      )
    ),
  constraint one_time_pdf_credit_eligibility_check
    check (
      pro_credit_status <> 'eligible'
      or (
        pro_credit_policy_version is not null
        and pro_credit_amount_cents is not null
        and pro_credit_eligible_until is not null
        and pro_credit_applied_at is null
        and pro_credit_reference is null
      )
    ),
  constraint one_time_pdf_credit_application_check
    check (
      pro_credit_status not in ('applied', 'reversed')
      or (
        pro_credit_policy_version is not null
        and pro_credit_amount_cents is not null
        and pro_credit_eligible_until is not null
        and pro_credit_applied_at is not null
        and pro_credit_reference is not null
      )
    ),
  constraint one_time_pdf_credit_timing_check
    check (
      (pro_credit_eligible_until is null or (paid_at is not null and pro_credit_eligible_until >= paid_at))
      and (pro_credit_applied_at is null or (paid_at is not null and pro_credit_applied_at >= paid_at))
    )
);

comment on table public.one_time_pdf_purchase_claims is
  'Server-only ledger for browser-bound, deal-bound, single-consumption one-time PDF purchases. Stripe Checkout Session ids and secret hashes must never be exposed through client queries.';
comment on column public.one_time_pdf_purchase_claims.claim_secret_hash is
  'SHA-256 of a 256-bit secret returned only to the initiating browser and kept in same-tab sessionStorage.';
comment on column public.one_time_pdf_purchase_claims.deal_fingerprint is
  'HMAC-SHA-256 of canonical validated form inputs, keyed by the separate 256-bit browser secret; no address or financial input is stored in plaintext.';
comment on column public.one_time_pdf_purchase_claims.pro_credit_status is
  'Dormant credit ledger. not_configured is the only status written by the current application; eligibility/application require separate approved billing policy.';

create index if not exists one_time_pdf_claims_user_created_idx
  on public.one_time_pdf_purchase_claims (user_id, created_at desc)
  where user_id is not null;

create index if not exists one_time_pdf_claims_unconsumed_expiry_idx
  on public.one_time_pdf_purchase_claims (expires_at)
  where consumed_at is null;

create index if not exists one_time_pdf_claims_credit_review_idx
  on public.one_time_pdf_purchase_claims (pro_credit_status, pro_credit_eligible_until)
  where pro_credit_status <> 'not_configured';

-- The service role must be able to fill payment facts exactly once after
-- Stripe verification, but neither retries nor later server bugs may rewrite
-- the checkout binding or the resulting purchase/credit audit facts.
-- User ids are the sole exception: an FK-driven account deletion may null
-- them for privacy, but a non-null id may never be swapped for another id.
create or replace function public.enforce_one_time_pdf_purchase_claim_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.id,
    new.checkout_session_id,
    new.claim_secret_hash,
    new.deal_fingerprint,
    new.deal_schema_version,
    new.price_variant,
    new.checkout_created_at,
    new.expires_at,
    new.created_at
  ) is distinct from row(
    old.id,
    old.checkout_session_id,
    old.claim_secret_hash,
    old.deal_fingerprint,
    old.deal_schema_version,
    old.price_variant,
    old.checkout_created_at,
    old.expires_at,
    old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'one-time PDF checkout binding is immutable';
  end if;

  if old.user_id is not null
     and new.user_id is not null
     and new.user_id is distinct from old.user_id then
    raise exception using
      errcode = '23514',
      message = 'one-time PDF purchase user cannot be reassigned';
  end if;

  if old.user_id is null
     and new.user_id is not null
     and not (old.consumed_at is null and new.consumed_at is not null) then
    raise exception using
      errcode = '23514',
      message = 'one-time PDF purchase user may only be bound during first consumption';
  end if;

  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception using errcode = '23514', message = 'paid_at is immutable once recorded';
  end if;
  if old.consumed_at is not null and new.consumed_at is distinct from old.consumed_at then
    raise exception using errcode = '23514', message = 'consumed_at is immutable once recorded';
  end if;
  if old.purchase_amount_cents is not null
     and new.purchase_amount_cents is distinct from old.purchase_amount_cents then
    raise exception using errcode = '23514', message = 'purchase amount is immutable once recorded';
  end if;
  if old.purchase_currency is not null
     and new.purchase_currency is distinct from old.purchase_currency then
    raise exception using errcode = '23514', message = 'purchase currency is immutable once recorded';
  end if;

  if new.pro_credit_status is distinct from old.pro_credit_status
     and not (
       (old.pro_credit_status = 'not_configured' and new.pro_credit_status in ('eligible', 'denied'))
       or (old.pro_credit_status = 'eligible' and new.pro_credit_status in ('applied', 'expired', 'denied'))
       or (old.pro_credit_status = 'applied' and new.pro_credit_status = 'reversed')
     ) then
    raise exception using errcode = '23514', message = 'invalid one-time PDF credit status transition';
  end if;

  if old.pro_credit_policy_version is not null
     and new.pro_credit_policy_version is distinct from old.pro_credit_policy_version then
    raise exception using errcode = '23514', message = 'credit policy version is immutable once recorded';
  end if;
  if old.pro_credit_amount_cents is not null
     and new.pro_credit_amount_cents is distinct from old.pro_credit_amount_cents then
    raise exception using errcode = '23514', message = 'credit amount is immutable once recorded';
  end if;
  if old.pro_credit_eligible_until is not null
     and new.pro_credit_eligible_until is distinct from old.pro_credit_eligible_until then
    raise exception using errcode = '23514', message = 'credit eligibility is immutable once recorded';
  end if;
  if old.pro_credit_applied_at is not null
     and new.pro_credit_applied_at is distinct from old.pro_credit_applied_at then
    raise exception using errcode = '23514', message = 'credit application time is immutable once recorded';
  end if;
  if old.pro_credit_reference is not null
     and new.pro_credit_reference is distinct from old.pro_credit_reference then
    raise exception using errcode = '23514', message = 'credit reference is immutable once recorded';
  end if;

  if old.pro_credit_user_id is not null
     and new.pro_credit_user_id is not null
     and new.pro_credit_user_id is distinct from old.pro_credit_user_id then
    raise exception using errcode = '23514', message = 'credited user cannot be reassigned';
  end if;
  if old.pro_credit_user_id is null
     and new.pro_credit_user_id is not null
     and not (
       (old.pro_credit_status = 'not_configured' and new.pro_credit_status = 'eligible')
       or (old.pro_credit_status = 'eligible' and new.pro_credit_status = 'applied')
     ) then
    raise exception using errcode = '23514', message = 'credited user may only be bound during eligibility or application';
  end if;
  if old.pro_credit_status = 'eligible'
     and new.pro_credit_status = 'applied'
     and new.pro_credit_user_id is null then
    raise exception using errcode = '23514', message = 'an applied credit requires a credited user';
  end if;

  if old.pro_credit_status in ('applied', 'reversed', 'expired', 'denied')
     and row(
       new.pro_credit_policy_version,
       new.pro_credit_amount_cents,
       new.pro_credit_eligible_until,
       new.pro_credit_applied_at,
       new.pro_credit_reference
     ) is distinct from row(
       old.pro_credit_policy_version,
       old.pro_credit_amount_cents,
       old.pro_credit_eligible_until,
       old.pro_credit_applied_at,
       old.pro_credit_reference
     ) then
    raise exception using errcode = '23514', message = 'terminal credit audit facts are immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists one_time_pdf_purchase_claims_10_enforce_integrity
  on public.one_time_pdf_purchase_claims;
create trigger one_time_pdf_purchase_claims_10_enforce_integrity
  before update on public.one_time_pdf_purchase_claims
  for each row execute function public.enforce_one_time_pdf_purchase_claim_integrity();

drop trigger if exists one_time_pdf_purchase_claims_set_updated_at
  on public.one_time_pdf_purchase_claims;
create trigger one_time_pdf_purchase_claims_set_updated_at
  before update on public.one_time_pdf_purchase_claims
  for each row execute function public.set_updated_at();

alter table public.one_time_pdf_purchase_claims enable row level security;
alter table public.one_time_pdf_purchase_claims force row level security;

-- Intentionally no anon/authenticated policies. All access goes through the
-- server action's service-role client after Stripe + binding validation.
revoke all on table public.one_time_pdf_purchase_claims from public, anon, authenticated;
revoke all on table public.one_time_pdf_purchase_claims from service_role;
grant select, insert, update on table public.one_time_pdf_purchase_claims to service_role;
