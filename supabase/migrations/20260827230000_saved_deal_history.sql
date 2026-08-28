-- Append-only, owner-visible Deal Log for saved-deal stage transitions.
--
-- Stage mutation and event creation happen inside one security-definer RPC.
-- Authenticated clients may read their own events, but cannot insert, update,
-- or delete history rows directly. Existing migrations remain untouched.

-- Reuse the composite ownership key introduced by Saved Deal Watch. The
-- if-not-exists form also makes this migration self-contained if that optional
-- data plane was intentionally skipped in a staged environment.
create unique index if not exists saved_analyses_id_user_watch_fk_idx
  on public.saved_analyses (id, user_id);

create table if not exists public.saved_deal_history_events (
  id uuid primary key default gen_random_uuid(),
  saved_analysis_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null default 'stage_changed',
  old_stage text,
  new_stage text not null,
  decision_status text not null,
  reason text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint saved_deal_history_events_owned_deal_fk
    foreign key (saved_analysis_id, user_id)
    references public.saved_analyses(id, user_id)
    on delete cascade,
  constraint saved_deal_history_events_event_type_check
    check (event_type = 'stage_changed'),
  constraint saved_deal_history_events_old_stage_check
    check (
      old_stage is null
      or old_stage in (
        'researching', 'watching', 'screening', 'analyzing', 'verifying',
        'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
        'passed'
      )
    ),
  constraint saved_deal_history_events_new_stage_check
    check (
      new_stage in (
        'researching', 'watching', 'screening', 'analyzing', 'verifying',
        'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
        'passed'
      )
    ),
  constraint saved_deal_history_events_decision_status_check
    check (decision_status in ('undecided', 'pursue', 'negotiate', 'pass')),
  constraint saved_deal_history_events_reason_check
    check (
      reason is null
      or (char_length(reason) between 1 and 500 and reason = btrim(reason))
    ),
  constraint saved_deal_history_events_note_check
    check (
      note is null
      or (char_length(note) between 1 and 2000 and note = btrim(note))
    ),
  constraint saved_deal_history_events_pass_reason_check
    check (new_stage <> 'passed' or reason is not null),
  constraint saved_deal_history_events_actor_is_owner_check
    check (actor_user_id = user_id)
);

comment on table public.saved_deal_history_events is
  'Append-only owner-visible history of saved-deal stage changes and the decision represented by each new stage.';
comment on column public.saved_deal_history_events.reason is
  'User-supplied decision reason. Required whenever a deal moves to Passed.';
comment on column public.saved_deal_history_events.note is
  'Optional transition note, including an explicit explanation for an undo or restore.';

create index if not exists saved_deal_history_events_deal_time_idx
  on public.saved_deal_history_events (saved_analysis_id, occurred_at desc);
create index if not exists saved_deal_history_events_user_time_idx
  on public.saved_deal_history_events (user_id, occurred_at desc);

alter table public.saved_deal_history_events enable row level security;

drop policy if exists saved_deal_history_events_select_own
  on public.saved_deal_history_events;
create policy saved_deal_history_events_select_own
  on public.saved_deal_history_events
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.saved_deal_history_events from public, anon, authenticated;
grant select on table public.saved_deal_history_events to authenticated;

-- `saved_analyses` predates plan-gated pipeline stages and its owner UPDATE
-- policy necessarily permits ordinary underwriting/notes writes. Prevent a
-- JWT client from using that broad policy to mutate lifecycle columns
-- directly. The SECURITY DEFINER transition functions below execute as their
-- database owner and remain the only authenticated lifecycle write path.
create or replace function public.guard_saved_deal_lifecycle_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.pipeline_stage is not null
        or coalesce(new.is_completed, false)
        or coalesce(new.is_archived, false)
      then
        raise exception using
          errcode = '42501',
          message = 'Saved-deal lifecycle must be changed through its authorized transition endpoint.';
      end if;
    elsif new.pipeline_stage is distinct from old.pipeline_stage
      or new.is_completed is distinct from old.is_completed
      or new.is_archived is distinct from old.is_archived
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
  before insert or update of pipeline_stage, is_completed, is_archived
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
set search_path = public, pg_temp
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

  -- The public RPC is callable by authenticated users, so the database must
  -- independently enforce the same catalog feature as the server action.
  -- Ownership alone is not a paid-feature authorization boundary.
  select exists (
    select 1
      from public.subscriptions as subscription
      join public.plans as plan on plan.id = subscription.plan_id
     where subscription.user_id = v_actor_user_id
       and subscription.status in ('active', 'trialing', 'past_due')
       and coalesce(plan.entitlements -> 'features', '[]'::jsonb) ? 'pipeline'
  ) into v_has_pipeline_entitlement;

  if not v_has_pipeline_entitlement then
    raise exception using
      errcode = '42501',
      message = 'Pipeline entitlement required.';
  end if;

  if p_new_stage is null or p_new_stage not in (
    'researching', 'watching', 'screening', 'analyzing', 'verifying',
    'offer_ready', 'negotiating', 'offer', 'under_contract', 'closed',
    'passed'
  ) then
    raise exception using errcode = '22023', message = 'Invalid pipeline stage.';
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

  -- A replay of the exact stage is idempotent and must not manufacture a
  -- history event or require a fresh Pass reason.
  if v_previous_stage = p_new_stage then
    return query
      select p_saved_analysis_id, null::uuid, v_previous_stage, p_new_stage,
        v_decision_status, null::timestamptz;
    return;
  end if;

  if p_new_stage = 'passed' and v_reason is null then
    raise exception using errcode = '22023', message = 'A Pass reason is required.';
  end if;

  update public.saved_analyses
     set pipeline_stage = p_new_stage,
         is_completed = (p_new_stage = 'closed'),
         is_archived = (p_new_stage = 'passed'),
         last_activity_at = v_occurred_at
   where id = p_saved_analysis_id
     and user_id = v_actor_user_id
     and deleted_at is null;

  insert into public.saved_deal_history_events (
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
  )
  returning id into v_event_id;

  return query
    select p_saved_analysis_id, v_event_id, v_previous_stage, p_new_stage,
      v_decision_status, v_occurred_at;
end;
$$;

revoke all on function public.update_saved_deal_stage_with_history(uuid, text, text, text)
  from public, anon;
grant execute on function public.update_saved_deal_stage_with_history(uuid, text, text, text)
  to authenticated;

-- Bulk Archive must preserve the same two invariants as an individual Pass:
-- the lifecycle write and its reasoned Deal Log event commit together, and a
-- deal that became Closed/Passed after the caller's preflight stays untouched.
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
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_has_pipeline_entitlement boolean := false;
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

  select exists (
    select 1
      from public.subscriptions as subscription
      join public.plans as plan on plan.id = subscription.plan_id
     where subscription.user_id = v_actor_user_id
       and subscription.status in ('active', 'trialing', 'past_due')
       and coalesce(plan.entitlements -> 'features', '[]'::jsonb) ? 'pipeline'
  ) into v_has_pipeline_entitlement;

  if not v_has_pipeline_entitlement then
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

    update public.saved_analyses
       set pipeline_stage = 'passed',
           is_completed = false,
           is_archived = true,
           last_activity_at = v_occurred_at
     where id = v_deal.id
       and user_id = v_actor_user_id
       and deleted_at is null;

    insert into public.saved_deal_history_events (
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
