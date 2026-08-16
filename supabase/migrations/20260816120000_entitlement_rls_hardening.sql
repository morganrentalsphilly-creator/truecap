-- ============================================================
-- Entitlement + tenant-boundary hardening
--
-- Additive/idempotent defense in depth for direct PostgREST and Storage API
-- callers. Server Actions remain the friendly validation/error boundary, but
-- the database is the final authority for ownership, paid feature access, and
-- the Free saved-deal quota.
--
-- Current product truth supersedes the stale 20260621190000 comment:
-- due-diligence checklist MUTATIONS and document-vault WRITES are Pro-only.
-- Existing owner data is retained; owner reads remain available so a
-- downgrade never deletes or transfers data.
--
-- Service-role/background writes keep working. All SECURITY DEFINER helpers
-- use a fixed, catalog-only search_path and are either trigger-private or
-- expose only the current caller's own entitlement/ownership result.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) Canonical, fail-closed current-user entitlement helpers
-- ---------------------------------------------------------------------------

create or replace function public.truecap_entitlements_are_valid(p_entitlements jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  limit_kind text;
  limit_text text;
  limit_number numeric;
begin
  if p_entitlements is null
     or jsonb_typeof(p_entitlements) <> 'object'
     or jsonb_typeof(p_entitlements -> 'features') <> 'array'
     or not (p_entitlements ? 'max_saved_deals') then
    return false;
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_entitlements -> 'features') feature
     where jsonb_typeof(feature) <> 'string'
  ) then
    return false;
  end if;

  limit_kind := jsonb_typeof(p_entitlements -> 'max_saved_deals');
  if limit_kind = 'null' then
    return true;
  end if;

  limit_text := btrim(p_entitlements ->> 'max_saved_deals');
  if limit_kind = 'string'
     and lower(limit_text) in ('unlimited', 'none', 'null') then
    return true;
  end if;

  if limit_kind not in ('number', 'string') or limit_text = '' then
    return false;
  end if;

  begin
    limit_number := limit_text::numeric;
  exception when others then
    return false;
  end;

  return limit_number >= 0
     and trunc(limit_number) = limit_number
     and limit_number <= 2147483647;
end;
$$;

revoke all on function public.truecap_entitlements_are_valid(jsonb) from public;
revoke all on function public.truecap_entitlements_are_valid(jsonb) from anon;
revoke all on function public.truecap_entitlements_are_valid(jsonb) from authenticated;

create or replace function public.truecap_current_effective_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  candidate jsonb;
begin
  if auth.uid() is null then
    return '{"features":[],"max_saved_deals":0}'::jsonb;
  end if;

  -- Match lib/entitlements.ts: newest active/trialing/past_due plan first.
  -- An inactive/missing/malformed paid plan falls through to canonical Free.
  select plan.entitlements
    into candidate
    from public.subscriptions subscription
    join public.plans plan on plan.id = subscription.plan_id
   where subscription.user_id = auth.uid()
     and subscription.status in ('active', 'trialing', 'past_due')
     and plan.is_active = true
   order by subscription.updated_at desc
   limit 1;

  if public.truecap_entitlements_are_valid(candidate) then
    return candidate;
  end if;

  candidate := null;
  select plan.entitlements
    into candidate
    from public.plans plan
   where plan.slug = 'free'
     and plan.is_active = true
   limit 1;

  if public.truecap_entitlements_are_valid(candidate) then
    return candidate;
  end if;

  -- Missing/malformed Free plan: no features and zero saves, never a grant.
  return '{"features":[],"max_saved_deals":0}'::jsonb;
end;
$$;

revoke all on function public.truecap_current_effective_entitlements() from public;
revoke all on function public.truecap_current_effective_entitlements() from anon;
grant execute on function public.truecap_current_effective_entitlements() to authenticated;
grant execute on function public.truecap_current_effective_entitlements() to service_role;

