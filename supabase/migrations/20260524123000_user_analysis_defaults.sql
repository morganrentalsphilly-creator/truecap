-- Per-user defaults for new analyses. Lets power users set their own
-- preferred vacancy %, management fee, maintenance reserve, etc. so new
-- deals auto-populate with their actual numbers instead of the generic
-- defaults.
--
-- One row per user (1:1 with auth.users). Stored as a single jsonb so
-- we can add new preference keys over time without further migrations.
-- Schema enforcement happens in the app layer via a zod schema.
--
-- Expected shape (zod-validated at write time):
--   {
--     "downPaymentPct": number,
--     "loanTermYears": number,
--     "vacancyPct": number,
--     "mgmtPct": number,
--     "maintenancePct": number,
--     "capexPct": number,
--     "closingCostsPct": number,
--     "taxRatePct": number,
--     "rentGrowthPct": number,
--     "expenseGrowthPct": number,
--     "appreciationRatePct": number,
--     "sellingCostPct": number
--   }
--
-- All keys are optional — the merge order in the app is:
--   buildNewAnalysisDefaults(propertyType)
--     → overlaid with any matching keys from user_analysis_defaults.preferences
--     → form initializes from the merged result.
--
-- After applying this migration, the corresponding code wiring in
-- components/investcalc/investcalc-page.tsx (planned, not yet shipped)
-- and a new /settings page section will start reading/writing this row.

create table if not exists public.user_analysis_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_analysis_defaults is
  'Per-user analysis form defaults — overlays generic defaults so users do not retype their assumptions per deal.';

-- Auto-touch updated_at on any update.
create or replace function public.set_user_analysis_defaults_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_analysis_defaults_updated_at on public.user_analysis_defaults;
create trigger trg_user_analysis_defaults_updated_at
before update on public.user_analysis_defaults
for each row
execute function public.set_user_analysis_defaults_updated_at();

-- RLS: owner-only.
alter table public.user_analysis_defaults enable row level security;

drop policy if exists "user_analysis_defaults_select_own" on public.user_analysis_defaults;
create policy "user_analysis_defaults_select_own"
  on public.user_analysis_defaults
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_analysis_defaults_insert_own" on public.user_analysis_defaults;
create policy "user_analysis_defaults_insert_own"
  on public.user_analysis_defaults
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_analysis_defaults_update_own" on public.user_analysis_defaults;
create policy "user_analysis_defaults_update_own"
  on public.user_analysis_defaults
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy — preferences should rarely be deleted; cascade from
-- auth.users handles account-deletion cleanup.
