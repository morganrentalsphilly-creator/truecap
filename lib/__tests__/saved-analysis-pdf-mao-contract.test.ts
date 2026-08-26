import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("My Deals PDF target continuity", () => {
  it("builds the report acquisition block from resultSnapshot.maxOfferTarget", () => {
    const page = read("components/investcalc/saved-analyses-page-v2.tsx");
    const generator = read("lib/pdf-generator.ts");
    const serverBuilder = read("lib/report-data-builder.ts");
    const reportMaxOffer = read("lib/report-max-offer.ts");
    const builderStart = page.indexOf(
      "function buildReportDataFromSavedSnapshot",
    );
    const builderEnd = page.indexOf("function DealTags", builderStart);
    const builder = page.slice(builderStart, builderEnd);

    expect(builderStart).toBeGreaterThanOrEqual(0);
    expect(builderEnd).toBeGreaterThan(builderStart);
    expect(builder).toContain("buildReportMaxOffer({");
    expect(builder).toContain("targetInput: result.maxOfferTarget");
    expect(builder).toContain("includeDerivedMaxOffer");
    expect(builder).toContain("const maxOffer = includeDerivedMaxOffer");
    expect(builder).toContain("maxOffer,");
    expect(page).toContain(
      "includeDerivedMaxOffer: !resolved.usesRecordedSnapshot",
    );
    expect(serverBuilder).toContain("maxOffer: buildReportMaxOffer({");
    expect(serverBuilder).not.toContain("buildRecordedReportMaxOffer(");
    expect(serverBuilder).toContain("targetSourceInput: targetSource");
    expect(reportMaxOffer).toContain("readRecordedOfferCeiling(snapshotInput)");
    expect(reportMaxOffer).not.toContain(
      "calculateMaxAllowableOffer(snapshotInput",
    );
    expect(generator).toContain("if (d.maxOffer !== undefined) {");
    expect(generator).toContain("metrics.push([");
    expect(generator).toContain("cards.unshift([");
  });

  it("invalidates a cached PDF atomically whenever the saved snapshot changes", () => {
    const action = read("app/actions/saved-analyses.ts");
    const payloadStart = action.indexOf("const payload = {");
    const payloadEnd = action.indexOf(
      "const candidateExistingId",
      payloadStart,
    );
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
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const cacheWriter = read("lib/pdf/saved-analysis-cache.ts");
    const completionStart = action.indexOf(
      "export async function completeSavedAnalysisPdfExportAction(",
    );
    const completionEnd = action.indexOf(
      "export async function updateSavedDealNotesAction",
      completionStart,
    );
    const completion = action.slice(completionStart, completionEnd);

    expect(action).toContain(
      "const renderFingerprint = fingerprintSavedAnalysisPdfRender(renderSource)",
    );
    expect(action).toContain("renderFingerprint,");
    expect(action).toContain(
      "const cachedArtifact = parseAttestedAnalysisPdfObjectPath(",
    );
    expect(action).toContain("readVerifiedSavedAnalysisPdfArtifact({");
    expect(action).toContain("verifySavedAnalysisPdfArtifact({");
    expect(action).toContain("getSavedAnalysisReportComps(");
    expect(action).toContain("reportComps,");
    expect(page).toContain("reportData.comps = exportResult.reportComps");
    expect(page).not.toContain("getSavedDealCompsAction(id)");
    expect(page).toContain("exportResult.renderFingerprint");
    expect(page).toContain("void cacheSavedAnalysisPdfExport({");
    expect(normalizeSource(analyzer)).toContain(
      normalizeSource(
        'if (savedExport && mode === "personal" && pdfResult.cacheAttestation)',
      ),
    );
    expect(analyzer).toContain("analysisId: savedExport.id");
    expect(analyzer).toContain(
      "renderFingerprint: savedExport.renderFingerprint",
    );
    expect(cacheWriter).toContain(
      "buildAnalysisPdfObjectPath(\n      user.id,\n      analysisId,\n      PDF_CACHE_VERSION,\n      renderFingerprint",
    );
    expect(cacheWriter).toContain("artifactAttestation");
    expect(cacheWriter).toContain(".from(ANALYSIS_PDF_BUCKET)");
    expect(cacheWriter).toContain(".upload(filePath, pdfBlob");
    expect(page).toContain("renderFingerprint: exportResult.renderFingerprint");
    expect(normalizeSource(cacheWriter)).toContain(
      normalizeSource(
        "completeSavedAnalysisPdfExportAction(analysisId, renderFingerprint, artifactAttestation)",
      ),
    );
    expect(completion).toContain(
      "isSavedAnalysisPdfRenderFingerprint(renderFingerprint)",
    );
    expect(completion).toContain(
      "isSavedAnalysisPdfArtifactAttestation(artifactAttestation)",
    );
    expect(completion).toContain("savedAnalysisPdfRenderMatches(");
    expect(normalizeSource(completion)).toContain(
      normalizeSource(
        "PDF_CACHE_VERSION, renderFingerprint, artifactAttestation",
      ),
    );
    expect(completion).toContain('.eq("updated_at", currentUpdatedAt)');
    expect(completion).toContain("pdf_snapshot_version: PDF_CACHE_VERSION");
    expect(action).toContain(
      "Active subscribers always receive a fresh server render",
    );
    expect(completion).toContain('code: "STALE_EXPORT"');
  });

  it("bypasses the personal-report cache for every alternate report mode on both reads", () => {
    const action = read("app/actions/generate-report-pdf.ts");
    const page = read("components/investcalc/investcalc-page.tsx");

    expect(page).toContain('{ bypassCache: mode !== "personal" }');
    expect(action).toContain('{ bypassCache: input.mode !== "personal" }');
  });

  it("uses the Safari-safe PDF download helper for cached reports on both surfaces", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const savedDeals = read("components/investcalc/saved-analyses-page-v2.tsx");
    const analyzerCacheStart = analyzer.indexOf(
      'if (savedAuthority.source === "cache")',
    );
    const analyzerCacheEnd = analyzer.indexOf(
      "savedExport = {",
      analyzerCacheStart,
    );
    const analyzerCachePath = analyzer.slice(
      analyzerCacheStart,
      analyzerCacheEnd,
    );

    expect(analyzerCacheStart).toBeGreaterThanOrEqual(0);
    expect(analyzerCacheEnd).toBeGreaterThan(analyzerCacheStart);
    expect(analyzerCachePath).toContain("downloadPdfFromBase64");
    expect(savedDeals).toContain("downloadPdfFromBase64");
    expect(analyzer).not.toContain("URL.revokeObjectURL(blobUrl)");
    expect(savedDeals).not.toContain("URL.revokeObjectURL(blobUrl)");
    expect(analyzerCachePath).not.toContain("window.location.assign");
    expect(analyzerCachePath).not.toContain('title: "Opening saved PDF"');
    expect(analyzerCachePath).not.toContain('target = "_blank"');
  });
});
