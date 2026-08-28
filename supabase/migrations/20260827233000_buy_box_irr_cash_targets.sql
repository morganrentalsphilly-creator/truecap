-- Offer Ceiling target parity: a named Buy Box may optionally require a
-- unique 10-year pre-tax IRR and/or cap modeled acquisition cash. Both are
-- nullable so existing boxes and snapshots retain their exact behavior.

alter table public.user_buy_boxes
  add column if not exists min_irr_pct numeric;

alter table public.user_buy_boxes
  add column if not exists max_cash_required numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_buy_boxes_min_irr_pct_check'
  ) then
    alter table public.user_buy_boxes
      add constraint user_buy_boxes_min_irr_pct_check
      check (min_irr_pct is null or (min_irr_pct >= -99.9 and min_irr_pct <= 1000));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_buy_boxes_max_cash_required_check'
  ) then
    alter table public.user_buy_boxes
      add constraint user_buy_boxes_max_cash_required_check
      check (max_cash_required is null or (max_cash_required >= 0 and max_cash_required <= 1000000000));
  end if;
end $$;

comment on column public.user_buy_boxes.min_irr_pct is
  'Optional minimum unique 10-year pre-tax IRR percentage used by Buy Box fit and Offer Ceiling.';

comment on column public.user_buy_boxes.max_cash_required is
  'Optional maximum modeled acquisition cash used by Buy Box fit and Offer Ceiling.';
