-- ============================================================
-- Agent Pro tier ($59/mo, Morgan-approved 2026-08) + client rosters
--
-- SURFACED FOR REVIEW — do not let tooling auto-apply. Idempotent;
-- safe to run over a partially-applied state.
--
-- What this does:
--   1. Adds agent_pro_monthly / agent_pro_annual plan rows whose
--      entitlements are DERIVED from the live pro_monthly row (so they
--      cannot drift from whatever Pro actually includes in prod) plus
--      the agent feature strings: client_buy_box, agent_portal,
--      embed_whitelabel.
--   2. Creates agent_clients — an agent's buyer roster.
--   3. Adds nullable client_id to user_buy_boxes and saved_analyses so
--      boxes/deals can be scoped to a specific client.
--
-- What this deliberately does NOT do:
--   - It does not set stripe_price_id. After creating the two Stripe
--     Prices, EITHER paste their ids into the UPDATE at the bottom and
--     re-run it, OR set STRIPE_PRICE_AGENT_PRO_MONTHLY /
--     STRIPE_PRICE_AGENT_PRO_ANNUAL in Vercel (env is checked first;
--     populating BOTH is safest — the DB column is what rescues webhook
--     resolution if the env var is ever lost, the 2026-07 incident class).
--   - Until the env vars exist, the tier is invisible on /pricing and
--     checkout rejects it — these rows alone change nothing user-facing.
-- ============================================================

-- 1) Plan rows, entitlements derived from live pro_monthly.
insert into public.plans (slug, stripe_price_id, entitlements, is_active)
select
  v.slug,
  null,
  jsonb_set(
    p.entitlements,
    '{features}',
    (p.entitlements->'features')
      || '["client_buy_box","agent_portal","embed_whitelabel"]'::jsonb
  ),
  true
from public.plans p
cross join (values ('agent_pro_monthly'), ('agent_pro_annual')) as v(slug)
where p.slug = 'pro_monthly'
on conflict (slug) do nothing;

-- Re-running after pro's entitlements changed? Refresh the derived rows
-- (keeps stripe_price_id and is_active as-is).
update public.plans a
set entitlements = jsonb_set(
  p.entitlements,
  '{features}',
  (p.entitlements->'features')
    || '["client_buy_box","agent_portal","embed_whitelabel"]'::jsonb
)
from public.plans p
where p.slug = 'pro_monthly'
  and a.slug in ('agent_pro_monthly', 'agent_pro_annual');

-- 2) The agent's buyer roster.
create table if not exists public.agent_clients (
  id uuid primary key default gen_random_uuid(),
  agent_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_clients_agent_idx
  on public.agent_clients (agent_user_id, is_archived, created_at desc);

alter table public.agent_clients enable row level security;

do $$ begin
  create policy "agent_clients_owner_select" on public.agent_clients
    for select using (auth.uid() = agent_user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "agent_clients_owner_insert" on public.agent_clients
    for insert with check (auth.uid() = agent_user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "agent_clients_owner_update" on public.agent_clients
    for update using (auth.uid() = agent_user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "agent_clients_owner_delete" on public.agent_clients
    for delete using (auth.uid() = agent_user_id);
exception when duplicate_object then null; end $$;

-- 3) Client scoping. Nullable; on client delete the box/deal survives,
--    just unscoped — an agent losing a buyer must not lose their work.
alter table public.user_buy_boxes
  add column if not exists client_id uuid references public.agent_clients(id) on delete set null;

alter table public.saved_analyses
  add column if not exists client_id uuid references public.agent_clients(id) on delete set null;

create index if not exists user_buy_boxes_client_idx
  on public.user_buy_boxes (client_id) where client_id is not null;

create index if not exists saved_analyses_client_idx
  on public.saved_analyses (client_id) where client_id is not null;

-- ============================================================
-- AFTER creating the Stripe Prices (Morgan): paste ids + run.
-- Suggested amounts (approved: $59/mo; annual mirrors Pro's ~2-months-free
-- pattern → $590/yr, but the Stripe Price is the source of truth):
--
-- update public.plans set stripe_price_id = 'price_XXX_monthly'
--   where slug = 'agent_pro_monthly';
-- update public.plans set stripe_price_id = 'price_XXX_annual'
--   where slug = 'agent_pro_annual';
-- ============================================================
