import { z } from "zod";

import {
  buildExitScenarios,
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
} from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";
// One-way dependency: verdict-display imports only the TYPE from here (erased
// at compile time), so there is no runtime cycle.
import { VERDICT_DISPLAY, verdictLabel } from "@/lib/verdict-display";
import { TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION } from "@/lib/underwriting-methodology";

export const dealScoreInputSchema = z.object({
  propertyType: z.enum(["single-family", "multi-family", "owner-occupant"]),
  monthlyCashFlow: z.number(),
  cashOnCashReturn: z.number(),
  /** False when total modeled initial cash is $0 and CoC is undefined. The
   * historical numeric sentinel remains in snapshots but is not scored. */
  cashOnCashApplicable: z.boolean().optional().default(true),
  capRate: z.number(),
  dscr: z.number(),
  vacancyRate: z.number(),
  propertyAge: z.number().min(0),
  /** Distinguishes a genuinely new property from an omitted Year Built. */
  propertyAgeKnown: z.boolean().optional().default(true),
  capexPct: z.number().min(0),
  maintenancePct: z.number().min(0),
  monthlyPropertyTax: z.number().min(0),
  monthlyRentIncome: z.number().min(0),
  /**
   * True when the deal has no debt service (100% down). DSCR is then
   * mathematically undefined, so the engine should award full DSCR credit
   * and avoid the "limited debt-service cushion" weakness phrasing.
   * Optional + default false to keep existing callers backward-compatible.
   */
  isCashPurchase: z.boolean().optional().default(false),
  /**
   * Legacy optional field retained so serialized callers continue to parse.
   * It is ignored by scoring: illustrative tax effects are not guaranteed
   * usable cash and must never rescue a recommendation.
   */
  afterTaxMonthlyCashFlow: z.number().optional(),
  /**
   * Projected 10-year ANNUALIZED pre-tax return — the blend
   * of pre-tax operating cash flow, appreciation, and loan paydown realized
   * at a year-10 sale, net modeled selling costs (computed by the same
   * contribution-aware exit/return engines used for reconciliation). It is
   * CAGR when all capital is contributed at acquisition and the unique,
   * money-weighted IRR when later negative cash flow requires more capital.
   * Ambiguous multiple-root IRRs are omitted. Personal tax benefits and
   * exit-tax assumptions are deliberately excluded from this diagnostic.
   * This is the "wealth-building"
   * dimension a year-1-only score is blind to. Optional; when absent the
   * total-return component scores 0 (graceful degradation to the prior
   * income-only behaviour).
   */
  tenYearAnnualizedReturnPct: z.number().optional(),
});

export type DealScoreInput = z.infer<typeof dealScoreInputSchema>;

/**
 * Compute a projected 10-year annualized pre-tax return, reusing the SAME
 * exit-scenario and contribution-aware return engines as the sale ledger.
 * The diagnostic uses CAGR only when all capital is contributed at t0. When
 * operating losses require later contributions, CAGR is undefined, so a
 * unique money-weighted IRR is used instead. Multiple/no-root IRRs are
 * omitted rather than collapsed into a misleading headline.
 *
 * Total return blends all four real-estate return sources:
 *   - pre-tax operating cash flow             → result.tenYearProjection
 *   - appreciation + loan paydown at sale    → buildExitScenarios()
 *
 * Returns null when no unambiguous annualized result can be computed, in
 * which case the score omits this dimension.
 */
export function computeTenYearAnnualizedReturnPct(
  values: {
    purchasePrice: number;
    interestRate: number;
    loanTermYears: number;
    amortizationTermYears?: number;
    interestOnlyMonths?: number;
    appreciationRatePct?: number;
    sellingCostPct?: number;
  },
  result: {
    loanAmount: number;
    monthlyPayment: number;
    downPayment: number;
    closingCosts: number;
    totalCashRequired: number;
    tenYearProjection: { cumulativeCashFlowAnnual: number }[];
    taxStrategyYears: {
      cumulativeTaxBenefitAnnual: number;
      depreciationDeductionAnnual?: number;
    }[];
  },
): number | null {
  if (!(result.totalCashRequired > 0)) return null;
  if (result.tenYearProjection.length === 0) return null;

  const exitYears = buildExitScenarios({
    purchasePrice: values.purchasePrice,
    appreciationRate: values.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct: values.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
    loanAmount: result.loanAmount,
    interestRate: values.interestRate,
    loanTermYears: values.loanTermYears,
    amortizationTermYears: values.amortizationTermYears ?? values.loanTermYears,
    interestOnlyMonths: values.interestOnlyMonths ?? 0,
    monthlyPayment: result.monthlyPayment,
    downPayment: result.downPayment,
    closingCosts: result.closingCosts,
    // Measure exit profit against ALL cash in (incl. rehab + furnishing) so the
    // cumulativeRoi numerator + the totalCashRequired denominator below agree.
    initialCashInvested: result.totalCashRequired,
    cumulativeCashFlowByYear: result.tenYearProjection.map(
      (y) => y.cumulativeCashFlowAnnual,
    ),
    // Deal Fit must remain taxpayer-agnostic. The separate Illustrative Tax
    // Impact view can show the signed estimate, but assumed passive-loss
    // usability must never rescue or inflate the recommendation score.
    cumulativeTaxBenefitByYear: result.taxStrategyYears.map(() => 0),
    annualDepreciation:
      result.taxStrategyYears[0]?.depreciationDeductionAnnual ?? 0,
    recaptureTaxRatePct: 0,
    capitalGainsTaxRatePct: 0,
  });

  const year10 = exitYears[exitYears.length - 1];
  if (!year10) return null;

  const summary = computeReturnSummaryFromExitYears(exitYears);
  if (!summary) return null;
  if (summary.cagrStatus === "available") return summary.cagrPct;
  if (
    summary.cagrStatus === "later-contributions" &&
    summary.irrStatus === "unique"
  ) {
    return summary.irrPct;
  }
  // A complete loss has a well-defined -100% total return even though a
  // geometric CAGR cannot be computed from a zero terminal distribution.
  if (summary.totalContributions > 0 && summary.totalDistributions <= 0) {
    return -100;
  }
  return null;
}

