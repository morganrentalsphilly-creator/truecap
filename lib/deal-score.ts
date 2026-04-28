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
  if (input.dscr < 1) return false;
  return (
    input.monthlyCashFlow >= OWNER_OCCUPANT_RISK_LABEL_CF_MIN &&
    input.monthlyCashFlow <= OWNER_OCCUPANT_RISK_LABEL_CF_MAX
  );
}

function getCashFlowScore(input: DealScoreInput): number {
  if (!isOwnerOccupantDeal(input)) {
    return input.monthlyCashFlow > 1000 ? 25 : input.monthlyCashFlow > 0 ? 15 : 0;
  }

  if (input.monthlyCashFlow > OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) return 30;
  if (input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) return 25;
  return 0;
}

function getRecommendation(score: number, input: DealScoreInput): DealRecommendation {
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
    if (score >= 80) return "Strong Buy";
    return "Buy";
  }
  if (score >= 80) return "Strong Buy";
  if (score >= 60) return "Buy";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Risky";
  return "Avoid";
}

function getRiskLevelBase(score: number): DealRiskLevel {
  if (score >= 70) return "Low Risk";
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

  if (breakdown.cashFlowScore >= 15) strengths.push("positive monthly cash flow");
  if (isOwnerOccupantDeal(input) && input.monthlyCashFlow >= -OWNER_OCCUPANT_NEAR_ZERO_THRESHOLD) {
    strengths.push("housing cost is kept near break-even");
  }
  if (breakdown.cocScore >= 15) strengths.push("healthy cash-on-cash return");
  if (breakdown.capRateScore >= 10) strengths.push("solid cap rate");
  if (breakdown.dscrScore >= 10) strengths.push("strong debt-service coverage");

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
  if (breakdown.dscrScore === 0) weaknesses.push("limited debt-service cushion");

  if (!isOwnerOccupantDeal(input) && input.monthlyCashFlow < 0 && input.dscr < 1) {
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

  const cocScore =
    input.cashOnCashReturn > 12
      ? 25
      : input.cashOnCashReturn > 8
        ? 15
        : input.cashOnCashReturn > 5
          ? 8
          : 0;

  const capRateScore = input.capRate > 8 ? 20 : input.capRate > 5 ? 10 : 0;
  const dscrScore = input.dscr > 1.25 ? 20 : input.dscr > 1 ? 10 : 0;

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
