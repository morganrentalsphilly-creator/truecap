-- Durable, privacy-safe idempotency for copying an opaque public share into a
-- recipient's saved analyses. The application stores only a domain-separated
-- SHA-256 digest of (recipient UUID, raw 256-bit share token), never the token,
-- public-share row id, sender id, address, or financial inputs.

begin;

alter table public.saved_analyses
  add column if not exists public_share_copy_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.saved_analyses'::regclass
      and conname = 'saved_analyses_public_share_copy_key_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_public_share_copy_key_check
      check (
        public_share_copy_key is null
        or public_share_copy_key ~ '^[a-f0-9]{64}$'
      );
  end if;
end;
$$;

-- The unique write is the idempotency claim: concurrent/replayed actions can
-- produce at most one active recipient row. An intentional soft delete releases
-- the key so the recipient may explicitly copy the share again later.
create unique index if not exists saved_analyses_public_share_copy_key_unique
  on public.saved_analyses (user_id, public_share_copy_key)
  where public_share_copy_key is not null and deleted_at is null;

create or replace function public.preserve_saved_analysis_public_share_copy_key()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if old.public_share_copy_key is not null
     and new.public_share_copy_key is distinct from old.public_share_copy_key then
    raise exception using
      errcode = '22023',
      message = 'public share copy identity is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists saved_analyses_preserve_public_share_copy_key
  on public.saved_analyses;
create trigger saved_analyses_preserve_public_share_copy_key
  before update of public_share_copy_key on public.saved_analyses
  for each row execute function public.preserve_saved_analysis_public_share_copy_key();

comment on column public.saved_analyses.public_share_copy_key is
  'Opaque per-recipient digest used only to make /s copy-as-new idempotent. Never contains or exposes the share token.';

commit;

-- Manual rollback (only after the copy action no longer sends the key):
-- drop trigger if exists saved_analyses_preserve_public_share_copy_key on public.saved_analyses;
-- drop function if exists public.preserve_saved_analysis_public_share_copy_key();
-- drop index if exists public.saved_analyses_public_share_copy_key_unique;
-- alter table public.saved_analyses drop constraint if exists saved_analyses_public_share_copy_key_check;
-- alter table public.saved_analyses drop column if exists public_share_copy_key;
