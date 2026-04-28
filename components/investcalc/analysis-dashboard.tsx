"use client";

import { useState } from "react";
import {
  Lock,
  TrendingUp,
  CheckCircle2,
  MinusCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Download,
  Save,
  Loader2,
  Info,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult } from "@/lib/calc-analysis";
import { TenYearProjectionsPanel } from "@/components/investcalc/ten-year-projections-panel";
import { TaxStrategyPanel } from "@/components/investcalc/tax-strategy-panel";
import { ExitScenariosPanel } from "@/components/investcalc/exit-scenarios-panel";

import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import type { ExitScenarioInput, ExitScenarioYear } from "@/lib/exit-scenarios";
import { cn } from "@/lib/utils";
import type { DealScoreActionResult } from "@/app/actions/deal-score";

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  dealScoreResult: DealScoreActionResult | null;
  isLoadingDealScore: boolean;
  propertyType: "single-family" | "multi-family" | "owner-occupant";
  projectionSource: {
    analysisId: string | null;
    input: TenYearProjectionInput;
    initialYears: ProjectionYear[];
  } | null;
  taxStrategySource: {
    analysisId: string | null;
    input: TaxStrategyInput;
    initialYears: TaxStrategyYear[];
  } | null;
  exitScenarioSource: {
    analysisId: string | null;
    input: ExitScenarioInput;
    initialYears: ExitScenarioYear[];
  } | null;
  onSaveDeal: () => void | Promise<void>;
  onCompareDeals: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  isSaving?: boolean;
  isComparing?: boolean;
  isExporting?: boolean;
  isSaved?: boolean;
  /** Shown when Compare / Export are disabled (e.g. unsaved edits). */
  persistedActionsBlockHint?: string;
}

type Tab = "cash-flow" | "projections" | "tax-strategy" | "exit-scenarios";
type RecommendationVariant = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";

