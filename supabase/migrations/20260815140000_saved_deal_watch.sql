-- ============================================================
-- Saved Deal Watch persistence and consent foundation
--
-- SURFACED FOR REVIEW — do not auto-apply from application code.
-- Safe/additive and idempotent when re-run over the same schema.
--
-- This migration deliberately creates NO scheduler, provider adapter, email
-- sender, or delivery trigger. Every outbox row starts in `held`; an
-- authorized provider and separately reviewed worker are required before any
-- automatic check or notification can occur.
-- ============================================================

-- Composite ownership keys let every child foreign key prove both identity
-- and tenant ownership at the database boundary. The analysis id is already a
-- primary key; this additive unique index supplies the exact composite key a
-- foreign key requires.
create unique index if not exists saved_analyses_id_user_watch_fk_idx
  on public.saved_analyses (id, user_id);

-- ---------------------------------------------------------------------------
-- 1) Per-deal opt-in and provider-neutral listing identity
-- ---------------------------------------------------------------------------

create table if not exists public.saved_deal_watch_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_analysis_id uuid not null,
  enabled boolean not null default false,

  -- Populated only by a future authorized-provider connection flow. The
  -- current UI intentionally writes none of these fields.
  provider_id text,
  provider_listing_id text,
  listing_url text,

  -- Provider-neutral evaluator policy. The full form snapshot remains in
  -- saved_analyses and must not be copied into this JSON object.
  policy jsonb not null default '{}'::jsonb,
  enabled_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_deal_watch_subscriptions_owned_deal_fk
    foreign key (saved_analysis_id, user_id)
    references public.saved_analyses(id, user_id)
    on delete cascade,
  constraint saved_deal_watch_subscriptions_saved_analysis_unique
    unique (saved_analysis_id),
  constraint saved_deal_watch_subscriptions_id_user_unique
    unique (id, user_id),
  constraint saved_deal_watch_subscriptions_provider_id_check
    check (provider_id is null or char_length(provider_id) between 1 and 100),
  constraint saved_deal_watch_subscriptions_provider_listing_id_check
    check (
      provider_listing_id is null
      or (provider_id is not null and char_length(provider_listing_id) between 1 and 300)
    ),
  constraint saved_deal_watch_subscriptions_listing_url_check
    check (listing_url is null or char_length(listing_url) between 1 and 2048),
  constraint saved_deal_watch_subscriptions_policy_check
    check (
      jsonb_typeof(policy) = 'object'
      and octet_length(policy::text) <= 32768
    )
);

comment on table public.saved_deal_watch_subscriptions is
  'Explicit owner opt-in for a saved deal. enabled=true records intent only; it does not prove that an external provider, scheduler, or notification worker is active.';
comment on column public.saved_deal_watch_subscriptions.listing_url is
  'User/provider-supplied canonical URL for an authorized integration. Never a grant to scrape the destination.';
comment on column public.saved_deal_watch_subscriptions.policy is
  'Small provider-neutral threshold policy only. Full underwriting inputs remain in saved_analyses.form_snapshot.';

create index if not exists saved_deal_watch_subscriptions_user_enabled_idx
  on public.saved_deal_watch_subscriptions (user_id, enabled, updated_at desc);

-- Authenticated callers may opt in/out, but provider identity and evaluator
-- policy are service-owned integration state. Preserve immutable ownership
-- keys and service fields even if a caller bypasses the Server Action and
-- writes through the public Supabase API directly.
create or replace function public.lock_saved_deal_watch_service_fields_for_users()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.provider_id := null;
      new.provider_listing_id := null;
      new.listing_url := null;
      new.policy := '{}'::jsonb;
      new.enabled_at := null;
      new.disabled_at := null;
      new.created_at := now();
      new.updated_at := now();
    else
      new.id := old.id;
      new.user_id := old.user_id;
      new.saved_analysis_id := old.saved_analysis_id;
      new.provider_id := old.provider_id;
      new.provider_listing_id := old.provider_listing_id;
      new.listing_url := old.listing_url;
      new.policy := old.policy;
      new.enabled_at := old.enabled_at;
      new.disabled_at := old.disabled_at;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_saved_deal_watch_service_fields_for_users() from public;

