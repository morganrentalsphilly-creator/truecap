/**
 * Breakpoint solver — given an InvestmentFormValues + current tier,
 * find the minimum adjustment to rent OR purchase price that lifts
 * the deal to a higher tier (Strong / Solid).
 *
 * This is the "what would make this a Strong Buy?" engine. Turns a
 * rejected deal into negotiating ammunition: instead of "Mixed" with
 * no path forward, the user sees "becomes Solid at $285K (currently
 * $300K) or $2,650/mo rent (currently $2,400)". Same deal, suddenly
 * actionable.
 *
 * Pure synchronous compute. No IO, no network, no Pro gating.
 *
 * Approach:
 *   - Determine the *target* tier (next tier UP from the current one).
 *   - For each dimension (price down, rent up), run a coarse linear
 *     sweep with 1% increments out to a safety bound (price -30%,
 *     rent +30%), and return the smallest delta that crosses the
 *     tier. Linear sweep is fine — calculateAnalysis is microseconds
 *     and we cap at 30 iterations per dimension.
 *
 * Why not binary search? With discrete tier transitions the function
 * is monotonic over each dimension but tier boundaries are sharp.
 * Linear sweep with 1% step gives us deterministic precision at
 * effectively zero cost.
 */

import { calculateAnalysis, type AnalysisResult } from "./calc-analysis";
import type { InvestmentFormValues } from "./investcalc-schema";
import { getDealTier, type DealTier } from "./verdict";

const TIER_RANK: Record<DealTier, number> = {
  Negative: 0,
  Marginal: 1,
  Mixed: 2,
  Solid: 3,
  Strong: 4,
};

/** Maximum % change we'll consider before giving up. */
const MAX_SWEEP_PCT = 30;

export interface BreakpointResult {
  /** The tier we're trying to reach (next tier up from current). */
  targetTier: DealTier;
  /** Current tier (echoed for caller convenience). */
  currentTier: DealTier;
  /** Smallest rent increase (%) that crosses the target tier, or null if 30% wasn't enough. */
  rentDeltaPct: number | null;
  /** Equivalent absolute monthly rent value at the breakpoint (single-family only; null for multi-unit). */
  rentBreakpointMonthly: number | null;
  /** Current single-family monthly rent (null for multi-unit). Caller renders "currently $X". */
  currentRentMonthly: number | null;
  /** Smallest price decrease (%) that crosses the target tier, or null if 30% wasn't enough. */
  priceDeltaPct: number | null;
  /** Equivalent absolute purchase price at the breakpoint. */
  priceBreakpoint: number | null;
  /** Current purchase price. Caller renders "currently $X". */
  currentPrice: number | null;
}

/**
 * Solve for the next-tier-up breakpoints. Returns null when the deal
 * is already at the top tier (Strong) — nothing to solve toward.
 *
 * If both dimensions blow past the 30% safety bound, the corresponding
 * deltas are null and the caller should render a graceful "deal needs
 * bigger changes than rent / price alone can fix" message.
 */
export function solveBreakpoints(
  values: InvestmentFormValues,
  baseResult: AnalysisResult
): BreakpointResult | null {
  const currentTier = getDealTier(baseResult);
  const targetTier = nextTierUp(currentTier);
  if (targetTier == null) return null; // Already Strong; nothing to solve.

  const targetRank = TIER_RANK[targetTier];

  // ── Rent sweep (positive deltas) ────────────────────────────────────
  const rentResult = sweepRent(values, targetRank);

  // ── Price sweep (negative deltas) ───────────────────────────────────
  const priceResult = sweepPrice(values, targetRank);

  const activeRentMonthly = getActiveRentMonthly(values);
  const currentRentMonthly =
    values.propertyType === "single-family" ? activeRentMonthly : null;

  return {
    currentTier,
    targetTier,
    rentDeltaPct: rentResult?.pct ?? null,
    rentBreakpointMonthly:
      rentResult && currentRentMonthly != null
        ? Math.round(currentRentMonthly * (1 + rentResult.pct / 100))
        : null,
    currentRentMonthly,
    priceDeltaPct: priceResult?.pct ?? null,
    priceBreakpoint:
      priceResult && typeof values.purchasePrice === "number"
        ? Math.round(values.purchasePrice * (1 - priceResult.pct / 100))
        : null,
    currentPrice: typeof values.purchasePrice === "number" ? values.purchasePrice : null,
  };
}

