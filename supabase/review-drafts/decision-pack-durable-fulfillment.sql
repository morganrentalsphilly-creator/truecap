-- ============================================================
-- Durable Deal Decision Pack fulfillment foundation
-- TRUECAP_DRAFT_SQL: DO_NOT_APPLY
--
-- NOT APPLIED / SURFACED FOR REVIEW. Do not auto-apply this migration.
--
-- This migration is expand-only: it adds a server-only purchase snapshot,
-- immutable artifact metadata, hashed recovery grants, and a private PDF
-- bucket. Stripe delivery idempotency continues to use the existing
-- stripe_webhook_events ledger and claim lease. It does not change the $5 Price, create a
-- Checkout Session, subscribe a live webhook, send email, or activate a new
-- fulfillment path. The application must continue to fail closed until the
-- activation gates in docs/DECISION-PACK-DURABLE-FULFILLMENT-RUNBOOK.md pass.
--
-- Idempotency: all DDL runs in one transaction; tables/indexes/bucket use
-- IF NOT EXISTS / ON CONFLICT DO NOTHING, and triggers are replaced by name.
-- A conflicting pre-existing bucket causes the transaction to fail rather
-- than silently weakening its privacy or MIME/size controls.
-- ============================================================

begin;

do $$
begin
  if to_regclass('public.one_time_pdf_purchase_claims') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_fulfillments requires one_time_pdf_purchase_claims';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_fulfillments requires public.set_updated_at()';
  end if;
  if to_regclass('public.stripe_webhook_events') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_fulfillments requires stripe_webhook_events';
  end if;
  if to_regclass('storage.buckets') is null then
    raise exception using
      errcode = '55000',
      message = 'decision_pack_artifacts requires Supabase Storage';
  end if;
end;
$$;