create or replace function public.truecap_current_user_has_feature(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select auth.uid() is not null
     and coalesce(
       public.truecap_current_effective_entitlements() -> 'features'
         @> jsonb_build_array(p_feature),
       false
     );
$$;

revoke all on function public.truecap_current_user_has_feature(text) from public;
revoke all on function public.truecap_current_user_has_feature(text) from anon;
grant execute on function public.truecap_current_user_has_feature(text) to authenticated;
grant execute on function public.truecap_current_user_has_feature(text) to service_role;

create or replace function public.truecap_current_user_has_paid_plan()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  -- Match hasPaidPlanSubscription/getActivePaidPlanSlug: a newest live
  -- non-Free plan in the same three accepted subscription states.
  select auth.uid() is not null and exists (
    select 1
      from public.subscriptions subscription
      join public.plans plan on plan.id = subscription.plan_id
     where subscription.user_id = auth.uid()
       and subscription.status in ('active', 'trialing', 'past_due')
       and plan.is_active = true
       and plan.slug <> 'free'
     order by subscription.updated_at desc
     limit 1
  );
$$;

revoke all on function public.truecap_current_user_has_paid_plan() from public;
revoke all on function public.truecap_current_user_has_paid_plan() from anon;
grant execute on function public.truecap_current_user_has_paid_plan() to authenticated;
grant execute on function public.truecap_current_user_has_paid_plan() to service_role;

create or replace function public.truecap_current_saved_deal_limit()
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  entitlements jsonb := public.truecap_current_effective_entitlements();
  raw_limit jsonb;
  normalized text;
begin
  raw_limit := entitlements -> 'max_saved_deals';
  if jsonb_typeof(raw_limit) = 'null' then
    return null;
  end if;

  normalized := lower(btrim(entitlements ->> 'max_saved_deals'));
  if normalized in ('unlimited', 'none', 'null') then
    return null;
  end if;

  -- truecap_current_effective_entitlements returns only validated shapes.
  return normalized::numeric::bigint;
exception when others then
  return 0;
end;
$$;

revoke all on function public.truecap_current_saved_deal_limit() from public;
revoke all on function public.truecap_current_saved_deal_limit() from anon;
grant execute on function public.truecap_current_saved_deal_limit() to authenticated;
grant execute on function public.truecap_current_saved_deal_limit() to service_role;

create or replace function public.truecap_is_trusted_service_context()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  -- PostgREST service-role requests carry the service_role JWT claim. Direct
  -- migrations/pg_cron run as a trusted database session; session_user (not
  -- current_user) prevents an exposed SECURITY DEFINER RPC from impersonating
  -- that direct session.
  select coalesce(auth.role(), '') = 'service_role'
      or session_user::text in ('postgres', 'supabase_admin');
$$;

revoke all on function public.truecap_is_trusted_service_context() from public;
revoke all on function public.truecap_is_trusted_service_context() from anon;
revoke all on function public.truecap_is_trusted_service_context() from authenticated;

create or replace function public.truecap_owns_saved_analysis(
  p_analysis_id uuid,
  p_require_active boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.saved_analyses analysis
     where analysis.id = p_analysis_id
       and analysis.user_id = auth.uid()
       and (not p_require_active or analysis.deleted_at is null)
  );
$$;

revoke all on function public.truecap_owns_saved_analysis(uuid, boolean) from public;
revoke all on function public.truecap_owns_saved_analysis(uuid, boolean) from anon;
grant execute on function public.truecap_owns_saved_analysis(uuid, boolean) to authenticated;
grant execute on function public.truecap_owns_saved_analysis(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 2) Saved-deal quota, paid edits, and cross-tenant reference guards
-- ---------------------------------------------------------------------------

create or replace function public.truecap_assert_saved_deal_capacity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  deal_limit bigint;
  active_count bigint;
begin
  if public.truecap_is_trusted_service_context() then
    return;
  end if;

  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception using
      errcode = '42501',
      message = 'saved analysis owner does not match the authenticated user';
  end if;

  if not public.truecap_current_user_has_feature('save_deal') then
    raise exception using
      errcode = '42501',
      message = 'save_deal entitlement required';
  end if;

  -- Serialize capacity decisions per user. The app's count-then-insert remains
  -- useful UX, while this lock makes two simultaneous direct/app inserts
  -- unable to both observe slot five as available.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 84519327));

  deal_limit := public.truecap_current_saved_deal_limit();
  if deal_limit is null then
    return;
  end if;

  select count(*)
    into active_count
    from public.saved_analyses analysis
   where analysis.user_id = p_user_id
     and analysis.deleted_at is null;

  if active_count >= deal_limit then
    raise exception using
      errcode = '23514',
      message = format('saved deal limit reached (%s)', deal_limit),
      constraint = 'saved_analyses_plan_capacity';
  end if;
end;
$$;

revoke all on function public.truecap_assert_saved_deal_capacity(uuid) from public;
revoke all on function public.truecap_assert_saved_deal_capacity(uuid) from anon;
revoke all on function public.truecap_assert_saved_deal_capacity(uuid) from authenticated;

create or replace function public.truecap_enforce_saved_analysis_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  old_row jsonb;
  new_row jsonb := to_jsonb(new);
  old_core jsonb;
  new_core jsonb;
  template_id_text text;
  property_id_text text;
  client_id_text text;
