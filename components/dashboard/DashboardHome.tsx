"use client";

import { useMemo, type ReactNode } from "react";
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
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TopDeals, type DashboardTopDeal } from "@/components/dashboard/TopDeals";
import { AIInsights } from "@/components/dashboard/AIInsights";

// The two recharts-heavy panels load as their own chunks so the
// dashboard's initial JS ships without the ~100KB charting library —
// empty-portfolio users never download it at all, and everyone else
// gets the headline numbers painted before the charts hydrate.
const ChartSkeleton = ({ heightClass }: { heightClass: string }) => (
  <div className={`${heightClass} animate-pulse rounded-2xl border border-border bg-card`} />
);
const PortfolioChart = dynamic(
  () => import("@/components/dashboard/PortfolioChart").then((m) => m.PortfolioChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[320px]" /> }
);
const RiskReturn = dynamic(
  () => import("@/components/dashboard/RiskReturn").then((m) => m.RiskReturn),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[320px]" /> }
);
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { mapRiskLevelToRisk, resolveReturnMetric, resolveRiskMetric } from "@/lib/dashboard-risk-return";
import { recommendationLabel } from "@/lib/deal-score";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline";

export type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { RateWatchStrip } from "@/components/dashboard/RateWatchStrip";
import type { RateWatchSummary } from "@/lib/rate-watch";

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
  } | null;
  /**
   * Saved deals whose signal changed at today's 30-yr rate (see
   * lib/rate-watch). Null when the rate is unavailable or nothing changed —
   * the RateWatchStrip then renders nothing.
   */
  rateWatch?: RateWatchSummary | null;
};

