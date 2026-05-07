-- Add a separate entitlement for the main dashboard analytics/charts view.
-- This keeps dashboard entry access separate from the dashboard insights page.

update public.plans
set entitlements = jsonb_set(
  entitlements,
  '{features}',
  case
    when coalesce(entitlements->'features', '[]'::jsonb) ? 'dashboard_insights'
      then coalesce(entitlements->'features', '[]'::jsonb)
    else coalesce(entitlements->'features', '[]'::jsonb) || jsonb_build_array('dashboard_insights')
  end
)
where slug in ('pro_monthly', 'pro_annual');
