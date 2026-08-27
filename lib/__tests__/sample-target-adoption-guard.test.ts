import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Locked product decision: example targets are never auto-adopted as "your
 * targets." The synthetic sample seeds its fixture targets as adopted for the
 * demo run ONLY — this suite pins every path where that seeding could leak
 * onto the user's own deal (the live P1: load sample → Edit assumptions →
 * re-run showed "Under your selected targets" with rules the user never
 * adopted).
 */

const root = process.cwd();
const calculator = readFileSync(
  join(root, "components/investcalc/investcalc-page.tsx"),
  "utf8",
);
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

function sourceSection(startMarker: string, endMarker: string): string {
  const start = calculator.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(
    0,
  );
  const end = calculator.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return calculator.slice(start, end);
}

describe("sample-seeded targets never survive as user adoption", () => {
  it("arms the sample-seeded flag at both sample launch sites", () => {
    const launch = sourceSection(
      "const handleTrySampleDeal = () =>",
      "requestAnimationFrame(() =>",
    );
    expect(launch).toContain("sampleSeededMaoTargetRef.current = true");
    // Double-tap guard: a second click while the first sample submit is
    // still deferred must not fire a non-sample submit that consumes the
    // one-shot preview/target state.
    expect(launch).toContain("if (pendingSampleRunRef.current) return;");

    const submitConsume = sourceSection(
      "const isSampleRun = pendingSampleRunRef.current;",
      'trackEvent("analyzer_started"',
    );
    expect(submitConsume).toContain("sampleSeededMaoTargetRef.current = true");
  });

  it("clears sample-seeded adoption on the first non-sample submit", () => {
    const submitConsume = sourceSection(
      "const isSampleRun = pendingSampleRunRef.current;",
      'trackEvent("analyzer_started"',
    );
    expect(submitConsume).toContain(
      "} else if (sampleSeededMaoTargetRef.current) {",
    );
    expect(submitConsume).toContain("setAnalysisMaoTarget(null)");
    expect(submitConsume).toContain(
      'setAnalysisMaoTargetSource("screening-defaults")',
    );
    expect(submitConsume).toContain("clearPendingMaoTarget()");
  });

  it("clears sample-seeded adoption when the live recompute grades edited values", () => {
    const recompute = sourceSection(
      "// Editing away from the sample deal ends the Pro preview",
      "setSavedMethodologyLabel(null)",
    );
    expect(recompute).toContain("if (sampleSeededMaoTargetRef.current) {");
    expect(recompute).toContain("setAnalysisMaoTarget(null)");
    expect(recompute).toContain(
      'setAnalysisMaoTargetSource("screening-defaults")',
    );
  });

  it("keeps sample-seeded adoption out of the anonymous draft", () => {
    const draftWatcher = sourceSection(
      "* Auto-save draft for anonymous / walk-in users.",
      "}, CALC_FORM_DRAFT_DEBOUNCE_MS);",
    );
    expect(draftWatcher).toContain(
      "const sampleSeeded = sampleSeededMaoTargetRef.current",
    );
    expect(draftWatcher).toContain(
      "sampleSeeded ? null : analysisMaoTargetRef.current",
    );
    expect(draftWatcher).toContain(
      'sampleSeeded ? "screening-defaults" : analysisMaoTargetSource',
    );
  });

  it("keeps sample-seeded adoption out of saved deals and the pre-auth handoff", () => {
    const save = sourceSection(
      "const performSaveDeal = async (",
      "const handleSaveDeal = async (",
    );
    // The flag is captured, then the live state converges to the persisted
    // screening-defaults row — otherwise isMaoTargetDirty pins an
    // un-clearable "Unsaved changes" after saving the demo.
    expect(save).toContain(
      "const sampleSeededTarget = sampleSeededMaoTargetRef.current",
    );
    expect(save).toContain("if (sampleSeededTarget) {");
    expect(save).toContain(
      "!sampleSeededTarget &&\n        isAdoptedOfferCeilingTargetSource(candidateMaxOfferTargetSource)",
    );

    const auth = sourceSection(
      "onPrepareAuthSave={(",
      "onEditAssumptions={() => {",
    );
    expect(normalizeSource(auth)).toContain(
      normalizeSource(
        "!sampleSeededMaoTargetRef.current && normalizedSource &&",
      ),
    );
  });

  it("never restores the synthetic demo as the investor's next draft", () => {
    expect(normalizeSource(calculator)).toContain(
      normalizeSource("sampleSeededMaoTargetRef.current)"),
    );
    expect(calculator).toContain("const isSyntheticSampleDraft =");
    expect(calculator).toContain("const matchesSyntheticSampleDraft =");
    expect(calculator).toContain("clearCalcDraftRaw();");
    expect(calculator).toContain(
      "A synthetic sample must never become the default starting",
    );
    expect(calculator).toContain(
      "isTrueCapSyntheticSampleAddress(normalized.address)",
    );
    expect(calculator).toContain(
      "restoredAnalyzerStrategyKey === SAMPLE_DEAL_FIXTURE.strategyKey",
    );
    expect(
      calculator.indexOf("const restoredAnalyzerStrategyKey ="),
    ).toBeLessThan(calculator.indexOf("const isSyntheticSampleDraft ="));
    expect(calculator).toContain("!resumesPendingSaveAfterAuth");
    expect(calculator).toContain("!resumesPendingShareAfterAuth");
    expect(calculator).not.toContain("pendingTargetMatchesSample");
    expect(calculator).not.toContain(
      "normalized.purchasePrice === sampleValues.purchasePrice",
    );
  });

  it("cannot use sample criteria to satisfy a later Offer Ceiling run", () => {
    const submitGate = sourceSection(
      "const runPromisesOfferCeiling = analysisRunPromisesOfferCeiling",
      "// Warm the dynamic AnalysisDashboard chunk",
    );
    expect(submitGate).toContain("sampleSeededMaoTargetRef.current");
    expect(submitGate).toContain("!isPendingSampleRun &&");

    const visibleGate = sourceSection(
      "const hasAdoptedAnalysisTarget = Boolean(",
      "const proposedPreRunTarget =",
    );
    expect(visibleGate).toContain("!sampleSeededMaoTargetRef.current");
    expect(visibleGate).not.toContain("!isEditingAssumptions");

    const recompute = sourceSection(
      "recomputeOutputsFromFormRef.current = () =>",
      "const baseline = lastComputedFormJsonRef.current",
    );
    expect(recompute).toContain("if (pendingSampleRunRef.current) return");
  });

  it("resumes an already-requested Save or Share without a new criteria dead end", () => {
    const restore = sourceSection(
      "const resumesPendingSaveAfterAuth =",
      "// Don't auto-calculate - restoring inputs is the contract",
    );
    expect(restore).toContain("if (matchesSyntheticSampleDraft) {");
    expect(restore).toContain("pendingSampleRunRef.current = true");
    expect(restore).toContain("explicitTargetlessRunRef.current = true");
    expect(restore.match(/pendingSampleRunRef\.current = true/g)?.length).toBe(
      2,
    );
    expect(
      restore.match(/explicitTargetlessRunRef\.current = true/g)?.length,
    ).toBe(2);
  });

  it("re-resolves criteria for every in-flow next deal", () => {
    const fork = sourceSection(
      "const handleAnalyzeAnotherLikeThis = () =>",
      "forkGenerationRef.current += 1",
    );
    expect(fork).toContain("const carriedMaoTarget = null");
    expect(fork).toContain("const carriedDecisionBasis = null");
    expect(fork).toContain("setPreRunCriteriaChoice(null)");
    expect(fork).toContain("sampleSeededMaoTargetRef.current = false");
  });

  it("disarms the flag on explicit adoption, reset, and paid-claim restore", () => {
    const explicitEdit = sourceSection(
      "const handleAnalysisMaoTargetChange = useCallback(",
      "setRecordedOfferCeiling(invalidateRecordedOfferCeilingForTargetEdit)",
    );
    expect(explicitEdit).toContain("sampleSeededMaoTargetRef.current = false");

    const clearOutputs = sourceSection(
      "const clearAnalysisOutputs = useCallback(",
      "setIsEditingAssumptions(false)",
    );
    expect(clearOutputs).toContain("sampleSeededMaoTargetRef.current = false");

    const paidRestore = sourceSection(
      "analysisMaoTargetRef.current = restoredMaoTarget;",
      "autoExportPdfRef.current = true",
    );
    expect(paidRestore).toContain("sampleSeededMaoTargetRef.current = false");
  });
});
