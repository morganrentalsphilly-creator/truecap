-- Align template and saved analysis column semantics:
-- - saved_analyses uses property_tax_pct and management_pct
-- - analysis_templates uses insurance_mo (fixed monthly amount)

alter table public.saved_analyses
  add column if not exists property_tax_pct numeric;

update public.saved_analyses
set property_tax_pct = coalesce(
  property_tax_pct,
  case
    when purchase_price is not null and purchase_price > 0 and property_tax_mo is not null
      then (property_tax_mo * 12 / purchase_price) * 100
    else 1.1
  end
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_analyses'
      and column_name = 'mgmt_pct'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_analyses'
      and column_name = 'management_pct'
  ) then
    alter table public.saved_analyses
      rename column mgmt_pct to management_pct;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_property_tax_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_property_tax_pct_check
      check (property_tax_pct is null or (property_tax_pct >= 0 and property_tax_pct <= 100));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_analyses_management_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_management_pct_check
      check (management_pct is null or (management_pct >= 0 and management_pct <= 100));
  end if;
end $$;

alter table public.saved_analyses
  drop column if exists property_tax_mo;

alter table public.analysis_templates
  add column if not exists insurance_mo numeric;

update public.analysis_templates
set insurance_mo = coalesce(insurance_mo, insurance_pct, 0);

alter table public.analysis_templates
  alter column insurance_mo set not null;

alter table public.analysis_templates
  drop column if exists insurance_pct;
