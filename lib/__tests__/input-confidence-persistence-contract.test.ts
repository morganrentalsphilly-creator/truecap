import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const analyzer = readFileSync(
  join(ROOT, "components/investcalc/investcalc-page.tsx"),
  "utf8"
);
const savedAnalysesAction = readFileSync(
  join(ROOT, "app/actions/saved-analyses.ts"),
  "utf8"
);

describe("Input Confidence analyzer persistence contract", () => {
  it("restores and merges value-bound context for every live consumer", () => {
    expect(analyzer).toContain("restoreInputConfidenceSourceContext(");
    expect(analyzer).toContain("mergeInputConfidenceSourceContext({");
    expect(analyzer).toContain("confidenceContext.provenance");
    expect(analyzer).toContain("touchedInputFields: confidenceContext.touchedInputFields");
    expect(analyzer).toContain(
      "purchasePriceSource: confidenceContext.purchasePriceSource",
    );
    expect(savedAnalysesAction.replace(/\s+/g, "")).toContain(
      "normalizePurchasePriceSourceContext(options?.purchasePriceSource",
    );
    // The results-side AssumptionsSourceStrip ("Where these numbers came
    // from" ledger row) was removed by founder decision 2026-08-17, so the
    // data-confidence badge is the remaining live consumer of restored
    // provenance.
    expect(analyzer.replace(/\s+/g, "")).toContain("buildDataConfidence(liveResultSourceContext.provenance");
  });

  it("binds restored source context to the saved address and clears it on forks", () => {
    expect(analyzer).toContain("persistedInputConfidenceAddressRef");
    expect(analyzer).toContain("persistedAddress === currentAddress");
    expect(analyzer.match(/persistedInputConfidenceSourceContextRef\.current = null/g)?.length)
      .toBeGreaterThanOrEqual(6);
  });

  it("binds the visible purchase-price receipt to address and value", () => {
    expect(analyzer).toContain("purchasePriceProvenanceAddressRef");
    expect(analyzer).toContain("purchasePriceProvenanceValueRef");
    expect(analyzer).toContain("purchasePriceSourceRef.current = null");
    expect(analyzer.replace(/\s+/g, "")).toContain(
      "formatPurchasePriceSourceLabel(restoredSourceContext.purchasePriceSource",
    );
  });

  it("marks context-aware saves so an intentional empty context clears stale legacy sources", () => {
    expect(analyzer).toContain("inputSourceContextProvided: true");
    expect(savedAnalysesAction).toContain(
      "sourceContextProvided: options?.inputSourceContextProvided === true"
    );
    expect(savedAnalysesAction).toContain("shouldPreserveStoredDataConfidence({");
  });
});
