/**
 * Tests for the "what would make it Solid / Strong?" breakpoint solver.
 *
 * The solver renders inline negotiation guidance on the analyzer page
 * — "Drop the price to $285,000 or push rent to $2,640/mo." The math
 * directly drives the dollar numbers a user might take into a
 * negotiation. Silent breakage here would mean recommending the wrong
 * price cut or rent target.
 *
 * These tests pin:
 *   - returns null when current tier is Strong (nothing to solve toward)
 *   - finds a valid price + rent breakpoint when the deal can be fixed
 *   - returns null delta + null breakpoint when the deal can't be fixed
 *     within the 30% safety bound
 *   - applying the suggested adjustment actually crosses the tier
 *   - currentPrice / currentRentMonthly are surfaced for the caller
 *   - multi-unit deals return null for rentBreakpointMonthly (per-unit
 *     dollar number isn't meaningful) but still surface rentDeltaPct
 */

import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { getDealTier } from "../verdict";
import { solveBreakpoints } from "../breakpoint-solver";
import type { InvestmentFormValues } from "../investcalc-schema";

function baseSingleFamily(
  overrides: Partial<InvestmentFormValues> = {}
): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

function baseMultiUnit(
  overrides: Partial<InvestmentFormValues> = {}
): InvestmentFormValues {
  return {
    ...baseSingleFamily(),
    propertyType: "multi-family",
    purchasePrice: 425_000,
    monthlyRent: undefined,
    units: [
      { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 1_400, isOwnerOccupied: false },
      { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 1_400, isOwnerOccupied: false },
    ],
    ...overrides,
  } as InvestmentFormValues;
}

describe("solveBreakpoints — short-circuits", () => {
  it("returns null when the deal is already Strong", () => {
    const values = baseSingleFamily({ monthlyRent: 3_500 });
    const result = calculateAnalysis(values);
    expect(getDealTier(result)).toBe("Strong");
    expect(solveBreakpoints(values, result)).toBeNull();
  });

  it("targets Strong (not Solid) when current tier is Solid", () => {
    const values = baseSingleFamily({ monthlyRent: 2_400 });
    const result = calculateAnalysis(values);
    expect(getDealTier(result)).toBe("Solid");
    const bp = solveBreakpoints(values, result);
    expect(bp).not.toBeNull();
    expect(bp!.currentTier).toBe("Solid");
    expect(bp!.targetTier).toBe("Strong");
  });

  it("targets Solid (skipping Mixed) when current tier is Marginal", () => {
    // Marginal → next tier up is Solid, NOT Mixed. The solver
    // deliberately jumps to the first "clearly OK" tier rather than
    // recommending a marginal-to-mixed upgrade.
    const values = baseSingleFamily({ monthlyRent: 1_900 });
    const result = calculateAnalysis(values);
    expect(getDealTier(result)).toBe("Marginal");
    const bp = solveBreakpoints(values, result);
    expect(bp).not.toBeNull();
    expect(bp!.targetTier).toBe("Solid");
  });
});

