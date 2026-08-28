import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdvancedBuyAndHoldSummary,
  RenovationModelDisclosure,
} from "@/components/investcalc/advanced-buy-and-hold-summary";
import { buildMetricTiles } from "@/components/investcalc/metrics-band";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import {
  SIMPLIFIED_RENOVATION_DOWNTIME_LABEL,
  STEADY_STATE_RENOVATION_LABEL,
} from "@/lib/financial-presentation";
import {
  investmentFormSchema,
  normalizeInvestmentFormSnapshot,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { buildPublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { reportDataSchema } from "@/lib/report-payload-schema";
import { buildTenYearProjection } from "@/lib/ten-year-projections";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";

const NOW = new Date("2026-08-27T12:00:00.000Z");

function deal(
  overrides: Partial<InvestmentFormValues> = {},
): InvestmentFormValues {
  return investmentFormSchema.parse({
    propertyType: "single-family",
    address: "11 Complete Input Way, Philadelphia, PA 19103",
    purchasePrice: 300_000,
    yearBuilt: 2000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1_500,
    monthlyRent: 2_500,
    units: [],
    downPaymentPct: 20,
    interestRate: 6,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxInputMode: "percent",
    propertyTaxPct: 1.2,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 85,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    pmiAnnualRatePct: 0,
    ...overrides,
  });
}

describe("released buy-and-hold input completeness", () => {
  it("adds recurring other income after rent-only vacancy and rent-linked costs", () => {
    const withoutOtherIncome = calculateAnalysis(deal()) as AnalysisResult;
    const withOtherIncome = calculateAnalysis(
      deal({ recurringOtherIncomeMonthly: 100 }),
    ) as AnalysisResult;

    expect(withOtherIncome.grossScheduledIncomeAnnual).toBe(
      withoutOtherIncome.grossScheduledIncomeAnnual,
    );
    expect(withOtherIncome.vacancyAllowanceAnnual).toBe(
      withoutOtherIncome.vacancyAllowanceAnnual,
    );
    expect(withOtherIncome.maintenance).toBe(withoutOtherIncome.maintenance);
    expect(withOtherIncome.management).toBe(withoutOtherIncome.management);
    expect(withOtherIncome.capex).toBe(withoutOtherIncome.capex);
    expect(withOtherIncome.effectiveGrossIncomeAnnual).toBe(
      withoutOtherIncome.effectiveGrossIncomeAnnual + 1_200,
    );
    expect(withOtherIncome.noiAnnual).toBe(
      withoutOtherIncome.noiAnnual + 1_200,
    );
    expect(withOtherIncome.annualCashFlow).toBeCloseTo(
      withoutOtherIncome.annualCashFlow + 1_200,
      8,
    );
    expect(withOtherIncome.tenYearProjection[0].rentalIncomeAnnual).toBe(
      withoutOtherIncome.tenYearProjection[0].rentalIncomeAnnual + 1_200,
    );
    expect(withOtherIncome.tenYearProjection[0].operatingExpensesAnnual).toBe(
      withoutOtherIncome.tenYearProjection[0].operatingExpensesAnnual,
    );
  });

  it("grows fixed dollars with expense growth and percentages with projected rent", () => {
    const projection = buildTenYearProjection({
      monthlyRentalIncome: 1_100,
      scheduledRentMonthly: 1_000,
      recurringOtherIncomeMonthly: 100,
      fixedOperatingExpensesMonthly: 500,
      vacancyPct: 5,
      maintenancePct: 5,
      managementPct: 5,
      capexPct: 5,
      percentageExpenseRounding: "annual",
      totalOperatingExpenses: 700,
      capexReserveMonthly: 50,
      monthlyPayment: 0,
      loanAmount: 0,
      purchasePrice: 100_000,
      pmiMonthly: 0,
      taxSavingsMonthly: 0,
      annualDepreciation: 0,
      rentGrowthPct: 10,
      expenseGrowthPct: 2,
      taxRate: 0,
      includeInterestDeduction: false,
    });

    expect(projection[0]).toMatchObject({
      rentalIncomeAnnual: 13_200,
      operatingExpensesAnnual: 8_400,
    });
    // Year 2: fixed = $500 × 12 × 1.02; rent-linked = $1,100 × 20% × 12.
    expect(projection[1]).toMatchObject({
      rentalIncomeAnnual: 14_520,
      operatingExpensesAnnual: 8_760,
    });
  });

  it("reconciles every fixed recurring cost and modeled cash-to-close item", () => {
    const values = deal({
      recurringOtherExpenseMonthly: 200,
      turnoverReserveMonthly: 100,
      leasingReserveMonthly: 75,
      landscapingMonthly: 50,
      pestControlMonthly: 25,
      administrativeMonthly: 40,
      closingCostsInputMode: "fixed",
      closingCostsFixed: 9_000,
      loanPointsPct: 2,
      originationFee: 1_200,
      loanFees: 800,
      initialReserve: 3_000,
      lenderEscrowDeposit: 2_000,
      lenderReserveDeposit: 4_000,
      rehabBudget: 5_000,
      strFurnishingCost: 1_000,
      acquisitionCredits: 2_500,
    });
    const baseline = calculateAnalysis(deal()) as AnalysisResult;
    const result = calculateAnalysis(values) as AnalysisResult;

    expect(result.operatingExpensesAnnual).toBe(
      baseline.operatingExpensesAnnual + 490 * 12,
    );
    expect(result.noiAnnual).toBe(baseline.noiAnnual - 490 * 12);
    expect(result.closingCosts).toBe(9_000);
    expect(result.loanPointsAmount).toBe(4_800);
    expect(result.totalCashRequired).toBe(88_300);

    const reopened = normalizeInvestmentFormSnapshot(
      JSON.parse(JSON.stringify(values)),
    );
    expect(reopened).toMatchObject({
      recurringOtherExpenseMonthly: 200,
      turnoverReserveMonthly: 100,
      leasingReserveMonthly: 75,
      landscapingMonthly: 50,
      pestControlMonthly: 25,
      administrativeMonthly: 40,
      closingCostsInputMode: "fixed",
      closingCostsFixed: 9_000,
      loanPointsPct: 2,
      originationFee: 1_200,
      lenderEscrowDeposit: 2_000,
      lenderReserveDeposit: 4_000,
      acquisitionCredits: 2_500,
    });
  });

  it("uses one IO/amortization/maturity schedule and discloses the balloon everywhere", () => {
    const values = deal({
      loanTermYears: 5,
      amortizationTermYears: 30,
      interestOnlyMonths: 12,
      currentPropertyValue: 310_000,
      stabilizedPropertyValue: 360_000,
      operatingScenario: "current",
    });
    const result = calculateAnalysis(values) as AnalysisResult;
    const maturityYear = result.tenYearProjection[4];

    expect(result.initialMonthlyLoanPayment).toBeCloseTo(1_200, 10);
    expect(result.amortizingMonthlyLoanPayment).toBeCloseTo(
      1_438.9212603666058,
      10,
    );
    expect(result.annualDebtService).toBeCloseTo(14_400, 8);
    expect(result.balloonMonth).toBe(60);
    expect(result.balloonPayment).toBeGreaterThan(200_000);
    expect(maturityYear.balloonPaymentAnnual).toBeCloseTo(
      result.balloonPayment ?? 0,
      8,
    );
    expect(maturityYear.financingOutflowAnnual).toBeCloseTo(
      maturityYear.debtServiceAnnual + (maturityYear.balloonPaymentAnnual ?? 0),
      8,
    );
    expect(maturityYear.netCashFlowAnnual).toBeCloseTo(
      maturityYear.rentalIncomeAnnual -
        maturityYear.operatingExpensesAnnual -
        (maturityYear.financingOutflowAnnual ?? 0),
      8,
    );

    const html = renderToStaticMarkup(
      <AdvancedBuyAndHoldSummary result={result} values={values} />,
    );
    expect(html).toContain("interest-only for 12 months");
    expect(html).toContain("Month 60");
    expect(html).toContain("exclude the maturity balloon");
    expect(html).toContain("includes it in net and cumulative cash flow");
    const metricHtml = renderToStaticMarkup(
      <>
        {
          buildMetricTiles({
            displayResult: result,
            result,
            isLoading: false,
            propertyType: values.propertyType,
            annualizedReturnPct: null,
          }).cashFlow
        }
      </>,
    );
    expect(metricHtml).toContain("Recurring Monthly Cash Flow (excl. balloon)");

    const report = buildCanonicalReportData({ values, generatedAt: NOW });
    expect(report.financing).toMatchObject({
      interestOnlyMonths: 12,
      amortizationTermYears: 30,
      maturityTermYears: 5,
      balloonMonth: 60,
    });
    expect(report.financing.initialMonthlyPayment).toBeCloseTo(1_200, 10);
    expect(report.financing.balloonPayment).toBeCloseTo(
      result.balloonPayment ?? 0,
      8,
    );
    expect(report.operatingStatement?.balloonPayment).toBeCloseTo(
      result.balloonPayment ?? 0,
      8,
    );
    expect(report.projection10y.rows[4].balloon).toBeCloseTo(
      result.balloonPayment ?? 0,
      8,
    );
    expect(() =>
      reportDataSchema.parse(JSON.parse(JSON.stringify(report))),
    ).not.toThrow();

    const shared = buildPublicShareAnalysisPayload(result, false);
    expect(shared.result).toMatchObject({
      interestOnlyMonths: 12,
      amortizationTermYears: 30,
      loanMaturityTermYears: 5,
      balloonMonth: 60,
      balloonPayment: result.balloonPayment,
    });
  });

  it("models only simplified renovation rent downtime and gives the exact fallback", () => {
    const detailedValues = deal({
      rehabBudget: 10_000,
      renovationStartMonth: 3,
      renovationDurationMonths: 4,
      renovationRentLossPct: 50,
    });
    const result = calculateAnalysis(detailedValues) as AnalysisResult;

    expect(result.renovationIncomeLossAnnual).toBe(5_000);
    expect(result.tenYearProjection[0].renovationIncomeLossAnnual).toBe(5_000);
    expect(
      renderToStaticMarkup(
        <RenovationModelDisclosure values={detailedValues} />,
      ),
    ).toContain(SIMPLIFIED_RENOVATION_DOWNTIME_LABEL);
    expect(
      renderToStaticMarkup(
        <RenovationModelDisclosure values={deal({ rehabBudget: 10_000 })} />,
      ),
    ).toContain(STEADY_STATE_RENOVATION_LABEL);
  });

  it("uses the selected unit-level stabilized rent roll and preserves it", () => {
    const values = deal({
      propertyType: "multi-family",
      monthlyRent: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      sqft: undefined,
      operatingScenario: "stabilized",
      units: [
        { monthlyRent: 1_000, stabilizedMonthlyRent: 1_200 },
        { monthlyRent: 1_500, stabilizedMonthlyRent: 1_800 },
      ],
    });
    const result = calculateAnalysis(values) as AnalysisResult;

    expect(result.monthlyRentalIncome).toBe(3_000);
    expect(result.scenarioRentMonthly).toBe(3_000);
    expect(normalizeInvestmentFormSnapshot(values)?.units).toMatchObject([
      { monthlyRent: 1_000, stabilizedMonthlyRent: 1_200 },
      { monthlyRent: 1_500, stabilizedMonthlyRent: 1_800 },
    ]);
    expect(
      buildCanonicalReportData({ values, generatedAt: NOW }).units,
    ).toMatchObject([
      { rent: 1_000, stabilizedRent: 1_200 },
      { rent: 1_500, stabilizedRent: 1_800 },
    ]);
  });

  it("fails closed on every nonempty refinance payload and unsafe acquisition terms", () => {
    const completeRefinance = {
      ...deal(),
      refinanceMonth: 24,
      refinanceLtvPct: 75,
      refinanceInterestRatePct: 6.25,
      refinanceAmortizationTermYears: 30,
      refinanceLoanTermYears: 30,
      refinanceClosingCostsPct: 2,
    } as InvestmentFormValues;

    for (const parser of [investmentFormSchema, releasedInvestmentFormSchema]) {
      const parsed = parser.safeParse(completeRefinance);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.map((issue) => issue.message)).toContain(
          "Refinance lifecycle modeling is not released; remove these assumptions to run the buy-and-hold analysis",
        );
      }
    }
    expect(normalizeInvestmentFormSnapshot(completeRefinance)).toBeNull();
    expect(() => calculateAnalysis(completeRefinance)).toThrow(
      "Refinance lifecycle modeling is not released",
    );

    expect(
      investmentFormSchema.safeParse({
        ...deal(),
        acquisitionCredits: 1_000_000,
      }).success,
    ).toBe(false);
    expect(
      investmentFormSchema.safeParse({
        ...deal({ downPaymentPct: 100 }),
        loanPointsPct: 1,
      }).success,
    ).toBe(false);
  });
});
