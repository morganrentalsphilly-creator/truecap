-- Denormalized columns aligned with investment form + template naming (snake_case).
-- Full detail remains in form_snapshot jsonb.

alter table public.saved_analyses
  add column if not exists address text,
  add column if not exists year_built integer,
  add column if not exists loan_term_years numeric,
  add column if not exists interest_rate_pct numeric,
  add column if not exists down_payment_pct numeric,
  add column if not exists closing_costs_pct numeric,
  add column if not exists bedrooms integer,
  add column if not exists bathrooms numeric,
  add column if not exists sqft integer,
  add column if not exists monthly_rent numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_interest_rate_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_interest_rate_pct_check
      check (interest_rate_pct is null or (interest_rate_pct >= 0 and interest_rate_pct <= 100));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_down_payment_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_down_payment_pct_check
      check (down_payment_pct is null or (down_payment_pct >= 0 and down_payment_pct <= 100));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_closing_costs_pct_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_closing_costs_pct_check
      check (closing_costs_pct is null or (closing_costs_pct >= 0 and closing_costs_pct <= 100));
  end if;
end $$;
