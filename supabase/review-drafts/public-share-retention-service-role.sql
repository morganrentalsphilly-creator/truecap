-- ============================================================
-- Bounded public-share retention cleanup
-- TRUECAP_DRAFT_SQL: DO_NOT_APPLY
--
-- NOT APPLIED / SURFACED FOR REVIEW. Do not auto-apply this migration.
--
-- This migration adds indexes and a service-role-only cleanup function. It
-- does not delete a row when applied, schedule a job, change the existing
-- 180-day share expiry, alter share resolution, or choose a retention grace.
-- Every invocation must supply an explicit non-negative grace interval and a
-- bounded batch size. Only rows already expired or revoked at/before the
-- resulting cutoff are eligible. The function is idempotent across retries.
-- ============================================================

begin;

do $$
begin
  if to_regclass('public.public_shares') is null then
    raise exception using
      errcode = '55000',
      message = 'public share retention requires public.public_shares';
  end if;
end;
$$;

create index if not exists public_shares_expiry_cleanup_idx
  on public.public_shares (expires_at, id)
  where expires_at is not null;

create index if not exists public_shares_revocation_cleanup_idx
  on public.public_shares (revoked_at, id)
  where revoked_at is not null;

create or replace function public.purge_expired_or_revoked_public_shares(
  p_grace interval,
  p_batch_limit integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
  cutoff timestamptz;
begin
  if p_grace is null or p_grace < interval '0 seconds' then
    raise exception using
      errcode = '22023',
      message = 'public share purge grace must be an explicit non-negative interval';
  end if;
  if p_batch_limit is null or p_batch_limit < 1 or p_batch_limit > 1000 then
    raise exception using
      errcode = '22023',
      message = 'public share purge batch limit must be between 1 and 1000';
  end if;

  cutoff := clock_timestamp() - p_grace;

  with candidates as (
    select s.id
      from public.public_shares s
     where (
       s.expires_at is not null
       and s.expires_at <= cutoff
     ) or (
       s.revoked_at is not null
       and s.revoked_at <= cutoff
     )
     order by least(
       coalesce(s.expires_at, 'infinity'::timestamptz),
       coalesce(s.revoked_at, 'infinity'::timestamptz)
     ), s.id
     limit p_batch_limit
     for update skip locked
  ), deleted as (
    delete from public.public_shares s
    using candidates c
    where s.id = c.id
    returning s.id
  )
  select count(*)::integer into deleted_count from deleted;

  return deleted_count;
end;
$$;

comment on function public.purge_expired_or_revoked_public_shares(interval, integer) is
  'Service-role-only bounded purge. Caller must supply the approved retention grace; only shares already expired or revoked at/before now minus that grace are eligible.';

revoke all on function public.purge_expired_or_revoked_public_shares(interval, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.purge_expired_or_revoked_public_shares(interval, integer)
  to service_role;

commit;

-- --------------------------------------------------------------------------
-- ROLLBACK / INCIDENT NOTE
--
-- Before any invocation, rollback can drop only this function and the two
-- additive indexes in a reviewed migration. After invocation, dropping the
-- function cannot restore deleted rows; recovery requires a tested database
-- backup. Disable the scheduler/caller first, preserve its audit log, and do
-- not run an ad hoc compensating insert. The scheduler and grace decision are
-- deliberately outside this migration and remain activation-blocked.
-- --------------------------------------------------------------------------
