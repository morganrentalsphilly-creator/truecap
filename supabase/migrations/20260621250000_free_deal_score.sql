-- Deal Score is canonically FREE (score + subscore breakdown).
--
-- The runtime already returns the full Deal Score to everyone
-- (app/actions/deal-score.ts) and both homepages hardcode it on, but the
-- `free` plan's entitlements JSON never listed `deal_score` — so the data
-- layer disagreed with the code (and with the pricing page). This aligns the
-- data layer by appending `deal_score` to the free plan's feature array.
--
-- Idempotent: only appends when not already present. Additive; no gate relies
-- on this for Deal Score today (it's a free runtime path), but the catalog +
-- a consistency test now expect data == code == copy.

update public.plans
set entitlements = jsonb_set(
  entitlements,
  '{features}',
  (entitlements -> 'features') || '["deal_score"]'::jsonb
)
where slug = 'free'
  and not ((entitlements -> 'features') @> '["deal_score"]'::jsonb);
