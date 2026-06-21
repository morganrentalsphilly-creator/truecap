-- Per-deal saved comp sets.
--
-- When a user runs RentCast comps on a SAVED deal, we persist the resulting
-- comp set (value/rent estimates + sale/rent comparables) onto the deal so it
-- shows up next time without another API call. This is a reference artifact —
-- it never feeds the cash-flow analysis. One row per saved deal.

create table if not exists public.deal_comps (
  analysis_id uuid primary key references public.saved_analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

comment on table public.deal_comps is
  'Per-saved-deal RentCast comp set (reference-only; does not feed the analysis). One row per deal.';

create index if not exists deal_comps_user_id_idx on public.deal_comps(user_id);

alter table public.deal_comps enable row level security;

-- Owner-only. Writes happen via the service role inside the action (which
-- checks deal ownership first), but reads use the user session, so the user
-- must be able to read their own rows.
drop policy if exists "deal_comps_select_own" on public.deal_comps;
create policy "deal_comps_select_own" on public.deal_comps
  for select using (auth.uid() = user_id);

drop policy if exists "deal_comps_insert_own" on public.deal_comps;
create policy "deal_comps_insert_own" on public.deal_comps
  for insert with check (auth.uid() = user_id);

drop policy if exists "deal_comps_update_own" on public.deal_comps;
create policy "deal_comps_update_own" on public.deal_comps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deal_comps_delete_own" on public.deal_comps;
create policy "deal_comps_delete_own" on public.deal_comps
  for delete using (auth.uid() = user_id);
