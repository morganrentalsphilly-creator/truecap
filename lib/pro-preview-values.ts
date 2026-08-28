/**
 * Pro-gate teaser tile values — the user's REAL deal numbers.
 *
 * The blurred Pro previews (analysis-dashboard's ProFeaturePreview) advertise
 * "here's exactly what YOUR deal would show." That promise requires the tiles
 * to come from the same engines the paid panels render — result.tenYearProjection
 * and result.taxStrategyYears are already embedded on every AnalysisResult,
 * and exit scenarios recompute in microseconds from the same inputs the Pro
 * panel uses. Hand-rolled proxy arithmetic here previously overstated tiles
 * 7–54× and contradicted the paid panel at the exact moment of upgrade.
 *
 * Pure module (CLAUDE.md §3.4: no duplicated deal math in components) so the
 * tile↔engine agreement is unit-testable.
 */

import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildExitScenarios, resolveExitScenarioRates } from "@/lib/exit-scenarios";

export type ProPreviewKind = "projections" | "tax-strategy" | "exit-scenarios" | "strategies";

/** Signed whole-dollar money format shared by the teaser tiles. */
export function formatProPreviewMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}

/**
 * The three tile values for a Pro-preview kind, derived from the engines —
 * or null when there is no real number to show (no result yet, empty
 * projection arrays, or a kind whose outputs depend on inputs the user
 * hasn't provided). Null ⇒ the component renders its generic placeholder.
 */
export function buildProPreviewValues(
  kind: ProPreviewKind,
  result: AnalysisResult | null | undefined,
  values: InvestmentFormValues | null | undefined
): [string, string, string] | null {
  if (!result) return null;
  const projection = result.tenYearProjection;
  const taxYears = result.taxStrategyYears;

  if (kind === "projections") {
    // Tiles: Year 10 Cumulative CF / Best Annual CF / 10-Year operating CF —
    // straight from the embedded projection engine. Taxpayer-specific effects
    // remain outside the released projection headline.
    if (!Array.isArray(projection) || projection.length === 0) return null;
    const lastYear = projection[projection.length - 1]!;
    const bestAnnualCashFlow = Math.max(...projection.map((y) => y.netCashFlowAnnual));
    const totalOperatingCashFlow = projection.reduce((sum, y) => sum + y.netCashFlowAnnual, 0);
    return [
      formatProPreviewMoney(lastYear.cumulativeCashFlowAnnual),
      formatProPreviewMoney(bestAnnualCashFlow),
      formatProPreviewMoney(totalOperatingCashFlow),
    ];
  }

  if (kind === "tax-strategy") {
    // Tiles: Year 1 Taxable Income / Year 1 Tax Savings / 10-Year Tax Benefit.
    if (!Array.isArray(taxYears) || taxYears.length === 0) return null;
    const year1 = taxYears[0]!;
    const lastYear = taxYears[taxYears.length - 1]!;
    return [
      formatProPreviewMoney(year1.taxableRentalIncomeAnnual),
      formatProPreviewMoney(year1.taxSavingsAnnual),
      formatProPreviewMoney(lastYear.cumulativeTaxBenefitAnnual),
    ];
  }

  if (kind === "exit-scenarios") {
    // Tiles: Modeled Exit Comparison / Year 5 Profit / Total ROI. Recomputed from
    // the SAME input construction the Pro exit panel + PDF use, so the
    // teaser matches what the upgrade reveals.
    if (
      !values ||
      !Array.isArray(projection) ||
      projection.length === 0 ||
      !Array.isArray(taxYears) ||
      taxYears.length === 0
    ) {
      return null;
    }
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
      cumulativeCashFlowByYear: projection.map((y) => y.cumulativeCashFlowAnnual),
      cumulativeTaxBenefitByYear: taxYears.map((y) => y.cumulativeTaxBenefitAnnual),
      annualDepreciation: taxYears[0]?.depreciationDeductionAnnual ?? 0,
    });
    if (exitYears.length === 0) return null;
    const bestYear = exitYears.reduce((best, y) => (y.totalProfit > best.totalProfit ? y : best));
    const lastYear = exitYears[exitYears.length - 1]!;
    const year5 = exitYears.find((y) => y.year === 5) ?? lastYear;
    const year10 = exitYears.find((y) => y.year === 10) ?? lastYear;
    const totalRoiPct =
      result.totalCashRequired > 0 ? (year10.totalProfit / result.totalCashRequired) * 100 : null;
    return [
      `Year ${bestYear.year}`,
      formatProPreviewMoney(year5.totalProfit),
      totalRoiPct == null ? "—" : `${Math.round(totalRoiPct)}%`,
    ];
  }

  // strategies: BRRRR / fix-and-flip outputs need inputs the user hasn't
  // provided yet (rehab budget, ARV, refi terms) — there is no real per-deal
  // number to personalize with, so return null and let the generic
  // placeholder render rather than inventing one.
  return null;
}
