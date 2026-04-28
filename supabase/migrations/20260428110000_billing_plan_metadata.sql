alter table public.plans
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists billing_interval text,
  add column if not exists price_cents integer,
  add column if not exists currency text not null default 'usd',
  add column if not exists discount_pct numeric not null default 0,
  add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plans_billing_interval_check'
      and conrelid = 'public.plans'::regclass
  ) then
    alter table public.plans
      add constraint plans_billing_interval_check
      check (billing_interval is null or billing_interval in ('free', 'month', 'year'));
  end if;
end
$$;

update public.plans
set
  display_name = 'Free',
  description = 'Cash-flow calculator access.',
  billing_interval = 'free',
  price_cents = 0,
  currency = 'usd',
  discount_pct = 0,
  sort_order = 0
where slug = 'free';

update public.plans
set
  display_name = 'Pro Monthly',
  description = 'Full Pro access billed monthly.',
  billing_interval = 'month',
  currency = 'usd',
  discount_pct = 0,
  sort_order = 10
where slug = 'pro_monthly';

update public.plans
set
  display_name = 'Pro Annual',
  description = 'Full Pro access billed yearly with 25% savings.',
  billing_interval = 'year',
  currency = 'usd',
  discount_pct = 25,
  sort_order = 20
where slug = 'pro_annual';
