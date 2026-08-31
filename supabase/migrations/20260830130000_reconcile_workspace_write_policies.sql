-- Reconcile the live database's workspace write policies with the shipped
-- product contract.
--
-- Production received the defense-in-depth migration from commit 5330d59
-- even though that commit never merged to main. That migration made saved
-- scenarios, due-diligence mutations, and deal-document writes paid-only.
-- Main intentionally exposes those workflows to every authenticated user
-- with save_deal access (including the no-card evaluation), so the UI could
-- offer a write that the database then rejected as an RLS violation.
--
-- This is a forward-only, idempotent reconciliation. It restores the intended
-- Free basic lifecycle, disables an obsolete auto-archive path that cannot
-- produce reasoned history, makes normalized scenario names unique, and
-- carries the complete retained security subset from the off-main migration
-- so clean-main and production histories converge. Owner matching, saved-deal
-- capacity, active-parent checks, exact Storage paths, filename length,
-- bucket limits/MIME allowlists, and intentionally paid feature gates remain.

-- Fail before changing any catalog object if an older read-then-insert race
-- already produced duplicate live names. Renaming customer scenarios is a
-- product decision, so this migration reports the conflict without guessing;
-- the release preflight verifies production is clean before apply.
do $$
declare
  conflict_groups bigint;
begin
  select count(*)
    into conflict_groups
    from (
      select
        analysis.property_id,
        coalesce(
          nullif(lower(btrim(analysis.scenario_name)), ''),
          'base case'
        ) as normalized_scenario_name
        from public.saved_analyses analysis
       where analysis.property_id is not null
         and analysis.deleted_at is null
       group by
         analysis.property_id,
         coalesce(
           nullif(lower(btrim(analysis.scenario_name)), ''),
           'base case'
         )
      having count(*) > 1
    ) conflicts;

  if conflict_groups > 0 then
    raise exception using
      errcode = '23514',
      message = 'Cannot enforce unique live scenario names.',
      detail = format('%s property/name conflict group(s) require review.', conflict_groups),
      hint = 'Resolve only the reported duplicate scenario names, then rerun this migration.';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- Canonical helpers used by the live saved-analysis trigger. Carrying their
-- definitions here makes the migration safe on a clean database that never
-- received the off-main hardening migration.
-- -------------------------------------------------------------------------

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

  -- Choose the newest live subscription before checking its plan. Filtering
  -- the joined plan first would let an older paid row survive a newer
  -- Free/inactive-plan row during webhook or plan-switch drift.
  select plan.entitlements
    into candidate
    from (
      select subscription.plan_id
        from public.subscriptions subscription
       where subscription.user_id = auth.uid()
         and subscription.status in ('active', 'trialing', 'past_due')
       order by subscription.updated_at desc
       limit 1
    ) newest_subscription
    join public.plans plan on plan.id = newest_subscription.plan_id
   where plan.is_active = true;

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
  -- Inspect the newest live subscription first. An older paid row must not
  -- survive a newer downgrade, Free switch, or inactive-plan mapping.
  select auth.uid() is not null and exists (
    select 1
      from (
        select subscription.plan_id
          from public.subscriptions subscription
         where subscription.user_id = auth.uid()
           and subscription.status in ('active', 'trialing', 'past_due')
         order by subscription.updated_at desc
         limit 1
      ) newest_subscription
      join public.plans plan on plan.id = newest_subscription.plan_id
     where plan.is_active = true
       and plan.slug <> 'free'
  );
$$;

revoke all on function public.truecap_current_user_has_paid_plan() from public;
revoke all on function public.truecap_current_user_has_paid_plan() from anon;
grant execute on function public.truecap_current_user_has_paid_plan() to authenticated;
grant execute on function public.truecap_current_user_has_paid_plan() to service_role;

create or replace function public.truecap_current_user_has_active_evaluation()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.product_evaluations evaluation
     where evaluation.user_id = auth.uid()
       and evaluation.expires_at > now()
  );
$$;

revoke all on function public.truecap_current_user_has_active_evaluation() from public;
revoke all on function public.truecap_current_user_has_active_evaluation() from anon;
grant execute on function public.truecap_current_user_has_active_evaluation() to authenticated;
grant execute on function public.truecap_current_user_has_active_evaluation() to service_role;

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