begin
  if public.truecap_is_trusted_service_context() then
    return new;
  end if;

  if auth.uid() is null or auth.uid() <> new.user_id
     or (tg_op = 'UPDATE' and auth.uid() <> old.user_id) then
    raise exception using
      errcode = '42501',
      message = 'saved analysis owner does not match the authenticated user';
  end if;

  template_id_text := nullif(new_row ->> 'template_id', '');
  property_id_text := nullif(new_row ->> 'property_id', '');
  client_id_text := nullif(new_row ->> 'client_id', '');

  if tg_op = 'INSERT' then
    perform public.truecap_assert_saved_deal_capacity(new.user_id);

    if template_id_text is not null then
      if not public.truecap_current_user_has_feature('template_manage') then
        raise exception using errcode = '42501', message = 'template_manage entitlement required';
      end if;
      if not exists (
        select 1 from public.analysis_templates template
         where template.id::text = template_id_text
           and (template.is_system = true or template.user_id = new.user_id)
      ) then
        raise exception using errcode = '23514', message = 'template_id must reference a visible owned template';
      end if;
    end if;

    if property_id_text is not null
       or (new_row ->> 'scenario_name') is not null
       or (new_row ->> 'strategy_kind') is not null then
      if not public.truecap_current_user_has_paid_plan() then
        raise exception using errcode = '42501', message = 'a paid plan is required for saved scenarios';
      end if;
      if property_id_text is not null and not exists (
        select 1 from public.properties property
         where property.id::text = property_id_text
           and property.user_id = new.user_id
      ) then
        raise exception using errcode = '23514', message = 'property_id must reference an owned property';
      end if;
    end if;

    if (new_row ->> 'pipeline_stage') is not null
       or coalesce(new_row -> 'tags', '[]'::jsonb) <> '[]'::jsonb then
      if not public.truecap_current_user_has_feature('pipeline') then
        raise exception using errcode = '42501', message = 'pipeline entitlement required';
      end if;
    end if;

    if client_id_text is not null then
      if not public.truecap_current_user_has_feature('client_buy_box') then
        raise exception using errcode = '42501', message = 'client_buy_box entitlement required';
      end if;
      if not exists (
        select 1 from public.agent_clients client
         where client.id::text = client_id_text
           and client.agent_user_id = new.user_id
      ) then
        raise exception using errcode = '23514', message = 'client_id must reference an owned client';
      end if;
    end if;

    if (new_row ->> 'pdf_url') is not null
       or (new_row ->> 'pdf_generated_at') is not null
       or coalesce((new_row ->> 'pdf_snapshot_version')::integer, 0) <> 0 then
      if not public.truecap_current_user_has_feature('pdf_export') then
        raise exception using errcode = '42501', message = 'pdf_export entitlement required';
      end if;
    end if;

    return new;
  end if;

  old_row := to_jsonb(old);

  -- Restoring a soft-deleted row consumes capacity exactly like a new save.
  if old.deleted_at is not null and new.deleted_at is null then
    perform public.truecap_assert_saved_deal_capacity(new.user_id);
  end if;

  if new_row -> 'template_id' is distinct from old_row -> 'template_id' then
    if not public.truecap_current_user_has_feature('template_manage') then
      raise exception using errcode = '42501', message = 'template_manage entitlement required';
    end if;
    if template_id_text is not null and not exists (
      select 1 from public.analysis_templates template
       where template.id::text = template_id_text
         and (template.is_system = true or template.user_id = new.user_id)
    ) then
      raise exception using errcode = '23514', message = 'template_id must reference a visible owned template';
    end if;
  end if;

  if new_row -> 'property_id' is distinct from old_row -> 'property_id'
     or new_row -> 'scenario_name' is distinct from old_row -> 'scenario_name'
     or new_row -> 'strategy_kind' is distinct from old_row -> 'strategy_kind' then
    if not public.truecap_current_user_has_paid_plan() then
      raise exception using errcode = '42501', message = 'a paid plan is required for saved scenarios';
    end if;
    if property_id_text is not null and not exists (
      select 1 from public.properties property
       where property.id::text = property_id_text
         and property.user_id = new.user_id
    ) then
      raise exception using errcode = '23514', message = 'property_id must reference an owned property';
    end if;
  end if;

  if new_row -> 'pipeline_stage' is distinct from old_row -> 'pipeline_stage'
     or new_row -> 'tags' is distinct from old_row -> 'tags' then
    if not public.truecap_current_user_has_feature('pipeline') then
      raise exception using errcode = '42501', message = 'pipeline entitlement required';
    end if;
  end if;

  if new_row -> 'client_id' is distinct from old_row -> 'client_id' then
    if not public.truecap_current_user_has_feature('client_buy_box') then
      raise exception using errcode = '42501', message = 'client_buy_box entitlement required';
    end if;
    if client_id_text is not null and not exists (
      select 1 from public.agent_clients client
       where client.id::text = client_id_text
         and client.agent_user_id = new.user_id
    ) then
      raise exception using errcode = '23514', message = 'client_id must reference an owned client';
    end if;
  end if;

  if new_row -> 'pdf_url' is distinct from old_row -> 'pdf_url'
     or new_row -> 'pdf_generated_at' is distinct from old_row -> 'pdf_generated_at'
     or new_row -> 'pdf_snapshot_version' is distinct from old_row -> 'pdf_snapshot_version' then
    if not public.truecap_current_user_has_feature('pdf_export') then
      raise exception using errcode = '42501', message = 'pdf_export entitlement required';
    end if;
  end if;

  -- These columns have explicit Free/current-user actions or a narrower gate
  -- above. Every other saved-analysis edit is a full re-underwrite and matches
  -- saveDealAction's hasPaidPlanSubscription update rule.
  old_core := old_row - array[
    'updated_at', 'last_activity_at',
    'notes', 'nickname', 'market', 'neighborhood',
    'is_completed', 'is_archived', 'deleted_at', 'close_date',
    'pipeline_stage', 'tags', 'client_id',
    'pdf_url', 'pdf_generated_at', 'pdf_snapshot_version',
    'property_id', 'scenario_name', 'strategy_kind', 'template_id'
  ];
  new_core := new_row - array[
    'updated_at', 'last_activity_at',
    'notes', 'nickname', 'market', 'neighborhood',
    'is_completed', 'is_archived', 'deleted_at', 'close_date',
    'pipeline_stage', 'tags', 'client_id',
    'pdf_url', 'pdf_generated_at', 'pdf_snapshot_version',
    'property_id', 'scenario_name', 'strategy_kind', 'template_id'
  ];

  if new_core is distinct from old_core
     and not public.truecap_current_user_has_paid_plan() then
    raise exception using
      errcode = '42501',
      message = 'a paid plan is required to update saved analysis underwriting';
  end if;

  return new;
