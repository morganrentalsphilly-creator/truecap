"use client";

import { useMemo, type ReactNode } from "react";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowUpDown,
  Award,
  Briefcase,
  DollarSign,
  Layers,
  Percent,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  REVEAL_DEAL_EVENT,
  TopDeals,
  type DashboardTopDeal,
} from "@/components/dashboard/TopDeals";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { dealAnchorSelector, pickRenderedAnchor } from "@/lib/deal-anchor";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";

// The two recharts-heavy panels load as their own chunks so the
// dashboard's initial JS ships without the ~100KB charting library —
// empty-portfolio users never download it at all, and everyone else
// gets the headline numbers painted before the charts hydrate.
const ChartSkeleton = ({ heightClass }: { heightClass: string }) => (
  <div
    className={`${heightClass} animate-pulse rounded-2xl border border-border bg-card`}
  />
);
const PortfolioChart = dynamic(
  () =>
    import("@/components/dashboard/PortfolioChart").then(
      (m) => m.PortfolioChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[320px]" /> },
);
const RiskReturn = dynamic(
  () => import("@/components/dashboard/RiskReturn").then((m) => m.RiskReturn),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[320px]" /> },
);
const OwnedEquityChart = dynamic(
  () =>
    import("@/components/dashboard/owned-equity-chart").then(
      (m) => m.OwnedEquityChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[380px]" /> },
);
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import {
  resolveReturnMetric,
  resolveRiskMetric,
} from "@/lib/dashboard-risk-return";
import {
  EXTREME_ROI_CUMULATIVE_PCT,
  formatRoiHeadline,
  isExtremeCumulativeRoi,
} from "@/lib/extreme-value-format";
import { recommendationLabel } from "@/lib/deal-score";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { YourDealsTable } from "@/components/dashboard/your-deals-table";
import { ScreeningRecord } from "@/components/dashboard/screening-record";
import { cn, scrollBehavior } from "@/lib/utils";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline";

export type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { RateWatchStrip } from "@/components/dashboard/RateWatchStrip";
import type { RateWatchSummary } from "@/lib/rate-watch";
import {
  DueThisWeekCard,
  type AgingDealRow,
  type DueThisWeekDeal,
} from "@/components/dashboard/due-this-week-card";
import { BuyBoxNudge } from "@/components/dashboard/buy-box-nudge";
import type { OwnedEquitySeriesPoint } from "@/lib/owned-equity-series";
import type { BuyBoxFitSummary } from "@/lib/buy-box";
import { applicableCashOnCashValue } from "@/lib/cash-on-cash-applicability";
import {
  hasCompleteMetricCoverage,
  summarizeKnownMetric,
} from "@/lib/portfolio-metric-coverage";

export type DashboardHomeData = {
  user: {
    displayName: string;
    email: string;
    avatarSrc?: string;
    isPremium?: boolean;
    canAccessDashboard?: boolean;
  };
  stats: {
    totalDeals: number;
  };
  /**
   * True saved-deal total (active + completed + archived, non-deleted) —
   * the SAME count as the sidebar "My Deals" badge. portfolioAggregates is
   * active-only, so the header uses this to show active vs. total instead
   * of a number that looks like it disagrees with the sidebar.
   */
  savedTotalCount?: number;
  allDeals: DashboardDeal[];
  topDeals: DashboardDeal[];
  /**
   * Full-portfolio totals computed server-side over EVERY active deal
   * (allDeals is capped at the 20 most recent for the cards/charts).
   * Null when the aggregate query failed — getPortfolioTotals then
   * falls back to computing over the sample.
   */
  portfolioAggregates?: {
    totalValue: number;
    totalCashFlow: number;
    weightedCap: number | null;
    activeCount: number;
    totalCount: number;
    cashFlowSampleCount: number;
    capRateSampleCount: number;
    /**
     * Decision Center / KPI winners computed server-side over the FULL
     * active set (NT-4) — scalars only, never the row set. Without these a
     * 21+-deal user's insights ran on the 20-most-recent sample: "Needs
     * Review: 0" while deal #23 bleeds. Optional/back-compatible: absent →
     * getDecisionCenter/getPortfolioKpis fall back to the sample.
     */
    winners?: {
      bestByScore: {
        id: string;
        address: string;
        score: number;
        recommendation: string;
      } | null;
      /** Most negative cash-flow deal; null = a TRUE all-clear over the full set. */
      worstNegative: {
        id: string;
        address: string;
        cashFlowMonthly: number;
      } | null;
      bestRoi: { id: string; address: string; roiPct: number } | null;
      /** Cash-flow-negative deal count over the full active set. */
      negativeCount: number;
    } | null;
  } | null;
  /** Explicitly distinguishes a failed full-book read from an empty book. */
  portfolioAggregateStatus?: "ready" | "unavailable" | "mixed-methodology";
  /**
   * Saved deals whose signal changed at today's 30-yr rate (see
   * lib/rate-watch). Null when the rate is unavailable or nothing changed —
   * the RateWatchStrip then renders nothing.
   */
  rateWatch?: RateWatchSummary | null;
  /**
   * True only when the send-rate-alerts cron will ACTUALLY send emails
   * (RATE_ALERTS_MODE === "live", derived server-side). The RateWatchStrip
   * drops its email-promise clause when false so no surface promises an
   * email the system won't send.
   */
  alertsLive?: boolean;
  /**
   * Due-diligence checklists for the user's ACTIVE saved deals (raw items +
   * deal label), used by the "Due this week" card to surface overdue / due-
   * within-7d contingency deadlines. Status is computed client-side in the
   * viewer's local time. Undefined when the query errored or the migration is
   * unapplied — the card then renders nothing.
   */
  dueThisWeek?: DueThisWeekDeal[];
  /**
   * Active deals sitting ≥7 days in Offer / Under contract, server-computed
   * with the SAME thresholds as the workspace DealAgingNudge (lib/deal-aging)
   * so the two surfaces can't disagree. Rendered as one quiet line on the
   * "Due this week" card; undefined/empty → nothing renders.
   */
  agingDeals?: AgingDealRow[];
  /**
   * The user's OWNED (completed) deals, server-computed (M3-1). Every other
   * field on this type is active-only, so without this a customer whose
   * deals all closed saw "No saved deals yet". `totalEquity`/`equityGain`
   * are null when no owned deal has a close date + valid snapshot (count
   * and cash flow still render); `series` is the month-by-month equity
   * decomposition for the chart (null when no deal is dated). Undefined
   * when the query failed — the owned section then renders nothing.
   */
  ownedPortfolio?: {
    count: number;
    /** Null when completed deals span incompatible/unknown calculation records. */
    monthlyCashFlow: number | null;
    totalEquity: number | null;
    equityGain: number | null;
    /** How many owned deals have a close date driving the equity figures. */
    datedCount: number;
    series: OwnedEquitySeriesPoint[] | null;
    /** False while the close_date migration is unapplied — the "add close
     *  dates" CTA would dead-end on a page whose date editor is hidden. */
    equityEnabled: boolean;
  } | null;
  /**
   * Buy-box fit over the ACTIVE deals, server-evaluated (PV-1/PV-6) with the
   * same lib/buy-box primitives My Deals uses. Unset when the user has no
   * active box (or the migration is pending / the read failed) — every
   * consuming surface (header subtitle, Decision Center tile, Deal Decision
   * List badges + Fit sort) then renders nothing, the same
   * invisible-until-useful contract as My Deals.
   */
  buyBox?: {
    activeBoxCount: number;
    /** Evaluated deals that pass ≥1 active box. */
    passingCount: number;
    /** How many active deals were evaluated (allDeals, capped at 20). */
    evaluatedCount: number;
    /** True when the evaluated set is the FULL active set — the "X of your N
     *  deals" headline and tile only render when this holds, so a 21+-deal
     *  user never sees a count computed over a recency sample. */
    complete: boolean;
    fitByDealId: Record<string, BuyBoxFitSummary>;
  } | null;
};

function formatCurrency(
  value: number | null | undefined,
  compact = false,
): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

/**
 * Best-upside subline (Choose-TrueCap Phase C, finding 5): a sane 10-yr ROI
 * keeps today's exact copy; an extreme one leads with the framed band —
 * never "673.0% 10-yr ROI" — with the raw figure one hover away (title).
 * Display only; the winner selection above is untouched.
 */
function bestUpsideSubline(roiPct: number): { text: string; title?: string } {
  const headline = formatRoiHeadline(roiPct, { decimals: 1, compact: true });
  return headline.extreme
    ? {
        text: `${headline.text} 10-yr ROI — verify assumptions`,
        title: headline.title,
      }
    : { text: `${headline.text} 10-yr ROI · verify assumptions` };
}

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

function getTopDeals(data: DashboardHomeData): DashboardTopDeal[] {
  return data.topDeals.map((deal) => {
    const coc = applicableCashOnCashValue(deal.cocReturnPct, deal.cashToClose);
    return {
      id: deal.id,
      name: deal.address,
      address: deal.propertyTypeLabel,
      type: deal.propertyTypeLabel,
      capRate:
        deal.capRatePct == null ? null : Number(deal.capRatePct.toFixed(1)),
      coc: coc == null ? null : Number(coc.toFixed(1)),
      cashFlow:
        deal.cashFlowMonthly == null ? null : Math.round(deal.cashFlowMonthly),
      price: deal.purchasePrice == null ? null : Math.round(deal.purchasePrice),
      score: deal.score == null ? null : Math.round(deal.score),
      signal: deal.recommendation,
      roi: deal.roiPct == null ? null : Number(deal.roiPct.toFixed(1)),
      riskLevel: deal.riskLevel,
      breakdown: deal.breakdown,
      propertyType: deal.propertyType,
      tags: deal.tags,
      dataConfidence: deal.dataConfidence,
      // Buy-box fit (PV-6) — undefined for users without an active box, so
      // the badge and the Fit sort stay invisible for them.
      fit: data.buyBox?.fitByDealId[deal.id] ?? null,
      methodologyLabel: deal.methodologyLabel,
    };
  });
}

function getRiskReturn(data: DashboardHomeData) {
  // Each deal carries BOTH return metrics (CoC + 10-yr ROI) and its DSCR so
  // the chart can toggle the X axis client-side. Cash purchases have no DSCR
  // (N/A, not 0) — null keeps them off the DSCR axis; the chart notes them.
  const chartDeals = data.allDeals.map((deal) => {
    const isCashPurchase =
      deal.monthlyPayment != null && deal.monthlyPayment <= 0;
    const coc = applicableCashOnCashValue(deal.cocReturnPct, deal.cashToClose);
    return {
      dealId: deal.id,
      name: deal.address,
      type: deal.propertyTypeLabel,
      coc,
      roi: deal.roiPct,
      dscr: isCashPurchase ? null : deal.dscr,
      isCashPurchase,
      // Dot size encodes cash to close (capital required) — the spec's
      // "dot size = cash needed". Falls back to ~25% of price when the
      // cash figure is unknown so the point still renders sensibly.
      size: Math.max(
        80,
        Math.round(
          (deal.cashToClose ?? (deal.purchasePrice ?? 0) * 0.25) / 500,
        ),
      ),
      cashNeeded: deal.cashToClose ?? undefined,
      score: deal.score ?? undefined,
      cashFlow:
        deal.cashFlowMonthly == null
          ? undefined
          : Math.round(deal.cashFlowMonthly),
    };
  });

  const riskAdjusted = data.allDeals
    .map((deal) => {
      const returnValue = resolveReturnMetric(deal).value;
      const riskValue = resolveRiskMetric(deal).value;
      if (returnValue == null || riskValue == null || riskValue === 0)
        return null;
      return { deal, value: returnValue / riskValue };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.value - a.value)[0]?.deal;

  const highestReturn = [...data.allDeals]
    .map((deal) => ({ deal, value: resolveReturnMetric(deal).value }))
    .filter(
      (item): item is { deal: DashboardDeal; value: number } =>
        item.value != null,
    )
    .sort((a, b) => b.value - a.value)[0]?.deal;

  // Debt coverage is meaningful only for financed deals. An all-cash deal has
  // no debt service, so DSCR is N/A and cannot be promoted into an overall
  // safety claim. Rank financed deals by DSCR only; other risks remain outside
  // this narrow comparison signal.
  const safest = [...data.allDeals]
    .filter(
      (deal) =>
        deal.monthlyPayment != null &&
        deal.monthlyPayment > 0 &&
        deal.dscr != null &&
        Number.isFinite(deal.dscr),
    )
    .sort((a, b) => (b.dscr as number) - (a.dscr as number))[0];

  return {
    chartDeals,
    insights: {
      bestRiskAdjusted: riskAdjusted?.address ?? "-",
      highestReturn: highestReturn?.address ?? "-",
      safest: safest?.address ?? "-",
    },
  };
}

function getDealComparison(data: DashboardHomeData) {
  // De-collide truncated labels: two deals that share their first 18 chars
  // (e.g. same street, different unit) would otherwise plot on one merged
  // X-axis tick. Append a counter so each deal keeps a distinct tick.
  const seen = new Map<string, number>();
  return data.allDeals.map((deal) => {
    const base =
      deal.address.length > 18
        ? `${deal.address.slice(0, 18)}...`
        : deal.address;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      name: n > 1 ? `${base} (${n})` : base,
      score: deal.score == null ? null : Math.round(deal.score),
      cashFlow:
        deal.cashFlowMonthly == null ? null : Math.round(deal.cashFlowMonthly),
      roi: deal.roiPct == null ? null : Number(deal.roiPct.toFixed(1)),
    };
  });
}

function getDealAnchorId(deal: DashboardDeal | undefined, index = 0) {
  if (!deal) return "";
  return (deal.id ?? `${deal.address}-${index}`).replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
}

function revealDealAnchor(el: Element) {
  el.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
  // Move focus to the target so SR / keyboard users land on the deal instead
  // of being stranded while the viewport scrolls away (the row is tabIndex=-1
  // in TopDeals). preventScroll: our own smooth scroll owns the motion.
  if (el instanceof HTMLElement) el.focus({ preventScroll: true });
}

/**
 * The RENDERED `deal-<id>` anchor, or null if the deal isn't laid out anywhere.
 *
 * NOT getElementById: TopDeals emits the same id twice (mobile <article> in a
 * `md:hidden` stack, desktop <tr> in a `hidden … md:block` table) and both
 * copies stay in the DOM at every width, so getElementById returned the first
 * in document order — the mobile article, which is display:none from 768px up.
 * scrollIntoView/focus on a node with no layout box are silent no-ops, so
 * "Best Score" was a dead button on DESKTOP, and below md the hidden <tr>
 * masked the missing card and suppressed the REVEAL_DEAL_EVENT fallback
 * entirely. See lib/deal-anchor.ts.
 */
function findRenderedDealAnchor(id: string): HTMLElement | null {
  if (!id) return null;
  return pickRenderedAnchor(
    Array.from(document.querySelectorAll<HTMLElement>(dealAnchorSelector(id))),
  );
}

function scrollToDeal(deal: DashboardDeal | undefined, index = 0) {
  const id = getDealAnchorId(deal, index);
  if (!id) return;
  const el = findRenderedDealAnchor(id);
  if (el) {
    revealDealAnchor(el);
    return;
  }
  // Nothing rendered for this deal. Between sm and md (this section is
  // sm:block, the deal TABLE is md:block) the visible list is TopDeals' mobile
  // card stack, which renders only its top 3 — so a Cash-Flow / ROI winner
  // ranked 4th-6th by score has no laid-out anchor and the row was a dead
  // button. Ask TopDeals to expand, then retry once it has re-rendered (two
  // frames: the listener's setState is batched, the second frame runs after
  // the commit). The retry must use the same rendered-anchor lookup — the
  // collapsed deal's desktop <tr> is present-but-hidden the whole time, so
  // getElementById would "succeed" on it and scroll nowhere.
  window.dispatchEvent(
    new CustomEvent(REVEAL_DEAL_EVENT, { detail: { anchorId: id } }),
  );
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const revealed = findRenderedDealAnchor(id);
      if (revealed) revealDealAnchor(revealed);
    });
  });
}

