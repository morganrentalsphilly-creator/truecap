import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import {
  UNDERWRITING_V1_GOLDEN_CORPUS,
  type UnderwritingV1GoldenExpected,
} from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import { buildMaoTarget } from "@/lib/mao-targets";

const CORPUS_CLOCK = new Date("2026-08-24T12:00:00.000Z");

function captureGoldenOutput(valuesInput: unknown): UnderwritingV1GoldenExpected {
  const values = investmentFormSchema.parse(valuesInput);
  const result = calculateAnalysis(values);
  if (result.methodologyVersion !== "1.0") {
    throw new Error("The reviewed v1 corpus must never dispatch through another methodology");
  }
  const score = computeDealScore(
    buildDealScoreInputFromAnalysis(values, result),
  );
  const year10 = result.tenYearProjection.at(-1);
  const taxYear10 = result.taxStrategyYears.at(-1);

  return {
    methodologyVersion: result.methodologyVersion,
    monthlyRentalIncome: result.monthlyRentalIncome,
    propertyTax: result.propertyTax,
    insurance: result.insurance,
    totalOperatingExpenses: result.totalOperatingExpenses,
    noiAnnual: result.noiAnnual,
    loanAmount: result.loanAmount,
    monthlyPayment: result.monthlyPayment,
    pmiMonthly: result.pmiMonthly,
    netCashFlow: result.netCashFlow,
    cocReturn: result.cocReturn,
    capRate: result.capRate,
    dscr: result.dscr,
    totalCashRequired: result.totalCashRequired,
    taxSavingsMonthly: result.taxSavingsMonthly,
    afterTaxCF: result.afterTaxCF,
    year10CumulativeCashFlow: year10?.cumulativeCashFlowAnnual ?? 0,
    year10CumulativeTaxBenefit:
      taxYear10?.cumulativeTaxBenefitAnnual ?? 0,
    dealScore: score.score,
    dscrScore: score.breakdown.dscrScore,
  };
}

describe("TrueCap Underwriting Standard v1 reviewed golden corpus", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(CORPUS_CLOCK);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("matches every reviewed v1 output exactly", () => {
    for (const entry of UNDERWRITING_V1_GOLDEN_CORPUS) {
      expect(captureGoldenOutput(entry.values), entry.id).toEqual(
        entry.expected,
      );
    }
  });

  it("characterizes cash DSCR as N/A while preserving the current v1 score contract", () => {
    const cashCase = UNDERWRITING_V1_GOLDEN_CORPUS.find(
      (entry) => entry.id === "cash_annual_tax_monthly_insurance",
    );
    expect(cashCase).toBeDefined();
    if (!cashCase) return;

    const values = investmentFormSchema.parse(cashCase.values);
    const result = calculateAnalysis(values);
    const score = computeDealScore(
      buildDealScoreInputFromAnalysis(values, result),
    );
    const target = buildMaoTarget(null, { isCashPurchase: true });

    expect(result.monthlyPayment).toBe(0);
    expect(result.dscr).toBe(0);
    expect(target).toEqual({ monthlyCashFlow: 0 });
    expect(meetsMaoTarget(result, { dscr: 99 })).toBe(true);
    // Characterization only: v1 currently awards full DSCR component credit
    // to a cash purchase even though the displayed ratio is not applicable.
    expect(score.breakdown.dscrScore).toBe(17);
  });
});