end;
$$;

revoke all on function public.truecap_enforce_saved_analysis_write() from public;
revoke all on function public.truecap_enforce_saved_analysis_write() from anon;
revoke all on function public.truecap_enforce_saved_analysis_write() from authenticated;

drop trigger if exists saved_analyses_00_entitlement_guard on public.saved_analyses;
create trigger saved_analyses_00_entitlement_guard
  before insert or update on public.saved_analyses
  for each row execute function public.truecap_enforce_saved_analysis_write();

alter table public.saved_analyses enable row level security;

drop policy if exists "saved_analyses_select_own" on public.saved_analyses;
create policy "saved_analyses_select_own" on public.saved_analyses
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_analyses_insert_own" on public.saved_analyses;
create policy "saved_analyses_insert_own" on public.saved_analyses
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_current_user_has_feature('save_deal')
  );

drop policy if exists "saved_analyses_update_own" on public.saved_analyses;
create policy "saved_analyses_update_own" on public.saved_analyses
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_analyses_delete_own" on public.saved_analyses;
create policy "saved_analyses_delete_own" on public.saved_analyses
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3) Child rows: both duplicated owner AND owned parent are mandatory
-- ---------------------------------------------------------------------------

-- Projection snapshots: retained owner reads; Pro feature required to mutate.
alter table public.analysis_projection_snapshots enable row level security;
drop policy if exists "analysis_projection_snapshots_select_own" on public.analysis_projection_snapshots;
create policy "analysis_projection_snapshots_select_own" on public.analysis_projection_snapshots
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );
drop policy if exists "analysis_projection_snapshots_insert_own" on public.analysis_projection_snapshots;
create policy "analysis_projection_snapshots_insert_own" on public.analysis_projection_snapshots
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('projections')
  );
drop policy if exists "analysis_projection_snapshots_update_own" on public.analysis_projection_snapshots;
create policy "analysis_projection_snapshots_update_own" on public.analysis_projection_snapshots
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('projections')
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('projections')
  );
drop policy if exists "analysis_projection_snapshots_delete_own" on public.analysis_projection_snapshots;
create policy "analysis_projection_snapshots_delete_own" on public.analysis_projection_snapshots
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('projections')
  );

-- Tax snapshots: same parent proof + tax_strategy feature.
alter table public.analysis_tax_strategy_snapshots enable row level security;
drop policy if exists "analysis_tax_strategy_snapshots_select_own" on public.analysis_tax_strategy_snapshots;
create policy "analysis_tax_strategy_snapshots_select_own" on public.analysis_tax_strategy_snapshots
  for select to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, false));
drop policy if exists "analysis_tax_strategy_snapshots_insert_own" on public.analysis_tax_strategy_snapshots;
create policy "analysis_tax_strategy_snapshots_insert_own" on public.analysis_tax_strategy_snapshots
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('tax_strategy')
  );
drop policy if exists "analysis_tax_strategy_snapshots_update_own" on public.analysis_tax_strategy_snapshots;
create policy "analysis_tax_strategy_snapshots_update_own" on public.analysis_tax_strategy_snapshots
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('tax_strategy')
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('tax_strategy')
  );
