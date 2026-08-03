-- Lock profiles.comps_free_used against JWT-authenticated writes.
--
-- SECURITY FIX. comps_free_used is the ONLY gate on a free user's single
-- lifetime RentCast comps lookup, and it lived on a row the user can write:
-- the profiles_update_own RLS policy is whole-row (using/with check
-- auth.uid() = id) with no column list, and `authenticated` holds table-wide
-- UPDATE. A signed-in free user could therefore
--   PATCH /rest/v1/profiles?id=eq.<own uid>  {"comps_free_used": false}
-- after every lookup and mint unlimited "one lifetime" comps pulls — each one
-- a real, billed RentCast call that also decrements the SHARED monthly
-- enrichment budget (RENTCAST_MONTHLY_ENRICHMENT_CAP), which the rent-alert
-- cron and every paying Pro user draw from. i.e. a paid-feature denial of
-- service funded from a free account.
--
-- Fix mirrors the existing stripe_customer_id treatment: the column is pinned
-- to its previous value whenever the writer is the `authenticated` role, so
-- only the service-role path (app/actions/property-comps.ts, which now claims
-- and refunds the freebie with createAdminSupabaseClient()) can move it.
-- Service role and postgres are unaffected (auth.role() is not 'authenticated').
--
-- Extends public.profiles_lock_stripe_customer_id_for_users() rather than
-- adding a second trigger, so the ordering of BEFORE UPDATE triggers on
-- profiles stays unchanged. The existing trigger
-- (profiles_preserve_stripe_customer_id) keeps pointing at it — no trigger
-- DDL required.

create or replace function public.profiles_lock_stripe_customer_id_for_users()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and coalesce(auth.role(), '') = 'authenticated' then
    -- Billing identity: service-role / webhooks only.
    new.stripe_customer_id := old.stripe_customer_id;
    -- Entitlement ledger: the free-comps freebie is spent and refunded by the
    -- server action under the service role, never by the account holder.
    new.comps_free_used := old.comps_free_used;
  end if;
  return new;
end;
$$;

comment on function public.profiles_lock_stripe_customer_id_for_users() is
  'BEFORE UPDATE guard on public.profiles: pins the columns a JWT-authenticated user must not set themselves (stripe_customer_id, comps_free_used) to their previous values. Service-role writes pass through.';
