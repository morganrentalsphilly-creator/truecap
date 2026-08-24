import { getTypeLabel, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";
import type { DealScoreBreakdown } from "@/lib/deal-score";
import { DEFAULT_PIPELINE_STAGE, isPipelineStage, type PipelineStage } from "@/lib/pipeline";
import { normalizeDataConfidence, type DataConfidence } from "@/lib/data-confidence";
import type { DealOfferBasis } from "@/lib/deal-offer-line";

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
  totalCashRequired?: NumericLike;
  monthlyPayment?: NumericLike;
  monthly_payment?: NumericLike;
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
  /** Exact Tune-target persisted with this analysis; untrusted JSON until the
   *  server page validates it with normalizeMaoTarget. */
  maxOfferTarget?: unknown;
  maxOfferTargetSource?: unknown;
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
  /** Authoritative saved_analyses methodology contract. */
  methodology_version?: string | null;
  /** Stored form values — lets callers re-score with the current engine so a
   *  pre-upgrade stored score isn't shown stale. Optional/back-compatible. */
  form_snapshot?: unknown;
  pipeline_stage?: string | null;
  tags?: string[] | null;
  data_confidence?: unknown;
  /** Agent Pro assignment used to scope client-specific buy boxes. */
  client_id?: string | null;
};

export type DashboardDeal = {
  /**
   * Solved Max Offer, recomputed on read from form_snapshot against the exact
   * persisted target when one exists. Computed by the SAME
   * lib/deal-offer-line path My Deals uses, so the dashboard and the list can
   * never quote different numbers. Null = legacy/unparseable snapshot or an
   * unsolvable target.
   */
  maxOffer?: number | null;
  /**
   * Which bar the max offer was solved against: the analysis's saved Tune
   * targets, the user's own buy box, or TrueCap's canonical default
   * (break-even cash flow + DSCR 1.25).
   */
  maxOfferBasis?: DealOfferBasis | null;
  /** Human-readable exact criteria for the max-offer number. */
  maxOfferBasisLabel?: string | null;
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
  /**
   * Monthly debt-service payment from the saved snapshot. 0 / null signals
   * an all-cash purchase, in which case DSCR is mathematically undefined
   * and the dashboard should not penalize the deal for it.
   */
  monthlyPayment: number | null;
  /** Cash to close (down payment + closing costs) from the saved snapshot.
   *  Optional/back-compatible so existing DashboardDeal literals (e.g. in
   *  tests) don't need to supply it. */
  cashToClose?: number | null;
  roiPct: number | null;
  score: number | null;
  recommendation: string | null;
  riskLevel: string | null;
  riskScore: number | null;
  /** Per-factor score breakdown (cash flow / CoC / cap / DSCR / total-return /
   *  risk penalty). Optional/null from the stored snapshot; populated by the
   *  dashboard's recompute-on-read so the "Why this score" popover can show it. */
  breakdown?: DealScoreBreakdown | null;
  /** Acquisition-funnel stage (optional; defaults to analyzing). */
  pipelineStage?: PipelineStage;
  tags: string[];
  /** Per-input data confidence (optional; null when unknown). */
  dataConfidence?: DataConfidence | null;
  /** Visible provenance for legacy/frozen saved decisions. */
  methodologyLabel?: string;
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
  const address = row.address?.trim();
  const title = row.title?.trim();
  // Scenario saves share the address but carry a distinguishing title
  // ("<address> — Scenario 2") — prefer it so sibling rows stay tellable
  // apart. Every other row's title is derived from the address (no-op).
  if (address && title && title !== address) return title;
  return address || title || "Untitled Property";
}

function getRoiPct(snapshot: ResultSnapshot): number | null {
  const compareSnapshot = snapshot?.compareSnapshot ?? snapshot?.compare_snapshot;
  // Prefer the explicitly-cumulative 10-yr ROI fields FIRST so the
  // dashboard's "10-yr ROI" label is accurate. The ambiguous roi/roiPct
  // fields (which may carry an annual figure for some snapshots) are used
  // only as a last resort when no 10-yr total is present.
  return firstNumber(
    snapshot?.totalROI,
    snapshot?.total_roi,
    compareSnapshot?.longTermSummary?.totalROI,
    compareSnapshot?.longTermSummary?.totalRoi,
    compareSnapshot?.long_term_summary?.total_roi,
    compareSnapshot?.exitScenarios?.summary?.totalROI,
    compareSnapshot?.exitScenarios?.summary?.totalRoi,
    snapshot?.roiPct,
    snapshot?.roi_pct,
    snapshot?.roi
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

function getMonthlyPayment(snapshot: ResultSnapshot): number | null {
  return firstNumber(snapshot?.monthlyPayment, snapshot?.monthly_payment);
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
    monthlyPayment: getMonthlyPayment(snapshot),
    cashToClose: toNumber(snapshot.totalCashRequired),
    roiPct: getRoiPct(snapshot),
    score: toNumber(snapshot.score),
    recommendation: snapshot.recommendation ?? null,
    riskLevel: snapshot.riskLevel ?? snapshot.risk_level ?? null,
    riskScore: getRiskScore(snapshot),
    // Stored snapshots don't carry the per-factor breakdown; the dashboard
    // overlays it from the recompute (see app/dashboard/page.tsx).
    breakdown: null,
    pipelineStage: isPipelineStage(row.pipeline_stage) ? row.pipeline_stage : DEFAULT_PIPELINE_STAGE,
    // Prefer the real tags column; fall back to any legacy snapshot.tags.
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string")
      : Array.isArray(snapshot.tags)
        ? snapshot.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    dataConfidence: normalizeDataConfidence(row.data_confidence),
  };
}
