-- Pro pricing → $29/mo, $290/yr (annual ≈ 2 months free, ~17% off).
--
-- DISPLAY METADATA ONLY. This migration does NOT touch plans.stripe_price_id
-- and does NOT change what any customer is charged. The live price the user
-- sees + pays comes from the Stripe Price referenced by the env vars
-- STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_ANNUAL:
--   * /pricing + /profile read it live via stripe.prices.retrieve(envPriceId)
--   * checkout (app/actions/billing.ts getPlanPriceId) is now env-first
--   * the webhook (lib/stripe/subscription-sync.ts resolvePlanIdForPrice)
--     matches incoming subscriptions to a plan by stripe_price_id, then
--     falls back to the same env vars.
-- So the actual price flip is the env-var swap once the new Stripe Prices
-- exist — see the go-live checklist. price_cents is read by NO app code today
-- (admin/display metadata only), so these updates are behaviour-neutral.
--
-- GRANDFATHERING — DO NOT null or repoint plans.stripe_price_id here. Existing
-- subscribers keep their OLD Stripe Price; on renewal their webhook carries the
-- OLD price id, and resolvePlanIdForPrice maps it to Pro via this column. If
-- you null/repoint it to the new price, grandfathered renewals stop matching
-- and those paying customers silently downgrade to Free.

update public.plans
set
  price_cents = 2900,
  billing_interval = 'month',
  discount_pct = 0,
  description = 'Full Pro access billed monthly.'
where slug = 'pro_monthly';

update public.plans
set
  price_cents = 29000,
  billing_interval = 'year',
  discount_pct = 17,
  description = 'Full Pro access billed yearly (~2 months free).'
where slug = 'pro_annual';
