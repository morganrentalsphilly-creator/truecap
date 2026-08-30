import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260830230000_scenario_integrity.sql",
  ),
  "utf8",
).toLowerCase();

describe("scenario integrity migration", () => {
  it("applies as one explicit production transaction", () => {
    const operativeLines = migration
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("--"));

    expect(operativeLines[0]).toBe("begin;");
    expect(operativeLines.at(-1)).toBe("commit;");
  });

  it("write-locks child then parent before every preflight scan", () => {
    const parentLock = migration.indexOf(
      "lock table public.properties in share row exclusive mode;",
    );
    const childLock = migration.indexOf(
      "lock table public.saved_analyses in share row exclusive mode;",
    );
    const firstPreflight = migration.indexOf("do $$");

    expect(childLock).toBeGreaterThan(migration.indexOf("begin;"));
    expect(parentLock).toBeGreaterThan(childLock);
    expect(firstPreflight).toBeGreaterThan(parentLock);
    expect(migration).toContain(
      "this matches the live sole-member address-update",
    );
    expect(migration).toContain(
      "reversing it can deadlock against an in-flight address update",
    );
  });

  it("fails before DDL when the prerequisite index or capacity guard drifts", () => {
    const exactIndexFailure = migration.indexOf(
      "scenario integrity migration requires the exact active scenario-name index",
    );
    const firstScenarioDdl = migration.indexOf(
      "add column if not exists scenario_request_key uuid",
    );

    expect(exactIndexFailure).toBeGreaterThan(-1);
    expect(firstScenarioDdl).toBeGreaterThan(exactIndexFailure);
    expect(migration).toContain("scenario_index_table <> 'public.saved_analyses'::regclass");
    expect(migration).toContain("not coalesce(scenario_index_is_valid, false)");
    expect(migration).toContain("not coalesce(scenario_index_is_ready, false)");
    expect(migration).toContain("not coalesce(scenario_index_is_live, false)");
    expect(migration).toContain("scenario_index_key_count <> 2");
    expect(migration).toContain("scenario_index_attribute_count <> 2");
    expect(migration).toContain(
      "'coalesce(nullif(lower(btrim(scenario_name)),''''),''basecase'')'",
    );
    expect(migration).toContain(
      "'property_idisnotnullanddeleted_atisnull'",
    );
    expect(migration).toContain("pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, false)");
    expect(migration).toContain("pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, false)");
    expect(migration).toContain("pg_catalog.pg_get_expr(index_row.indpred");

    expect(migration).toContain("capacity_trigger_enabled not in ('o', 'a')");
    expect(migration).toContain("capacity_trigger_type <> 23");
    expect(migration).toContain(
      "capacity_trigger_function <>\n       to_regprocedure('public.truecap_enforce_saved_analysis_write()')::oid",
    );
    expect(migration).toContain("not coalesce(capacity_function_is_security_definer, false)");
    expect(migration).toContain("'truecap_assert_saved_deal_capacity'");
  });

  it("reserves one immutable request identity per owner across soft deletes", () => {
    expect(migration).toContain(
      "add column if not exists scenario_request_key uuid",
    );
    expect(migration).toContain(
      "create unique index if not exists saved_analyses_user_scenario_request_key_uidx",
    );

    const requestIndex = migration.slice(
      migration.indexOf(
        "create unique index if not exists saved_analyses_user_scenario_request_key_uidx",
      ),
      migration.indexOf(
        "comment on index public.saved_analyses_user_scenario_request_key_uidx",
      ),
    );
    expect(requestIndex).toContain("(user_id, scenario_request_key)");
    expect(requestIndex).toContain("where scenario_request_key is not null");
    expect(requestIndex).not.toContain("deleted_at");
    expect(migration).toContain(
      "existing scenario request-key index has an incompatible definition",
    );
    expect(migration).toContain(
      "request_index_table <> 'public.saved_analyses'::regclass",
    );
    expect(migration).toContain("not coalesce(request_index_is_valid, false)");
    expect(migration).toContain("not coalesce(request_index_is_ready, false)");
    expect(migration).toContain("not coalesce(request_index_is_live, false)");
    expect(migration).toContain("request_index_key_count <> 2");
    expect(migration).toContain("request_index_attribute_count <> 2");
    expect(migration).toContain("request_index_access_method <> 'btree'");
    expect(migration).toContain(
      "normalized_request_index_key_one <> 'user_id'",
    );
    expect(migration).toContain(
      "normalized_request_index_key_two <> 'scenario_request_key'",
    );
    expect(migration).toContain(
      "'scenario_request_keyisnotnull'",
    );
    expect(migration).toContain(
      "pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, false)",
    );
    expect(migration).toContain(
      "pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, false)",
    );
    expect(migration).toContain("scenario_request_key is immutable");
    expect(migration).toContain("errcode = '22023'");
  });

  it("claims a source property transactionally under caller RLS", () => {
    expect(migration).toContain(
      "claim_saved_analysis_property_for_scenario(\n  p_source_analysis_id uuid",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("caller_id := auth.uid()");
    expect(migration).toContain("and analysis.deleted_at is null\n  for update");
    expect(migration).toContain("insert into public.properties (user_id, address)");
    expect(migration).toContain("set property_id = claimed_property_id");
    expect(migration).toContain("then 'base case'");
    expect(migration).toContain(
      "revoke all on function public.claim_saved_analysis_property_for_scenario(uuid) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.claim_saved_analysis_property_for_scenario(uuid) to authenticated",
    );
    expect(migration).not.toContain("claim_saved_analysis_property_for_scenario(\n  p_source_analysis_id uuid\n)\nreturns uuid\nlanguage plpgsql\nsecurity definer");
  });

  it("serializes linked address writes and blocks grouped divergence", () => {
    expect(migration).toContain(
      "saved_analyses_10_property_address_guard",
    );
    expect(migration).toContain("from public.properties property");
    expect(migration).toContain("where property.id = new.property_id\n  for update");
    expect(migration).toContain(
      "constraint = 'saved_analyses_grouped_address_immutable'",
    );
    expect(migration).toContain(
      "message = 'saved_analyses_grouped_address_immutable'",
    );
    expect(migration).toContain(
      "where sibling.property_id = new.property_id\n        and sibling.id <> new.id",
    );
    expect(migration).toContain(
      "update public.properties property\n    set address = new_canonical_address",
    );
    expect(migration).toContain(
      "before insert or update of user_id, property_id, address, form_snapshot",
    );
    expect(migration).toContain(
      "properties_address_requires_saved_analysis_update",
    );
    expect(migration).toContain("pg_catalog.pg_trigger_depth() <= 1");
    expect(migration).toContain(
      "old.property_id is not null\n     and new.property_id is distinct from old.property_id",
    );
    expect(migration).toContain(
      "message = 'saved_analyses_property_membership_immutable'",
    );
    expect(migration).toContain(
      "constraint = 'saved_analyses_property_membership_immutable'",
    );
    expect(migration).toContain(
      "null-to-parent is reserved for the atomic claim path",
    );
  });

  it("removes owner DELETE and preserves parents with historical members", () => {
    expect(migration).toContain(
      'drop policy if exists "properties_delete_own" on public.properties',
    );
    expect(migration).toContain(
      "revoke delete on table public.properties from authenticated",
    );
    expect(migration).toContain(
      "create trigger properties_20_member_delete_guard",
    );
    expect(migration).toContain(
      "message = 'properties_saved_analysis_members_exist'",
    );
    expect(migration).toContain("errcode = '23503'");

    const memberCheck = migration.slice(
      migration.indexOf(
        "create or replace function public.truecap_prevent_property_delete_with_members()",
      ),
      migration.indexOf(
        "revoke all on function public.truecap_prevent_property_delete_with_members()",
      ),
    );
    expect(memberCheck).toContain("where analysis.property_id = old.id");
    expect(memberCheck).not.toContain("analysis.deleted_at");
  });

  it("fails closed on incompatible schema or customer address data", () => {
    expect(migration).toContain("scenario integrity migration is missing required columns");
    expect(migration).toContain("scenario integrity preflight found %s saved analyses with conflicting address fields");
    expect(migration).toContain("scenario integrity preflight found %s linked saved analyses that do not match their parent property");
    expect(migration).toContain("this migration will not auto-correct customer data");
  });
});
