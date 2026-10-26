-- Additive client underwriting: preferences and immutable many-client matches.
-- Existing analyses, reports, billing rows and original client assignment stay intact.
-- Apply only after the disposable migration replay and owner-isolation tests pass.
begin;
alter table public.agent_clients add column if not exists financing_assumptions jsonb;
do $$ begin
  alter table public.agent_clients add constraint agent_clients_financing_shape
    check (financing_assumptions is null or
      (jsonb_typeof(financing_assumptions) = 'object' and octet_length(financing_assumptions::text) <= 2000));
exception when duplicate_object then null; end $$;

create unique index if not exists saved_analyses_id_user_watch_fk_idx on public.saved_analyses(id,user_id);
create table if not exists public.agent_deal_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_analysis_id uuid not null,
  client_id uuid references public.agent_clients(id) on delete set null,
  buy_box_id uuid references public.user_buy_boxes(id) on delete set null,
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 200000),
  created_at timestamptz not null default now(),
  constraint agent_deal_matches_owned_deal foreign key(saved_analysis_id,user_id)
    references public.saved_analyses(id,user_id) on delete cascade,
  constraint agent_deal_matches_once unique(user_id,saved_analysis_id,source_fingerprint)
);
create index if not exists agent_deal_matches_owner_deal on public.agent_deal_matches(user_id,saved_analysis_id,created_at desc);
alter table public.agent_deal_matches enable row level security;
do $$ begin
  create policy agent_deal_matches_read_own on public.agent_deal_matches for select to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
-- Server derives all snapshot outputs after live entitlement and ownership checks.
-- Browser clients cannot forge report results or change a historical match.
revoke all on public.agent_deal_matches from public, anon, authenticated;
grant select on public.agent_deal_matches to authenticated;
grant all on public.agent_deal_matches to service_role;

create or replace function public.guard_agent_deal_match_owner()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.agent_clients c where c.id=new.client_id and c.agent_user_id=new.user_id
  ) then raise exception 'Client owner mismatch' using errcode='42501'; end if;
  if new.buy_box_id is not null and not exists (
    select 1 from public.user_buy_boxes b where b.id=new.buy_box_id and b.user_id=new.user_id and b.client_id=new.client_id
  ) then raise exception 'Buy Box owner or client mismatch' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function public.guard_agent_deal_match_owner() from public, anon, authenticated;
drop trigger if exists agent_deal_matches_owner_guard on public.agent_deal_matches;
create trigger agent_deal_matches_owner_guard before insert on public.agent_deal_matches
  for each row execute function public.guard_agent_deal_match_owner();
comment on table public.agent_deal_matches is 'Immutable, owner-visible client-specific underwriting snapshots. Many matches reference one saved property. Deleting a client removes the live reference but retains its frozen match.';
commit;
