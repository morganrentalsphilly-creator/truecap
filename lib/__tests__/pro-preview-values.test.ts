import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { buildExitScenarios, resolveExitScenarioRates } from "../exit-scenarios";
import type { InvestmentFormValues } from "../investcalc-schema";
import { buildProPreviewValues, formatProPreviewMoney } from "../pro-preview-values";

// ──────────────────────────────────────────────────────────────────
// Pro-gate teaser tiles — must recite the ENGINES, not proxy math.
//
// The blurred previews personalize with "your real deal numbers"; before
// this module existed they were hand-rolled approximations that diverged
// 7–54× from what the paid panels showed after upgrade.
// ──────────────────────────────────────────────────────────────────

function baseValues(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 300_000,
    yearBuilt: 2005,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_400,
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
    ...overrides,
  } as InvestmentFormValues;
}

describe("buildProPreviewValues", () => {
  const values = baseValues();
  const result = calculateAnalysis(values);

  it("projections tiles come from the embedded ten-year projection", () => {
    const tiles = buildProPreviewValues("projections", result, values);
    expect(tiles).not.toBeNull();
    const projection = result.tenYearProjection;
    const lastYear = projection[projection.length - 1]!;
    const bestAnnualCashFlow = Math.max(...projection.map((y) => y.netCashFlowAnnual));
    const totalOperatingCashFlow = projection.reduce((sum, y) => sum + y.netCashFlowAnnual, 0);
    expect(tiles![0]).toBe(formatProPreviewMoney(lastYear.cumulativeCashFlowAnnual));
    expect(tiles![1]).toBe(formatProPreviewMoney(bestAnnualCashFlow));
    expect(tiles![2]).toBe(formatProPreviewMoney(totalOperatingCashFlow));
  });

  it("tax-strategy tiles come from the embedded tax-strategy years", () => {
    const tiles = buildProPreviewValues("tax-strategy", result, values);
    expect(tiles).not.toBeNull();
    const year1 = result.taxStrategyYears[0]!;
    const lastYear = result.taxStrategyYears[result.taxStrategyYears.length - 1]!;
    expect(tiles![0]).toBe(formatProPreviewMoney(year1.taxableRentalIncomeAnnual));
    expect(tiles![1]).toBe(formatProPreviewMoney(year1.taxSavingsAnnual));
    expect(tiles![2]).toBe(formatProPreviewMoney(lastYear.cumulativeTaxBenefitAnnual));
  });

  it("exit-scenarios tiles match the real exit engine (same inputs as the Pro panel)", () => {
    const tiles = buildProPreviewValues("exit-scenarios", result, values);
    expect(tiles).not.toBeNull();
    const exitYears = buildExitScenarios({
      purchasePrice: values.purchasePrice,
      ...resolveExitScenarioRates(values),
      loanAmount: result.loanAmount,
      interestRate: values.interestRate,
      loanTermYears: values.loanTermYears,
      monthlyPayment: result.monthlyPayment,
      downPayment: result.downPayment,
      closingCosts: result.closingCosts,
      initialCashInvested: result.totalCashRequired,
      cumulativeCashFlowByYear: result.tenYearProjection.map((y) => y.cumulativeCashFlowAnnual),
      cumulativeTaxBenefitByYear: result.taxStrategyYears.map((y) => y.cumulativeTaxBenefitAnnual),
      annualDepreciation: result.taxStrategyYears[0]?.depreciationDeductionAnnual ?? 0,
    });
    const bestYear = exitYears.reduce((best, y) => (y.totalProfit > best.totalProfit ? y : best));
    const year5 = exitYears.find((y) => y.year === 5)!;
    const year10 = exitYears.find((y) => y.year === 10)!;
    expect(tiles![0]).toBe(`Year ${bestYear.year}`);
    expect(tiles![1]).toBe(formatProPreviewMoney(year5.totalProfit));
    expect(tiles![2]).toBe(
      `${Math.round((year10.totalProfit / result.totalCashRequired) * 100)}%`
    );
  });

  it("strategies returns null — BRRRR/flip need inputs the user hasn't given", () => {
    expect(buildProPreviewValues("strategies", result, values)).toBeNull();
  });

  it("guards nulls: no result / missing values fall back to the placeholder", () => {
    expect(buildProPreviewValues("projections", null, values)).toBeNull();
    expect(buildProPreviewValues("exit-scenarios", result, null)).toBeNull();
  });

  it("formats negative money with a leading minus (loss tiles must not read as gains)", () => {
    expect(formatProPreviewMoney(-1_809)).toBe("-$1,809");
    expect(formatProPreviewMoney(16_799)).toBe("$16,799");
  });
});
