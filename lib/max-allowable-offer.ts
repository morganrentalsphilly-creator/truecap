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
import {
  MIN_PURCHASE_PRICE,
  MAX_PURCHASE_PRICE,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";

export type MaoTarget = {
  /** Target cap rate as a percent (e.g. 8 for 8%). */
  capRate?: number;
  /** Target cash-on-cash return as a percent. */
  cocReturn?: number;
  /** Target monthly net cash flow in dollars (can be 0 or negative). */
  monthlyCashFlow?: number;
  /** Target DSCR (e.g. 1.25). Ignored for cash purchases (no debt service). */
  dscr?: number;
  /** Absolute purchase-price ceiling in dollars (for example, a Buy Box budget). */
  maxPurchasePrice?: number;
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
  return meetsMaoTarget(r, target);
}

function hasAnyTarget(t: MaoTarget): boolean {
  return (
    t.capRate !== undefined ||
    t.cocReturn !== undefined ||
    t.monthlyCashFlow !== undefined ||
    t.dscr !== undefined ||
    t.maxPurchasePrice !== undefined
  );
}

function safeCalc(values: InvestmentFormValues): AnalysisResult | null {
  try {
    return calculateAnalysis(values);
  } catch {
    return null;
  }
}

function isUsableLowerBound(
  result: AnalysisResult,
  target: MaoTarget
): boolean {
  // At the exact v2 acquisition-credit boundary, total cash invested can be
  // zero. The engine intentionally stores CoC as 0 there, but an arbitrarily
  // small move into the valid domain can produce a real positive denominator.
  // Do not use that zero-denominator sentinel to declare a CoC target
  // unreachable before the search has entered its meaningful domain.
  return target.cocReturn === undefined || result.totalCashRequired > 0;
}

type CandidateResult = {
  price: number;
  result: AnalysisResult;
};

/**
 * Resolve the first calculable low-price candidate. v2 fixed acquisition
 * credits can legitimately exceed cash uses at the caller's generic $10k
 * floor even though a higher candidate is valid. Valid acquisition cash uses
 * are non-decreasing with price for every v2 financing/closing-cost mode, so a
 * bounded binary search can enter that valid domain without changing any
 * financial formula or target threshold.
 */
function resolveFirstUsableCandidate(
  values: InvestmentFormValues,
  target: MaoTarget,
  minPrice: number,
  maxPrice: number,
  maxResult: AnalysisResult | null
): CandidateResult | null {
  const minResult = safeCalc({ ...values, purchasePrice: minPrice });
  if (minResult && isUsableLowerBound(minResult, target)) {
    return { price: minPrice, result: minResult };
  }

  // v1 has no fixed-credit validity floor. Preserve its historical behavior:
  // a failed minimum calculation means the input is not solvable.
  if (values.underwritingModelVersion !== "2.0") return null;
  if (!maxResult || !isUsableLowerBound(maxResult, target)) return null;

  let invalidPrice = minPrice;
  let validPrice = maxPrice;
  for (let index = 0; index < 64; index += 1) {
    const midpoint = (invalidPrice + validPrice) / 2;
    if (midpoint === invalidPrice || midpoint === validPrice) break;
    const midpointResult = safeCalc({ ...values, purchasePrice: midpoint });
    if (midpointResult && isUsableLowerBound(midpointResult, target)) {
      validPrice = midpoint;
    } else {
      invalidPrice = midpoint;
    }
  }

  // The validity boundary can be a fractional dollar. Enter the domain at the
  // first conservative display increment instead of leaking that internal
  // binary-search value into a customer-facing price.
  const firstDisplayPrice = Math.ceil(validPrice / 500) * 500;
  if (firstDisplayPrice > maxPrice) return null;
  const firstDisplayResult = safeCalc({
    ...values,
    purchasePrice: firstDisplayPrice,
  });
  return firstDisplayResult && isUsableLowerBound(firstDisplayResult, target)
    ? { price: firstDisplayPrice, result: firstDisplayResult }
    : null;
}

function hasOnlyDscrTarget(target: MaoTarget): boolean {
  return (
    target.dscr !== undefined &&
    target.capRate === undefined &&
    target.cocReturn === undefined &&
    target.monthlyCashFlow === undefined &&
    target.maxPurchasePrice === undefined
  );
}

function verifiedDisplayedResult(
  values: InvestmentFormValues,
  target: MaoTarget,
  price: number
): MaoResult | null {
  const achieved = safeCalc({ ...values, purchasePrice: price });
  if (!achieved || !meetsTarget(achieved, target)) return null;
  if (hasOnlyDscrTarget(target) && achieved.monthlyPayment <= 0) return null;
  return { target, maxPrice: price, achieved };
}

/**
 * v2 fixed-amount financing has a real purchase-price floor: a fixed down
 * payment or fixed loan cannot exceed the candidate price. v1 has no such
 * modes, so its historical $10,000/default caller floor is returned exactly.
 */
function resolveMinimumCandidatePrice(
  values: InvestmentFormValues,
  requestedMinimum: number
): number | null {
  if (values.underwritingModelVersion !== "2.0") return requestedMinimum;

  const fixedAmount =
    values.financingMode === "fixed-down"
      ? values.fixedDownPaymentAmount
      : values.financingMode === "fixed-loan"
        ? values.fixedLoanAmount
        : undefined;

  if (
    (values.financingMode === "fixed-down" || values.financingMode === "fixed-loan") &&
    (typeof fixedAmount !== "number" || !Number.isFinite(fixedAmount) || fixedAmount < 0)
  ) {
    return null;
  }

  return fixedAmount === undefined
    ? requestedMinimum
    : Math.max(requestedMinimum, fixedAmount);
}

type SolvableRentField =
  | "monthlyRent"
  | "currentMonthlyRent"
  | "stabilizedMonthlyRent";

/** Resolve the rent field the selected underwriting model actually consumes. */
function resolveSolvableRentField(
  values: InvestmentFormValues
): SolvableRentField | null {
  if (values.underwritingModelVersion !== "2.0") return "monthlyRent";
  if (values.operatingScenario === "current") return "currentMonthlyRent";
  if (values.operatingScenario === "stabilized") return "stabilizedMonthlyRent";
  return null;
}

function withSolvedRent(
  values: InvestmentFormValues,
  field: SolvableRentField,
  rent: number
): InvestmentFormValues {
  return { ...values, [field]: rent };
}

/** Solver — returns null if no targets given or if even the lowest tested price fails. */
export function calculateMaxAllowableOffer(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { minPrice?: number; maxPrice?: number; iterations?: number }
): MaoResult | null {
  if (!hasAnyTarget(target)) return null;
  // Negative CoC thresholds do not produce a monotone price ceiling. All
  // product inputs now reject them; keep this final trust-boundary guard for
  // hand-built or legacy callers.
  if (target.cocReturn !== undefined && target.cocReturn < 0) return null;
  // A hard target above the supported form/calculation domain is not an
  // exact $100M ceiling. Reject it instead of clamping and presenting the
  // search boundary as a financial result.
  if (
    target.maxPurchasePrice !== undefined &&
    target.maxPurchasePrice > MAX_PURCHASE_PRICE
  ) {
    return null;
  }

  // Use the same upper bound as the accepted purchase-price form. A lower
  // private search limit would make a viable $20M acquisition look as though
  // its ceiling were exactly $10M. An explicit Buy Box budget remains the
  // tighter upper bound when present.
  const requestedMinPrice = opts?.minPrice ?? MIN_PURCHASE_PRICE;
  const requestedCandidateFloor = resolveMinimumCandidatePrice(
    values,
    requestedMinPrice
  );
  if (requestedCandidateFloor === null) return null;
  const requestedMaxPrice =
    opts?.maxPrice ?? target.maxPurchasePrice ?? MAX_PURCHASE_PRICE;
  const maxPrice = Math.min(
    requestedMaxPrice,
    target.maxPurchasePrice ?? Number.POSITIVE_INFINITY,
    MAX_PURCHASE_PRICE
  );
  const iterations = opts?.iterations ?? 28;

  if (
    !Number.isFinite(maxPrice) ||
    maxPrice < requestedCandidateFloor
  ) {
    return null;
  }

  const meetsTargets = (r: AnalysisResult): boolean => meetsTarget(r, target);

  // The upper-bound result serves two trust checks: a DSCR-only solve must
  // actually have debt somewhere in its allowed domain, and a v2 credit-bound
  // solve needs one known-valid endpoint before locating its first valid price.
  const maxResult = safeCalc({ ...values, purchasePrice: maxPrice });
  if (
    hasOnlyDscrTarget(target) &&
    (!maxResult || maxResult.monthlyPayment <= 0)
  ) {
    return null;
  }

  const firstUsable = resolveFirstUsableCandidate(
    values,
    target,
    requestedCandidateFloor,
    maxPrice,
    maxResult
  );
  if (!firstUsable || !meetsTargets(firstUsable.result)) return null;
  const minPrice = firstUsable.price;

  // Quick reject: if the minimum-price scenario already fails, the targets
  // are unreachable regardless of how cheap the deal is (some
  // expense-as-percent items grow with price too, but in normal ranges a
  // lower price means stronger returns).
  let lo = minPrice;
  let hi = maxPrice;

  // The upper bound is a valid candidate, especially when it came from an
  // explicit purchase-price cap. A midpoint-only bisection approaches `hi`
  // without ever testing it, which used to shave an extra $500 from an exact
  // $200,000 budget. If the bound clears every target, return its displayed
  // floor immediately; no higher price is permitted by this solve.
  if (maxResult && meetsTargets(maxResult)) {
    const roundedPrice = Math.max(minPrice, Math.floor(maxPrice / 500) * 500);
    return verifiedDisplayedResult(values, target, roundedPrice);
  }

  let best: CandidateResult | null = firstUsable;

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
  return verifiedDisplayedResult(values, target, roundedPrice);
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
 * Lowest modeled monthly rent that hits ALL targets at the CURRENT price.
 * v1 solves its single-family monthlyRent field; v2 solves the property-total
 * rent for the selected current or stabilized scenario. Returns null when the
 * active model has no numeric rent input that can be solved safely.
 */
export function solveRequiredMonthlyRent(
  values: InvestmentFormValues,
  target: MaoTarget,
  opts?: { iterations?: number; maxRent?: number }
): RequiredInputResult | null {
  if (!hasAnyTarget(target)) return null;
  const rentField = resolveSolvableRentField(values);
  if (rentField === null) return null;
  const current = Number(values[rentField]);
  if (!Number.isFinite(current)) return null;

  const base = safeCalc(values);
  if (base && meetsTarget(base, target)) {
    return { value: current, alreadyMet: true, unreachable: false, achieved: base };
  }

  const iterations = opts?.iterations ?? 28;
  const rawCeiling = opts?.maxRent ?? Math.max(current * 4, current + 10_000, 50_000);
  if (!Number.isFinite(rawCeiling) || rawCeiling < 0) return null;
  // Rent is displayed in whole dollars. Search and report the same whole-$
  // ceiling so an unreachable result's `achieved` value is not from a
  // different, hidden decimal input.
  const rentCeiling = Math.ceil(rawCeiling);
  const hiResult = safeCalc(withSolvedRent(values, rentField, rentCeiling));
  if (!hiResult) return null;
  if (!meetsTarget(hiResult, target)) {
    return {
      value: rentCeiling,
      alreadyMet: false,
      unreachable: true,
      achieved: hiResult,
    };
  }

  // Higher rent always helps — binary-search the LOWEST rent that still meets.
  let lo = 0;
  let hiB = rentCeiling;
  let bestV = rentCeiling;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hiB) / 2;
    const r = safeCalc(withSolvedRent(values, rentField, mid));
    if (r && meetsTarget(r, target)) {
      bestV = mid;
      hiB = mid;
    } else {
      lo = mid;
    }
  }
  // Required rent is a minimum: round UP, never to nearest. Rounding down can
  // put the displayed threshold back on the failing side of the boundary.
  const displayedRent = Math.ceil(bestV);
  const achievedAtDisplayed = safeCalc(
    withSolvedRent(values, rentField, displayedRent)
  );
  if (!achievedAtDisplayed || !meetsTarget(achievedAtDisplayed, target)) return null;
  return {
    value: displayedRent,
    alreadyMet: false,
    unreachable: false,
    achieved: achievedAtDisplayed,
  };
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
  if (!loResult) return null;
  if (!meetsTarget(loResult, target)) {
    return { value: 0, alreadyMet: false, unreachable: true, achieved: loResult };
  }

  // Lower rate always helps — binary-search the HIGHEST rate that still meets.
  let lo = 0;
  let hi = maxRate;
  let bestV = 0;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const r = safeCalc({ ...values, interestRate: mid });
    if (r && meetsTarget(r, target)) {
      bestV = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  // Affordable rate is a maximum: round DOWN to the displayed 0.01pp step.
  // Recompute at that exact displayed rate so the readout and threshold can
  // never describe two different scenarios.
  const displayedRate = Math.floor(bestV * 100) / 100;
  const achievedAtDisplayed = safeCalc({ ...values, interestRate: displayedRate });
  if (!achievedAtDisplayed || !meetsTarget(achievedAtDisplayed, target)) return null;
  return {
    value: displayedRate,
    alreadyMet: false,
    unreachable: false,
    achieved: achievedAtDisplayed,
  };
}
