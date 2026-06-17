import { z } from "zod";

import {
  buildExitScenarios,
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
} from "@/lib/exit-scenarios";

export const dealScoreInputSchema = z.object({
  propertyType: z.enum(["single-family", "multi-family", "owner-occupant"]),
  monthlyCashFlow: z.number(),
  cashOnCashReturn: z.number(),
  capRate: z.number(),
  dscr: z.number(),
  vacancyRate: z.number(),
  propertyAge: z.number().min(0),
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
   * Year-1 AFTER-TAX monthly cash flow. A deal can be negative pre-tax but
   * positive after the depreciation + interest shield — that's not a deal
   * "bleeding" each month. When present, the engine softens the negative
   * cash-flow penalty and unlocks the appreciation-play path. Optional so
   * older/serialized callers still parse (falls back to pre-tax cash flow).
   */
  afterTaxMonthlyCashFlow: z.number().optional(),
  /**
   * Projected 10-year ANNUALIZED total return on invested cash — the blend
   * of operating cash flow, tax shield, appreciation, and loan paydown
   * realized at a year-10 sale (computed by the same exit-scenario engine
   * the Exit Scenarios panel + PDF use). This is the "wealth-building"
   * dimension a year-1-only score is blind to. Optional; when absent the
   * total-return component scores 0 (graceful degradation to the prior
   * income-only behaviour).
   */
  tenYearAnnualizedReturnPct: z.number().optional(),
});

export type DealScoreInput = z.infer<typeof dealScoreInputSchema>;

/**
 * Compute the projected 10-year ANNUALIZED total return on invested cash,
 * reusing the SAME exit-scenario engine as the Exit Scenarios panel and the
 * PDF — so the score's "total return" can never diverge from what the user
 * sees elsewhere in the product.
 *
 * Total return blends all four real-estate return sources:
 *   - operating cash flow + the tax shield  → result.tenYearProjection /
 *     result.taxStrategyYears (already embedded in every AnalysisResult)
 *   - appreciation + loan paydown at sale    → buildExitScenarios()
 *
 * year-10 totalProfit / total cash invested = cumulative ROI; we annualize
 * it so the figure is hold-length-comparable and not as wildly inflated by
 * leverage as the raw cumulative number. Returns null when it can't be
 * computed (no cash invested), in which case the score omits the dimension.
 */
export function computeTenYearAnnualizedReturnPct(
  values: {
    purchasePrice: number;
    interestRate: number;
    loanTermYears: number;
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
    taxStrategyYears: { cumulativeTaxBenefitAnnual: number }[];
  }
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
    monthlyPayment: result.monthlyPayment,
    downPayment: result.downPayment,
    closingCosts: result.closingCosts,
    cumulativeCashFlowByYear: result.tenYearProjection.map((y) => y.cumulativeCashFlowAnnual),
    cumulativeTaxBenefitByYear: result.taxStrategyYears.map((y) => y.cumulativeTaxBenefitAnnual),
  });

  const year10 = exitYears[exitYears.length - 1];
  if (!year10) return null;

  // Cumulative ROI over the hold, e.g. 6.788 for a +678.8% total return.
  const cumulativeRoi = year10.totalProfit / result.totalCashRequired;
  const growthBase = 1 + cumulativeRoi;
  // Losing more than your entire basis → treat as a full loss for scoring
  // (can't take the 10th root of a non-positive number).
  if (growthBase <= 0) return -100;
  const annualized = Math.pow(growthBase, 1 / 10) - 1;
  return annualized * 100;
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
  },
  result: {
    netCashFlow: number;
    cocReturn: number;
    capRate: number;
    dscr: number;
    propertyAge: number;
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
    taxStrategyYears: { cumulativeTaxBenefitAnnual: number }[];
  }
): DealScoreInput {
  const tenYearAnnualizedReturnPct = computeTenYearAnnualizedReturnPct(values, result);
  return dealScoreInputSchema.parse({
    propertyType: values.propertyType,
    monthlyCashFlow: result.netCashFlow,
    cashOnCashReturn: result.cocReturn,
    capRate: result.capRate,
    dscr: result.dscr,
    vacancyRate: values.vacancyPct ?? 5,
    propertyAge: result.propertyAge,
    capexPct: result.capexPctEffective,
    maintenancePct: result.maintenancePctEffective,
    monthlyPropertyTax: result.propertyTax,
    monthlyRentIncome: result.monthlyRentalIncome,
    isCashPurchase: result.monthlyPayment <= 0,
    afterTaxMonthlyCashFlow: result.afterTaxCF,
    tenYearAnnualizedReturnPct: tenYearAnnualizedReturnPct ?? undefined,
  });
}