const TABS: { id: Tab; label: string; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", isPro: false },
  { id: "projections", label: "10-Year Projections", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", isPro: true },
];

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function MetricCard({
  label,
  value,
  sub,
  color,
  isLoading,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-5 flex flex-col gap-1">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 mt-1" />
      ) : (
        <span className={cn("text-xl sm:text-2xl font-bold", color ?? "text-foreground")}>
          {value}
        </span>
      )}
      {sub && !isLoading && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}

export function AnalysisDashboard({
  result,
  isLoading,
  dealScoreResult,
  isLoadingDealScore,
  propertyType,
  projectionSource,
  taxStrategySource,
  exitScenarioSource,
  onSaveDeal,
  onCompareDeals,
  onExportPdf,
  isSaving = false,
  isComparing = false,
  isExporting = false,
  isSaved = false,
  persistedActionsBlockHint,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("cash-flow");

  const recommendation = buildRecommendationModel(dealScoreResult);

  const labelMap: Record<string, string> = {
    "single-family": "Single Family",
    "multi-family": "Multi-Family",
    "owner-occupant": "Owner Occupant",
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            {labelMap[propertyType]}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isSaved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            {isSaved ? "Saved" : "Preview"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onSaveDeal()}
            disabled={isSaving}
            className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
            )}
            <span className="hidden xs:inline">Sign In to </span>Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 hidden sm:flex"
            onClick={() => void onCompareDeals()}
            disabled={!isSaved || isComparing}
            title={!isSaved ? persistedActionsBlockHint ?? "Save this analysis before comparing it." : undefined}
          >
            {isComparing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            )}
            Compare Deals
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold h-8 sm:h-9 px-3 sm:px-4"
            onClick={() => void onExportPdf()}
            disabled={!isSaved || isExporting}
            title={!isSaved ? persistedActionsBlockHint ?? "Save this analysis before exporting PDF." : undefined}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Recommendation + Pro Feature row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DealScoreCard
          isAnalysisLoading={isLoading}
          isDealScoreLoading={isLoadingDealScore}
          dealScoreResult={dealScoreResult}
          isSaving={isSaving}
          onSignIn={onSaveDeal}
        />

        {/* Recommendation card */}
        <div
          className={cn(
            "md:col-span-2 rounded-2xl border p-4 sm:p-6",
            recommendation?.variant === "strong-buy" &&
              "bg-[var(--brand-green-light)] border-[var(--brand-green)]/25",
            recommendation?.variant === "buy" && "bg-[var(--brand-blue-light)] border-primary/20",
            recommendation?.variant === "neutral" && "bg-amber-50 border-amber-200",
            recommendation?.variant === "risky" && "bg-orange-50 border-orange-200",
            recommendation?.variant === "avoid" && "bg-red-50 border-red-200",
            !recommendation && "bg-muted border-border"
          )}
        >
          {isLoading || isLoadingDealScore ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : recommendation ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Recommendation
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    recommendation.variant === "strong-buy" && "bg-[var(--brand-green)]",
                    recommendation.variant === "buy" && "bg-primary",
                    recommendation.variant === "neutral" && "bg-amber-500",
                    recommendation.variant === "risky" && "bg-orange-500",
                    recommendation.variant === "avoid" && "bg-red-600"
                  )}
                >
                  {recommendation.variant === "strong-buy" || recommendation.variant === "buy" ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : recommendation.variant === "neutral" ? (
                    <MinusCircle className="w-6 h-6 text-white" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-white" />
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                  {recommendation.label}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {recommendation.description}
              </p>
              {recommendation.tips.length > 0 && (
                <>
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest mb-2",
                      recommendation.variant === "strong-buy" && "text-[var(--brand-green)]",
                      recommendation.variant === "buy" && "text-primary",
                      recommendation.variant === "neutral" && "text-amber-700",
                      recommendation.variant === "risky" && "text-orange-700",
                      recommendation.variant === "avoid" && "text-red-700"
                    )}
                  >
                    {recommendation.variant === "strong-buy" || recommendation.variant === "buy"
                      ? "Optimization Tips"
                      : recommendation.variant === "neutral"
                        ? "Next Steps"
                        : "Risk Mitigation Steps"}
                  </p>
                  <ul className="space-y-1">
                    {recommendation.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <ArrowUpRight
                          className={cn(
                            "w-3.5 h-3.5 shrink-0 mt-0.5",
                            recommendation.variant === "strong-buy" && "text-[var(--brand-green)]",
                            recommendation.variant === "buy" && "text-primary",
                            recommendation.variant === "neutral" && "text-amber-700",
                            recommendation.variant === "risky" && "text-orange-700",
                            recommendation.variant === "avoid" && "text-red-700"
                          )}
                        />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Fill in the form and click Calculate to see your analysis.
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricCard
          label="Monthly Cash Flow"
          value={result ? (result.netCashFlow >= 0 ? fmt(result.netCashFlow) : `-${fmt(result.netCashFlow)}`) : "—"}
          color={result ? (result.netCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="CoC Return"
          value={result ? `${result.cocReturn >= 0 ? "+" : ""}${result.cocReturn.toFixed(1)}%` : "—"}
          color={result ? (result.cocReturn >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="Cap Rate"
          value={result ? `+${result.capRate.toFixed(1)}%` : "—"}
          color="text-[var(--metric-positive)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="DSCR"
          value={result ? result.dscr.toFixed(2) : "—"}
          color={result ? (result.dscr >= 1.25 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="Estimated Tax Savings"
          value={result ? fmt(result.taxSavingsMonthly) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
        <MetricCard
          label="After-Tax CF"
          value={result ? fmt(result.afterTaxCF) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
      </div>

     
      {/* Analysis tabs */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {tab.isPro && (
                <span className="text-[9px] sm:text-[10px] font-bold bg-[var(--brand-orange)] text-white px-1 sm:px-1.5 py-0.5 rounded-full uppercase">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {activeTab === "cash-flow" && (
            <CashFlowTab result={result} isLoading={isLoading} />
          )}
          {activeTab === "projections" && projectionSource && (
            <TenYearProjectionsPanel source={projectionSource} />
          )}
          {activeTab === "projections" && !projectionSource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see the 10-year projection.
            </div>
          )}
          {activeTab === "tax-strategy" && taxStrategySource && (
            <TaxStrategyPanel source={taxStrategySource} />
          )}
          {activeTab === "tax-strategy" && !taxStrategySource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see the tax strategy view.
            </div>
          )}
          {activeTab === "exit-scenarios" && exitScenarioSource && (
            <ExitScenariosPanel source={exitScenarioSource} />
          )}
          {activeTab === "exit-scenarios" && !exitScenarioSource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see exit scenarios.
            </div>
          )}
          {activeTab !== "cash-flow" && activeTab !== "projections" && activeTab !== "tax-strategy" && activeTab !== "exit-scenarios" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Pro Feature</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to unlock {TABS.find((t) => t.id === activeTab)?.label}
              </p>
              <Button className="bg-primary text-primary-foreground rounded-full font-semibold">
                Sign Up Free
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRecommendationModel(dealScoreResult: DealScoreActionResult | null): {
  label: string;
  description: string;
  tips: string[];
  variant: RecommendationVariant;
} | null {
  if (!dealScoreResult?.ok) return null;

  const recommendation =
    dealScoreResult.tier === "pro"
      ? dealScoreResult.data.recommendation
      : dealScoreResult.recommendation;

  const descriptionFromScore =
    dealScoreResult.tier === "pro" ? dealScoreResult.data.explanation : null;

  const modelByRecommendation: Record<
    string,
    { variant: RecommendationVariant; description: string; tips: string[] }
  > = {
    "Strong Buy": {
      variant: "strong-buy",
      description:
        descriptionFromScore ??
        "Excellent deal quality across cash flow and coverage metrics.",
      tips: [
        "Lock in financing terms before market rates move.",
        "Build a reserve plan to protect long-term performance.",
        "Track rents quarterly to maintain momentum.",
      ],
    },
    Buy: {
      variant: "buy",
      description:
        descriptionFromScore ??
        "Good fundamentals with healthy upside and manageable risk.",
      tips: [
        "Negotiate expenses to improve monthly margin.",
        "Validate rent comps before final commitment.",
        "Keep a 3-6 month reserve fund.",
      ],
    },
    Neutral: {
      variant: "neutral",
      description:
        descriptionFromScore ??
        "The deal is workable but needs optimization for stronger returns.",
      tips: [
        "Revisit purchase price and financing assumptions.",
        "Model a conservative vacancy scenario.",
        "Improve operating efficiency before acquisition.",
      ],
    },
    Risky: {
      variant: "risky",
      description:
        descriptionFromScore ??
        "The deal has meaningful downside risk under current assumptions.",
      tips: [
        "Reduce leverage or improve debt terms.",
        "Stress-test rents and vacancy before proceeding.",
        "Only move forward with a clear mitigation plan.",
      ],
    },
    Avoid: {
      variant: "avoid",
      description:
        descriptionFromScore ??
        "Current numbers indicate negative risk-adjusted performance.",
      tips: [
        "Do not proceed unless assumptions materially improve.",
        "Seek a lower purchase price or stronger rent profile.",
        "Compare alternatives with better DSCR and cash flow.",
      ],
    },
  };

  return {
    label: recommendation,
    ...modelByRecommendation[recommendation],
  };
}

function DealScoreCard({
  isAnalysisLoading,
  isDealScoreLoading,
  dealScoreResult,
  isSaving,
  onSignIn,
}: {
  isAnalysisLoading: boolean;
  isDealScoreLoading: boolean;
  dealScoreResult: DealScoreActionResult | null;
  isSaving: boolean;
  onSignIn: () => void | Promise<void>;
}) {
  const isLoading = isAnalysisLoading || isDealScoreLoading;

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="space-y-3 w-full">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  if (!dealScoreResult || !dealScoreResult.ok || dealScoreResult.tier === "free") {
    const recommendation =
      dealScoreResult?.ok && dealScoreResult.tier === "free"
        ? dealScoreResult.recommendation
        : "Deal Score available with Pro";
    return (
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 flex flex-col items-center justify-center text-center">
        <Lock className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="font-semibold text-foreground mb-1">Deal Score (Pro)</p>
        <p className="text-xs text-muted-foreground mb-4">
          Free recommendation: {recommendation}
        </p>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground rounded-full font-semibold text-sm"
          onClick={() => void onSignIn()}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In / Sign Up"}
        </Button>
      </div>
    );
  }

  const { score, riskLevel, recommendation, explanation, breakdown } = dealScoreResult.data;
  const recommendationVariant: RecommendationVariant =
    recommendation === "Strong Buy"
      ? "strong-buy"
      : recommendation === "Buy"
        ? "buy"
        : recommendation === "Neutral"
          ? "neutral"
          : recommendation === "Risky"
            ? "risky"
            : "avoid";

  const recommendationStyles: Record<
    RecommendationVariant,
    {
      scoreRing: string;
      scoreText: string;
      recommendationChip: string;
      riskChip: string;
      metricCell: string;
      descriptionText: string;
    }
  > = {
    "strong-buy": {
      scoreRing: "ring-[var(--brand-green)]/40 bg-[var(--brand-green-light)]",
      scoreText: "text-[var(--brand-green)]",
      recommendationChip: "bg-[var(--brand-green)] text-white border-[var(--brand-green)]/40",
      riskChip: "bg-emerald-100 text-emerald-700 border-emerald-200",
      metricCell: "bg-emerald-50 border border-emerald-100",
      descriptionText: "text-emerald-800",
    },
    buy: {
      scoreRing: "ring-primary/35 bg-[var(--brand-blue-light)]",
      scoreText: "text-primary",
      recommendationChip: "bg-primary text-primary-foreground border-primary/30",
      riskChip: "bg-blue-100 text-blue-700 border-blue-200",
      metricCell: "bg-blue-50 border border-blue-100",
      descriptionText: "text-blue-800",
    },
    neutral: {
      scoreRing: "ring-amber-300/50 bg-amber-50",
      scoreText: "text-amber-700",
      recommendationChip: "bg-amber-500 text-white border-amber-300",
      riskChip: "bg-amber-100 text-amber-700 border-amber-200",
      metricCell: "bg-amber-50 border border-amber-100",
      descriptionText: "text-amber-800",
    },
    risky: {
      scoreRing: "ring-orange-300/50 bg-orange-50",
      scoreText: "text-orange-700",
      recommendationChip: "bg-orange-500 text-white border-orange-300",
      riskChip: "bg-orange-100 text-orange-700 border-orange-200",
      metricCell: "bg-orange-50 border border-orange-100",
      descriptionText: "text-orange-800",
    },
    avoid: {
      scoreRing: "ring-red-300/50 bg-red-50",
      scoreText: "text-red-700",
      recommendationChip: "bg-red-600 text-white border-red-300",
      riskChip: "bg-red-100 text-red-700 border-red-200",
      metricCell: "bg-red-50 border border-red-100",
      descriptionText: "text-red-800",
    },
  };
  const activeStyle = recommendationStyles[recommendationVariant];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Deal Score
      </p>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className={cn(
            "w-20 h-20 rounded-2xl ring-2 flex flex-col items-center justify-center shadow-sm",
            activeStyle.scoreRing
          )}
        >
          <p className={cn("text-4xl leading-none font-black", activeStyle.scoreText)}>{score}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "px-3 py-1 rounded-xl border text-sm font-bold",
              activeStyle.recommendationChip
            )}
          >
            {recommendation}
          </span>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full border text-xs font-semibold",
              activeStyle.riskChip
            )}
          >
            {riskLevel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className={cn("rounded-lg p-2", activeStyle.metricCell)}>Cash Flow Score: {breakdown.cashFlowScore}</div>
        <div className={cn("rounded-lg p-2", activeStyle.metricCell)}>CoC Score: {breakdown.cocScore}</div>
        <div className={cn("rounded-lg p-2", activeStyle.metricCell)}>Cap Rate Score: {breakdown.capRateScore}</div>
        <div className={cn("rounded-lg p-2", activeStyle.metricCell)}>DSCR Score: {breakdown.dscrScore}</div>
        <div className={cn("rounded-lg p-2 col-span-2", activeStyle.metricCell)}>
          Risk Penalty: {breakdown.riskPenalty}
        </div>
      </div>
      <p className={cn("text-xs leading-relaxed", activeStyle.descriptionText)}>{explanation}</p>
    </div>
  );
}

function CashFlowTab({
  result,
  isLoading,
}: {
  result: AnalysisResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Submit the form to see your cash flow analysis.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
      {/* Monthly income */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--metric-positive)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Monthly Income
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rental Income</span>
            <span className="font-medium text-foreground">
              ${result.monthlyRentalIncome.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-[var(--metric-positive)]">
              ${result.monthlyRentalIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Operating expenses */}
      <div>
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Operating Expenses
          </span>

          {!isLoading && result && (result.maintenanceAgeAdjusted || result.capexAgeAdjusted) && (
        <div className="rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange-light)] py-2 px-3 ">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-orange)]">
            Age Impact on Expenses
          </p>
          <div className="mt-2 space-y-1 text-xs">
            {result.maintenanceAgeAdjusted && (
              <p className="text-foreground">
                Maintenance: {fmtPct(result.maintenancePctInput)} &rarr;{" "}
               <span className="text-foreground font-bold"> {fmtPct(result.maintenancePctEffective)}</span>
              </p>
            )}
            {result.capexAgeAdjusted && (
              <p className="text-foreground">
                CapEx: {fmtPct(result.capexPctInput)} &rarr; <span className="text-foreground font-bold"> {fmtPct(result.capexPctEffective)}</span>
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[var(--brand-orange)]" />
            Adjusted based on property age ({result.propertyAge} y)
          </p>
        </div>
      )}

        </div>
        <div className="space-y-2">
          {[
            { label: "Property Tax", value: result.propertyTax },
            { label: "Insurance", value: result.insurance },
            { label: "HOA", value: result.hoa },
            { label: "Utilities", value: result.utilities },
            { label: "Maintenance", value: result.maintenance },
            { label: "Vacancy", value: result.vacancy },
            { label: "Management", value: result.management },
            { label: "CapEx", value: result.capex },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">
                ${value.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-[var(--metric-negative)]">
              ${result.totalOperatingExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Debt service */}
      <div>
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Debt Service
          </span>
        </div>
        <div className="space-y-4">
          <div className="bg-[var(--brand-blue-light)] rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
            <p className="text-xl font-bold text-foreground">
              ${result.loanAmount.toLocaleString()}
            </p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Loan Payment (Principal &amp; Interest)</span>
            <span className="font-medium text-foreground">
              ${result.monthlyPayment.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Monthly Cost Breakdown
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan Payment (P&amp;I)</span>
              <span className="font-medium text-foreground">
                ${result.loanPrincipalAndInterest.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Property Tax (Monthly)</span>
              <span className="font-medium text-foreground">
                ${result.propertyTaxMonthly.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Insurance (Monthly)</span>
              <span className="font-medium text-foreground">
                ${result.insuranceMonthly.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">HOA (Monthly)</span>
              <span className="font-medium text-foreground">
                ${result.hoaMonthly.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="font-semibold text-foreground">Total Monthly Cost</span>
              <span className="font-bold text-foreground">
                ${result.totalMonthlyPaymentDebug.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Loan payment is shown separately from operating expenses so it is clear that the
              current engine uses <span className="font-medium text-foreground">monthlyPayment</span>{" "}
              for principal and interest only. Property tax, insurance, and HOA are modeled
              outside the loan payment.
            </p>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-bold text-foreground">Net Cash Flow</span>
            <span
              className={cn(
                "font-bold text-lg",
                result.netCashFlow >= 0
                  ? "text-[var(--metric-positive)]"
                  : "text-[var(--metric-negative)]"
              )}
            >
              {result.netCashFlow >= 0 ? "" : "-"}$
              {Math.abs(result.netCashFlow).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total cash required */}
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Total Cash Required
          </p>
          <div className="flex justify-between text-sm mb-1">
            <div>
              <p className="text-muted-foreground">Down Payment</p>
              <p className="text-xs text-muted-foreground">{fmtPct(result.downPaymentPct)}</p>
            </div>
            <span className="font-semibold text-foreground">
              ${result.downPayment.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <div>
              <p className="text-muted-foreground">Closing Costs</p>
              <p className="text-xs text-muted-foreground">{fmtPct(result.closingCostsPct)}</p>
            </div>
            <span className="font-semibold text-foreground">
              ${result.closingCosts.toLocaleString()}
            </span>
          </div>
          <div className="bg-primary rounded-xl p-4 flex justify-between items-center">
            <p className="text-sm font-semibold text-primary-foreground">
              Total Investment
            </p>
            <p className="text-xl font-black text-primary-foreground">
              ${result.totalCashRequired.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
