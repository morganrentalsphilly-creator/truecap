-- Add template management entitlement to premium plans only.

update public.plans p
set entitlements = jsonb_set(
  p.entitlements,
  '{features}',
  coalesce(
    (
      select jsonb_agg(f.feature)
      from (
        select distinct s.feature
        from (
          select jsonb_array_elements_text(coalesce(p.entitlements -> 'features', '[]'::jsonb)) as feature
          union all
          select 'template_manage'
        ) s
      ) f
    ),
    '[]'::jsonb
  )
)
where p.slug in ('pro_monthly', 'pro_annual');

update public.plans p
set entitlements = jsonb_set(
  p.entitlements,
  '{features}',
  coalesce(
    (
      select jsonb_agg(f.feature)
      from (
        select s.feature
        from (
          select jsonb_array_elements_text(coalesce(p.entitlements -> 'features', '[]'::jsonb)) as feature
        ) s
        where s.feature <> 'template_manage'
      ) f
    ),
    '[]'::jsonb
  )
)
where p.slug = 'free';