drop policy if exists "analysis_tax_strategy_snapshots_delete_own" on public.analysis_tax_strategy_snapshots;
create policy "analysis_tax_strategy_snapshots_delete_own" on public.analysis_tax_strategy_snapshots
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('tax_strategy')
  );

-- Exit snapshots: same parent proof + exit_scenarios feature.
alter table public.analysis_exit_scenario_snapshots enable row level security;
drop policy if exists "analysis_exit_scenario_snapshots_select_own" on public.analysis_exit_scenario_snapshots;
create policy "analysis_exit_scenario_snapshots_select_own" on public.analysis_exit_scenario_snapshots
  for select to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, false));
drop policy if exists "analysis_exit_scenario_snapshots_insert_own" on public.analysis_exit_scenario_snapshots;
create policy "analysis_exit_scenario_snapshots_insert_own" on public.analysis_exit_scenario_snapshots
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('exit_scenarios')
  );
drop policy if exists "analysis_exit_scenario_snapshots_update_own" on public.analysis_exit_scenario_snapshots;
create policy "analysis_exit_scenario_snapshots_update_own" on public.analysis_exit_scenario_snapshots
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('exit_scenarios')
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('exit_scenarios')
  );
drop policy if exists "analysis_exit_scenario_snapshots_delete_own" on public.analysis_exit_scenario_snapshots;
create policy "analysis_exit_scenario_snapshots_delete_own" on public.analysis_exit_scenario_snapshots
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_feature('exit_scenarios')
  );

-- Due diligence: the live offer is Pro. Retain owned rows, but every mutation
-- requires a paid plan and an active owned parent.
comment on table public.deal_due_diligence is
  'Per-saved-deal due-diligence checklist. Pro-only mutations; retained owner-only reads; parent ownership is enforced by RLS.';
alter table public.deal_due_diligence enable row level security;
drop policy if exists "deal_due_diligence_select_own" on public.deal_due_diligence;
create policy "deal_due_diligence_select_own" on public.deal_due_diligence
  for select to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, false));
drop policy if exists "deal_due_diligence_insert_own" on public.deal_due_diligence;
create policy "deal_due_diligence_insert_own" on public.deal_due_diligence
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_paid_plan()
  );
drop policy if exists "deal_due_diligence_update_own" on public.deal_due_diligence;
create policy "deal_due_diligence_update_own" on public.deal_due_diligence
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_paid_plan()
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_paid_plan()
  );
drop policy if exists "deal_due_diligence_delete_own" on public.deal_due_diligence;
create policy "deal_due_diligence_delete_own" on public.deal_due_diligence
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
    and public.truecap_current_user_has_paid_plan()
  );

-- Comments are currently an authenticated feature, but a child row still
-- must belong to an active parent owned by the same caller.
alter table public.deal_comments enable row level security;
drop policy if exists "deal_comments_select_own" on public.deal_comments;
create policy "deal_comments_select_own" on public.deal_comments
  for select to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, false));
drop policy if exists "deal_comments_insert_own" on public.deal_comments;
create policy "deal_comments_insert_own" on public.deal_comments
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, true));
drop policy if exists "deal_comments_delete_own" on public.deal_comments;
create policy "deal_comments_delete_own" on public.deal_comments
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, true));

-- Comp writes already go through the service-role action after its owned-deal
-- and one-lifetime/paid lookup checks. Remove redundant direct-user writes so
-- the ledger cannot be bypassed or a public deal id poisoned. Owner reads stay.
alter table public.deal_comps enable row level security;
drop policy if exists "deal_comps_select_own" on public.deal_comps;
create policy "deal_comps_select_own" on public.deal_comps
  for select to authenticated
  using (auth.uid() = user_id and public.truecap_owns_saved_analysis(analysis_id, false));
drop policy if exists "deal_comps_insert_own" on public.deal_comps;
drop policy if exists "deal_comps_update_own" on public.deal_comps;
drop policy if exists "deal_comps_delete_own" on public.deal_comps;

-- Template history cannot claim another user's template_id/unique version.
alter table public.analysis_template_versions enable row level security;
drop policy if exists "analysis_template_versions_select_own" on public.analysis_template_versions;
create policy "analysis_template_versions_select_own" on public.analysis_template_versions
  for select to authenticated
  using (
    auth.uid() = created_by
    and exists (
      select 1 from public.analysis_templates template
       where template.id = template_id
         and template.user_id = auth.uid()
         and template.is_system = false
    )
  );
