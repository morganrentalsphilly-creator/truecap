-- Persist the owner-confirmed cumulative TrueCap analysis total in the same
-- service-role-only counter that every future Run analysis increments.
--
-- Approved by the product owner on 2026-08-23. `greatest` makes this
-- idempotent and prevents an already-higher measured total from moving
-- backwards. The application publishes only this persisted raw counter; it
-- has no synthetic display floor.

insert into public.app_counters as counters (key, count, updated_at)
values ('analysis_runs', 51900, now())
on conflict (key) do update
set count = greatest(counters.count, excluded.count),
    updated_at = case
      when counters.count < excluded.count then now()
      else counters.updated_at
    end;
