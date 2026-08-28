import { getTypeLabel, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";
import type { DealScoreBreakdown } from "@/lib/deal-score";
import { DEFAULT_PIPELINE_STAGE, isPipelineStage, type PipelineStage } from "@/lib/pipeline";
import { normalizeDataConfidence, type DataConfidence } from "@/lib/data-confidence";
import type { DealOfferBasis } from "@/lib/deal-offer-line";
import { applicableCashOnCashValue } from "@/lib/cash-on-cash-applicability";
import {
  LEGACY_UNVERSIONED_METHODOLOGY,
  normalizeSavedMethodologyVersion,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";

type NumericLike = number | string | null | undefined;

/** Metadata for safely comparing visible saved-deal metrics. */
export type DealMethodologyPresentation = {
  comparisonKey: string;
  groupLabel: string;
  badgeLabel: string | null;
  isCurrent: boolean;
};

export function resolveDealMethodologyPresentation(input: {
  storedMethodologyVersion: unknown;
  usesRecordedSnapshot: boolean;
  didRecompute: boolean;
  currentMethodologyVersion?: string;
  /** Used only to keep unknown, unversioned snapshots from being treated as
   * one comparable cohort. Their formula lineage is unknowable, so each row
   * must fail closed until it is explicitly re-underwritten. */
  recordId?: string;
}): DealMethodologyPresentation {
  const currentVersion =
    input.currentMethodologyVersion ?? TRUECAP_UNDERWRITING_STANDARD_VERSION;
  const storedVersion = normalizeSavedMethodologyVersion(
    input.storedMethodologyVersion
  );

  // The comparison key describes the methodology that produced the VISIBLE
  // metrics, not merely the version stored on the database row.
  if (input.didRecompute || !input.usesRecordedSnapshot) {
    return {
      comparisonKey: `current:${currentVersion}`,
      groupLabel: `Current v${currentVersion}`,
      badgeLabel:
        storedVersion == null ||
        storedVersion === LEGACY_UNVERSIONED_METHODOLOGY
          ? `Legacy analysis · recomputed with current v${currentVersion}`
          : null,
      isCurrent: true,
    };
  }

  // A recorded snapshot stays in a recorded cohort even when its formula
  // version matches today's engine. Compare uses the same provenance boundary:
  // a frozen historical output must never be crowned against a live recompute
  // merely because the version string happens to match.
  if (storedVersion === currentVersion) {
    return {
      comparisonKey: `recorded:${currentVersion}`,
      groupLabel: `Recorded v${currentVersion}`,
      badgeLabel: `Recorded v${currentVersion}`,
      // The immutable snapshot is a separate comparison provenance, but it
      // was produced by the currently released formula and remains eligible
      // for current Buy Box screening. Ordinary newly saved deals land here.
      isCurrent: true,
    };
  }

  if (
    storedVersion == null ||
    storedVersion === LEGACY_UNVERSIONED_METHODOLOGY
  ) {
    return {
      comparisonKey: `unavailable:legacy-unversioned:${input.recordId ?? "unknown"}`,
      groupLabel: "Recorded legacy · re-underwrite to compare",
      badgeLabel: "Recorded legacy · re-underwrite",
      isCurrent: false,
    };
  }

  const recordedVersion = storedVersion;
  const recordedLabel = `Recorded v${recordedVersion}`;
  return {
    comparisonKey: `recorded:${recordedVersion}`,
    groupLabel: recordedLabel,
    badgeLabel: recordedLabel,
    isCurrent: false,
  };
}

export type MethodologyComparableDeal = {
  createdAt?: string;
  methodologyComparisonKey?: string;
  methodologyGroupLabel?: string;
  methodologyIsCurrent?: boolean;
};

/**
 * Current results lead; recorded cohorts follow and are sorted only within
 * their own formula version. Missing metrics remain last in either direction.
 */
export function sortDealsWithinMethodologyCohorts<
  T extends MethodologyComparableDeal,
>(
  deals: readonly T[],
  valueFor: (deal: T) => number | null,
  direction: "asc" | "desc"
): T[] {
  const directionMultiplier = direction === "asc" ? 1 : -1;
  return [...deals].sort((a, b) => {
    const aCurrent = a.methodologyIsCurrent !== false;
    const bCurrent = b.methodologyIsCurrent !== false;
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;

    const aKey = a.methodologyComparisonKey ?? "current:unknown";
    const bKey = b.methodologyComparisonKey ?? "current:unknown";
    if (aKey !== bKey) {
      // Never use the metric to order unlike cohorts.
      return aKey.localeCompare(bKey, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    const aValue = valueFor(a);
    const bValue = valueFor(b);
    const aUsable = typeof aValue === "number" && Number.isFinite(aValue);
    const bUsable = typeof bValue === "number" && Number.isFinite(bValue);
    if (aUsable !== bUsable) return aUsable ? -1 : 1;
    if (aUsable && bUsable && aValue !== bValue) {
      return aValue > bValue ? directionMultiplier : -directionMultiplier;
    }
    return (
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
    );
  });
}

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
  /** Unique target-method IRR when this row was recomputed by the current engine. */
  irrPct?: number | null;
  irrStatus?: "unique" | "multiple" | "none";
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
  /** Formula cohort for dashboard ranking and aggregation. */
  methodologyComparisonKey?: string;
  /** Visible cohort heading for mixed-version books. */
  methodologyGroupLabel?: string;
  /** False when the visible metrics are an older recorded standard. */
  methodologyIsCurrent?: boolean;
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
  const cashToClose = toNumber(snapshot.totalCashRequired);
  return {
    id: row.id,
    address: getAddress(row),
    propertyType: row.property_type,
    propertyTypeLabel: getTypeLabel(row.property_type),
    purchasePrice: toNumber(row.purchase_price),
    cashFlowMonthly: firstNumber(snapshot.netCashFlow, snapshot.net_cash_flow, row.net_cash_flow_monthly),
    annualCashFlow: getAnnualCashFlow(snapshot),
    cocReturnPct: applicableCashOnCashValue(
      firstNumber(snapshot.cocReturn, row.coc_return_pct),
      cashToClose
    ),
    capRatePct: toNumber(snapshot.capRate),
    dscr: getDscr(snapshot),
    monthlyPayment: getMonthlyPayment(snapshot),
    cashToClose,
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
