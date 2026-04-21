-- Add short description support for user templates.

alter table public.analysis_templates
  add column if not exists template_description text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_templates_template_description_length_check'
  ) then
    alter table public.analysis_templates
      add constraint analysis_templates_template_description_length_check
      check (
        template_description is null
        or char_length(template_description) <= 40
      );
  end if;
end $$;
