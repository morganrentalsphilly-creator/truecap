-- Replace legacy depreciation percent with building-based depreciation inputs.
-- Adds tax and interest deduction controls to templates and saved analyses.

alter table public.analysis_templates
  add column if not exists building_value_pct numeric,
  add column if not exists depreciation_years numeric,
  add column if not exists include_interest_deduction boolean,
  add column if not exists tax_rate_pct numeric;

update public.analysis_templates
set
  building_value_pct = coalesce(building_value_pct, 85),
  depreciation_years = coalesce(depreciation_years, 27.5),
  include_interest_deduction = coalesce(include_interest_deduction, true),
  tax_rate_pct = coalesce(tax_rate_pct, 24);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_templates_building_value_pct_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_building_value_pct_check
      check (building_value_pct >= 0 and building_value_pct <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_templates_depreciation_years_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_depreciation_years_check
      check (depreciation_years in (27.5, 39));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_templates_tax_rate_pct_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_tax_rate_pct_check
      check (tax_rate_pct >= 0 and tax_rate_pct <= 100);
  end if;
end $$;

alter table public.analysis_templates
  alter column building_value_pct set not null,
  alter column depreciation_years set not null,
  alter column include_interest_deduction set not null,
  alter column include_interest_deduction set default true,
  alter column tax_rate_pct set not null;

alter table public.analysis_templates
  drop column if exists depreciation_pct;

alter table public.saved_analyses
  add column if not exists building_value_pct numeric,
  add column if not exists depreciation_years numeric,
  add column if not exists include_interest_deduction boolean,
  add column if not exists tax_rate_pct numeric;

update public.saved_analyses
set
  building_value_pct = coalesce(building_value_pct, 85),
  depreciation_years = coalesce(depreciation_years, 27.5),
  include_interest_deduction = coalesce(include_interest_deduction, true),
  tax_rate_pct = coalesce(tax_rate_pct, 24);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_building_value_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_building_value_pct_check
      check (building_value_pct is null or (building_value_pct >= 0 and building_value_pct <= 100));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_depreciation_years_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_depreciation_years_check
      check (depreciation_years is null or depreciation_years in (27.5, 39));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_tax_rate_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_tax_rate_pct_check
      check (tax_rate_pct is null or (tax_rate_pct >= 0 and tax_rate_pct <= 100));
  end if;
end $$;

alter table public.saved_analyses
  drop column if exists depreciation_pct;
