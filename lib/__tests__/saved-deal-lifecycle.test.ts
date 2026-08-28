import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  effectiveSavedDealStage,
  isSavedDealActive,
  isSavedDealArchived,
  isSavedDealCompleted,
  persistedLifecycleForSimpleState,
} from "@/lib/saved-deal-lifecycle";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("canonical saved-deal lifecycle", () => {
  it("fails closed when either a terminal stage or its compatibility flag is present", () => {
    expect(isSavedDealCompleted({ pipeline_stage: "closed" })).toBe(true);
    expect(isSavedDealCompleted({ is_completed: true })).toBe(true);
    expect(isSavedDealArchived({ pipeline_stage: "passed" })).toBe(true);
    expect(isSavedDealArchived({ is_archived: true })).toBe(true);

    expect(isSavedDealActive({ pipeline_stage: "closed" })).toBe(false);
    expect(isSavedDealActive({ is_completed: true })).toBe(false);
    expect(isSavedDealActive({ pipeline_stage: "passed" })).toBe(false);
    expect(isSavedDealActive({ is_archived: true })).toBe(false);
  });

  it("lets owned/completed state win over a stale archived mirror", () => {
    const inconsistent = {
      pipeline_stage: "closed",
      is_completed: true,
      is_archived: true,
    };

    expect(effectiveSavedDealStage(inconsistent)).toBe("closed");
    expect(isSavedDealCompleted(inconsistent)).toBe(true);
    expect(isSavedDealArchived(inconsistent)).toBe(false);
  });

  it("accepts only genuinely active rows for bulk Archive", () => {
    expect(isSavedDealActive({ pipeline_stage: "analyzing" })).toBe(true);
    expect(isSavedDealActive({ pipeline_stage: "under_contract" })).toBe(true);
    expect(isSavedDealActive({ pipeline_stage: "passed" })).toBe(false);
    expect(isSavedDealActive({ pipeline_stage: "closed" })).toBe(false);
    expect(
      isSavedDealActive({ pipeline_stage: "analyzing", is_archived: true }),
    ).toBe(false);
    expect(
      isSavedDealActive({ pipeline_stage: "analyzing", is_completed: true }),
    ).toBe(false);
  });

  it("persists simple lifecycle transitions as one canonical stage-plus-flags write", () => {
    expect(persistedLifecycleForSimpleState("active")).toEqual({
      pipeline_stage: "analyzing",
      is_completed: false,
      is_archived: false,
    });
    expect(persistedLifecycleForSimpleState("completed")).toEqual({
      pipeline_stage: "closed",
      is_completed: true,
      is_archived: false,
    });
    expect(persistedLifecycleForSimpleState("archived")).toEqual({
      pipeline_stage: "passed",
      is_completed: false,
      is_archived: true,
    });
  });
});