/**
 * Build a DealScoreInput from form values + a computed AnalysisResult.
 * Shared by investcalc-page's score flow, the sample-deal Pro preview,
 * the homepage hero (which renders the sample deal's REAL score), and the
 * save-deal action. Kept here so every caller maps the fields identically
 * AND every caller gets the holistic (total-return-aware) score.
 */
export function buildDealScoreInputFromAnalysis(
  values: {
    propertyType: DealScoreInput["propertyType"];
    vacancyPct?: number;
    purchasePrice: number;
    interestRate: number;
    loanTermYears: number;
    appreciationRatePct?: number;
    sellingCostPct?: number;
    yearBuilt?: number;
  },
  result: {
    netCashFlow: number;
    cocReturn: number;
    capRate: number;
    dscr: number;
    propertyAge: number;
    propertyAgeKnown?: boolean;
    capexPctEffective: number;
    maintenancePctEffective: number;
    propertyTax: number;
    monthlyRentalIncome: number;
    monthlyPayment: number;
    afterTaxCF: number;
    loanAmount: number;
    downPayment: number;
    closingCosts: number;
    totalCashRequired: number;
    tenYearProjection: { cumulativeCashFlowAnnual: number }[];
    taxStrategyYears: {
      cumulativeTaxBenefitAnnual: number;
      depreciationDeductionAnnual?: number;
    }[];
  },
): DealScoreInput {
  const tenYearAnnualizedReturnPct = computeTenYearAnnualizedReturnPct(
    values,
    result,
  );
  return dealScoreInputSchema.parse({
    propertyType: values.propertyType,
    monthlyCashFlow: result.netCashFlow,
    cashOnCashReturn: result.cocReturn,
    cashOnCashApplicable: result.totalCashRequired > 0,
    capRate: result.capRate,
    dscr: result.dscr,
    vacancyRate: values.vacancyPct ?? 5,
    propertyAge: result.propertyAge,
    propertyAgeKnown:
      result.propertyAgeKnown ?? Number.isFinite(values.yearBuilt),
    capexPct: result.capexPctEffective,
    maintenancePct: result.maintenancePctEffective,
    monthlyPropertyTax: result.propertyTax,
    monthlyRentIncome: result.monthlyRentalIncome,
    isCashPurchase: result.monthlyPayment <= 0,
    // Deliberately pre-tax: tax-loss usability is taxpayer-specific and the
    // current engine does not model passive-activity limitations.
    afterTaxMonthlyCashFlow: result.netCashFlow,
    tenYearAnnualizedReturnPct: tenYearAnnualizedReturnPct ?? undefined,
  });
}

export type DealRecommendation =
  | "Strong Buy"
  | "Buy"
  | "Neutral"
  | "Risky"
  | "Avoid";

/**
 * DISPLAY-layer labels for the recommendation tiers. The INTERNAL value
 * (DealRecommendation) stays "Strong Buy"/etc. — it's persisted in saved
 * snapshots, drives the signal/color mapping (recommendationToSignal) and
 * the recommendation switches, and is asserted in unit tests. This maps it
 * to criteria-based, advice-safe wording shown to users. Renaming only the
 * display avoids a DB backfill and keeps all logic intact.
 *
 * `recommendationLabel` is TOLERANT: it returns the input unchanged for any
 * unmapped/stale value (some call sites receive a generic `string`).
 */
