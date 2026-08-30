-- Scenario creation integrity: durable replay identity, atomic property claims,
-- and one canonical address for every linked scenario group.
--
-- This migration is intentionally forward-only and replay-safe. It preserves
-- the existing saved-analysis entitlement/capacity trigger and the active
-- scenario-name uniqueness contract. Historical same-address standalone deals
-- are never auto-linked: an explicit claim is the proof of scenario intent.

begin;

-- Lock child then parent: this matches the live sole-member address-update
-- path, which first updates saved_analyses and then updates/locks properties
-- from the child trigger. SHARE ROW EXCLUSIVE permits normal reads but blocks
-- every INSERT/UPDATE/DELETE on both relations until this transaction commits,
-- so the scans and constraints below describe one stable customer-data state.
-- All future migrations touching both tables must keep this child-then-parent
-- order; reversing it can deadlock against an in-flight address update.
lock table public.saved_analyses in share row exclusive mode;
lock table public.properties in share row exclusive mode;

-- -------------------------------------------------------------------------
-- Preflight the schema and existing customer data before changing anything.
-- Fail closed with repair guidance instead of silently rewriting addresses.
-- -------------------------------------------------------------------------

do $$
declare
  missing_columns text[];
  split_address_count bigint;
  linked_address_mismatch_count bigint;
  capacity_trigger_enabled text;
  capacity_trigger_type smallint;
  capacity_trigger_function oid;
  capacity_trigger_definition text;
  capacity_function_is_security_definer boolean;
  capacity_function_definition text;
  scenario_index_oid oid;
  scenario_index_table oid;
  scenario_index_is_unique boolean;
  scenario_index_is_valid boolean;
  scenario_index_is_ready boolean;
  scenario_index_is_live boolean;
  scenario_index_key_count integer;
  scenario_index_attribute_count integer;
  scenario_index_access_method text;
  scenario_index_definition text;
  scenario_index_key_one text;
  scenario_index_key_two text;
  scenario_index_predicate text;
  normalized_scenario_index_key_one text;
  normalized_scenario_index_key_two text;
  normalized_scenario_index_predicate text;