-- Carry forward the live guard with the two scenario-specific paid checks
-- removed and lifecycle-stage authorization delegated to the transactional
-- history RPC below. The generic paid gate for a full underwriting edit is
-- deliberately retained.
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
    if property_id_text is not null and not exists (
      select 1 from public.properties property
       where property.id::text = property_id_text
         and property.user_id = new.user_id
    ) then
      raise exception using errcode = '23514', message = 'property_id must reference an owned property';
    end if;
  end if;

  -- Lifecycle stages are authorized by update_saved_deal_stage_with_history(),
  -- which is the only authenticated path through the lifecycle-column guard.
  -- Tags remain a direct pipeline-only workspace mutation.
  if new_row -> 'tags' is distinct from old_row -> 'tags' then
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

  old_core := old_row - array[
    'updated_at', 'last_activity_at',
    'notes', 'nickname', 'market', 'neighborhood',
    'is_completed', 'is_archived', 'deleted_at', 'close_date',
    'pipeline_stage', 'current_stage_history_event_id', 'tags', 'client_id',
    'pdf_url', 'pdf_generated_at', 'pdf_snapshot_version',
    'property_id', 'scenario_name', 'strategy_kind', 'template_id'
  ];
  new_core := new_row - array[
    'updated_at', 'last_activity_at',
    'notes', 'nickname', 'market', 'neighborhood',
    'is_completed', 'is_archived', 'deleted_at', 'close_date',
    'pipeline_stage', 'current_stage_history_event_id', 'tags', 'client_id',
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

-- Basic lifecycle status is part of the Free saved-deal workspace. Preserve
-- the single transactional RPC and its append-only history, while requiring
-- the pipeline entitlement for every finer-grained acquisition stage.
alter table public.saved_analyses
  add column if not exists current_stage_history_event_id uuid;

-- Treat the current-history pointer as part of the lifecycle state. Browser
-- callers cannot forge it; only the SECURITY DEFINER transition RPC below can
-- advance stage, mirrors, and pointer together.
create or replace function public.guard_saved_deal_lifecycle_columns()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.pipeline_stage is not null
        or coalesce(new.is_completed, false)
        or coalesce(new.is_archived, false)
        or new.current_stage_history_event_id is not null
      then
        raise exception using
          errcode = '42501',
          message = 'Saved-deal lifecycle must be changed through its authorized transition endpoint.';
      end if;
    elsif new.pipeline_stage is distinct from old.pipeline_stage
      or new.is_completed is distinct from old.is_completed
      or new.is_archived is distinct from old.is_archived
      or new.current_stage_history_event_id is distinct from old.current_stage_history_event_id
    then
      raise exception using
        errcode = '42501',
        message = 'Saved-deal lifecycle must be changed through its authorized transition endpoint.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_saved_deal_lifecycle_columns()
  from public, anon, authenticated;

drop trigger if exists saved_analyses_guard_lifecycle_columns
  on public.saved_analyses;
create trigger saved_analyses_guard_lifecycle_columns
  before insert or update of pipeline_stage, is_completed, is_archived,
    current_stage_history_event_id
  on public.saved_analyses
  for each row execute function public.guard_saved_deal_lifecycle_columns();

create or replace function public.update_saved_deal_stage_with_history(
  p_saved_analysis_id uuid,
  p_new_stage text,
  p_reason text default null,
  p_note text default null
)
returns table (
  saved_analysis_id uuid,
  history_event_id uuid,
  previous_stage text,
  current_stage text,
  current_decision_status text,
  transition_occurred_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_previous_stage text;
  v_reason text := nullif(
    btrim(regexp_replace(coalesce(p_reason, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );
  v_note text := nullif(
    btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );
  v_decision_status text;
  v_event_id uuid;
  v_occurred_at timestamptz := now();
  v_has_pipeline_entitlement boolean := false;
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  -- Keep the same newest-live-plan precedence as the rest of the product.
  -- Looking across every live subscription would let a stale older plan keep
  -- granting fine stages after a plan switch removed `pipeline`.
  v_has_pipeline_entitlement :=
    public.truecap_current_user_has_feature('pipeline');

  if p_new_stage is null or p_new_stage not in (
    'researching', 'watching', 'screening', 'analyzing', 'verifying',
    'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
    'passed'
  ) then
    raise exception using errcode = '22023', message = 'Invalid pipeline stage.';
  end if;

  if not v_has_pipeline_entitlement
     and p_new_stage not in ('analyzing', 'closed', 'passed') then
    raise exception using
      errcode = '42501',
      message = 'Pipeline entitlement required.';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'Decision reason is too long.';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception using errcode = '22023', message = 'Transition note is too long.';
  end if;

  select case
      when deal.is_completed then 'closed'
      when deal.is_archived then 'passed'
      when deal.pipeline_stage in (
        'researching', 'watching', 'screening', 'analyzing', 'verifying',
        'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
        'passed'
      ) then deal.pipeline_stage
      else 'analyzing'
    end
    into v_previous_stage
    from public.saved_analyses as deal
   where deal.id = p_saved_analysis_id
     and deal.user_id = v_actor_user_id
     and deal.deleted_at is null
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Saved deal not found.';
  end if;

  v_decision_status := case
    when p_new_stage = 'passed' then 'pass'
    when p_new_stage = 'negotiating' then 'negotiate'
    when p_new_stage in ('offer', 'under_contract', 'closed') then 'pursue'
    else 'undecided'
  end;

  -- Replaying the exact stage is idempotent and does not manufacture history
  -- or require another Pass reason.
  if v_previous_stage = p_new_stage then
    return query
      select p_saved_analysis_id, null::uuid, v_previous_stage, p_new_stage,
        v_decision_status, null::timestamptz;
    return;
  end if;

  if p_new_stage = 'passed' and v_reason is null then
    raise exception using errcode = '22023', message = 'A Pass reason is required.';
  end if;

  v_event_id := gen_random_uuid();

  update public.saved_analyses
     set pipeline_stage = p_new_stage,
         is_completed = (p_new_stage = 'closed'),
         is_archived = (p_new_stage = 'passed'),
         current_stage_history_event_id = v_event_id,
         last_activity_at = v_occurred_at
   where id = p_saved_analysis_id
     and user_id = v_actor_user_id
     and deleted_at is null;

  insert into public.saved_deal_history_events (
    id,
    saved_analysis_id,
    user_id,
    actor_user_id,
    old_stage,
    new_stage,
    decision_status,
    reason,
    note,
    occurred_at,
    created_at
  ) values (
    v_event_id,
    p_saved_analysis_id,
    v_actor_user_id,
    v_actor_user_id,
    v_previous_stage,
    p_new_stage,
    v_decision_status,
    v_reason,
    v_note,
    v_occurred_at,
    v_occurred_at
  );

  return query
    select p_saved_analysis_id, v_event_id, v_previous_stage, p_new_stage,
      v_decision_status, v_occurred_at;
end;
$$;

revoke all on function public.update_saved_deal_stage_with_history(uuid, text, text, text)
  from public, anon;
grant execute on function public.update_saved_deal_stage_with_history(uuid, text, text, text)
  to authenticated;

-- A toast can outlive the Passed state that created it. Keep ordinary stage
-- transitions backward-compatible, but make that old Undo a separate atomic
-- compare-and-set: it may restore the captured stage only while the locked
-- current row still points at the exact Passed history event that created the
-- Undo. The event identity closes the Passed(A) -> other -> Passed(B) ABA
-- race. The canonical transition RPC remains the sole writer and therefore
-- retains its entitlement, reason, mirror, and history semantics.
drop function if exists public.undo_passed_saved_deal_stage_with_history(
  uuid, text, text, text
);

create or replace function public.undo_passed_saved_deal_stage_with_history(
  p_saved_analysis_id uuid,
  p_restore_stage text,
  p_expected_pass_history_event_id uuid,
  p_reason text default null,
  p_note text default null
)
returns table (
  saved_analysis_id uuid,
  history_event_id uuid,
  previous_stage text,
  current_stage text,
  current_decision_status text,
  transition_occurred_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_current_stage text;
  v_current_stage_history_event_id uuid;
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_restore_stage is null
     or p_restore_stage = 'passed'
     or p_expected_pass_history_event_id is null then
    raise exception using errcode = '22023', message = 'Invalid Passed Undo target.';
  end if;

  select case
      when deal.is_completed then 'closed'
      when deal.is_archived then 'passed'
      when deal.pipeline_stage in (
        'researching', 'watching', 'screening', 'analyzing', 'verifying',
        'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
        'passed'
      ) then deal.pipeline_stage
      else 'analyzing'
    end,
    deal.current_stage_history_event_id
    into v_current_stage, v_current_stage_history_event_id
    from public.saved_analyses as deal
   where deal.id = p_saved_analysis_id
     and deal.user_id = v_actor_user_id
     and deal.deleted_at is null
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Saved deal not found.';
  end if;

  if v_current_stage <> 'passed'
     or v_current_stage_history_event_id is distinct from p_expected_pass_history_event_id
     or not exists (
       select 1
         from public.saved_deal_history_events event
        where event.id = p_expected_pass_history_event_id
          and event.saved_analysis_id = p_saved_analysis_id
          and event.user_id = v_actor_user_id
          and event.new_stage = 'passed'
          and event.old_stage = p_restore_stage
     ) then
    raise exception using
      errcode = '40001',
      message = 'Passed Undo is stale because the saved deal stage changed.';
  end if;

  return query
    select *
      from public.update_saved_deal_stage_with_history(
        p_saved_analysis_id,
        p_restore_stage,
        p_reason,
        p_note
      );
end;
$$;

revoke all on function public.undo_passed_saved_deal_stage_with_history(uuid, text, uuid, text, text)
  from public, anon;
grant execute on function public.undo_passed_saved_deal_stage_with_history(uuid, text, uuid, text, text)
  to authenticated;

-- Bulk Passed transitions share the exact same entitlement precedence and
-- stage/history pointer invariant as single-row transitions. Assign every row
-- its event UUID before the write so the row and append-only event cannot
-- diverge, including when a later exact-event Undo is evaluated.
create or replace function public.bulk_archive_saved_deals_with_history(
  p_saved_analysis_ids uuid[],
  p_reason text,
  p_note text default null
)
returns table (
  affected_count integer,
  skipped_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_reason text := nullif(
    btrim(regexp_replace(coalesce(p_reason, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );
  v_note text := nullif(
    btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );
  v_requested_count integer := 0;
  v_affected_count integer := 0;
  v_event_id uuid;
  v_occurred_at timestamptz := now();
  v_deal record;
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_saved_analysis_ids is null
     or cardinality(p_saved_analysis_ids) < 1
     or cardinality(p_saved_analysis_ids) > 100 then
    raise exception using errcode = '22023', message = 'Select between 1 and 100 deals.';
  end if;

  select count(distinct requested.id)::integer
    into v_requested_count
    from unnest(p_saved_analysis_ids) as requested(id)
   where requested.id is not null;

  if v_requested_count < 1 then
    raise exception using errcode = '22023', message = 'Select at least one deal.';
  end if;
  if v_reason is null then
    raise exception using errcode = '22023', message = 'A Pass reason is required.';
  end if;
  if char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'Decision reason is too long.';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception using errcode = '22023', message = 'Transition note is too long.';
  end if;

  if not public.truecap_current_user_has_feature('pipeline') then
    raise exception using
      errcode = '42501',
      message = 'Pipeline entitlement required.';
  end if;

  -- Lock every owner-visible candidate before evaluating its effective stage.
  -- Rows not owned by the caller, deleted rows, and rows that became terminal
  -- are counted as skipped without revealing which condition excluded them.
  for v_deal in
    select
      deal.id,
      deal.is_completed,
      deal.is_archived,
      case
        when deal.is_completed then 'closed'
        when deal.is_archived then 'passed'
        when deal.pipeline_stage in (
          'researching', 'watching', 'screening', 'analyzing', 'verifying',
          'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
          'passed'
        ) then deal.pipeline_stage
        else 'analyzing'
      end as previous_stage
    from public.saved_analyses as deal
    where deal.user_id = v_actor_user_id
      and deal.deleted_at is null
      and deal.id = any(p_saved_analysis_ids)
    order by deal.id
    for update of deal
  loop
    if v_deal.is_completed
       or v_deal.is_archived
       or v_deal.previous_stage in ('closed', 'passed') then
      continue;
    end if;

    v_event_id := gen_random_uuid();

    update public.saved_analyses
       set pipeline_stage = 'passed',
           is_completed = false,
           is_archived = true,
           current_stage_history_event_id = v_event_id,
           last_activity_at = v_occurred_at
     where id = v_deal.id
       and user_id = v_actor_user_id
       and deleted_at is null;

    insert into public.saved_deal_history_events (
      id,
      saved_analysis_id,
      user_id,
      actor_user_id,
      old_stage,
      new_stage,
      decision_status,
      reason,
      note,
      occurred_at,
      created_at
    ) values (
      v_event_id,
      v_deal.id,
      v_actor_user_id,
      v_actor_user_id,
      v_deal.previous_stage,
      'passed',
      'pass',
      v_reason,
      v_note,
      v_occurred_at,
      v_occurred_at
    );

    v_affected_count := v_affected_count + 1;
  end loop;

  return query
    select v_affected_count, v_requested_count - v_affected_count;
end;
$$;

revoke all on function public.bulk_archive_saved_deals_with_history(uuid[], text, text)
  from public, anon;
grant execute on function public.bulk_archive_saved_deals_with_history(uuid[], text, text)
  to authenticated;

-- Automatic stale archiving cannot supply the user-authored reason/history
-- required by the current lifecycle contract. Remove the legacy job if it is
-- present; deliberately do not schedule a replacement.
do $do$
declare
  stale_archive_job_id bigint;
begin
  if exists (
    select 1
      from pg_catalog.pg_extension
     where extname = 'pg_cron'
  ) and pg_catalog.to_regclass('cron.job') is not null then
    for stale_archive_job_id in
      select jobid
        from cron.job
       where jobname = 'archive-stale-saved-analyses-daily'
    loop
      perform cron.unschedule(stale_archive_job_id);
    end loop;
  end if;
end;
$do$;

-- Retain the historic RPC signature for operational compatibility, but make
-- it a service-only no-op so a forgotten caller cannot bypass reasoned,
-- append-only lifecycle history.
create or replace function public.archive_stale_saved_analyses()
returns integer
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select 0;
$$;

revoke all on function public.archive_stale_saved_analyses() from public;
revoke all on function public.archive_stale_saved_analyses() from anon;
revoke all on function public.archive_stale_saved_analyses() from authenticated;
grant execute on function public.archive_stale_saved_analyses() to service_role;

comment on function public.archive_stale_saved_analyses() is
  'Deprecated service-only no-op. Automatic stale archiving is unscheduled because Passed transitions require a user reason and append-only history.';

-- -------------------------------------------------------------------------
-- Scenarios: properties are owned workspace groupings. A scenario row still
-- spends saved-deal capacity through the trigger above.
-- -------------------------------------------------------------------------

create unique index if not exists saved_analyses_active_property_scenario_name_uidx
  on public.saved_analyses (
    property_id,
    coalesce(nullif(lower(btrim(scenario_name)), ''), 'base case')
  )
  where property_id is not null
    and deleted_at is null;

alter table public.properties enable row level security;

drop policy if exists "properties_select_own" on public.properties;
create policy "properties_select_own" on public.properties
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "properties_insert_own" on public.properties;
create policy "properties_insert_own" on public.properties
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "properties_update_own" on public.properties;
create policy "properties_update_own" on public.properties
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "properties_delete_own" on public.properties;
create policy "properties_delete_own" on public.properties
  for delete to authenticated using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Retained child-row hardening: a duplicated user_id never substitutes for
-- proof that the parent resource belongs to the same caller.
-- -------------------------------------------------------------------------

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

alter table public.analysis_tax_strategy_snapshots enable row level security;

drop policy if exists "analysis_tax_strategy_snapshots_select_own" on public.analysis_tax_strategy_snapshots;
create policy "analysis_tax_strategy_snapshots_select_own" on public.analysis_tax_strategy_snapshots
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );

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

alter table public.analysis_exit_scenario_snapshots enable row level security;

drop policy if exists "analysis_exit_scenario_snapshots_select_own" on public.analysis_exit_scenario_snapshots;
create policy "analysis_exit_scenario_snapshots_select_own" on public.analysis_exit_scenario_snapshots
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );

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

-- Immutable comment appends use a browser-generated request key. If the
-- INSERT commits but its response is lost, retrying the same draft resolves
-- to the original row instead of creating a duplicate dated entry. NULL keeps
-- historical rows and rolling-deploy callers backward-compatible.
alter table public.deal_comments
  add column if not exists client_request_id uuid;

create unique index if not exists deal_comments_user_client_request_uidx
  on public.deal_comments (user_id, client_request_id);

alter table public.deal_comments enable row level security;

-- The action now deliberately uses the authenticated session so the active
-- parent predicate is evaluated atomically with INSERT/DELETE. Supabase's
-- historic default table grants are broad and can differ between lineages;
-- converge them to the immutable comment contract explicitly.
revoke all on table public.deal_comments from public, anon, authenticated, service_role;
grant select, insert, delete on table public.deal_comments to authenticated;
grant all on table public.deal_comments to service_role;

drop policy if exists "deal_comments_select_own" on public.deal_comments;
create policy "deal_comments_select_own" on public.deal_comments
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );

drop policy if exists "deal_comments_insert_own" on public.deal_comments;
create policy "deal_comments_insert_own" on public.deal_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  );

drop policy if exists "deal_comments_delete_own" on public.deal_comments;
create policy "deal_comments_delete_own" on public.deal_comments
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  );

-- Provider comp rows remain browser-readable by their owner, but every write
-- stays behind the ownership-checking service-role action and composite FK.
alter table public.deal_comps enable row level security;
alter table public.deal_comps force row level security;

drop policy if exists "deal_comps_select_own" on public.deal_comps;
create policy "deal_comps_select_own" on public.deal_comps
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );

drop policy if exists "deal_comps_insert_own" on public.deal_comps;
drop policy if exists "deal_comps_update_own" on public.deal_comps;
drop policy if exists "deal_comps_delete_own" on public.deal_comps;

revoke all on table public.deal_comps from public, anon, authenticated, service_role;
grant select on table public.deal_comps to authenticated;
grant select, insert, update on table public.deal_comps to service_role;

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

alter table public.analysis_template_versions enable row level security;

drop policy if exists "analysis_template_versions_select_own" on public.analysis_template_versions;
create policy "analysis_template_versions_select_own" on public.analysis_template_versions
  for select to authenticated
  using (
    auth.uid() = created_by
    and exists (
      select 1
        from public.analysis_templates template
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
      select 1
        from public.analysis_templates template
       where template.id = template_id
         and template.user_id = auth.uid()
         and template.is_system = false
    )
  );

-- -------------------------------------------------------------------------
-- Due diligence: Free/evaluation/paid users may mutate an active owned deal;
-- retained rows remain readable after archive/delete.
-- -------------------------------------------------------------------------

comment on table public.deal_due_diligence is
  'Per-saved-deal due-diligence checklist. Free per-deal annotation; owner and active-parent write guards are enforced by RLS.';

alter table public.deal_due_diligence enable row level security;

drop policy if exists "deal_due_diligence_select_own" on public.deal_due_diligence;
create policy "deal_due_diligence_select_own" on public.deal_due_diligence
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, false)
  );

drop policy if exists "deal_due_diligence_insert_own" on public.deal_due_diligence;
create policy "deal_due_diligence_insert_own" on public.deal_due_diligence
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  );

drop policy if exists "deal_due_diligence_update_own" on public.deal_due_diligence;
create policy "deal_due_diligence_update_own" on public.deal_due_diligence
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  );

