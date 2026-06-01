import { z } from "zod";

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
});

export type DealScoreInput = z.infer<typeof dealScoreInputSchema>;

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

function isOwnerOccupantDeal(input: DealScoreInput): boolean {
  return input.propertyType === "owner-occupant";
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

function getCashFlowScore(input: DealScoreInput): number {
  if (!isOwnerOccupantDeal(input)) {
    // Six-tier scoring (was 2-tier 0/15/25). The old cliff treated $1/mo
    // and $999/mo identically — both got the same 15 pts. In 2026's
    // 7-8% rate environment, $200-500/mo is the realistic "good deal"
    // band; $1000+/mo is rare without a strong cash-down or low-cost
    // market. Smooth tiers reflect the actual distribution.
    const cf = input.monthlyCashFlow;
    if (cf > 1000) return 25;
    if (cf > 500) return 21;
    if (cf > 200) return 16;
    if (cf > 0) return 10;
    if (cf > -200) return 4;
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
  // Recommendation thresholds lowered to match the more granular tier
  // scoring below. Strong Buy 80→75 (still exclusive — requires top
  // tiers on most metrics). Buy 60→55 (catches realistic 2026 deals
  // with 6-8% cap, 5-7% CoC, positive cash flow, DSCR ≥ 1.20).
  // Neutral 40→35 (catches "mixed signals" deals). Risky/Avoid
  // unchanged — those still mark genuinely bad fundamentals.
  if (score >= 75) return "Strong Buy";
  if (score >= 55) return "Buy";
  if (score >= 35) return "Neutral";
  if (score >= 18) return "Risky";
  return "Avoid";
}

function getRiskLevelBase(score: number): DealRiskLevel {
  // Risk thresholds shifted with the granular tier rework. Low Risk
  // floor 70→65 (now achievable by solid all-around deals, not just
  // exceptional ones). Medium Risk floor 50→40 (catches "neutral but
  // not bad" — was previously labeled High Risk under the coarse
  // tiers because 40 was the absolute max a borderline-decent deal
  // could reach).
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

  // Threshold values adjusted to match the new granular tier scoring.
  // Cash flow strength surfaces at the 16-pt tier ($200+/mo positive).
  // CoC strength at 16-pt tier (5%+ — realistic 2026 healthy threshold).
  // Cap rate strength at 11-pt tier (5%+ — same lower bound as before).
  // DSCR strength at 8-pt tier (≥1.10 — close to lender floor).
  if (breakdown.cashFlowScore >= 16) strengths.push("positive monthly cash flow");
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
    strengths.push("housing cost is kept near break-even");
  }
  if (breakdown.cocScore >= 16) strengths.push("healthy cash-on-cash return");
  if (breakdown.capRateScore >= 11) strengths.push("solid cap rate");
  if (breakdown.dscrScore >= 8) strengths.push("strong debt-service coverage");

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

  // Investment deals with negative cash flow AND debt service that doesn't
  // cover. Cash purchases skip the DSCR check since DSCR is N/A.
  if (
    !isOwnerOccupantDeal(input) &&
    input.monthlyCashFlow < 0 &&
    (input.isCashPurchase || input.dscr < 1)
  ) {
    return "This deal has weak fundamentals and negative cash flow.";
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

  // Cash-on-cash — 6-tier granular scoring (was coarse 0/8/15/25).
  // The old "12% = excellent" threshold was set when 4% mortgage
  // rates left generous CoC headroom. In 2026 with 7-8% rates, even
  // healthy deals top out at 7-10% CoC. New tiers reflect that:
  // 10%+ is exceptional, 7-9% is strong (was previously only middling
  // at 15 pts), 5-7% is healthy for 2026 (was scored at 0-8).
  const coc = input.cashOnCashReturn;
  const cocScore =
    coc > 10 ? 25
    : coc > 7 ? 21
    : coc > 5 ? 16
    : coc > 3 ? 10
    : coc > 1 ? 4
    : 0;

  // Cap rate — 5-tier granular (was 0/10/20). 7% cap rate is a
  // realistic 2026 "good deal" benchmark — the old binary scoring
  // treated 7.5% the same as 5.1% (both 10 pts). New tiers credit
  // strong cap rates more meaningfully without inflating the top.
  const capRateScore =
    input.capRate > 8 ? 20
    : input.capRate > 6.5 ? 16
    : input.capRate > 5 ? 11
    : input.capRate > 4 ? 5
    : 0;

  // DSCR — 5-tier (was 3-tier). Cash purchases get full credit (no
  // debt). >1.30 is "loaned without question" — bumped to top tier
  // since 1.25 lender floors mean 1.25-1.30 isn't actually exceptional.
  // 1.20 is "above floor, fundable" — meaningful credit (15 pts) up
  // from 10 in the previous version. 1.15 (last revision) was tight
  // territory; now in the 8-pt tier. 1.0+ gets minimum credit (3 pts)
  // because operating income covers debt, even if not at lender
  // standards — the deal isn't underwater operationally.
  const dscrScore = input.isCashPurchase
    ? 20
    : input.dscr > 1.30 ? 20
    : input.dscr > 1.20 ? 15
    : input.dscr >= 1.10 ? 8
    : input.dscr >= 1.0 ? 3
    : 0;

  let riskPenalty = 0;
  if (input.vacancyRate > 8) riskPenalty -= 10;
  if (
    (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0) ||
    (isOwnerOccupantDeal(input) && input.monthlyCashFlow < -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD)
  ) {
    riskPenalty -= 20;
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

  const rawScore = cashFlowScore + cocScore + capRateScore + dscrScore + riskPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const recommendation = getRecommendation(score, input);

  const breakdown: DealScoreBreakdown = {
    cashFlowScore,
    cocScore,
    capRateScore,
    dscrScore,
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