function nextTierUp(tier: DealTier): DealTier | null {
  if (tier === "Strong") return null;
  // Skip Solid → Solid; go Mixed → Solid, Marginal → Solid, Negative →
  // Solid. The user wants to know "what gets me to a clearly OK deal",
  // not "what gets me from Marginal to Mixed".
  if (tier === "Solid") return "Strong";
  return "Solid";
}

function sweepRent(
  values: InvestmentFormValues,
  targetRank: number
): { pct: number } | null {
  for (let pct = 1; pct <= MAX_SWEEP_PCT; pct++) {
    const adjusted = applyRentAdjustment(values, pct);
    if (adjusted == null) return null; // Multi-unit with no aggregate rent — skip.
    try {
      const r = calculateAnalysis(adjusted);
      if (TIER_RANK[getDealTier(r)] >= targetRank) return { pct };
    } catch {
      return null;
    }
  }
  return null;
}

function sweepPrice(
  values: InvestmentFormValues,
  targetRank: number
): { pct: number } | null {
  if (typeof values.purchasePrice !== "number" || values.purchasePrice <= 0)
    return null;
  const minimumPrice = getMinimumValidPrice(values);
  if (minimumPrice === null) return null;
  for (let pct = 1; pct <= MAX_SWEEP_PCT; pct++) {
    const candidatePrice = Math.round(
      values.purchasePrice * (1 - pct / 100)
    );
    // v2 fixed-amount financing cannot model a price below its fixed down
    // payment or fixed loan. Stop at the valid boundary instead of asking the
    // engine to calculate an impossible candidate.
    if (candidatePrice < minimumPrice) break;
    const adjusted: InvestmentFormValues = {
      ...values,
      purchasePrice: candidatePrice,
    };
    try {
      const r = calculateAnalysis(adjusted);
      if (TIER_RANK[getDealTier(r)] >= targetRank) return { pct };
    } catch {
      return null;
    }
  }
  return null;
}

function applyRentAdjustment(
  values: InvestmentFormValues,
  rentPct: number
): InvestmentFormValues | null {
  const mul = 1 + rentPct / 100;
  if (values.underwritingModelVersion === "2.0") {
    const rentField =
      values.operatingScenario === "current"
        ? ("currentMonthlyRent" as const)
        : values.operatingScenario === "stabilized"
          ? ("stabilizedMonthlyRent" as const)
          : null;
    if (rentField === null) return null;
    const activeRent = values[rentField];
    if (typeof activeRent !== "number" || !Number.isFinite(activeRent)) return null;
    return { ...values, [rentField]: Math.round(activeRent * mul) };
  }
  if (values.propertyType === "single-family") {
    if (typeof values.monthlyRent !== "number") return null;
    return { ...values, monthlyRent: Math.round(values.monthlyRent * mul) };
  }
  if (Array.isArray(values.units)) {
    return {
      ...values,
      units: values.units.map((u) => ({
        ...u,
        monthlyRent:
          typeof u.monthlyRent === "number"
            ? Math.round(u.monthlyRent * mul)
            : u.monthlyRent,
      })),
    };
  }
  return null;
}

function getActiveRentMonthly(values: InvestmentFormValues): number | null {
  if (values.underwritingModelVersion === "2.0") {
    const activeRent =
      values.operatingScenario === "current"
        ? values.currentMonthlyRent
        : values.operatingScenario === "stabilized"
          ? values.stabilizedMonthlyRent
          : undefined;
    return typeof activeRent === "number" && Number.isFinite(activeRent)
      ? activeRent
      : null;
  }
  return typeof values.monthlyRent === "number" ? values.monthlyRent : null;
}

function getMinimumValidPrice(values: InvestmentFormValues): number | null {
  if (values.underwritingModelVersion !== "2.0") return 0;

  const fixedAmount =
    values.financingMode === "fixed-down"
      ? values.fixedDownPaymentAmount
      : values.financingMode === "fixed-loan"
        ? values.fixedLoanAmount
        : 0;
  return typeof fixedAmount === "number" &&
    Number.isFinite(fixedAmount) &&
    fixedAmount >= 0
    ? fixedAmount
    : null;
}
