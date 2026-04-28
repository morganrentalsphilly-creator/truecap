"use client";

import Link from "next/link";
import { Award, DollarSign, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";
import { RiskReturn } from "@/components/dashboard/RiskReturn";
import { TopDeals, type DashboardTopDeal } from "@/components/dashboard/TopDeals";
import { AIInsights } from "@/components/dashboard/AIInsights";

export type DashboardDeal = {
  id: string;
  address: string;
  propertyType: "single-family" | "multi-family" | "owner-occupant" | null;
  propertyTypeLabel: string;
  purchasePrice: number | null;
  cashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  roiPct: number | null;
  score: number | null;
  recommendation: string | null;
  riskLevel: string | null;
  riskScore: number | null;
  tags: string[];
};

export type DashboardMonthlyPoint = {
  month: string;
  income: number;
  expenses: number;
  cashFlow: number;
};

export type DashboardDistributionPoint = {
  name: string;
  count: number;
  percent: number;
  color: string;
};

export type DashboardHomeData = {
  user: {
    displayName: string;
    email: string;
    avatarSrc?: string;
  };
  stats: {
    totalDeals: number;
  };
  topDeals: DashboardDeal[];
};

const sparks = {
  up: [{ v: 4 }, { v: 6 }, { v: 5 }, { v: 8 }, { v: 7 }, { v: 11 }, { v: 14 }],
  flat: [{ v: 7 }, { v: 8 }, { v: 7 }, { v: 9 }, { v: 8 }, { v: 9 }, { v: 10 }],
  cash: [{ v: 12 }, { v: 14 }, { v: 13 }, { v: 16 }, { v: 18 }, { v: 20 }, { v: 22 }],
  down: [{ v: 9 }, { v: 8 }, { v: 9 }, { v: 7 }, { v: 8 }, { v: 7 }, { v: 6 }],
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
  return data.topDeals
    .filter((deal) => deal.riskScore != null && deal.roiPct != null)
    .map((deal) => ({
    name: deal.address,
    risk: deal.riskScore as number,
    return: deal.roiPct as number,
    size: Math.max(80, Math.round((deal.purchasePrice ?? 0) / 1000)),
    score: deal.score ?? undefined,
    cashFlow: deal.cashFlowMonthly == null ? undefined : Math.round(deal.cashFlowMonthly),
    roi: deal.roiPct ?? undefined,
  }));
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
  const tagged = deals.find((deal) => deal.tags.length > 0);

  return { byScore, byCashFlow, byRoi, tagged };
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

export function DashboardHome({ data }: { data: DashboardHomeData }) {
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

  return (
    <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden">
      <Topbar
        displayName={data.user.displayName}
        email={data.user.email}
        initials={initials}
        avatarSrc={data.user.avatarSrc}
      />
      <main className="flex-1 min-h-0 px-6 lg:px-8 py-6 space-y-6 lg:overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
              Welcome back, {data.user.displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare saved deals by score, cash flow, ROI, and risk before you commit.
            </p>
          </div>
          <Button
            asChild
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
          >
            <Link href="/" prefetch={false}>
              <Sparkles className="h-4 w-4" />
              Run new analysis
            </Link>
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
            changeLabel={`Risk: ${highlights.tagged?.riskLevel ?? "-"} · ${formatPercent(highlights.tagged?.roiPct)}`}
            icon={ShieldCheck}
            spark={capSpark}
            tone="gold"
            badge={highlights.tagged?.tags[0]}
            changeSuffix=""
            onClick={() => scrollToDeal(highlights.tagged)}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <PortfolioChart data={dealComparison} />
            <RiskReturn data={riskReturn} />
          </div>
          <div className="space-y-6">
            <AIInsights data={insights} />
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