// Deal-SCORE vocabulary — derived from the deal's own metrics, NOT the user's
// personal buy box. Earlier "Meets / Does not meet buy box" wording falsely
// implied each row had been screened against a criteria set it never saw.
//
// MOVED (Aug-2026 hierarchy rebuild): the wording now lives in
// lib/verdict-display.ts, which is the single source for every surface and
// adds tone + icon + screen-reader text. These two exports are kept as
// re-exports so the ~10 existing call sites keep working, but new code should
// render <Verdict> (components/investcalc/verdict.tsx) instead.
export const RECOMMENDATION_DISPLAY_LABELS: Record<DealRecommendation, string> =
  {
    "Strong Buy": VERDICT_DISPLAY["Strong Buy"].label,
    Buy: VERDICT_DISPLAY.Buy.label,
    Neutral: VERDICT_DISPLAY.Neutral.label,
    Risky: VERDICT_DISPLAY.Risky.label,
    Avoid: VERDICT_DISPLAY.Avoid.label,
  };

export function recommendationLabel(recommendation: string): string {
  return verdictLabel(recommendation);
}
/** Investment deals use Low/Medium/High. Owner-occupant near break-even may use softer labels instead of High Risk. */
export type DealRiskLevel =
  | "Low Risk"
  | "Medium Risk"
  | "High Risk"
  | "Moderate"
  | "Balanced"
  | "Low Return";

export interface DealScoreBreakdown {
  cashFlowScore: number;
  cocScore: number;
  capRateScore: number;
  dscrScore: number;
  /** Projected 10-year total return (pre-tax cash flow + appreciation + paydown, net modeled sale costs and exit tax). 0–25. */
  totalReturnScore: number;
  riskPenalty: number;
  /**
   * Present only when cash-on-cash is mathematically inapplicable because the
   * modeled initial cash investment is $0. The remaining applicable factors
   * are renormalized to the full 100-point scale; this signed adjustment keeps
   * displayed score receipts arithmetically reconcilable without pretending
   * the historical 0% CoC sentinel earned or lost points.
   */
  applicabilityAdjustment?: number;
  /**
   * Present only when the risk penalty was compressed to preserve the
   * near-miss ordering credit (the deal's raw risk factors exceeded the
   * points it had left to lose). Consumers must not read a small or zero
   * riskPenalty as "risk profile is clean" when this flag is set.
   */
  riskPenaltyLimited?: true;
}

export interface DealScoreResult {
  /** Independent version of the secondary Screening Index arithmetic. */
  scoreMethodologyVersion?: string;
  score: number;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  breakdown: DealScoreBreakdown;
  explanation: string;
  /** Present only for the zero-cash edge case so normal v1 result shapes and
   * snapshots remain byte-for-byte unchanged. */
  cashOnCashApplicable?: false;
}

const OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD = 300;

/** Cash-flow band for relabeling owner-occupant risk (house-hack context); stricter than score cash-flow tiers. */
const OWNER_OCCUPANT_RISK_LABEL_CF_MIN = -100;
const OWNER_OCCUPANT_RISK_LABEL_CF_MAX = 100;

/**
 * Appreciation-play guardrail: a financed investment deal whose projected
 * 10-year annualized total return clears this bar AND has non-negative pre-tax
 * operating cash flow is an appreciation play, not an "Avoid". Its score is floored
 * into the Neutral band so the headline never reads "Avoid / weak
 * fundamentals" on a deal that builds real long-term wealth — the failure
 * the year-1-only score produced (e.g. a +678% total-return deal scoring 0).
 *
 * Exported because the Overview's appreciation-play banner reframes on the
 * exact same threshold — defining the bar once keeps the score and the UI
 * copy from ever disagreeing about what counts as an appreciation play.
 *
 * Set to 8 (was 12) to align with the totalReturn component's ">8%/yr →
 * 'solid total return' (14/25)" tier: a deal the engine already describes as a
 * solid long-term return shouldn't simultaneously read "Avoid". The floor
 * still requires NON-NEGATIVE pre-tax operating cash flow, so a deal requiring
 * monthly owner funding is never rescued by an illustrative tax effect.
 */
export const APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT = 8;
const APPRECIATION_FLOOR_SCORE = 40;

/**
 * Strategy lens — re-weights the five score components so the verdict speaks
 * the investor's language. "Good" is strategy-dependent: a cash-flow investor
 * and an appreciation investor rate the same property differently. Multipliers
 * scale each component's sub-score; the score is then renormalized back to the
 * 0-100 scale so a perfect deal still tops out near 100.
 *
 * Balanced is the identity (all 1.0) → byte-for-byte the pre-lens behaviour,
 * so existing scores and the pinned tests never move when no lens is chosen.
 */
export type DealStrategy = "cash-flow" | "balanced" | "appreciation";

/** localStorage key for the user's chosen investor lens — shared by the Deal
 *  Score card toggle and the PDF export so an exported report matches the
 *  on-screen lens. */
export const DEAL_STRATEGY_STORAGE_KEY = "truecap_deal_strategy";

/** Max points each component can contribute (investment scale). Single source
 *  for the renormalization factor so changing a multiplier stays consistent.
 *  Exported so the "Why this score" UI can show each factor as "x / max". */
export const COMPONENT_MAXES = {
  cashFlow: 22,
  coc: 20,
  capRate: 16,
  dscr: 17,
  totalReturn: 25,
} as const;