function getDecisionHighlights(data: DashboardHomeData) {
  const deals = data.topDeals;
  const byScore = [...deals].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  )[0];
  const byCashFlow = [...deals].sort(
    (a, b) =>
      (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity),
  )[0];
  const byRoi = [...deals]
    .filter((deal) => deal.roiPct != null)
    .sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0];
  return { byScore, byCashFlow, byRoi };
}

/**
 * Decision Center — a fact-based comparison band: the highest Screening Index,
 * the worst cash-flow-negative deal to review, the highest modeled 10-yr
 * upside, a count of negatives, and a context-aware next action.
 *
 * NT-4: prefers the FULL-active-set winners computed server-side
 * (portfolioAggregates.winners) so a 21+-deal user's deal #23 can win a tile
 * or trip "Needs review" — allDeals is a 20-most-recent sample. Falls back to
 * the sample only when the aggregate query failed (winners absent).
 */
function getDecisionCenter(data: DashboardHomeData) {
  const deals = data.allDeals;
  if (deals.length === 0) return null;
  const winners = data.portfolioAggregates?.winners ?? null;
  const sampleBest =
    [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0] ?? null;
  const negatives = deals.filter(
    (d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0,
  );
  const sampleNeedsReview =
    [...negatives].sort(
      (a, b) => (a.cashFlowMonthly ?? 0) - (b.cashFlowMonthly ?? 0),
    )[0] ?? null;
  const sampleBestUpside =
    [...deals]
      .filter((d) => d.roiPct != null)
      .sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0] ??
    null;
  // A null full-set "best" just means no snapshot recomputed (legacy book) —
  // the sample's stored-score winner is still better than an empty tile.
  // MAX-GUARD for mixed books: full-set winners are fresh-score-only while
  // sample cards fall back to STORED scores for legacy snapshots — a
  // stored-92 legacy deal in the sample must not lose the tile to a
  // fresh-80 deal while outranking it in the card grid directly below.
  const best =
    winners?.bestByScore && sampleBest
      ? (winners.bestByScore.score ?? -1) >= (sampleBest.score ?? -1)
        ? winners.bestByScore
        : sampleBest
      : (winners?.bestByScore ?? sampleBest);
  const bestUpside =
    winners?.bestRoi && sampleBestUpside
      ? (winners.bestRoi.roiPct ?? -Infinity) >=
        (sampleBestUpside.roiPct ?? -Infinity)
        ? winners.bestRoi
        : sampleBestUpside
      : (winners?.bestRoi ?? sampleBestUpside);
  // needsReview is the asymmetric one: when the full set was scanned, null is
  // a TRUE all-clear (the server's fallback chain covers legacy rows too) —
  // never overwrite it with a sample-derived value in either direction.
  const needsReview = winners ? winners.worstNegative : sampleNeedsReview;
  const negativeCount = winners ? winners.negativeCount : negatives.length;
  const cashFlowKnownCount = data.portfolioAggregates
    ? data.portfolioAggregates.cashFlowSampleCount
    : deals.filter(
        (deal) =>
          typeof deal.cashFlowMonthly === "number" &&
          Number.isFinite(deal.cashFlowMonthly),
      ).length;
  const cashFlowTotalCount = data.portfolioAggregates
    ? data.portfolioAggregates.totalCount
    : deals.length;
  const cashFlowCoverageComplete =
    cashFlowKnownCount === cashFlowTotalCount;
  const nextAction =
    deals.length >= 2
      ? { label: "Compare your top deals", href: "/dashboard/compare" }
      : { label: "Analyze another property", href: "/dashboard/new?fresh=1" };
  return {
    best,
    needsReview,
    bestUpside,
    negativeCount,
    cashFlowKnownCount,
    cashFlowTotalCount,
    cashFlowCoverageComplete,
    nextAction,
  };
}

