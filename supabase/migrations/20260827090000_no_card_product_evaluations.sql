-- No-card product evaluation: 3 complete decision runs + 1 comparison,
-- expiring 21 days after account creation. This migration provisions only
-- local application state. It does not create or mutate Stripe Products,
-- Prices, coupons, or subscriptions.

create table public.product_evaluations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '21 days'),
  deal_limit smallint not null default 3,
  comparison_limit smallint not null default 1,
  created_at timestamptz not null default now(),
  constraint product_evaluations_window_check check (expires_at > started_at),
  constraint product_evaluations_deal_limit_check check (deal_limit = 3),
  constraint product_evaluations_comparison_limit_check check (comparison_limit = 1)
);

comment on table public.product_evaluations is
  'One non-renewable, no-card TrueCap evaluation per user. Access ends after 21 days or after both usage allowances are exhausted.';

create table public.product_evaluation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.product_evaluations (user_id) on delete cascade,
  kind text not null,
  resource_key text not null,
  created_at timestamptz not null default now(),
  constraint product_evaluation_usage_kind_check check (kind in ('deal', 'comparison')),
  constraint product_evaluation_usage_resource_check check (
    length(resource_key) between 16 and 160
    and resource_key ~ '^[A-Za-z0-9:_-]+$'
  ),
  constraint product_evaluation_usage_once unique (user_id, kind, resource_key)
);

create index product_evaluation_usage_count_idx
  on public.product_evaluation_usage (user_id, kind, created_at);

create or replace function public.create_product_evaluation_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_evaluations (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_create_product_evaluation
  after insert on auth.users
  for each row execute function public.create_product_evaluation_for_new_user();

-- Existing free accounts receive the same single evaluation on rollout.
-- Accounts with any subscription history are intentionally excluded so a
-- cancel/resubscribe cycle cannot manufacture another evaluation.
insert into public.product_evaluations (user_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.subscriptions s where s.user_id = p.id
)
on conflict (user_id) do nothing;

create or replace function public.consume_product_evaluation_usage(
  p_kind text,
  p_resource_key text
)
returns table (
  accepted boolean,
  reason text,
  deals_used integer,
  comparisons_used integer,
  evaluation_expires_at timestamptz,
  evaluation_started_at timestamptz,
  was_new_usage boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  evaluation public.product_evaluations;
  current_deals integer;
  current_comparisons integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_kind not in ('deal', 'comparison') then
    raise exception using errcode = '22023', message = 'invalid evaluation usage kind';
  end if;
  if p_resource_key is null
     or length(p_resource_key) not between 16 and 160
     or p_resource_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception using errcode = '22023', message = 'invalid evaluation resource key';
  end if;

  select * into evaluation
  from public.product_evaluations
  where user_id = auth.uid()
  for update;

  if not found then
    return query select false, 'not_eligible'::text, 0, 0, null::timestamptz, null::timestamptz, false;
    return;
  end if;

  select
    count(*) filter (where kind = 'deal')::integer,
    count(*) filter (where kind = 'comparison')::integer
  into current_deals, current_comparisons
  from public.product_evaluation_usage
  where user_id = auth.uid();

  if now() >= evaluation.expires_at then
    return query select false, 'expired'::text, current_deals, current_comparisons, evaluation.expires_at, evaluation.started_at, false;
    return;
  end if;

  -- A completed result may retry after a network timeout or page refresh.
  -- Return the existing success before enforcing the cap so the third deal or
  -- first comparison remains idempotent even after it fills the allowance.
  if exists (
    select 1
    from public.product_evaluation_usage
    where user_id = auth.uid()
      and kind = p_kind
      and resource_key = p_resource_key
  ) then
    return query select true, 'accepted'::text, current_deals, current_comparisons, evaluation.expires_at, evaluation.started_at, false;
    return;
  end if;

  if p_kind = 'deal' and current_deals >= evaluation.deal_limit then
    return query select false, 'deal_limit_reached'::text, current_deals, current_comparisons, evaluation.expires_at, evaluation.started_at, false;
    return;
  end if;
  if p_kind = 'comparison' and current_comparisons >= evaluation.comparison_limit then
    return query select false, 'comparison_limit_reached'::text, current_deals, current_comparisons, evaluation.expires_at, evaluation.started_at, false;
    return;
  end if;

  insert into public.product_evaluation_usage (user_id, kind, resource_key)
  values (auth.uid(), p_kind, p_resource_key)
  on conflict (user_id, kind, resource_key) do nothing;

  select
    count(*) filter (where kind = 'deal')::integer,
    count(*) filter (where kind = 'comparison')::integer
  into current_deals, current_comparisons
  from public.product_evaluation_usage
  where user_id = auth.uid();

  return query select true, 'accepted'::text, current_deals, current_comparisons, evaluation.expires_at, evaluation.started_at, true;
end;
$$;

alter table public.product_evaluations enable row level security;
alter table public.product_evaluations force row level security;
alter table public.product_evaluation_usage enable row level security;
alter table public.product_evaluation_usage force row level security;

create policy product_evaluations_select_own on public.product_evaluations
  for select using (auth.uid() = user_id);
create policy product_evaluation_usage_select_own on public.product_evaluation_usage
  for select using (auth.uid() = user_id);

revoke all on table public.product_evaluations from public, anon, authenticated;
revoke all on table public.product_evaluation_usage from public, anon, authenticated;
grant select on table public.product_evaluations to authenticated;
grant select on table public.product_evaluation_usage to authenticated;
revoke all on function public.create_product_evaluation_for_new_user() from public;
revoke all on function public.consume_product_evaluation_usage(text, text) from public;
grant execute on function public.consume_product_evaluation_usage(text, text) to authenticated;
