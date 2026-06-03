"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  Award,
  Briefcase,
  DollarSign,
  Layers,
  ListTodo,
  Percent,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { RiskReturn } from "@/components/dashboard/RiskReturn";
import { TopDeals, type DashboardTopDeal } from "@/components/dashboard/TopDeals";
import { AIInsights } from "@/components/dashboard/AIInsights";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { getChartInclusionReason, mapRiskLevelToRisk, resolveReturnMetric, resolveRiskMetric } from "@/lib/dashboard-risk-return";

export type { DashboardDeal } from "@/lib/dashboard-deal-mapping";

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
  allDeals: DashboardDeal[];
  topDeals: DashboardDeal[];
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
      tags: deal.tags,
    }));
}

function getRiskReturn(data: DashboardHomeData) {
  const points = data.topDeals
    .map((deal) => {
      const chartStatus = getChartInclusionReason(deal);
      if (!chartStatus.include) {
        return null;
      }

      const x = chartStatus.returnMetric.value ?? 0;
      const y = chartStatus.riskMetric.value ?? 0;

      return {
        dealId: deal.id,
        name: deal.address,
        type: deal.propertyTypeLabel,
        risk: y,
        return: x,
        returnKind: chartStatus.returnMetric.kind,
        hasRiskMetric: chartStatus.riskMetric.value != null,
        hasReturnMetric: chartStatus.returnMetric.value != null,
        size: Math.max(80, Math.round((deal.purchasePrice ?? 0) / 1000)),
        score: deal.score ?? undefined,
        cashFlow: deal.cashFlowMonthly == null ? undefined : Math.round(deal.cashFlowMonthly),
        annualCashFlow: deal.annualCashFlow == null ? undefined : Math.round(deal.annualCashFlow),
        roi: deal.roiPct ?? undefined,
        dscr: deal.dscr ?? undefined,
      };
    })
    .filter((point): point is NonNullable<typeof point> => Boolean(point));

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
    points,
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

function buildDecisionInsights(deals: DashboardDeal[]) {
  if (deals.length === 0) return [];
  const best = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const cash = [...deals].sort((a, b) => (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity))[0];
  const roi = [...deals].filter((deal) => deal.roiPct != null).sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0];

  return [
    best
      ? {
          title: `${best.address} has the highest score`,
          body: `Score ${best.score == null ? "-" : Math.round(best.score)}. Backend recommendation: ${best.recommendation ?? "-"}.`,
          tone: "opportunity" as const,
        }
      : null,
    cash
      ? {
          title: `${cash.address} has the highest monthly cash flow`,
          body: `Monthly cash flow: ${formatSignedCurrency(cash.cashFlowMonthly)}.`,
          tone: "tip" as const,
        }
      : null,
    roi
      ? {
          title: `${roi.address} has the highest ROI`,
          body: `ROI: ${formatPercent(roi.roiPct)}. Risk level: ${roi.riskLevel ?? "-"}.`,
          tone: "opportunity" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function DashboardHome({
  data,
  canCompareDeals = false,
}: {
  data: DashboardHomeData;
  canCompareDeals?: boolean;
}) {
  const initials = getInitials(data.user.displayName, data.user.email);
  const topDeals = getTopDeals(data);
  const riskReturn = getRiskReturn(data);
  const dealComparison = getDealComparison(data);
  const highlights = getDecisionHighlights(data);
  const insights = buildDecisionInsights(data.topDeals);
  const portfolio = getPortfolioTotals(data);

  // Sparklines only render when 2+ real data points exist. No fake
  // fallbacks — a financial product should never show invented charts.
  const realScoreSpark = topDeals
    .map((d) => d.score)
    .filter((v): v is number => v != null)
    .map((v) => ({ v }));
  const realCashSpark = topDeals
    .map((d) => d.cashFlow)
    .filter((v): v is number => v != null)
    .map((v) => ({ v }));
  const realRoiSpark = topDeals
    .map((d) => d.roi)
    .filter((v): v is number => v != null)
    .map((v) => ({ v }));

  const hasAnyDeals = data.allDeals.length > 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden">
      <Topbar
        displayName={data.user.displayName}
        email={data.user.email}
        initials={initials}
        avatarSrc={data.user.avatarSrc}
        isPremium={data.user.isPremium}
        canAccessDashboard={data.user.canAccessDashboard}
      />
      <main id="main" className="flex-1 min-h-0 px-4 py-4 space-y-6 sm:px-6 sm:py-6 sm:space-y-8 lg:px-8 lg:overflow-y-auto">
        {/* ── Header + quick actions ──────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight">
              Welcome back, {data.user.displayName.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
              {hasAnyDeals
                ? `Your book at a glance — ${portfolio.totalCount} saved ${portfolio.totalCount === 1 ? "deal" : "deals"}.`
                : "No saved deals yet. Run your first analysis to see it appear here."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              // Free users see Compare as a Pro upsell — clickable,
              // links to /pricing, with a small lock+price hint so the
              // upgrade path is obvious (was silently disabled before).
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

        {/* ── Portfolio overview — answers "what's my book worth?" ── */}
        {hasAnyDeals ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Portfolio overview
              </h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Portfolio Overview row: no trend pills. The headline
                  number IS the answer ($573K of value, +$749/mo). Stuffing
                  deal count or annualized dollars into a green ↗ pill
                  reads as "+2% / +8988%" — a fake trend indicator over
                  a baseline we don't actually have. Subline carries the
                  context instead. */}
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
              <StatCard
                label="Weighted Cap Rate"
                value={portfolio.weightedCap == null ? "-" : `${portfolio.weightedCap.toFixed(2)}%`}
                change={null}
                changeLabel="weighted by purchase price"
                icon={Percent}
                spark={[]}
                tone="violet"
                changeSuffix=""
              />
              <StatCard
                label="Saved Deals"
                value={String(portfolio.totalCount)}
                change={null}
                changeLabel={`${portfolio.activeCount} with price data`}
                icon={Layers}
                spark={[]}
                tone="gold"
                changeSuffix=""
              />
            </div>
          </section>
        ) : null}

        {/* ── Spotlight cards — best of the book by 3 lenses ──────── */}
        {hasAnyDeals && data.topDeals.length > 0 ? (
          <section>
            <div className="mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Top performers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <StatCard
                label="Best Score"
                value={highlights.byScore?.address ?? "-"}
                change={highlights.byScore?.score == null ? null : Math.round(highlights.byScore.score)}
                changeLabel={`${formatSignedCurrency(highlights.byScore?.cashFlowMonthly)} CF · ${formatPercent(highlights.byScore?.roiPct)}`}
                icon={Award}
                spark={realScoreSpark}
                tone="primary"
                badge={highlights.byScore?.tags[0]}
                changeSuffix=""
                onClick={() => scrollToDeal(highlights.byScore)}
              />
              {/* Highest Cash Flow / Highest ROI: pill suppressed. The
                  headline number IS the metric being highlighted — the
                  deal's score in the pill was duplicated info from the
                  Best Score card and just added visual noise. Address in
                  the subline below already identifies which deal won. */}
              <StatCard
                label="Highest Cash Flow"
                value={formatSignedCurrency(highlights.byCashFlow?.cashFlowMonthly)}
                change={null}
                changeLabel={highlights.byCashFlow?.address ?? "-"}
                icon={DollarSign}
                spark={realCashSpark}
                tone="success"
                badge={highlights.byCashFlow?.tags[0]}
                changeSuffix=""
                onClick={() => scrollToDeal(highlights.byCashFlow)}
              />
              {/* Relabeled from "Highest ROI" → "Highest 10-yr ROI"
                  because the value comes from
                  exitScenarios.summary.totalROI — cumulative return at
                  exit (cash flow + appreciation + equity build over the
                  hold period). Without the time-frame in the label, a
                  number like 992.6% reads as nonsense next to the 8.78%
                  annual cap rate on the row above. */}
              <StatCard
                label="Highest 10-yr ROI"
                value={formatPercent(highlights.byRoi?.roiPct)}
                change={null}
                changeLabel={`${highlights.byRoi?.address ?? "-"} (at exit)`}
                icon={TrendingUp}
                spark={realRoiSpark}
                tone="violet"
                badge={highlights.byRoi?.tags[0]}
                changeSuffix=""
                onClick={() => scrollToDeal(highlights.byRoi)}
              />
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
              <RiskReturn data={riskReturn.points} />
            </div>
          </div>
        ) : null}

        {hasAnyDeals && data.topDeals.length > 0 ? (
          <TopDeals data={topDeals} />
        ) : null}
      </main>
    </div>
  );
}