/**
 * Portfolio KPIs — the four numbers an investor underwrites a *book* on,
 * complementing the Pipeline Value / Monthly Cash Flow headline cards:
 *  - Average Screening Index (book quality)
 *  - Weighted DSCR (leverage safety; purchase-price-weighted, financed
 *    deals only — cash purchases have no debt service)
 *  - Cash to Close (capital at work = down payment + closing across deals)
 *  - Needs Review (count of cash-flow-negative deals — full active set via
 *    portfolioAggregates.winners when available, sample fallback; NT-4)
 * Computed over the active set (allDeals). Returns null when empty.
 */
function getPortfolioKpis(data: DashboardHomeData) {
  const deals = data.allDeals;
  if (deals.length === 0) return null;

  const scored = deals.filter((d) => d.score != null);
  const avgScore = scored.length
    ? scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length
    : null;

  let dscrNumerator = 0;
  let dscrDenominator = 0;
  for (const d of deals) {
    // Exclude cash purchases (monthlyPayment <= 0): they have no debt service,
    // so calc-analysis stores DSCR = 0 for them. Folding that 0 into the
    // weighted average drags portfolio "leverage safety" toward 0 — a false
    // alarm on a book that's actually safer for being un-levered. RiskReturn
    // and the "safest deal" insight already exclude cash; this KPI was the gap.
    const isCashPurchase = d.monthlyPayment != null && d.monthlyPayment <= 0;
    if (
      !isCashPurchase &&
      d.dscr != null &&
      d.purchasePrice != null &&
      d.purchasePrice > 0
    ) {
      dscrNumerator += d.dscr * d.purchasePrice;
      dscrDenominator += d.purchasePrice;
    }
  }
  const weightedDscr =
    dscrDenominator > 0 ? dscrNumerator / dscrDenominator : null;
  const allCashOnly = deals.every(
    (deal) => deal.monthlyPayment != null && deal.monthlyPayment <= 0,
  );

  const withCash = deals.filter((d) => d.cashToClose != null);
  const cashToClose = withCash.length
    ? withCash.reduce((sum, d) => sum + (d.cashToClose ?? 0), 0)
    : null;

  // NT-4: the full-set negative count (server-computed over EVERY active
  // deal) beats counting the 20-most-recent sample — "Needs Review: 0" while
  // deal #23 bleeds is a false all-clear. Sample fallback when absent.
  const needsReviewCount =
    data.portfolioAggregates?.winners?.negativeCount ??
    deals.filter((d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0)
      .length;

  const cashFlowKnownCount = data.portfolioAggregates
    ? data.portfolioAggregates.cashFlowSampleCount
    : deals.filter(
        (deal) =>
          typeof deal.cashFlowMonthly === "number" &&
          Number.isFinite(deal.cashFlowMonthly),
      ).length;
  const cashFlowTotalCount = data.portfolioAggregates
    ? data.portfolioAggregates.totalCount
    : deals.length;
  const cashFlowCoverageComplete =
    cashFlowKnownCount === cashFlowTotalCount;

  return {
    avgScore,
    weightedDscr,
    allCashOnly,
    cashToClose,
    needsReviewCount,
    cashFlowKnownCount,
    cashFlowTotalCount,
    cashFlowCoverageComplete,
  };
}

/**
 * Pipeline summary — count + total value per acquisition stage. Self-hides
 * unless the user's deals span ≥2 distinct stages, so free users (who can't
 * set stages) and Pro users who haven't started moving deals see nothing.
 */
function getPipelineSummary(data: DashboardHomeData) {
  const deals = data.allDeals;
  if (deals.length === 0) return null;
  const byStage = new Map<PipelineStage, { count: number; value: number }>();
  for (const d of deals) {
    const stage = (d.pipelineStage ?? "analyzing") as PipelineStage;
    const cur = byStage.get(stage) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += d.purchasePrice ?? 0;
    byStage.set(stage, cur);
  }
  if (byStage.size < 2) return null;
  const segments = PIPELINE_STAGES.filter((s) => byStage.has(s.id)).map((s) => {
    const entry = byStage.get(s.id)!;
    return { id: s.id, label: s.label, count: entry.count, value: entry.value };
  });
  return { segments };
}

/**
 * Portfolio-level totals — answers the question every investor asks
 * each morning: "what does my book look like right now?" Computed
 * over allDeals (not topDeals) so it reflects the full saved set.
 *
 * - Total Pipeline Value: sum of purchase prices
 * - Monthly Cash Flow: sum (with signed display)
 * - Weighted Cap Rate: purchase-price-weighted average so a $1M deal
 *   doesn't get the same weight as a $100k one
 * - Active Deals: count of deals with a non-null purchase price
 */
function getPortfolioTotals(data: DashboardHomeData) {
  // Prefer the server-computed full-portfolio aggregates — allDeals is
  // a 20-most-recent sample, and summing a sample silently understated
  // Pipeline Value / Monthly Cash Flow for users with 21+ deals.
  if (data.portfolioAggregates) return data.portfolioAggregates;
  if (
    data.portfolioAggregateStatus === "unavailable" ||
    data.portfolioAggregateStatus === "mixed-methodology"
  )
    return null;
  const valid = data.allDeals.filter((d) => d.purchasePrice != null);
  const totalValue = valid.reduce((s, d) => s + (d.purchasePrice ?? 0), 0);
  const cashFlowSummary = summarizeKnownMetric(
    data.allDeals.map((deal) => deal.cashFlowMonthly),
  );
  const capWeighted = valid.reduce(
    (acc, d) => {
      const price = d.purchasePrice ?? 0;
      const cap = d.capRatePct;
      if (cap == null || price <= 0) return acc;
      return { num: acc.num + cap * price, den: acc.den + price };
    },
    { num: 0, den: 0 },
  );
  const capRateSampleCount = valid.reduce(
    (count, deal) =>
      deal.capRatePct != null && Number.isFinite(deal.capRatePct)
        ? count + 1
        : count,
    0,
  );
  const weightedCap =
    capWeighted.den > 0 ? capWeighted.num / capWeighted.den : null;
  return {
    totalValue,
    totalCashFlow: cashFlowSummary.total,
    weightedCap,
    activeCount: valid.length,
    totalCount: data.allDeals.length,
    cashFlowSampleCount: cashFlowSummary.knownCount,
    capRateSampleCount,
  };
}

/**
 * Decision insights — each follows Observation (title) → Evidence (exact
 * metrics from the deal) → Action (a concrete next step + CTA). Deduped by
 * deal id so one strong deal doesn't fill all the slots, and including a
 * cash-flow-negative "review" callout when present.
 */
function buildDecisionInsights(deals: DashboardDeal[]) {
  if (deals.length === 0) return [];

  // With a single saved deal, "Compare deals" dead-ends on the compare
  // page's "you need at least 2 deals" apology screen — the first CTA a
  // new subscriber taps must not bounce. Mirror getDecisionCenter's ≥2
  // gate and point them at analyzing a second property instead. (FFM-4)
  const canCompare = deals.length >= 2;

  const best = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const needsReview = [...deals]
    .filter((d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0)
    .sort((a, b) => (a.cashFlowMonthly ?? 0) - (b.cashFlowMonthly ?? 0))[0];
  const cash = [...deals].sort(
    (a, b) =>
      (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity),
  )[0];
  const roi = [...deals]
    .filter((d) => d.roiPct != null)
    .sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0];

  // Dedupe by id so the same deal never appears in two cards.
  const seen = new Set<string>();
  const pick = (d?: DashboardDeal): DashboardDeal | null => {
    if (!d || seen.has(d.id)) return null;
    seen.add(d.id);
    return d;
  };
  const bestPick = pick(best);
  const reviewPick = pick(needsReview);
  const cashPick = pick(cash);
  const roiPick = pick(roi);
  const cashPickCoc = cashPick
    ? applicableCashOnCashValue(cashPick.cocReturnPct, cashPick.cashToClose)
    : null;

  const evidence = (d: DashboardDeal): string => {
    const coc = applicableCashOnCashValue(d.cocReturnPct, d.cashToClose);
    return [
      d.score != null
        ? `Secondary Screening Index ${Math.round(d.score)}`
        : null,
      d.recommendation ? recommendationLabel(d.recommendation) : null,
      d.cashFlowMonthly != null
        ? `${formatSignedCurrency(d.cashFlowMonthly)}/mo`
        : null,
      d.capRatePct != null ? `${d.capRatePct.toFixed(1)}% cap` : null,
      coc != null ? `${coc.toFixed(1)}% CoC` : null,
      d.dscr != null ? `DSCR ${d.dscr.toFixed(2)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return [
    bestPick
      ? {
          title: `Top opportunity: ${bestPick.address}`,
          body: canCompare
            ? `${evidence(bestPick)}. Next: compare it with your other top deals, verify the material inputs, and record your decision.`
            : `${evidence(bestPick)}. Next: save a second deal to compare it side-by-side.`,
          tone: "opportunity" as const,
          action: canCompare
            ? { label: "Compare deals", href: "/dashboard/compare" }
            : {
                label: "Analyze another property",
                href: "/dashboard/new?fresh=1",
              },
        }
      : null,
    reviewPick
      ? {
          title: `Review: ${reviewPick.address} is cash-flow negative`,
          body: `${formatSignedCurrency(reviewPick.cashFlowMonthly)}/mo at current assumptions${reviewPick.dscr != null ? ` · DSCR ${reviewPick.dscr.toFixed(2)}` : ""}. Next: review the price and rent assumptions, rerun, then record your decision.`,
          tone: "risk" as const,
          // Deep-link to the named deal so "fix it" is one tap, not a hunt
          // through the list (the deal-detail screen is where re-underwriting,
          // lowering the offer, and exporting actually happen).
          action: {
            label: "Open this deal",
            href: `/dashboard/saved-analyses/${reviewPick.id}`,
          },
        }
      : null,
    cashPick
      ? {
          title: `Strongest cash flow: ${cashPick.address}`,
          body: `${formatSignedCurrency(cashPick.cashFlowMonthly)}/mo today${cashPickCoc != null ? ` · ${cashPickCoc.toFixed(1)}% cash-on-cash` : ""}. Next: stress-test vacancy and repairs before you commit.`,
          tone: "tip" as const,
          action: {
            label: "Open this deal",
            href: `/dashboard/saved-analyses/${cashPick.id}`,
          },
        }
      : null,
    roiPick
      ? {
          title: `Best long-term upside: ${roiPick.address}`,
          // Extreme cumulative ROI (finding 5): lead with the caution, keep
          // the raw figure as the secondary clause instead of the headline.
          body: isExtremeCumulativeRoi(roiPick.roiPct)
            ? `Unusually high projected 10-yr ROI — ${formatPercent(roiPick.roiPct)} cumulative is above the ${EXTREME_ROI_CUMULATIVE_PCT}% band at ${roiPick.riskLevel ?? "unrated"} risk. Verify rent, price, appreciation, and the full cash-flow timeline before trusting it.`
            : `${formatPercent(roiPick.roiPct)} projected 10-yr ROI at ${roiPick.riskLevel ?? "unrated"} risk. Note: that's cumulative — review the cash-flow timeline and assumptions before trusting it.`,
          tone: "opportunity" as const,
          action: {
            label: "Open this deal",
            href: `/dashboard/saved-analyses/${roiPick.id}`,
          },
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function DashboardHome({
  data,
  canCompareDeals = false,
  leadsSlot = null,
}: {
  data: DashboardHomeData;
  canCompareDeals?: boolean;
  /** Rendered inside the scrolling <main> (e.g. DealLeadsCard, an async server
   *  component passed from the page) so it isn't clipped by the fixed-viewport
   *  shell on desktop. */
  leadsSlot?: ReactNode;
}) {
  const initials = getInitials(data.user.displayName, data.user.email);

  // All derived views memoized on `data` — these walk the deal list
  // several times each, and re-running them on every re-render (Topbar
  // interactions etc.) is pure waste. `data` comes from the server
  // component and is referentially stable per page load.
  const {
    topDeals,
    riskReturn,
    dealComparison,
    highlights,
    insights,
    portfolio,
    decisionCenter,
    kpis,
    pipeline,
  } = useMemo(() => {
    // The legacy dashboard modules contain rankings and charts beyond the
    // focused Your Deals table. When the book spans methodologies, feed those
    // modules only the current cohort rather than comparing unlike outputs.
    const comparableData =
      data.portfolioAggregateStatus === "mixed-methodology"
        ? {
            ...data,
            allDeals: data.allDeals.filter(
              (deal) => deal.methodologyIsCurrent !== false,
            ),
            topDeals: data.topDeals.filter(
              (deal) => deal.methodologyIsCurrent !== false,
            ),
          }
        : data;
    return {
      topDeals: getTopDeals(comparableData),
      riskReturn: getRiskReturn(comparableData),
      dealComparison: getDealComparison(comparableData),
      highlights: getDecisionHighlights(comparableData),
      insights: buildDecisionInsights(comparableData.allDeals),
      portfolio: getPortfolioTotals(data),
      decisionCenter:
        data.portfolioAggregateStatus === "unavailable" ||
        data.portfolioAggregateStatus === "mixed-methodology"
          ? null
          : getDecisionCenter(data),
      kpis:
        data.portfolioAggregateStatus === "unavailable" ||
        data.portfolioAggregateStatus === "mixed-methodology"
          ? null
          : getPortfolioKpis(data),
      pipeline:
        data.portfolioAggregateStatus === "unavailable"
          ? null
          : getPipelineSummary(data),
    };
  }, [data]);

  const hasAnyDeals = data.allDeals.length > 0;
  // NT-4: the charts + deal list below run on the 20-most-recent sample by
  // design (per-row payload is heavy). When the full active set is LARGER,
  // say so in a muted caption — a truth-layer product never lets a sampled
  // chart pass itself off as the whole book. Null (no caption) when the
  // sample IS the full set or the aggregate count is unavailable.
  const sampledNote =
    data.portfolioAggregateStatus === "unavailable"
      ? `Showing up to ${data.allDeals.length} recent active deals. Full portfolio totals are temporarily unavailable.`
      : data.portfolioAggregateStatus === "mixed-methodology"
        ? "Recorded and current underwriting versions are shown separately; formula-dependent totals and winners are withheld until the recorded deals are re-underwritten."
        : data.portfolioAggregates &&
            data.portfolioAggregates.totalCount > data.allDeals.length
          ? `Showing your ${data.allDeals.length} most recent active deals (of ${data.portfolioAggregates.totalCount}) — totals and Decision Center cover every active deal.`
          : null;
  // Active deals (portfolio.totalCount) vs the full saved set
  // (savedTotalCount = the sidebar "My Deals" badge count). When the user
  // has archived/completed deals the two differ, so we surface both and
  // never show a dashboard number that contradicts the sidebar badge.
  const savedTotalCount =
    data.savedTotalCount ?? portfolio?.totalCount ?? data.stats.totalDeals;
  const hasArchivedOrCompleted = Boolean(
    portfolio && savedTotalCount > portfolio.totalCount,
  );
  const portfolioCashFlowCoverageComplete = Boolean(
    portfolio &&
    hasCompleteMetricCoverage({
      knownCount: portfolio.cashFlowSampleCount,
      totalCount: portfolio.totalCount,
    }),
  );
  const portfolioPriceCoverageComplete = Boolean(
    portfolio && portfolio.activeCount === portfolio.totalCount,
  );
  const portfolioCapCoverageComplete = Boolean(
    portfolio && portfolio.capRateSampleCount === portfolio.totalCount,
  );
  // Modeled equity is not actual portfolio performance. Keep the entire
  // surface (including its header language and empty-state branch) dark until
  // actual transactions and provenance are implemented separately.
  const owned = isFeatureEnabled("owned_portfolio_actuals")
    ? data.ownedPortfolio ?? null
    : null;
  const ownedCount = owned?.count ?? 0;
  // Buy-box awareness (PV-1): headline + Decision Center tile only when the
  // user has ≥1 active box AND the server evaluated the FULL active set AND
  // there are ≥2 active deals — the FFM-2 gate (CONFLICT #8): a 1-deal user
  // gets the honest nudge card, not a fourth tile crowning a set of one.
  const buyBoxSummary =
    data.buyBox && data.buyBox.complete && data.allDeals.length >= 2
      ? data.buyBox
      : null;
  // FALSE-HEADER FIX (M3-1): "No saved deals yet" was factually wrong for a
  // customer whose deals all CLOSED (savedTotalCount > 0, active = 0) — the
  // product's success case. Owners get their portfolio as the headline;
  // archived-only users get an honest "all archived" line. The literal
  // "no deals" copy is now reserved for genuinely-empty accounts.
  const headerSubtitle = !hasAnyDeals
    ? ownedCount > 0
      ? `You own ${ownedCount} ${ownedCount === 1 ? "property" : "properties"}${
          owned?.totalEquity != null
            ? ` · ~${formatCurrency(owned.totalEquity, true)} equity`
            : ""
        }.`
      : savedTotalCount > 0
        ? // Scope-neutral: this branch also catches completed-not-archived
          // deals when the owned query errors (ownedPortfolio undefined),
          // so it must not assert "archived" as fact.
          `No active deals — your ${savedTotalCount} saved ${savedTotalCount === 1 ? "deal is" : "deals are"} closed or archived. Analyze a new property to restart your pipeline.`
        : "No saved deals yet. Run your first analysis to see it appear here."
    : buyBoxSummary
      ? // PV-1: the month-3 question is "do any of MY deals meet MY criteria
        // yet?" — answer it in the headline for configured users.
        `${buyBoxSummary.passingCount} of your ${buyBoxSummary.evaluatedCount} active deals ${buyBoxSummary.passingCount === 1 ? "meets" : "meet"} your buy box.`
      : data.portfolioAggregateStatus === "unavailable"
        ? "Recent active deals are shown below. Full portfolio totals are temporarily unavailable."
        : data.portfolioAggregateStatus === "mixed-methodology"
          ? "Active deals are shown below. Recorded and current underwriting versions are not blended."
          : hasArchivedOrCompleted && portfolio
            ? `Active pipeline: ${portfolio.totalCount} of ${savedTotalCount} saved ${savedTotalCount === 1 ? "deal" : "deals"}.`
            : portfolio
              ? `Your book at a glance — ${portfolio.totalCount} active ${portfolio.totalCount === 1 ? "deal" : "deals"}.`
              : "Your recent active deals are shown below.";

  // SCROLL CONTRACT (natural scroll, Jun 2026): the dashboard scrolls the
  // PAGE/body naturally — NOT a viewport-locked inner pane. The shell is a
  // `min-h-screen` flex row; the Sidebar is `lg:sticky lg:top-0 lg:h-screen`
  // so it pins while the content scrolls; each page's content is plain flow
  // (no `lg:h-screen`/`overflow-hidden`/inner `overflow-y-auto`). This
  // replaced an earlier viewport-lock that repeatedly let the body over-scroll
  // into dead space when a marketing banner sat above the 100vh shell. Keep all
  // four pages (home, saved-analyses, compare, templates) + the shell + sidebar
  // on this same model — never reintroduce the lock on one side alone.
  const focusedDashboard = isFeatureEnabled("focused_dashboard");
  // A real name only. profiles.display_name / first_name are the only real
  // sources; page.tsx already degrades to the email local-part, so anything
  // matching the email's local-part is NOT a name.
  const emailLocalPart = data.user.email.split("@")[0] ?? "";
  const candidateName = data.user.displayName.split(" ")[0] ?? "";
  const firstName =
    candidateName &&
    candidateName.toLowerCase() !== emailLocalPart.toLowerCase()
      ? candidateName
      : "";

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <Topbar
        displayName={data.user.displayName}
        email={data.user.email}
        initials={initials}
        avatarSrc={data.user.avatarSrc}
        isPremium={data.user.isPremium}
        canAccessDashboard={data.user.canAccessDashboard}
      />
      <main
        id="main"
        className="flex-1 px-4 py-4 space-y-6 sm:px-6 sm:py-6 sm:space-y-8 lg:px-8"
      >
        {/* ── Header + quick actions ──────────────────────────────── */}
        {/* Top-right action buttons (Analyze Property / My Deals /
            Compare) now ONLY render on mobile (`lg:hidden`). On desktop
            the sidebar already exposes the same destinations under
            "New Analysis", "My Deals", "Compare Deals" — duplicating
            them up here was visual noise. On mobile the sidebar
            collapses to a hamburger, so these stay essential. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight">
              {/* An email local-part is not a name. page.tsx's getDisplayName
                  already falls back to it, so the old second fallback here was
                  dead code that guaranteed "Welcome back, morganrentalsphilly".
                  If we don't have a real first name, greet without one. */}
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
              {headerSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            {/* No "Analyze Property" here: the fixed Topbar directly above
                already carries the gradient analyze CTA — two identical
                primary buttons in the first viewport wrapped this row to
                two lines at 375px (mobile density audit DH-4). */}
            <Button
              asChild
              variant="outline"
              className="min-h-11 rounded-xl px-4 text-sm"
            >
              <Link href="/dashboard/saved-analyses" prefetch={false}>
                <Briefcase className="h-4 w-4" />
                My Deals
              </Link>
            </Button>
            {canCompareDeals ? (
              <Button
                asChild
                variant="outline"
                className="min-h-11 rounded-xl px-4 text-sm"
              >
                <Link href="/dashboard/compare" prefetch={false}>
                  <ArrowUpDown className="h-4 w-4" />
                  Compare
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="min-h-11 rounded-xl px-4 text-sm"
                title="Compare 2-4 deals side-by-side — Pro feature"
              >
                <Link href="/pricing" prefetch={false}>
                  <ArrowUpDown className="h-4 w-4" />
                  Compare
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    PRO
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {data.portfolioAggregateStatus === "unavailable" ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-warning/35 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                Portfolio totals temporarily unavailable
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your saved deals are still here. The list below shows recent
                deals, but TrueCap will not present that sample as your full
                portfolio.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="min-h-11 shrink-0 rounded-xl"
            >
              <Link href="/dashboard" prefetch={false}>
                Retry totals
              </Link>
            </Button>
          </div>
        ) : null}

        {data.portfolioAggregateStatus === "mixed-methodology" ? (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-2xl border border-warning/35 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                Recorded and current underwriting stay separate
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                TrueCap will not blend or crown winners across different model
                versions. Re-underwrite recorded deals before comparing the book
                as one set.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="min-h-11 shrink-0 rounded-xl"
            >
              <Link href="/dashboard/saved-analyses" prefetch={false}>
                Review recorded deals
              </Link>
            </Button>
          </div>
        ) : null}

        {/* ── Decision Center — fact-based comparisons derived from active
            deals: highest Screening Index, first cash-flow-negative deal to
            review, highest modeled 10-yr upside, and a next workflow action. */}
        {decisionCenter ? (
          <section
            aria-label="Decision center"
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Decision center
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  These highlights compare modeled outputs only. The Screening
                  Index is a secondary heuristic, not an investment directive;
                  verify every material assumption before relying on a
                  comparison.
                </p>
              </div>
              <Link
                href={decisionCenter.nextAction.href}
                prefetch={false}
                className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Next: {decisionCenter.nextAction.label} →
              </Link>
            </div>
            {/* Horizontal snap rail below sm — three stacked full-width
                tiles made the "band" a full screen tall at 375px
                (mobile density audit DH-3). Grid from sm: as before; when the
                buy-box tile (PV-1) joins, 2×2 at sm and one row of 4 at xl so
                the fourth tile never orphans onto its own row. */}
            <div
              className={cn(
                "mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:overflow-visible sm:pb-0 [&>*]:min-w-[72%] [&>*]:snap-start sm:[&>*]:min-w-0",
                buyBoxSummary
                  ? "sm:grid-cols-2 xl:grid-cols-4"
                  : "sm:grid-cols-3",
              )}
            >
              <Link
                href={
                  decisionCenter.best
                    ? `/dashboard/saved-analyses/${decisionCenter.best.id}`
                    : "/dashboard/saved-analyses"
                }
                prefetch={false}
                aria-label={`Open highest-screening deal: ${decisionCenter.best?.address ?? "My Deals"}`}
                className="rounded-xl border border-success/30 bg-success/5 p-3 transition hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-success">
                  <Award className="h-3.5 w-3.5" /> Highest screening index
                </div>
                <div className="mt-1 truncate text-sm font-bold text-foreground">
                  {decisionCenter.best?.address ?? "—"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {decisionCenter.best?.score != null
                    ? `Screening Index ${Math.round(decisionCenter.best.score)}`
                    : "—"}
                  {decisionCenter.best?.recommendation
                    ? ` · ${recommendationLabel(decisionCenter.best.recommendation)}`
                    : ""}
                </div>
                <span className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-success">
                  Open deal →
                </span>
              </Link>
              <Link
                href={
                  decisionCenter.needsReview
                    ? `/dashboard/saved-analyses/${decisionCenter.needsReview.id}`
                    : "/dashboard/saved-analyses?state=active"
                }
                prefetch={false}
                aria-label={
                  decisionCenter.needsReview
                    ? `Review ${decisionCenter.needsReview.address}`
                    : decisionCenter.cashFlowCoverageComplete
                      ? "View active deals"
                      : "Review deals missing cash-flow data"
                }
                className={cn(
                  "rounded-xl border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  decisionCenter.needsReview
                    ? "border-destructive/30 bg-destructive/5"
                    : decisionCenter.cashFlowCoverageComplete
                      ? "border-border bg-muted/20"
                      : "border-warning/35 bg-warning/10",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                    decisionCenter.needsReview
                      ? "text-destructive"
                      : decisionCenter.cashFlowCoverageComplete
                        ? "text-muted-foreground"
                        : "text-warning-foreground",
                  )}
                >
                  {decisionCenter.needsReview ||
                  !decisionCenter.cashFlowCoverageComplete ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : null}{" "}
                  Needs review
                </div>
                {decisionCenter.needsReview ? (
                  <>
                    <div className="mt-1 truncate text-sm font-bold text-foreground">
                      {decisionCenter.needsReview.address}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatSignedCurrency(
                        decisionCenter.needsReview.cashFlowMonthly,
                      )}
                      /mo · {decisionCenter.negativeCount} cash-flow negative
                    </div>
                  </>
                ) : decisionCenter.cashFlowCoverageComplete ? (
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    All active deals cash-flow positive ✓
                  </div>
                ) : (
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    Cash flow known for {decisionCenter.cashFlowKnownCount} of{" "}
                    {decisionCenter.cashFlowTotalCount} active deals
                  </div>
                )}
                <span className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary">
                  {decisionCenter.needsReview
                    ? "Review deal →"
                    : decisionCenter.cashFlowCoverageComplete
                      ? "View active deals →"
                      : "Review missing data →"}
                </span>
              </Link>
              <Link
                href={
                  decisionCenter.bestUpside
                    ? `/dashboard/saved-analyses/${decisionCenter.bestUpside.id}`
                    : "/dashboard/saved-analyses"
                }
                prefetch={false}
                aria-label={`Open highest modeled-upside deal: ${decisionCenter.bestUpside?.address ?? "My Deals"}`}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3 transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <TrendingUp className="h-3.5 w-3.5" /> Highest modeled upside
                </div>
                <div className="mt-1 truncate text-sm font-bold text-foreground">
                  {decisionCenter.bestUpside?.address ?? "—"}
                </div>
                <div
                  className="truncate text-xs text-muted-foreground"
                  title={
                    decisionCenter.bestUpside?.roiPct != null
                      ? bestUpsideSubline(decisionCenter.bestUpside.roiPct)
                          .title
                      : undefined
                  }
                >
                  {decisionCenter.bestUpside?.roiPct != null
                    ? bestUpsideSubline(decisionCenter.bestUpside.roiPct).text
                    : "Run a 10-yr projection"}
                </div>
                <span className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary">
                  {decisionCenter.bestUpside
                    ? "Open deal →"
                    : "View My Deals →"}
                </span>
              </Link>
              {/* PV-1: the personal tile — how many active deals pass the
                  user's own criteria, deep-linking to My Deals pre-filtered
                  to the fits (?buyBox=1 seeds the existing buyBoxOnly
                  filter). Only for users with ≥1 active box AND ≥2 deals
                  (CONFLICT #8) — everyone else keeps the 3-tile band. */}
              {buyBoxSummary ? (
                <Link
                  // 0 passing + the fit filter = an empty list with no
                  // explanation; land unfiltered instead so the per-deal
                  // "Misses buy box" badges show the gaps.
                  href={
                    buyBoxSummary.passingCount > 0
                      ? "/dashboard/saved-analyses?buyBox=1"
                      : "/dashboard/saved-analyses"
                  }
                  prefetch={false}
                  className="rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)]/50 p-3 transition hover:bg-[var(--brand-green-light)]"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)]">
                    <Target className="h-3.5 w-3.5" /> Meets your buy box
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-foreground">
                    {buyBoxSummary.passingCount} of{" "}
                    {buyBoxSummary.evaluatedCount} deals
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {buyBoxSummary.passingCount > 0
                      ? "See the deals that pass →"
                      : "None pass yet — see the gaps →"}
                  </div>
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Due this week — overdue / due-within-7d due-diligence deadlines
            (inspection, appraisal, financing contingencies) across active
            saved deals. The most time-sensitive "what do I DO this week"
            answer, so it sits at the top of the action lane. Status is
            computed in the viewer's local time; renders nothing when nothing
            is overdue or due within 7 days — invisible until useful. */}
        <DueThisWeekCard
          deals={data.dueThisWeek ?? []}
          agingDeals={data.agingDeals ?? []}
        />

        {/* Rate watch — re-underwrites saved deals at today's 30-yr rate and
            surfaces the ones whose signal changed since they were saved (the
            retention hook; same pure logic as the weekly rate-alert email).
            Renders nothing when nothing changed — invisible until useful. */}
        <RateWatchStrip
          rateWatch={data.rateWatch ?? null}
          alertsLive={data.alertsLive ?? false}
        />

        {/* ── Your deals (Aug-2026 rebuild) ─────────────────────────
            ONE table replacing Portfolio Overview, Pipeline, Top
            Performers, the Deal Comparison chart, Portfolio Signals and
            Risk vs Return — and the first dashboard surface ever to carry
            an Offer Ceiling per deal, plus the gap to asking. */}
        {focusedDashboard ? (
          <>
            <YourDealsTable deals={data.allDeals} />
            {/* Truthfulness: the table shows a bounded recent sample. Without
                this line a 40-deal user reads 20 rows as their whole book. */}
            {sampledNote ? (
              <p className="px-1 text-[11px] text-muted-foreground">
                {sampledNote}
              </p>
            ) : null}
            <ScreeningRecord
              deals={data.allDeals}
              totalSavedDeals={data.savedTotalCount ?? data.stats.totalDeals}
            />
          </>
        ) : null}

        {/* ── Replaced modules. Kept behind the kill switch so the old
            dashboard is one env var away if the rebuild regresses. ──── */}
        {/* ── Owned portfolio — NOT part of the "replaced modules" below.
            It is the owner's section (equity growth for deals actually
            closed), not another view of the shopping list, so the focused
            dashboard keeps it. It self-hides when the user owns nothing, so
            a shopping user still sees exactly three modules. */}
        {/* ── Owned portfolio (M3-1 / WOW-3) — the month-3 payoff. The one
            number that grows every month by itself (equity = appreciation +
            principal paydown) for the customer who actually closed. Every
            other section on this page is active-only; this is the owner's
            section. Deals without a close date count toward N but not the
            equity figures; renders nothing when the user owns nothing —
            invisible until useful. */}
        {owned && owned.count > 0 ? (
          <section aria-label="Owned portfolio" className="space-y-4">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-card/60 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Owned portfolio · {owned.count}{" "}
                  {owned.count === 1 ? "property" : "properties"}
                </h2>
                <Link
                  href="/dashboard/saved-analyses?state=completed"
                  prefetch={false}
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  View owned deals →
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Owned Equity
                  </div>
                  <div className="mt-1 text-lg font-extrabold tabular-nums leading-tight break-words text-foreground sm:text-2xl">
                    {owned.totalEquity != null
                      ? `~${formatCurrency(owned.totalEquity)}`
                      : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {owned.totalEquity == null ? (
                      owned.equityEnabled ? (
                        <Link
                          href="/dashboard/saved-analyses?state=completed"
                          prefetch={false}
                          className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
                        >
                          add close dates to track equity
                        </Link>
                      ) : (
                        // Migration window: the date editor doesn't exist yet
                        // anywhere, so don't send the user hunting for it.
                        "equity tracking rolling out"
                      )
                    ) : owned.datedCount < owned.count ? (
                      `est. across ${owned.datedCount} dated ${owned.datedCount === 1 ? "deal" : "deals"}`
                    ) : (
                      "estimated from your assumptions"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Built Since Close
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-extrabold tabular-nums leading-tight break-words sm:text-2xl",
                      owned.equityGain != null && owned.equityGain > 0
                        ? "text-[var(--metric-positive,#16a34a)]"
                        : owned.equityGain != null && owned.equityGain < 0
                          ? "text-[var(--metric-negative,#dc2626)]"
                          : "text-foreground",
                    )}
                  >
                    {owned.equityGain != null
                      ? formatSignedCurrency(owned.equityGain)
                      : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    appreciation + principal paydown
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Monthly Cash Flow
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-extrabold tabular-nums leading-tight break-words sm:text-2xl",
                      owned.monthlyCashFlow != null && owned.monthlyCashFlow > 0
                        ? "text-[var(--metric-positive,#16a34a)]"
                        : owned.monthlyCashFlow != null &&
                            owned.monthlyCashFlow < 0
                          ? "text-[var(--metric-negative,#dc2626)]"
                          : "text-foreground",
                    )}
                  >
                    {owned.monthlyCashFlow == null
                      ? "—"
                      : formatSignedCurrency(owned.monthlyCashFlow)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {owned.monthlyCashFlow == null
                      ? "Different calculation records; re-underwrite to combine."
                      : `~${formatCurrency(owned.monthlyCashFlow * 12)} / yr, projected`}
                  </div>
                </div>
              </div>
            </div>
            {/* Equity growth curve — needs ≥2 monthly points to draw a line
                (a deal closed this month shows the tiles above; the curve
                appears from month 1). Lazy chunk à la PortfolioChart. */}
            {owned.series && owned.series.length >= 2 ? (
              <OwnedEquityChart data={owned.series} />
            ) : null}
          </section>
        ) : null}

        {!focusedDashboard ? (
          <>
            {/* ── Portfolio overview — answers "what's my book worth?" ──
            Trimmed from 4 StatCards to 2 hero cards + 1 stat strip.
            Pipeline Value and Monthly Cash Flow are the answers
            investors want first; Weighted Cap Rate and Saved Deals are
            context, not headlines. Moving them into a one-line stat
            strip below halves the visual chrome of this section and
            lets the charts breathe sooner. Both hero cards use the
            same brand tone (`primary` + `success`) — restricting to 2
            tones across the dashboard instead of 4 (was primary,
            success, violet, gold) reads as a serious financial
            product rather than a colorful bento grid. */}
            {hasAnyDeals && portfolio ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Portfolio overview
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    label="Pipeline Value"
                    value={
                      portfolio.activeCount > 0
                        ? formatCurrency(portfolio.totalValue, true)
                        : "—"
                    }
                    change={null}
                    changeLabel={
                      portfolioPriceCoverageComplete
                        ? `Across all ${portfolio.totalCount} active ${portfolio.totalCount === 1 ? "deal" : "deals"}.`
                        : `Known total across ${portfolio.activeCount} of ${portfolio.totalCount} active deals with price data.`
                    }
                    icon={Briefcase}
                    spark={[]}
                    tone="primary"
                    changeSuffix=""
                  />
                  <StatCard
                    label="Monthly Cash Flow"
                    value={
                      portfolio.cashFlowSampleCount > 0
                        ? formatSignedCurrency(portfolio.totalCashFlow)
                        : "—"
                    }
                    change={null}
                    changeLabel={
                      portfolio.cashFlowSampleCount === 0
                        ? `No cash-flow data is recorded for these ${portfolio.totalCount} active ${portfolio.totalCount === 1 ? "deal" : "deals"}.`
                        : portfolioCashFlowCoverageComplete
                          ? `If all ${portfolio.totalCount} active ${portfolio.totalCount === 1 ? "deal" : "deals"} closed at current assumptions: ${formatSignedCurrency(portfolio.totalCashFlow)}/month.`
                          : `Known total across ${portfolio.cashFlowSampleCount} of ${portfolio.totalCount} active deals at current assumptions: ${formatSignedCurrency(portfolio.totalCashFlow)}/month.`
                    }
                    icon={DollarSign}
                    spark={[]}
                    tone="success"
                    changeSuffix=""
                  />
                </div>
                {/* One-line stat strip — supplementary context that doesn't
                deserve full StatCard chrome. Dot-separators visually
                connect them as a single fact line. */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card/40 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="font-semibold text-foreground">
                      {portfolio.weightedCap == null
                        ? "-"
                        : `${portfolio.weightedCap.toFixed(2)}%`}
                    </span>
                    <GlossaryTip term="capRate">
                      <span>weighted cap rate</span>
                    </GlossaryTip>
                    {!portfolioCapCoverageComplete ? (
                      <span>
                        · {portfolio.capRateSampleCount} of{" "}
                        {portfolio.totalCount} with data
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="hidden text-muted-foreground/40 sm:inline"
                  >
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="font-semibold text-foreground">
                      {portfolio.totalCount}
                    </span>
                    <span>active</span>
                  </span>
                  {hasArchivedOrCompleted ? (
                    <>
                      <span
                        aria-hidden
                        className="hidden text-muted-foreground/40 sm:inline"
                      >
                        ·
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">
                          {savedTotalCount}
                        </span>{" "}
                        saved total
                      </span>
                    </>
                  ) : null}
                  <span
                    aria-hidden
                    className="hidden text-muted-foreground/40 sm:inline"
                  >
                    ·
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {portfolio.activeCount}
                    </span>{" "}
                    with price data
                  </span>
                </div>
                {/* ── Portfolio KPIs — book quality (avg score), leverage safety
                (weighted DSCR), capital at work (cash to close), and how many
                deals need attention. Complements the value/cash-flow headlines
                above without adding new inputs. */}
                {kpis ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Award className="h-3.5 w-3.5" /> Avg Screening Index ·
                        secondary
                      </div>
                      <div className="mt-1 text-lg font-bold text-foreground">
                        {kpis.avgScore == null
                          ? "—"
                          : Math.round(kpis.avgScore)}
                        {kpis.avgScore != null ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            {" "}
                            / 100
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />{" "}
                        <GlossaryTip term="dscr">Weighted DSCR</GlossaryTip>
                      </div>
                      <div className="mt-1 text-lg font-bold text-foreground">
                        {kpis.weightedDscr == null
                          ? kpis.allCashOnly
                            ? NO_DEBT_SERVICE_DSCR_LABEL
                            : "—"
                          : `${kpis.weightedDscr.toFixed(2)}×`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {kpis.weightedDscr == null
                          ? kpis.allCashOnly
                            ? "all active deals are cash purchases"
                            : "no financed DSCR data"
                          : kpis.weightedDscr >= 1.25
                            ? "above 1.25 lender bar"
                            : "below 1.25 lender bar"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" /> Cash to Close
                      </div>
                      <div className="mt-1 text-lg font-bold text-foreground">
                        {kpis.cashToClose == null
                          ? "—"
                          : formatCurrency(kpis.cashToClose, true)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        down + closing, active deals
                      </div>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border p-3",
                        kpis.needsReviewCount > 0
                          ? "border-destructive/30 bg-destructive/5"
                          : kpis.cashFlowCoverageComplete
                            ? "border-border bg-card"
                            : "border-warning/35 bg-warning/10",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                          kpis.needsReviewCount > 0
                            ? "text-destructive"
                            : kpis.cashFlowCoverageComplete
                              ? "text-muted-foreground"
                              : "text-warning-foreground",
                        )}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Needs Review
                      </div>
                      <div className="mt-1 text-lg font-bold text-foreground">
                        {!kpis.cashFlowCoverageComplete &&
                        kpis.needsReviewCount === 0
                          ? "—"
                          : kpis.needsReviewCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {!kpis.cashFlowCoverageComplete
                          ? `${kpis.cashFlowKnownCount} of ${kpis.cashFlowTotalCount} with cash-flow data`
                          : kpis.needsReviewCount === 0
                          ? "all cash-flow positive"
                          : kpis.needsReviewCount === 1
                            ? "deal cash-flow negative"
                            : "deals cash-flow negative"}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* ── Pipeline summary — count + value per acquisition stage.
            Self-hides unless deals span ≥2 stages (Pro feature; invisible
            until the user actually moves deals through the funnel). */}
            {pipeline ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Pipeline
                  </h2>
                  <Link
                    href="/dashboard/saved-analyses"
                    prefetch={false}
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {pipeline.segments.map((seg) => (
                    <div
                      key={seg.id}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {seg.label}
                      </div>
                      <div className="mt-1 text-lg font-bold text-foreground">
                        {seg.count}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {formatCurrency(seg.value, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── Spotlight rail — best of the book by 3 lenses ──────────
            Converted from 3 full-width StatCards (which visually
            duplicated the portfolio row above) to a distinct compact
            list style. Each row: icon + metric label + headline value
            + winning deal address — single line on desktop, two on
            mobile. Visually distinct from the StatCards above so the
            eye doesn't read "7 of the same thing." Clickable: hover +
            chevron affordance signals the deep-link interaction. */}
            {hasAnyDeals &&
            data.allDeals.length >= 2 &&
            data.topDeals.length > 0 ? (
              // hidden below sm: these 3 rows are a subset of what Decision
              // Center + Portfolio Signals already show — on a phone this was
              // the 4th re-summarization of the same deals before any deal
              // list (mobile density audit DH-1). Desktop unchanged.
              // ≥2 gate (FFM-2, mirrors getPipelineSummary's ≥2 pattern): with
              // one saved deal all three "best of" rows crown the same address
              // — fake-analytics padding on a truth-layer product. The 1-deal
              // slot renders the honest nudge card below instead.
              <section className="hidden sm:block">
                <div className="mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Top performers
                  </h2>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                  {(
                    [
                      {
                        icon: Award,
                        label: "Highest Screening Index",
                        value:
                          highlights.byScore?.score == null
                            ? "—"
                            : `${Math.round(highlights.byScore.score)} / 100`,
                        valueTitle: undefined,
                        address: highlights.byScore?.address ?? "—",
                        deal: highlights.byScore,
                      },
                      {
                        icon: DollarSign,
                        label: "Highest Cash Flow",
                        value: formatSignedCurrency(
                          highlights.byCashFlow?.cashFlowMonthly,
                        ),
                        valueTitle: undefined,
                        address: highlights.byCashFlow?.address ?? "—",
                        deal: highlights.byCashFlow,
                      },
                      {
                        icon: TrendingUp,
                        // 10-yr ROI is cumulative (exitScenarios.summary.totalROI)
                        // — label carries the time-frame so 900%+ values don't
                        // read as nonsense beside annual cap rates. Extreme
                        // values (finding 5) render the framed band; the raw
                        // figure stays reachable via valueTitle (title attr).
                        label: "Highest 10-Yr ROI (cumulative)",
                        value: formatRoiHeadline(highlights.byRoi?.roiPct, {
                          decimals: 1,
                          compact: true,
                        }).text,
                        valueTitle: formatRoiHeadline(
                          highlights.byRoi?.roiPct,
                          { decimals: 1, compact: true },
                        ).title,
                        address: highlights.byRoi?.address ?? "—",
                        deal: highlights.byRoi,
                      },
                    ] as const
                  ).map((row) => {
                    const Icon = row.icon;
                    return (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() => scrollToDeal(row.deal)}
                        aria-label={`${row.label}: ${row.address} — jump to it in the deal list`}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40 sm:gap-4 sm:px-5 sm:py-3.5"
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {row.label}
                          </span>
                          <span className="block truncate text-sm font-semibold text-foreground sm:text-[15px]">
                            {row.address}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className="block text-sm font-extrabold tabular-nums text-foreground sm:text-lg"
                            title={row.valueTitle}
                          >
                            {row.value}
                          </span>
                        </span>
                        <ArrowUpDown
                          aria-hidden
                          className="hidden size-3.5 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary sm:block sm:size-4"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {/* ── One-deal honest replacement (FFM-2) ─────────────────────
            Takes the Top-performers slot when exactly 1 deal is saved:
            one card that says what a second deal unlocks instead of
            eight rankings crowning the same house. hidden below sm to
            compose with the mobile density pass — the ranked blocks it
            replaces are desktop-only too, so phones see no change. */}
        {hasAnyDeals && data.allDeals.length === 1 ? (
          <section className="hidden sm:block" aria-label="Save a second deal">
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {/* "active" — the sidebar's My Deals badge counts archived/
                    completed too, so a bare "1 saved deal" could contradict it. */}
                <h2 className="text-sm font-semibold text-foreground">
                  You have 1 active deal
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save a second deal to unlock rankings, risk/return, and
                  side-by-side compare.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="min-h-11 shrink-0 rounded-xl px-4 text-sm"
              >
                <Link href="/dashboard/new?fresh=1" prefetch={false}>
                  <Plus className="h-4 w-4" />
                  Analyze another property
                </Link>
              </Button>
            </div>
          </section>
        ) : null}

        {/* ── Buy-box discovery (FFM-3) — slim, dismissible, 1-3-deal
            dashboards only, and only for users who CAN use buy boxes but have
            zero (BuyBoxNudge checks that itself and renders nothing
            otherwise). Deliberate flagged exception to invisible-until-useful
            (principle 5): one sentence + link, one self-contained component,
            shared dismissal key with the My Deals nudge — never double-nag. */}
        {hasAnyDeals && data.allDeals.length <= 3 ? (
          <BuyBoxNudge variant="dashboard" />
        ) : null}

        {/* ── Empty-state hero — when 0 active deals AND nothing owned.
            An owner with 0 active deals gets the Owned portfolio section
            above INSTEAD of a first-run hero telling the customer who
            succeeded to "analyze your first property" (M3-1 / WOW-2). For
            archived-only users the copy drops the "first" framing. */}
        {!hasAnyDeals && ownedCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Your dashboard is ready
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Run {savedTotalCount > 0 ? "a" : "your first"} rental property
              through the analyzer and save it. You&apos;ll see portfolio
              totals, top performers, and risk/return analysis here.
              {/* FFM-3: the one personalization feature worth naming up front —
                  a buy box makes every future deal get a personal pass/fail. */}{" "}
              Set{" "}
              <Link
                href="/settings#buy-boxes-heading"
                prefetch={false}
                className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline"
              >
                your buy box
              </Link>{" "}
              and every deal shows which selected rules it meets or misses.
            </p>
            <Button
              asChild
              className="mt-5 min-h-11 rounded-xl px-5"
              style={{
                background: "var(--gradient-premium)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <Link href="/dashboard/new?fresh=1">
                <Plus className="h-4 w-4" />
                {savedTotalCount > 0
                  ? "Analyze a property"
                  : "Analyze your first property"}
              </Link>
            </Button>
          </div>
        ) : null}

        {/* ── DELETED by the focused dashboard ──────────────────────
            PortfolioChart (Deal Comparison bar chart) and AIInsights
            (Portfolio Signals) are superseded by "Your deals": the same
            saved deals, with the Offer Ceiling and gap those two never showed.
            RiskReturn moves to Compare Deals, where comparison is the job.
            Kept behind the kill switch only. */}
        {!focusedDashboard && hasAnyDeals && data.topDeals.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <PortfolioChart data={dealComparison} />
              </div>
              <div className="space-y-6 xl:row-span-2">
                {/* Risk-vs-Return block gated on ≥2 deals (FFM-2): over a set
                    of one it names the same address as "best risk-adjusted",
                    "highest return" AND "safest" — the 1-deal nudge card
                    above already owns that slot's message. The insight cards
                    themselves stay (they're deal-count-aware via FFM-4). */}
                <AIInsights
                  data={insights}
                  riskReturnInsights={
                    data.allDeals.length >= 2 ? riskReturn.insights : undefined
                  }
                />
              </div>
              <div className="xl:col-span-2">
                <RiskReturn deals={riskReturn.chartDeals} />
              </div>
            </div>
            {/* NT-4: honest sample label — only renders when deals were
                actually left out of the charts above. */}
            {sampledNote ? (
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                {sampledNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* TopDeals is the old "Deal Decision List" — a second table of the
            same saved deals. Its columns (Score, 10-Yr ROI, Cap Rate, Cash
            Flow, Risk, Recommendation) are all reachable: Score, Verdict and
            the cash-flow-derived gap live in "Your deals"; the full metric
            set lives on each deal's workspace and in Compare Deals. Its
            sort-by-metric control is ported as the sortable headers on
            "Your deals". Kept behind the kill switch only. */}
        {!focusedDashboard && hasAnyDeals && data.topDeals.length > 0 ? (
          <div>
            <TopDeals data={topDeals} />
            {sampledNote ? (
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                {sampledNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Leads from co-branded shared deals — lives INSIDE the scrolling
            main so it isn't clipped by the fixed-viewport shell on desktop.
            Self-gates (renders null when there are no leads). */}
        {leadsSlot}
      </main>
    </div>
  );
}
