import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Buy Box target resolution fails closed", () => {
  it("blocks live Save, Share, and PDF until the account criteria resolve", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const card = read("components/investcalc/buy-box-verdict-card.tsx");

    expect(card).toContain('if (!result.ok) {');
    expect(card).toContain('onLoadStateChange?.("error")');
    expect(dashboard).toContain("const effectiveBuyBoxTargetResolutionState");
    expect(dashboard).toContain(
      'const targetActionsBlocked = effectiveBuyBoxTargetResolutionState !== "ready"'
    );
    expect(dashboard).toContain("if (targetActionsBlocked || isSaveLockedByPlan) return;");
    expect(dashboard).toContain("disabled={targetActionsBlocked}");
    // Account criteria stay valid across address edits; readiness must not be
    // reset by an address without a matching refetch.
    const readinessBlock = dashboard.slice(
      dashboard.indexOf("const requiresBuyBoxTargetResolution"),
      dashboard.indexOf("const [compsQaData")
    );
    expect(readinessBlock).not.toContain("values?.address");
  });

  it("never substitutes defaults on paid saved-deal surfaces after a box lookup failure", () => {
    const home = read("app/dashboard/page.tsx");
    const list = read("app/dashboard/saved-analyses/page.tsx");
    const detail = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const compare = read("app/dashboard/compare/page.tsx");

    expect(home).toContain("if (!persistedMaoTarget && !buyBoxesResolved) continue;");
    expect(list).toContain("if (!persistedMaoTarget && !buyBoxesResolved) return null;");
    expect(detail).toContain("(storedMaoTarget != null || buyBoxesResolved)");
    expect(compare).toContain("(persistedMaoTarget != null || buyBoxesResolved)");
  });

  it("makes unresolved or box-bearing rendered PDFs uncacheable", () => {
    const action = read("app/actions/saved-analyses.ts");
    const generator = read("lib/pdf-generator.ts");
    const server = read("app/actions/generate-report-pdf.ts");

    expect(generator).toContain("hasBuyBoxVerdict: buyBoxVerdict !== null");
    expect(server).toContain("hasBuyBoxVerdict: artifact.hasBuyBoxVerdict");
    expect(action).toContain("renderedWithBuyBoxVerdict ||");
    expect(action).toContain("!buyBoxStateResolved ||");
    expect(action).toContain("hasUsableBuyBox !== false ||");
    expect(action).toContain("if (hasUsableBuyBox === false) {");
  });
});
