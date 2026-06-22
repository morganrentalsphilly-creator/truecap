-- Properties + scenarios (DM-1, additive phase) — introduce a parent
-- public.properties row so several saved_analyses can hang off ONE address as
-- "scenarios" (buy-and-hold vs BRRRR vs flip vs STR on the same property).
-- This is the prerequisite for compare-strategies + scenario presets (AN-5).
--
-- SAFE + ADDITIVE. This phase ONLY:
--   1. creates public.properties (owner-only RLS),
--   2. adds nullable scenario columns to saved_analyses, and
--   3. backfills 1:1 — one property per existing analysis (the current
--      duplicate-address guard already enforces one analysis per address).
-- It deliberately does NOT touch the duplicate-address guard
-- (saved_analyses_address_taken) — so today's save behavior is UNCHANGED.
-- Relaxing that guard to "unique scenario name per property" ships in a later
-- migration ALONGSIDE the matching server-action + UI changes, so the running
-- product keeps working until the scenarios feature is fully wired.
--
-- No app code reads property_id yet, so applying this is a no-op for the live
-- product. gen_random_uuid() comes from pgcrypto (enabled in the base schema).

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  address text not null,
  -- Optional enrichment facts (beds/baths/sqft/year, parcel, comp refs…).
  facts jsonb not null default '{}'::jsonb,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is
  'Parent property (DM-1). One property → many saved_analyses scenarios (buy-hold / BRRRR / flip / STR on the same address). Owner-only RLS.';

create index if not exists idx_properties_user on public.properties (user_id);
create index if not exists idx_properties_user_address on public.properties (user_id, address);

-- Reuse the shared updated_at trigger function from the base schema.
drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;

drop policy if exists "properties_select_own" on public.properties;
create policy "properties_select_own" on public.properties
  for select using (auth.uid() = user_id);

drop policy if exists "properties_insert_own" on public.properties;
create policy "properties_insert_own" on public.properties
  for insert with check (auth.uid() = user_id);

drop policy if exists "properties_update_own" on public.properties;
create policy "properties_update_own" on public.properties
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "properties_delete_own" on public.properties;
create policy "properties_delete_own" on public.properties
  for delete using (auth.uid() = user_id);

-- Scenario columns on saved_analyses (all nullable; additive).
alter table public.saved_analyses
  add column if not exists property_id uuid references public.properties (id) on delete set null,
  add column if not exists scenario_name text,
  add column if not exists strategy_kind text;

create index if not exists idx_saved_analyses_property on public.saved_analyses (property_id);

-- Backfill 1:1 — one property per existing analysis, linked, with a default
-- scenario name. The address lives in form_snapshot (no top-level column).
-- Idempotent: only rows without a property_id are processed. A per-row loop
-- gives each analysis its own property even if addresses repeat (e.g. across
-- soft-deleted rows), which the address guard would otherwise have prevented.
do $$
declare
  r record;
  pid uuid;
begin
  for r in
    select id, user_id, form_snapshot, title, created_at
    from public.saved_analyses
    where property_id is null
  loop
    insert into public.properties (user_id, address, created_at, updated_at)
    values (
      r.user_id,
      coalesce(nullif(r.form_snapshot->>'address', ''), r.title, 'Untitled property'),
      r.created_at,
      now()
    )
    returning id into pid;

    update public.saved_analyses
    set property_id = pid,
        scenario_name = coalesce(scenario_name, 'Base case')
    where id = r.id;
  end loop;
end $$;
