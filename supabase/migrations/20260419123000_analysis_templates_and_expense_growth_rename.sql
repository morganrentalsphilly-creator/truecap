-- Analysis templates for default calculation presets.
-- Also renames inflation naming to expense growth in saved analyses.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_analyses'
      and column_name = 'inflation_rate_pct'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_analyses'
      and column_name = 'expense_growth_pct'
  ) then
    alter table public.saved_analyses
      rename column inflation_rate_pct to expense_growth_pct;
  end if;
end $$;

alter table public.saved_analyses
  add column if not exists template_id uuid,
  add column if not exists template_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_template_type_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_template_type_check
      check (template_type in ('conservative', 'balanced', 'aggressive'));
  end if;
end $$;

create table if not exists public.analysis_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  template_name text not null,
  template_type text not null
    check (template_type in ('conservative', 'balanced', 'aggressive')),
  property_tax_pct numeric not null check (property_tax_pct >= 0 and property_tax_pct <= 100),
  insurance_pct numeric not null check (insurance_pct >= 0 and insurance_pct <= 100),
  maintenance_pct numeric not null check (maintenance_pct >= 0 and maintenance_pct <= 100),
  vacancy_pct numeric not null check (vacancy_pct >= 0 and vacancy_pct <= 100),
  management_pct numeric not null check (management_pct >= 0 and management_pct <= 100),
  capex_pct numeric not null check (capex_pct >= 0 and capex_pct <= 100),
  closing_costs_pct numeric not null check (closing_costs_pct >= 0 and closing_costs_pct <= 100),
  interest_rate_pct numeric not null check (interest_rate_pct >= 0 and interest_rate_pct <= 100),
  down_payment_pct numeric not null check (down_payment_pct >= 0 and down_payment_pct <= 100),
  expense_growth_pct numeric not null check (expense_growth_pct >= 0 and expense_growth_pct <= 100),
  rent_growth_pct numeric not null check (rent_growth_pct >= 0 and rent_growth_pct <= 100),
  depreciation_pct numeric not null check (depreciation_pct >= 0 and depreciation_pct <= 100),
  tax_rate_pct numeric not null check (tax_rate_pct >= 0 and tax_rate_pct <= 100),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analysis_templates_user_idx
  on public.analysis_templates (user_id, created_at desc);

create index if not exists analysis_templates_type_idx
  on public.analysis_templates (template_type);

create trigger analysis_templates_set_updated_at
  before update on public.analysis_templates
  for each row execute function public.set_updated_at();

alter table public.analysis_templates enable row level security;

create policy "analysis_templates_select_visible"
  on public.analysis_templates
  for select
  using (is_system = true or auth.uid() = user_id);

create policy "analysis_templates_insert_own"
  on public.analysis_templates
  for insert
  with check (auth.uid() = user_id and coalesce(is_system, false) = false);

create policy "analysis_templates_update_own"
  on public.analysis_templates
  for update
  using (auth.uid() = user_id and is_system = false)
  with check (auth.uid() = user_id and is_system = false);

create policy "analysis_templates_delete_own"
  on public.analysis_templates
  for delete
  using (auth.uid() = user_id and is_system = false);

insert into public.analysis_templates (
  user_id,
  template_name,
  template_type,
  property_tax_pct,
  insurance_pct,
  maintenance_pct,
  vacancy_pct,
  management_pct,
  capex_pct,
  closing_costs_pct,
  interest_rate_pct,
  down_payment_pct,
  expense_growth_pct,
  rent_growth_pct,
  depreciation_pct,
  tax_rate_pct,
  is_system
)
values
  (
    null,
    'Conservative Default',
    'conservative',
    1.2,
    0.6,
    12,
    8,
    10,
    8,
    4,
    7.5,
    30,
    3,
    2,
    2.8,
    28,
    true
  ),
  (
    null,
    'Balanced Default',
    'balanced',
    1.1,
    0.5,
    10,
    5,
    8,
    5,
    3,
    6.75,
    20,
    2.5,
    2.5,
    3.09,
    24,
    true
  ),
  (
    null,
    'Aggressive Default',
    'aggressive',
    1.0,
    0.45,
    8,
    4,
    6,
    4,
    2.5,
    6.25,
    15,
    2.25,
    3.5,
    3.5,
    22,
    true
  )
on conflict do nothing;
