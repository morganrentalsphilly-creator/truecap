import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("Buy Box target resolution fails closed", () => {
  it("blocks while resolving, then permits base persistence without a Buy Box claim after failure", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const card = read("components/investcalc/buy-box-verdict-card.tsx");

    expect(card).toContain("if (!result.ok) {");
    expect(card).toContain('onLoadStateChange?.("error")');
    expect(dashboard).toContain("const effectiveBuyBoxTargetResolutionState");
    expect(dashboard).toContain(
      'effectiveBuyBoxTargetResolutionState === "loading"',
    );
    expect(dashboard).toContain("buyBoxResolutionUnavailable");
    expect(dashboard).toContain(
      "Save, share, and export remain available, but no Buy Box fit or Buy Box-backed Offer Ceiling is being claimed.",
    );
    expect(dashboard).toContain(
      "const adoptedMaoTarget = targetAdopted",
    );
    // The two guards split so the plan-lock branch can EXPLAIN itself (toast
    // with an upgrade path) instead of a silent disabled button — but both
    // still return before onSaveDeal, so the fail-closed contract holds.
    expect(dashboard).toContain("if (resultActionsBlocked) return;");
    const saveClick = dashboard.slice(
      dashboard.indexOf("const handleSaveClick = () => {"),
      dashboard.indexOf("const handleExportPdf = ("),
    );
    const lockedBranch = saveClick.indexOf("if (isSaveLockedByPlan) {");
    const lockedReturn = saveClick.indexOf("return;", lockedBranch);
    const saveCall = saveClick.indexOf("void onSaveDeal(");
    expect(lockedBranch).toBeGreaterThanOrEqual(0);
    expect(lockedReturn).toBeGreaterThan(lockedBranch);
    expect(saveCall).toBeGreaterThan(lockedReturn);
    expect(dashboard).toContain("disabled={targetActionsBlocked}");
    // Account criteria stay valid across address edits; readiness must not be
    // reset by an address without a matching refetch.
    const readinessBlock = dashboard.slice(
      dashboard.indexOf("const requiresBuyBoxTargetResolution"),
      dashboard.indexOf("const [compsQaData"),
    );
    expect(readinessBlock).not.toContain("values?.address");
    expect(readinessBlock).toContain(
      'state: "loading" | "ready" | "error";',
    );
    expect(readinessBlock).toContain(
      'state: isAuthenticated ? "loading" : "ready"',
    );
    expect(readinessBlock).toContain(
      "}, [activeBuyBoxStrategyKey, isAuthenticated]);",
    );
    expect(readinessBlock).not.toContain(
      'requiresBuyBoxTargetResolution ? "loading" : "ready"',
    );
  });

  it("never substitutes defaults on paid saved-deal surfaces after a box lookup failure", () => {
    const home = read("app/dashboard/page.tsx");
    const list = read("app/dashboard/saved-analyses/page.tsx");
    const detail = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const compare = read("app/dashboard/compare/page.tsx");

    expect(home).toContain(
      "if (!persistedMaoTarget && !buyBoxesResolved) continue;",
    );
    expect(list).toContain(
      "if (!persistedMaoTarget && !buyBoxesResolved) return null;",
    );
    expect(detail).toContain("(storedMaoTarget != null || buyBoxesResolved)");
    expect(compare).toContain(
      "(persistedMaoTarget != null || buyBoxesResolved)",
    );
  });

  it("never reuses a retained PDF as a current Buy Box export", () => {
    const action = read("app/actions/saved-analyses.ts");
    const generator = read("lib/pdf-generator.ts");
    const server = read("app/actions/generate-report-pdf.ts");

    expect(generator).toContain("hasBuyBoxVerdict: buyBoxVerdict !== null");
    expect(server).toContain("hasBuyBoxVerdict: artifact.hasBuyBoxVerdict");
    expect(action).toContain(
      "Active subscribers always receive a fresh server render",
    );
    expect(action).toContain("readVerifiedSavedAnalysisPdfArtifact({");
    expect(action).not.toContain("if (hasUsableBuyBox === false) {");
  });
});
