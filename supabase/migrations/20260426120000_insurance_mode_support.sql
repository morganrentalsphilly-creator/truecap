-- Support insurance assumptions as either annual percent or flat monthly input.
-- Applies to reusable templates and saved analyses.

alter table public.saved_analyses
  add column if not exists insurance_input_mode text not null default 'monthly',
  add column if not exists insurance_pct numeric;

update public.saved_analyses
set insurance_input_mode = coalesce(insurance_input_mode, 'monthly')
where insurance_input_mode is null;

alter table public.analysis_templates
  add column if not exists insurance_input_mode text not null default 'monthly',
  add column if not exists insurance_pct numeric;

update public.analysis_templates
set insurance_input_mode = coalesce(insurance_input_mode, 'monthly')
where insurance_input_mode is null;

alter table public.analysis_templates
  alter column insurance_mo drop not null;

-- Restore system template defaults to percent-based insurance assumptions.
update public.analysis_templates
set insurance_input_mode = 'percent',
    insurance_pct = case
      when template_name = 'Conservative Default' then 0.6
      when template_name = 'Balanced Default' then 0.5
      when template_name = 'Aggressive Default' then 0.45
      else insurance_pct
    end,
    insurance_mo = null
where is_system = true
  and template_name in ('Conservative Default', 'Balanced Default', 'Aggressive Default');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_insurance_input_mode_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_insurance_input_mode_check
      check (insurance_input_mode in ('percent', 'monthly'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_insurance_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_insurance_pct_check
      check (insurance_pct is null or (insurance_pct >= 0 and insurance_pct <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'analysis_templates_insurance_input_mode_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_insurance_input_mode_check
      check (insurance_input_mode in ('percent', 'monthly'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'analysis_templates_insurance_pct_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_insurance_pct_check
      check (insurance_pct is null or (insurance_pct >= 0 and insurance_pct <= 100));
  end if;
end $$;
