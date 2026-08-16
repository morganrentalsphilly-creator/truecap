-- ============================================================
-- TrueCap acquisition-decision product foundations
--
-- SURFACED FOR REVIEW — do not auto-apply from application code.
-- Safe/additive and idempotent when re-run over the same schema.
--
-- This migration deliberately does not enable any product UI or write path.
-- It only prepares:
--   1. Honest methodology provenance for saved analyses.
--   2. Owner-scoped, revisioned Financing Profiles and frozen-use fields.
--   3. The expanded acquisition-specific pipeline vocabulary.
--   4. Database-enforced ownership of Agent Pro client references.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) Underwriting methodology provenance
-- ---------------------------------------------------------------------------

alter table public.saved_analyses
  add column if not exists methodology_version text;

comment on column public.saved_analyses.methodology_version is
  'Underwriting methodology used to produce the saved result. Existing rows are explicitly legacy-unversioned; new application writes should persist the current version.';

-- Do not pretend historical calculations used TrueCap Underwriting Standard
-- v1.0. A literal legacy marker is more honest than either a silent NULL or a
-- fabricated version. The column remains nullable for backward-compatible
-- deploy ordering, but all rows that predate version-aware writes are marked.
update public.saved_analyses
set methodology_version = 'legacy-unversioned'
where methodology_version is null;

-- ---------------------------------------------------------------------------
-- 2) Reusable Financing Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.financing_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  loan_type text not null default 'custom',

  -- Engine-aligned terms. Nullable financial fields preserve the distinction
  -- between "not supplied" and a verified zero (important for confidence).
  interest_rate_pct numeric,
  down_payment_pct numeric,
  ltv_pct numeric,
  amortization_years numeric,
  loan_term_years numeric,
  points_pct numeric,
  lender_fees numeric,
  closing_costs_pct numeric,
  interest_only_months integer,
  pmi_annual_rate_pct numeric,
  pmi_no_cancel boolean,

  lender_name text,
  notes text,
  last_verified_at timestamptz,
  is_active boolean not null default true,
  is_default boolean not null default false,

  -- Incremented by a trigger only when a term/provenance field changes. A
  -- saved analysis can retain this revision plus a JSON snapshot, so editing a
  -- reusable profile never rewrites the assumptions behind an old decision.
  terms_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint financing_profiles_name_check
    check (char_length(btrim(name)) between 1 and 100),
  constraint financing_profiles_loan_type_check
    check (char_length(btrim(loan_type)) between 1 and 60),
  constraint financing_profiles_interest_rate_check
    check (interest_rate_pct is null or interest_rate_pct between 0 and 30),
  constraint financing_profiles_down_payment_check
    check (down_payment_pct is null or down_payment_pct between 0 and 100),
  constraint financing_profiles_ltv_check
    check (ltv_pct is null or ltv_pct between 0 and 100),
  constraint financing_profiles_ltv_down_payment_check
    check (
      ltv_pct is null
      or down_payment_pct is null
      or abs((ltv_pct + down_payment_pct) - 100) <= 0.01
    ),
  constraint financing_profiles_amortization_check
    check (amortization_years is null or amortization_years between 1 and 50),
  constraint financing_profiles_loan_term_check
    check (loan_term_years is null or loan_term_years > 0 and loan_term_years <= 50),
  constraint financing_profiles_points_check
    check (points_pct is null or points_pct between 0 and 100),
  constraint financing_profiles_lender_fees_check
    check (lender_fees is null or lender_fees >= 0),
  constraint financing_profiles_closing_costs_check
    check (closing_costs_pct is null or closing_costs_pct between 0 and 100),
  constraint financing_profiles_interest_only_check
    check (
      interest_only_months is null
      or interest_only_months >= 0
        and (loan_term_years is null or interest_only_months <= loan_term_years * 12)
    ),
  constraint financing_profiles_pmi_rate_check
    check (pmi_annual_rate_pct is null or pmi_annual_rate_pct between 0 and 5),
  constraint financing_profiles_terms_version_check
    check (terms_version >= 1),
  constraint financing_profiles_default_active_check
    check (not is_default or is_active),
  constraint financing_profiles_lender_name_check
    check (lender_name is null or char_length(lender_name) <= 160),
  constraint financing_profiles_notes_check
    check (notes is null or char_length(notes) <= 5000)
);

