import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("evidence workflow usability guards", () => {
  it("keeps HUD FMR framed as an area screening benchmark", () => {
    const source = read("components/investcalc/deal-driver-insight.tsx");

    expect(source).toContain("screening reference, not property-specific evidence");
    expect(source).toContain("HUD is not a");
    expect(source).toContain("property-specific rent estimate");
    expect(source).toContain("current comparable leases");
    expect(source).not.toContain("a good sign it&apos;s achievable");
    expect(source).not.toContain("you may be leaving upside on the table");
  });

  it("reflows due-diligence row controls below the small breakpoint", () => {
    const source = read("components/investcalc/due-diligence-card.tsx");

    expect(source).toContain(
      "grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
    );
    expect(source).toContain(
      "col-span-2 col-start-2 row-start-2 h-11 w-full min-w-0",
    );
    expect(source).toContain(
      "sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:w-[9.5rem]",
    );
    expect(source).toContain(
      "col-start-3 row-start-1 inline-flex size-11",
    );
    expect(source).toContain("whitespace-normal break-words");
  });

  it("deep-links actionable dashboard deadlines to the checklist", () => {
    const source = read("components/dashboard/due-this-week-card.tsx");

    expect(source).toContain(
      "href={`/dashboard/saved-analyses/${row.dealId}#deal-due-diligence`}",
    );
  });

  it("does not let unapplied criteria leak through another result action", () => {
    const source = read(
      "components/investcalc/focused-decision-summary.tsx",
    );

    expect(source).toContain(
      "Apply or cancel the criteria edits before taking another action.",
    );
    expect(source).toMatch(
      /onClick=\{onEditAssumptions\}[\s\S]*?disabled=\{resultActionsBlocked\}/,
    );
    expect(source).toMatch(
      /onClick=\{onAnalyzeAnotherLikeThis\}[\s\S]*?disabled=\{resultActionsBlocked\}/,
    );
    expect(source).toMatch(
      /resultActionsBlocked \? \([\s\S]*?Deal workspace/,
    );
    expect(source).toMatch(
      /onClick=\{\(\) => void onNewAnalysis\(\)\}[\s\S]*?disabled=\{resultActionsBlocked\}/,
    );
    expect(source).toMatch(
      /onClick=\{onUpgrade\}[\s\S]*?disabled=\{resultActionsBlocked\}[\s\S]*?Compare with Pro/,
    );
    expect(source).toMatch(
      /targetDraftBlocksActions \? \([\s\S]*?aria-disabled="true"[\s\S]*?Buy Box/,
    );
  });

  it("blocks the sibling review-package export while criteria are only a draft", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const packageCard = read(
      "components/investcalc/prepare-offer-card.tsx",
    );

    expect(dashboard).toContain(
      "const resultActionsBlocked =\n    targetActionsBlocked || targetDraftActionsBlocked",
    );
    expect(dashboard).toContain("if (resultActionsBlocked) return;");
    expect(dashboard).toContain("actionsBlocked={resultActionsBlocked}");
    expect(packageCard).toContain("disabled={isPreparing || actionsBlocked}");
    expect(packageCard).toContain('role="status"');
  });

  it("bubbles criteria drafts into reload, shell-navigation, and reset guards", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const page = read("components/investcalc/investcalc-page.tsx");

    expect(dashboard).toContain(
      "onTargetDraftBlockingChange?.(targetDraftActionsBlocked)",
    );
    expect(page).toContain(
      "onTargetDraftBlockingChange={setHasUnappliedTargetDraft}",
    );
    expect(page).toContain(
      "const hasPendingDealChanges =\n    hasUnsavedChanges || hasUnappliedTargetDraft",
    );
    expect(page).toContain(
      "hasUnappliedTargetDraft ||\n      (isAuthenticated && Boolean(savedDealId) && hasUnsavedChanges)",
    );
    expect(page).toContain(
      "const shouldConfirm =\n      hasPendingDealChanges ||",
    );
  });

  it("keeps offer checks independent from saving and the workspace checklist", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const evidence = read("components/investcalc/input-confidence-card.tsx");

    expect(dashboard).not.toContain("isCurrentAnalysisSaved={isSaved}");
    expect(evidence).not.toContain("onSaveForVerification");
    expect(evidence).not.toContain("Save to use checklist");
    expect(evidence).not.toContain("Open deal checklist");
  });
});
