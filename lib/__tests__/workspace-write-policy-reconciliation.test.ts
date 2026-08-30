import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAnalysisPdfObjectPath } from "@/lib/pdf-export-constants";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read(
  "supabase/migrations/20260830130000_reconcile_workspace_write_policies.sql",
);

function between(start: string, end: string): string {
  const startAt = migration.indexOf(start);
  const endAt = migration.indexOf(end, startAt + start.length);
  expect(startAt, `missing section start: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endAt, `missing section end after: ${start}`).toBeGreaterThan(startAt);
  return migration.slice(startAt, endAt);
}

function functionSql(name: string): string {
  return between(`create or replace function public.${name}`, "\n$$;");
}

function policySql(name: string, table: string): string {
  return between(`create policy "${name}" on ${table}`, ";\n");
}

describe("workspace write policy reconciliation", () => {
  it("keeps scenario ownership and capacity guards while removing only the stale paid check", () => {
    const guard = functionSql("truecap_enforce_saved_analysis_write");
    expect(guard).toContain("perform public.truecap_assert_saved_deal_capacity(new.user_id)");
    expect(guard).toContain("property.user_id = new.user_id");
    expect(guard).not.toContain("a paid plan is required for saved scenarios");
    expect(guard).toContain("a paid plan is required to update saved analysis underwriting");
    expect(guard).not.toContain(
      "new_row -> 'pipeline_stage' is distinct from old_row -> 'pipeline_stage'",
    );
    expect(guard).toContain(
      "if new_row -> 'tags' is distinct from old_row -> 'tags' then",
    );

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(`properties_${operation}_own`, "public.properties");
      expect(policy).toContain("auth.uid() = user_id");
      expect(policy).not.toContain("truecap_current_user_has_paid_plan");
    }
  });

  it("restores the saved-deal policy boundary on both clean-main and production histories", () => {
    const insert = policySql("saved_analyses_insert_own", "public.saved_analyses");
    expect(insert).toContain("auth.uid() = user_id");
    expect(insert).toContain("truecap_current_user_has_feature('save_deal')");

    for (const operation of ["select", "update", "delete"]) {
      const policy = policySql(
        `saved_analyses_${operation}_own`,
        "public.saved_analyses",
      );
      expect(policy).toContain("auth.uid() = user_id");
    }

    expect(migration).toContain(
      "create trigger saved_analyses_00_entitlement_guard",
    );
  });

  it("makes every live property row unique under the action's Base case normalization", () => {
    const preflight = between(
      "-- Fail before changing any catalog object if an older read-then-insert race",
      "-- -------------------------------------------------------------------------",
    );
    expect(preflight).toContain("having count(*) > 1");
    expect(preflight).toContain("if conflict_groups > 0 then");
    expect(preflight).toContain(
      "Cannot enforce unique live scenario names.",
    );
    expect(preflight).toContain(
      "Resolve only the reported duplicate scenario names",
    );
    expect(preflight).not.toContain("update public.saved_analyses");

    const index = between(
      "create unique index if not exists saved_analyses_active_property_scenario_name_uidx",
      ";\n",
    );
    expect(index).toContain(
      "coalesce(nullif(lower(btrim(scenario_name)), ''), 'base case')",
    );
    expect(index).toContain("property_id is not null");
    expect(index).toContain("deleted_at is null");
    expect(index).not.toContain("scenario_name is not null");
  });

  it("keeps Free basic lifecycle states while gating fine-grained pipeline stages", () => {
    const stage = functionSql("update_saved_deal_stage_with_history");
    expect(stage).toContain("security definer");
    expect(stage).toContain("set search_path = pg_catalog, pg_temp");
    expect(stage).toContain(
      "truecap_current_user_has_feature('pipeline')",
    );
    expect(stage).not.toContain("from public.subscriptions");
    expect(stage).toContain(
      "p_new_stage not in ('analyzing', 'closed', 'passed')",
    );
    expect(stage).not.toMatch(/if not v_has_pipeline_entitlement\s+then/);

    // Ownership, row locking, reason semantics, lifecycle mirrors, and the
    // append-only event stay inside the same transaction.
    expect(stage).toContain("deal.user_id = v_actor_user_id");
    expect(stage).toContain("for update");
    expect(stage).toContain("p_new_stage = 'passed' and v_reason is null");
    expect(stage).toContain("is_completed = (p_new_stage = 'closed')");
    expect(stage).toContain("is_archived = (p_new_stage = 'passed')");
    expect(stage).toContain("insert into public.saved_deal_history_events");
    expect(migration).toContain(
      "grant execute on function public.update_saved_deal_stage_with_history(uuid, text, text, text)",
    );

    const effective = functionSql("truecap_current_effective_entitlements");
    expect(effective).toContain("plan.is_active = true");
    expect(effective).toContain("order by subscription.updated_at desc");
    expect(effective).toContain("limit 1");
    expect(effective.indexOf("limit 1")).toBeLessThan(
      effective.indexOf("where plan.is_active = true"),
    );

    const paid = functionSql("truecap_current_user_has_paid_plan");
    expect(paid).toContain("order by subscription.updated_at desc");
    expect(paid.indexOf("limit 1")).toBeLessThan(
      paid.indexOf("plan.slug <> 'free'"),
    );
  });

  it("makes Passed Undo an exact-event compare-and-set that rejects ABA", () => {
    const transition = functionSql("update_saved_deal_stage_with_history");
    const undo = functionSql("undo_passed_saved_deal_stage_with_history");

    expect(migration).toContain(
      "add column if not exists current_stage_history_event_id uuid",
    );
    expect(transition).toContain("v_event_id := gen_random_uuid()");
    expect(transition).toContain(
      "current_stage_history_event_id = v_event_id",
    );
    expect(transition).toMatch(
      /insert into public\.saved_deal_history_events \(\s*id,/,
    );
    expect(undo).toContain("security definer");
    expect(undo).toContain("set search_path = pg_catalog, pg_temp");
    expect(undo).toContain("deal.user_id = v_actor_user_id");
    expect(undo).toContain("deal.deleted_at is null");
    expect(undo).toContain("for update");
    expect(undo).toContain("deal.current_stage_history_event_id");
    expect(undo).toContain(
      "v_current_stage_history_event_id is distinct from p_expected_pass_history_event_id",
    );
    expect(undo).toContain("event.id = p_expected_pass_history_event_id");
    expect(undo).toContain("event.new_stage = 'passed'");
    expect(undo).toContain("event.old_stage = p_restore_stage");
    expect(undo).toContain("errcode = '40001'");
    expect(undo).toContain(
      "from public.update_saved_deal_stage_with_history(",
    );
    expect(undo).not.toContain(
      "insert into public.saved_deal_history_events",
    );

    const staleCheck = undo.indexOf(
      "v_current_stage_history_event_id is distinct from p_expected_pass_history_event_id",
    );
    const canonicalTransition = undo.indexOf(
      "from public.update_saved_deal_stage_with_history(",
    );
    expect(staleCheck).toBeGreaterThan(-1);
    expect(canonicalTransition).toBeGreaterThan(staleCheck);
    expect(migration).toContain(
      "drop function if exists public.undo_passed_saved_deal_stage_with_history(\n  uuid, text, text, text\n)",
    );
    expect(migration).toContain(
      "grant execute on function public.undo_passed_saved_deal_stage_with_history(uuid, text, uuid, text, text)",
    );
    const lifecycleGuard = functionSql("guard_saved_deal_lifecycle_columns");
    expect(lifecycleGuard).toContain(
      "new.current_stage_history_event_id is distinct from old.current_stage_history_event_id",
    );
  });

  it("keeps bulk Passed transitions on the same entitlement and event-pointer invariant", () => {
    const bulk = functionSql("bulk_archive_saved_deals_with_history");
    expect(bulk).toContain("security definer");
    expect(bulk).toContain("set search_path = pg_catalog, pg_temp");
    expect(bulk).toContain(
      "public.truecap_current_user_has_feature('pipeline')",
    );
    expect(bulk).not.toContain("from public.subscriptions");
    expect(bulk).toContain("for update of deal");
    expect(bulk).toContain("v_event_id := gen_random_uuid()");
    expect(bulk).toContain("current_stage_history_event_id = v_event_id");
    expect(bulk).toMatch(
      /insert into public\.saved_deal_history_events \(\s*id,/,
    );
  });

  it("unschedules and disables stale auto-archive instead of forging Passed history", () => {
    const archive = functionSql("archive_stale_saved_analyses");
    expect(archive).toContain("security definer");
    expect(archive).toContain("set search_path = pg_catalog, pg_temp");
    expect(archive).toContain("select 0;");
    expect(archive).not.toContain("update public.saved_analyses");
    expect(migration).toContain("for stale_archive_job_id in");
    expect(migration).toContain("perform cron.unschedule(stale_archive_job_id)");
    expect(migration).toContain("archive-stale-saved-analyses-daily");
    expect(migration).toContain(
      "revoke all on function public.archive_stale_saved_analyses() from authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.archive_stale_saved_analyses() to service_role;",
    );
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("pg_catalog.coalesce(");
  });

  it("allows Free workspace checklist writes only for an active owned parent", () => {
    const readPolicy = policySql(
      "deal_due_diligence_select_own",
      "public.deal_due_diligence",
    );
    expect(readPolicy).toContain("auth.uid() = user_id");
    expect(readPolicy).toContain("truecap_owns_saved_analysis(analysis_id, false)");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(
        `deal_due_diligence_${operation}_own`,
        "public.deal_due_diligence",
      );
      expect(policy).toContain("auth.uid() = user_id");
      expect(policy).toContain("truecap_owns_saved_analysis(analysis_id, true)");
      expect(policy).not.toContain("truecap_current_user_has_paid_plan");
    }
  });

  it("keeps specialist snapshot writes paid and parent-bound without broadening evaluations", () => {
    const families = [
      ["analysis_projection_snapshots", "projections"],
      ["analysis_tax_strategy_snapshots", "tax_strategy"],
      ["analysis_exit_scenario_snapshots", "exit_scenarios"],
    ] as const;

    for (const [family, feature] of families) {
      const table = `public.${family}`;
      const readPolicy = policySql(`${family}_select_own`, table);
      expect(readPolicy).toContain("auth.uid() = user_id");
      expect(readPolicy).toContain(
        "truecap_owns_saved_analysis(analysis_id, false)",
      );
      expect(readPolicy).not.toContain("truecap_current_user_has_feature");

      for (const operation of ["insert", "update", "delete"]) {
        const policy = policySql(`${family}_${operation}_own`, table);
        expect(policy).toContain("auth.uid() = user_id");
        expect(policy).toContain(
          "truecap_owns_saved_analysis(analysis_id, true)",
        );
        expect(policy).toContain(
          `truecap_current_user_has_feature('${feature}')`,
        );
        expect(policy).not.toContain("truecap_current_user_has_active_evaluation");
      }
    }
  });

  it("keeps comments Free and provider comps service-written, both tied to the real parent", () => {
    const commentsRead = policySql(
      "deal_comments_select_own",
      "public.deal_comments",
    );
    expect(commentsRead).toContain("auth.uid() = user_id");
    expect(commentsRead).toContain(
      "truecap_owns_saved_analysis(analysis_id, false)",
    );

    for (const operation of ["insert", "delete"]) {
      const policy = policySql(
        `deal_comments_${operation}_own`,
        "public.deal_comments",
      );
      expect(policy).toContain(
        "truecap_owns_saved_analysis(analysis_id, true)",
      );
      expect(policy).not.toContain("truecap_current_user_has_paid_plan");
    }

    const compsRead = policySql("deal_comps_select_own", "public.deal_comps");
    expect(compsRead).toContain("auth.uid() = user_id");
    expect(compsRead).toContain(
      "truecap_owns_saved_analysis(analysis_id, false)",
    );
    expect(migration).toContain("alter table public.deal_comps force row level security");
    for (const operation of ["insert", "update", "delete"]) {
      expect(migration).toContain(
        `drop policy if exists "deal_comps_${operation}_own" on public.deal_comps;`,
      );
      expect(migration).not.toContain(
        `create policy "deal_comps_${operation}_own" on public.deal_comps`,
      );
    }
    expect(migration).toContain(
      "revoke all on table public.deal_comps from public, anon, authenticated, service_role;",
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.deal_comps to service_role;",
    );
  });

  it("protects personal templates and versions while retaining system-template visibility", () => {
    const templatesRead = policySql(
      "analysis_templates_select_visible",
      "public.analysis_templates",
    );
    expect(templatesRead).toContain("is_system = true or auth.uid() = user_id");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(
        `analysis_templates_${operation}_own`,
        "public.analysis_templates",
      );
      expect(policy).toContain("auth.uid() = user_id");
      expect(policy).toContain("truecap_current_user_has_feature('template_manage')");
      expect(policy).toMatch(/(?:coalesce\(is_system, false\)|is_system) = false/);
    }

    for (const operation of ["select", "insert"]) {
      const policy = policySql(
        `analysis_template_versions_${operation}_own`,
        "public.analysis_template_versions",
      );
      expect(policy).toContain("auth.uid() = created_by");
      expect(policy).toContain("template.user_id = auth.uid()");
      expect(policy).toContain("template.is_system = false");
      if (operation === "insert") {
        expect(policy).toContain(
          "truecap_current_user_has_feature('template_manage')",
        );
      }
    }
  });

  it("keeps document CRUD private, owner/deal-bound, active for writes, and metadata-limited", () => {
    const pathGuard = functionSql("truecap_storage_path_is_owned_deal");
    expect(pathGuard).toContain("cardinality(parts) <> 3");
    expect(pathGuard).toContain("parts[1] <> auth.uid()::text");
    expect(pathGuard).toContain("analysis.user_id = auth.uid()");
    expect(pathGuard).toContain("not p_require_active or analysis.deleted_at is null");

    const readPolicy = policySql("deal_documents_select_own", "storage.objects");
    expect(readPolicy).toContain("bucket_id = 'deal-documents'");
    expect(readPolicy).toContain("truecap_storage_path_is_owned_deal(name, false)");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(`deal_documents_${operation}_own`, "storage.objects");
      expect(policy).toContain("bucket_id = 'deal-documents'");
      expect(policy).toContain("truecap_storage_path_is_owned_deal(name, true)");
      expect(policy).not.toContain("truecap_current_user_has_paid_plan");
    }

    for (const operation of ["insert", "update"]) {
      const policy = policySql(`deal_documents_${operation}_own`, "storage.objects");
      expect(policy).toContain("char_length(split_part(name, '/', 3)) between 1 and 160");
      expect(policy).toContain("truecap_storage_metadata_allowed");
    }
    expect(migration).toContain("'deal-documents', 'deal-documents', false, 10485760");
  });

  it("keeps the PDF cache private and strictly pdf_export-gated", () => {
    expect(migration).toContain("'analysis-pdfs', 'analysis-pdfs', false, 10485760");
    expect(migration).toContain("array['application/pdf']");
    expect(migration).toContain(
      'drop policy if exists "analysis_pdfs_public_read" on storage.objects;',
    );

    const readPolicy = policySql("analysis_pdfs_select_own", "storage.objects");
    expect(readPolicy).toContain("bucket_id = 'analysis-pdfs'");
    expect(readPolicy).toContain("truecap_storage_path_is_owned_deal(name, false)");
    expect(readPolicy).not.toContain("pdf_export");

    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(`analysis_pdfs_${operation}_own`, "storage.objects");
      expect(policy).toContain("bucket_id = 'analysis-pdfs'");
      expect(policy).toContain("truecap_storage_path_is_owned_deal(name, true)");
      expect(policy).toContain("truecap_current_user_has_feature('pdf_export')");
      expect(policy).not.toContain("truecap_current_user_has_active_evaluation");
    }
    for (const operation of ["insert", "update"]) {
      const policy = policySql(`analysis_pdfs_${operation}_own`, "storage.objects");
      expect(policy).toContain(
        "^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$",
      );
      expect(policy).toContain("truecap_storage_metadata_allowed");
    }

    const currentLeaf = buildAnalysisPdfObjectPath(
      "owner",
      "deal",
      42,
      "a".repeat(32),
      "b".repeat(64),
    ).split("/")[2];
    expect(currentLeaf).toMatch(
      /^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$/,
    );
  });

  it("keeps public brand assets owner-path-bound and custom_branding-gated for writes", () => {
    expect(migration).toContain("'branding-logos', 'branding-logos', true, 1048576");
    const publicRead = policySql(
      "Anyone can read branding logos",
      "storage.objects",
    );
    expect(publicRead).toContain("for select to public");
    expect(publicRead).toContain("bucket_id = 'branding-logos'");

    for (const policyName of [
      "Users can upload own logo",
      "Users can update own logo",
      "Users can delete own logo",
    ]) {
      const policy = policySql(policyName, "storage.objects");
      expect(policy).toContain("bucket_id = 'branding-logos'");
      expect(policy).toContain("cardinality(string_to_array(name, '/')) = 2");
      expect(policy).toContain("split_part(name, '/', 1) = auth.uid()::text");
      expect(policy).toContain("split_part(name, '/', 2) <> ''");
      expect(policy).toContain("truecap_current_user_has_feature('custom_branding')");
    }

    const metadata = functionSql("truecap_storage_metadata_allowed");
    expect(metadata).toContain("immutable");
    expect(metadata).toContain("if p_metadata is null then");
    expect(metadata).toContain("return true;");
  });

  it("matches the app's broad active-evaluation Buy Box grant without opening expired evaluations", () => {
    const evaluation = functionSql("truecap_current_user_has_active_evaluation");
    expect(evaluation).toContain("evaluation.user_id = auth.uid()");
    expect(evaluation).toContain("evaluation.expires_at > now()");

    for (const table of ["public.user_buy_box", "public.user_buy_boxes"]) {
      const prefix = table.endsWith("user_buy_box") ? "user_buy_box" : "user_buy_boxes";
      for (const operation of ["insert", "update", "delete"]) {
        const policy = policySql(`${prefix}_${operation}_own`, table);
        expect(policy).toContain("auth.uid() = user_id");
        expect(policy).toContain("truecap_current_user_has_feature('buy_box')");
        expect(policy).toContain("truecap_current_user_has_active_evaluation()");
      }
    }
  });

  it("keeps client Buy Boxes, CRM clients, and branding on their intended paid features", () => {
    const clientGuard = functionSql("truecap_enforce_buy_box_client_entitlement");
    expect(clientGuard).toContain("security definer");
    expect(clientGuard).toContain("set search_path = pg_catalog, pg_temp");
    expect(clientGuard).toContain("truecap_current_user_has_feature('client_buy_box')");
    expect(clientGuard).toContain("client.agent_user_id = new.user_id");
    expect(clientGuard).not.toContain("truecap_current_user_has_active_evaluation");
    expect(migration).toContain(
      "create trigger user_buy_boxes_00_client_entitlement_guard",
    );

    const agentRead = policySql("agent_clients_owner_select", "public.agent_clients");
    expect(agentRead).toContain("auth.uid() = agent_user_id");
    for (const operation of ["insert", "update", "delete"]) {
      const policy = policySql(
        `agent_clients_owner_${operation}`,
        "public.agent_clients",
      );
      expect(policy).toContain("auth.uid() = agent_user_id");
      expect(policy).toContain("truecap_current_user_has_feature('client_buy_box')");
    }

    const brandingRead = policySql("Users can view own branding", "public.branding");
    expect(brandingRead).toContain("auth.uid() = user_id");
    for (const verb of ["insert", "update", "delete"]) {
      const policy = policySql(
        `Users can ${verb} own branding`,
        "public.branding",
      );
      expect(policy).toContain("auth.uid() = user_id");
      expect(policy).toContain("truecap_current_user_has_feature('custom_branding')");
    }
  });

  it("allows Saved Deal Watch consent to tighten after downgrade but never to expand", () => {
    const select = policySql(
      "saved_deal_watch_subscriptions_select_own",
      "public.saved_deal_watch_subscriptions",
    );
    const insert = policySql(
      "saved_deal_watch_subscriptions_insert_own",
      "public.saved_deal_watch_subscriptions",
    );
    const update = policySql(
      "saved_deal_watch_subscriptions_update_own",
      "public.saved_deal_watch_subscriptions",
    );
    const remove = policySql(
      "saved_deal_watch_subscriptions_delete_own",
      "public.saved_deal_watch_subscriptions",
    );

    expect(select).toContain("truecap_owns_saved_analysis(saved_analysis_id, false)");
    expect(select).not.toContain("truecap_current_user_has_paid_plan");
    expect(insert).toContain("truecap_current_user_has_paid_plan");
    expect(insert).toContain("truecap_current_user_has_feature('save_deal')");
    expect(insert).toContain("truecap_owns_saved_analysis(saved_analysis_id, true)");
    expect(update).toContain("enabled = false");
    expect(update).toContain("truecap_current_user_has_paid_plan");
    expect(update).toContain("truecap_owns_saved_analysis(saved_analysis_id, false)");
    expect(update).toContain("truecap_owns_saved_analysis(saved_analysis_id, true)");
    expect(remove).toContain("truecap_owns_saved_analysis(saved_analysis_id, false)");
    expect(remove).not.toContain("truecap_current_user_has_paid_plan");

    const preferenceGuard = functionSql(
      "truecap_enforce_watch_preference_entitlement",
    );
    expect(preferenceGuard).toContain("security definer");
    expect(preferenceGuard).toContain("set search_path = pg_catalog, pg_temp");
    expect(preferenceGuard).toContain("tg_op = 'INSERT'");
    expect(preferenceGuard).toContain(
      "new.in_app_notifications_enabled and not old.in_app_notifications_enabled",
    );
    expect(preferenceGuard).toContain(
      "new.email_notifications_enabled and not old.email_notifications_enabled",
    );
    expect(preferenceGuard).not.toContain(
      "old.in_app_notifications_enabled and not new.in_app_notifications_enabled",
    );
    expect(migration).toContain(
      "create trigger saved_deal_watch_preferences_00_entitlement_guard",
    );

    for (const operation of ["select", "insert", "update", "delete"]) {
      const policy = policySql(
        `saved_deal_watch_preferences_${operation}_own`,
        "public.saved_deal_watch_preferences",
      );
      expect(policy).toContain("auth.uid() = user_id");
      expect(policy).not.toContain("truecap_current_user_has_paid_plan");
    }
  });

  it("drops every overlapping legacy policy before installing the effective policy set", () => {
    const replacedPolicies = [
      ["saved_analyses_select_own", "public.saved_analyses"],
      ["analysis_projection_snapshots_select_own", "public.analysis_projection_snapshots"],
      ["analysis_tax_strategy_snapshots_select_own", "public.analysis_tax_strategy_snapshots"],
      ["analysis_exit_scenario_snapshots_select_own", "public.analysis_exit_scenario_snapshots"],
      ["deal_due_diligence_insert_own", "public.deal_due_diligence"],
      ["deal_comments_insert_own", "public.deal_comments"],
      ["deal_comps_select_own", "public.deal_comps"],
      ["analysis_templates_select_visible", "public.analysis_templates"],
      ["analysis_template_versions_select_own", "public.analysis_template_versions"],
      ["user_buy_box_insert_own", "public.user_buy_box"],
      ["user_buy_boxes_insert_own", "public.user_buy_boxes"],
      ["agent_clients_owner_insert", "public.agent_clients"],
      ["Users can insert own branding", "public.branding"],
      ["properties_insert_own", "public.properties"],
      ["saved_deal_watch_subscriptions_insert_own", "public.saved_deal_watch_subscriptions"],
      ["saved_deal_watch_preferences_insert_own", "public.saved_deal_watch_preferences"],
      ["analysis_pdfs_select_own", "storage.objects"],
      ["deal_documents_insert_own", "storage.objects"],
      ["Anyone can read branding logos", "storage.objects"],
      ["Users can upload own logo", "storage.objects"],
    ] as const;

    for (const [name, table] of replacedPolicies) {
      const drop = `drop policy if exists "${name}" on ${table};`;
      const create = `create policy "${name}" on ${table}`;
      expect(migration, drop).toContain(drop);
      expect(migration, create).toContain(create);
      expect(migration.indexOf(drop), name).toBeLessThan(migration.indexOf(create));
    }
  });

  it("carries every production-only dependency with fixed search paths and least privilege", () => {
    for (const helper of [
      "truecap_current_effective_entitlements",
      "truecap_current_user_has_feature",
      "truecap_current_user_has_paid_plan",
      "truecap_current_user_has_active_evaluation",
      "truecap_current_saved_deal_limit",
      "truecap_is_trusted_service_context",
      "truecap_owns_saved_analysis",
      "truecap_assert_saved_deal_capacity",
      "truecap_enforce_saved_analysis_write",
      "truecap_enforce_buy_box_client_entitlement",
      "truecap_enforce_watch_preference_entitlement",
      "truecap_storage_path_is_owned_deal",
      "undo_passed_saved_deal_stage_with_history",
    ]) {
      const sql = functionSql(helper);
      expect(sql, helper).toContain("security definer");
      expect(sql, helper).toContain("set search_path = pg_catalog, pg_temp");
    }

    for (const signature of [
      "truecap_current_user_has_active_evaluation()",
      "truecap_owns_saved_analysis(uuid, boolean)",
      "truecap_storage_path_is_owned_deal(text, boolean)",
      "truecap_storage_metadata_allowed(jsonb, bigint, text[])",
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature} from public;`);
      expect(migration).toContain(`revoke all on function public.${signature} from anon;`);
    }
  });

  it("agrees with the shipped Free document/checklist product copy", () => {
    expect(read("app/pricing/page.tsx")).toContain(
      '["Due-diligence checklist + document vault", true, true]',
    );
    expect(read("components/investcalc/due-diligence-card.tsx")).toContain(
      "Free per-deal annotation (no entitlement)",
    );
  });
});