/** Owner-occupant (house-hack) cash-flow component max. getCashFlowScore
 *  scores owner-occupant deals on 0/25/30 bands instead of the investor
 *  0–22 tiers, so their breakdown can legitimately exceed
 *  COMPONENT_MAXES.cashFlow. Exported so every "Why this score" surface
 *  renders the property-type-correct "x / max" denominator. */
export const OWNER_OCCUPANT_CASH_FLOW_MAX = 30;

/** Display helper: the cash-flow "x / max" denominator for a property type.
 *  Owner-occupant deals cap at OWNER_OCCUPANT_CASH_FLOW_MAX (30); everything
 *  else uses the investor scale (COMPONENT_MAXES.cashFlow, 22). */
export function getCashFlowComponentMax(
  propertyType: DealScoreInput["propertyType"] | null | undefined,
): number {
  return propertyType === "owner-occupant"
    ? OWNER_OCCUPANT_CASH_FLOW_MAX
    : COMPONENT_MAXES.cashFlow;
}

/** Sum of the five factor scores plus the (negative) risk penalty — the
 *  arithmetic the "Why this score" surfaces recite. On the Balanced lens this
 *  equals the headline score, EXCEPT when the appreciation-play floor engaged
 *  (see isAppreciationFloorApplied). */
export function getScoreBreakdownSum(breakdown: DealScoreBreakdown): number {
  return (
    breakdown.cashFlowScore +
    breakdown.cocScore +
    breakdown.capRateScore +
    breakdown.dscrScore +
    breakdown.totalReturnScore +
    breakdown.riskPenalty +
    (breakdown.applicabilityAdjustment ?? 0)
  );
}

/** Display helper: true when the headline score was held ABOVE what the
 *  breakdown factors sum to — i.e. the appreciation-play floor
 *  (APPRECIATION_FLOOR_SCORE) engaged. The floor is the only engine path that
 *  raises the score above the component arithmetic (the 0/100 clamps only
 *  match or lower it), so any positive excess means the floor. Breakdown
 *  surfaces use this to render an explicit "score held at N" line instead of
 *  reciting an equation that doesn't add up. */
export function isAppreciationFloorApplied(
  breakdown: DealScoreBreakdown,
  score: number,
): boolean {
  const summed = Math.max(
    0,
    Math.min(100, Math.round(getScoreBreakdownSum(breakdown))),
  );
  return score > summed;
}

interface StrategyWeights {
  cashFlow: number;
  coc: number;
  capRate: number;
  dscr: number;
  totalReturn: number;
  /** Whether the appreciation-play floor applies. A cash-flow investor should
   *  NOT be told a negative-cash-flow deal is "Neutral" on appreciation alone. */
  appreciationFloor: boolean;
}

const STRATEGY_WEIGHTS: Record<DealStrategy, StrategyWeights> = {
  "cash-flow": {
    cashFlow: 1.7,
    coc: 1.5,
    capRate: 1.0,
    dscr: 1.4,
    totalReturn: 0.3,
    appreciationFloor: false,
  },
  balanced: {
    cashFlow: 1.0,
    coc: 1.0,
    capRate: 1.0,
    dscr: 1.0,
    totalReturn: 1.0,
    appreciationFloor: true,
  },
  appreciation: {
    cashFlow: 0.5,
    coc: 0.7,
    capRate: 1.3,
    dscr: 0.6,
    totalReturn: 1.9,
    appreciationFloor: true,
  },
};

/** 100 / (Σ applicable componentMax × multiplier) — maps the weighted
 * sum back to 0-100. CoC is removed from BOTH the numerator and denominator
 * when no initial cash is invested; otherwise an inapplicable metric would
 * silently cost the deal up to 20 points. */
function strategyNormFactor(
  w: StrategyWeights,
  cashOnCashApplicable = true,
): number {
  const weightedMax =
    COMPONENT_MAXES.cashFlow * w.cashFlow +
    (cashOnCashApplicable ? COMPONENT_MAXES.coc * w.coc : 0) +
    COMPONENT_MAXES.capRate * w.capRate +
    COMPONENT_MAXES.dscr * w.dscr +
    COMPONENT_MAXES.totalReturn * w.totalReturn;
  return 100 / weightedMax;
}

function isOwnerOccupantDeal(input: DealScoreInput): boolean {
  return input.propertyType === "owner-occupant";
}

/**
 * Production scoring is deliberately based on pre-tax operating cash flow.
 * `afterTaxMonthlyCashFlow` remains in the schema only so historical callers
 * still parse, but an illustrative tax estimate can never rescue a score.
 */
function resolveScoringCashFlow(input: DealScoreInput): number {
  return input.monthlyCashFlow;
}

/** Owner-occupant, near break-even cash flow, and debt service covered — not comparable to investment "high risk". */
function isOwnerOccupantNearBreakEvenForRiskLabel(
  input: DealScoreInput,
): boolean {
  if (!isOwnerOccupantDeal(input)) return false;
  // Cash purchases have no debt service to cover; skip the DSCR check.
  if (!input.isCashPurchase && input.dscr < 1) return false;
  return (
    input.monthlyCashFlow >= OWNER_OCCUPANT_RISK_LABEL_CF_MIN &&
    input.monthlyCashFlow <= OWNER_OCCUPANT_RISK_LABEL_CF_MAX
  );
}

