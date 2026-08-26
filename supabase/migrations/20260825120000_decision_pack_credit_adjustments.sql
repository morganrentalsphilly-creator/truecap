-- ============================================================
-- Operational resolution queue for already-applied Decision Pack credits
--
-- A refund/lost-dispute webhook can revoke report access and move the Pack
-- credit audit state from applied -> reversed, but it must NEVER silently
-- mutate a live Stripe subscription, Price, invoice, or charge. This table
-- closes the operational gap: each reversed applied credit remains pending
-- until support/accounting records either a completed financial adjustment or
-- an explicit approved waiver.
--
-- SURFACED FOR REVIEW — apply before deploying the matching webhook code.
-- ============================================================

begin;

do $$
begin
  if to_regclass('public.one_time_pdf_purchase_claims') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_credit_adjustments requires one_time_pdf_purchase_claims';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_credit_adjustments requires public.set_updated_at()';
  end if;

  if exists (
    select 1
    from (values
      ('id'),
      ('checkout_session_id'),
      ('pro_credit_status')
    ) as required(column_name)
    where not exists (
      select 1
      from information_schema.columns as existing
      where table_schema = 'public'
        and table_name = 'one_time_pdf_purchase_claims'
        and existing.column_name = required.column_name
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_credit_adjustments requires the complete Decision Pack credit ledger schema';
  end if;
end;
$$;

create table if not exists public.decision_pack_credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique
    references public.one_time_pdf_purchase_claims(id) on delete restrict,
  checkout_session_id text not null unique,
  reason text not null,
  status text not null default 'pending',
  resolution_reference text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint decision_pack_credit_adjustment_session_check
    check (checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  constraint decision_pack_credit_adjustment_reason_check
    check (reason in ('refund_recorded', 'dispute_lost', 'legacy_reversed')),
  constraint decision_pack_credit_adjustment_status_check
    check (status in ('pending', 'completed', 'waived')),
  constraint decision_pack_credit_adjustment_resolution_check
    check (
      (
        status = 'pending'
        and resolved_at is null
        and resolution_reference is null
        and resolution_note is null
      )
      or
      (
        status in ('completed', 'waived')
        and resolved_at is not null
        and char_length(trim(coalesce(resolution_reference, ''))) between 3 and 200
        and char_length(trim(coalesce(resolution_note, ''))) between 3 and 2000
      )
    )
);

comment on table public.decision_pack_credit_adjustments is
  'Server-only operational queue for applied Pack credits reversed after refund/lost dispute. No row authorizes an automatic Stripe mutation.';
comment on column public.decision_pack_credit_adjustments.resolution_reference is
  'Non-PII support/accounting reference for the completed adjustment or approved waiver.';

create index if not exists decision_pack_credit_adjustments_pending_idx
  on public.decision_pack_credit_adjustments (created_at asc)
  where status = 'pending';

-- Backfill credits reversed before this queue existed. The original event's
-- precise reason is not recoverable from the immutable claim ledger, so keep a
-- truthful legacy reason and require the operator to verify Stripe before
-- resolving the row.
insert into public.decision_pack_credit_adjustments (
  claim_id,
  checkout_session_id,
  reason
)
select
  id,
  checkout_session_id,
  'legacy_reversed'
from public.one_time_pdf_purchase_claims
where pro_credit_status = 'reversed'
on conflict (claim_id) do nothing;

-- A partially applied or privileged historical writer must not leave a queue
-- row attributed to a different Checkout Session or to a credit that was
-- never reversed. Fail closed for operator review instead of silently
-- rewriting an immutable financial-audit record.
do $$
begin
  if exists (
    select 1
    from public.decision_pack_credit_adjustments as adjustment
    left join public.one_time_pdf_purchase_claims as claim
      on claim.id = adjustment.claim_id
    where claim.id is null
       or claim.checkout_session_id is distinct from adjustment.checkout_session_id
       or claim.pro_credit_status is distinct from 'reversed'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Decision Pack credit adjustment is not bound to a reversed claim and its Checkout Session',
      hint = 'Review the invalid queue row before rerunning this migration; do not auto-resolve or reattribute financial audit records.';
  end if;
end;
$$;

create or replace function public.enforce_decision_pack_credit_adjustment_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Bind the operational obligation to the exact immutable claim/session pair
  -- and require the ledger's terminal applied -> reversed transition. This
  -- also protects future privileged code paths, not only today's webhook.
  if not exists (
    select 1
    from public.one_time_pdf_purchase_claims as claim
    where claim.id = new.claim_id
      and claim.checkout_session_id = new.checkout_session_id
      and claim.pro_credit_status = 'reversed'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Decision Pack credit adjustment requires the matching reversed claim and Checkout Session';
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  if row(
    new.id,
    new.claim_id,
    new.checkout_session_id,
    new.reason,
    new.created_at
  ) is distinct from row(
    old.id,
    old.claim_id,
    old.checkout_session_id,
    old.reason,
    old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'Decision Pack credit adjustment binding is immutable';
  end if;

  if old.status in ('completed', 'waived') and row(
    new.status,
    new.resolution_reference,
    new.resolution_note,
    new.resolved_at
  ) is distinct from row(
    old.status,
    old.resolution_reference,
    old.resolution_note,
    old.resolved_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'resolved Decision Pack credit adjustment is immutable';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'pending' and new.status in ('completed', 'waived')) then
    raise exception using
      errcode = '23514',
      message = 'invalid Decision Pack credit adjustment transition';
  end if;

  return new;
end;
$$;

drop trigger if exists decision_pack_credit_adjustments_10_enforce_integrity
  on public.decision_pack_credit_adjustments;
create trigger decision_pack_credit_adjustments_10_enforce_integrity
  before insert or update on public.decision_pack_credit_adjustments
  for each row execute function public.enforce_decision_pack_credit_adjustment_integrity();

drop trigger if exists decision_pack_credit_adjustments_set_updated_at
  on public.decision_pack_credit_adjustments;
create trigger decision_pack_credit_adjustments_set_updated_at
  before update on public.decision_pack_credit_adjustments
  for each row execute function public.set_updated_at();

alter table public.decision_pack_credit_adjustments enable row level security;
alter table public.decision_pack_credit_adjustments force row level security;

-- Browser sessions must never read payment-operation state. Service code may
-- create pending rows; resolution is a deliberate support/accounting action.
revoke all on table public.decision_pack_credit_adjustments from public, anon, authenticated;
revoke all on table public.decision_pack_credit_adjustments from service_role;
grant select, insert, update on table public.decision_pack_credit_adjustments to service_role;

-- Verification: pending_count is the support queue that must be brought to 0.
select status, count(*) as adjustment_count
from public.decision_pack_credit_adjustments
group by status
order by status;

commit;
