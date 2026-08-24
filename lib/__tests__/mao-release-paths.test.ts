import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("MAO release-path safety", () => {
  it("never solves or displays a numeric live-preview offer for Free", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const preview = read("components/investcalc/live-verdict-panel.tsx");

    expect(calculator).not.toContain("calculateMaxAllowableOffer(");
    expect(calculator).toContain("const breakEven = null");
    expect(preview).toContain("Negative at these assumptions.");
    expect(preview).toContain("livePreview.breakEvenPrice != null");
  });

  it("disables new Pack checkout while preserving exact-target paid recovery", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const action = read("app/actions/one-time-pdf.ts");
    const capture = calculator.indexOf("const requestedMaoTarget = normalizeMaoTarget(maoTarget)");
    const purchaseGate = calculator.indexOf("setIsPdfPurchaseDialogOpen(true)", capture);
    const actionStart = action.indexOf("export async function createOneTimePdfCheckoutAction");
    const shutdownGate = action.indexOf("if (!decisionPackCheckoutEnabled())", actionStart);
    const validation = action.indexOf("createCheckoutSchema.safeParse", actionStart);
    const stripe = action.indexOf("const stripe = getStripe()", actionStart);

    expect(capture).toBeGreaterThan(-1);
    expect(purchaseGate).toBeGreaterThan(capture);
    expect(calculator).not.toContain("createOneTimePdfCheckoutAction");
    expect(calculator).not.toContain("handleBuyOneTimePdf");
    expect(calculator).not.toContain("checkoutMaoTarget");
    expect(shutdownGate).toBeGreaterThan(actionStart);
    expect(shutdownGate).toBeLessThan(validation);
    expect(shutdownGate).toBeLessThan(stripe);
    expect(action.slice(shutdownGate, validation)).toContain('code: "FEATURE_DISABLED"');
    expect(calculator).toContain("const restoredDraft = parseOneTimePdfDraft(draftRaw)");
    expect(calculator).toContain("restoredMaoTarget = restoredDraft.target");
    expect(calculator).toContain("restoredMaoTargetSource = restoredDraft.source");
    expect(calculator).toContain("maxOfferTarget: restoredMaoTarget");
    expect(calculator).toContain("maxOfferTargetSource: restoredMaoTargetSource");
    expect(calculator).toContain("analysisMaoTargetRef.current = restoredMaoTarget");
    expect(calculator).toContain("setAnalysisMaoTarget(restoredMaoTarget)");
    expect(calculator).toContain(
      "setAnalysisMaoTargetSource(restoredMaoTargetSource)"
    );
  });

  it("carries selected targets into both saved and in-flow assumption forks", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");

    expect(calculator).toContain("maxOfferTarget?: unknown");
    expect(calculator).toContain("normalizeMaoTarget(parsed.maxOfferTarget)");
    expect(calculator).toContain(
      "const carriedMaoTarget = normalizeMaoTarget(analysisMaoTargetRef.current)"
    );
    expect(calculator).toContain("analysisMaoTargetRef.current = carriedMaoTarget");
    expect(calculator).toContain(
      "duplicatedMaoTargetSource"
    );
    expect(calculator).toContain(
      "carriedMaoTargetSource"
    );
    expect(calculator).toContain(
      "setAnalysisMaoTargetSource(carriedMaoTargetSource)"
    );
  });

  it("rebinds the active target whenever an unsaved draft evolves", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const watcherStart = calculator.indexOf("Auto-save draft for anonymous / walk-in users");
    const watcherEnd = calculator.indexOf(
      "Initialize from a one-time saved-analysis handoff",
      watcherStart
    );
    const watcher = calculator.slice(watcherStart, watcherEnd);

    expect(calculator).toContain("function writeCalcDraftWithMaoTarget(");
    expect(calculator).toContain(
      "const normalizedDraft = normalizeInvestmentFormDraft(values)"
    );
    expect(calculator).toContain(
      "maoTargetAnalysisFingerprint(normalizedDraft ?? values)"
    );
    expect(watcher).toContain(
      "analysisMaoTargetRef.current,\n          analysisMaoTargetSource"
    );
  });

  it("preserves the normalized acquisition target when a strategy scenario recomputes", () => {
    const scenarios = read("app/actions/scenarios.ts");
    const recomputeStart = scenarios.indexOf("if (strategyKind) {");
    const recomputeEnd = scenarios.indexOf("const { data: inserted", recomputeStart);
    const recompute = scenarios.slice(recomputeStart, recomputeEnd);

    expect(recompute).toContain(
      "normalizeMaoTarget(deal.result_snapshot?.maxOfferTarget)"
    );
    expect(recompute).toContain(
      "recomputedResultSnapshot.maxOfferTarget = sourceMaoTarget"
    );
    expect(recompute).toContain("clone.result_snapshot = recomputedResultSnapshot");
    expect(recompute).not.toContain(
      "clone.result_snapshot = result as unknown as Record<string, unknown>"
    );
  });
});
