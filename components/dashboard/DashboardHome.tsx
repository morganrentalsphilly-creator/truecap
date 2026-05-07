"use client";

import Link from "next/link";
import { Award, DollarSign, ListTodo, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { RiskReturn } from "@/components/dashboard/RiskReturn";
import { TopDeals, type DashboardTopDeal } from "@/components/dashboard/TopDeals";
import { AIInsights } from "@/components/dashboard/AIInsights";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { getChartInclusionReason, getTaggedDealRiskLabel, mapRiskLevelToRisk, resolveReturnMetric, resolveRiskMetric } from "@/lib/dashboard-risk-return";

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

const sparks = {
  up: [{ v: 4 }, { v: 6 }, { v: 5 }, { v: 8 }, { v: 7 }, { v: 11 }, { v: 14 }],
  flat: [{ v: 7 }, { v: 8 }, { v: 7 }, { v: 9 }, { v: 8 }, { v: 9 }, { v: 10 }],
  cash: [{ v: 12 }, { v: 14 }, { v: 13 }, { v: 16 }, { v: 18 }, { v: 20 }, { v: 22 }],
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

function getSparkFromValues(values: Array<number | null | undefined>, fallback: { v: number }[]): { v: number }[] {
  const normalized = values.filter((value) => Number.isFinite(value));
  if (normalized.length < 2 || normalized.every((value) => value === 0)) return fallback;
  return normalized.map((value) => ({ v: value as number }));
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

  const safest = [...data.topDeals]
    .map((deal) => ({
      deal,
      dscr: deal.dscr,
      mappedRisk: mapRiskLevelToRisk(deal.riskLevel),
    }))
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
  const taggedSource = data.allDeals;
  const byScore = [...deals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const byCashFlow = [...deals].sort((a, b) => (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity))[0];
  const byRoi = [...deals].filter((deal) => deal.roiPct != null).sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity))[0];
  // Backend does not always persist explicit tags; prefer risk signals from backend scoring fields.
  const tagged = taggedSource.find(
    (deal) => deal.riskLevel != null || deal.riskScore != null || deal.dscr != null || deal.tags.length > 0
  );
  const taggedWithRisk = taggedSource.find(
    (deal) =>
      (deal.riskLevel != null || deal.riskScore != null || deal.dscr != null || deal.tags.length > 0) &&
      resolveRiskMetric(deal).value != null
  );
  const taggedForCard = taggedWithRisk ?? tagged;

  const taggedChartStatus = taggedForCard ? getChartInclusionReason(taggedForCard) : null;
  return { byScore, byCashFlow, byRoi, tagged: taggedForCard, taggedChartStatus };
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
  const scoreSpark = getSparkFromValues(topDeals.map((deal) => deal.score), sparks.up);
  const cashSpark = getSparkFromValues(topDeals.map((deal) => deal.cashFlow), sparks.cash);
  const roiSpark = getSparkFromValues(topDeals.map((deal) => deal.roi), sparks.flat);
  const capSpark = getSparkFromValues(topDeals.map((deal) => deal.capRate), sparks.flat);

  const taggedRiskLabel = getTaggedDealRiskLabel(highlights.tagged);
  const taggedChartHint = highlights.taggedChartStatus && !highlights.taggedChartStatus.include
    ? "Tagged by backend, but missing both risk and return metrics for chart placement."
    : null;

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
      <main className="flex-1 min-h-0 px-4 py-4 space-y-5 sm:px-6 sm:py-6 sm:space-y-6 lg:px-8 lg:overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight">
              Welcome back, {data.user.displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare saved deals by score, cash flow, ROI, and risk before you commit.
            </p>
          </div>
          <Button
            asChild={canCompareDeals}
            disabled={!canCompareDeals}
            className="inline-flex w-full items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white sm:w-auto"
            style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
          >
            {canCompareDeals ? (
              <Link href="/dashboard/compare" prefetch={false}>
                <ListTodo className="h-4 w-4" />
                Compare Deals
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Compare Deals
              </span>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Best Deal"
            value={highlights.byScore?.address ?? "-"}
            change={highlights.byScore?.score == null ? null : Math.round(highlights.byScore.score)}
            changeLabel={`${formatSignedCurrency(highlights.byScore?.cashFlowMonthly)} CF · ${formatPercent(highlights.byScore?.roiPct)}`}
            icon={Award}
            spark={scoreSpark}
            tone="primary"
            badge={highlights.byScore?.tags[0]}
            changeSuffix=""
            onClick={() => scrollToDeal(highlights.byScore)}
          />
          <StatCard
            label="Highest Cash Flow"
            value={formatSignedCurrency(highlights.byCashFlow?.cashFlowMonthly)}
            change={highlights.byCashFlow?.score == null ? null : Math.round(highlights.byCashFlow.score)}
            changeLabel={highlights.byCashFlow?.address ?? "-"}
            icon={DollarSign}
            spark={cashSpark}
            tone="success"
            badge={highlights.byCashFlow?.tags[0]}
            changeSuffix=""
            onClick={() => scrollToDeal(highlights.byCashFlow)}
          />
          <StatCard
            label="Highest ROI"
            value={formatPercent(highlights.byRoi?.roiPct)}
            change={highlights.byRoi?.score == null ? null : Math.round(highlights.byRoi.score)}
            changeLabel={highlights.byRoi?.address ?? "-"}
            icon={TrendingUp}
            spark={roiSpark}
            tone="violet"
            badge={highlights.byRoi?.tags[0]}
            changeSuffix=""
            onClick={() => scrollToDeal(highlights.byRoi)}
          />
          <StatCard
            label="Backend Tagged Deal"
            value={highlights.tagged?.address ?? "-"}
            change={highlights.tagged?.score == null ? null : Math.round(highlights.tagged.score)}
            changeLabel={`Risk: ${taggedRiskLabel}`}
            icon={ShieldCheck}
            spark={capSpark}
            tone="gold"
            badge={highlights.tagged?.tags[0]}
            changeSuffix=""
            onClick={() => scrollToDeal(highlights.tagged)}
          />
        </div>
        {taggedChartHint ? (
          <p className="text-xs text-muted-foreground -mt-2">{taggedChartHint}</p>
        ) : null}

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

        <TopDeals data={topDeals} />

        <div className="text-center text-xs text-muted-foreground py-4">
          Truecap Premium · Powered by Truecap Deal Score™ AI
        </div>
      </main>
    </div>
  );
}