-- One row is the durable, immutable purchase authority. The three JSON
-- snapshots are intentionally private because they can contain an address and
-- financial assumptions. snapshot_sha256 is computed over a documented,
-- canonical object containing all snapshots and version/source columns.
create table if not exists public.decision_pack_fulfillments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique
    references public.one_time_pdf_purchase_claims(id) on delete restrict,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text unique,

  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  target_snapshot jsonb not null,
  snapshot_sha256 text not null,
  snapshot_contract_version text not null,
  input_schema_version integer not null,
  model_version text not null,
  methodology_version text not null,
  target_contract_version text not null,
  target_source text not null,

  claimed_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,

  payment_status text not null default 'open',
  fulfillment_status text not null default 'pending',
  delivery_status text not null default 'not_attempted',
  access_status text not null default 'not_ready',
  dispute_status text not null default 'none',
  amount_paid_cents bigint,
  currency text,
  paid_at timestamptz,
  refunded_amount_cents bigint not null default 0,
  refund_recorded_at timestamptz,
  dispute_updated_at timestamptz,
  fulfilled_at timestamptz,
  delivered_at timestamptz,
  last_delivery_attempt_at timestamptz,
  fulfillment_attempt_count integer not null default 0,
  delivery_attempt_count integer not null default 0,
  last_error_code text,
  next_reconciliation_at timestamptz,
  last_reconciled_at timestamptz,
  last_stripe_event_id text
    references public.stripe_webhook_events(stripe_event_id) on delete restrict,
  last_stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint decision_pack_checkout_session_check
    check (stripe_checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  constraint decision_pack_payment_intent_check
    check (
      stripe_payment_intent_id is null
      or stripe_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'
    ),
  constraint decision_pack_snapshot_shapes_check
    check (
      jsonb_typeof(input_snapshot) = 'object'
      and jsonb_typeof(result_snapshot) = 'object'
      and jsonb_typeof(target_snapshot) = 'object'
    ),
  constraint decision_pack_snapshot_sha_check
    check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  constraint decision_pack_versions_check
    check (
      input_schema_version >= 1
      and char_length(snapshot_contract_version) between 1 and 80
      and char_length(model_version) between 1 and 80
      and char_length(methodology_version) between 1 and 80
      and char_length(target_contract_version) between 1 and 80
      and char_length(target_source) between 1 and 80
    ),
  constraint decision_pack_payment_status_check
    check (payment_status in ('open', 'paid', 'failed', 'partially_refunded', 'refunded')),
  constraint decision_pack_fulfillment_status_check
    check (fulfillment_status in ('pending', 'rendering', 'fulfilled', 'failed', 'blocked')),
  constraint decision_pack_delivery_status_check
    check (delivery_status in ('not_attempted', 'pending', 'sent', 'failed')),
  constraint decision_pack_access_status_check
    check (access_status in ('not_ready', 'available', 'suspended', 'revoked')),
  constraint decision_pack_dispute_status_check
    check (dispute_status in ('none', 'warning_needs_response', 'under_review', 'won', 'lost')),
  constraint decision_pack_payment_facts_check
    check (
      (
        payment_status in ('open', 'failed')
        and paid_at is null
        and amount_paid_cents is null
        and currency is null
      )
      or
      (
        payment_status in ('paid', 'partially_refunded', 'refunded')
        and stripe_payment_intent_id is not null
        and paid_at is not null
        -- CHECK constraints accept UNKNOWN, so the explicit null guards are
        -- required in addition to the value predicates below. A paid row must
        -- never pass with incomplete Stripe amount/currency facts.
        and amount_paid_cents is not null
        and amount_paid_cents > 0
        and currency is not null
        and currency ~ '^[a-z]{3}$'
      )
    ),
  constraint decision_pack_refund_facts_check
    check (
      (
        payment_status in ('open', 'failed', 'paid')
        and refunded_amount_cents = 0
        and refund_recorded_at is null
      )
      or (
        payment_status = 'partially_refunded'
        and refunded_amount_cents between 1 and amount_paid_cents - 1
        and refund_recorded_at is not null
      )
      or (
        payment_status = 'refunded'
        and refunded_amount_cents = amount_paid_cents
        and refund_recorded_at is not null
      )
    ),
  constraint decision_pack_dispute_facts_check
    check (
      (dispute_status = 'none' and dispute_updated_at is null)
      or (dispute_status <> 'none' and paid_at is not null and dispute_updated_at is not null)
    ),
  constraint decision_pack_last_event_check
    check (
      (last_stripe_event_id is null and last_stripe_event_created_at is null)
      or (last_stripe_event_id is not null and last_stripe_event_created_at is not null)
    ),
  constraint decision_pack_account_claim_check
    check (claimed_user_id is null or claimed_at is not null),
  constraint decision_pack_attempt_counts_check
    check (fulfillment_attempt_count >= 0 and delivery_attempt_count >= 0),
  constraint decision_pack_error_code_check
    check (last_error_code is null or char_length(last_error_code) between 1 and 128),
  constraint decision_pack_lifecycle_times_check
    check (
      (refund_recorded_at is null or refund_recorded_at >= paid_at)
      and (dispute_updated_at is null or dispute_updated_at >= paid_at)
      and (
        fulfilled_at is null
        or (paid_at is not null and fulfilled_at >= paid_at)
      )
      and (
        delivered_at is null
        or (fulfilled_at is not null and delivered_at >= fulfilled_at)
      )
      and (
        last_delivery_attempt_at is null
        or (paid_at is not null and last_delivery_attempt_at >= paid_at)
      )
    )
);

comment on table public.decision_pack_fulfillments is
  'Server-only durable Deal Decision Pack authority. Binds one Stripe purchase to immutable inputs, results, target, target source, model, methodology, and schema versions; lifecycle fields are operational state only.';
comment on column public.decision_pack_fulfillments.snapshot_sha256 is
  'SHA-256 of canonical decision-pack.snapshot.v1 content. Canonicalization and recomputation requirements are defined in the activation runbook.';
comment on column public.decision_pack_fulfillments.access_status is
  'Retrieval state only. Refund/dispute transitions require an approved business/legal policy; this schema deliberately does not choose one.';

create index if not exists decision_pack_fulfillment_recovery_queue_idx
  on public.decision_pack_fulfillments (
    payment_status,
    fulfillment_status,
    delivery_status,
    next_reconciliation_at
  )
  where payment_status in ('paid', 'partially_refunded')
    and (fulfillment_status <> 'fulfilled' or delivery_status = 'failed');

