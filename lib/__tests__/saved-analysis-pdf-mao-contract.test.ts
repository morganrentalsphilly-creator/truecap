import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("My Deals PDF target continuity", () => {
  it("builds the report acquisition block from resultSnapshot.maxOfferTarget", () => {
    const page = read("components/investcalc/saved-analyses-page-v2.tsx");
    const generator = read("lib/pdf-generator.ts");
    const serverBuilder = read("lib/report-data-builder.ts");
    const reportMaxOffer = read("lib/report-max-offer.ts");
    const builderStart = page.indexOf("function buildReportDataFromSavedSnapshot");
    const builderEnd = page.indexOf("function DealTags", builderStart);
    const builder = page.slice(builderStart, builderEnd);

    expect(builderStart).toBeGreaterThanOrEqual(0);
    expect(builderEnd).toBeGreaterThan(builderStart);
    expect(builder).toContain("buildReportMaxOffer({");
    expect(builder).toContain("targetInput: result.maxOfferTarget");
    expect(builder).toContain("includeDerivedMaxOffer");
    expect(builder).toContain("const maxOffer = includeDerivedMaxOffer");
    expect(builder).toContain("maxOffer,");
    expect(page).toContain("includeDerivedMaxOffer: !resolved.usesRecordedSnapshot");
    expect(serverBuilder).toContain("buildRecordedReportMaxOffer(");
    expect(reportMaxOffer).toContain("readRecordedOfferCeiling(snapshotInput)");
    expect(reportMaxOffer).not.toContain(
      "calculateMaxAllowableOffer(snapshotInput"
    );
    expect(generator).toContain("if (d.maxOffer !== undefined) {");
    expect(generator).toContain("metrics.push([");
    expect(generator).toContain("cards.unshift([");
  });

  it("invalidates a cached PDF atomically whenever the saved snapshot changes", () => {
    const action = read("app/actions/saved-analyses.ts");
    const payloadStart = action.indexOf("const payload = {");
    const payloadEnd = action.indexOf("const candidateExistingId", payloadStart);
    const payload = action.slice(payloadStart, payloadEnd);

    expect(payloadStart).toBeGreaterThanOrEqual(0);
    expect(payloadEnd).toBeGreaterThan(payloadStart);
    expect(payload).toContain("result_snapshot: resultSnapshotWithScore");
    expect(payload).toContain("pdf_url: null");
    expect(payload).toContain("pdf_generated_at: null");
    expect(payload).toContain("pdf_snapshot_version: 0");
  });

  it("binds upload and completion to the same server-issued render fingerprint", () => {
    const action = read("app/actions/saved-analyses.ts");
    const page = read("components/investcalc/saved-analyses-page-v2.tsx");
    const completionStart = action.indexOf(
      "export async function completeSavedAnalysisPdfExportAction("
    );
    const completionEnd = action.indexOf("export async function updateSavedDealNotesAction", completionStart);
    const completion = action.slice(completionStart, completionEnd);

    expect(action).toContain(
      "const renderFingerprint = fingerprintSavedAnalysisPdfRender(renderSource)"
    );
    expect(action).toContain("renderFingerprint,");
    expect(action).toContain("cachedObjectPath === expectedPdfPath");
    expect(action).toContain(
      "const expectedPdfPath = buildAnalysisPdfObjectPath("
    );
    expect(action).toContain("getSavedAnalysisReportComps(");
    expect(action).toContain("reportComps,");
    expect(page).toContain("reportData.comps = exportResult.reportComps");
    expect(page).not.toContain("getSavedDealCompsAction(id)");
    expect(page).toContain("exportResult.renderFingerprint");
    expect(page).toContain(
      "completeSavedAnalysisPdfExportAction(\n              exportResult.id,\n              exportResult.renderFingerprint,\n              pdfResult.hasBranding,\n              pdfResult.hasBuyBoxVerdict,\n              pdfResult.buyBoxStateResolved"
    );
    expect(completion).toContain("isSavedAnalysisPdfRenderFingerprint(renderFingerprint)");
    expect(completion).toContain("savedAnalysisPdfRenderMatches(");
    expect(completion).toContain("PDF_CACHE_VERSION,\n    renderFingerprint");
    expect(completion).toContain('.eq("updated_at", currentUpdatedAt)');
    expect(completion).toContain("renderedWithBranding ||");
    expect(completion).toContain("hasCurrentBranding ||");
    expect(completion).toContain("renderedWithBuyBoxVerdict ||");
    expect(completion).toContain("!buyBoxStateResolved ||");
    expect(completion).toContain("hasUsableBuyBox !== false ||");
    expect(action).toContain("if (hasUsableBuyBox === false) {");
    expect(completion).toContain('code: "STALE_EXPORT"');
  });
});
