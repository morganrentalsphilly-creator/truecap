-- Detect duplicate saved analysis addresses per user (used by RPC from server actions).
-- Enforce unique template names per user (case-insensitive, trimmed).

create or replace function public.saved_analyses_address_taken(p_user_id uuid, p_address text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.saved_analyses sa
    where sa.user_id = p_user_id
      and sa.deleted_at is null
      and lower(btrim(sa.form_snapshot->>'address')) = lower(btrim(p_address))
  );
$$;

grant execute on function public.saved_analyses_address_taken(uuid, text) to authenticated;

-- Remove duplicate user templates (same user + normalized name); keep the row with smallest id.
delete from public.analysis_templates a
using public.analysis_templates b
where a.user_id = b.user_id
  and a.user_id is not null
  and lower(btrim(a.template_name)) = lower(btrim(b.template_name))
  and a.id > b.id;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'analysis_templates_user_normalized_template_name_key'
  ) then
    create unique index analysis_templates_user_normalized_template_name_key
      on public.analysis_templates (user_id, lower(btrim(template_name)))
      where user_id is not null;
  end if;
end $$;