-- One immutable PDF artifact per paid snapshot. No signed URL is persisted;
-- retrieval mints a short-lived URL only after server-side authorization.
create table if not exists public.decision_pack_artifacts (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null unique
    references public.decision_pack_fulfillments(id) on delete restrict,
  bucket_id text not null default 'decision-pack-artifacts',
  object_path text not null unique,
  content_sha256 text not null,
  snapshot_sha256 text not null,
  byte_size bigint not null,
  mime_type text not null default 'application/pdf',
  renderer_version text not null,
  render_contract_version text not null,
  created_at timestamptz not null default now(),

  constraint decision_pack_artifact_bucket_check
    check (bucket_id = 'decision-pack-artifacts'),
  constraint decision_pack_artifact_path_check
    check (
      char_length(object_path) between 1 and 512
      and object_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and object_path !~ '(^/|[.][.])'
    ),
  constraint decision_pack_artifact_content_sha_check
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint decision_pack_artifact_snapshot_sha_check
    check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  constraint decision_pack_artifact_size_check
    check (byte_size between 1 and 10485760),
  constraint decision_pack_artifact_mime_check
    check (mime_type = 'application/pdf'),
  constraint decision_pack_artifact_versions_check
    check (
      char_length(renderer_version) between 1 and 80
      and char_length(render_contract_version) between 1 and 80
    )
);

comment on table public.decision_pack_artifacts is
  'Append-only private PDF artifact metadata. The storage object is immutable and must match both content_sha256 and the fulfillment snapshot_sha256.';

-- Email/account recovery links carry a random plaintext capability once; the
-- database stores only its SHA-256 digest. A grant can support bounded repeat
-- retrieval without exposing a Stripe Session id as a bearer credential.
create table if not exists public.decision_pack_recovery_grants (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null
    references public.decision_pack_fulfillments(id) on delete restrict,
  token_hash text not null unique,
  purpose text not null,
  expires_at timestamptz not null,
  max_uses integer not null,
  use_count integer not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),

  constraint decision_pack_recovery_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint decision_pack_recovery_purpose_check
    check (purpose in ('artifact_retrieval', 'account_claim', 'support_recovery')),
  constraint decision_pack_recovery_window_check
    check (expires_at > created_at),
  constraint decision_pack_recovery_uses_check
    check (max_uses > 0 and use_count between 0 and max_uses),
  constraint decision_pack_recovery_last_used_check
    check (
      (use_count = 0 and last_used_at is null)
      or (use_count > 0 and last_used_at is not null)
    ),
  constraint decision_pack_recovery_times_check
    check (
      (last_used_at is null or last_used_at >= created_at)
      and (revoked_at is null or revoked_at >= created_at)
    )
);

comment on table public.decision_pack_recovery_grants is
  'Server-only hashed recovery capabilities. Never store or log plaintext tokens; never use a Stripe Session id as a retrieval token.';

create index if not exists decision_pack_recovery_grant_expiry_idx
  on public.decision_pack_recovery_grants (expires_at)
  where revoked_at is null;

