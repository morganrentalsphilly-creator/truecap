-- Exit scenario assumptions persisted on saved analyses and templates (optional columns; app applies 3% / 6% defaults).

alter table public.saved_analyses
  add column if not exists appreciation_rate_pct numeric;

alter table public.saved_analyses
  add column if not exists selling_cost_pct numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_appreciation_rate_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_appreciation_rate_pct_check
      check (appreciation_rate_pct is null or (appreciation_rate_pct >= 0 and appreciation_rate_pct <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_selling_cost_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_selling_cost_pct_check
      check (selling_cost_pct is null or (selling_cost_pct >= 0 and selling_cost_pct <= 100));
  end if;
end $$;

alter table public.analysis_templates
  add column if not exists appreciation_rate_pct numeric;

alter table public.analysis_templates
  add column if not exists selling_cost_pct numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'analysis_templates_appreciation_rate_pct_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_appreciation_rate_pct_check
      check (appreciation_rate_pct is null or (appreciation_rate_pct >= 0 and appreciation_rate_pct <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'analysis_templates_selling_cost_pct_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_selling_cost_pct_check
      check (selling_cost_pct is null or (selling_cost_pct >= 0 and selling_cost_pct <= 100));
  end if;
end $$;

update public.analysis_templates
set appreciation_rate_pct = 3
where appreciation_rate_pct is null;

update public.analysis_templates
set selling_cost_pct = 6
where selling_cost_pct is null;
