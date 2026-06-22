-- Multiple Buy Boxes per user (DM-2) — supersede the 1:1 user_buy_box with a
-- 1:many model so an investor can keep, say, a "Memphis BRRRR" box and a
-- "Philly house-hack" box and evaluate every deal against each.
--
-- SAFE + ADDITIVE: the existing public.user_buy_box table is LEFT IN PLACE so
-- the current single-box action/UI keeps working during the transition. This
-- migration creates public.user_buy_boxes and SEEDS each existing
-- user_buy_box row as that user's default box. The new multi-box action/UI
-- (shipped separately, gated on the existing 'buy_box' entitlement and
-- tolerant of this table being absent until applied) reads from here.
--
-- Pro-gated at the app layer ('buy_box' entitlement, already added by
-- 20260621120000_user_buy_box.sql). RLS here is owner-only.

create table if not exists public.user_buy_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Buy Box',
  -- Optional strategy this box screens for. Free-form; mirrors the analyzer
  -- strategy presets — e.g. 'buy_hold','house_hack','brrrr','flip',
  -- 'section_8','mtr','str'. Null = any strategy.
  strategy_kind text,
  -- Same criteria as user_buy_box; every threshold nullable = "not checked".
  min_cap_rate_pct numeric,
  min_coc_pct numeric,
  min_dscr numeric,
  min_cash_flow_monthly numeric,
  max_purchase_price numeric,
  property_types text[] not null default '{}',
  target_states text[] not null default '{}',
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_buy_boxes is
  'Per-user acquisition criteria, 1:many (multiple named Buy Boxes per user). Supersedes the 1:1 user_buy_box, which is kept readable during transition. Pro-gated at the app layer.';

create index if not exists idx_user_buy_boxes_user on public.user_buy_boxes (user_id);

-- At most one default box per user (partial unique index).
create unique index if not exists uniq_user_buy_boxes_one_default
  on public.user_buy_boxes (user_id)
  where is_default;

-- Auto-touch updated_at on any update (mirrors user_buy_box).
create or replace function public.set_user_buy_boxes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_buy_boxes_updated_at on public.user_buy_boxes;
create trigger trg_user_buy_boxes_updated_at
before update on public.user_buy_boxes
for each row
execute function public.set_user_buy_boxes_updated_at();

-- RLS: owner-only (select/insert/update/delete restricted to the row owner).
alter table public.user_buy_boxes enable row level security;

drop policy if exists "user_buy_boxes_select_own" on public.user_buy_boxes;
create policy "user_buy_boxes_select_own"
  on public.user_buy_boxes for select
  using (auth.uid() = user_id);

drop policy if exists "user_buy_boxes_insert_own" on public.user_buy_boxes;
create policy "user_buy_boxes_insert_own"
  on public.user_buy_boxes for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_buy_boxes_update_own" on public.user_buy_boxes;
create policy "user_buy_boxes_update_own"
  on public.user_buy_boxes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_buy_boxes_delete_own" on public.user_buy_boxes;
create policy "user_buy_boxes_delete_own"
  on public.user_buy_boxes for delete
  using (auth.uid() = user_id);

-- Seed: migrate each existing single Buy Box into the multi-box table as that
-- user's default box. Idempotent — only seeds users with no row in
-- user_buy_boxes yet, so re-running is a no-op.
insert into public.user_buy_boxes (
  user_id, name, min_cap_rate_pct, min_coc_pct, min_dscr,
  min_cash_flow_monthly, max_purchase_price, property_types, target_states,
  is_active, is_default, sort_order, created_at, updated_at
)
select
  b.user_id, 'My Buy Box', b.min_cap_rate_pct, b.min_coc_pct, b.min_dscr,
  b.min_cash_flow_monthly, b.max_purchase_price, b.property_types, b.target_states,
  b.is_active, true, 0, b.created_at, b.updated_at
from public.user_buy_box b
where not exists (
  select 1 from public.user_buy_boxes x where x.user_id = b.user_id
);