-- The existing claim remains the checkout authority. Copying its Session id
-- into a durable fulfillment is allowed only when the pair exactly matches.
-- All purchase/snapshot binding fields are immutable thereafter.
create or replace function public.enforce_decision_pack_fulfillment_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_session_id text;
begin
  select c.checkout_session_id
    into expected_session_id
    from public.one_time_pdf_purchase_claims c
   where c.id = new.claim_id;

  if expected_session_id is null
     or expected_session_id is distinct from new.stripe_checkout_session_id then
    raise exception using
      errcode = '23514',
      message = 'Decision Pack claim and Checkout Session do not match';
  end if;

  -- A newly-bound account claim is an atomic user/timestamp pair. The update
  -- path below deliberately permits the user id to become null while retaining
  -- claimed_at (the FK uses ON DELETE SET NULL), but an insert must not begin
  -- life in that tombstoned state.
  if tg_op = 'INSERT'
     and ((new.claimed_user_id is null) <> (new.claimed_at is null)) then
    raise exception using errcode = '23514', message = 'Decision Pack account claim must be atomic';
  end if;

  if tg_op = 'UPDATE' then
    if row(
      new.id,
      new.claim_id,
      new.stripe_checkout_session_id,
      new.input_snapshot,
      new.result_snapshot,
      new.target_snapshot,
      new.snapshot_sha256,
      new.snapshot_contract_version,
      new.input_schema_version,
      new.model_version,
      new.methodology_version,
      new.target_contract_version,
      new.target_source,
      new.created_at
    ) is distinct from row(
      old.id,
      old.claim_id,
      old.stripe_checkout_session_id,
      old.input_snapshot,
      old.result_snapshot,
      old.target_snapshot,
      old.snapshot_sha256,
      old.snapshot_contract_version,
      old.input_schema_version,
      old.model_version,
      old.methodology_version,
      old.target_contract_version,
      old.target_source,
      old.created_at
    ) then
      raise exception using
        errcode = '23514',
        message = 'Decision Pack purchase snapshot binding is immutable';
    end if;

    if old.stripe_payment_intent_id is not null
       and new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id then
      raise exception using errcode = '23514', message = 'Decision Pack PaymentIntent is immutable';
    end if;
    if old.claimed_user_id is not null
       and new.claimed_user_id is not null
       and new.claimed_user_id is distinct from old.claimed_user_id then
      raise exception using errcode = '23514', message = 'Decision Pack account claim cannot be reassigned';
    end if;
    -- claimed_at is the durable one-way marker even after auth-user deletion
    -- clears claimed_user_id through the FK. Never allow service code to erase
    -- that marker and make the purchase claimable by another account.
    if old.claimed_at is not null
       and new.claimed_at is distinct from old.claimed_at then
      raise exception using errcode = '23514', message = 'Decision Pack account claim timestamp is immutable';
    end if;
    if old.claimed_user_id is null
       and old.claimed_at is null
       and ((new.claimed_user_id is null) <> (new.claimed_at is null)) then
      raise exception using errcode = '23514', message = 'Decision Pack account claim must be atomic';
    end if;
    if old.claimed_user_id is null
       and new.claimed_user_id is not null
       and (old.claimed_at is not null or new.claimed_at is null) then
      raise exception using errcode = '23514', message = 'Decision Pack account claim must be atomic';
    end if;
    if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
      raise exception using errcode = '23514', message = 'Decision Pack paid_at is immutable';
    end if;
    if old.amount_paid_cents is not null
       and new.amount_paid_cents is distinct from old.amount_paid_cents then
      raise exception using errcode = '23514', message = 'Decision Pack paid amount is immutable';
    end if;
    if old.currency is not null and new.currency is distinct from old.currency then
      raise exception using errcode = '23514', message = 'Decision Pack currency is immutable';
    end if;
    if new.refunded_amount_cents < old.refunded_amount_cents then
      raise exception using errcode = '23514', message = 'Decision Pack refunded amount cannot decrease';
    end if;
    if new.fulfillment_attempt_count < old.fulfillment_attempt_count
       or new.delivery_attempt_count < old.delivery_attempt_count then
      raise exception using errcode = '23514', message = 'Decision Pack attempt counters cannot decrease';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_decision_pack_artifact_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_snapshot_sha256 text;
begin
  if tg_op <> 'INSERT' then
    raise exception using errcode = '23514', message = 'Decision Pack artifacts are append-only';
  end if;

  select f.snapshot_sha256
    into expected_snapshot_sha256
    from public.decision_pack_fulfillments f
   where f.id = new.fulfillment_id;

  if expected_snapshot_sha256 is null
     or expected_snapshot_sha256 is distinct from new.snapshot_sha256 then
    raise exception using errcode = '23514', message = 'Decision Pack artifact snapshot does not match purchase';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_decision_pack_recovery_grant_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.id,
    new.fulfillment_id,
    new.token_hash,
    new.purpose,
    new.expires_at,
    new.max_uses,
    new.created_at
  ) is distinct from row(
    old.id,
    old.fulfillment_id,
    old.token_hash,
    old.purpose,
    old.expires_at,
    old.max_uses,
    old.created_at
  ) then
    raise exception using errcode = '23514', message = 'Decision Pack recovery binding is immutable';
  end if;
  if new.use_count < old.use_count then
    raise exception using errcode = '23514', message = 'Decision Pack recovery use count cannot decrease';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception using errcode = '23514', message = 'Decision Pack recovery revocation is immutable';
  end if;
  if old.last_used_at is not null
     and (new.last_used_at is null or new.last_used_at < old.last_used_at) then
    raise exception using errcode = '23514', message = 'Decision Pack recovery last-used time cannot move backward';
  end if;
  return new;