drop trigger if exists saved_deal_watch_subscriptions_05_lock_service_fields
  on public.saved_deal_watch_subscriptions;
create trigger saved_deal_watch_subscriptions_05_lock_service_fields
  before insert or update on public.saved_deal_watch_subscriptions
  for each row execute function public.lock_saved_deal_watch_service_fields_for_users();

create or replace function public.set_saved_deal_watch_subscription_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.enabled and (tg_op = 'INSERT' or old.enabled is distinct from true) then
    new.enabled_at := now();
    new.disabled_at := null;
  elsif not new.enabled and (tg_op = 'INSERT' or old.enabled is distinct from false) then
    new.disabled_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.set_saved_deal_watch_subscription_state() from public;

drop trigger if exists saved_deal_watch_subscriptions_10_state
  on public.saved_deal_watch_subscriptions;
create trigger saved_deal_watch_subscriptions_10_state
  before insert or update of enabled on public.saved_deal_watch_subscriptions
  for each row execute function public.set_saved_deal_watch_subscription_state();

drop trigger if exists saved_deal_watch_subscriptions_90_updated_at
  on public.saved_deal_watch_subscriptions;
create trigger saved_deal_watch_subscriptions_90_updated_at
  before update on public.saved_deal_watch_subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Separate Saved Deal Watch notification consent
-- ---------------------------------------------------------------------------

create table if not exists public.saved_deal_watch_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_notifications_enabled boolean not null default false,
  email_notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.saved_deal_watch_preferences is
  'Explicit consent for Saved Deal Watch notifications only. It is intentionally separate from marketing, rate-alert, rent-alert, and weekly-summary preferences.';
comment on column public.saved_deal_watch_preferences.email_notifications_enabled is
  'Consent preference for future Saved Deal Watch service emails. No delivery path is created by this migration.';

drop trigger if exists saved_deal_watch_preferences_90_updated_at
  on public.saved_deal_watch_preferences;
create trigger saved_deal_watch_preferences_90_updated_at
  before update on public.saved_deal_watch_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Small decision checkpoint and provider cursor/watermark state
-- ---------------------------------------------------------------------------

create table if not exists public.saved_deal_watch_checkpoints (
  watch_id uuid primary key,
  user_id uuid not null,
  evaluator_version text not null,
  observed_at timestamptz not null,
  source_id text,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_deal_watch_checkpoints_owned_watch_fk
    foreign key (watch_id, user_id)
    references public.saved_deal_watch_subscriptions(id, user_id)
    on delete cascade,
  constraint saved_deal_watch_checkpoints_version_check
    check (char_length(evaluator_version) between 1 and 40),
  constraint saved_deal_watch_checkpoints_source_check
    check (source_id is null or char_length(source_id) between 1 and 160),
  constraint saved_deal_watch_checkpoints_state_check
    check (
      jsonb_typeof(state) = 'object'
      and octet_length(state::text) <= 65536
    )
);

comment on table public.saved_deal_watch_checkpoints is
  'Latest compact SavedDealWatchCheckpoint per watch. It excludes the full form snapshot and advances only through the service-role persistence function.';

create index if not exists saved_deal_watch_checkpoints_user_observed_idx
  on public.saved_deal_watch_checkpoints (user_id, observed_at desc);

drop trigger if exists saved_deal_watch_checkpoints_90_updated_at
  on public.saved_deal_watch_checkpoints;
create trigger saved_deal_watch_checkpoints_90_updated_at
  before update on public.saved_deal_watch_checkpoints
  for each row execute function public.set_updated_at();

