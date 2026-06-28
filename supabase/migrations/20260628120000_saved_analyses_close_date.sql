-- Owned-deal tracking: when the user actually closed on a property.
--
-- Optional + nullable. Powers the dashboard equity estimate for OWNED
-- (is_completed) deals — appreciation since purchase + principal paid down,
-- computed in lib/owned-equity.ts from the deal's own financing + appreciation
-- assumptions. Null = unknown close date, in which case the equity view stays
-- hidden (invisible-until-useful) and we prompt the user to set a date.
--
-- Additive + nullable-safe. No backfill — existing owned deals simply show the
-- "set a close date" prompt. Owner-RLS on saved_analyses already lets a user
-- update their own row, so no policy change is needed.

alter table public.saved_analyses
  add column if not exists close_date date;

comment on column public.saved_analyses.close_date is
  'Date the user closed on this property (owned deals only). Drives the dashboard equity estimate. Null = unknown.';
