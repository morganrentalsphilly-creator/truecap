-- Persist PMI / FHA-MIP overrides on saved analysis templates.
--
-- The investment form + calc-analysis support a template-level PMI override
-- (pmiAnnualRatePct) and an FHA "MIP never cancels" flag (pmiNoCancel) — the
-- FHA starter template sets 0.55% + no-cancel. But the templates table never
-- stored them, so saving a template DROPPED the PMI assumption and applying it
-- re-underwrote at the default 0.8% conventional PMI (wrong for FHA/custom).
--
-- Additive + nullable (null = "use the calc default"). Apply this alongside the
-- deploy of the matching code (TEMPLATE_ROW_FIELDS selects these columns), the
-- same way the buy_box column was rolled out.

alter table public.analysis_templates
  add column if not exists pmi_annual_rate_pct numeric;

alter table public.analysis_templates
  add column if not exists pmi_no_cancel boolean;

comment on column public.analysis_templates.pmi_annual_rate_pct is
  'Optional PMI/MIP annual rate override (% of loan). Null = use the calc default (0.8% conventional).';
comment on column public.analysis_templates.pmi_no_cancel is
  'When true, PMI/MIP never auto-cancels at 80% LTV (FHA MIP). Null/false = cancels.';
