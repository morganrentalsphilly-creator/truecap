-- Launch-candidate plan catalog metadata: Investor Pro $24/$240 and
-- Agent Pro $49/$490. This migration is deliberately DISPLAY METADATA ONLY.
-- It does not create, update, archive, or repoint any Stripe Product/Price,
-- and it preserves plans.stripe_price_id so grandfathered subscriptions keep
-- resolving through webhook reconciliation.
--
-- Checkout also retrieves the configured Stripe Price and refuses to start if
-- its currency, amount, or interval differs from lib/public-pricing.ts. The
-- required external go-live action is therefore to create the four matching
-- recurring Prices in Stripe and set the corresponding environment variables.

update public.plans
set
  display_name = 'Investor Pro Monthly',
  description = 'Investor Pro access billed monthly.',
  billing_interval = 'month',
  price_cents = 2400,
  currency = 'usd',
  discount_pct = 0,
  sort_order = 10
where slug = 'pro_monthly';

update public.plans
set
  display_name = 'Investor Pro Annual',
  description = 'Investor Pro access billed yearly.',
  billing_interval = 'year',
  price_cents = 24000,
  currency = 'usd',
  discount_pct = 17,
  sort_order = 20
where slug = 'pro_annual';

update public.plans
set
  display_name = 'Agent Pro Monthly',
  description = 'Agent Pro access billed monthly; public sale remains release-gated.',
  billing_interval = 'month',
  price_cents = 4900,
  currency = 'usd',
  discount_pct = 0,
  sort_order = 30
where slug = 'agent_pro_monthly';

update public.plans
set
  display_name = 'Agent Pro Annual',
  description = 'Agent Pro access billed yearly; public sale remains release-gated.',
  billing_interval = 'year',
  price_cents = 49000,
  currency = 'usd',
  discount_pct = 17,
  sort_order = 40
where slug = 'agent_pro_annual';