drop policy if exists "deal_due_diligence_delete_own" on public.deal_due_diligence;
create policy "deal_due_diligence_delete_own" on public.deal_due_diligence
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(analysis_id, true)
  );

-- -------------------------------------------------------------------------
-- Buy Boxes: the application grants this feature for the full active 21-day
-- evaluation. Preserve the ordinary plan feature gate and add only that exact
-- evaluation state; expired evaluations still fail closed.
-- -------------------------------------------------------------------------

alter table public.user_buy_box enable row level security;

drop policy if exists "user_buy_box_select_own" on public.user_buy_box;
create policy "user_buy_box_select_own" on public.user_buy_box
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_buy_box_insert_own" on public.user_buy_box;
create policy "user_buy_box_insert_own" on public.user_buy_box
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

drop policy if exists "user_buy_box_update_own" on public.user_buy_box;
create policy "user_buy_box_update_own" on public.user_buy_box
  for update to authenticated
  using (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  )
  with check (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

drop policy if exists "user_buy_box_delete_own" on public.user_buy_box;
create policy "user_buy_box_delete_own" on public.user_buy_box
  for delete to authenticated
  using (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

alter table public.user_buy_boxes enable row level security;

drop policy if exists "user_buy_boxes_select_own" on public.user_buy_boxes;
create policy "user_buy_boxes_select_own" on public.user_buy_boxes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_buy_boxes_insert_own" on public.user_buy_boxes;
create policy "user_buy_boxes_insert_own" on public.user_buy_boxes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

drop policy if exists "user_buy_boxes_update_own" on public.user_buy_boxes;
create policy "user_buy_boxes_update_own" on public.user_buy_boxes
  for update to authenticated
  using (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  )
  with check (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

drop policy if exists "user_buy_boxes_delete_own" on public.user_buy_boxes;
create policy "user_buy_boxes_delete_own" on public.user_buy_boxes
  for delete to authenticated
  using (
    auth.uid() = user_id
    and (
      public.truecap_current_user_has_feature('buy_box')
      or public.truecap_current_user_has_active_evaluation()
    )
  );

-- Client-scoped Buy Boxes remain an Agent Pro capability even though an
-- evaluation may use an ordinary, unscoped Buy Box.
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
  with check (
    auth.uid() = user_id
    and public.truecap_current_user_has_feature('custom_branding')
  );

drop policy if exists "Users can update own branding" on public.branding;
create policy "Users can update own branding" on public.branding
  for update to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_current_user_has_feature('custom_branding')
  )
  with check (
    auth.uid() = user_id
    and public.truecap_current_user_has_feature('custom_branding')
  );

drop policy if exists "Users can delete own branding" on public.branding;
create policy "Users can delete own branding" on public.branding
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_current_user_has_feature('custom_branding')
  );

-- Saved Deal Watch is still a dormant paid capability. Enabling requires a
-- live paid entitlement and active owned deal, but consent can always move in
-- the safer direction after downgrade: disable/delete an opt-in or turn off a
-- notification channel. A downgrade can never trap an owner in retained
-- consent, and it can never be used to add new notification consent.
alter table public.saved_deal_watch_subscriptions enable row level security;

drop policy if exists "saved_deal_watch_subscriptions_select_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_select_own" on public.saved_deal_watch_subscriptions
  for select to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(saved_analysis_id, false)
  );

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
    and public.truecap_owns_saved_analysis(saved_analysis_id, false)
  )
  with check (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(saved_analysis_id, false)
    and (
      enabled = false
      or (
        public.truecap_current_user_has_paid_plan()
        and public.truecap_current_user_has_feature('save_deal')
        and public.truecap_owns_saved_analysis(saved_analysis_id, true)
      )
    )
  );

