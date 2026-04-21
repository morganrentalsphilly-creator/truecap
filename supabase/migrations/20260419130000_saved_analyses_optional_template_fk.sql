-- Make template selection optional in saved analyses.
-- Keeps template references nullable and removes mandatory template type metadata.

alter table public.saved_analyses
  add column if not exists template_id uuid;

alter table public.saved_analyses
  drop constraint if exists saved_analyses_template_type_check;

alter table public.saved_analyses
  drop column if exists template_type;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'saved_analyses'
      and constraint_name = 'saved_analyses_template_id_fkey'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_template_id_fkey
      foreign key (template_id)
      references public.analysis_templates(id)
      on delete set null;
  end if;
end $$;
