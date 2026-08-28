/**
 * buildBuyBoxPdfVerdict — the pure mapper behind the Pro PDF's
 * "Your buy box" block. Pins the properties the PDF relies on:
 *   - null (→ no block, byte-identical PDF) for every "no usable box" state,
 *   - the default box leads and its headline/counts match BuyBoxVerdictCard,
 *   - WinAnsi safety: no "≥"/"≤" survive into strings jsPDF must draw,
 *   - cash-purchase DSCR is N/A, never a failure.
 */
import { describe, expect, it } from "vitest";

import type { BuyBoxDealMetrics, NamedBuyBox } from "../buy-box";
import { buildBuyBoxPdfVerdict } from "../pdf-buy-box";

function makeBox(overrides: Partial<NamedBuyBox> = {}): NamedBuyBox {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "My Buy Box",
    strategyKind: null,
    isDefault: false,
    sortOrder: 0,
    minCapRatePct: null,
    minCocPct: null,
    minDscr: null,
    minCashFlowMonthly: null,
    maxPurchasePrice: null,
    propertyTypes: [],
    targetStates: [],
    isActive: true,
    ...overrides,
  };
}

const baseMetrics: BuyBoxDealMetrics = {
  capRatePct: 5.2,
  cocPct: 9.1,
  dscr: 1.31,
  cashFlowMonthly: 260,
  purchasePrice: 240_000,
  propertyType: "single-family",
  state: "PA",
  isCashPurchase: false,
};

describe("buildBuyBoxPdfVerdict", () => {
  it("returns null when there is no box, only inactive boxes, or only criteria-less boxes", () => {
    expect(buildBuyBoxPdfVerdict([], baseMetrics)).toBeNull();
    expect(
      buildBuyBoxPdfVerdict([makeBox({ minCapRatePct: 6, isActive: false })], baseMetrics)
    ).toBeNull();
    // Active but zero criteria set — nothing to screen.
    expect(buildBuyBoxPdfVerdict([makeBox()], baseMetrics)).toBeNull();
  });

  it("builds a passing verdict with the card's headline, counts, and personal line", () => {
    const v = buildBuyBoxPdfVerdict(
      [makeBox({ isDefault: true, minCapRatePct: 5, minCashFlowMonthly: 200 })],
      baseMetrics
    );
    expect(v).not.toBeNull();
    expect(v!.passes).toBe(true);
    expect(v!.headline).toBe("Meets your buy box");
    expect(v!.multi).toBe(false);
    expect(v!.activeCount).toBe(1);
    expect(v!.passingCount).toBe(1);
    expect(v!.passedCount).toBe(2);
    expect(v!.applicableCount).toBe(2);
    // Tightest-margin line on a pass, with the target rewritten ASCII-safe.
    expect(v!.personalLine).toMatch(/Tightest margin/);
    expect(v!.personalLine).not.toMatch(/[≥≤]/);
  });

  it("builds a missing verdict naming the failed criteria and the biggest gap", () => {
    const v = buildBuyBoxPdfVerdict(
      [makeBox({ isDefault: true, minCapRatePct: 6, minCashFlowMonthly: 200 })],
      baseMetrics
    );
    expect(v!.passes).toBe(false);
    expect(v!.headline).toBe("Misses on Cap rate");
    expect(v!.personalLine).toMatch(/Biggest gap — Cap rate/);
    expect(v!.personalLine).toMatch(/0\.8pp short/);
    const capCheck = v!.checks.find((c) => c.id === "capRate")!;
    expect(capCheck.pass).toBe(false);
    expect(capCheck.target).toBe(">= 6%");
    expect(capCheck.actual).toBe("5.2%");
    expect(capCheck.gapText).toBe("0.8pp short");
  });

  it("keeps every drawable string free of WinAnsi-unsafe ≥/≤", () => {
    const v = buildBuyBoxPdfVerdict(
      [
        makeBox({
          isDefault: true,
          minCapRatePct: 6,
          minCocPct: 8,
          minDscr: 1.2,
          minCashFlowMonthly: 200,
          maxPurchasePrice: 250_000,
        }),
      ],
      baseMetrics
    );
    for (const c of v!.checks) {
      expect(c.target).not.toMatch(/[≥≤]/);
      expect(c.actual).not.toMatch(/[≥≤]/);
    }
  });

  it("details the DEFAULT box and rolls up the multi-box summary", () => {
    const memphis = makeBox({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Memphis BRRRR",
      minCapRatePct: 8, // fails on this deal
      sortOrder: 0,
    });
    const philly = makeBox({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Philly house hack",
      minCapRatePct: 5, // passes
      isDefault: true,
      sortOrder: 1,
    });
    const v = buildBuyBoxPdfVerdict([memphis, philly], baseMetrics);
    expect(v!.multi).toBe(true);
    expect(v!.boxName).toBe("Philly house hack"); // default leads
    expect(v!.passes).toBe(true);
    expect(v!.activeCount).toBe(2);
    expect(v!.passingCount).toBe(1);
  });

  it("treats DSCR on a cash purchase as N/A — never a failure", () => {
    const v = buildBuyBoxPdfVerdict([makeBox({ isDefault: true, minDscr: 1.2 })], {
      ...baseMetrics,
      dscr: 0,
      isCashPurchase: true,
    });
    const dscr = v!.checks.find((c) => c.id === "dscr")!;
    expect(dscr.pass).toBeNull();
    expect(dscr.actual).toBe("N/A — no debt service");
    expect(v!.applicableCount).toBe(0);
    expect(v!.passes).toBe(false);
    expect(v!.headline).toBe("Can't evaluate on this deal yet");
  });
});
