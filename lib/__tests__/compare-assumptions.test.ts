import { describe, expect, it } from "vitest";

import { buildDealAssumptions } from "../compare-assumptions";

// ──────────────────────────────────────────────────────────────────
// Compare assumptions — property-tax dual mode
//
// In annual-$ tax mode the snapshot's propertyTaxPct is undefined and the
// row's property_tax_pct used to be a fabricated 1.1 — Compare then printed
// "Property tax (annual %): 1.1%" on a deal whose real bill was 2.4% of
// price. The assumptions payload must carry the mode + the bill so the
// panel renders the customer's actual input.
// ──────────────────────────────────────────────────────────────────

const baseSnapshot = {
  propertyType: "single-family",
  monthlyRent: 2_500,
  vacancyPct: 5,
  mgmtPct: 8,
  maintenancePct: 5,
  capexPct: 5,
  interestRate: 7,
  loanTermYears: 30,
  downPaymentPct: 20,
  insuranceInputMode: "percent",
  insurancePct: 0.5,
};

describe("buildDealAssumptions — property tax modes", () => {
  it("annual-$ mode surfaces the bill + mode (never just a percent)", () => {
    const a = buildDealAssumptions(
      {
        ...baseSnapshot,
        propertyTaxInputMode: "annual",
        propertyTaxAnnual: 7_200,
        // propertyTaxPct intentionally absent — that's the real annual-mode shape.
      },
      // Row fallback carries the derived effective % the save action persists.
      { property_tax_pct: 2.4 }
    );
    expect(a.expenses.propertyTaxInputMode).toBe("annual");
    expect(a.expenses.propertyTaxAnnual).toBe(7_200);
    // The derived effective % still flows through for anything percent-based.
    expect(a.expenses.propertyTaxPct).toBe(2.4);
  });

  it("percent mode passes the % through with a null bill", () => {
    const a = buildDealAssumptions(
      { ...baseSnapshot, propertyTaxInputMode: "percent", propertyTaxPct: 1.31 },
      {}
    );
    expect(a.expenses.propertyTaxInputMode).toBe("percent");
    expect(a.expenses.propertyTaxAnnual).toBeNull();
    expect(a.expenses.propertyTaxPct).toBe(1.31);
  });

  it("annual mode with a blank bill degrades to the percent path", () => {
    const a = buildDealAssumptions(
      { ...baseSnapshot, propertyTaxInputMode: "annual", propertyTaxPct: 1.1 },
      {}
    );
    // No bill to show — mode falls back so the renderer takes the % branch.
    expect(a.expenses.propertyTaxInputMode).toBeNull();
    expect(a.expenses.propertyTaxAnnual).toBeNull();
    expect(a.expenses.propertyTaxPct).toBe(1.1);
  });

  it("legacy snapshots without a mode fall back to the stored % column", () => {
    const a = buildDealAssumptions({ ...baseSnapshot }, { property_tax_pct: "1.5" });
    expect(a.expenses.propertyTaxInputMode).toBeNull();
    expect(a.expenses.propertyTaxAnnual).toBeNull();
    expect(a.expenses.propertyTaxPct).toBe(1.5);
  });

  it("shows the effective insurance default used by the resolved result", () => {
    const a = buildDealAssumptions(
      {
        ...baseSnapshot,
        insuranceInputMode: "percent",
        insurancePct: undefined,
      },
      { insurance_pct: null },
      { insurancePctEffective: 0.5, insuranceMonthly: 104 }
    );

    expect(a.expenses.insuranceInputMode).toBe("percent");
    expect(a.expenses.insurancePct).toBe(0.5);
  });

  it("uses the recorded effective monthly insurance when the input adopted a fallback", () => {
    const a = buildDealAssumptions(
      {
        ...baseSnapshot,
        insuranceInputMode: "monthly",
        insuranceMonthly: undefined,
      },
      { insurance_mo: null },
      { insurancePctEffective: 0.5, insuranceMonthly: 125 }
    );

    expect(a.expenses.insuranceInputMode).toBe("monthly");
    expect(a.expenses.insuranceMonthly).toBe(125);
  });
});
