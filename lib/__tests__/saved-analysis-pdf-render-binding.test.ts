import { describe, expect, it } from "vitest";

import {
  fingerprintSavedAnalysisPdfRender,
  isSavedAnalysisPdfRenderFingerprint,
  savedAnalysisPdfRenderMatches,
  type SavedAnalysisPdfRenderSource,
} from "../saved-analysis-pdf-render-binding";
import { buildAnalysisPdfObjectPath } from "../pdf-export-constants";

function source(
  resultSnapshot: Record<string, unknown> = {
    netCashFlow: 420,
    maxOfferTarget: { monthlyCashFlow: 500, dscr: 1.25 },
  },
): SavedAnalysisPdfRenderSource {
  return {
    schemaVersion: 12,
    methodologyVersion: "2026.08",
    formSnapshot: {
      address: "1700 W Erie Ave",
      purchasePrice: 250_000,
      monthlyRent: 2_500,
    },
    resultSnapshot,
    templateFallback: null,
    reportComps: null,
  };
}

describe("saved-analysis PDF render binding", () => {
  it("is deterministic across object insertion order", () => {
    const first = source({
      netCashFlow: 420,
      maxOfferTarget: { monthlyCashFlow: 500, dscr: 1.25 },
    });
    const reordered = source({
      maxOfferTarget: { dscr: 1.25, monthlyCashFlow: 500 },
      netCashFlow: 420,
    });

    expect(fingerprintSavedAnalysisPdfRender(reordered)).toBe(
      fingerprintSavedAnalysisPdfRender(first),
    );
  });

  it("changes when the persisted Max Offer target changes", () => {
    const original = source();
    const edited = source({
      netCashFlow: 420,
      maxOfferTarget: { monthlyCashFlow: 750, dscr: 1.3 },
    });

    const originalFingerprint = fingerprintSavedAnalysisPdfRender(original);
    const editedFingerprint = fingerprintSavedAnalysisPdfRender(edited);
    expect(editedFingerprint).not.toBe(originalFingerprint);
    expect(savedAnalysisPdfRenderMatches(edited, originalFingerprint)).toBe(
      false,
    );
    expect(
      buildAnalysisPdfObjectPath("owner", "deal", 9, editedFingerprint),
    ).not.toBe(
      buildAnalysisPdfObjectPath("owner", "deal", 9, originalFingerprint),
    );
  });

  it("changes when only the frozen specialist result changes", () => {
    const original = source({
      netCashFlow: 420,
      specialistAnalysis: {
        modelVersion: 1,
        strategy: "fix-flip",
        outcome: { netProfit: 50_000 },
      },
    });
    const changed = source({
      netCashFlow: 420,
      specialistAnalysis: {
        modelVersion: 1,
        strategy: "fix-flip",
        outcome: { netProfit: 49_999 },
      },
    });

    expect(fingerprintSavedAnalysisPdfRender(changed)).not.toBe(
      fingerprintSavedAnalysisPdfRender(original),
    );
  });

  it("changes for form, result, methodology, template, and comps changes", () => {
    const original = source();
    const originalFingerprint = fingerprintSavedAnalysisPdfRender(original);
    const variants: SavedAnalysisPdfRenderSource[] = [
      {
        ...original,
        formSnapshot: { ...original.formSnapshot, purchasePrice: 251_000 },
      },
      {
        ...original,
        resultSnapshot: { ...original.resultSnapshot, netCashFlow: 421 },
      },
      { ...original, methodologyVersion: "2026.09" },
      {
        ...original,
        templateFallback: {
          id: "template-1",
          templateName: "Conservative",
          templateDescription: null,
        },
      },
      {
        ...original,
        reportComps: {
          valueEstimate: 275_000,
          valueRange: null,
          rentEstimate: 2_400,
          rentRange: null,
          saleComps: [],
          rentComps: [],
          fetchedAt: "2026-08-23T12:00:00.000Z",
        },
      },
    ];

    for (const variant of variants) {
      expect(fingerprintSavedAnalysisPdfRender(variant)).not.toBe(
        originalFingerprint,
      );
    }
  });

  it("accepts only the server digest shape and fails closed otherwise", () => {
    const current = source();
    const fingerprint = fingerprintSavedAnalysisPdfRender(current);

    expect(isSavedAnalysisPdfRenderFingerprint(fingerprint)).toBe(true);
    expect(savedAnalysisPdfRenderMatches(current, fingerprint)).toBe(true);
    expect(savedAnalysisPdfRenderMatches(current, "../stale.pdf")).toBe(false);
    expect(
      savedAnalysisPdfRenderMatches(current, fingerprint.toUpperCase()),
    ).toBe(false);
    expect(savedAnalysisPdfRenderMatches(current, `${fingerprint}00`)).toBe(
      false,
    );
  });
});
