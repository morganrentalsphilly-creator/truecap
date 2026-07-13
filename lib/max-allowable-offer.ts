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
  /** Target DSCR (e.g. 1.25). Ignored for cash purchases (no debt service). */
  dscr?: number;
};

export type MaoResult = {
  /** The targets we solved for. Echoed back for display. */
  target: MaoTarget;
  /** Highest price that satisfies all provided targets, in dollars. */
  maxPrice: number;
  /** AnalysisResult at maxPrice itself — the "at this price you'd get..." readout
   *  must describe the number the user sees, not the unrounded solver price. */
  achieved: AnalysisResult;
};

/** True when an analysis result satisfies every provided target. Shared by the
 *  price solver and the inverse (required-input) solvers below. */
export function meetsTarget(r: AnalysisResult, target: MaoTarget): boolean {
  if (target.capRate !== undefined && r.capRate < target.capRate) return false;
  if (target.cocReturn !== undefined && r.cocReturn < target.cocReturn) return false;
  if (target.monthlyCashFlow !== undefined && r.netCashFlow < target.monthlyCashFlow) return false;
  if (target.dscr !== undefined && r.dscr < target.dscr) return false;
  return true;
}

function hasAnyTarget(t: MaoTarget): boolean {
  return (
    t.capRate !== undefined ||
    t.cocReturn !== undefined ||
    t.monthlyCashFlow !== undefined ||
    t.dscr !== undefined
  );
}

function safeCalc(values: InvestmentFormValues): AnalysisResult | null {
  try {
    return calculateAnalysis(values);
  } catch {
    return null;
  }
}

/** Solver — returns null if no targets given or if even the lowest tested price fails. */
export function calculateMaxAllowableOffer(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { minPrice?: number; maxPrice?: number; iterations?: number }
): MaoResult | null {
  if (!hasAnyTarget(target)) return null;

  // Sanity bounds. Investors searching this tool will be looking at prices
  // between $10k (a vacant lot) and $10M (small commercial).
  const minPrice = opts?.minPrice ?? 10_000;
  const maxPrice = opts?.maxPrice ?? 10_000_000;
  const iterations = opts?.iterations ?? 28;

  const meetsTargets = (r: AnalysisResult): boolean => meetsTarget(r, target);

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
  // Round DOWN to a $500 step so the UI shows clean numbers, not $268,431.50.
  // Never round to nearest: that can land up to $250 ABOVE the pass/fail
  // boundary and quote a price that fails the very target it claims to clear.
  // Lower price → stronger returns (the bisection above relies on the same
  // monotonicity), so the floored price still passes. Clamp to minPrice —
  // which the quick-reject already verified passes — so flooring can't dip
  // below the solver's own floor when minPrice isn't a $500 multiple.
  const roundedPrice = Math.max(minPrice, Math.floor(best.price / 500) * 500);
  // Recompute the readout AT the displayed price so "at this price you'd
  // get..." describes the number the user actually sees.
  const achievedAtRounded = safeCalc({ ...values, purchasePrice: roundedPrice });
  return {
    target,
    maxPrice: roundedPrice,
    achieved: achievedAtRounded ?? best.result,
  };
}

// ---- Inverse solvers: "what would it take to make THIS price work?" ----

export type RequiredInputResult = {
  /** Solved input value: monthly rent ($) or interest rate (%). */
  value: number;
  /** Current inputs already satisfy the targets — no change needed. */
  alreadyMet: boolean;
  /** No value in the searched range satisfies the targets. */
  unreachable: boolean;
  /** AnalysisResult at the solved value. */
  achieved: AnalysisResult;
};

/**
 * Lowest single-family monthly rent that hits ALL targets at the CURRENT price.
 * Returns null if no targets or monthlyRent isn't a number (multi-family rents
 * are per-unit; solve those on the per-unit fields).
 */
export function solveRequiredMonthlyRent(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { iterations?: number; maxRent?: number }
): RequiredInputResult | null {
  if (!hasAnyTarget(target)) return null;
  const current = Number(values.monthlyRent);
  if (!Number.isFinite(current)) return null;

  const base = safeCalc(values);
  if (base && meetsTarget(base, target)) {
    return { value: current, alreadyMet: true, unreachable: false, achieved: base };
  }

  const iterations = opts?.iterations ?? 28;
  const hi = opts?.maxRent ?? Math.max(current * 4, current + 10_000, 50_000);
  const hiResult = safeCalc({ ...values, monthlyRent: hi });
  if (!hiResult || !meetsTarget(hiResult, target)) {
    return { value: hi, alreadyMet: false, unreachable: true, achieved: hiResult ?? (base as AnalysisResult) };
  }

  // Higher rent always helps — binary-search the LOWEST rent that still meets.
  let lo = 0;
  let hiB = hi;
  let best = hiResult;
  let bestV = hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hiB) / 2;
    const r = safeCalc({ ...values, monthlyRent: mid });
    if (r && meetsTarget(r, target)) {
      best = r;
      bestV = mid;
      hiB = mid;
    } else {
      lo = mid;
    }
  }
  return { value: Math.round(bestV), alreadyMet: false, unreachable: false, achieved: best };
}

/**
 * Highest interest rate that still hits ALL targets at the current price + rent.
 * Returns null if no targets or a cash purchase (no loan → rate is irrelevant).
 */
export function solveRequiredInterestRate(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { iterations?: number; maxRate?: number }
): RequiredInputResult | null {
  if (!hasAnyTarget(target)) return null;
  const base = safeCalc(values);
  if (base && base.monthlyPayment <= 0) return null; // cash purchase
  const current = Number(values.interestRate);
  if (!Number.isFinite(current)) return null;

  if (base && meetsTarget(base, target)) {
    return { value: current, alreadyMet: true, unreachable: false, achieved: base };
  }

  const iterations = opts?.iterations ?? 28;
  const maxRate = opts?.maxRate ?? 20;
  // The lowest rate (0%) gives the strongest returns; if even that fails, no
  // rate can fix it.
  const loResult = safeCalc({ ...values, interestRate: 0 });
  if (!loResult || !meetsTarget(loResult, target)) {
    return { value: 0, alreadyMet: false, unreachable: true, achieved: loResult ?? (base as AnalysisResult) };
  }

  // Lower rate always helps — binary-search the HIGHEST rate that still meets.
  let lo = 0;
  let hi = maxRate;
  let best = loResult;
  let bestV = 0;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const r = safeCalc({ ...values, interestRate: mid });
    if (r && meetsTarget(r, target)) {
      best = r;
      bestV = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { value: Math.round(bestV * 100) / 100, alreadyMet: false, unreachable: false, achieved: best };
}