drop policy if exists "analysis_template_versions_insert_own" on public.analysis_template_versions;
create policy "analysis_template_versions_insert_own" on public.analysis_template_versions
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.truecap_current_user_has_feature('template_manage')
    and exists (
      select 1 from public.analysis_templates template
       where template.id = template_id
         and template.user_id = auth.uid()
         and template.is_system = false
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Direct mutations of paid workspace tables must honor plan entitlements
-- ---------------------------------------------------------------------------

alter table public.analysis_templates enable row level security;
drop policy if exists "analysis_templates_select_visible" on public.analysis_templates;
create policy "analysis_templates_select_visible" on public.analysis_templates
  for select to public
  using (is_system = true or auth.uid() = user_id);
drop policy if exists "analysis_templates_insert_own" on public.analysis_templates;
create policy "analysis_templates_insert_own" on public.analysis_templates
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce(is_system, false) = false
    and public.truecap_current_user_has_feature('template_manage')
  );
drop policy if exists "analysis_templates_update_own" on public.analysis_templates;
create policy "analysis_templates_update_own" on public.analysis_templates
  for update to authenticated
  using (
    auth.uid() = user_id
    and is_system = false
    and public.truecap_current_user_has_feature('template_manage')
  )
  with check (
    auth.uid() = user_id
    and is_system = false
    and public.truecap_current_user_has_feature('template_manage')
  );
drop policy if exists "analysis_templates_delete_own" on public.analysis_templates;
create policy "analysis_templates_delete_own" on public.analysis_templates
  for delete to authenticated
  using (
    auth.uid() = user_id
    and is_system = false
    and public.truecap_current_user_has_feature('template_manage')
  );

alter table public.user_buy_box enable row level security;
drop policy if exists "user_buy_box_select_own" on public.user_buy_box;
create policy "user_buy_box_select_own" on public.user_buy_box
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_buy_box_insert_own" on public.user_buy_box;
create policy "user_buy_box_insert_own" on public.user_buy_box
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));
drop policy if exists "user_buy_box_update_own" on public.user_buy_box;
create policy "user_buy_box_update_own" on public.user_buy_box
  for update to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'))
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));
drop policy if exists "user_buy_box_delete_own" on public.user_buy_box;
create policy "user_buy_box_delete_own" on public.user_buy_box
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));

alter table public.user_buy_boxes enable row level security;
drop policy if exists "user_buy_boxes_select_own" on public.user_buy_boxes;
create policy "user_buy_boxes_select_own" on public.user_buy_boxes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_buy_boxes_insert_own" on public.user_buy_boxes;
create policy "user_buy_boxes_insert_own" on public.user_buy_boxes
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));
drop policy if exists "user_buy_boxes_update_own" on public.user_buy_boxes;
create policy "user_buy_boxes_update_own" on public.user_buy_boxes
  for update to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'))
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));
drop policy if exists "user_buy_boxes_delete_own" on public.user_buy_boxes;
create policy "user_buy_boxes_delete_own" on public.user_buy_boxes
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('buy_box'));

-- A Pro user may own retained Agent Pro rows after downgrade. They may read
-- them, but cannot mutate or attach client scope without client_buy_box.
create or replace function public.truecap_enforce_buy_box_client_entitlement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if public.truecap_is_trusted_service_context() then
    return new;
  end if;
  if new.client_id is not null
     and (tg_op = 'INSERT' or new.client_id is distinct from old.client_id) then
    if not public.truecap_current_user_has_feature('client_buy_box') then
      raise exception using errcode = '42501', message = 'client_buy_box entitlement required';
    end if;
    if not exists (
      select 1
        from public.agent_clients client
       where client.id = new.client_id
         and client.agent_user_id = new.user_id
    ) then
      raise exception using errcode = '23514', message = 'client_id must reference an owned client';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.truecap_enforce_buy_box_client_entitlement() from public;
revoke all on function public.truecap_enforce_buy_box_client_entitlement() from anon;
revoke all on function public.truecap_enforce_buy_box_client_entitlement() from authenticated;
drop trigger if exists user_buy_boxes_00_client_entitlement_guard on public.user_buy_boxes;
create trigger user_buy_boxes_00_client_entitlement_guard
  before insert or update of client_id on public.user_buy_boxes
  for each row execute function public.truecap_enforce_buy_box_client_entitlement();

alter table public.agent_clients enable row level security;
drop policy if exists "agent_clients_owner_select" on public.agent_clients;
create policy "agent_clients_owner_select" on public.agent_clients
  for select to authenticated using (auth.uid() = agent_user_id);
drop policy if exists "agent_clients_owner_insert" on public.agent_clients;
create policy "agent_clients_owner_insert" on public.agent_clients
  for insert to authenticated
  with check (
    auth.uid() = agent_user_id
    and public.truecap_current_user_has_feature('client_buy_box')
  );
