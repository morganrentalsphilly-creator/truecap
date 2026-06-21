-- Optional Buy Box thresholds attached to a calculation template.
--
-- Lets a template carry acquisition criteria (min cap rate / cash-on-cash /
-- DSCR / monthly cash flow, max purchase price) so the user can adopt them
-- as their personal Buy Box in one click from the templates page. Shape
-- (app-validated; see lib/analysis-template-schema.ts):
--   { "minCapRatePct": 6, "minCocPct": 8, "minDscr": 1.25,
--     "minCashFlowMonthly": 200, "maxPurchasePrice": 300000 }
-- Any field may be null/absent. Null column = the template has no buy box.
--
-- Additive + nullable; Pro-gating (template_manage) and RLS unchanged.

alter table public.analysis_templates
  add column if not exists buy_box jsonb;

comment on column public.analysis_templates.buy_box is
  'Optional acquisition-criteria thresholds on a template (min cap/CoC/DSCR/cash flow, max price). Powers "use this template as my Buy Box". See lib/analysis-template-schema.ts.';