begin
  if to_regclass('public.saved_analyses') is null
     or to_regclass('public.properties') is null then
    raise exception using
      errcode = '55000',
      message = 'scenario integrity migration requires saved_analyses and properties',
      hint = 'Apply the base saved-analysis and properties/scenarios migrations first.';
  end if;

  select array_agg(required.relation_name || '.' || required.column_name order by required.relation_name, required.column_name)
    into missing_columns
  from (
    values
      ('saved_analyses', 'id'),
      ('saved_analyses', 'user_id'),
      ('saved_analyses', 'form_snapshot'),
      ('saved_analyses', 'address'),
      ('saved_analyses', 'property_id'),
      ('saved_analyses', 'scenario_name'),
      ('saved_analyses', 'deleted_at'),
      ('properties', 'id'),
      ('properties', 'user_id'),
      ('properties', 'address')
  ) as required(relation_name, column_name)
  where not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation
      on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = required.relation_name
      and attribute.attname = required.column_name
      and attribute.attnum > 0
      and not attribute.attisdropped
  );

  if missing_columns is not null then
    raise exception using
      errcode = '55000',
      message = 'scenario integrity migration is missing required columns',
      detail = array_to_string(missing_columns, ', '),
      hint = 'Apply all earlier TrueCap schema migrations before retrying.';
  end if;

  if to_regprocedure('auth.uid()') is null
     or to_regprocedure('public.truecap_enforce_saved_analysis_write()') is null
     or to_regprocedure('public.truecap_assert_saved_deal_capacity(uuid)') is null then
    raise exception using
      errcode = '55000',
      message = 'scenario integrity migration is missing required authorization functions',
      hint = 'Apply the Supabase auth schema and workspace write-policy reconciliation first.';
  end if;

  select
    trigger_row.tgenabled::text,
    trigger_row.tgtype,
    trigger_row.tgfoid,
    pg_catalog.pg_get_triggerdef(trigger_row.oid, false),
    procedure_row.prosecdef,
    pg_catalog.pg_get_functiondef(procedure_row.oid)
  into
    capacity_trigger_enabled,
    capacity_trigger_type,
    capacity_trigger_function,
    capacity_trigger_definition,
    capacity_function_is_security_definer,
    capacity_function_definition
  from pg_catalog.pg_trigger trigger_row
  join pg_catalog.pg_proc procedure_row
    on procedure_row.oid = trigger_row.tgfoid
  where trigger_row.tgrelid = 'public.saved_analyses'::regclass
    and trigger_row.tgname = 'saved_analyses_00_entitlement_guard'
    and not trigger_row.tgisinternal;

  -- tgtype 23 is exactly ROW (1) + BEFORE (2) + INSERT (4) + UPDATE (16).
  -- Requiring the capacity helper in the bound SECURITY DEFINER function
  -- prevents a same-named no-op trigger from satisfying this prerequisite.
  if capacity_trigger_enabled is null
     or capacity_trigger_enabled not in ('O', 'A')
     or capacity_trigger_type <> 23
     or capacity_trigger_function <>
       to_regprocedure('public.truecap_enforce_saved_analysis_write()')::oid
     or not coalesce(capacity_function_is_security_definer, false)
     or pg_catalog.strpos(
       pg_catalog.lower(coalesce(capacity_function_definition, '')),
       'truecap_assert_saved_deal_capacity'
     ) = 0 then
    raise exception using
      errcode = '55000',
      message = 'scenario integrity migration requires an enabled capacity entitlement guard',
      detail = coalesce(capacity_trigger_definition, '<missing trigger>'),
      hint = 'Apply the workspace write-policy reconciliation before retrying.';
  end if;

  scenario_index_oid := to_regclass(
    'public.saved_analyses_active_property_scenario_name_uidx'
  );

  if scenario_index_oid is not null then
    select
      index_row.indrelid,
      index_row.indisunique,
      index_row.indisvalid,
      index_row.indisready,
      index_row.indislive,
      index_row.indnkeyatts,
      index_row.indnatts,
      access_method.amname,
      pg_catalog.pg_get_indexdef(index_row.indexrelid),
      case when index_row.indnatts >= 1
        then pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, false)
      end,
      case when index_row.indnatts >= 2
        then pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, false)
      end,
      pg_catalog.pg_get_expr(index_row.indpred, index_row.indrelid, false)
    into
      scenario_index_table,
      scenario_index_is_unique,
      scenario_index_is_valid,
      scenario_index_is_ready,
      scenario_index_is_live,
      scenario_index_key_count,
      scenario_index_attribute_count,
      scenario_index_access_method,
      scenario_index_definition,
      scenario_index_key_one,
      scenario_index_key_two,
      scenario_index_predicate
    from pg_catalog.pg_index index_row
    join pg_catalog.pg_class index_relation
      on index_relation.oid = index_row.indexrelid
    join pg_catalog.pg_am access_method
      on access_method.oid = index_relation.relam
    where index_row.indexrelid = scenario_index_oid;
  end if;

  normalized_scenario_index_key_one := pg_catalog.regexp_replace(
    pg_catalog.lower(coalesce(scenario_index_key_one, '')),
    '[[:space:]]+',
    '',
    'g'
  );
  normalized_scenario_index_key_two := pg_catalog.regexp_replace(
    pg_catalog.replace(
      pg_catalog.lower(coalesce(scenario_index_key_two, '')),
      '::text',
      ''
    ),
    '[[:space:]]+',
    '',
    'g'
  );
  normalized_scenario_index_predicate := pg_catalog.regexp_replace(
    pg_catalog.lower(coalesce(scenario_index_predicate, '')),
    '[()[:space:]]+',
    '',
    'g'
  );

  -- The prerequisite migration stores the exact equivalent of
  -- lower(coalesce(nullif(btrim(scenario_name), ''), 'Base case')) as
  -- coalesce(nullif(lower(btrim(scenario_name)), ''), 'base case'). Validate
  -- its reconstructed key expressions rather than trusting the index name.
  if scenario_index_oid is null
     or scenario_index_table <> 'public.saved_analyses'::regclass
     or not coalesce(scenario_index_is_unique, false)
     or not coalesce(scenario_index_is_valid, false)
     or not coalesce(scenario_index_is_ready, false)
     or not coalesce(scenario_index_is_live, false)
     or scenario_index_key_count <> 2
     or scenario_index_attribute_count <> 2
     or scenario_index_access_method <> 'btree'
     or normalized_scenario_index_key_one <> 'property_id'
     or normalized_scenario_index_key_two <>
       'coalesce(nullif(lower(btrim(scenario_name)),''''),''basecase'')'
     or normalized_scenario_index_predicate <>
       'property_idisnotnullanddeleted_atisnull' then
    raise exception using
      errcode = '55000',
      message = 'scenario integrity migration requires the exact active scenario-name index',
      detail = format(
        'definition=%s; key1=%s; key2=%s; predicate=%s',
        coalesce(scenario_index_definition, '<missing>'),
        coalesce(scenario_index_key_one, '<missing>'),
        coalesce(scenario_index_key_two, '<missing>'),
        coalesce(scenario_index_predicate, '<missing>')
      ),
      hint = 'Apply the workspace write-policy reconciliation before retrying.';
  end if;

  select count(*)
    into split_address_count
  from public.saved_analyses analysis
  where nullif(pg_catalog.btrim(analysis.address), '') is not null
    and nullif(pg_catalog.btrim(analysis.form_snapshot ->> 'address'), '') is not null
    and pg_catalog.lower(pg_catalog.btrim(analysis.address))
      <> pg_catalog.lower(pg_catalog.btrim(analysis.form_snapshot ->> 'address'));

  if split_address_count > 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'scenario integrity preflight found %s saved analyses with conflicting address fields',
        split_address_count
      ),
      hint = 'Reconcile each top-level address with form_snapshot.address, preserving verified customer data, then retry.';
  end if;

  select count(*)
    into linked_address_mismatch_count
  from public.saved_analyses analysis
  left join public.properties property
    on property.id = analysis.property_id
  where analysis.property_id is not null
    and (
      property.id is null
      or property.user_id is distinct from analysis.user_id
      or coalesce(
        nullif(pg_catalog.btrim(analysis.form_snapshot ->> 'address'), ''),
        nullif(pg_catalog.btrim(analysis.address), '')
      ) is null
      or pg_catalog.lower(pg_catalog.btrim(property.address)) is distinct from
        pg_catalog.lower(
          coalesce(
            nullif(pg_catalog.btrim(analysis.form_snapshot ->> 'address'), ''),
            nullif(pg_catalog.btrim(analysis.address), '')
          )
        )
    );

  if linked_address_mismatch_count > 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'scenario integrity preflight found %s linked saved analyses that do not match their parent property',
        linked_address_mismatch_count
      ),
      hint = 'Review and reconcile the linked analysis/property owner and canonical address; this migration will not auto-correct customer data.';
  end if;
end $$;

-- -------------------------------------------------------------------------
-- One immutable request identity per owner. The index deliberately includes
-- soft-deleted rows: a delayed retry may observe history, but may never create
-- a replacement scenario for a request that already committed.
-- -------------------------------------------------------------------------

alter table public.saved_analyses
  add column if not exists scenario_request_key uuid;

comment on column public.saved_analyses.scenario_request_key is
  'Immutable client request identity for scenario creation. Unique per owner across live and soft-deleted saved analyses so retries cannot duplicate or resurrect a removed scenario.';

do $$
declare
  duplicate_request_key_count bigint;
  request_index_oid oid;
  request_index_table oid;
  request_index_definition text;
  request_index_key_one text;
  request_index_key_two text;
  request_index_predicate text;
  request_index_is_unique boolean;
  request_index_is_valid boolean;
  request_index_is_ready boolean;
  request_index_is_live boolean;
  request_index_key_count integer;
  request_index_attribute_count integer;
  request_index_access_method text;
  normalized_request_index_key_one text;
  normalized_request_index_key_two text;
  normalized_request_index_predicate text;
begin
  select count(*)
    into duplicate_request_key_count
  from (
    select analysis.user_id, analysis.scenario_request_key
    from public.saved_analyses analysis
    where analysis.scenario_request_key is not null
    group by analysis.user_id, analysis.scenario_request_key
    having count(*) > 1
  ) duplicates;

  if duplicate_request_key_count > 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'scenario integrity preflight found %s duplicate owner/request-key groups',
        duplicate_request_key_count
      ),
      hint = 'Resolve duplicate scenario_request_key values before creating the global replay-identity index.';
  end if;

  request_index_oid := to_regclass(
    'public.saved_analyses_user_scenario_request_key_uidx'
  );

  if request_index_oid is not null then
    select
      index_row.indrelid,
      pg_catalog.pg_get_indexdef(index_row.indexrelid),
      case when index_row.indnatts >= 1
        then pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, false)
      end,
      case when index_row.indnatts >= 2
        then pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, false)
      end,
      pg_catalog.pg_get_expr(index_row.indpred, index_row.indrelid),
      index_row.indisunique,
      index_row.indisvalid,
      index_row.indisready,
      index_row.indislive,
      index_row.indnkeyatts,
      index_row.indnatts,
      access_method.amname
    into
      request_index_table,
      request_index_definition,
      request_index_key_one,
      request_index_key_two,
      request_index_predicate,
      request_index_is_unique,
      request_index_is_valid,
      request_index_is_ready,
      request_index_is_live,
      request_index_key_count,
      request_index_attribute_count,
      request_index_access_method
    from pg_catalog.pg_index index_row
    join pg_catalog.pg_class index_relation
      on index_relation.oid = index_row.indexrelid
    join pg_catalog.pg_am access_method
      on access_method.oid = index_relation.relam
    where index_row.indexrelid = request_index_oid;

    normalized_request_index_key_one := pg_catalog.regexp_replace(
      pg_catalog.lower(coalesce(request_index_key_one, '')),
      '[[:space:]]+',
      '',
      'g'
    );
    normalized_request_index_key_two := pg_catalog.regexp_replace(
      pg_catalog.lower(coalesce(request_index_key_two, '')),
      '[[:space:]]+',
      '',
      'g'
    );
    normalized_request_index_predicate := pg_catalog.regexp_replace(
      pg_catalog.lower(coalesce(request_index_predicate, '')),
      '[()[:space:]\"]+',
      '',
      'g'
    );

    if request_index_table <> 'public.saved_analyses'::regclass
       or not coalesce(request_index_is_unique, false)
       or not coalesce(request_index_is_valid, false)
       or not coalesce(request_index_is_ready, false)
       or not coalesce(request_index_is_live, false)
       or request_index_key_count <> 2
       or request_index_attribute_count <> 2
       or request_index_access_method <> 'btree'
       or normalized_request_index_key_one <> 'user_id'
       or normalized_request_index_key_two <> 'scenario_request_key'
       or normalized_request_index_predicate <>
         'scenario_request_keyisnotnull' then
      raise exception using
        errcode = '55000',
        message = 'existing scenario request-key index has an incompatible definition',
        detail = format(
          'definition=%s; key1=%s; key2=%s; predicate=%s',
          coalesce(request_index_definition, '<missing>'),
          coalesce(request_index_key_one, '<missing>'),
          coalesce(request_index_key_two, '<missing>'),
          coalesce(request_index_predicate, '<missing>')
        ),
        hint = 'Restore a unique (user_id, scenario_request_key) index whose only predicate is scenario_request_key IS NOT NULL.';
    end if;
  end if;
end $$;

create unique index if not exists saved_analyses_user_scenario_request_key_uidx
  on public.saved_analyses (user_id, scenario_request_key)
  where scenario_request_key is not null;

comment on index public.saved_analyses_user_scenario_request_key_uidx is
  'Global per-owner scenario request identity. There is intentionally no deleted_at predicate: soft-deleted rows keep request keys reserved.';

create or replace function public.truecap_guard_scenario_request_key_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.scenario_request_key is distinct from old.scenario_request_key then
    raise exception using
      errcode = '22023',
      message = 'scenario_request_key is immutable',
      column = 'scenario_request_key';
  end if;

  return new;
end;
$$;

revoke all on function public.truecap_guard_scenario_request_key_immutable() from public;
revoke all on function public.truecap_guard_scenario_request_key_immutable() from anon;
revoke all on function public.truecap_guard_scenario_request_key_immutable() from authenticated;

drop trigger if exists saved_analyses_05_scenario_request_key_guard on public.saved_analyses;
create trigger saved_analyses_05_scenario_request_key_guard
  before update on public.saved_analyses
  for each row
  when (new.scenario_request_key is distinct from old.scenario_request_key)
  execute function public.truecap_guard_scenario_request_key_immutable();

comment on function public.truecap_guard_scenario_request_key_immutable() is
  'Rejects every UPDATE that changes scenario_request_key, including NULL-to-value and value-to-NULL changes. Request identity is assigned only on INSERT.';

comment on trigger saved_analyses_05_scenario_request_key_guard on public.saved_analyses is
  'Runs after the 00 entitlement guard by trigger name and keeps scenario replay identity immutable.';

-- -------------------------------------------------------------------------
-- Canonical linked-address integrity. Trigger names are significant: the 10
-- guard runs after saved_analyses_00_entitlement_guard for the same event.
-- Every participating transaction locks the parent property, so a sole-row
-- address edit and a concurrent sibling insert cannot both commit.
-- -------------------------------------------------------------------------

create or replace function public.truecap_guard_direct_property_address_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if pg_catalog.lower(pg_catalog.btrim(new.address))
     is not distinct from pg_catalog.lower(pg_catalog.btrim(old.address)) then
    return new;
  end if;

  -- The saved-analysis address trigger below is the only supported writer of
  -- a claimed parent address. Its nested UPDATE runs at trigger depth > 1.
  -- Rejecting every top-level parent rename avoids a snapshot race with a
  -- concurrent first sibling insert and keeps the child/parent invariant
  -- enforceable without a caller-controlled session flag.
  if pg_catalog.pg_trigger_depth() <= 1 then
    raise exception using
      errcode = '23514',
      message = 'properties_address_requires_saved_analysis_update',
      constraint = 'properties_address_requires_saved_analysis_update';
  end if;

  return new;
end;
$$;

revoke all on function public.truecap_guard_direct_property_address_update() from public;
revoke all on function public.truecap_guard_direct_property_address_update() from anon;
revoke all on function public.truecap_guard_direct_property_address_update() from authenticated;

drop trigger if exists properties_10_address_update_guard on public.properties;
create trigger properties_10_address_update_guard
  before update of address on public.properties
  for each row execute function public.truecap_guard_direct_property_address_update();

comment on function public.truecap_guard_direct_property_address_update() is
  'Rejects direct property-address renames. A canonical parent address may change only through the nested, locked sole-member saved-analysis update path.';

comment on trigger properties_10_address_update_guard on public.properties is
  'Prevents authenticated or privileged direct parent renames from bypassing saved-analysis canonical-address locking.';

create or replace function public.truecap_prevent_property_delete_with_members()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if exists (
    select 1
    from public.saved_analyses analysis
    where analysis.property_id = old.id
  ) then
    -- Intentionally no deleted_at predicate. Soft deletion preserves scenario
    -- history and therefore preserves membership in the parent property.
    raise exception using
      errcode = '23503',
      message = 'properties_saved_analysis_members_exist',
      constraint = 'properties_saved_analysis_members_exist';
  end if;

  return old;
end;
$$;

revoke all on function public.truecap_prevent_property_delete_with_members() from public;
revoke all on function public.truecap_prevent_property_delete_with_members() from anon;
revoke all on function public.truecap_prevent_property_delete_with_members() from authenticated;

drop trigger if exists properties_20_member_delete_guard on public.properties;
create trigger properties_20_member_delete_guard
  before delete on public.properties
  for each row execute function public.truecap_prevent_property_delete_with_members();

-- Earlier migrations granted owners direct DELETE access. Scenario parents are
-- now durable workspace identity: remove that policy and table privilege. A
-- privileged maintenance path may still delete a proven orphan, while the
-- trigger above prevents even privileged deletion of a live or historical
-- parent. These statements are replay-safe.
drop policy if exists "properties_delete_own" on public.properties;
revoke delete on table public.properties from anon;
revoke delete on table public.properties from authenticated;

comment on function public.truecap_prevent_property_delete_with_members() is
  'Prevents deletion of a property referenced by any saved analysis, including soft-deleted historical rows. Orphan deletion remains available only to privileged maintenance.';

comment on trigger properties_20_member_delete_guard on public.properties is
  'Preserves scenario parent identity and prevents ON DELETE SET NULL from silently ungrouping live or historical saved analyses.';

create or replace function public.truecap_enforce_saved_analysis_property_address()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  new_snapshot_address text;
  new_top_level_address text;
  new_canonical_address text;
  old_canonical_address text;
  parent_owner_id uuid;
  parent_address text;
  has_other_member boolean;
begin
  new_snapshot_address := nullif(pg_catalog.btrim(new.form_snapshot ->> 'address'), '');
  new_top_level_address := nullif(pg_catalog.btrim(new.address), '');

  if new_snapshot_address is not null
     and new_top_level_address is not null
     and pg_catalog.lower(new_snapshot_address) <> pg_catalog.lower(new_top_level_address) then
    raise exception using
      errcode = '23514',
      message = 'saved analysis address fields must agree',
      constraint = 'saved_analyses_address_fields_match';
  end if;

  new_canonical_address := coalesce(new_snapshot_address, new_top_level_address);

  -- Property membership is one-way. The atomic claim RPC may move an
  -- ungrouped row from NULL to its first owned parent; once non-NULL, neither
  -- an authenticated REST update nor a privileged write may unlink or
  -- reparent the member and silently destroy scenario history.
  if tg_op = 'UPDATE'
     and old.property_id is not null
     and new.property_id is distinct from old.property_id then
    raise exception using
      errcode = '23514',
      message = 'saved_analyses_property_membership_immutable',
      constraint = 'saved_analyses_property_membership_immutable';
  end if;

  if new.property_id is null then
    return new;
  end if;

  if new_canonical_address is null then
    raise exception using
      errcode = '23514',
      message = 'a linked saved analysis requires a canonical address',
      constraint = 'saved_analyses_property_address_match';
  end if;

  -- The parent lock is both an ownership/address check and the serialization
  -- point shared by property moves, linked inserts, and sole-member edits.
  select property.user_id, property.address
    into parent_owner_id, parent_address
  from public.properties property
  where property.id = new.property_id
  for update;

  if not found or parent_owner_id is distinct from new.user_id then
    raise exception using
      errcode = '23514',
      message = 'property_id must reference an owned property',
      constraint = 'saved_analyses_property_owner_match';
  end if;

  if tg_op = 'INSERT' then
    if pg_catalog.lower(pg_catalog.btrim(parent_address))
       is distinct from pg_catalog.lower(new_canonical_address) then
      raise exception using
        errcode = '23514',
        message = 'linked saved analysis address must match its parent property',
        constraint = 'saved_analyses_property_address_match';
    end if;

    return new;
  end if;

  if old.property_id is distinct from new.property_id then
    if pg_catalog.lower(pg_catalog.btrim(parent_address))
       is distinct from pg_catalog.lower(new_canonical_address) then
      raise exception using
        errcode = '23514',
        message = 'linked saved analysis address must match its parent property',
        constraint = 'saved_analyses_property_address_match';
    end if;

    return new;
  end if;

  old_canonical_address := coalesce(
    nullif(pg_catalog.btrim(old.form_snapshot ->> 'address'), ''),
    nullif(pg_catalog.btrim(old.address), '')
  );

  if pg_catalog.lower(old_canonical_address)
     is distinct from pg_catalog.lower(new_canonical_address) then
    -- Do not filter deleted_at: historical rows are still members of the
    -- property group and must prevent an address rewrite beneath them.
    select exists (
      select 1
      from public.saved_analyses sibling
      where sibling.property_id = new.property_id
        and sibling.id <> new.id
    ) into has_other_member;

    if has_other_member then
      raise exception using
        errcode = '23514',
        message = 'saved_analyses_grouped_address_immutable',
        constraint = 'saved_analyses_grouped_address_immutable';
    end if;

    update public.properties property
    set address = new_canonical_address
    where property.id = new.property_id
      and property.user_id = new.user_id;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'property_id must reference an owned property',
        constraint = 'saved_analyses_property_owner_match';
    end if;

    return new;
  end if;

  -- A relevant update that did not change the child address still must not
  -- perpetuate parent drift introduced outside this guarded path.
  if pg_catalog.lower(pg_catalog.btrim(parent_address))
     is distinct from pg_catalog.lower(new_canonical_address) then
    raise exception using
      errcode = '23514',
      message = 'linked saved analysis address must match its parent property',
      constraint = 'saved_analyses_property_address_match';
  end if;

  return new;
end;
$$;

revoke all on function public.truecap_enforce_saved_analysis_property_address() from public;
revoke all on function public.truecap_enforce_saved_analysis_property_address() from anon;
revoke all on function public.truecap_enforce_saved_analysis_property_address() from authenticated;

drop trigger if exists saved_analyses_10_property_address_guard on public.saved_analyses;
create trigger saved_analyses_10_property_address_guard
  before insert or update of user_id, property_id, address, form_snapshot
  on public.saved_analyses
  for each row execute function public.truecap_enforce_saved_analysis_property_address();

comment on function public.truecap_enforce_saved_analysis_property_address() is
  'Enforces one-way property membership plus normalized top-level/snapshot/parent address and owner agreement. NULL-to-parent is reserved for the atomic claim path; a linked row cannot unlink or reparent. A sole linked row may atomically rename its locked parent; any other live or soft-deleted member makes the grouped address immutable.';

comment on trigger saved_analyses_10_property_address_guard on public.saved_analyses is
  'Runs after the 00 entitlement guard. Parent-row locking serializes linked inserts/property moves with sole-member address edits and blocks grouped divergence races.';

-- -------------------------------------------------------------------------
-- Atomic, replay-safe source claim. SECURITY INVOKER is deliberate: table
-- RLS and the existing entitlement/capacity guard remain authoritative.
-- -------------------------------------------------------------------------

create or replace function public.claim_saved_analysis_property_for_scenario(
  p_source_analysis_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  caller_id uuid;
  source_row public.saved_analyses%rowtype;
  source_address text;
  claimed_property_id uuid;
  parent_owner_id uuid;
  parent_address text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication is required to claim a scenario property';
  end if;

  -- This row lock is the replay/concurrency authority. A second first-scenario
  -- request waits, then observes and returns the property chosen by the first.
  select analysis.*
    into source_row
  from public.saved_analyses analysis
  where analysis.id = p_source_analysis_id
    and analysis.user_id = caller_id
    and analysis.deleted_at is null
  for update;

  if not found then
    -- Use one result for missing, foreign, and soft-deleted rows to avoid
    -- disclosing another account's saved-analysis identifiers.
    raise exception using
      errcode = '42501',
      message = 'source saved analysis is unavailable';
  end if;

  source_address := coalesce(
    nullif(pg_catalog.btrim(source_row.form_snapshot ->> 'address'), ''),
    nullif(pg_catalog.btrim(source_row.address), '')
  );

  if source_address is null then
    raise exception using
      errcode = '22023',
      message = 'source saved analysis has no canonical address';
  end if;

  if source_row.property_id is not null then
    select property.user_id, property.address
      into parent_owner_id, parent_address
    from public.properties property
    where property.id = source_row.property_id
    for update;

    if not found or parent_owner_id is distinct from caller_id then
      raise exception using
        errcode = '23514',
        message = 'source saved analysis property is not owned by the caller',
        constraint = 'saved_analyses_property_owner_match';
    end if;

    if pg_catalog.lower(pg_catalog.btrim(parent_address))
       is distinct from pg_catalog.lower(source_address) then
      raise exception using
        errcode = '23514',
        message = 'source saved analysis address does not match its parent property',
        constraint = 'saved_analyses_property_address_match';
    end if;

    return source_row.property_id;
  end if;

  insert into public.properties (user_id, address)
  values (caller_id, source_address)
  returning id into claimed_property_id;

  update public.saved_analyses analysis
  set property_id = claimed_property_id,
      scenario_name = case
        when nullif(pg_catalog.btrim(analysis.scenario_name), '') is null
          then 'Base case'
        else analysis.scenario_name
      end
  where analysis.id = source_row.id
    and analysis.user_id = caller_id
    and analysis.deleted_at is null
    and analysis.property_id is null;

  if not found then
    -- The source row is locked, so this means an invariant was violated inside
    -- this transaction. Raising rolls back the just-created parent as well.
    raise exception using
      errcode = '40001',
      message = 'scenario property claim lost its locked source row';
  end if;

  return claimed_property_id;
end;
$$;

revoke all on function public.claim_saved_analysis_property_for_scenario(uuid) from public;
revoke all on function public.claim_saved_analysis_property_for_scenario(uuid) from anon;
revoke all on function public.claim_saved_analysis_property_for_scenario(uuid) from authenticated;
grant execute on function public.claim_saved_analysis_property_for_scenario(uuid) to authenticated;

comment on function public.claim_saved_analysis_property_for_scenario(uuid) is
  'Atomically claims one owned, nondeleted saved analysis into a scenario property. Locks the source for replay safety, never links by address alone, validates any existing parent, and returns the canonical property UUID. SECURITY INVOKER preserves RLS and existing entitlement/capacity enforcement.';

commit;