describe("archived lifecycle server boundaries", () => {
  it("rejects archived reopen/update races while allowing an explicit duplicate source", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const opener = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    const saveAction = actions.slice(
      actions.indexOf("export async function saveDealAction"),
      actions.indexOf("export async function getSavedDealForEditingAction"),
    );
    const saveUpdateBoundary = saveAction.slice(
      saveAction.indexOf(
        '.eq("underwriting_revision", expectedUnderwritingRevision)',
      ),
      saveAction.indexOf("const nextUnderwritingRevision"),
    );

    expect(actions).toContain('code: "DEAL_ARCHIVED"');
    expect(actions).toContain("options?.allowArchivedSource !== true");
    expect(saveUpdateBoundary).toContain('.eq("is_archived", false)');
    expect(saveUpdateBoundary).toContain(
      '.or("pipeline_stage.is.null,pipeline_stage.neq.passed")',
    );
    expect(saveUpdateBoundary).toContain('code: "DEAL_DELETED"');
    expect(saveUpdateBoundary).toContain("isSavedDealArchived(current");
    expect(opener).toContain("allowArchivedSource: true");
  });

  it("prevalidates bulk Archive and delegates the locked lifecycle write to the Deal Log RPC", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const bulk = actions.slice(
      actions.indexOf("export async function bulkUpdateSavedDealsAction"),
    );

    expect(bulk).toContain(
      '.select("id, pipeline_stage, is_completed, is_archived")',
    );
    expect(bulk).toContain("!isSavedDealActive(row)");
    expect(bulk).toContain('validateSavedDealHistoryContext("passed", context)');
    expect(bulk).toContain(
      '"bulk_archive_saved_deals_with_history"',
    );
    expect(bulk).toContain("p_reason: parsedContext.reason");
    expect(bulk).toContain("affectedCount + skippedCount !== cleanedIds.length");
    expect(bulk).not.toContain('persistedLifecycleForSimpleState("archived")');
    expect(bulk).not.toContain('.eq("is_completed", false).eq("is_archived", false)');
    expect(bulk).not.toContain(
      "One or more deals changed status while Archive was running",
    );
  });

  it("keeps archived workspace advice terminal and removes edit/compare entry points", () => {
    const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");

    expect(workspace).toContain("const isArchivedDeal = isSavedDealArchived(dealRow)");
    expect(workspace).toContain("!isArchivedDeal &&");
    expect(workspace).toContain("Review archived deals");
    expect(workspace).toContain("{!isArchivedDeal ? (");
  });

  it("no authenticated write path sets the trigger-guarded lifecycle columns", () => {
    // migration 20260827230000 installs saved_analyses_guard_lifecycle_columns,
    // which raises 42501 when a role of authenticated/anon writes
    // pipeline_stage / is_completed / is_archived on saved_analyses directly.
    // The SECURITY DEFINER transition RPCs are the only sanctioned path, so a
    // literal assignment anywhere in a saved_analyses mutation is a latent
    // production outage that only appears after the migration lands.
    //
    // A type annotation (`pipeline_stage: string | null;`) is fine and an
    // object-literal assignment (`pipeline_stage: "analyzing",`) is not, so
    // the discriminator is the line's terminator: `;` declares, `,` writes.
    const GUARDED = ["pipeline_stage", "is_completed", "is_archived"];
    const assignments = (source: string) =>
      source
        .split("\n")
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(
          ({ line }) =>
            GUARDED.some((key) => line.startsWith(`${key}:`)) &&
            !line.endsWith(";"),
        )
        .map(({ line, n }) => `${n}: ${line}`);

    expect(assignments(read("app/actions/scenarios.ts"))).toEqual([]);
    expect(assignments(read("app/actions/saved-analyses.ts"))).toEqual([]);

    // The sanctioned path is still wired.
    expect(read("app/actions/saved-analyses.ts")).toContain(
      "persistSavedDealStageWithHistory",
    );
  });

  it("starts every cloned scenario active without mutating the source lifecycle", () => {
    const scenarios = read("app/actions/scenarios.ts");
    const cloneBoundary = scenarios.slice(
      scenarios.indexOf("const clone: Record<string, unknown> = { ...deal }"),
      scenarios.indexOf("clone.pdf_url = null"),
    );

    // The clone must OMIT the lifecycle columns, not set them. `clone` is a
    // full spread of a select("*") row, so all three arrive from the source
    // and have to be deleted; re-setting them to "active" would make the
    // INSERT carry a non-null pipeline_stage, which the
    // saved_analyses_guard_lifecycle_columns trigger rejects with 42501 once
    // migration 20260827230000 is applied. Column defaults give the same
    // semantics (NULL stage reads as DEFAULT_PIPELINE_STAGE).
    expect(cloneBoundary).toContain("delete clone.pipeline_stage;");
    expect(cloneBoundary).toContain("delete clone.is_completed;");
    expect(cloneBoundary).toContain("delete clone.is_archived;");
    expect(cloneBoundary).not.toContain("persistedLifecycleForSimpleState");
    expect(cloneBoundary).toContain(
      'if ("close_date" in clone) clone.close_date = null',
    );
    expect(cloneBoundary).not.toContain("isSavedDealArchived");
    expect(cloneBoundary).not.toContain("Object.assign(deal,");
  });
});