/**
 * Is this an appreciation play? A non-owner-occupant INVESTMENT deal whose
 * projected long-term return clears the bar AND whose pre-tax operating cash flow is
 * non-negative — a wealth-building hold rather than a weak deal. This is the
 * ONE definition shared by (a) the score floor and (b) the "wealth-building
 * hold" recommendation copy in buildExplanation, so the number and the prose
 * can never disagree about what counts as an appreciation play. Lens-
 * independent: whether the active lens *credits* it is a separate question
 * handled by qualifiesForAppreciationFloor.
 */
function isAppreciationPlay(input: DealScoreInput): boolean {
  if (isOwnerOccupantDeal(input)) return false;
  const annual = input.tenYearAnnualizedReturnPct;
  if (annual == null) return false;
  return (
    annual > APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT &&
    resolveScoringCashFlow(input) >= 0
  );
}

/** Does this deal qualify for the appreciation-play score floor? An
 *  appreciation play, but only under a lens where long-term return counts (not
 *  the cash-flow lens, where a negative-cash-flow deal genuinely isn't a buy). */
function qualifiesForAppreciationFloor(
  input: DealScoreInput,
  strategy: DealStrategy,
): boolean {
  if (!STRATEGY_WEIGHTS[strategy].appreciationFloor) return false;
  return isAppreciationPlay(input);
}

function getCashFlowScore(input: DealScoreInput): number {
  if (!isOwnerOccupantDeal(input)) {
    // Six-tier scoring on a 22-pt max (rebalanced from 25 to make room for
    // the total-return component). $200-500/mo is the realistic 2026 "good
    // deal" band in a 7-8% rate environment; $1,000+/mo is rare without a
    // strong cash-down or low-cost market.
    const cf = input.monthlyCashFlow;
    if (cf > 1000) return 22;
    if (cf > 500) return 18;
    if (cf > 200) return 14;
    if (cf > 0) return 8;
    if (cf > -200) return 3;
    // Near-miss tier. Every component used to return a hard 0 below its
    // last band, so on a shortlist a -$210/mo deal and a -$2,000/mo deal
    // both pancaked to the same Screening Index and ranked EQUAL — exactly
    // where a screening tool needs ordering most. One point keeps
    // "barely underwater" above "catastrophic" without promoting either:
    // all recommendation thresholds are unchanged.
    if (cf > -500) return 1;
    return 0;
  }

  if (input.monthlyCashFlow > OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD)
    return OWNER_OCCUPANT_CASH_FLOW_MAX;
  if (input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) return 25;
  return 0;
}

function getRecommendation(
  score: number,
  input: DealScoreInput,
): DealRecommendation {
  if (
    isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD
  ) {
    if (score >= 75) return "Strong Buy";
    return "Buy";
  }
  // Recommendation thresholds match the granular tier scoring. Strong Buy 75
  // (requires top tiers on most metrics). Buy 55 (realistic 2026 deals with
  // 6-8% cap, 5-7% CoC, positive cash flow, DSCR ≥ 1.20, plus healthy total
  // return). Neutral 35 (mixed signals OR an appreciation play floored in).
  // Risky/Avoid mark genuinely weak fundamentals with no offsetting return.
  if (score >= 75) return "Strong Buy";
  if (score >= 55) return "Buy";
  if (score >= 35) return "Neutral";
  if (score >= 18) return "Risky";
  return "Avoid";
}

function getRiskLevelBase(score: number): DealRiskLevel {
  // Low Risk floor 65 (solid all-around deals). Medium Risk floor 40
  // (neutral-but-not-bad, incl. appreciation plays floored to 40).
  if (score >= 65) return "Low Risk";
  if (score >= 40) return "Medium Risk";
  return "High Risk";
}

function getRiskLevel(score: number, input: DealScoreInput): DealRiskLevel {
  const base = getRiskLevelBase(score);
  if (base === "High Risk" && isOwnerOccupantNearBreakEvenForRiskLabel(input)) {
    if (score >= 32) return "Moderate";
    if (score >= 22) return "Balanced";
    return "Low Return";
  }
  return base;
}

function getAgeRiskPenalty(
  propertyAge: number,
  propertyAgeKnown = true,
): number {
  // Softened from -10/-5/-2. In pre-war markets (Philadelphia, the Northeast)
  // an 80+ year building is ordinary stock, not a 10-point risk — and genuine
  // age-driven condition risk is already captured separately by the
  // age>20 + high-capex/high-maintenance combined penalty in computeDealScore.
  // Keep age here as a light modifier so it doesn't bury the whole market.
  // Unknown must not receive the same favorable treatment as verified new
  // construction. Use the existing maximum age-only modifier as a conservative
  // screening uncertainty adjustment; no age is invented or displayed.
  if (!propertyAgeKnown) return -6;
  if (propertyAge > 30) return -6;
  if (propertyAge > 15) return -4;
  if (propertyAge > 5) return -2;
  return 0;
}