create table if not exists public.saved_deal_watch_provider_state (
  watch_id uuid primary key,
  user_id uuid not null,
  provider_id text not null,
  provider_cursor text,
  changed_since timestamptz,
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  consecutive_failures integer not null default 0,
  last_error_code text,
  updated_at timestamptz not null default now(),

  constraint saved_deal_watch_provider_state_owned_watch_fk
    foreign key (watch_id, user_id)
    references public.saved_deal_watch_subscriptions(id, user_id)
    on delete cascade,
  constraint saved_deal_watch_provider_state_provider_check
    check (char_length(provider_id) between 1 and 100),
  constraint saved_deal_watch_provider_state_cursor_check
    check (provider_cursor is null or char_length(provider_cursor) <= 10000),
  constraint saved_deal_watch_provider_state_failure_check
    check (consecutive_failures between 0 and 1000000),
  constraint saved_deal_watch_provider_state_error_check
    check (last_error_code is null or char_length(last_error_code) <= 160),
  constraint saved_deal_watch_provider_state_time_check
    check (
      last_succeeded_at is null
      or last_attempted_at is null
      or last_succeeded_at <= last_attempted_at
    )
);

comment on table public.saved_deal_watch_provider_state is
  'Opaque per-watch provider cursor, watermark, and retry state. It is tenant-keyed but service-role-only because provider cursors may be operationally sensitive.';

drop trigger if exists saved_deal_watch_provider_state_90_updated_at
  on public.saved_deal_watch_provider_state;
create trigger saved_deal_watch_provider_state_90_updated_at
  before update on public.saved_deal_watch_provider_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Append-only event log and consent-stamped held outbox
-- ---------------------------------------------------------------------------

create table if not exists public.saved_deal_watch_events (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null,
  user_id uuid not null,
  event_version text not null,
  event_kind text not null,
  observed_at timestamptz not null,
  priority text not null,
  dedupe_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),

  constraint saved_deal_watch_events_owned_watch_fk
    foreign key (watch_id, user_id)
    references public.saved_deal_watch_subscriptions(id, user_id)
    on delete cascade,
  constraint saved_deal_watch_events_id_watch_user_unique
    unique (id, watch_id, user_id),
  constraint saved_deal_watch_events_version_check
    check (char_length(event_version) between 1 and 40),
  constraint saved_deal_watch_events_kind_check
    check (event_kind in (
      'rate_driven_buy_box_pass',
      'newly_within_max_offer',
      'newly_within_buy_box',
      'material_price_gap_change'
    )),
  constraint saved_deal_watch_events_priority_check
    check (priority in ('high', 'normal')),
  constraint saved_deal_watch_events_dedupe_check
    check (char_length(dedupe_key) between 1 and 500),
  constraint saved_deal_watch_events_payload_check
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 131072
    ),
  constraint saved_deal_watch_events_dedupe_unique
    unique (dedupe_key)
);

comment on table public.saved_deal_watch_events is
  'Append-only meaningful threshold crossings. Provider retries collapse on dedupe_key. Authenticated users have read-only owner access.';

create index if not exists saved_deal_watch_events_user_observed_idx
  on public.saved_deal_watch_events (user_id, observed_at desc);

create table if not exists public.saved_deal_watch_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  watch_id uuid not null,
  user_id uuid not null,
  delivery_channel text not null,
  delivery_state text not null default 'held',
  consent_granted boolean not null,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_attempted_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_deal_watch_outbox_owned_event_fk
    foreign key (event_id, watch_id, user_id)
    references public.saved_deal_watch_events(id, watch_id, user_id)
    on delete cascade,
  constraint saved_deal_watch_outbox_event_channel_unique
    unique (event_id, delivery_channel),
  constraint saved_deal_watch_outbox_channel_check
    check (delivery_channel in ('in_app', 'email')),
  constraint saved_deal_watch_outbox_state_check
    check (delivery_state in ('held', 'dry_preview', 'queued', 'sent', 'suppressed', 'failed')),
  constraint saved_deal_watch_outbox_consent_check
    check (consent_granted = true),
  constraint saved_deal_watch_outbox_attempt_check
    check (attempt_count between 0 and 100),
  constraint saved_deal_watch_outbox_error_check
    check (last_error_code is null or char_length(last_error_code) <= 160),
  constraint saved_deal_watch_outbox_delivered_check
    check (
      (delivery_state = 'sent' and delivered_at is not null)
      or (delivery_state <> 'sent' and delivered_at is null)
    )
);

