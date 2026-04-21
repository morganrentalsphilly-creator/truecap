-- Denormalized depreciation + expense growth inputs for saved analyses.
-- Full detail remains in form_snapshot jsonb.

alter table public.saved_analyses
  add column depreciation_pct numeric,
  add column inflation_rate_pct numeric;
