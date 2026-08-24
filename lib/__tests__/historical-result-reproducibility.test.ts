import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("historical result reproducibility wiring", () => {
  it("uses the recorded snapshot for same-version saved results", () => {
    const resolver = read("lib/saved-analysis-methodology.ts");
    expect(resolver).toContain('mode: "same-version-recorded-snapshot"');
    expect(resolver).toContain("usesRecordedSnapshot: true");
    expect(resolver).toContain("if (resolved.usesRecordedSnapshot)");
  });

  it("does not silently rebuild Compare long-term outputs or Offer Ceiling", () => {
    const compare = read("app/dashboard/compare/page.tsx");
    expect(compare).toContain("canShowMao && resolution.usesRecordedSnapshot");
    expect(compare).toContain("recordedDealOfferLine({");
    expect(compare).toContain("resolution.usesRecordedSnapshot\n      ? parseCompareSnapshotV1");
  });

  it("binds saved PDF generation to the owner-scoped recorded result", () => {
    const action = read("app/actions/generate-report-pdf.ts");
    const builder = read("lib/report-data-builder.ts");
    expect(action).toContain("trustedRecordedResult");
    expect(action).toContain("if (!recorded.result || !recorded.usesRecordedSnapshot)");
    expect(builder).toContain("input.trustedRecordedResult");
    expect(builder).toContain("parseCompareSnapshotV1");
    expect(builder).toContain("maxOffer: usesRecordedResult");
  });

  it("captures opaque-share outputs and labels legacy input-only shares", () => {
    const store = read("lib/public-share.ts");
    const route = read("app/s/[token]/page.tsx");
    const view = read("components/investcalc/read-only-analysis-view.tsx");
    expect(store).toContain("resultSnapshot: capturedResult");
    expect(store).toContain("offerCeilingExact");
    expect(route).toContain("recordedResult={Boolean(recordedResolution?.usesRecordedSnapshot)}");
    expect(route).toContain("canRecomputeInputOnlyShare");
    expect(view).toContain("Sensitivity figures are intentionally not regenerated");
    expect(view).toContain("showProAnalysis && !recordedResult");
  });

  it("replays a recorded analyzer solve and binds its PDF to the owned row", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    expect(page).toContain("readRecordedOfferCeiling(savedResultRecord)");
    expect(page).toContain("recordedOfferCeiling={recordedOfferCeiling}");
    expect(page).toContain(
      "setRecordedOfferCeiling({ captured: false, exact: null })"
    );
    expect(page).toContain("getSavedAnalysisPdfExportAction(");
    expect(page).toContain('bypassCache: mode !== "personal"');
    expect(page).toContain("...(savedExport ? { savedExport } : {})");
    expect(page).toContain(
      "Your report was exported from the recorded saved analysis."
    );
    expect(dashboard).toContain("!recordedOfferCeiling &&");
    expect(dashboard).toContain(
      '? { access: "exact", exact: recordedOfferCeiling.exact }'
    );
  });

  it("keeps client portal cards and detail pages on the same recorded result", () => {
    const portalList = read("lib/client-portal.ts");
    const portalDetail = read("app/portal/[token]/d/[dealId]/page.tsx");
    expect(portalList).toContain("resolution.usesRecordedSnapshot");
    expect(portalList).toContain("Recorded Standard v");
    expect(portalDetail).toContain("resolveSavedAnalysisResult({");
    expect(portalDetail).toContain("if (!methodologyResolution.result) notFound()");
    expect(portalDetail).toContain("if (maoTarget && recordedResult)");
    expect(portalDetail).toContain("readRecordedOfferCeiling(savedResultSnapshot)");
    expect(portalDetail).not.toContain("calculateAnalysis(values)");
  });

  it("offers re-underwriting as a cloned scenario, leaving the parent intact", () => {
    const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const handoff = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    expect(workspace).toContain("ReunderwriteAsScenarioButton");
    expect(handoff).toContain("Re-underwrite as new scenario");
    expect(handoff).toContain("addScenarioAction({");
    expect(handoff).toContain("cloned.scenarioId");
  });
});