export type DealRecommendation = "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";
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
  /** Projected 10-year total return (appreciation + paydown + cash flow + tax). 0–25. */
  totalReturnScore: number;
  riskPenalty: number;
}

export interface DealScoreResult {
  score: number;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  breakdown: DealScoreBreakdown;
  explanation: string;
}

const OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD = 300;

/** Cash-flow band for relabeling owner-occupant risk (house-hack context); stricter than score cash-flow tiers. */
const OWNER_OCCUPANT_RISK_LABEL_CF_MIN = -100;
const OWNER_OCCUPANT_RISK_LABEL_CF_MAX = 100;

/**
 * Appreciation-play guardrail: a financed investment deal whose projected
 * 10-year annualized total return clears this bar AND is not bleeding
 * after-tax is an appreciation play, not an "Avoid". Its score is floored
 * into the Neutral band so the headline never reads "Avoid / weak
 * fundamentals" on a deal that builds real long-term wealth — the failure
 * the year-1-only score produced (e.g. a +678% total-return deal scoring 0).
 */
const APPRECIATION_FLOOR_MIN_ANNUAL_RETURN = 12;
const APPRECIATION_FLOOR_SCORE = 40;

function isOwnerOccupantDeal(input: DealScoreInput): boolean {
  return input.propertyType === "owner-occupant";
}

/** After-tax year-1 monthly cash flow, falling back to pre-tax when not supplied. */
function afterTaxMonthlyCashFlow(input: DealScoreInput): number {
  return input.afterTaxMonthlyCashFlow ?? input.monthlyCashFlow;
}

/** Owner-occupant, near break-even cash flow, and debt service covered — not comparable to investment "high risk". */
function isOwnerOccupantNearBreakEvenForRiskLabel(input: DealScoreInput): boolean {
  if (!isOwnerOccupantDeal(input)) return false;
  // Cash purchases have no debt service to cover; skip the DSCR check.
  if (!input.isCashPurchase && input.dscr < 1) return false;
  return (
    input.monthlyCashFlow >= OWNER_OCCUPANT_RISK_LABEL_CF_MIN &&
    input.monthlyCashFlow <= OWNER_OCCUPANT_RISK_LABEL_CF_MAX
  );
}

/** Does this deal qualify for the appreciation-play score floor? Investment deals only. */
function qualifiesForAppreciationFloor(input: DealScoreInput): boolean {
  if (isOwnerOccupantDeal(input)) return false;
  const annual = input.tenYearAnnualizedReturnPct;
  if (annual == null) return false;
  return annual > APPRECIATION_FLOOR_MIN_ANNUAL_RETURN && afterTaxMonthlyCashFlow(input) >= 0;
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
    return 0;
  }

  if (input.monthlyCashFlow > OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) return 30;
  if (input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) return 25;
  return 0;
}

function getRecommendation(score: number, input: DealScoreInput): DealRecommendation {
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
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
  if (
    base === "High Risk" &&
    isOwnerOccupantNearBreakEvenForRiskLabel(input)
  ) {
    if (score >= 32) return "Moderate";
    if (score >= 22) return "Balanced";
    return "Low Return";
  }
  return base;
}

function getAgeRiskPenalty(propertyAge: number): number {
  if (propertyAge > 30) return -10;
  if (propertyAge > 15) return -5;
  if (propertyAge > 5) return -2;
  return 0;
}

