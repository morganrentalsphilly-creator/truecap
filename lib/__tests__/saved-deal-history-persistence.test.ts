import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const migration = read(
  "supabase/migrations/20260827230000_saved_deal_history.sql",
);
const actions = read("app/actions/saved-analyses.ts");
const stageSelect = read("components/investcalc/deal-stage-select.tsx");
const dealList = read("components/investcalc/saved-analyses-page-v2.tsx");
const timeline = read("components/investcalc/deal-history-timeline.tsx");
const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");

describe("saved deal history persistence", () => {
  it("creates an owned append-only transition ledger with decision context", () => {
    expect(migration).toContain(
      "create table if not exists public.saved_deal_history_events",
    );
    for (const column of [
      "saved_analysis_id uuid not null",
      "user_id uuid not null",
      "actor_user_id uuid not null",
      "old_stage text",
      "new_stage text not null",
      "decision_status text not null",
      "reason text",
      "note text",
      "occurred_at timestamptz not null",
      "created_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("references public.saved_analyses(id, user_id)");
    expect(migration).toContain("check (actor_user_id = user_id)");
    expect(migration).toContain("check (new_stage <> 'passed' or reason is not null)");
  });

  it("allows owners to select history but exposes no direct mutation policy", () => {
    expect(migration).toContain(
      "alter table public.saved_deal_history_events enable row level security",
    );
    expect(migration).toMatch(
      /create policy saved_deal_history_events_select_own[\s\S]*for select[\s\S]*using \(auth\.uid\(\) = user_id\)/,
    );
    expect(migration).not.toMatch(
      /create policy saved_deal_history_events_(?:insert|update|delete)_own/,
    );
    expect(migration).toContain(
      "revoke all on table public.saved_deal_history_events from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select on table public.saved_deal_history_events to authenticated",
    );
  });

  it("locks ownership and atomically writes the stage plus one history event", () => {
    expect(migration).toContain(
      "public.update_saved_deal_stage_with_history",
    );
    expect(migration).toMatch(
      /security definer[\s\S]*set search_path = public, pg_temp/,
    );
    expect(migration).toContain("v_actor_user_id uuid := auth.uid()");
    expect(migration).toContain("deal.user_id = v_actor_user_id");
    expect(migration).toContain("for update;");
    expect(migration).toContain("update public.saved_analyses");
    expect(migration).toContain(
      "insert into public.saved_deal_history_events",
    );
    expect(migration).toContain(
      "if p_new_stage = 'passed' and v_reason is null then",
    );
    expect(migration).toContain(
      "when p_new_stage in ('offer', 'under_contract', 'closed') then 'pursue'",
    );
    expect(migration).toContain(
      "when p_new_stage = 'negotiating' then 'negotiate'",
    );
    expect(migration).toContain(
      "when p_new_stage = 'passed' then 'pass'",
    );
    const replayGuard = migration.indexOf(
      "if v_previous_stage = p_new_stage then",
    );
    const eventInsert = migration.indexOf(
      "insert into public.saved_deal_history_events",
    );
    expect(replayGuard).toBeGreaterThan(-1);
    expect(eventInsert).toBeGreaterThan(replayGuard);
    expect(migration.slice(replayGuard, eventInsert)).toContain("null::uuid");
    expect(migration).toContain("from public, anon;");
    expect(migration).toContain("to authenticated;");
  });

  it("enforces pipeline entitlement in the database and blocks direct lifecycle writes", () => {
    expect(migration).toContain(
      "create or replace function public.guard_saved_deal_lifecycle_columns()",
    );
    expect(migration).toContain(
      "before insert or update of pipeline_stage, is_completed, is_archived",
    );
    expect(migration).toContain(
      "Saved-deal lifecycle must be changed through its authorized transition endpoint.",
    );
    expect(migration).toMatch(
      /from public\.subscriptions as subscription[\s\S]*join public\.plans as plan[\s\S]*subscription\.status in \('active', 'trialing', 'past_due'\)[\s\S]*plan\.entitlements -> 'features'[\s\S]*\? 'pipeline'/,
    );
    expect(migration).toContain("Pipeline entitlement required.");
    expect(migration).toContain(
      "revoke all on function public.guard_saved_deal_lifecycle_columns()",
    );
  });

  it("routes both individual status controls through the atomic RPC", () => {
    expect(actions).toContain('"update_saved_deal_stage_with_history"');
    expect(actions).toContain("persistSavedDealStageWithHistory({");
    const lifecycle = actions.slice(
      actions.indexOf("export async function updateSavedDealLifecycleStateAction"),
      actions.indexOf("export async function updateSavedDealStageAction"),
    );
    const stage = actions.slice(
      actions.indexOf("export async function updateSavedDealStageAction"),
      actions.indexOf("export type SetCloseDateResult"),
    );
    expect(lifecycle).toContain("persistSavedDealStageWithHistory({");
    expect(stage).toContain("persistSavedDealStageWithHistory({");
    expect(lifecycle).not.toContain('.from("saved_analyses")');
    expect(stage).not.toContain('.from("saved_analyses")');
    expect(actions).toContain('code: "MIGRATION_PENDING"');
    expect(actions).toContain(
      'message: "Add a reason before marking this deal as Passed."',
    );
  });

  it("archives a selected set atomically with one reasoned event per changed deal", () => {
    expect(migration).toContain(
      "public.bulk_archive_saved_deals_with_history",
    );
    const bulkRpc = migration.slice(
      migration.indexOf("create or replace function public.bulk_archive_saved_deals_with_history"),
    );
    expect(bulkRpc).toContain("security definer");
    expect(bulkRpc).toContain("subscription.status in ('active', 'trialing', 'past_due')");
    expect(bulkRpc).toContain("? 'pipeline'");
    expect(bulkRpc).toContain("for update of deal");
    expect(bulkRpc).toContain("or v_deal.previous_stage in ('closed', 'passed')");
    expect(bulkRpc).toContain("update public.saved_analyses");
    expect(bulkRpc).toContain("insert into public.saved_deal_history_events");
    expect(bulkRpc).toContain("v_deal.previous_stage");
    expect(bulkRpc).toContain("'passed'");
    expect(bulkRpc).toContain("'pass'");
    expect(bulkRpc).toContain("v_reason");
    expect(bulkRpc).toContain(
      "grant execute on function public.bulk_archive_saved_deals_with_history(uuid[], text, text)",
    );

    const bulkAction = actions.slice(
      actions.indexOf("export async function bulkUpdateSavedDealsAction"),
    );
    expect(bulkAction).toContain(
      'validateSavedDealHistoryContext("passed", context)',
    );
    expect(bulkAction).toContain(
      '"bulk_archive_saved_deals_with_history"',
    );
    expect(bulkAction).toContain("p_reason: parsedContext.reason");
    expect(bulkAction).not.toContain(
      'persistedLifecycleForSimpleState("archived")',
    );
  });
});

describe("saved deal history UI", () => {
  it("collects a non-empty Pass reason before either individual write", () => {
    for (const source of [stageSelect, dealList]) {
      const prompt = source.indexOf("promptForPipelinePassReason({");
      const write = source.indexOf("updateSavedDealStageAction(");
      expect(prompt).toBeGreaterThan(-1);
      expect(write).toBeGreaterThan(prompt);
      expect(source).toContain('title: "Pass reason required"');
      expect(source).toContain("reason ? { reason } : undefined");
    }
    expect(dealList).toContain("updateSavedDealLifecycleStateAction(");
  });

  it("collects one Pass reason before the bulk archive write", () => {
    const handler = dealList.slice(
      dealList.indexOf("const handleBulkArchive"),
      dealList.indexOf("const handleBulkDelete"),
    );
    expect(handler).toContain("promptForPipelinePassReason({");
    expect(handler).toContain('nextStage: "passed"');
    expect(handler).toContain('title: "Pass reason required"');
    expect(handler).toContain(
      'bulkUpdateSavedDealsAction(\n          selectedIds,\n          "archive",\n          { reason },',
    );
  });

  it("shows an owner-scoped newest-first timeline in the deal workspace", () => {
    expect(workspace).toContain('.from("saved_deal_history_events")');
    expect(workspace).toContain('.eq("user_id", userId)');
    expect(workspace).toContain(
      '.order("occurred_at", { ascending: false })',
    );
    expect(workspace).toContain("<DealHistoryTimeline");
    expect(timeline).toContain("Deal Log");
    expect(timeline).toContain("Stage and decision history");
    expect(timeline).toContain("Reason:");
    expect(timeline).toContain("Decision:");
    expect(timeline).toContain("dealHistoryStageLabel");
  });
});