drop policy if exists "saved_deal_watch_subscriptions_delete_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_delete_own" on public.saved_deal_watch_subscriptions
  for delete to authenticated
  using (
    auth.uid() = user_id
    and public.truecap_owns_saved_analysis(saved_analysis_id, false)
  );

create or replace function public.truecap_enforce_watch_preference_entitlement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if public.truecap_is_trusted_service_context()
     or public.truecap_current_user_has_paid_plan() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.in_app_notifications_enabled or new.email_notifications_enabled then
      raise exception using
        errcode = '42501',
        message = 'a paid plan is required to enable Saved Deal Watch notifications';
    end if;
  elsif (new.in_app_notifications_enabled and not old.in_app_notifications_enabled)
     or (new.email_notifications_enabled and not old.email_notifications_enabled) then
    raise exception using
      errcode = '42501',
      message = 'a paid plan is required to enable Saved Deal Watch notifications';
  end if;

  return new;
end;
$$;

revoke all on function public.truecap_enforce_watch_preference_entitlement() from public;
revoke all on function public.truecap_enforce_watch_preference_entitlement() from anon;
revoke all on function public.truecap_enforce_watch_preference_entitlement() from authenticated;

drop trigger if exists saved_deal_watch_preferences_00_entitlement_guard
  on public.saved_deal_watch_preferences;
