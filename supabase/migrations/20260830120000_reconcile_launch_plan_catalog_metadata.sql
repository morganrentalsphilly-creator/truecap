-- Reconcile database display metadata with the checked-in executable catalog.
--
-- 20260827100000_launch_plan_catalog_metadata.sql intentionally changed only
-- public.plans presentation fields, but it recorded the superseded $24/$240
-- Investor and $49/$490 Agent catalog. This forward correction keeps migration
-- history immutable and aligns the database with lib/public-pricing.ts:
-- Investor Pro $29.99/month or $300/year and Agent Pro $59.99/month or
-- $590/year.
--
-- This migration does not create, update, archive, or repoint any Stripe
-- Product or Price. It deliberately leaves stripe_price_id, entitlements,
-- subscriptions, and customer billing untouched. Checkout continues to fetch
-- the configured Stripe Price and fail closed unless amount, currency, cadence,
-- and active state match the executable catalog.

begin;

update public.plans
set
  display_name = 'Investor Pro Monthly',
  description = 'Investor Pro access billed monthly.',
  billing_interval = 'month',
  price_cents = 2999,
  currency = 'usd',
  discount_pct = 0,
  sort_order = 10
where slug = 'pro_monthly';

update public.plans
set
  display_name = 'Investor Pro Annual',
  description = 'Investor Pro access billed yearly.',
  billing_interval = 'year',
  price_cents = 30000,
  currency = 'usd',
  discount_pct = 17,
  sort_order = 20
where slug = 'pro_annual';

update public.plans
set
  display_name = 'Agent Pro Monthly',
  description = 'Agent Pro access billed monthly when catalog-verified deployment configuration is present.',
  billing_interval = 'month',
  price_cents = 5999,
  currency = 'usd',
  discount_pct = 0,
  sort_order = 30
where slug = 'agent_pro_monthly';

update public.plans
set
  display_name = 'Agent Pro Annual',
  description = 'Agent Pro access billed yearly when catalog-verified deployment configuration is present.',
  billing_interval = 'year',
  price_cents = 59000,
  currency = 'usd',
  discount_pct = 18,
  sort_order = 40
where slug = 'agent_pro_annual';

commit;

-- Do not roll this migration back independently: the prior rows contain known-
-- incorrect catalog metadata. A future catalog change should use another
-- forward migration coordinated with the executable catalog and Stripe Price
-- configuration.