drop policy if exists "agent_clients_owner_update" on public.agent_clients;
create policy "agent_clients_owner_update" on public.agent_clients
  for update to authenticated
  using (
    auth.uid() = agent_user_id
    and public.truecap_current_user_has_feature('client_buy_box')
  )
  with check (
    auth.uid() = agent_user_id
    and public.truecap_current_user_has_feature('client_buy_box')
  );
drop policy if exists "agent_clients_owner_delete" on public.agent_clients;
create policy "agent_clients_owner_delete" on public.agent_clients
  for delete to authenticated
  using (
    auth.uid() = agent_user_id
    and public.truecap_current_user_has_feature('client_buy_box')
  );

alter table public.branding enable row level security;
drop policy if exists "Users can view own branding" on public.branding;
create policy "Users can view own branding" on public.branding
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own branding" on public.branding;
create policy "Users can insert own branding" on public.branding
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('custom_branding'));
drop policy if exists "Users can update own branding" on public.branding;
create policy "Users can update own branding" on public.branding
  for update to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('custom_branding'))
  with check (auth.uid() = user_id and public.truecap_current_user_has_feature('custom_branding'));
drop policy if exists "Users can delete own branding" on public.branding;
create policy "Users can delete own branding" on public.branding
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_feature('custom_branding'));

-- Properties back the paid saved-scenario workflow. Their child analysis row
-- still spends the caller's saved-deal quota separately.
alter table public.properties enable row level security;
drop policy if exists "properties_select_own" on public.properties;
create policy "properties_select_own" on public.properties
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "properties_insert_own" on public.properties;
create policy "properties_insert_own" on public.properties
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());
drop policy if exists "properties_update_own" on public.properties;
create policy "properties_update_own" on public.properties
  for update to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_paid_plan())
  with check (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());
drop policy if exists "properties_delete_own" on public.properties;
create policy "properties_delete_own" on public.properties
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());

-- Saved Deal Watch's action requires a paid plan. Keep service-owned
-- checkpoints/events/outbox unchanged; only harden the two user-write tables.
alter table public.saved_deal_watch_subscriptions enable row level security;
drop policy if exists "saved_deal_watch_subscriptions_select_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_select_own" on public.saved_deal_watch_subscriptions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_subscriptions_insert_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_insert_own" on public.saved_deal_watch_subscriptions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_current_user_has_paid_plan()
    and public.truecap_current_user_has_feature('save_deal')
    and public.truecap_owns_saved_analysis(saved_analysis_id, true)
  );
drop policy if exists "saved_deal_watch_subscriptions_update_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_update_own" on public.saved_deal_watch_subscriptions
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_current_user_has_paid_plan()
    and public.truecap_owns_saved_analysis(saved_analysis_id, true)
  )
  with check (
    auth.uid() = user_id
    and public.truecap_current_user_has_paid_plan()
    and public.truecap_owns_saved_analysis(saved_analysis_id, true)
  );
drop policy if exists "saved_deal_watch_subscriptions_delete_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_delete_own" on public.saved_deal_watch_subscriptions
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_current_user_has_paid_plan()
    and public.truecap_owns_saved_analysis(saved_analysis_id, true)
  );

alter table public.saved_deal_watch_preferences enable row level security;
drop policy if exists "saved_deal_watch_preferences_select_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_select_own" on public.saved_deal_watch_preferences
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_preferences_insert_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_insert_own" on public.saved_deal_watch_preferences
  for insert to authenticated
  with check (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());
drop policy if exists "saved_deal_watch_preferences_update_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_update_own" on public.saved_deal_watch_preferences
  for update to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_paid_plan())
  with check (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());
drop policy if exists "saved_deal_watch_preferences_delete_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_delete_own" on public.saved_deal_watch_preferences
  for delete to authenticated
  using (auth.uid() = user_id and public.truecap_current_user_has_paid_plan());

-- ---------------------------------------------------------------------------
-- 5) Storage: path must resolve to an owned deal; writes need entitlement
-- ---------------------------------------------------------------------------

