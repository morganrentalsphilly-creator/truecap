-- Atomic reserve/refund for app_counters, to make the RentCast monthly budget
-- cap race-free.
--
-- Today property-comps reads the counter, checks it against the cap, then
-- increments AFTER the live fetch. Under concurrency every in-flight request
-- can clear the same read-gate and overshoot the cap by the number of
-- concurrent lookups — each one a billable RentCast call beyond the budget.
--
-- increment_app_counter_if_under() reserves atomically: it bumps the counter by
-- `amount` ONLY while the current value is still under `max_value`, and returns
-- the new count — or NULL when it's already at/over the cap (caller treats NULL
-- as "at cap"). decrement_app_counter() refunds a reservation when the live
-- fetch fails (floored at 0). Both are additive; the existing
-- increment_app_counter() RPC is untouched, and property-comps falls back to
-- the legacy read-then-increment path if these functions aren't present yet.

create or replace function public.increment_app_counter_if_under(
  counter_key text,
  max_value integer,
  amount integer default 1
)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.app_counters as c (key, count)
    values (counter_key, amount)
    on conflict (key) do update
      set count = c.count + amount
      where c.count < max_value
    returning c.count into new_count;
  -- NULL = the conflict-update was skipped because count was already >= cap.
  return new_count;
end;
$$;

create or replace function public.decrement_app_counter(
  counter_key text,
  amount integer default 1
)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update public.app_counters
    set count = greatest(0, count - amount)
    where key = counter_key
    returning count into new_count;
  return new_count;
end;
$$;