function buildExplanation(
  input: DealScoreInput,
  breakdown: DealScoreBreakdown,
  score: number,
  recommendation: DealRecommendation,
  strategy: DealStrategy,
): string {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Strength thresholds match the rebalanced tier maxes (CF 22, CoC 20,
  // cap 16, DSCR 17, total return 25).
  if (breakdown.cashFlowScore >= 14)
    strengths.push("positive monthly cash flow");
  if (
    isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD
  ) {
    strengths.push("housing cost is kept near break-even");
  }
  if (input.cashOnCashApplicable && breakdown.cocScore >= 13) {
    strengths.push("healthy cash-on-cash return");
  }
  if (breakdown.capRateScore >= 9) strengths.push("solid cap rate");
  if (breakdown.dscrScore >= 13) strengths.push("strong debt-service coverage");
  if (breakdown.totalReturnScore >= 20)
    strengths.push("strong projected 10-year total return");
  else if (breakdown.totalReturnScore >= 14)
    strengths.push("solid long-term total return");
  if (input.vacancyRate > 8) weaknesses.push("elevated vacancy risk");
  if (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0)
    weaknesses.push("negative cash flow");
  if (
    isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow < -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD
  ) {
    weaknesses.push("owner costs still well above break-even");
  }
  if (input.capexPct > 10) weaknesses.push("high CapEx burden");
  else if (input.capexPct > 5) weaknesses.push("moderate CapEx burden");
  if (input.maintenancePct > 10) weaknesses.push("high maintenance burden");
  else if (input.maintenancePct > 5)
    weaknesses.push("moderate maintenance burden");
  if (input.monthlyRentIncome > 0) {
    const propertyTaxToRentPct =
      (input.monthlyPropertyTax / input.monthlyRentIncome) * 100;
    if (propertyTaxToRentPct > 15)
      weaknesses.push("high property-tax burden relative to rent");
  }
  if (!input.propertyAgeKnown) {
    weaknesses.push("unverified property age");
  } else if (input.propertyAge > 15) {
    weaknesses.push("higher maintenance and CapEx risk from property age");
  } else if (input.propertyAge > 5) {
    weaknesses.push("moderate maintenance and CapEx risk from property age");
  }
  if (input.cashOnCashApplicable && breakdown.cocScore === 0) {
    weaknesses.push("weak cash-on-cash performance");
  }
  // Only call out limited debt-service cushion when there's actually debt
  // service to cover. For cash purchases this isn't a meaningful weakness.
  if (!input.isCashPurchase && breakdown.dscrScore === 0) {
    weaknesses.push("limited debt-service cushion");
  }
  if (input.isCashPurchase)
    strengths.push("no debt service (all-cash purchase)");

  // Investment deals with negative year-1 cash flow where debt service
  // doesn't cover (or it's an all-cash deal losing money operationally).
  // This is where a year-1-only score used to hard-code "weak fundamentals".
  // Now we distinguish an appreciation play (strong total return + non-negative
  // pre-tax operating cash flow) from a genuinely weak deal.
  if (
    !isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow < 0 &&
    (input.isCashPurchase || input.dscr < 1)
  ) {
    // "Wealth-building hold" copy is gated on the SAME predicate as the score
    // floor, so it can only appear when the active lens actually credits the
    // appreciation play — in which case the score is floored out of "Avoid".
    // This is the invariant: the prose can never call a deal a wealth-builder
    // while the headline number says Avoid.
    if (qualifiesForAppreciationFloor(input, strategy)) {
      const annual = input.tenYearAnnualizedReturnPct;
      const retClause = annual != null ? ` (~${Math.round(annual)}%/yr)` : "";
      const debtClause = input.isCashPurchase
        ? "Year-1 cash flow is negative"
        : "Year-1 cash flow is negative and DSCR is below 1.0";
      return (
        `${debtClause}, but this reads as an appreciation play: the projected 10-year total return${retClause} ` +
        `and non-negative pre-tax operating cash flow point to a wealth-building hold. The return leans on appreciation and ` +
        `loan paydown rather than monthly income — confirm you can carry the shortfall and that your rent and ` +
        `appreciation assumptions are realistic.`
      );
    }
    // It IS an appreciation play, but the active lens (cash-flow) doesn't
    // credit appreciation — so point the user to the lens that does instead of
    // calling a negative-cash-flow deal a buy under a cash-flow strategy.
    if (isAppreciationPlay(input)) {
      return (
        "Year-1 cash flow is negative. The projected 10-year total return is solid, but on a cash-flow strategy " +
        "this deal doesn't pencil — switch to the Balanced or Appreciation lens to weigh its long-term case."
      );
    }
    return (
      "Year-1 cash flow is negative and the projected long-term return doesn't yet offset the monthly shortfall. " +
      "Re-check the purchase price, rent, and financing before moving on this one."
    );
  }

  if (
    isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD
  ) {
    if (input.monthlyCashFlow > OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
      return "This owner-occupant deal performs better than break-even while helping offset living costs.";
    }
    if (isOwnerOccupantNearBreakEvenForRiskLabel(input) && score < 40) {
      if (recommendation !== "Avoid") {
        return (
          "For an owner-occupant strategy, monthly cash flow near break-even with DSCR of at least 1 is often acceptable. " +
          "The headline score still uses investment-style metrics, so personal housing risk may be lower than the label suggests."
        );
      }
      return (
        "Cash flow is near break-even for an owner-occupant, but other factors still produce a weak overall score. " +
        "Stress-test vacancies, repairs, and your ability to carry the property before committing."
      );
    }
    return "This owner-occupant deal keeps living costs near break-even, which is a favorable outcome for a house-hack strategy.";
  }

  if (score < 40 || recommendation === "Avoid" || recommendation === "Risky") {
    const weakness = weaknesses[0] ?? "weak cash flow coverage";
    return `This deal is high risk due to ${weakness}.`;
  }

  if (score >= 60) {
    const topStrength = strengths[0] ?? "strong performance across key metrics";
    return `This deal shows ${topStrength}.`;
  }

  const balancedStrength = strengths[0] ?? "mixed fundamentals";
  const balancedWeakness = weaknesses[0] ?? "some execution risk";
  return `This deal is balanced with ${balancedStrength}, but has ${balancedWeakness}.`;
}

export function computeDealScore(
  input: DealScoreInput,
  strategy: DealStrategy = "balanced",
): DealScoreResult {
  const cashFlowScore = getCashFlowScore(input);

  // Cash-on-cash — 6-tier granular scoring on a 20-pt max. In 2026 with
  // 7-8% rates, even healthy deals top out at 7-10% CoC: 10%+ exceptional,
  // 7-9% strong, 5-7% healthy.
  const coc = input.cashOnCashReturn;
  const cocScore = input.cashOnCashApplicable
    ? coc > 10
      ? 20
      : coc > 7
        ? 17
        : coc > 5
          ? 13
          : coc > 3
            ? 8
            : coc > 1
              ? 3
              : coc > -2
                ? 1 // near-miss: breakeven-ish beats deeply negative (see getCashFlowScore)
                : 0
    : 0;

  // Cap rate — 5-tier granular on a 16-pt max. 7% cap is a realistic 2026
  // "good deal" benchmark.
  const capRateScore =
    input.capRate > 8
      ? 16
      : input.capRate > 6.5
        ? 13
        : input.capRate > 5
          ? 9
          : input.capRate > 4
            ? 4
            : input.capRate > 3
              ? 1 // near-miss: a 3.5% cap outranks a 1% cap on the shortlist
              : 0;

  // DSCR — 5-tier on a 17-pt max. Cash purchases get full credit (no debt).
  // >1.30 "loaned without question"; 1.20 "above floor, fundable"; 1.10
  // tight; 1.0+ covers debt but below lender standards; <1.0 underwater.
  const dscrScore = input.isCashPurchase
    ? 17
    : input.dscr > 1.3
      ? 17
      : input.dscr > 1.2
        ? 13
        : input.dscr >= 1.1
          ? 7
          : input.dscr >= 1.0
            ? 3
            : input.dscr >= 0.9
              ? 1 // near-miss: 0.95 is a rate-cut from fundable; 0.5 is not
              : 0;

  // Total return — the wealth-building dimension a year-1-only score is
  // blind to. Annualized 10-year total return on invested cash (pre-tax cash
  // flow + appreciation + loan paydown, net modeled sale costs and exit tax).
  // Annual personal tax benefits are excluded. 0-25 max. Absent → 0.
  const annual = input.tenYearAnnualizedReturnPct;
  const totalReturnScore =
    annual == null
      ? 0
      : annual > 15
        ? 25
        : annual > 11
          ? 20
          : annual > 8
            ? 14
            : annual > 5
              ? 8
              : annual > 2
                ? 3
                : 0;

  let riskPenalty = 0;
  if (input.vacancyRate > 8) riskPenalty -= 10;
  // Negative cash-flow penalty. Illustrative personal tax effects are never
  // counted as spendable operating cash and therefore cannot soften it.
  if (
    (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0) ||
    (isOwnerOccupantDeal(input) &&
      input.monthlyCashFlow < -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD)
  ) {
    riskPenalty += resolveScoringCashFlow(input) >= 0 ? -6 : -16;
  }
  riskPenalty += getAgeRiskPenalty(input.propertyAge, input.propertyAgeKnown);
  if (input.capexPct > 10) riskPenalty -= 10;
  else if (input.capexPct > 5) riskPenalty -= 5;
  if (input.maintenancePct > 10) riskPenalty -= 8;
  else if (input.maintenancePct > 5) riskPenalty -= 4;
  if (input.propertyAge > 20) {
    const highCapex = input.capexPct > 10;
    const highMaintenance = input.maintenancePct > 10;
    if (highCapex && highMaintenance) riskPenalty -= 10;
    else if (highCapex || highMaintenance) riskPenalty -= 5;
  }
  if (input.monthlyRentIncome > 0) {
    const propertyTaxToRentPct =
      (input.monthlyPropertyTax / input.monthlyRentIncome) * 100;
    if (propertyTaxToRentPct > 15) riskPenalty -= 8;
    else if (propertyTaxToRentPct > 10) riskPenalty -= 4;
  }
  // Floor the total penalty so a single deal can't be buried by stacking
  // every risk factor at once — the components above already encode the
  // bad-deal signal; the penalty is a modifier, not a second scoring engine.
  riskPenalty = Math.max(riskPenalty, -30);

  // Strategy lens: weight each component, renormalize to 0-100, then apply the
  // (unweighted) risk penalty. Balanced = identity, so the score is unchanged
  // when no lens is chosen.
  const w = STRATEGY_WEIGHTS[strategy];
  const weightedComponents =
    cashFlowScore * w.cashFlow +
    cocScore * w.coc +
    capRateScore * w.capRate +
    dscrScore * w.dscr +
    totalReturnScore * w.totalReturn;
  const normalizedComponents =
    weightedComponents * strategyNormFactor(w, input.cashOnCashApplicable);
  // Store the zero-cash renormalization explicitly so every score receipt can
  // reconcile its arithmetic. Keep the field absent on normal financed deals
  // to preserve their historical result shape byte-for-byte.
  const unweightedComponentSum =
    cashFlowScore + cocScore + capRateScore + dscrScore + totalReturnScore;
  const applicabilityAdjustment = input.cashOnCashApplicable
    ? 0
    : Math.round(normalizedComponents) - unweightedComponentSum;
  // The penalty is a modifier, not a second scoring engine (see the -30
  // floor above). Second corollary: it may not ERASE the near-miss ordering
  // credit. Each component's 1-point tier exists so a shortlist can still
  // order deals that miss every band, but the -16 negative-cash-flow penalty
  // alone swallowed all four points and re-tied a -$210/mo, DSCR 0.97 deal
  // with a -$2,000/mo, DSCR 0.45 one at 0 (measured). Compressing the
  // penalty here — rather than flooring the final score — keeps the receipt
  // arithmetic a plain sum and preserves isAppreciationFloorApplied's
  // invariant that the appreciation floor is the ONLY path raising the score
  // above component arithmetic. A 1 in a component is unique to its
  // near-miss tier, so this detection is exact.
  const nearMissCredit =
    (cashFlowScore === 1 ? 1 : 0) +
    (cocScore === 1 ? 1 : 0) +
    (capRateScore === 1 ? 1 : 0) +
    (dscrScore === 1 ? 1 : 0);
  const uncompressedRiskPenalty = riskPenalty;
  // Flooring the clamp MAGNITUDE keeps the penalty integral (every raw
  // penalty above is an integer; only the weighted component sum is
  // fractional), preserving the pre-v1.4 contract that receipts and
  // persisted snapshots always show whole points. The credit invariant
  // still holds: nc - floor(nc - credit) >= credit.
  riskPenalty = Math.max(
    riskPenalty,
    -Math.max(0, Math.floor(normalizedComponents - nearMissCredit)),
  );
  if (Object.is(riskPenalty, -0)) riskPenalty = 0;
  const riskPenaltyLimited = riskPenalty !== uncompressedRiskPenalty;

  const rawScore = normalizedComponents + riskPenalty;
  let score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Appreciation-play floor: never let a financed deal with strong projected
  // total return and non-negative pre-tax operating cash flow read as "Avoid" — except
  // under the cash-flow lens, where a negative-cash-flow deal genuinely isn't a
  // buy. This is the explicit fix for the year-1-only score labeling a +678%
  // total-return deal "Avoid / 0".
  if (
    qualifiesForAppreciationFloor(input, strategy) &&
    score < APPRECIATION_FLOOR_SCORE
  ) {
    score = APPRECIATION_FLOOR_SCORE;
  }

  const recommendation = getRecommendation(score, input);

  const breakdown: DealScoreBreakdown = {
    cashFlowScore,
    cocScore,
    capRateScore,
    dscrScore,
    totalReturnScore,
    riskPenalty,
    ...(input.cashOnCashApplicable ? {} : { applicabilityAdjustment }),
    // Absent on uncompressed deals to preserve their historical result
    // shape byte-for-byte (same convention as applicabilityAdjustment).
    ...(riskPenaltyLimited ? { riskPenaltyLimited: true as const } : {}),
  };

  return {
    scoreMethodologyVersion: TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION,
    score,
    recommendation,
    riskLevel: getRiskLevel(score, input),
    breakdown,
    explanation: buildExplanation(
      input,
      breakdown,
      score,
      recommendation,
      strategy,
    ),
    ...(input.cashOnCashApplicable
      ? {}
      : { cashOnCashApplicable: false as const }),
  };
}