function buildExplanation(
  input: DealScoreInput,
  breakdown: DealScoreBreakdown,
  score: number,
  recommendation: DealRecommendation
): string {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Strength thresholds match the rebalanced tier maxes (CF 22, CoC 20,
  // cap 16, DSCR 17, total return 25).
  if (breakdown.cashFlowScore >= 14) strengths.push("positive monthly cash flow");
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
    strengths.push("housing cost is kept near break-even");
  }
  if (breakdown.cocScore >= 13) strengths.push("healthy cash-on-cash return");
  if (breakdown.capRateScore >= 9) strengths.push("solid cap rate");
  if (breakdown.dscrScore >= 13) strengths.push("strong debt-service coverage");
  if (breakdown.totalReturnScore >= 20) strengths.push("strong projected 10-year total return");
  else if (breakdown.totalReturnScore >= 14) strengths.push("solid long-term total return");
  if (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0 && afterTaxMonthlyCashFlow(input) >= 0) {
    strengths.push("positive after-tax cash flow");
  }

  if (input.vacancyRate > 8) weaknesses.push("elevated vacancy risk");
  if (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0) weaknesses.push("negative cash flow");
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow < -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
    weaknesses.push("owner costs are still meaningfully above break-even");
  }
  if (input.capexPct > 10) weaknesses.push("high CapEx burden");
  else if (input.capexPct > 5) weaknesses.push("moderate CapEx burden");
  if (input.maintenancePct > 10) weaknesses.push("high maintenance burden");
  else if (input.maintenancePct > 5) weaknesses.push("moderate maintenance burden");
  if (input.monthlyRentIncome > 0) {
    const propertyTaxToRentPct = (input.monthlyPropertyTax / input.monthlyRentIncome) * 100;
    if (propertyTaxToRentPct > 15) weaknesses.push("high property-tax burden relative to rent");
  }
  if (input.propertyAge > 15) {
    weaknesses.push("higher maintenance and CapEx risk from property age");
  } else if (input.propertyAge > 5) {
    weaknesses.push("moderate maintenance and CapEx risk from property age");
  }
  if (breakdown.cocScore === 0) weaknesses.push("weak cash-on-cash performance");
  // Only call out limited debt-service cushion when there's actually debt
  // service to cover. For cash purchases this isn't a meaningful weakness.
  if (!input.isCashPurchase && breakdown.dscrScore === 0) {
    weaknesses.push("limited debt-service cushion");
  }
  if (input.isCashPurchase) strengths.push("no debt service (all-cash purchase)");

  // Investment deals with negative year-1 cash flow where debt service
  // doesn't cover (or it's an all-cash deal losing money operationally).
  // This is where a year-1-only score used to hard-code "weak fundamentals".
  // Now we distinguish an appreciation play (strong total return + positive
  // after-tax cash flow) from a genuinely weak deal.
  if (
    !isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow < 0 &&
    (input.isCashPurchase || input.dscr < 1)
  ) {
    const strongTotalReturn = breakdown.totalReturnScore >= 14;
    const afterTaxPositive = afterTaxMonthlyCashFlow(input) >= 0;
    if (strongTotalReturn && afterTaxPositive) {
      const annual = input.tenYearAnnualizedReturnPct;
      const retClause = annual != null ? ` (~${Math.round(annual)}%/yr)` : "";
      const debtClause = input.isCashPurchase
        ? "Year-1 cash flow is negative"
        : "Year-1 cash flow is negative and DSCR is below 1.0";
      return (
        `${debtClause}, but this reads as an appreciation play: the projected 10-year total return${retClause} ` +
        `and positive after-tax cash flow point to a wealth-building hold. The return leans on appreciation and ` +
        `loan paydown rather than monthly income — confirm you can carry the shortfall and that your rent and ` +
        `appreciation assumptions are realistic.`
      );
    }
    return (
      "Year-1 cash flow is negative and the projected long-term return doesn't yet offset the monthly shortfall. " +
      "Re-check the purchase price, rent, and financing before moving on this one."
    );
  }

  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
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