comment on table public.financing_profiles is
  'Reusable owner-scoped lender terms. Application code should snapshot applied terms into saved_analyses instead of treating this mutable row as historical truth.';
comment on column public.financing_profiles.lender_fees is
  'Up-front lender fees in the analysis currency; separate from percentage points and closing costs.';
comment on column public.financing_profiles.last_verified_at is
  'When the user last confirmed these terms with a credible source; NULL means unverified/unknown.';

create index if not exists financing_profiles_user_active_idx
  on public.financing_profiles (user_id, is_active, updated_at desc);

-- At most one default per owner. This is a partial unique index so users may
-- keep any number of non-default profiles.
create unique index if not exists financing_profiles_one_default_idx
  on public.financing_profiles (user_id)
  where is_default;

-- Keep the revision trustworthy even if a caller writes through Supabase
-- directly. Cosmetic changes (display name, notes, active/default state) do
-- not change the financial revision; term/source changes do.
create or replace function public.set_financing_profile_terms_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.terms_version := 1;
  elsif row(
    new.loan_type,
    new.interest_rate_pct,
    new.down_payment_pct,
    new.ltv_pct,
    new.amortization_years,
    new.loan_term_years,
    new.points_pct,
    new.lender_fees,
    new.closing_costs_pct,
    new.interest_only_months,
    new.pmi_annual_rate_pct,
    new.pmi_no_cancel,
    new.lender_name,
    new.last_verified_at
  ) is distinct from row(
    old.loan_type,
    old.interest_rate_pct,
    old.down_payment_pct,
    old.ltv_pct,
    old.amortization_years,
    old.loan_term_years,
    old.points_pct,
    old.lender_fees,
    old.closing_costs_pct,
    old.interest_only_months,
    old.pmi_annual_rate_pct,
    old.pmi_no_cancel,
    old.lender_name,
    old.last_verified_at
  ) then
    new.terms_version := old.terms_version + 1;
  else
    new.terms_version := old.terms_version;
  end if;
  return new;
end;
$$;

drop trigger if exists financing_profiles_10_set_terms_version
  on public.financing_profiles;
create trigger financing_profiles_10_set_terms_version
  before insert or update on public.financing_profiles
  for each row execute function public.set_financing_profile_terms_version();

-- Reuse the shared helper introduced by the base schema.
drop trigger if exists financing_profiles_90_set_updated_at
  on public.financing_profiles;
create trigger financing_profiles_90_set_updated_at
  before update on public.financing_profiles
  for each row execute function public.set_updated_at();

alter table public.financing_profiles enable row level security;

drop policy if exists "financing_profiles_select_own" on public.financing_profiles;
create policy "financing_profiles_select_own"
  on public.financing_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "financing_profiles_insert_own" on public.financing_profiles;
create policy "financing_profiles_insert_own"
  on public.financing_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "financing_profiles_update_own" on public.financing_profiles;
create policy "financing_profiles_update_own"
  on public.financing_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "financing_profiles_delete_own" on public.financing_profiles;
create policy "financing_profiles_delete_own"
  on public.financing_profiles for delete
  using (auth.uid() = user_id);

