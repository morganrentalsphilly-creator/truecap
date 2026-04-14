-- TrueCap: profiles, plans, subscriptions, saved analyses, Stripe webhook log
-- Requires Supabase (auth.users). Service role bypasses RLS for webhooks.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  stripe_price_id text unique,
  entitlements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_user_status_idx on public.subscriptions (user_id, status);
create unique index subscriptions_one_active_per_user_idx
  on public.subscriptions (user_id)
  where status in ('active', 'trialing', 'past_due');

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'));

alter table public.subscriptions
  add constraint subscriptions_period_range_check
  check (
    current_period_start is null
    or current_period_end is null
    or current_period_end >= current_period_start
  );

create table public.saved_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  schema_version int not null default 1,
  form_snapshot jsonb not null,
  result_snapshot jsonb,
  property_type text,
  purchase_price numeric,
  net_cash_flow_monthly numeric,
  coc_return_pct numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index saved_analyses_user_list_idx on public.saved_analyses (user_id, deleted_at, created_at desc);

create table public.stripe_webhook_events (
  stripe_event_id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Prevent JWT-authenticated users from changing Stripe customer id (only service role / webhooks).
create or replace function public.profiles_lock_stripe_customer_id_for_users()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and coalesce(auth.role(), '') = 'authenticated' then
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  return new;
end;
$$;

create trigger profiles_preserve_stripe_customer_id
  before update on public.profiles
  for each row execute function public.profiles_lock_stripe_customer_id_for_users();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger saved_analyses_set_updated_at
  before update on public.saved_analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed plans (set stripe_price_id after creating Stripe Prices)
-- ---------------------------------------------------------------------------

insert into public.plans (slug, stripe_price_id, entitlements, is_active) values
(
  'free',
  null,
  '{"max_saved_deals": 0, "features": ["cash_flow"]}'::jsonb,
  true
),
(
  'pro_monthly',
  null,
  '{"max_saved_deals": 50, "features": ["cash_flow", "projections", "tax_strategy", "deal_score", "pdf_export", "save_deal"]}'::jsonb,
  true
),
(
  'pro_annual',
  null,
  '{"max_saved_deals": 50, "features": ["cash_flow", "projections", "tax_strategy", "deal_score", "pdf_export", "save_deal"]}'::jsonb,
  true
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.saved_analyses enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "plans_select_active" on public.plans
  for select using (is_active = true);

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "saved_analyses_select_own" on public.saved_analyses
  for select using (auth.uid() = user_id);

create policy "saved_analyses_insert_own" on public.saved_analyses
  for insert with check (auth.uid() = user_id);

create policy "saved_analyses_update_own" on public.saved_analyses
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_analyses_delete_own" on public.saved_analyses
  for delete using (auth.uid() = user_id);

-- stripe_webhook_events: no policies for authenticated/anon; service role only.