export function computeDealScore(input: DealScoreInput): DealScoreResult {
  const cashFlowScore = getCashFlowScore(input);

  // Cash-on-cash — 6-tier granular scoring on a 20-pt max. In 2026 with
  // 7-8% rates, even healthy deals top out at 7-10% CoC: 10%+ exceptional,
  // 7-9% strong, 5-7% healthy.
  const coc = input.cashOnCashReturn;
  const cocScore =
    coc > 10 ? 20
    : coc > 7 ? 17
    : coc > 5 ? 13
    : coc > 3 ? 8
    : coc > 1 ? 3
    : 0;

  // Cap rate — 5-tier granular on a 16-pt max. 7% cap is a realistic 2026
  // "good deal" benchmark.
  const capRateScore =
    input.capRate > 8 ? 16
    : input.capRate > 6.5 ? 13
    : input.capRate > 5 ? 9
    : input.capRate > 4 ? 4
    : 0;

  // DSCR — 5-tier on a 17-pt max. Cash purchases get full credit (no debt).
  // >1.30 "loaned without question"; 1.20 "above floor, fundable"; 1.10
  // tight; 1.0+ covers debt but below lender standards; <1.0 underwater.
  const dscrScore = input.isCashPurchase
    ? 17
    : input.dscr > 1.30 ? 17
    : input.dscr > 1.20 ? 13
    : input.dscr >= 1.10 ? 7
    : input.dscr >= 1.0 ? 3
    : 0;

  // Total return — the wealth-building dimension a year-1-only score is
  // blind to. Annualized 10-year total return on invested cash (cash flow +
  // tax shield + appreciation + loan paydown). 0-25 max. Absent → 0.
  const annual = input.tenYearAnnualizedReturnPct;
  const totalReturnScore =
    annual == null ? 0
    : annual > 15 ? 25
    : annual > 11 ? 20
    : annual > 8 ? 14
    : annual > 5 ? 8
    : annual > 2 ? 3
    : 0;

  let riskPenalty = 0;
  if (input.vacancyRate > 8) riskPenalty -= 10;
  // Negative cash-flow penalty — after-tax aware. A deal that's negative
  // pre-tax but positive after-tax (the depreciation + interest shield
  // covers the gap) isn't bleeding, so the penalty is much lighter. The old
  // flat -20 stacked on a near-zero cash-flow subscore and the appreciation
  // floor; that triple-penalty is what cratered appreciation plays to 0.
  if (
    (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0) ||
    (isOwnerOccupantDeal(input) && input.monthlyCashFlow < -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD)
  ) {
    riskPenalty += afterTaxMonthlyCashFlow(input) >= 0 ? -6 : -16;
  }
  riskPenalty += getAgeRiskPenalty(input.propertyAge);
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
    const propertyTaxToRentPct = (input.monthlyPropertyTax / input.monthlyRentIncome) * 100;
    if (propertyTaxToRentPct > 15) riskPenalty -= 8;
    else if (propertyTaxToRentPct > 10) riskPenalty -= 4;
  }
  // Floor the total penalty so a single deal can't be buried by stacking
  // every risk factor at once — the components above already encode the
  // bad-deal signal; the penalty is a modifier, not a second scoring engine.
  riskPenalty = Math.max(riskPenalty, -30);

  const rawScore =
    cashFlowScore + cocScore + capRateScore + dscrScore + totalReturnScore + riskPenalty;
  let score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Appreciation-play floor: never let a financed deal with strong projected
  // total return and non-negative after-tax cash flow read as "Avoid". This
  // is the explicit fix for the year-1-only score labeling a +678%
  // total-return deal "Avoid / 0".
  if (qualifiesForAppreciationFloor(input) && score < APPRECIATION_FLOOR_SCORE) {
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
  };

  return {
    score,
    recommendation,
    riskLevel: getRiskLevel(score, input),
    breakdown,
    explanation: buildExplanation(input, breakdown, score, recommendation),
  };
}
