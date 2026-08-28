import type { AnalysisResult } from "@/lib/calc-analysis";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
} from "@/lib/exit-scenarios";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  computeReturnSummaryFromExitYears,
  type IrrAnalysis,
} from "@/lib/returns";

type MaoTargetResult = Pick<
  AnalysisResult,
  | "capRate"
  | "totalCashRequired"
  | "cocReturn"
  | "netCashFlow"
  | "monthlyPayment"
  | "dscr"
  | "loanAmount"
  | "downPayment"
>;

const NO_IRR: IrrAnalysis = {
  status: "none",
  primaryIrrPct: null,
  rootsPct: [],
  reason: "insufficient-periods",
};

/**
 * Calculate the targetable 10-year IRR from the same contribution-aware
 * signed cash-flow timeline used by the return reconciliation surfaces.
 *
 * The Offer Ceiling is a pre-tax acquisition screen: annual personal tax
 * benefits and estimated exit tax rates are both held at zero. Later negative
 * operating years remain external contributions, so they are not hidden in
 * the initial-cash denominator. The complete IrrAnalysis is returned because
 * a multiple-root result is not a single investment target and must fail
 * closed rather than selecting one root.
 */
export function calculateMaoIrr(
  values: InvestmentFormValues,
  result: AnalysisResult,
): IrrAnalysis {
  if (result.tenYearProjection.length === 0) return NO_IRR;
  try {
    const exitYears = buildExitScenarios({
      purchasePrice: values.purchasePrice,
      ...resolveExitScenarioRates(values),
      loanAmount: result.loanAmount,
      interestRate: values.interestRate,
      loanTermYears: values.loanTermYears,
      amortizationTermYears:
        values.amortizationTermYears ?? values.loanTermYears,
      interestOnlyMonths: values.interestOnlyMonths ?? 0,
      monthlyPayment: result.monthlyPayment,
      downPayment: result.downPayment,
      closingCosts: result.closingCosts,
      initialCashInvested: result.totalCashRequired,
      cumulativeCashFlowByYear: result.tenYearProjection.map(
        (year) => year.cumulativeCashFlowAnnual,
      ),
      cumulativeTaxBenefitByYear: result.tenYearProjection.map(() => 0),
      annualDepreciation: 0,
      recaptureTaxRatePct: 0,
      capitalGainsTaxRatePct: 0,
    });
    const summary = computeReturnSummaryFromExitYears(exitYears);
    if (!summary) return NO_IRR;
    return {
      status: summary.irrStatus,
      primaryIrrPct: summary.irrPct,
      rootsPct: summary.irrRootsPct,
      reason: summary.irrReason,
    };
  } catch {
    return NO_IRR;
  }
}

/**
 * Forward target check shared by decision labels and the server-only inverse
 * solver. It contains no price-search logic, so client decision surfaces do
 * not pull the paid Offer Ceiling engine into the browser bundle.
 */
export function meetsMaoTarget(
  result: MaoTargetResult,
  target: MaoTarget,
  values?: InvestmentFormValues,
): boolean {
  if (target.capRate !== undefined && result.capRate < target.capRate)
    return false;
  // A zero-cash denominator makes cash-on-cash mathematically undefined. The
  // engine retains its historical numeric sentinel for snapshot compatibility,
  // but that sentinel must never satisfy or fail a real CoC threshold as 0%.
  // Fail closed until the deal models positive initial cash.
  if (
    target.cocReturn !== undefined &&
    (result.totalCashRequired <= 0 || result.cocReturn < target.cocReturn)
  ) {
    return false;
  }
  if (
    target.monthlyCashFlow !== undefined &&
    result.netCashFlow < target.monthlyCashFlow
  ) {
    return false;
  }
  // DSCR has no economic meaning without debt service.
  if (
    target.dscr !== undefined &&
    result.monthlyPayment > 0 &&
    result.dscr < target.dscr
  ) {
    return false;
  }
  if (
    target.maxPurchasePrice !== undefined &&
    result.loanAmount + result.downPayment > target.maxPurchasePrice
  ) {
    return false;
  }
  if (
    target.maxCashRequired !== undefined &&
    result.totalCashRequired > target.maxCashRequired
  ) {
    return false;
  }
  if (target.minIrrPct !== undefined) {
    // A plain AnalysisResult does not carry a cash-flow-timeline IRR. Callers
    // that do not have the accepted form inputs cannot evaluate this rule and
    // therefore fail it; they must never substitute CAGR, ROI, or a selected
    // root from an ambiguous result.
    if (
      !values ||
      !Array.isArray((result as Partial<AnalysisResult>).tenYearProjection)
    ) {
      return false;
    }
    const irr = calculateMaoIrr(values, result as AnalysisResult);
    if (
      irr.status !== "unique" ||
      irr.primaryIrrPct === null ||
      irr.primaryIrrPct < target.minIrrPct
    ) {
      return false;
    }
  }
  return true;
}
