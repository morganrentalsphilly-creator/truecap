import { describe, expect, it } from "vitest";
import { getLimitingFactor, type LimitingFactorInputs } from "@/lib/limiting-factor";

/** Financed baseline that would classify Solid (cf ≥ 100, dscr ≥ 1.15, coc ≥ 6). */
function financed(overrides: Partial<LimitingFactorInputs> = {}): LimitingFactorInputs {
  return {
    netCashFlow: 250,
    capRate: 6.5,
    cocReturn: 8,
    dscr: 1.3,
    monthlyPayment: 1_500,
    ...overrides,
  };
}

/** Cash-purchase baseline (monthlyPayment 0 → DSCR not applicable). */
function cash(overrides: Partial<LimitingFactorInputs> = {}): LimitingFactorInputs {
  return {
    netCashFlow: 250,
    capRate: 6,
    cocReturn: 6,
    dscr: 0,
    monthlyPayment: 0,
    ...overrides,
  };
}

describe("getLimitingFactor", () => {
  it("returns null for non-Mixed/Marginal tiers", () => {
    expect(getLimitingFactor("Strong", financed())).toBeNull();
    expect(getLimitingFactor("Solid", financed())).toBeNull();
    expect(getLimitingFactor("Negative", financed({ netCashFlow: -400, dscr: 0.8 }))).toBeNull();
  });

  it("returns null on negative cash flow — the break-even hint owns that case", () => {
    expect(
      getLimitingFactor("Marginal", financed({ netCashFlow: -50, dscr: 1.2 }))
    ).toBeNull();
    expect(getLimitingFactor("Marginal", cash({ netCashFlow: -50 }))).toBeNull();
  });

  it("names sub-1.0 DSCR for a Marginal financed deal with positive cash flow", () => {
    expect(getLimitingFactor("Marginal", financed({ dscr: 0.95 }))).toBe(
      "DSCR 0.95 — rental income doesn't cover the mortgage payment."
    );
  });

  it("names thin cash flow first (classifyDeal's weighting order)", () => {
    // Cash flow AND DSCR both below their Solid gates → cash flow wins.
    expect(getLimitingFactor("Mixed", financed({ netCashFlow: 62, dscr: 1.08 }))).toBe(
      "Cash flow $62/mo — below the $100/mo Solid bar."
    );
    expect(getLimitingFactor("Mixed", cash({ netCashFlow: 40 }))).toBe(
      "Cash flow $40/mo — below the $100/mo Solid bar."
    );
  });

  it("names DSCR below the Solid gate against the 1.25 lender threshold", () => {
    expect(getLimitingFactor("Mixed", financed({ dscr: 1.08 }))).toBe(
      "DSCR 1.08 — below the 1.25 lenders want."
    );
  });

  it("names low cash-on-cash with the tier-correct bar (6% financed, 5% cash)", () => {
    expect(getLimitingFactor("Mixed", financed({ cocReturn: 4.1 }))).toBe(
      "Cash-on-cash 4.1% — below the 6% Solid bar."
    );
    expect(getLimitingFactor("Mixed", cash({ cocReturn: 4.1 }))).toBe(
      "Cash-on-cash 4.1% — below the 5% Solid bar."
    );
  });

  it("names a low cap rate on cash purchases (no DSCR gate)", () => {
    expect(getLimitingFactor("Mixed", cash({ capRate: 4.2 }))).toBe(
      "Cap rate 4.2% — below the 5% Solid bar."
    );
  });

  it("never flags DSCR on a cash purchase", () => {
    // dscr 0 is calc-analysis's "not applicable" value for cash deals.
    const factor = getLimitingFactor("Mixed", cash({ cocReturn: 4 }));
    expect(factor).not.toContain("DSCR");
  });

  it("returns null when no Solid gate actually failed (defensive)", () => {
    expect(getLimitingFactor("Mixed", financed())).toBeNull();
  });
});
