import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
  type DealRecommendation,
  type DealRiskLevel,
  type DealScoreBreakdown,
} from "@/lib/deal-score";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";

/**
 * Re-score a saved deal with the CURRENT scoring engine from its stored form
 * snapshot.
 *
 * Saved deals persist their score/recommendation/risk at save time. When the
 * scoring engine changes (e.g. the holistic total-return upgrade), every deal
 * saved before the change carries a STALE verdict — so the dashboard and the
 * saved-deals list would show "Avoid / 0" on a deal the analyzer now scores
 * "Neutral / 40", contradicting each other. Recomputing on read keeps every
 * surface in lockstep with the live engine without a DB backfill.
 *
 * Uses the Balanced lens — these are portfolio/list views, not a single-deal
 * investor-lens view. Pure (calc + score only), so it's safe in a Server
 * Component. Returns null when the snapshot doesn't validate (legacy/garbage
 * shape), in which case the caller falls back to the stored values.
 */
export function recomputeSavedDealVerdict(formSnapshot: unknown): {
  score: number;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  breakdown: DealScoreBreakdown;
  /** Debt-service coverage ratio; 0 for a cash purchase (no debt to cover). */
  dscr: number;
  /** True for an all-cash purchase (no loan) — the canonical calc-analysis
   *  definition (monthlyPayment <= 0). Distinguishes a cash deal from a
   *  financed deal that merely recomputed to DSCR 0. */
  isCashPurchase: boolean;
  /** Cash needed to close (down payment + closing costs). */
  cashToClose: number;
  /** Monthly net cash flow ($). Recomputed so list/dashboard/compare match the
   *  live engine instead of drifting from the stored snapshot. */
  netCashFlowMonthly: number;
  /** Cap rate (%). */
  capRatePct: number;
  /** Cash-on-cash return (%). */
  cocReturnPct: number;
  /** Net-cash-flow bridge components — all from this same recompute so the
   *  compare tooltip reconciles: rent − opex − P&I − PMI = net cash flow. */
  monthlyRentalIncome: number;
  totalOperatingExpenses: number;
  monthlyPayment: number;
  pmiMonthly: number;
  /** Monthly tax savings ($) from the current tax model. Recomputed so Compare
   *  never shows a stale over-sheltered figure (the CapEx-out-of-taxable fix)
   *  next to fresh Net CF. */
  taxSavingsMonthly: number;
  /** After-tax cash flow ($/mo) = netCashFlow + taxSavingsMonthly — from the
   *  SAME recompute so the row reconciles with the fresh Net CF + Tax Savings
   *  rows instead of reading a stale stored snapshot. */
  afterTaxCF: number;
} | null {
  // Use the resilient normalizer (same as the editor) rather than a raw
  // safeParse, so legacy snapshots that open fine in the editor recompute
  // here too instead of silently falling back to a stale stored score.
  const values = normalizeInvestmentFormSnapshot(formSnapshot);
  if (!values) return null;
  try {
    const result = calculateAnalysis(values);
    const scored = computeDealScore(buildDealScoreInputFromAnalysis(values, result));
    return {
      score: scored.score,
      recommendation: scored.recommendation,
      riskLevel: scored.riskLevel,
      breakdown: scored.breakdown,
      dscr: result.dscr,
      isCashPurchase: result.monthlyPayment <= 0,
      cashToClose: result.totalCashRequired,
      netCashFlowMonthly: result.netCashFlow,
      capRatePct: result.capRate,
      cocReturnPct: result.cocReturn,
      monthlyRentalIncome: result.monthlyRentalIncome,
      totalOperatingExpenses: result.totalOperatingExpenses,
      monthlyPayment: result.monthlyPayment,
      pmiMonthly: result.pmiMonthly,
      taxSavingsMonthly: result.taxSavingsMonthly,
      afterTaxCF: result.afterTaxCF,
    };
  } catch {
    return null;
  }
}