create trigger saved_deal_watch_preferences_00_entitlement_guard
  before insert or update of in_app_notifications_enabled, email_notifications_enabled
  on public.saved_deal_watch_preferences
  for each row execute function public.truecap_enforce_watch_preference_entitlement();

alter table public.saved_deal_watch_preferences enable row level security;

drop policy if exists "saved_deal_watch_preferences_select_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_select_own" on public.saved_deal_watch_preferences
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "saved_deal_watch_preferences_insert_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_insert_own" on public.saved_deal_watch_preferences
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "saved_deal_watch_preferences_update_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_update_own" on public.saved_deal_watch_preferences
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_deal_watch_preferences_delete_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_delete_own" on public.saved_deal_watch_preferences
  for delete to authenticated using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Storage convergence: exact owner/deal paths, intended bucket visibility,
-- browser-visible API limits, and a NULL-tolerant insert metadata gate.
-- -------------------------------------------------------------------------

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
  -- Supabase Storage may create the objects row before metadata is populated.
  -- Bucket-level limits below remain authoritative during that insert state.
  if p_metadata is null then
    return true;
  end if;
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
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Analysis PDF cache: private retained owner reads, exact active-deal paths,
-- and the intentionally paid pdf_export feature for every browser write.
-- Exact-resource evaluation exports stay server-authorized; this broad
-- Storage policy must not turn them into a general pdf_export grant.
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
    and split_part(name, '/', 3)
      ~ '^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$'
    and public.truecap_storage_metadata_allowed(
      metadata,
      10485760,
      array['application/pdf']
    )
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
    and split_part(name, '/', 3)
      ~ '^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$'
    and public.truecap_storage_metadata_allowed(
      metadata,
      10485760,
      array['application/pdf']
    )
  );

