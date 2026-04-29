import { getTypeLabel, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";

type NumericLike = number | string | null | undefined;

type CompareSnapshotLike = {
  longTermSummary?: {
    totalROI?: NumericLike;
    totalRoi?: NumericLike;
  } | null;
  exitScenarios?: {
    summary?: {
      totalROI?: NumericLike;
      totalRoi?: NumericLike;
    } | null;
  } | null;
  long_term_summary?: {
    total_roi?: NumericLike;
  } | null;
} | null;

export type ResultSnapshot = {
  monthlyRentalIncome?: NumericLike;
  totalOperatingExpenses?: NumericLike;
  netCashFlow?: NumericLike;
  net_cash_flow?: NumericLike;
  annualCashFlow?: NumericLike;
  annual_cash_flow?: NumericLike;
  netCashFlowAnnual?: NumericLike;
  cocReturn?: NumericLike;
  capRate?: NumericLike;
  dscr?: NumericLike;
  dscrRatio?: NumericLike;
  score?: NumericLike;
  recommendation?: StoredRecommendation | null;
  riskLevel?: StoredRiskLevel | null;
  risk_level?: StoredRiskLevel | null;
  riskScore?: NumericLike;
  risk_score?: NumericLike;
  roi?: NumericLike;
  roiPct?: NumericLike;
  roi_pct?: NumericLike;
  totalROI?: NumericLike;
  total_roi?: NumericLike;
  tags?: string[] | null;
  compareSnapshot?: CompareSnapshotLike;
  compare_snapshot?: CompareSnapshotLike;
} | null;

export type SavedAnalysisDashboardRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: PropertyType | null;
  purchase_price: NumericLike;
  net_cash_flow_monthly: NumericLike;
  coc_return_pct: NumericLike;
  created_at: string;
  result_snapshot: ResultSnapshot;
};

export type DashboardDeal = {
  id: string;
  address: string;
  propertyType: "single-family" | "multi-family" | "owner-occupant" | null;
  propertyTypeLabel: string;
  purchasePrice: number | null;
  cashFlowMonthly: number | null;
  annualCashFlow: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  dscr: number | null;
  roiPct: number | null;
  score: number | null;
  recommendation: string | null;
  riskLevel: string | null;
  riskScore: number | null;
  tags: string[];
};

export function toNumber(value: NumericLike): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(...values: NumericLike[]): number | null {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function getAddress(row: SavedAnalysisDashboardRow): string {
  return row.address?.trim() || row.title?.trim() || "Untitled Property";
}

function getRoiPct(snapshot: ResultSnapshot): number | null {
  const compareSnapshot = snapshot?.compareSnapshot ?? snapshot?.compare_snapshot;
  return firstNumber(
    snapshot?.roiPct,
    snapshot?.roi_pct,
    snapshot?.roi,
    snapshot?.totalROI,
    snapshot?.total_roi,
    compareSnapshot?.longTermSummary?.totalROI,
    compareSnapshot?.longTermSummary?.totalRoi,
    compareSnapshot?.long_term_summary?.total_roi,
    compareSnapshot?.exitScenarios?.summary?.totalROI,
    compareSnapshot?.exitScenarios?.summary?.totalRoi
  );
}

function getAnnualCashFlow(snapshot: ResultSnapshot): number | null {
  return firstNumber(
    snapshot?.annualCashFlow,
    snapshot?.annual_cash_flow,
    snapshot?.netCashFlowAnnual
  );
}

function getDscr(snapshot: ResultSnapshot): number | null {
  return firstNumber(snapshot?.dscr, snapshot?.dscrRatio);
}

function getRiskScore(snapshot: ResultSnapshot): number | null {
  return firstNumber(snapshot?.riskScore, snapshot?.risk_score);
}

export function buildDashboardDeal(row: SavedAnalysisDashboardRow): DashboardDeal {
  const snapshot = row.result_snapshot ?? {};
  return {
    id: row.id,
    address: getAddress(row),
    propertyType: row.property_type,
    propertyTypeLabel: getTypeLabel(row.property_type),
    purchasePrice: toNumber(row.purchase_price),
    cashFlowMonthly: firstNumber(snapshot.netCashFlow, snapshot.net_cash_flow, row.net_cash_flow_monthly),
    annualCashFlow: getAnnualCashFlow(snapshot),
    cocReturnPct: firstNumber(snapshot.cocReturn, row.coc_return_pct),
    capRatePct: toNumber(snapshot.capRate),
    dscr: getDscr(snapshot),
    roiPct: getRoiPct(snapshot),
    score: toNumber(snapshot.score),
    recommendation: snapshot.recommendation ?? null,
    riskLevel: snapshot.riskLevel ?? snapshot.risk_level ?? null,
    riskScore: getRiskScore(snapshot),
    tags: Array.isArray(snapshot.tags) ? snapshot.tags.filter((tag): tag is string => typeof tag === "string") : [],
  };
}
