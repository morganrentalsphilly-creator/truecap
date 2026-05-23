/**
 * Max Allowable Offer (MAO) solver.
 *
 * Given the current property inputs and one-or-more target return
 * thresholds (cap rate, cash-on-cash, monthly cash flow), find the
 * highest purchase price that still hits ALL the targets.
 *
 * Implementation: numeric binary search on purchase price. We reuse
 * calculateAnalysis untouched so the math stays consistent with what
 * the rest of the app shows. ~25 iterations × ~10ms = ~250ms worst
 * case, debounced via useMemo on the consumer side.
 */

import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { InvestmentFormValues } from "@/lib/investcalc-schema";

export type MaoTarget = {
  /** Target cap rate as a percent (e.g. 8 for 8%). */
  capRate?: number;
  /** Target cash-on-cash return as a percent. */
  cocReturn?: number;
  /** Target monthly net cash flow in dollars (can be 0 or negative). */
  monthlyCashFlow?: number;
};

export type MaoResult = {
  /** The targets we solved for. Echoed back for display. */
  target: MaoTarget;
  /** Highest price that satisfies all provided targets, in dollars. */
  maxPrice: number;
  /** AnalysisResult at the solved price — useful for the "at this price you'd get..." readout. */
  achieved: AnalysisResult;
};

/** Solver — returns null if no targets given or if even the lowest tested price fails. */
export function calculateMaxAllowableOffer(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { minPrice?: number; maxPrice?: number; iterations?: number }
): MaoResult | null {
  const hasAnyTarget =
    target.capRate !== undefined ||
    target.cocReturn !== undefined ||
    target.monthlyCashFlow !== undefined;
  if (!hasAnyTarget) return null;

  // Sanity bounds. Investors searching this tool will be looking at prices
  // between $10k (a vacant lot) and $10M (small commercial).
  const minPrice = opts?.minPrice ?? 10_000;
  const maxPrice = opts?.maxPrice ?? 10_000_000;
  const iterations = opts?.iterations ?? 28;

  const meetsTargets = (r: AnalysisResult): boolean => {
    if (target.capRate !== undefined && r.capRate < target.capRate) return false;
    if (target.cocReturn !== undefined && r.cocReturn < target.cocReturn) return false;
    if (target.monthlyCashFlow !== undefined && r.netCashFlow < target.monthlyCashFlow) return false;
    return true;
  };

  // Quick reject: if the minimum-price scenario already fails, the targets
  // are unreachable regardless of how cheap the deal is (some
  // expense-as-percent items grow with price too, but in normal ranges a
  // lower price means stronger returns).
  let lo = minPrice;
  let hi = maxPrice;
  try {
    const minResult = calculateAnalysis({ ...values, purchasePrice: minPrice });
    if (!meetsTargets(minResult)) return null;
  } catch {
    return null;
  }

  let best: { price: number; result: AnalysisResult } | null = null;

  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    let result: AnalysisResult;
    try {
      result = calculateAnalysis({ ...values, purchasePrice: mid });
    } catch {
      // If calc throws at this price, treat as fail and search lower.
      hi = mid;
      continue;
    }
    if (meetsTargets(result)) {
      best = { price: mid, result };
      // Targets met → can we go higher?
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!best) return null;
  return {
    target,
    // Round to nearest $500 so the UI shows clean numbers, not $268,431.50.
    maxPrice: Math.round(best.price / 500) * 500,
    achieved: best.result,
  };
}