function formatCurrency(value: number | null | undefined, compact = false): string {
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

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

function getTopDeals(data: DashboardHomeData): DashboardTopDeal[] {
  return data.topDeals.map((deal) => ({
      id: deal.id,
      name: deal.address,
      address: deal.propertyTypeLabel,
      type: deal.propertyTypeLabel,
      capRate: deal.capRatePct == null ? null : Number(deal.capRatePct.toFixed(1)),
      coc: deal.cocReturnPct == null ? null : Number(deal.cocReturnPct.toFixed(1)),
      cashFlow: deal.cashFlowMonthly == null ? null : Math.round(deal.cashFlowMonthly),
      price: deal.purchasePrice == null ? null : Math.round(deal.purchasePrice),
      score: deal.score == null ? null : Math.round(deal.score),
      signal: deal.recommendation,
      roi: deal.roiPct == null ? null : Number(deal.roiPct.toFixed(1)),
      riskLevel: deal.riskLevel,
      breakdown: deal.breakdown,
      tags: deal.tags,
    }));
}

function getRiskReturn(data: DashboardHomeData) {
  // Each deal carries BOTH return metrics (CoC + 10-yr ROI) and its DSCR so
  // the chart can toggle the X axis client-side. Cash purchases have no DSCR
  // (N/A, not 0) — null keeps them off the DSCR axis; the chart notes them.
  const chartDeals = data.topDeals.map((deal) => {
    const isCashPurchase = deal.monthlyPayment != null && deal.monthlyPayment <= 0;
    return {
      dealId: deal.id,
      name: deal.address,
      type: deal.propertyTypeLabel,
      coc: deal.cocReturnPct,
      roi: deal.roiPct,
      dscr: isCashPurchase ? null : deal.dscr,
      isCashPurchase,
      // Dot size encodes cash to close (capital required) — the spec's
      // "dot size = cash needed". Falls back to ~25% of price when the
      // cash figure is unknown so the point still renders sensibly.
      size: Math.max(80, Math.round((deal.cashToClose ?? (deal.purchasePrice ?? 0) * 0.25) / 500)),
      cashNeeded: deal.cashToClose ?? undefined,
      score: deal.score ?? undefined,
      cashFlow: deal.cashFlowMonthly == null ? undefined : Math.round(deal.cashFlowMonthly),
    };
  });

  const riskAdjusted = data.topDeals
    .map((deal) => {
      const returnValue = resolveReturnMetric(deal).value;
      const riskValue = resolveRiskMetric(deal).value;
      if (returnValue == null || riskValue == null || riskValue === 0) return null;
      return { deal, value: returnValue / riskValue };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.value - a.value)[0]?.deal;

  const highestReturn = [...data.topDeals]
    .map((deal) => ({ deal, value: resolveReturnMetric(deal).value }))
    .filter((item): item is { deal: DashboardDeal; value: number } => item.value != null)
    .sort((a, b) => b.value - a.value)[0]?.deal;

  // For "Safest deal" ranking, treat cash purchases (monthlyPayment <= 0)
  // as effectively the safest possible debt structure — they have no debt
  // service to cover. Their stored dscr=0 is N/A, not "underwater". We map
  // them to Infinity in the comparator so they win over any financed deal.
  const safest = [...data.topDeals]
    .map((deal) => {
      const isCashPurchase = deal.monthlyPayment != null && deal.monthlyPayment <= 0;
      return {
        deal,
        dscr: isCashPurchase ? Infinity : deal.dscr,
        mappedRisk: mapRiskLevelToRisk(deal.riskLevel),
      };
    })
    .filter((item) => item.dscr != null || item.mappedRisk != null)
    .sort((a, b) => {
      if (a.dscr != null || b.dscr != null) return (b.dscr ?? -Infinity) - (a.dscr ?? -Infinity);
      return (a.mappedRisk ?? Infinity) - (b.mappedRisk ?? Infinity);
    })[0]?.deal;

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
  return data.topDeals.map((deal) => ({
    name: deal.address.length > 18 ? `${deal.address.slice(0, 18)}...` : deal.address,
    score: deal.score == null ? null : Math.round(deal.score),
    cashFlow: deal.cashFlowMonthly == null ? null : Math.round(deal.cashFlowMonthly),
    roi: deal.roiPct == null ? null : Number(deal.roiPct.toFixed(1)),
  }));
}

function getDealAnchorId(deal: DashboardDeal | undefined, index = 0) {
  if (!deal) return "";
  return (deal.id ?? `${deal.address}-${index}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function scrollToDeal(deal: DashboardDeal | undefined, index = 0) {
  const id = getDealAnchorId(deal, index);
  if (!id) return;
  document.getElementById(`deal-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getDecisionHighlights(data: DashboardHomeData) {
  const deals = data.topDeals;
  const byScore = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const byCashFlow = [...deals].sort((a, b) => (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity))[0];
  const byRoi = [...deals].filter((deal) => deal.roiPct != null).sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0];
  return { byScore, byCashFlow, byRoi };
}

/**
 * Decision Center — the "what do I do next" band. Pure-derived from active
 * deals (no new data): the best-scoring deal, the worst cash-flow-negative
 * deal to review, the best 10-yr upside, a count of negatives, and a
 * context-aware next action.
 */
function getDecisionCenter(data: DashboardHomeData) {
  const deals = data.allDeals;
  if (deals.length === 0) return null;
  const best = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0] ?? null;
  const negatives = deals.filter((d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0);
  const needsReview =
    [...negatives].sort((a, b) => (a.cashFlowMonthly ?? 0) - (b.cashFlowMonthly ?? 0))[0] ?? null;
  const bestUpside =
    [...deals].filter((d) => d.roiPct != null).sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0] ??
    null;
  const nextAction =
    deals.length >= 2
      ? { label: "Compare your top deals", href: "/dashboard/compare" }
      : { label: "Analyze another property", href: "/" };
  return { best, needsReview, bestUpside, negativeCount: negatives.length, nextAction };
}

/**
 * Portfolio KPIs — the four numbers an investor underwrites a *book* on,
 * complementing the Pipeline Value / Monthly Cash Flow headline cards:
 *  - Average Deal Score (book quality)
 *  - Weighted DSCR (leverage safety; purchase-price-weighted, financed
 *    deals only — cash purchases have no debt service)
 *  - Cash to Close (capital at work = down payment + closing across deals)
 *  - Needs Review (count of cash-flow-negative deals)
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
    if (!isCashPurchase && d.dscr != null && d.purchasePrice != null && d.purchasePrice > 0) {
      dscrNumerator += d.dscr * d.purchasePrice;
      dscrDenominator += d.purchasePrice;
    }
  }
  const weightedDscr = dscrDenominator > 0 ? dscrNumerator / dscrDenominator : null;

  const withCash = deals.filter((d) => d.cashToClose != null);
  const cashToClose = withCash.length
    ? withCash.reduce((sum, d) => sum + (d.cashToClose ?? 0), 0)
    : null;

  const needsReviewCount = deals.filter((d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0).length;

  return { avgScore, weightedDscr, cashToClose, needsReviewCount };
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
  const valid = data.allDeals.filter((d) => d.purchasePrice != null);
  const totalValue = valid.reduce((s, d) => s + (d.purchasePrice ?? 0), 0);
  const totalCashFlow = data.allDeals.reduce(
    (s, d) => s + (d.cashFlowMonthly ?? 0),
    0
  );
  const capWeighted = valid.reduce(
    (acc, d) => {
      const price = d.purchasePrice ?? 0;
      const cap = d.capRatePct;
      if (cap == null || price <= 0) return acc;
      return { num: acc.num + cap * price, den: acc.den + price };
    },
    { num: 0, den: 0 }
  );
  const weightedCap = capWeighted.den > 0 ? capWeighted.num / capWeighted.den : null;
  return {
    totalValue,
    totalCashFlow,
    weightedCap,
    activeCount: valid.length,
    totalCount: data.allDeals.length,
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

  const best = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const needsReview = [...deals]
    .filter((d) => d.cashFlowMonthly != null && d.cashFlowMonthly < 0)
    .sort((a, b) => (a.cashFlowMonthly ?? 0) - (b.cashFlowMonthly ?? 0))[0];
  const cash = [...deals].sort((a, b) => (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity))[0];
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

  const evidence = (d: DashboardDeal): string =>
    [
      d.score != null ? `Deal Score ${Math.round(d.score)}` : null,
      d.recommendation ? recommendationLabel(d.recommendation) : null,
      d.cashFlowMonthly != null ? `${formatSignedCurrency(d.cashFlowMonthly)}/mo` : null,
      d.capRatePct != null ? `${d.capRatePct.toFixed(1)}% cap` : null,
      d.cocReturnPct != null ? `${d.cocReturnPct.toFixed(1)}% CoC` : null,
      d.dscr != null ? `DSCR ${d.dscr.toFixed(2)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return [
    bestPick
      ? {
          title: `Top opportunity: ${bestPick.address}`,
          body: `${evidence(bestPick)}. Next: line it up against your other top deals before you offer.`,
          tone: "opportunity" as const,
          action: { label: "Compare deals", href: "/dashboard/compare" },
        }
      : null,
    reviewPick
      ? {
          title: `Review: ${reviewPick.address} is cash-flow negative`,
          body: `${formatSignedCurrency(reviewPick.cashFlowMonthly)}/mo at current assumptions${reviewPick.dscr != null ? ` · DSCR ${reviewPick.dscr.toFixed(2)}` : ""}. Next: lower your offer or raise rent and rerun — or pass.`,
          tone: "risk" as const,
          action: { label: "Open My Deals", href: "/dashboard/saved-analyses" },
        }
      : null,
    cashPick
      ? {
          title: `Strongest cash flow: ${cashPick.address}`,
          body: `${formatSignedCurrency(cashPick.cashFlowMonthly)}/mo today${cashPick.cocReturnPct != null ? ` · ${cashPick.cocReturnPct.toFixed(1)}% cash-on-cash` : ""}. Next: stress-test vacancy and repairs before you commit.`,
          tone: "tip" as const,
        }
      : null,
    roiPick
      ? {
          title: `Best long-term upside: ${roiPick.address}`,
          body: `${formatPercent(roiPick.roiPct)} projected 10-yr ROI at ${roiPick.riskLevel ?? "unrated"} risk. Note: that's cumulative — check the deal's exit scenarios for IRR and equity multiple before trusting it.`,
          tone: "opportunity" as const,
          action: { label: "Open My Deals", href: "/dashboard/saved-analyses" },
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
  const { topDeals, riskReturn, dealComparison, highlights, insights, portfolio, decisionCenter, kpis, pipeline } = useMemo(
    () => ({
      topDeals: getTopDeals(data),
      riskReturn: getRiskReturn(data),
      dealComparison: getDealComparison(data),
      highlights: getDecisionHighlights(data),
      insights: buildDecisionInsights(data.topDeals),
      portfolio: getPortfolioTotals(data),
      decisionCenter: getDecisionCenter(data),
      kpis: getPortfolioKpis(data),
      pipeline: getPipelineSummary(data),
    }),
    [data]
  );

  const hasAnyDeals = data.allDeals.length > 0;
  // Active deals (portfolio.totalCount) vs the full saved set
  // (savedTotalCount = the sidebar "My Deals" badge count). When the user
  // has archived/completed deals the two differ, so we surface both and
  // never show a dashboard number that contradicts the sidebar badge.
  const savedTotalCount = data.savedTotalCount ?? portfolio.totalCount;
  const hasArchivedOrCompleted = savedTotalCount > portfolio.totalCount;
  const headerSubtitle = !hasAnyDeals
    ? "No saved deals yet. Run your first analysis to see it appear here."
    : hasArchivedOrCompleted
      ? `Active pipeline: ${portfolio.totalCount} of ${savedTotalCount} saved ${savedTotalCount === 1 ? "deal" : "deals"}.`
      : `Your book at a glance — ${portfolio.totalCount} active ${portfolio.totalCount === 1 ? "deal" : "deals"}.`;

  // SCROLL CONTRACT (fixed Jun 2026): DashboardShell holds a desktop
  // viewport lock (`lg:h-screen lg:overflow-hidden`), so every page
  // inside it MUST own its scrolling via `flex-1 min-h-0
  // lg:overflow-y-auto` — exactly what saved-analyses, compare, and
  // templates do. A previous edit removed main's overflow here aiming
  // for "natural page scroll" but left the shell lock in place, which
  // made the dashboard home UNSCROLLABLE on desktop (content below the
  // first viewport unreachable). If natural page scroll is ever wanted,
  // the shell lock and ALL four pages' inner scrolls must change
  // together — never one side alone.
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
      <main id="main" className="flex-1 min-h-0 lg:overflow-y-auto px-4 py-4 space-y-6 sm:px-6 sm:py-6 sm:space-y-8 lg:px-8">
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
              {/* Fallback to email local-part if displayName empty so
                  we never render "Welcome back, " with a trailing comma. */}
              Welcome back, {(data.user.displayName.split(" ")[0] || data.user.email.split("@")[0]) ?? "investor"}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
              {headerSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <Button
              asChild
              className="h-10 rounded-xl px-4 text-sm font-semibold"
              style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
            >
              <Link href="/" prefetch={false}>
                <Plus className="h-4 w-4" />
                Analyze Property
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl px-4 text-sm">
              <Link href="/dashboard/saved-analyses" prefetch={false}>
                <Briefcase className="h-4 w-4" />
                My Deals
              </Link>
            </Button>
            {canCompareDeals ? (
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl px-4 text-sm"
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
                className="h-10 rounded-xl px-4 text-sm"
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

        {/* ── Decision Center — the "what to do next" band, derived from your
            active deals: best score, first cash-flow-negative deal to review,
            best 10-yr upside, and a context-aware next action. */}
        {decisionCenter ? (
          <section aria-label="Decision center" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Decision center</h2>
              <Link
                href={decisionCenter.nextAction.href}
                prefetch={false}
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Next: {decisionCenter.nextAction.label} →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-success">
                  <Award className="h-3.5 w-3.5" /> Best deal
                </div>
                <div className="mt-1 truncate text-sm font-bold text-foreground">{decisionCenter.best?.address ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {decisionCenter.best?.score != null ? `Score ${Math.round(decisionCenter.best.score)}` : "—"}
                  {decisionCenter.best?.recommendation ? ` · ${recommendationLabel(decisionCenter.best.recommendation)}` : ""}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-3",
                  decisionCenter.needsReview ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                    decisionCenter.needsReview ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {decisionCenter.needsReview ? <AlertTriangle className="h-3.5 w-3.5" /> : null} Needs review
                </div>
                {decisionCenter.needsReview ? (
                  <>
                    <div className="mt-1 truncate text-sm font-bold text-foreground">{decisionCenter.needsReview.address}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatSignedCurrency(decisionCenter.needsReview.cashFlowMonthly)}/mo · {decisionCenter.negativeCount} cash-flow negative
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm font-semibold text-foreground">All active deals cash-flow positive ✓</div>
                )}
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <TrendingUp className="h-3.5 w-3.5" /> Best upside
                </div>
                <div className="mt-1 truncate text-sm font-bold text-foreground">{decisionCenter.bestUpside?.address ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {decisionCenter.bestUpside?.roiPct != null
                    ? `${formatPercent(decisionCenter.bestUpside.roiPct)} 10-yr ROI · verify assumptions`
                    : "Run a 10-yr projection"}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Rate watch — re-underwrites saved deals at today's 30-yr rate and
            surfaces the ones whose signal changed since they were saved (the
            retention hook; same pure logic as the weekly rate-alert email).
            Renders nothing when nothing changed — invisible until useful. */}
        <RateWatchStrip rateWatch={data.rateWatch ?? null} />

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
        {hasAnyDeals ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Portfolio overview
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Pipeline Value"
                value={formatCurrency(portfolio.totalValue, true)}
                change={null}
                changeLabel={`across ${portfolio.activeCount} ${portfolio.activeCount === 1 ? "deal" : "deals"}`}
                icon={Briefcase}
                spark={[]}
                tone="primary"
                changeSuffix=""
              />
              <StatCard
                label="Monthly Cash Flow"
                value={formatSignedCurrency(portfolio.totalCashFlow)}
                change={null}
                changeLabel={`~${formatCurrency(portfolio.totalCashFlow * 12)} annualized`}
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
                  {portfolio.weightedCap == null ? "-" : `${portfolio.weightedCap.toFixed(2)}%`}
                </span>
                <span>weighted cap rate</span>
              </span>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-semibold text-foreground">{portfolio.totalCount}</span>
                <span>active</span>
              </span>
              {hasArchivedOrCompleted ? (
                <>
                  <span aria-hidden className="text-muted-foreground/40">·</span>
                  <span>
                    <span className="font-semibold text-foreground">{savedTotalCount}</span>{" "}
                    saved total
                  </span>
                </>
              ) : null}
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span>
                <span className="font-semibold text-foreground">{portfolio.activeCount}</span>{" "}
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
                    <Award className="h-3.5 w-3.5" /> Avg Deal Score
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {kpis.avgScore == null ? "—" : Math.round(kpis.avgScore)}
                    {kpis.avgScore != null ? <span className="text-xs font-medium text-muted-foreground"> / 100</span> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> Weighted DSCR
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {kpis.weightedDscr == null ? "—" : `${kpis.weightedDscr.toFixed(2)}×`}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {kpis.weightedDscr == null
                      ? "cash purchases only"
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
                    {kpis.cashToClose == null ? "—" : formatCurrency(kpis.cashToClose, true)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">down + closing, active deals</div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    kpis.needsReviewCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
                      kpis.needsReviewCount > 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Needs Review
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">{kpis.needsReviewCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {kpis.needsReviewCount === 0
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pipeline</h2>
              <Link
                href="/dashboard/saved-analyses"
                prefetch={false}
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Manage →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {pipeline.segments.map((seg) => (
                <div key={seg.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {seg.label}
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">{seg.count}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{formatCurrency(seg.value, true)}</div>
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
        {hasAnyDeals && data.topDeals.length > 0 ? (
          <section>
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
                    label: "Best Score",
                    value:
                      highlights.byScore?.score == null
                        ? "—"
                        : `${Math.round(highlights.byScore.score)} / 100`,
                    address: highlights.byScore?.address ?? "—",
                    deal: highlights.byScore,
                  },
                  {
                    icon: DollarSign,
                    label: "Highest Cash Flow",
                    value: formatSignedCurrency(highlights.byCashFlow?.cashFlowMonthly),
                    address: highlights.byCashFlow?.address ?? "—",
                    deal: highlights.byCashFlow,
                  },
                  {
                    icon: TrendingUp,
                    // 10-yr ROI is cumulative (exitScenarios.summary.totalROI)
                    // — label carries the time-frame so 900%+ values don't
                    // read as nonsense beside annual cap rates.
                    label: "Highest 10-yr ROI",
                    value: formatPercent(highlights.byRoi?.roiPct),
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
                      <span className="block text-base font-extrabold tabular-nums text-foreground sm:text-lg">
                        {row.value}
                      </span>
                    </span>
                    <ArrowUpDown
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary sm:size-4"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ── Empty-state hero — when 0 saved deals ───────────────── */}
        {!hasAnyDeals ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Your dashboard is ready</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Run your first rental property through the analyzer and save it. You&apos;ll see portfolio totals, top performers, and risk/return analysis here.
            </p>
            <Button
              asChild
              className="mt-5 rounded-xl px-5"
              style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
            >
              <Link href="/">
                <Plus className="h-4 w-4" />
                Analyze your first property
              </Link>
            </Button>
          </div>
        ) : null}

        {/* ── Charts + insights — only if we have data to show ────── */}
        {hasAnyDeals && data.topDeals.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <PortfolioChart data={dealComparison} />
            </div>
            <div className="space-y-6 xl:row-span-2">
              <AIInsights data={insights} riskReturnInsights={riskReturn.insights} />
            </div>
            <div className="xl:col-span-2">
              <RiskReturn deals={riskReturn.chartDeals} />
            </div>
          </div>
        ) : null}

        {hasAnyDeals && data.topDeals.length > 0 ? (
          <TopDeals data={topDeals} />
        ) : null}

        {/* Leads from co-branded shared deals — lives INSIDE the scrolling
            main so it isn't clipped by the fixed-viewport shell on desktop.
            Self-gates (renders null when there are no leads). */}
        {leadsSlot}
      </main>
    </div>
  );
}
