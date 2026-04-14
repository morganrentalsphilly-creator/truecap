-- Denormalized operating expense fields for saved analyses (query/reporting).
-- Full detail remains in form_snapshot jsonb.

alter table public.saved_analyses
  add column property_tax_mo numeric,
  add column insurance_mo numeric,
  add column hoa_mo numeric,
  add column utilities_mo numeric,
  add column maintenance_pct numeric,
  add column vacancy_pct numeric,
  add column mgmt_pct numeric,
  add column capex_pct numeric;