end;
$$;

drop trigger if exists decision_pack_fulfillments_10_enforce_binding
  on public.decision_pack_fulfillments;
create trigger decision_pack_fulfillments_10_enforce_binding
  before insert or update on public.decision_pack_fulfillments
  for each row execute function public.enforce_decision_pack_fulfillment_binding();

drop trigger if exists decision_pack_fulfillments_90_set_updated_at
  on public.decision_pack_fulfillments;
create trigger decision_pack_fulfillments_90_set_updated_at
  before update on public.decision_pack_fulfillments
  for each row execute function public.set_updated_at();

drop trigger if exists decision_pack_artifacts_10_enforce_binding
  on public.decision_pack_artifacts;
create trigger decision_pack_artifacts_10_enforce_binding
  before insert or update or delete on public.decision_pack_artifacts
  for each row execute function public.enforce_decision_pack_artifact_binding();

drop trigger if exists decision_pack_recovery_grants_10_enforce_integrity
  on public.decision_pack_recovery_grants;
create trigger decision_pack_recovery_grants_10_enforce_integrity
  before update on public.decision_pack_recovery_grants
  for each row execute function public.enforce_decision_pack_recovery_grant_integrity();

-- All three ledgers are server-only. There are intentionally no end-user RLS
-- policies; authenticated retrieval must pass through a server authorization
-- path, and emailed recovery must verify a hashed grant before signing a URL.
alter table public.decision_pack_fulfillments enable row level security;
alter table public.decision_pack_fulfillments force row level security;
alter table public.decision_pack_artifacts enable row level security;
alter table public.decision_pack_artifacts force row level security;
alter table public.decision_pack_recovery_grants enable row level security;
alter table public.decision_pack_recovery_grants force row level security;

revoke all on table public.decision_pack_fulfillments from public, anon, authenticated, service_role;
revoke all on table public.decision_pack_artifacts from public, anon, authenticated, service_role;
revoke all on table public.decision_pack_recovery_grants from public, anon, authenticated, service_role;

grant select, insert, update on table public.decision_pack_fulfillments to service_role;
grant select, insert on table public.decision_pack_artifacts to service_role;
grant select, insert, update on table public.decision_pack_recovery_grants to service_role;

revoke all on function public.enforce_decision_pack_fulfillment_binding() from public, anon, authenticated;
revoke all on function public.enforce_decision_pack_artifact_binding() from public, anon, authenticated;
revoke all on function public.enforce_decision_pack_recovery_grant_integrity() from public, anon, authenticated;

grant execute on function public.enforce_decision_pack_fulfillment_binding() to service_role;
grant execute on function public.enforce_decision_pack_artifact_binding() to service_role;
grant execute on function public.enforce_decision_pack_recovery_grant_integrity() to service_role;

-- Private bucket with no anon/authenticated storage.objects policies. Service
-- role code writes immutable objects and signs short-lived retrieval URLs.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'decision-pack-artifacts',
  'decision-pack-artifacts',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1
      from storage.buckets
     where id = 'decision-pack-artifacts'
       and (
         public is distinct from false
         or file_size_limit is distinct from 10485760
         or allowed_mime_types is distinct from array['application/pdf']::text[]
       )
  ) then
    raise exception using
      errcode = '55000',
      message = 'decision-pack-artifacts bucket exists with an unsafe or incompatible configuration';
  end if;
end;
$$;

commit;

-- --------------------------------------------------------------------------
-- ROLLBACK / DISABLEMENT (REVIEW ONLY — DO NOT RUN WITH PAID DATA)
--
-- Before activation and only when all three tables and the bucket are empty,
-- a reviewed rollback may drop, in order: recovery grants, artifact metadata,
-- fulfillment rows, their trigger functions, then the
-- empty storage bucket. After any checkout is bound or artifact is written,
-- destructive rollback is prohibited: disable the runtime creation gate,
-- preserve webhook/retrieval for already-paid buyers, and retain all rows and
-- objects for reconciliation. Exact activation and rollback steps are in:
-- docs/DECISION-PACK-DURABLE-FULFILLMENT-RUNBOOK.md
-- --------------------------------------------------------------------------
