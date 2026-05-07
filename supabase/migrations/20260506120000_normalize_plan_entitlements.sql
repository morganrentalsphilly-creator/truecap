-- Keep feature access data-driven from public.plans.entitlements.
-- max_saved_deals = null means unlimited.

update public.plans
set entitlements = jsonb_build_object(
  'features', jsonb_build_array('cash_flow', 'save_deal', 'dashboard_access'),
  'max_saved_deals', 5
)
where slug = 'free';

update public.plans
set entitlements = jsonb_build_object(
  'features',
  jsonb_build_array(
    'cash_flow',
    'save_deal',
    'dashboard_access',
    'compare_deals',
    'deal_score',
    'tax_strategy',
    'projections',
    'exit_scenarios',
    'template_manage',
    'pdf_export'
  ),
  'max_saved_deals', null
)
where slug in ('pro_monthly', 'pro_annual');
