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

    expect(actions).toContain('code: "DEAL_ARCHIVED"');
    expect(actions).toContain("options?.allowArchivedSource !== true");
    expect(actions).toContain('.eq("is_archived", false)');
    expect(opener).toContain("allowArchivedSource: true");
  });

  it("prevalidates bulk Archive and writes canonical lifecycle fields", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const bulk = actions.slice(
      actions.indexOf("export async function bulkUpdateSavedDealsAction"),
    );

    expect(bulk).toContain(
      '.select("id, pipeline_stage, is_completed, is_archived")',
    );
    expect(bulk).toContain("!isSavedDealActive(row)");
    expect(bulk).toContain('persistedLifecycleForSimpleState("archived")');
    expect(bulk).toContain('.eq("is_completed", false).eq("is_archived", false)');
    expect(bulk).toContain(
      "skippedCount: cleanedIds.length - affectedCount",
    );
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

  it("starts every cloned scenario active without mutating the source lifecycle", () => {
    const scenarios = read("app/actions/scenarios.ts");
    const cloneBoundary = scenarios.slice(
      scenarios.indexOf("const clone: Record<string, unknown> = { ...deal }"),
      scenarios.indexOf("clone.pdf_url = null"),
    );

    expect(cloneBoundary).toContain(
      'Object.assign(clone, persistedLifecycleForSimpleState("active"))',
    );
    expect(cloneBoundary).toContain(
      'if ("close_date" in clone) clone.close_date = null',
    );
    expect(cloneBoundary).not.toContain("isSavedDealArchived");
    expect(cloneBoundary).not.toContain("Object.assign(deal,");
  });
});
