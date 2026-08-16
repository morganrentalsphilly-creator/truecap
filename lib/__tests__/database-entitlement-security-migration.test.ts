import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260816120000_entitlement_rls_hardening.sql"
);
const migration = readFileSync(MIGRATION_PATH, "utf8");

function section(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  expect(startAt, `missing section start: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endAt, `missing section end after: ${start}`).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

function functionSql(name: string): string {
  return section(
    migration,
    `create or replace function public.${name}`,
    "\n$$;"
  );
}

function policySql(name: string, table: string): string {
  return section(
    migration,
    `create policy "${name}" on ${table}`,
    ";\n"
  );
}

function expectOwnedChildPolicy(
  name: string,
  table: string,
  activeParent: boolean
): string {
  const sql = policySql(name, table);
  expect(sql).toContain("auth.uid() = user_id");
  expect(sql).toContain(
    `public.truecap_owns_saved_analysis(analysis_id, ${activeParent})`
  );
  return sql;
}

describe("database entitlement and tenant-boundary hardening migration", () => {
  it("keeps entitlement helpers fail-closed, fixed-search-path, and least-privileged", () => {
    const validator = functionSql("truecap_entitlements_are_valid");
    expect(validator).toContain("p_entitlements is null");
    expect(validator).toContain("jsonb_typeof(p_entitlements) <> 'object'");
    expect(validator).toContain("return false;");
    expect(validator).toContain("set search_path = pg_catalog, pg_temp");

    const effective = functionSql("truecap_current_effective_entitlements");
    expect(effective).toContain("if auth.uid() is null then");
    expect(effective.match(/return '\{"features":\[\],"max_saved_deals":0\}'::jsonb;/g))
      .toHaveLength(2);
    expect(effective).toContain("public.truecap_entitlements_are_valid(candidate)");
    expect(effective).toContain("plan.slug = 'free'");

    const securityDefinerHelpers = [
      "truecap_current_effective_entitlements",
      "truecap_current_user_has_feature",
      "truecap_current_user_has_paid_plan",
      "truecap_current_saved_deal_limit",
      "truecap_is_trusted_service_context",
      "truecap_owns_saved_analysis",
      "truecap_assert_saved_deal_capacity",
      "truecap_enforce_saved_analysis_write",
      "truecap_enforce_buy_box_client_entitlement",
      "truecap_storage_path_is_owned_deal",
    ];
    for (const helper of securityDefinerHelpers) {
      const sql = functionSql(helper);
      expect(sql, helper).toContain("security definer");
      expect(sql, helper).toContain("set search_path = pg_catalog, pg_temp");
    }

    for (const signature of [
      "truecap_entitlements_are_valid(jsonb)",
      "truecap_current_effective_entitlements()",
      "truecap_current_user_has_feature(text)",
      "truecap_current_user_has_paid_plan()",
      "truecap_current_saved_deal_limit()",
      "truecap_is_trusted_service_context()",
      "truecap_owns_saved_analysis(uuid, boolean)",
      "truecap_assert_saved_deal_capacity(uuid)",
      "truecap_enforce_saved_analysis_write()",
      "truecap_enforce_buy_box_client_entitlement()",
      "truecap_storage_path_is_owned_deal(text, boolean)",
      "truecap_storage_metadata_allowed(jsonb, bigint, text[])",
    ]) {
      expect(migration).toContain(
        `revoke all on function public.${signature} from public;`
      );
      expect(migration).toContain(
        `revoke all on function public.${signature} from anon;`
      );
    }

    for (const privateSignature of [
      "truecap_is_trusted_service_context()",
      "truecap_assert_saved_deal_capacity(uuid)",
      "truecap_enforce_saved_analysis_write()",
      "truecap_enforce_buy_box_client_entitlement()",
    ]) {
      expect(migration).toContain(
        `revoke all on function public.${privateSignature} from authenticated;`
      );
      expect(migration).not.toContain(
        `grant execute on function public.${privateSignature}`
      );
    }
  });

  it("enforces the active saved-deal quota atomically on inserts and resurrection", () => {
    const capacity = functionSql("truecap_assert_saved_deal_capacity");
    const lockAt = capacity.indexOf("pg_advisory_xact_lock");
    const countAt = capacity.indexOf("select count(*)");

    expect(capacity).toContain("hashtextextended(p_user_id::text, 84519327)");
    expect(lockAt).toBeGreaterThanOrEqual(0);
    expect(countAt).toBeGreaterThan(lockAt);
    expect(capacity).toContain("analysis.user_id = p_user_id");
    expect(capacity).toContain("analysis.deleted_at is null");
    expect(capacity).toContain("if active_count >= deal_limit then");
    expect(capacity).toContain("constraint = 'saved_analyses_plan_capacity'");

    const writeGuard = functionSql("truecap_enforce_saved_analysis_write");
    expect(writeGuard).toMatch(
      /if tg_op = 'INSERT' then\s+perform public\.truecap_assert_saved_deal_capacity\(new\.user_id\)/
    );
    expect(writeGuard).toMatch(
      /if old\.deleted_at is not null and new\.deleted_at is null then\s+perform public\.truecap_assert_saved_deal_capacity\(new\.user_id\)/
    );
    expect(migration).toMatch(
      /create trigger saved_analyses_00_entitlement_guard\s+before insert or update on public\.saved_analyses\s+for each row execute function public\.truecap_enforce_saved_analysis_write\(\)/
    );
  });

  it("allows an ordinary entitled Free save but reserves saved scenarios for paid plans", () => {
    const insertPolicy = policySql(
      "saved_analyses_insert_own",
      "public.saved_analyses"
    );
    expect(insertPolicy).toContain("auth.uid() = user_id");
    expect(insertPolicy).toContain(
      "public.truecap_current_user_has_feature('save_deal')"
    );
    expect(insertPolicy).not.toContain("truecap_current_user_has_paid_plan");

    const writeGuard = functionSql("truecap_enforce_saved_analysis_write");
    expect(writeGuard).toMatch(
      /if property_id_text is not null\s+or \(new_row ->> 'scenario_name'\) is not null\s+or \(new_row ->> 'strategy_kind'\) is not null then\s+if not public\.truecap_current_user_has_paid_plan\(\) then/
    );
    expect(writeGuard).toMatch(
      /if new_row -> 'property_id' is distinct from old_row -> 'property_id'\s+or new_row -> 'scenario_name' is distinct from old_row -> 'scenario_name'\s+or new_row -> 'strategy_kind' is distinct from old_row -> 'strategy_kind' then\s+if not public\.truecap_current_user_has_paid_plan\(\) then/
    );
    expect(writeGuard).toContain(
      "message = 'a paid plan is required for saved scenarios'"
    );
    expect(writeGuard).toContain("property.user_id = new.user_id");
  });

  it("binds every analysis child mutation to the authenticated owner and owned parent", () => {
    const children = [
      {
        table: "public.analysis_projection_snapshots",
        prefix: "analysis_projection_snapshots",
        gate: "public.truecap_current_user_has_feature('projections')",
      },
      {
        table: "public.analysis_tax_strategy_snapshots",
        prefix: "analysis_tax_strategy_snapshots",
        gate: "public.truecap_current_user_has_feature('tax_strategy')",
      },
      {
        table: "public.analysis_exit_scenario_snapshots",
        prefix: "analysis_exit_scenario_snapshots",
        gate: "public.truecap_current_user_has_feature('exit_scenarios')",
      },
      {
        table: "public.deal_due_diligence",
        prefix: "deal_due_diligence",
        gate: "public.truecap_current_user_has_paid_plan()",
      },
    ];

    for (const child of children) {
      expectOwnedChildPolicy(
        `${child.prefix}_select_own`,
        child.table,
        false
      );
      for (const operation of ["insert", "update", "delete"]) {
        const policy = expectOwnedChildPolicy(
          `${child.prefix}_${operation}_own`,
          child.table,
          true
        );
        expect(policy, `${child.prefix} ${operation}`).toContain(child.gate);
      }
    }
  });

  it("keeps comps readable by the owner but removes all direct-user comp writes", () => {
    expectOwnedChildPolicy(
      "deal_comps_select_own",
      "public.deal_comps",
      false
    );
    for (const operation of ["insert", "update", "delete"]) {
      expect(migration).toContain(
        `drop policy if exists "deal_comps_${operation}_own" on public.deal_comps;`
      );
      expect(migration).not.toContain(
        `create policy "deal_comps_${operation}_own"`
      );
    }
  });

  it("applies canonical paid gates to direct workspace mutations", () => {
    const featureGates = [
      ["analysis_templates", "public.analysis_templates", "template_manage"],
      ["user_buy_box", "public.user_buy_box", "buy_box"],
      ["user_buy_boxes", "public.user_buy_boxes", "buy_box"],
      ["agent_clients_owner", "public.agent_clients", "client_buy_box"],
      ["Users can", "public.branding", "custom_branding"],
    ] as const;

    for (const [prefix, table, feature] of featureGates) {
      for (const operation of ["insert", "update", "delete"]) {
        const policyName =
          prefix === "Users can"
            ? `Users can ${operation} own branding`
            : `${prefix}_${operation}${prefix === "agent_clients_owner" ? "" : "_own"}`;
        const policy = policySql(policyName, table);
        expect(policy, policyName).toContain(
          `public.truecap_current_user_has_feature('${feature}')`
        );
      }
    }

    const versionInsert = policySql(
      "analysis_template_versions_insert_own",
      "public.analysis_template_versions"
    );
    expect(versionInsert).toContain(
      "public.truecap_current_user_has_feature('template_manage')"
    );
    expect(versionInsert).toContain("template.user_id = auth.uid()");

    for (const operation of ["insert", "update", "delete"]) {
      expect(
        policySql(`properties_${operation}_own`, "public.properties")
      ).toContain("public.truecap_current_user_has_paid_plan()");
      expect(
        policySql(
          `saved_deal_watch_subscriptions_${operation}_own`,
          "public.saved_deal_watch_subscriptions"
        )
      ).toContain("public.truecap_current_user_has_paid_plan()");
      expect(
        policySql(
          `saved_deal_watch_preferences_${operation}_own`,
          "public.saved_deal_watch_preferences"
        )
      ).toContain("public.truecap_current_user_has_paid_plan()");
    }

    const clientScopeGuard = functionSql(
      "truecap_enforce_buy_box_client_entitlement"
    );
    expect(clientScopeGuard).toContain("new.client_id is not null");
    expect(clientScopeGuard).toContain(
      "public.truecap_current_user_has_feature('client_buy_box')"
    );
    expect(clientScopeGuard).toContain("client.id = new.client_id");
    expect(clientScopeGuard).toContain("client.agent_user_id = new.user_id");
    expect(clientScopeGuard).toContain(
      "message = 'client_id must reference an owned client'"
    );
  });

  it("requires an exact owned deal path and bounded, allowlisted storage metadata", () => {
    const pathGuard = functionSql("truecap_storage_path_is_owned_deal");
    expect(pathGuard).toContain("cardinality(parts) <> 3");
    expect(pathGuard).toContain("parts[1] <> auth.uid()::text");
    expect(pathGuard).toMatch(
      /parts\[2\] !~ '\^\[0-9a-fA-F\]\{8\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{12\}\$'/
    );
    expect(pathGuard).toContain("parts[3] = ''");
    expect(pathGuard).toContain("analysis.id::text = lower(parts[2])");
    expect(pathGuard).toContain("analysis.user_id = auth.uid()");
    expect(pathGuard).toContain(
      "not p_require_active or analysis.deleted_at is null"
    );

    const metadataGuard = functionSql("truecap_storage_metadata_allowed");
    expect(metadataGuard).toContain("jsonb_typeof(p_metadata) <> 'object'");
    expect(metadataGuard).toContain("size_bytes >= 0");
    expect(metadataGuard).toContain("size_bytes <= p_max_bytes");
    expect(metadataGuard).toContain("mime_type = any(p_allowed_mime_types)");
    expect(migration).toContain(
      "'analysis-pdfs', 'analysis-pdfs', false, 10485760"
    );
    expect(migration).toContain(
      "'deal-documents', 'deal-documents', false, 10485760"
    );
  });

  it("retains owned PDF reads while gating PDF and document writes", () => {
    const pdfRead = policySql(
      "analysis_pdfs_select_own",
      "storage.objects"
    );
    expect(pdfRead).toContain("bucket_id = 'analysis-pdfs'");
    expect(pdfRead).toContain(
      "public.truecap_storage_path_is_owned_deal(name, false)"
    );
    expect(pdfRead).not.toContain("pdf_export");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(
        `analysis_pdfs_${operation}_own`,
        "storage.objects"
      );
      expect(policy).toContain(
        "public.truecap_storage_path_is_owned_deal(name, true)"
      );
      expect(policy).toContain(
        "public.truecap_current_user_has_feature('pdf_export')"
      );
      if (operation !== "delete") {
        expect(policy).toContain(
          "^investment-analysis-v[0-9]+[.]pdf$"
        );
        expect(policy).toContain(
          "public.truecap_storage_metadata_allowed(metadata, 10485760, array['application/pdf'])"
        );
      }
    }

    const documentRead = policySql(
      "deal_documents_select_own",
      "storage.objects"
    );
    expect(documentRead).toContain(
      "public.truecap_storage_path_is_owned_deal(name, false)"
    );
    expect(documentRead).not.toContain("truecap_current_user_has_paid_plan");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(
        `deal_documents_${operation}_own`,
        "storage.objects"
      );
      expect(policy).toContain(
        "public.truecap_storage_path_is_owned_deal(name, true)"
      );
      expect(policy).toContain("public.truecap_current_user_has_paid_plan()");
      if (operation !== "delete") {
        expect(policy).toContain("between 1 and 160");
        expect(policy).toContain("truecap_storage_metadata_allowed");
      }
    }
  });

  it("preserves only explicit trusted service and direct database bypasses", () => {
    const trusted = functionSql("truecap_is_trusted_service_context");
    expect(trusted).toContain("coalesce(auth.role(), '') = 'service_role'");
    expect(trusted).toContain(
      "session_user::text in ('postgres', 'supabase_admin')"
    );
    expect(trusted).not.toContain("current_user::text");

    for (const helper of [
      "truecap_assert_saved_deal_capacity",
      "truecap_enforce_saved_analysis_write",
      "truecap_enforce_buy_box_client_entitlement",
    ]) {
      expect(functionSql(helper), helper).toContain(
        "if public.truecap_is_trusted_service_context() then"
      );
    }
  });
});