drop policy if exists "analysis_pdfs_delete_own" on storage.objects;
create policy "analysis_pdfs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
  );

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
  )
  with check (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
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
  );

-- Brand logos intentionally remain public objects for share pages/PDFs, but
-- direct writes are exact owner paths and retain the custom_branding gate.
-- Replacing every legacy policy avoids permissive-policy OR leakage on a
-- clean-main replay as well as on production's off-main history.
drop policy if exists "Anyone can read branding logos" on storage.objects;
create policy "Anyone can read branding logos" on storage.objects
  for select to public
  using (bucket_id = 'branding-logos');

drop policy if exists "Users can upload own logo" on storage.objects;
create policy "Users can upload own logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
    and public.truecap_storage_metadata_allowed(
      metadata,
      1048576,
      array['image/png', 'image/jpeg']
    )
  );

drop policy if exists "Users can update own logo" on storage.objects;
create policy "Users can update own logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
  )
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
    and public.truecap_storage_metadata_allowed(
      metadata,
      1048576,
      array['image/png', 'image/jpeg']
    )
  );

drop policy if exists "Users can delete own logo" on storage.objects;
create policy "Users can delete own logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
  );

-- Guard the repair itself: scenario-specific paid denial must be gone while
-- the independent paid gate for full underwriting edits remains.
do $$
declare
  guard_definition text;
begin
  select pg_get_functiondef('public.truecap_enforce_saved_analysis_write()'::regprocedure)
    into guard_definition;
  if position('a paid plan is required for saved scenarios' in guard_definition) > 0 then
    raise exception 'scenario paid gate still present after workspace reconciliation';
  end if;
  if position('a paid plan is required to update saved analysis underwriting' in guard_definition) = 0 then
    raise exception 'saved-analysis underwriting paid gate was not preserved';
  end if;
end;
$$;
