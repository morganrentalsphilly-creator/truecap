import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";

export type ReturnMetric = {
  value: number | null;
  source: "roiPct" | "annualCashFlow" | "none";
  kind: "roi" | "annualCashFlow";
};

export type RiskMetric = {
  value: number | null;
  source: "dscr" | "riskScore" | "riskLevel" | "none";
};

export function mapRiskLevelToRisk(riskLevel: string | null | undefined): number | null {
  const normalized = riskLevel?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("low")) return 0.8;
  if (normalized.includes("moderate") || normalized.includes("medium")) return 1.0;
  if (normalized.includes("high") || normalized.includes("risky")) return 1.2;
  return null;
}

export function resolveReturnMetric(deal: DashboardDeal): ReturnMetric {
  if (deal.roiPct != null) return { value: deal.roiPct, source: "roiPct", kind: "roi" };
  if (deal.annualCashFlow != null) return { value: deal.annualCashFlow, source: "annualCashFlow", kind: "annualCashFlow" };
  return { value: null, source: "none", kind: "roi" };
}

export function resolveRiskMetric(deal: DashboardDeal): RiskMetric {
  if (deal.dscr != null) return { value: deal.dscr, source: "dscr" };
  if (deal.riskScore != null) return { value: deal.riskScore, source: "riskScore" };
  const mappedRisk = mapRiskLevelToRisk(deal.riskLevel);
  if (mappedRisk != null) return { value: mappedRisk, source: "riskLevel" };
  return { value: null, source: "none" };
}

export function getChartInclusionReason(deal: DashboardDeal): {
  include: boolean;
  returnMetric: ReturnMetric;
  riskMetric: RiskMetric;
  reason: "missing_both_axes" | "included";
} {
  const returnMetric = resolveReturnMetric(deal);
  const riskMetric = resolveRiskMetric(deal);
  const include = returnMetric.value != null || riskMetric.value != null;
  return {
    include,
    returnMetric,
    riskMetric,
    reason: include ? "included" : "missing_both_axes",
  };
}

export function getTaggedDealRiskLabel(deal: DashboardDeal | undefined): string {
  if (!deal) return "-";
  if (deal.riskLevel) return deal.riskLevel;
  if (deal.dscr != null) return `DSCR ${deal.dscr.toFixed(2)}`;
  if (deal.riskScore != null) return `Risk score ${deal.riskScore.toFixed(1)}`;
  return "No backend risk metric";
}
