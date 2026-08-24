-- ============================================================
-- deal_comps write-boundary repair
--
-- NOT APPLIED / SURFACED FOR REVIEW. Do not auto-apply this migration.
--
-- The application already persists provider responses only through the
-- ownership-checking server action's service-role client. The original table
-- nevertheless granted authenticated browsers INSERT/UPDATE/DELETE policies,
-- allowing a user to bypass that server validation and write an arbitrary
-- provider-shaped payload. This permission-only migration closes that gap.
-- It changes no rows, columns, provider calls, calculations, or Stripe state.
-- It is idempotent and keeps authenticated owner reads working.
-- ============================================================

begin;

do $$
begin
  if to_regclass('public.deal_comps') is null then
    raise exception using
      errcode = '55000',
      message = 'deal_comps service-role hardening requires public.deal_comps';
  end if;
end;
$$;

alter table public.deal_comps enable row level security;
alter table public.deal_comps force row level security;

drop policy if exists "deal_comps_insert_own" on public.deal_comps;
drop policy if exists "deal_comps_update_own" on public.deal_comps;
drop policy if exists "deal_comps_delete_own" on public.deal_comps;

-- Recreate the one supported browser capability with an explicit role. A
-- policy is not a grant, so privileges are reset to the minimum at the same
-- time; an overlooked future write policy still cannot restore browser DML.
drop policy if exists "deal_comps_select_own" on public.deal_comps;
create policy "deal_comps_select_own" on public.deal_comps
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.deal_comps from public, anon, authenticated, service_role;
grant select on table public.deal_comps to authenticated;
grant select, insert, update on table public.deal_comps to service_role;

comment on table public.deal_comps is
  'Per-saved-deal provider comp set (reference-only; never calculation authority). Authenticated owners may read; only ownership-checking service-role code may insert/update. Rows are removed by the saved_analyses FK cascade.';

commit;

-- --------------------------------------------------------------------------
-- ROLLBACK (REVIEW ONLY)
--
-- The safe operational rollback is to revert the application reader/writer,
-- not to reopen direct browser writes. If an approved product requirement
-- later needs browser DML, first add server-equivalent payload validation and
-- ownership tests, then explicitly re-grant only the needed verbs and recreate
-- narrowly scoped policies in a new reviewed migration. Do not blindly restore
-- the three permissive policies from 20260621240000_deal_comps.sql.
-- --------------------------------------------------------------------------
