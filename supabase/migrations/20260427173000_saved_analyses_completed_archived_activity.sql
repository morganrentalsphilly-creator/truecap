alter table public.saved_analyses
  add column if not exists is_completed boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists last_activity_at timestamptz null;

create or replace function public.set_saved_analysis_last_activity_at()
returns trigger
language plpgsql
as $$
begin
  new.last_activity_at := now();
  return new;
end;
$$;

drop trigger if exists trg_saved_analyses_last_activity_at on public.saved_analyses;
create trigger trg_saved_analyses_last_activity_at
before update on public.saved_analyses
for each row
execute function public.set_saved_analysis_last_activity_at();

create or replace function public.archive_stale_saved_analyses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.saved_analyses
     set is_archived = true
   where is_completed = false
     and is_archived = false
     and coalesce(last_activity_at, created_at) < now() - interval '60 days';

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if to_regclass('cron.job') is not null then
      if exists (select 1 from cron.job where jobname = 'archive-stale-saved-analyses-daily') then
        perform cron.unschedule((select jobid from cron.job where jobname = 'archive-stale-saved-analyses-daily' limit 1));
      end if;

      perform cron.schedule(
        'archive-stale-saved-analyses-daily',
        '0 2 * * *',
        'select public.archive_stale_saved_analyses();'
      );
    end if;
  end if;
end
$do$;