comment on table public.saved_deal_watch_outbox is
  'Consent-stamped delivery intent. Every row is inserted as held; this migration supplies no worker and sends nothing.';

create index if not exists saved_deal_watch_outbox_delivery_idx
  on public.saved_deal_watch_outbox (delivery_state, next_attempt_at, created_at)
  where delivery_state in ('held', 'dry_preview', 'queued', 'failed');

drop trigger if exists saved_deal_watch_outbox_90_updated_at
  on public.saved_deal_watch_outbox;
create trigger saved_deal_watch_outbox_90_updated_at
  before update on public.saved_deal_watch_outbox
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS: owner reads everywhere; only opt-in/preferences are user-writable
-- ---------------------------------------------------------------------------

alter table public.saved_deal_watch_subscriptions enable row level security;
alter table public.saved_deal_watch_preferences enable row level security;
alter table public.saved_deal_watch_checkpoints enable row level security;
alter table public.saved_deal_watch_provider_state enable row level security;
alter table public.saved_deal_watch_events enable row level security;
alter table public.saved_deal_watch_outbox enable row level security;

drop policy if exists "saved_deal_watch_subscriptions_select_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_select_own"
  on public.saved_deal_watch_subscriptions for select
  using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_subscriptions_insert_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_insert_own"
  on public.saved_deal_watch_subscriptions for insert
  with check (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_subscriptions_update_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_update_own"
  on public.saved_deal_watch_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_subscriptions_delete_own" on public.saved_deal_watch_subscriptions;
create policy "saved_deal_watch_subscriptions_delete_own"
  on public.saved_deal_watch_subscriptions for delete
  using (auth.uid() = user_id);

drop policy if exists "saved_deal_watch_preferences_select_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_select_own"
  on public.saved_deal_watch_preferences for select
  using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_preferences_insert_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_insert_own"
  on public.saved_deal_watch_preferences for insert
  with check (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_preferences_update_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_update_own"
  on public.saved_deal_watch_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_preferences_delete_own" on public.saved_deal_watch_preferences;
create policy "saved_deal_watch_preferences_delete_own"
  on public.saved_deal_watch_preferences for delete
  using (auth.uid() = user_id);

-- Checkpoints, provider state, events, and outbox are service-written. No
-- authenticated INSERT/UPDATE/DELETE policy exists for any of them.
drop policy if exists "saved_deal_watch_checkpoints_select_own" on public.saved_deal_watch_checkpoints;
create policy "saved_deal_watch_checkpoints_select_own"
  on public.saved_deal_watch_checkpoints for select
  using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_provider_state_select_own" on public.saved_deal_watch_provider_state;
-- Deliberately no authenticated provider-state policy. Checkpoints/events are
-- user-visible product data; opaque vendor cursors and retry diagnostics are
-- operational state and remain service-role-only.
drop policy if exists "saved_deal_watch_events_select_own" on public.saved_deal_watch_events;
create policy "saved_deal_watch_events_select_own"
  on public.saved_deal_watch_events for select
  using (auth.uid() = user_id);
drop policy if exists "saved_deal_watch_outbox_select_own" on public.saved_deal_watch_outbox;
create policy "saved_deal_watch_outbox_select_own"
  on public.saved_deal_watch_outbox for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) Atomic service-role checkpoint/event/outbox persistence hook
-- ---------------------------------------------------------------------------

create or replace function public.record_saved_deal_watch_evaluation(
  p_watch_id uuid,
  p_evaluator_version text,
  p_observed_at timestamptz,
  p_source_id text,
  p_state jsonb,
  p_event_kind text default null,
  p_event_version text default null,
  p_priority text default null,
  p_dedupe_key text default null,
  p_event_payload jsonb default null
)
returns table (
  checkpoint_updated boolean,
  event_id uuid,
  event_inserted boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_event_id uuid;
  v_checkpoint_rows bigint;
begin
  select watch.user_id
    into v_user_id
  from public.saved_deal_watch_subscriptions watch
  join public.saved_analyses deal
    on deal.id = watch.saved_analysis_id
   and deal.user_id = watch.user_id
  where watch.id = p_watch_id
    and watch.enabled = true
    and deal.deleted_at is null;

  if v_user_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'enabled saved deal watch not found';
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception using errcode = '22023', message = 'checkpoint state must be an object';
  end if;

  insert into public.saved_deal_watch_checkpoints (
    watch_id, user_id, evaluator_version, observed_at, source_id, state
  ) values (
    p_watch_id, v_user_id, p_evaluator_version, p_observed_at, nullif(btrim(p_source_id), ''), p_state
  )
  on conflict (watch_id) do update set
    evaluator_version = excluded.evaluator_version,
    observed_at = excluded.observed_at,
    source_id = excluded.source_id,
    state = excluded.state
  where excluded.observed_at >= public.saved_deal_watch_checkpoints.observed_at;

  get diagnostics v_checkpoint_rows = row_count;
  checkpoint_updated := v_checkpoint_rows > 0;
  event_id := null;
  event_inserted := false;

  -- A stale observation cannot create an event after a newer checkpoint.
  if not checkpoint_updated then
    return next;
    return;
  end if;

  -- Initial checkpoints and non-meaningful updates have no event. Require an
  -- all-or-none event envelope so a malformed worker call fails closed.
  if p_event_kind is null
     and p_event_version is null
     and p_priority is null
     and p_dedupe_key is null
     and p_event_payload is null then
    return next;
    return;
  end if;
  if p_event_kind is null
     or p_event_version is null
     or p_priority is null
     or p_dedupe_key is null
     or p_event_payload is null then
    raise exception using errcode = '22023', message = 'event envelope must be complete';
  end if;

  insert into public.saved_deal_watch_events (
    watch_id, user_id, event_version, event_kind, observed_at,
    priority, dedupe_key, payload
  ) values (
    p_watch_id, v_user_id, p_event_version, p_event_kind, p_observed_at,
    p_priority, p_dedupe_key, p_event_payload
  )
  on conflict (dedupe_key) do nothing
  returning id into v_event_id;

  event_id := v_event_id;
  event_inserted := v_event_id is not null;

  if v_event_id is not null then
    -- Consent is read at event time and stamped for auditability. A future
    -- delivery worker must re-check the current preference before delivery.
    -- `held` is intentional: this migration never makes a notification live.
    insert into public.saved_deal_watch_outbox (
      event_id, watch_id, user_id, delivery_channel, delivery_state, consent_granted
    )
    select v_event_id, p_watch_id, v_user_id, 'in_app', 'held', true
    from public.saved_deal_watch_preferences preferences
    where preferences.user_id = v_user_id
      and preferences.in_app_notifications_enabled = true
    on conflict on constraint saved_deal_watch_outbox_event_channel_unique do nothing;

    insert into public.saved_deal_watch_outbox (
      event_id, watch_id, user_id, delivery_channel, delivery_state, consent_granted
    )
    select v_event_id, p_watch_id, v_user_id, 'email', 'held', true
    from public.saved_deal_watch_preferences preferences
    where preferences.user_id = v_user_id
      and preferences.email_notifications_enabled = true
    on conflict on constraint saved_deal_watch_outbox_event_channel_unique do nothing;
  end if;

  return next;
end;
$$;

comment on function public.record_saved_deal_watch_evaluation(
  uuid, text, timestamptz, text, jsonb, text, text, text, text, jsonb
) is
  'Service-role-only atomic persistence hook. Advances a non-stale checkpoint, dedupes an optional event, and creates consented held outbox rows. Sends nothing.';

revoke all on function public.record_saved_deal_watch_evaluation(
  uuid, text, timestamptz, text, jsonb, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_saved_deal_watch_evaluation(
  uuid, text, timestamptz, text, jsonb, text, text, text, text, jsonb
) to service_role;
