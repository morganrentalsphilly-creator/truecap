import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("active Max Offer target continuity", () => {
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("passes the exact target rendered by the dashboard into every primary callback", () => {
    expect(dashboard).toContain(
      "onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource)"
    );
    expect(dashboard).toContain(
      "void onSaveDeal(adoptedMaoTarget, adoptedMaoTargetSource)"
    );
    expect(dashboard).toContain("adoptedMaoTarget,");
    expect(dashboard).toContain("adoptedMaoTargetSource\n    );");
    expect(dashboard).toContain('handleExportPdf("personal")');
    expect(dashboard).toContain("onClick={() => handleExportPdf()}");
    expect(dashboard).toContain("onClick={() => handleExportPdf(m.id)}");
    expect(dashboard).toContain("handleExportPdf(m.id);");
    expect(dashboard).toContain("maoTarget={adoptedMaoTarget}");
  });

  it("gives an explicit Save target precedence and persists that same snapshot", () => {
    const save = sourceSection(
      calculator,
      "const performSaveDeal = async (",
      "const handleSaveDeal = async ("
    );
    const explicit = save.indexOf("normalizeMaoTarget(options.maxOfferTargetOverride)");
    const live = save.indexOf("analysisMaoTargetRef.current", explicit);
    const pending = save.indexOf("pendingMaoBinding?.target", live);

    expect(save).toContain("const analysisFingerprint = maoTargetAnalysisFingerprint(currentValues)");
    expect(explicit).toBeGreaterThanOrEqual(0);
    expect(live).toBeGreaterThan(explicit);
    expect(pending).toBeGreaterThan(live);
    expect(save).toContain("maxOfferTarget: maxOfferTargetSnapshot");

    const handler = sourceSection(
      calculator,
      "const handleSaveDeal = async (",
      "/** A choice made in the duplicate-address dialog."
    );
    expect(handler).toContain("const normalizedTarget = normalizeMaoTarget(maoTarget)");
    expect(handler).toContain("isAdoptedOfferCeilingTargetSource(normalizedSource)");
    expect(handler).toContain("maxOfferTargetOverride: adoptedTarget");
  });

  it("binds the pre-auth target to the exact analysis draft and restores only that scope", () => {
    const auth = sourceSection(
      calculator,
      "onPrepareAuthSave={(\n                maoTarget: MaoTarget | undefined,",
      "onEditAssumptions={() => {"
    );
    expect(auth).toContain("const normalizedSource = normalizeOfferCeilingTargetSource(source)");
    expect(auth).toContain("isAdoptedOfferCeilingTargetSource(normalizedSource)");
    expect(auth).toContain("? normalizeMaoTarget(maoTarget)");
    expect(auth).toContain("writeCalcDraftWithMaoTarget(");
    expect(auth).toContain('exactTarget ? normalizedSource : "screening-defaults"');
    expect(auth).toContain('setAnalysisMaoTargetSource("screening-defaults")');

    const draftWriter = sourceSection(
      calculator,
      "function writeCalcDraftWithMaoTarget(",
      "/** Safely remove the draft. */"
    );
    expect(draftWriter).toContain(
      "const analysisFingerprint = maoTargetAnalysisFingerprint(normalizedDraft ?? values)"
    );
    expect(draftWriter).toContain(
      "writePendingMaoTarget(target, { analysisFingerprint, source })"
    );
    expect(draftWriter).toContain("clearPendingMaoTarget()");

    const draftRestore = sourceSection(
      calculator,
      "const autoDraftRaw = readCalcDraftRaw()",
      'resetToNewAnalysis("single-family")'
    );
    expect(draftRestore).toContain("readPendingMaoTargetBinding(");
    expect(draftRestore).toContain("maoTargetAnalysisFingerprint(normalized)");
  });

  it("clears unrelated pending auth state before a lenient saved-deal restore", () => {
    const lenientRestore = sourceSection(
      calculator,
      "// Strict normalize failed",
      "} catch {"
    );
    const clear = lenientRestore.indexOf("clearPendingMaoTarget()");
    const restore = lenientRestore.indexOf("const restoredMaoTarget = normalizeMaoTarget(");

    expect(clear).toBeGreaterThanOrEqual(0);
    expect(restore).toBeGreaterThan(clear);
    expect(lenientRestore).toContain("setAnalysisMaoTarget(restoredMaoTarget)");
  });
});

describe("PDF Max Offer target contract", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const serverAction = read("app/actions/generate-report-pdf.ts");

  it("calculates PDF acquisition thresholds only on the server", () => {
    expect(calculator).not.toContain("function toPdfReportData(");
    expect(calculator).not.toContain("calculateMaxAllowableOffer(");
    expect(calculator).not.toContain("solveRequiredMonthlyRent(");
    expect(calculator).not.toContain("solveRequiredInterestRate(");
    expect(serverAction).toContain("buildCanonicalReportData({");
    expect(serverAction).toContain("maxOfferTarget: prepared.maxOfferTarget");
    expect(serverAction).toContain(
      "maxOfferTargetSource: prepared.maxOfferTargetSource"
    );
  });

  it("prefers the callback target and preserves it for paid-claim recovery", () => {
    const exportHandler = sourceSection(
      calculator,
      "const handleExportPdf = async (",
      "const handleNewAnalysis ="
    );
    const callbackTarget = exportHandler.indexOf("normalizeMaoTarget(maoTarget)");
    const liveTarget = exportHandler.indexOf("analysisMaoTargetRef.current", callbackTarget);
    const scopedPending = exportHandler.indexOf("pendingMaoBinding?.target", liveTarget);

    expect(callbackTarget).toBeGreaterThanOrEqual(0);
    expect(liveTarget).toBeGreaterThan(callbackTarget);
    expect(scopedPending).toBeGreaterThan(liveTarget);
    expect(exportHandler).toContain("maxOfferTarget: reportMaoTarget");
    expect(exportHandler).toContain(
      "maxOfferTargetSource: reportMaoTargetSource"
    );
    expect(calculator).not.toContain("createOneTimePdfCheckoutAction");
    expect(calculator).not.toContain("handleBuyOneTimePdf");
    expect(calculator).not.toContain("checkoutMaoTarget");
    expect(exportHandler).toContain("const restoredDraft = parseOneTimePdfDraft(draftRaw)");
    expect(exportHandler).toContain("maxOfferTarget: restoredMaoTarget");
    expect(exportHandler).toContain(
      "maxOfferTargetSource: restoredMaoTargetSource"
    );
    expect(exportHandler).toContain("analysisMaoTargetRef.current = restoredMaoTarget");
  });
});
