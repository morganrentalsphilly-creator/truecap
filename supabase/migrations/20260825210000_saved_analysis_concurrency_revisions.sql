-- Independent optimistic-concurrency tokens for the two mutable documents on
-- saved_analyses. Apply this migration BEFORE deploying the application code
-- that selects these columns. The actions fail closed with MIGRATION_PENDING
-- when the gate is missing; they never fall back to last-write-wins.

begin;

-- Fail before any DDL when a manual/out-of-order application targets an old
-- saved_analyses shape. PL/pgSQL accepts NEW.field references at function
-- creation time even when the field is absent, so this explicit check prevents
-- a migration that appears successful but breaks every later row update.
do $$
begin
  if to_regclass('public.saved_analyses') is null then
    raise exception using
      errcode = '55000',
      message = 'saved-analysis concurrency revisions require public.saved_analyses';
  end if;

  if exists (
    select 1
    from (values
      ('form_snapshot'),
      ('result_snapshot'),
      ('schema_version'),
      ('methodology_version'),
      ('notes')
    ) as required(column_name)
    where not exists (
      select 1
      from information_schema.columns as existing
      where table_schema = 'public'
        and table_name = 'saved_analyses'
        and existing.column_name = required.column_name
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'saved-analysis concurrency revisions require form, result, methodology, and notes columns',
      hint = 'Apply saved_analyses migrations through 20260815130000 before this migration.';
  end if;
end;
$$;

alter table public.saved_analyses
  add column if not exists underwriting_revision bigint not null default 1,
  add column if not exists notes_revision bigint not null default 1;

-- Stop the prior trigger while repairing any hostile tokens written during a
-- partially applied migration. The explicit transaction prevents an
-- observable trigger-free window.
drop trigger if exists saved_analyses_80_bump_content_revisions
  on public.saved_analyses;

update public.saved_analyses
set underwriting_revision = 1
where underwriting_revision < 1
   or underwriting_revision >= 9007199254740991;

update public.saved_analyses
set notes_revision = 1
where notes_revision < 1
   or notes_revision >= 9007199254740991;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_analyses_underwriting_revision_positive'
      and conrelid = 'public.saved_analyses'::regclass
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_underwriting_revision_positive
      check (underwriting_revision >= 1) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_analyses_notes_revision_positive'
      and conrelid = 'public.saved_analyses'::regclass
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_notes_revision_positive
      check (notes_revision >= 1) not valid;
  end if;

  -- Keep tokens exactly representable by JavaScript/JSON clients and leave
  -- one increment of headroom. INSERT normalization below makes these bounds
  -- unreachable through ordinary use.
  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_analyses_underwriting_revision_safe_integer'
      and conrelid = 'public.saved_analyses'::regclass
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_underwriting_revision_safe_integer
      check (underwriting_revision < 9007199254740991) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_analyses_notes_revision_safe_integer'
      and conrelid = 'public.saved_analyses'::regclass
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_notes_revision_safe_integer
      check (notes_revision < 9007199254740991) not valid;
  end if;
end
$$;

alter table public.saved_analyses
  validate constraint saved_analyses_underwriting_revision_positive;
alter table public.saved_analyses
  validate constraint saved_analyses_notes_revision_positive;
alter table public.saved_analyses
  validate constraint saved_analyses_underwriting_revision_safe_integer;
alter table public.saved_analyses
  validate constraint saved_analyses_notes_revision_safe_integer;

-- The database, not a caller-supplied increment, owns both tokens. This also
-- protects direct RLS-scoped writes and future actions that forget to advance
-- a token. Unrelated workspace changes (stage, tags, activity timestamps) do
-- not create false conflicts in the underwriting or notes editors.
create or replace function public.bump_saved_analysis_content_revisions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Initial tokens are database-owned. A caller cannot forge bigint max (or
  -- any other starting revision) and brick the next edit.
  if tg_op = 'INSERT' then
    new.underwriting_revision := 1;
    new.notes_revision := 1;
    return new;
  end if;

  if new.form_snapshot is distinct from old.form_snapshot
     or new.result_snapshot is distinct from old.result_snapshot
     or new.schema_version is distinct from old.schema_version
     or new.methodology_version is distinct from old.methodology_version
  then
    new.underwriting_revision := case
      when old.underwriting_revision >= 9007199254740990 then 1
      else old.underwriting_revision + 1
    end;
  else
    new.underwriting_revision := old.underwriting_revision;
  end if;

  if new.notes is distinct from old.notes then
    new.notes_revision := case
      when old.notes_revision >= 9007199254740990 then 1
      else old.notes_revision + 1
    end;
  else
    new.notes_revision := old.notes_revision;
  end if;

  return new;
end;
$$;

drop trigger if exists saved_analyses_80_bump_content_revisions
  on public.saved_analyses;
create trigger saved_analyses_80_bump_content_revisions
  before insert or update on public.saved_analyses
  for each row execute function public.bump_saved_analysis_content_revisions();

comment on column public.saved_analyses.underwriting_revision is
  'Server-checked optimistic-concurrency token for form/result underwriting content.';
comment on column public.saved_analyses.notes_revision is
  'Server-checked optimistic-concurrency token for the free-text notes document.';

commit;
