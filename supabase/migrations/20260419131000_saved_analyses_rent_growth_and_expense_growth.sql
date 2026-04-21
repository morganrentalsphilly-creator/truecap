-- Add rent growth field and normalize inflation naming.

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
  add column if not exists expense_growth_pct numeric,
  add column if not exists rent_growth_pct numeric;

alter table public.analysis_templates
  add column if not exists rent_growth_pct numeric;