-- Origin + immutable-at-use snapshot fields. All are nullable so the schema
-- can deploy ahead of application writes and legacy deals remain readable.
-- ON DELETE SET NULL removes only the live origin link; the frozen version and
-- snapshot remain on the analysis.
alter table public.saved_analyses
  add column if not exists financing_profile_id uuid
    references public.financing_profiles(id) on delete set null,
  add column if not exists financing_profile_version integer,
  add column if not exists financing_profile_snapshot jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_analyses'::regclass
      and conname = 'saved_analyses_financing_profile_version_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_financing_profile_version_check
      check (financing_profile_version is null or financing_profile_version >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_analyses'::regclass
      and conname = 'saved_analyses_financing_profile_snapshot_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_financing_profile_snapshot_check
      check (
        financing_profile_snapshot is null
        or jsonb_typeof(financing_profile_snapshot) = 'object'
      )
      not valid;
  end if;
end $$;

alter table public.saved_analyses
  validate constraint saved_analyses_financing_profile_version_check;
alter table public.saved_analyses
  validate constraint saved_analyses_financing_profile_snapshot_check;

create index if not exists saved_analyses_financing_profile_idx
  on public.saved_analyses (financing_profile_id)
  where financing_profile_id is not null;

-- A profile origin link must always belong to the saved analysis owner. The
-- frozen snapshot itself is user-authored underwriting data and deliberately
-- remains readable after the reusable profile is deleted.
create or replace function public.enforce_owned_financing_profile_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.financing_profile_id is not null
     and not exists (
       select 1
       from public.financing_profiles profile
       where profile.id = new.financing_profile_id
         and profile.user_id = new.user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'financing_profile_id must reference a profile owned by the saved analysis owner';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_owned_financing_profile_reference() from public;

drop trigger if exists saved_analyses_financing_profile_owner_guard
  on public.saved_analyses;
create trigger saved_analyses_financing_profile_owner_guard
  before insert or update of user_id, financing_profile_id
  on public.saved_analyses
  for each row execute function public.enforce_owned_financing_profile_reference();

-- Treat the frozen financing provenance as an integrity boundary, not as an
-- arbitrary JSON field an authenticated client may rewrite through PostgREST.
-- A new/replaced snapshot must be the owner's exact current profile revision.
-- An already-frozen older revision may remain byte-for-byte unchanged while
-- the rest of the analysis is edited; deleting/unlinking the live profile is
-- also allowed without erasing that historical record.
create or replace function public.enforce_financing_profile_snapshot_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile public.financing_profiles%rowtype;
  expected_snapshot jsonb;
  applied_at timestamptz;
begin
  if new.financing_profile_id is null
     and new.financing_profile_version is null
     and new.financing_profile_snapshot is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.financing_profile_version is not distinct from old.financing_profile_version
     and new.financing_profile_snapshot is not distinct from old.financing_profile_snapshot
     and (
       new.financing_profile_id is not distinct from old.financing_profile_id
       or new.financing_profile_id is null
     ) then
    return new;
  end if;

  if new.financing_profile_id is null
     or new.financing_profile_version is null
     or new.financing_profile_snapshot is null then
    raise exception using
      errcode = '23514',
      message = 'financing profile provenance must be fully linked or fully cleared';
  end if;

  select *
    into profile
    from public.financing_profiles candidate
   where candidate.id = new.financing_profile_id
     and candidate.user_id = new.user_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'financing profile provenance must reference an owned profile';
  end if;

  expected_snapshot := jsonb_build_object(
    'profileId', profile.id,
    'termsVersion', profile.terms_version,
    'name', profile.name,
    'loanType', profile.loan_type,
    'interestRatePct', profile.interest_rate_pct,
    'downPaymentPct', profile.down_payment_pct,
    'ltvPct', profile.ltv_pct,
    'amortizationYears', profile.amortization_years,
    'loanTermYears', profile.loan_term_years,
    'pointsPct', profile.points_pct,
    'lenderFees', profile.lender_fees,
    'closingCostsPct', profile.closing_costs_pct,
    'interestOnlyMonths', profile.interest_only_months,
    'pmiAnnualRatePct', profile.pmi_annual_rate_pct,
    'pmiNoCancel', profile.pmi_no_cancel,
    'lenderName', profile.lender_name,
    'notes', profile.notes,
    -- rowToFinancingProfile() canonicalizes database timestamps with
    -- JavaScript Date#toISOString(): UTC, a literal Z, and millisecond
    -- precision. Match that representation here so an honest app-produced
    -- snapshot is not rejected because PostgreSQL rendered the same instant
    -- with an offset or additional fractional digits. Every other field
    -- remains part of the exact JSONB comparison below.
    'lastVerifiedAt', case
      when profile.last_verified_at is null then null
      else to_char(
        profile.last_verified_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    end,
    'isActive', profile.is_active,
    'isDefault', profile.is_default
  );

  if new.financing_profile_version <> profile.terms_version
     or new.financing_profile_snapshot - 'appliedAt' <> expected_snapshot then
    raise exception using
      errcode = '23514',
      message = 'financing profile provenance must match the current stored revision';
  end if;

  begin
    applied_at := (new.financing_profile_snapshot ->> 'appliedAt')::timestamptz;
  exception when others then
    raise exception using
      errcode = '23514',
      message = 'financing profile appliedAt must be a valid timestamp';
  end;

  if applied_at < statement_timestamp() - interval '10 minutes'
     or applied_at > statement_timestamp() + interval '1 minute' then
    raise exception using
      errcode = '23514',
      message = 'new financing profile provenance must use the current application time';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_financing_profile_snapshot_integrity() from public;

drop trigger if exists saved_analyses_financing_profile_snapshot_guard
  on public.saved_analyses;
create trigger saved_analyses_financing_profile_snapshot_guard
  before insert or update of
    user_id,
    financing_profile_id,
    financing_profile_version,
    financing_profile_snapshot
  on public.saved_analyses
  for each row execute function public.enforce_financing_profile_snapshot_integrity();

-- ---------------------------------------------------------------------------
-- 3) Expanded, acquisition-specific saved-deal pipeline
-- ---------------------------------------------------------------------------

-- Keep every legacy value while adding the requested finer-grained stages.
-- The existing `offer` value is retained and labeled "Offer made" by the app;
-- do not add a database-only synonym that the typed application cannot read.
alter table public.saved_analyses
  drop constraint if exists saved_analyses_pipeline_stage_check;

alter table public.saved_analyses
  add constraint saved_analyses_pipeline_stage_check
  check (
    pipeline_stage is null
    or pipeline_stage in (
      'researching',
      'watching',
      'screening',
      'analyzing',
      'verifying',
      'offer_ready',
      'offer',
      'negotiating',
      'under_contract',
      'passed',
      'closed'
    )
  ) not valid;

alter table public.saved_analyses
  validate constraint saved_analyses_pipeline_stage_check;

-- ---------------------------------------------------------------------------
-- 4) Agent Pro client-reference ownership integrity
-- ---------------------------------------------------------------------------

-- App actions already check this relationship, but a foreign key alone only
-- proves the client UUID exists. These triggers make the tenant relationship
-- an invariant for authenticated, service-role, and future write paths.
create or replace function public.enforce_owned_agent_client_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.client_id is not null
     and not exists (
       select 1
       from public.agent_clients client
       where client.id = new.client_id
         and client.agent_user_id = new.user_id
     ) then
    raise exception using
      errcode = '23514',
      message = format('%s.client_id must reference a client owned by the row owner', tg_table_name);
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_owned_agent_client_reference() from public;

-- Fail safely rather than silently clearing any unexpected cross-owner legacy
-- reference. Current application writes already enforce ownership, so this is
-- expected to be a no-op; if it fires, inspect and repair the named data before
-- applying the migration again.
do $$
begin
  if exists (
    select 1
    from public.saved_analyses analysis
    join public.agent_clients client on client.id = analysis.client_id
    where client.agent_user_id <> analysis.user_id
  ) or exists (
    select 1
    from public.user_buy_boxes buy_box
    join public.agent_clients client on client.id = buy_box.client_id
    where client.agent_user_id <> buy_box.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cross-owner Agent Pro client references exist',
      hint = 'Inspect saved_analyses.client_id and user_buy_boxes.client_id before retrying this migration.';
  end if;
end $$;

drop trigger if exists saved_analyses_client_owner_guard
  on public.saved_analyses;
create trigger saved_analyses_client_owner_guard
  before insert or update of user_id, client_id
  on public.saved_analyses
  for each row execute function public.enforce_owned_agent_client_reference();

drop trigger if exists user_buy_boxes_client_owner_guard
  on public.user_buy_boxes;
create trigger user_buy_boxes_client_owner_guard
  before insert or update of user_id, client_id
  on public.user_buy_boxes
  for each row execute function public.enforce_owned_agent_client_reference();
