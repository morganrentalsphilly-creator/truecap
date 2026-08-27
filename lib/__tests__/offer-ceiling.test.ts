import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateMaxAllowableOffer, meetsTarget } from "@/lib/max-allowable-offer";
import { MIN_PURCHASE_PRICE } from "@/lib/investcalc-schema";
import {
  buildOfferCeilingRangePreview,
  buildOfferCeilingPresentation,
  rankOfferCeilingConstraints,
} from "@/lib/offer-ceiling";
import { isAdoptedOfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

const values: InvestmentFormValues = {
  propertyType: "single-family",
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  purchasePrice: 265_000,
  bedrooms: 3,
  bathrooms: 1,
  sqft: 1400,
  monthlyRent: 2_100,
  units: [],
  downPaymentPct: 20,
  interestRate: 7,
  loanTermYears: 30,
  closingCostsPct: 3,
  propertyTaxInputMode: "percent",
  propertyTaxPct: 1.1,
  insuranceInputMode: "percent",
  insurancePct: 0.5,
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
} as InvestmentFormValues;

describe("Offer Ceiling presentation model", () => {
  it("does not treat product screening defaults as the investor's adopted targets", () => {
    expect(isAdoptedOfferCeilingTargetSource("screening-defaults")).toBe(false);
    expect(isAdoptedOfferCeilingTargetSource("starter-criteria")).toBe(true);
    expect(isAdoptedOfferCeilingTargetSource("selected-targets")).toBe(true);
    expect(isAdoptedOfferCeilingTargetSource("buy-box")).toBe(true);
  });

  it("labels explicitly adopted starter criteria without calling them user-selected", () => {
    const target = { monthlyCashFlow: 0, dscr: 1.25 };
    const solved = calculateMaxAllowableOffer(values, target);
    expect(solved).not.toBeNull();
    if (!solved) return;

    expect(
      buildOfferCeilingPresentation({
        values,
        result: solved,
        source: "starter-criteria",
      }).sourceLabel,
    ).toBe("Under TrueCap starter criteria");
  });

  it("adds source, list gap, binding constraint, and re-solved uncertainty range", () => {
    const target = { monthlyCashFlow: 0, dscr: 1.25 };
    const solved = calculateMaxAllowableOffer(values, target);
    expect(solved).not.toBeNull();
    if (!solved) return;

    const presentation = buildOfferCeilingPresentation({
      values,
      result: solved,
      source: "screening-defaults",
    });
    expect(presentation.sourceLabel).toBe("Under screening defaults");
    expect(presentation.listPriceGap).toBe(values.purchasePrice - solved.maxPrice);
    expect(presentation.bindingConstraints.length).toBeGreaterThan(0);
    expect(presentation.range.base).toBe(solved.maxPrice);
    expect(presentation.range.lower).not.toBeNull();
    expect(presentation.range.upper).not.toBeNull();
    if (presentation.range.lower != null) {
      const downside = {
        ...values,
        monthlyRent: values.monthlyRent! * 0.95,
        interestRate: values.interestRate + 0.5,
        vacancyPct: values.vacancyPct + 2,
        purchasePrice: presentation.range.lower,
      };
      expect(meetsTarget(calculateAnalysis(downside), target)).toBe(true);
    }
  });

  it("names multiple constraints when they bind at the same exact cap", () => {
    const atCap = calculateAnalysis({ ...values, purchasePrice: 200_000 });
    const solved = calculateMaxAllowableOffer(values, {
      maxPurchasePrice: 200_000,
      monthlyCashFlow: atCap.netCashFlow,
    });
    expect(solved?.maxPrice).toBe(200_000);
    if (!solved) return;
    expect(rankOfferCeilingConstraints(solved).slice(0, 2).map((item) => item.normalizedSlack)).toEqual([
      0,
      0,
    ]);
    const presentation = buildOfferCeilingPresentation({
      values,
      result: solved,
      source: "buy-box",
    });
    expect(presentation.bindingConstraints.map((item) => item.key)).toEqual([
      "cash-flow",
      "purchase-price",
    ]);
    expect(presentation.nextConstraint).toBeNull();
  });

  it("represents an infeasible downside honestly instead of inventing a floor", () => {
    const solved = calculateMaxAllowableOffer(values, { monthlyCashFlow: 10_000 });
    expect(solved).toBeNull();
  });

  it("returns only a coarse free preview interval", () => {
    const preview = buildOfferCeilingRangePreview(values, {
      monthlyCashFlow: 0,
      dscr: 1.25,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;
    expect(preview?.increment).toBe(25_000);
    expect(preview.lower).not.toBeNull();
    if (preview.lower == null) return;
    expect(preview.lower % 25_000).toBe(0);
    expect(preview.upper % 25_000).toBe(0);
    expect(preview.upper).toBeGreaterThan(preview.lower);
    expect(preview.downsideFeasible).toBe(true);
  });

  it("does not expose a caller-controlled purchase-price cap through the free preview", () => {
    const target = { monthlyCashFlow: 0, dscr: 1.25 };
    const withoutCap = buildOfferCeilingRangePreview(values, target);
    const queriedCaps = [
      100_123,
      137_500,
      199_999,
      200_000,
      212_345,
      250_001,
      999_999,
    ];

    for (const maxPurchasePrice of queriedCaps) {
      const preview = buildOfferCeilingRangePreview(values, {
        ...target,
        maxPurchasePrice,
      });
      expect(preview).toEqual(withoutCap);
      expect(preview).not.toBeNull();
      if (!preview) continue;
      if (preview.lower != null) {
        expect(preview.lower % 25_000).toBe(0);
      }
      expect(preview.upper % 25_000).toBe(0);
      if (maxPurchasePrice % 25_000 !== 0) {
        if (preview.lower != null) expect(preview.lower).not.toBe(maxPurchasePrice);
        expect(preview.upper).not.toBe(maxPurchasePrice);
      }
    }

    expect(
      buildOfferCeilingRangePreview(values, { maxPurchasePrice: 200_000 })
    ).toBeNull();
  });

  it("preserves an infeasible downside and never manufactures a $0 floor", () => {
    const preview = buildOfferCeilingRangePreview(SAMPLE_DEAL_VALUES, {
      monthlyCashFlow: 2_191,
    });

    expect(preview).not.toBeNull();
    expect(preview?.downsideFeasible).toBe(false);
    expect(preview?.lower).toBeNull();
    expect(preview?.upper).toBeGreaterThanOrEqual(MIN_PURCHASE_PRICE);
    expect(preview?.upper).not.toBe(0);
  });
});
