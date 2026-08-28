import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("historical result reproducibility wiring", () => {
  it("uses the recorded snapshot for same-version saved results", () => {
    const resolver = read("lib/saved-analysis-methodology.ts");
    expect(resolver).toContain('mode: "same-version-recorded-snapshot"');
    expect(resolver).toContain("usesRecordedSnapshot: true");
    expect(resolver).toContain("if (resolved.usesRecordedSnapshot)");
  });

  it("does not silently rebuild Compare long-term outputs or Offer Ceiling", () => {
    const compare = read("app/dashboard/compare/page.tsx");
    const compareClient = read(
      "components/investcalc/compare-deals-client.tsx",
    );
    expect(compare).toContain("canShowMao && resolution.usesRecordedSnapshot");
    expect(compare).toContain("recordedDealOfferLine({");
    expect(compare).toContain(
      "resolution.usesRecordedSnapshot\n      ? parseCompareSnapshotV1",
    );
    expect(compare).toContain("compareSnapshotSource: compareSnapshot");
    expect(compareClient).toContain(
      "Loaded from the recorded saved analysis (no recalculation).",
    );
    expect(compareClient).toContain(
      "Recomputed as one current-methodology result from the saved inputs; recorded and current projection rows are not mixed.",
    );
  });

  it("binds saved PDF generation to owned inputs and recomputes publication outputs", () => {
    const action = read("app/actions/generate-report-pdf.ts");
    const builder = read("lib/report-data-builder.ts");
    expect(action).toContain("shouldFreezeSavedMethodology(");
    expect(action).toContain(
      "const currentResult = calculateAnalysis(trustedValues)",
    );
    expect(action).not.toContain("trustedRecordedResult");
    expect(builder).not.toContain("input.trustedRecordedResult");
    expect(builder).not.toContain("parseCompareSnapshotV1");
    expect(builder).toContain("const result = currentResult");
    expect(builder).toContain("maxOffer: buildReportMaxOffer");
  });

  it("captures opaque-share outputs and labels legacy input-only shares", () => {
    const store = read("lib/public-share.ts");
    const route = read("app/s/[token]/page.tsx");
    const legacyRoute = read("app/d/[encoded]/page.tsx");
    const view = read("components/investcalc/read-only-analysis-view.tsx");
    const shareDialog = read(
      "components/investcalc/share-link-button.tsx",
    );
    expect(store).toContain("resultSnapshot: capturedResult");
    expect(store).toContain("offerCeilingExact");
    expect(route).toContain("recordedResult={false}");
    expect(route).toContain("outputsRecomputed");
    expect(route).not.toContain("resolveSavedAnalysisResult");
    expect(legacyRoute).toContain("outputsRecomputed");
    expect(view).toContain("proResult && !recordedResult");
    expect(shareDialog).toContain(
      "The link captures the analysis inputs at this moment.",
    );
    expect(shareDialog).toContain(
      "recalculates the results using the current",
    );
    expect(shareDialog).not.toContain(
      "The link opens a snapshot of the analysis at this moment.",
    );
  });

  it("replays a recorded analyzer solve and binds its PDF to the owned row", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    expect(page).toContain("readRecordedOfferCeiling(savedResultRecord)");
    expect(page).toContain("recordedOfferCeiling={recordedOfferCeiling}");
    expect(page).toContain(
      "setRecordedOfferCeiling(invalidateRecordedOfferCeilingForTargetEdit)",
    );
    expect(page).toContain("getSavedAnalysisPdfExportAction(");
    expect(page).toContain('bypassCache: mode !== "personal"');
    expect(page).toContain("...(savedExport ? { savedExport } : {})");
    expect(page).toContain(
      "Your report was generated from the saved inputs using the current compatible underwriting methodology.",
    );
    expect(page).not.toContain(
      "Your report was exported from the recorded saved analysis.",
    );
    expect(page).toContain(
      "Your report was generated from the latest live inputs using the current underwriting methodology.",
    );
    expect(dashboard).toContain("!recordedOfferCeiling &&");
    expect(dashboard).toContain(
      '? { access: "exact", exact: recordedOfferCeiling.exact }',
    );
  });

  it("never refreshes immutable recorded long-term rows through live snapshot actions", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const normalizedPage = normalizeSource(page);
    expect(normalizedPage).toContain(
      normalizeSource(
        "const recordedAnalysisId = resolution.usesRecordedSnapshot ? null : parsed.id",
      ),
    );
    expect(normalizedPage).toContain(
      normalizeSource(
        "buildProjectionSource(recordedAnalysisId, hydratedValues, result)",
      ),
    );
    expect(normalizedPage).toContain(
      normalizeSource(
        "buildTaxStrategySource(recordedAnalysisId, hydratedValues, result)",
      ),
    );
    expect(normalizedPage).toContain(
      normalizeSource(
        "buildExitScenarioSource(recordedAnalysisId, hydratedValues,",
      ),
    );
    expect(normalizedPage).toContain(
      normalizeSource("recorded: resolution.usesRecordedSnapshot"),
    );
  });

  it("carries lifetime mortgage-insurance semantics into live projections", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    expect(normalizeSource(page)).toContain(
      normalizeSource(
        "pmiNoCancel: mortgageInsuranceRunsToPayoff(values.propertyType, values.pmiNoCancel)",
      ),
    );
  });

  it("keeps client portal cards and detail pages on the same current server recompute", () => {
    const portalList = read("lib/client-portal.ts");
    const portalDetail = read("app/portal/[token]/d/[dealId]/page.tsx");
    expect(portalList).toContain(
      "recomputeSavedDealVerdict(row.form_snapshot)",
    );
    expect(portalList).toContain("shouldFreezeSavedMethodology(");
    expect(portalList).not.toContain("resolveSavedAnalysisSnapshot");
    expect(portalDetail).toContain(
      "recomputeSavedDealVerdict(deal.form_snapshot)",
    );
    expect(portalDetail).toContain("result = recomputedVerdict.analysisResult");
    expect(portalDetail).toContain("resolveOfferCeilingForAccess({");
    expect(portalDetail).not.toContain("readRecordedOfferCeiling(");
    expect(portalDetail).toContain("outputsRecomputed");
    expect(portalDetail).toContain('inputsSource="live-saved"');
    const shell = read("components/investcalc/shared-deal-shell.tsx");
    expect(shell).toContain("This view uses the agent’s current saved inputs");
  });

  it("offers re-underwriting as a cloned scenario, leaving the parent intact", () => {
    const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const handoff = read(
      "components/investcalc/open-saved-deal-in-analyzer.tsx",
    );
    expect(workspace).toContain("ReunderwriteAsScenarioButton");
    // The control CLONES; it does not recompute (addScenarioAction skips the
    // recompute block when strategyKind is null). The label must not promise
    // an underwrite the code never performs.
    expect(handoff).toContain("Duplicate as new scenario");
    expect(handoff).not.toContain("Re-underwrite as new scenario");
    expect(handoff).toContain("addScenarioAction({");
    expect(handoff).toContain("cloned.scenarioId");
  });
});