describe("solveBreakpoints — Mixed deal becomes Solid", () => {
  const values = baseSingleFamily({ monthlyRent: 2_100 });
  const result = calculateAnalysis(values);

  it("starts at Mixed", () => {
    expect(getDealTier(result)).toBe("Mixed");
  });

  it("surfaces a price breakpoint below current price", () => {
    const bp = solveBreakpoints(values, result);
    expect(bp).not.toBeNull();
    expect(bp!.priceBreakpoint).not.toBeNull();
    expect(bp!.priceBreakpoint!).toBeLessThan(values.purchasePrice!);
    expect(bp!.priceDeltaPct).toBeGreaterThan(0);
    expect(bp!.priceDeltaPct!).toBeLessThanOrEqual(30);
  });

  it("surfaces a rent breakpoint above current rent", () => {
    const bp = solveBreakpoints(values, result);
    expect(bp).not.toBeNull();
    expect(bp!.rentBreakpointMonthly).not.toBeNull();
    expect(bp!.rentBreakpointMonthly!).toBeGreaterThan(values.monthlyRent!);
    expect(bp!.rentDeltaPct).toBeGreaterThan(0);
    expect(bp!.rentDeltaPct!).toBeLessThanOrEqual(30);
  });

  it("echoes the current price and current rent for caller display", () => {
    const bp = solveBreakpoints(values, result);
    expect(bp!.currentPrice).toBe(values.purchasePrice);
    expect(bp!.currentRentMonthly).toBe(values.monthlyRent);
  });

  it("applying the suggested price drop actually crosses to Solid", () => {
    const bp = solveBreakpoints(values, result);
    const adjusted: InvestmentFormValues = {
      ...values,
      purchasePrice: bp!.priceBreakpoint!,
    };
    const newResult = calculateAnalysis(adjusted);
    const newTier = getDealTier(newResult);
    // Must reach AT LEAST Solid — could land at Strong if the
    // jump from Mixed→Solid happens to vault further at that step.
    expect(["Solid", "Strong"]).toContain(newTier);
  });

  it("applying the suggested rent lift actually crosses to Solid", () => {
    const bp = solveBreakpoints(values, result);
    const adjusted: InvestmentFormValues = {
      ...values,
      monthlyRent: bp!.rentBreakpointMonthly!,
    };
    const newResult = calculateAnalysis(adjusted);
    expect(["Solid", "Strong"]).toContain(getDealTier(newResult));
  });
});

describe("solveBreakpoints — unfixable deal", () => {
  it("returns null deltas for a deeply-broken deal", () => {
    // Property with absurdly mismatched economics — even a 30% price
    // cut OR 30% rent lift can't pencil it to Solid. Solver should
    // return the result object but with null deltas in BOTH dimensions
    // (or hide entirely if neither finds a breakpoint).
    const values = baseSingleFamily({
      monthlyRent: 600, // ~25% of base
      purchasePrice: 245_000, // unchanged
    });
    const result = calculateAnalysis(values);
    expect(getDealTier(result)).toBe("Negative");
    const bp = solveBreakpoints(values, result);
    // Either bp is null (caller hides the card) OR both dimensions
    // failed (rentBreakpointMonthly + priceBreakpoint both null).
    if (bp != null) {
      const noPath =
        bp.priceBreakpoint == null && bp.rentBreakpointMonthly == null;
      expect(noPath).toBe(true);
    }
  });
});

describe("solveBreakpoints — multi-unit", () => {
  it("returns rentDeltaPct but null rentBreakpointMonthly for multi-unit", () => {
    // For multi-unit deals there's no single per-unit rent number that
    // makes sense to surface — the caller renders a percentage lift
    // ("+8% rents across units") instead of a dollar target.
    const values = baseMultiUnit();
    const result = calculateAnalysis(values);
    if (getDealTier(result) === "Strong") {
      // Skip if randomly Strong — wouldn't exercise the path.
      return;
    }
    const bp = solveBreakpoints(values, result);
    expect(bp).not.toBeNull();
    // currentRentMonthly is null for multi-unit (no single rent).
    expect(bp!.currentRentMonthly).toBeNull();
    // rentBreakpointMonthly is therefore also null...
    expect(bp!.rentBreakpointMonthly).toBeNull();
    // ...but rentDeltaPct should still be a valid percentage.
    if (bp!.rentDeltaPct != null) {
      expect(bp!.rentDeltaPct).toBeGreaterThan(0);
      expect(bp!.rentDeltaPct).toBeLessThanOrEqual(30);
    }
  });
});

describe("solveBreakpoints — cash purchase edge case", () => {
  it("doesn't blow up on a 100%-down cash deal", () => {
    // Cash purchases set DSCR to 0/undefined. Solver should still run
    // through the rent + price sweep without throwing or returning a
    // garbage result.
    const values = baseSingleFamily({
      monthlyRent: 1_500,
      downPaymentPct: 100,
    });
    const result = calculateAnalysis(values);
    expect(result.monthlyPayment).toBeLessThanOrEqual(0);
    // Don't care WHICH tier — just that solveBreakpoints returns
    // either null (if already Strong) or a sensible result (if not).
    expect(() => solveBreakpoints(values, result)).not.toThrow();
    const bp = solveBreakpoints(values, result);
    if (bp != null) {
      // Target tier must be a real tier name.
      expect(["Solid", "Strong"]).toContain(bp.targetTier);
    }
  });
});