create or replace function public.truecap_storage_path_is_owned_deal(
  p_name text,
  p_require_active boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  parts text[];
begin
  if auth.uid() is null or p_name is null then
    return false;
  end if;
  parts := string_to_array(p_name, '/');
  if cardinality(parts) <> 3
     or parts[1] <> auth.uid()::text
     or parts[2] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     or parts[3] = '' then
    return false;
  end if;
  return exists (
    select 1
      from public.saved_analyses analysis
     where analysis.id::text = lower(parts[2])
       and analysis.user_id = auth.uid()
       and (not p_require_active or analysis.deleted_at is null)
  );
end;
$$;

revoke all on function public.truecap_storage_path_is_owned_deal(text, boolean) from public;
revoke all on function public.truecap_storage_path_is_owned_deal(text, boolean) from anon;
grant execute on function public.truecap_storage_path_is_owned_deal(text, boolean) to authenticated;
grant execute on function public.truecap_storage_path_is_owned_deal(text, boolean) to service_role;

create or replace function public.truecap_storage_metadata_allowed(
  p_metadata jsonb,
  p_max_bytes bigint,
  p_allowed_mime_types text[]
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  size_bytes numeric;
  mime_type text;
begin
  if jsonb_typeof(p_metadata) <> 'object' or p_max_bytes < 0 then
    return false;
  end if;
  begin
    size_bytes := nullif(p_metadata ->> 'size', '')::numeric;
  exception when others then
    return false;
  end;
  mime_type := lower(coalesce(
    nullif(p_metadata ->> 'mimetype', ''),
    nullif(p_metadata ->> 'contentType', ''),
    nullif(p_metadata ->> 'content-type', ''),
    ''
  ));
  return size_bytes is not null
     and size_bytes >= 0
     and size_bytes <= p_max_bytes
     and mime_type = any(p_allowed_mime_types);
end;
$$;

revoke all on function public.truecap_storage_metadata_allowed(jsonb, bigint, text[]) from public;
revoke all on function public.truecap_storage_metadata_allowed(jsonb, bigint, text[]) from anon;
grant execute on function public.truecap_storage_metadata_allowed(jsonb, bigint, text[]) to authenticated;
grant execute on function public.truecap_storage_metadata_allowed(jsonb, bigint, text[]) to service_role;

-- Reassert durable bucket limits. PostgreSQL policies can validate path and
-- Storage-populated metadata, while the Storage gateway remains responsible
-- for actual byte-count/MIME enforcement (SQL cannot safely sniff file bytes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-pdfs', 'analysis-pdfs', false, 10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-documents', 'deal-documents', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding-logos', 'branding-logos', true, 1048576,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Analysis PDFs: retained owner read after downgrade; pdf_export for all
-- writes; exact owned active deal path; PDF-only leaf + metadata.
drop policy if exists "analysis_pdfs_public_read" on storage.objects;
drop policy if exists "analysis_pdfs_select_own" on storage.objects;
create policy "analysis_pdfs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, false)
  );
drop policy if exists "analysis_pdfs_insert_own" on storage.objects;
create policy "analysis_pdfs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
    and split_part(name, '/', 3) ~ '^investment-analysis-v[0-9]+[.]pdf$'
    and public.truecap_storage_metadata_allowed(metadata, 10485760, array['application/pdf'])
  );
drop policy if exists "analysis_pdfs_update_own" on storage.objects;
create policy "analysis_pdfs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
  )
  with check (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
    and split_part(name, '/', 3) ~ '^investment-analysis-v[0-9]+[.]pdf$'
    and public.truecap_storage_metadata_allowed(metadata, 10485760, array['application/pdf'])
  );
drop policy if exists "analysis_pdfs_delete_own" on storage.objects;
create policy "analysis_pdfs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
  );

-- Deal document vault: owned-deal reads are retained; all writes are paid.
drop policy if exists "deal_documents_select_own" on storage.objects;
create policy "deal_documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, false)
  );
drop policy if exists "deal_documents_insert_own" on storage.objects;
create policy "deal_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_paid_plan()
    and char_length(split_part(name, '/', 3)) between 1 and 160
    and public.truecap_storage_metadata_allowed(
      metadata,
      10485760,
      array[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/heic',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv', 'text/plain'
      ]
    )
  );
drop policy if exists "deal_documents_update_own" on storage.objects;
create policy "deal_documents_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_paid_plan()
  )
  with check (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_paid_plan()
    and char_length(split_part(name, '/', 3)) between 1 and 160
    and public.truecap_storage_metadata_allowed(
      metadata,
      10485760,
      array[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/heic',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv', 'text/plain'
      ]
    )
  );
drop policy if exists "deal_documents_delete_own" on storage.objects;
create policy "deal_documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_paid_plan()
  );

-- Branding logos remain public-readable by design, but only an entitled owner
-- may consume storage through direct writes.
drop policy if exists "Users can upload own logo" on storage.objects;
create policy "Users can upload own logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and public.truecap_current_user_has_feature('custom_branding')
    and public.truecap_storage_metadata_allowed(metadata, 1048576, array['image/png', 'image/jpeg'])
  );
drop policy if exists "Users can update own logo" on storage.objects;
create policy "Users can update own logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and public.truecap_current_user_has_feature('custom_branding')
  )
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and public.truecap_current_user_has_feature('custom_branding')
    and public.truecap_storage_metadata_allowed(metadata, 1048576, array['image/png', 'image/jpeg'])
  );
drop policy if exists "Users can delete own logo" on storage.objects;
create policy "Users can delete own logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and public.truecap_current_user_has_feature('custom_branding')
  );
