-- Bind each provider comp row to the owner of its parent saved analysis.
--
-- The earlier permission hardening removed browser writes. Before that
-- migration, however, its owner policy checked deal_comps.user_id without
-- proving that the referenced saved analysis had the same owner. This
-- forward-only migration audits the historical rows and makes that tenant
-- relationship a permanent database invariant.

begin;

do $$
begin
  if to_regclass('public.deal_comps') is null
     or to_regclass('public.saved_analyses') is null then
    raise exception using
      errcode = '55000',
      message = 'deal_comps owner binding requires deal_comps and saved_analyses';
  end if;

  if to_regclass('public.saved_analyses_id_user_watch_fk_idx') is null then
    raise exception using
      errcode = '55000',
      message = 'deal_comps owner binding requires the composite saved-analysis ownership key',
      hint = 'Apply 20260815140000_saved_deal_watch.sql first.';
  end if;

  -- Never guess which tenant should receive an inconsistent provider payload.
  -- Abort before DDL so an operator can review and remove/quarantine any row.
  if exists (
    select 1
    from public.deal_comps as dc
    join public.saved_analyses as sa on sa.id = dc.analysis_id
    where dc.user_id is distinct from sa.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'deal_comps contains rows whose owner does not match the saved analysis',
      hint = 'Review the mismatched rows, remove or quarantine them, then rerun this migration. Do not reassign untrusted payloads across tenants.';
  end if;
end;
$$;

-- The existing analysis_id FK remains for backwards compatibility. This
-- additive composite FK prevents even privileged future code from linking a
-- comp row to a saved analysis owned by another tenant.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deal_comps_owned_analysis_fk'
      and conrelid = 'public.deal_comps'::regclass
  ) then
    alter table public.deal_comps
      add constraint deal_comps_owned_analysis_fk
      foreign key (analysis_id, user_id)
      references public.saved_analyses(id, user_id)
      on delete cascade
      not valid;
  end if;
end;
$$;

alter table public.deal_comps
  validate constraint deal_comps_owned_analysis_fk;

comment on constraint deal_comps_owned_analysis_fk on public.deal_comps is
  'Tenant binding: a comp row and its parent saved analysis must have the same owner.';

commit;
