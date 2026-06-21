-- Per-user "Buy Box" — the investor's personal acquisition criteria.
-- A deal is evaluated against these thresholds to produce a personalized
-- "Meets your buy box / Misses on X" verdict that COMPLEMENTS the Deal
-- Score (it does not replace it).
--
-- One row per user (1:1 with auth.users). Every criterion is nullable —
-- a null criterion is simply "not checked", so a user can fill in only
-- the dimensions they care about. is_active lets a user keep their
-- criteria but switch the verdict off without deleting the row.
--
-- Pro-only at the app layer: the server action gates writes on the
-- 'buy_box' plan feature (see app/actions/user-buy-box.ts). RLS here is
-- owner-only so a user can only ever read/write their own row.
--
-- Property types match lib/investcalc-schema.ts:
--   'single-family' | 'multi-family' | 'owner-occupant'
-- Target states are 2-letter postal codes (e.g. 'PA','TX'); an empty
-- array means "any market". The app derives a deal's state from its
-- address (best-effort) — when it can't, the state criterion is skipped.

create table if not exists public.user_buy_box (
  user_id uuid primary key references auth.users(id) on delete cascade,
  min_cap_rate_pct numeric,
  min_coc_pct numeric,
  min_dscr numeric,
  min_cash_flow_monthly numeric,
  max_purchase_price numeric,
  property_types text[] not null default '{}',
  target_states text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_buy_box is
  'Per-user acquisition criteria (Buy Box). Powers a personalized "meets your buy box" verdict that complements the Deal Score. Pro-gated at the app layer.';

-- Auto-touch updated_at on any update.
create or replace function public.set_user_buy_box_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_buy_box_updated_at on public.user_buy_box;
create trigger trg_user_buy_box_updated_at
before update on public.user_buy_box
for each row
execute function public.set_user_buy_box_updated_at();

-- RLS: owner-only.
alter table public.user_buy_box enable row level security;

drop policy if exists "user_buy_box_select_own" on public.user_buy_box;
create policy "user_buy_box_select_own"
  on public.user_buy_box
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_buy_box_insert_own" on public.user_buy_box;
create policy "user_buy_box_insert_own"
  on public.user_buy_box
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_buy_box_update_own" on public.user_buy_box;
create policy "user_buy_box_update_own"
  on public.user_buy_box
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_buy_box_delete_own" on public.user_buy_box;
create policy "user_buy_box_delete_own"
  on public.user_buy_box
  for delete
  using (auth.uid() = user_id);

-- Enable the Buy Box for Pro plans (data-driven entitlements; see
-- lib/entitlements.ts). Appends 'buy_box' without disturbing existing
-- features. Idempotent: only adds when not already present.
update public.plans
set entitlements = jsonb_set(
  entitlements,
  '{features}',
  (entitlements->'features') || jsonb_build_array('buy_box')
)
where slug in ('pro_monthly', 'pro_annual')
  and not (entitlements->'features' ? 'buy_box');
