"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Lock,
  TrendingUp,
  CheckCircle2,
  MinusCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Save,
  Loader2,
  Info,
  FileDown,
  Sparkles,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult } from "@/lib/calc-analysis";
import { WhatIfSliders, type WhatIfState } from "@/components/investcalc/what-if-sliders";
import { BreakpointSuggestionCard } from "@/components/investcalc/breakpoint-suggestion-card";

// The three Pro snapshot panels each pull in recharts (~90 KB gzipped
// combined). They're tab-gated AND Pro-gated — most homepage visitors
// (and all free-tier users on the default tab) never render them. Lazy-
// loading via next/dynamic keeps recharts out of the initial bundle.
// Each panel shows a small skeleton during the brief load (typically
// 100-300 ms on first tab click, instant on subsequent clicks).
// `ssr: false` because charts only render in the browser anyway.
const TenYearProjectionsPanel = dynamic(
  () =>
    import("@/components/investcalc/ten-year-projections/panel").then(
      (m) => m.TenYearProjectionsPanel
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
  }
);
const TaxStrategyPanel = dynamic(
  () =>
    import("@/components/investcalc/tax-strategy/panel").then(
      (m) => m.TaxStrategyPanel
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
  }
);
const ExitScenariosPanel = dynamic(
  () =>
    import("@/components/investcalc/exit-scenarios/panel").then(
      (m) => m.ExitScenariosPanel
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
  }
);
import { MaxOfferCard } from "@/components/investcalc/max-offer-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import { ProInlineGate } from "@/components/investcalc/pro-inline-gate";
import { Activity, Target } from "lucide-react";
import { MomentOfValueUpsell } from "@/components/marketing/moment-of-value-upsell";
import { SignupPromptCard } from "@/components/marketing/signup-prompt-card";
import { CashFlowWaterfall } from "@/components/investcalc/cash-flow-waterfall";
import { MortgageScenarioCompare } from "@/components/investcalc/mortgage-scenario-compare";
import { LoanAmortizationView } from "@/components/investcalc/loan-amortization-view";
import { DealNotesPanel } from "@/components/investcalc/deal-notes-panel";
// ShareLinkButton import temporarily removed — Share button was pulled from
// the Quick Actions row because it wrapped onto a second line. Component
// + share-link.ts + /d/[encoded] route all remain in the codebase ready
// for re-introduction in a less prominent UI spot.
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import type { GLOSSARY } from "@/lib/glossary";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

import {
  getCapRateBenchmark,
  formatCapRateBenchmarkSubline,
} from "@/lib/market-benchmarks";
import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import type { ExitScenarioInput, ExitScenarioYear } from "@/lib/exit-scenarios";
import { cn } from "@/lib/utils";
import type { DealScoreActionResult } from "@/app/actions/deal-score";

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  /** Current form values — needed by MaxOfferCard to re-solve at varied prices. */
  values?: InvestmentFormValues | null;
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
  onNewAnalysis: () => void | Promise<void>;
  isSaving?: boolean;
  isComparing?: boolean;
  isExporting?: boolean;
  isSaved?: boolean;
  isExistingSavedDeal?: boolean;
  /** The persisted deal id, when this is a saved-and-loaded deal.
   *  Used by the Deal Notes panel to fetch + persist notes. */
  savedDealId?: string | null;
  isAuthenticated?: boolean;
  canSaveDeals?: boolean;
  canUpdateSavedDeals?: boolean;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
  canUseProjections?: boolean;
  canUseTaxStrategy?: boolean;
  canUseExitScenarios?: boolean;
  canUseDealScore?: boolean;
  /** Pro: max-allowable-offer solver. False = render upsell teaser. */
  canUseMaxOffer?: boolean;
  /** Pro: sensitivity grid. False = render upsell teaser. */
  canUseSensitivity?: boolean;
  /** Pro: Strategies tab. False = tab shown locked with upgrade prompt. */
  canUseStrategies?: boolean;
  /** Pro: shareable read-only deal links. False = share button hidden / locked. */
  canUseShareLinks?: boolean;
  saveDealLimitReached?: boolean;
  activeTab?: AnalysisDashboardTab;
  /** Shown when Compare / Export are disabled (e.g. unsaved edits). */
  persistedActionsBlockHint?: string;
}

export type AnalysisDashboardTab =
  | "cash-flow"
  | "projections"
  | "tax-strategy"
  | "exit-scenarios"
  | "strategies"
  | "stress-test";
type RecommendationVariant = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";

const TABS: { id: AnalysisDashboardTab; label: string; mobileLabel: string; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", mobileLabel: "Cash Flow", isPro: false },
  { id: "projections", label: "10-Year Projections", mobileLabel: "10-Year", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", mobileLabel: "Tax", isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", mobileLabel: "Exit", isPro: true },
  { id: "strategies", label: "Strategies", mobileLabel: "Strategy", isPro: true },
  // Stress Test consolidates Max Allowable Offer + Sensitivity Grid —
  // both Pro features that previously rendered as always-visible cards
  // between the metrics row and the tab bar. Moving them into a tab
  // keeps the headline scroll calmer without losing the features.
  { id: "stress-test", label: "Stress Test", mobileLabel: "Stress", isPro: true },
];

/**
 * Inline market-context labels surfaced under each metric tile.
 *
 * Phase 2: market-aware benchmarks via lib/market-benchmarks. When
 * the address parses to a known metro or state, we surface the
 * local median — "Above the 7.5% Philadelphia median" — which is
 * strictly more useful than a national band because a 7% cap rate
 * is excellent in California (4-5% typical) and mediocre in
 * Detroit (9-10% typical).
 *
 * Falls back to national bands when the address doesn't parse (free
 * form input, non-US address, no state code detectable).
 */
function capRateBenchmarkLabel(capRatePct: number, address?: string | null): string {
  const benchmark = getCapRateBenchmark(address);
  if (benchmark && benchmark.scope !== "national") {
    return formatCapRateBenchmarkSubline(capRatePct, benchmark);
  }
  // National fallback bands — keep the same thresholds the scoring
  // engine uses so the metric subline and the score subline agree.
  if (capRatePct > 8) return "Above 8% — top quartile (U.S.)";
  if (capRatePct > 5) return "5–8% — fair for market (U.S.)";
  return "Below 5% — appreciation-dependent (U.S.)";
}

function cocBenchmarkLabel(cocPct: number): string {
  if (cocPct > 12) return "Above 12% — strong";
  if (cocPct > 8) return "8–12% — healthy";
  if (cocPct > 5) return "5–8% — modest";
  if (cocPct >= 0) return "Below 5% — weak";
  return "Negative — losing money";
}

function cashFlowBenchmarkLabel(monthlyCashFlow: number): string {
  if (monthlyCashFlow > 1000) return "Above $1,000/mo target";
  if (monthlyCashFlow > 0) return "Positive but modest";
  if (monthlyCashFlow > -100) return "~Break-even";
  return "Losing money monthly";
}

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
  glossaryTerm,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isLoading: boolean;
  glossaryTerm?: keyof typeof GLOSSARY;
}) {
  const labelEl = (
    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
      {label}
    </span>
  );
  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-5 flex flex-col gap-1">
      {glossaryTerm ? (
        <GlossaryTip term={glossaryTerm} showIcon={false} className="!no-underline">
          {labelEl}
        </GlossaryTip>
      ) : (
        labelEl
      )}
      {isLoading ? (
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 mt-1" />
      ) : (
        <span className={cn("text-xl sm:text-2xl font-bold", color ?? "text-foreground")}>
          {value}
        </span>
      )}
      {sub && !isLoading && (
        <span className="text-[10px] leading-tight text-muted-foreground/80 sm:text-[11px]">
          {sub}
        </span>
      )}
    </div>
  );
}

export function AnalysisDashboard({
  result,
  values = null,
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
  onNewAnalysis,
  isSaving = false,
  isComparing = false,
  isExporting = false,
  isSaved = false,
  isExistingSavedDeal = false,
  savedDealId = null,
  isAuthenticated = false,
  canSaveDeals = false,
  canUpdateSavedDeals = false,
  canCompareDeals = false,
  canExportPdf = false,
  canUseProjections = false,
  canUseTaxStrategy = false,
  canUseExitScenarios = false,
  canUseDealScore = false,
  canUseMaxOffer = false,
  canUseSensitivity = false,
  canUseStrategies = false,
  canUseShareLinks = false,
  saveDealLimitReached = false,
  activeTab: activeTabProp,
  persistedActionsBlockHint,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<AnalysisDashboardTab>(activeTabProp ?? "cash-flow");
  // Show only the first 3 recommendation tips by default — beyond that
  // the Recommendation card starts feeling busy. User can expand to see
  // the rest. Resets implicitly when the parent component re-mounts on
  // a new analysis; we don't reset on each recommendation change because
  // most users keep this collapsed anyway.
  const [showAllTips, setShowAllTips] = useState(false);

  // What-if slider state. When the user drags rent / rate, this holds
  // the adjusted result; otherwise null and we render the base `result`
  // unchanged. SCOPED: only the 4 Overview tier metric cards consume
  // this — projections, tax strategy, exit scenarios, deal score, and
  // every Pro panel stay anchored to the saved/base analysis. Sliders
  // are a "what-if peek" on headline numbers, not a full reanalysis.
  const [whatIfState, setWhatIfState] = useState<WhatIfState | null>(null);
  const displayResult: AnalysisResult | null =
    whatIfState?.result ?? result;
  const router = useRouter();
  const goToLogin = () => router.push("/auth/login");
  const goToBilling = () => router.push("/profile#billing");
  const tabEntitlements: Record<AnalysisDashboardTab, boolean> = {
    "cash-flow": true,
    projections: canUseProjections,
    "tax-strategy": canUseTaxStrategy,
    "exit-scenarios": canUseExitScenarios,
    // Strategies tab (BRRRR + Fix-and-Flip + rehab estimator) is now a
    // Pro feature — gated by canUseStrategies. Free users see the tab
    // with a lock icon and the ProFeaturePreview placeholder on click.
    strategies: canUseStrategies,
    // Stress Test tab houses Max Allowable Offer + Sensitivity Grid.
    // It unlocks if EITHER underlying entitlement is granted, since the
    // tab itself shows both cards (with a per-card Pro gate if only one
    // is unlocked).
    "stress-test": canUseMaxOffer || canUseSensitivity,
  };
  const isEditingLockedByPlan = isAuthenticated && isExistingSavedDeal && !canUpdateSavedDeals;
  const isSaveLimitLockedByPlan = isAuthenticated && !isExistingSavedDeal && saveDealLimitReached;
  const isSaveLockedByPlan =
    isEditingLockedByPlan || isSaveLimitLockedByPlan || (isAuthenticated && !canSaveDeals);

  useEffect(() => {
    if (!activeTabProp) return;
    setActiveTab(activeTabProp);
  }, [activeTabProp]);

  const recommendation = buildRecommendationModel(dealScoreResult);

  const labelMap: Record<string, string> = {
    "single-family": "Single Family",
    "multi-family": "Multi-Family",
    "owner-occupant": "Owner Occupant",
  };

  return (
    <div className="space-y-6">
      {/* Action bar — split into two visually distinct elements:
          a lightweight identity strip ("what is this?") and a
          chunkier Quick Actions panel ("what can I do with it?").
          Previously these were nested inside the same rounded card,
          which gave the area a busy double-border feel. */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Identity strip — property type + saved-status badge.
            Inline, no card chrome. Reads as a header rather than
            a UI element. */}
        <div className="flex items-center gap-2 px-1">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            {labelMap[propertyType]}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isSaved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isExistingSavedDeal
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            )}
            title={
              isSaved
                ? "All changes saved"
                : isExistingSavedDeal
                  ? "You've edited this deal since the last save. Click Save to persist."
                  : "This is a preview — click Save to persist this deal."
            }
          >
            {isSaved
              ? "Saved"
              : isExistingSavedDeal
                ? "Unsaved changes"
                : "Preview"}
          </span>
        </div>
        {/* Quick Actions — naked button row, no panel chrome.
            Previously wrapped in a bordered card with a floating
            "Quick actions" label, which added visual weight without
            adding meaning — the 4 buttons themselves are clearly a
            toolbar. Removing the chrome lets the row read as inline
            with the identity strip. */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 xl:min-w-[560px] max-[380px]:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isAuthenticated) {
                    goToLogin();
                    return;
                  }
                  void onSaveDeal();
                }}
                disabled={isSaving || isSaveLockedByPlan}
                title={
                  isEditingLockedByPlan
                    ? "Upgrade to update saved analyses."
                    : isSaveLimitLockedByPlan
                      ? "Saved deal limit reached for your plan."
                      : isAuthenticated && !canSaveDeals
                        ? "Save is not available for your current plan."
                        : undefined
                }
                className="h-9 gap-1 rounded-xl px-1.5 text-[11px] sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:h-9 max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 animate-spin max-[380px]:h-3 max-[380px]:w-3" />
                ) : (
                  <Save className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 max-[380px]:h-3 max-[380px]:w-3" />
                )}
                <span>Save</span>
                {isSaveLockedByPlan && (
                  <span className="ml-0.5 sm:ml-1 rounded-full bg-[var(--brand-orange)] px-1 sm:px-1 py-0.5 text-[9px] sm:text-[9px] font-bold uppercase text-white sm:ml-1.5 sm:px-1.5">
                    PRO
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 rounded-xl px-1.5 text-[11px] sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:h-9 max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
                onClick={() => void onCompareDeals()}
                disabled={!isSaved || !canCompareDeals || isComparing}
                title={
                  !isSaved
                    ? persistedActionsBlockHint ?? "Save this analysis before comparing it."
                    : !canCompareDeals
                      ? "Compare is not available for your current plan."
                      : undefined
                }
              >
                {isComparing ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 animate-spin max-[380px]:h-3 max-[380px]:w-3" />
                ) : (
                  <ListTodo className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 max-[380px]:h-3 max-[380px]:w-3" />
                )}
                <span className="hidden sm:inline">Compare Deals</span>
                <span className="sm:hidden">Compare</span>
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1 rounded-xl bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:h-9 max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
                onClick={() => void onExportPdf()}
                disabled={!isSaved || !canExportPdf || isExporting}
                title={
                  !isSaved
                    ? persistedActionsBlockHint ?? "Save this analysis before exporting PDF."
                    : !canExportPdf
                      ? "PDF export is not available for your current plan."
                      : undefined
                }
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 animate-spin max-[380px]:h-3 max-[380px]:w-3" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 max-[380px]:h-3 max-[380px]:w-3" />
                )}
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1 rounded-xl bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:h-9 max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
                onClick={() => void onNewAnalysis()}
                // style={{ background: "!var(--gradient-premium)", boxShadow: "var(--shadow-glow)"}}
                title="Create a new analysis"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 sm:mr-1.5 max-[380px]:h-3 max-[380px]:w-3" />
                <span className="hidden sm:inline">New Analysis</span>
                <span className="sm:hidden">New</span>
              </Button>
              {/* Share link button moved out of Quick Actions — it wrapped
                  to a second row and broke the action-row alignment. The
                  share link can be re-surfaced in a more deliberate spot
                  later (e.g. as part of the export menu or near saved-deal
                  list-items). Underlying ShareLinkButton component is still
                  imported but unused; keeping it ready for re-introduction. */}
        </div>
      </div>

      {/* Recommendation + Pro Feature row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DealScoreCard
          isAnalysisLoading={isLoading}
          isDealScoreLoading={isLoadingDealScore}
          dealScoreResult={dealScoreResult}
          isSaving={isSaving}
          onUpgrade={goToBilling}
          canUseDealScore={canUseDealScore}
          propertyType={propertyType}
          isCashPurchase={Boolean(result && result.monthlyPayment <= 0)}
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
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
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
                    {(showAllTips ? recommendation.tips : recommendation.tips.slice(0, 3)).map((tip, i) => (
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
                  {recommendation.tips.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTips((prev) => !prev)}
                      className="mt-2 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {showAllTips
                        ? "Show fewer"
                        : `Show all ${recommendation.tips.length}`}
                    </button>
                  )}
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

      {/* Deal notes — only rendered when this is an actual saved
          deal that's been re-opened. Lazy-fetches its own data so it
          doesn't add latency to the page render. */}
      {isExistingSavedDeal && savedDealId ? (
        <DealNotesPanel savedDealId={savedDealId} />
      ) : null}

      {/* Metric cards — split into two tiers for visual hierarchy.
          Tier 1 (4 prominent cards): Cash Flow, CoC, Cap Rate, DSCR —
            the "is this a good deal?" answer at a glance.
          Tier 2 (2 smaller chips): Tax Savings, After-Tax CF — still
            visible, but visually demoted because tax math is downstream
            of the core deal economics.

          Tier 1 cards consume `displayResult` (= whatIfState.result if
          sliders are non-zero, else base result). Tier 2 + everything
          below this section continues to use base `result` so Pro
          panels and projections don't thrash on slider drags. */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Overview
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* What-if sliders — only render when we have BOTH a result and
            the input values. Pure client-side compute, no IO, sub-ms. */}
        {result && values ? (
          <WhatIfSliders
            values={values}
            baseResult={result}
            onStateChange={setWhatIfState}
          />
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          <MetricCard
            label="Monthly Cash Flow"
            glossaryTerm="cashFlow"
            value={displayResult ? (displayResult.netCashFlow >= 0 ? fmt(displayResult.netCashFlow) : `-${fmt(displayResult.netCashFlow)}`) : "—"}
            sub={displayResult ? cashFlowBenchmarkLabel(displayResult.netCashFlow) : undefined}
            color={displayResult ? (displayResult.netCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
            isLoading={isLoading}
          />
          <MetricCard
            label="CoC Return"
            glossaryTerm="coc"
            value={displayResult ? `${displayResult.cocReturn >= 0 ? "+" : ""}${displayResult.cocReturn.toFixed(1)}%` : "—"}
            sub={displayResult ? cocBenchmarkLabel(displayResult.cocReturn) : undefined}
            color={displayResult ? (displayResult.cocReturn >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
            isLoading={isLoading}
          />
          <MetricCard
            label="Cap Rate"
            glossaryTerm="capRate"
            value={
              displayResult
                ? `${displayResult.capRate >= 0 ? "+" : ""}${displayResult.capRate.toFixed(1)}%`
                : "—"
            }
            sub={displayResult ? capRateBenchmarkLabel(displayResult.capRate, values?.address) : undefined}
            color={
              displayResult
                ? displayResult.capRate >= 5
                  ? "text-[var(--metric-positive)]"
                  : displayResult.capRate >= 0
                    ? "text-foreground"
                    : "text-[var(--metric-negative)]"
                : undefined
            }
            isLoading={isLoading}
          />
          <MetricCard
            label="DSCR"
            glossaryTerm="dscr"
            // Cash purchases have no debt service, so DSCR is undefined. We
            // surface "—" + a clear sub-label rather than a misleading 0.00 /
            // "Underwater" badge.
            value={
              displayResult
                ? displayResult.monthlyPayment <= 0
                  ? "—"
                  : displayResult.dscr.toFixed(2)
                : "—"
            }
            sub={
              displayResult
                ? displayResult.monthlyPayment <= 0
                  ? "Cash purchase"
                  : displayResult.dscr >= 1.25
                  ? "Bankable (≥1.25)"
                  : displayResult.dscr >= 1.0
                  ? "Tight (≥1.0)"
                  : "Underwater"
                : undefined
            }
            color={
              displayResult
                ? displayResult.monthlyPayment <= 0
                  ? undefined
                  : displayResult.dscr >= 1.25
                  ? "text-[var(--metric-positive)]"
                  : "text-[var(--metric-negative)]"
                : undefined
            }
            isLoading={isLoading}
          />
        </div>

        {/* Breakpoint suggestion — only renders for deals below Strong
            tier, and only when there's a reachable price/rent within ±30%.
            Uses base result (not whatIfState) so the suggestion stays
            anchored to the actual deal — moving sliders shouldn't reframe
            "what would make this Solid?" relative to a what-if state. */}
        {result && values ? (
          <BreakpointSuggestionCard values={values} result={result} />
        ) : null}

        {/* Tier 2: secondary cash-flow + tax metrics in a 3-up grid.
            Annual CF was previously shown only inside the Cash Flow tab
            (NetCashFlowCard). Surfacing it here consolidates every
            cash-flow readout in OVERVIEW, which lets us delete the
            now-redundant tab hero. Muted card chrome signals "supporting
            info" rather than "co-equal with the 4 prominent tiles." */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-border bg-card/60 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Annual CF
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm sm:text-base font-bold tabular-nums",
                      result
                        ? result.annualCashFlow >= 0
                          ? "text-[var(--metric-positive)]"
                          : "text-[var(--metric-negative)]"
                        : "text-foreground"
                    )}
                  >
                    {result
                      ? `${result.annualCashFlow >= 0 ? "" : "-"}${fmt(result.annualCashFlow)}`
                      : "—"}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">/yr</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <GlossaryTip term="afterTaxCF" showIcon={false}>
                After-tax CF
              </GlossaryTip>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <>
                  <span className="text-sm sm:text-base font-bold text-primary">
                    {result ? fmt(result.afterTaxCF) : "—"}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">/mo</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <GlossaryTip term="taxSavings" showIcon={false}>
                Tax savings
              </GlossaryTip>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <>
                  <span className="text-sm sm:text-base font-bold text-primary">
                    {result ? fmt(result.taxSavingsMonthly) : "—"}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">/mo</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Free-tier prompt — shows ONE card, not two stacked.
          Decision tree:
            - Anonymous user → SignupPromptCard (cheap "save this" ask).
              Signing up is the lower-friction win; we don't double-up
              with a Pro pitch on top of it.
            - Signed-in free user → MomentOfValueUpsell (deal-specific
              Pro pitch — they've already cleared signup, so it's time
              to monetize).
            - Pro user → nothing renders here.
          Previously both rendered for anonymous users, which buried
          the Pro pitch under the signup ask. */}
      {result && !isLoading && !isAuthenticated && (
        <SignupPromptCard
          address={values?.address}
          isAuthenticated={isAuthenticated}
        />
      )}
      {result && !isLoading && isAuthenticated && !canUseProjections && (
        <MomentOfValueUpsell
          netCashFlow={result.netCashFlow}
          capRate={result.capRate}
          cocReturn={result.cocReturn}
          estimatedAnnualTaxSavings={Math.round((result.taxSavingsMonthly ?? 0) * 12)}
          isPaid={canUseProjections}
        />
      )}

      {/* MAO + Sensitivity were previously rendered here as two
          always-visible cards (Pro for paid users, ProInlineGate teasers
          for free users). They now live inside the "Stress Test" tab
          below to keep the headline scroll calmer. See the
          activeTab === "stress-test" block in tab content. */}

      {/* "Details" landmark — pairs with the "Overview" landmark above
          the metric grid. Gives the eye a clear "here's where the
          deeper analysis starts" cue without adding clutter. */}
      <div className="flex items-center gap-2 px-1 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Details
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Analysis tabs */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        {/* Tab bar — horizontal scroll on all phone widths. Was forcing
            a cramped 4-col grid at <=380px which collapsed tap-targets
            to 60-70px wide; scrollable gives full-size targets and
            readable labels. */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none p-2 sm:gap-0 sm:border-b sm:border-border sm:p-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 rounded-full border px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 sm:rounded-none sm:border-0 sm:px-5 sm:py-3.5 sm:text-sm",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted sm:bg-transparent"
              )}
            >
              {tab.id === "cash-flow" && <TrendingUp className="w-3.5 h-3.5 sm:hidden" />}
              {tab.id === "projections" && <ArrowUpRight className="w-3.5 h-3.5 sm:hidden" />}
              {tab.id === "tax-strategy" && <FileText className="w-3.5 h-3.5 sm:hidden" />}
              {tab.id === "exit-scenarios" && <ArrowUpRight className="w-3.5 h-3.5 sm:hidden" />}
              {tab.id === "stress-test" && <Activity className="w-3.5 h-3.5 sm:hidden" />}
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.isPro && !tabEntitlements[tab.id] && (
                // PRO badge now visible on mobile too — previously
                // hidden via 'hidden sm:inline-flex', which meant
                // mobile users tapped Pro tabs without warning and
                // hit a paywall. Surfacing the badge upfront prevents
                // the bait-and-switch UX.
                <span className="inline-flex text-[9px] sm:text-[10px] font-bold bg-[var(--brand-orange)] text-white px-1 sm:px-1.5 py-0.5 rounded-full uppercase">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-w-0 overflow-hidden p-2 sm:p-6">
          {activeTab === "cash-flow" && (
            <CashFlowTab
              result={result}
              isLoading={isLoading}
              values={values}
              isPro={canUseStrategies || canUseSensitivity || canUseProjections}
            />
          )}
          {activeTab === "projections" && !canUseProjections && (
            <ProFeaturePreview kind="projections" onUpgrade={goToBilling} result={result} />
          )}
          {activeTab === "projections" && canUseProjections && projectionSource && (
            <TenYearProjectionsPanel source={projectionSource} />
          )}
          {activeTab === "projections" && canUseProjections && !projectionSource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see the 10-year projection.
            </div>
          )}
          {activeTab === "tax-strategy" && !canUseTaxStrategy && (
            <ProFeaturePreview kind="tax-strategy" onUpgrade={goToBilling} result={result} />
          )}
          {activeTab === "tax-strategy" && canUseTaxStrategy && taxStrategySource && (
            <TaxStrategyPanel source={taxStrategySource} />
          )}
          {activeTab === "tax-strategy" && canUseTaxStrategy && !taxStrategySource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see the tax strategy view.
            </div>
          )}
          {activeTab === "exit-scenarios" && !canUseExitScenarios && (
            <ProFeaturePreview kind="exit-scenarios" onUpgrade={goToBilling} result={result} />
          )}
          {activeTab === "exit-scenarios" && canUseExitScenarios && exitScenarioSource && (
            <ExitScenariosPanel source={exitScenarioSource} />
          )}
          {activeTab === "exit-scenarios" && canUseExitScenarios && !exitScenarioSource && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Run the analysis to see exit scenarios.
            </div>
          )}
          {activeTab === "strategies" && !canUseStrategies && (
            <ProFeaturePreview kind="strategies" onUpgrade={goToBilling} result={result} />
          )}
          {activeTab === "strategies" && canUseStrategies && (
            <StrategiesPanel values={values} result={result} />
          )}
          {/* Stress Test tab — Max Allowable Offer + Sensitivity Grid.
              Each card independently respects its own entitlement: a
              user could have unlocked one without the other (rare, but
              possible if entitlements drift). Cards render as full
              tools when entitled, or as ProInlineGate teasers when not. */}
          {activeTab === "stress-test" && (
            <div className="space-y-4">
              {canUseMaxOffer ? (
                <MaxOfferCard values={values} />
              ) : (
                <ProInlineGate
                  icon={Target}
                  title="Max Allowable Offer"
                  description="Reverse-solve the highest price that still hits your return thresholds."
                  previewBullets={[
                    "Set targets for cap rate, CoC, or cash flow",
                    "Binary-search solver runs in <1s",
                    "'At this price you'd get…' readout",
                  ]}
                />
              )}
              {canUseSensitivity ? (
                <SensitivityGrid values={values} />
              ) : (
                <ProInlineGate
                  icon={Activity}
                  title="Sensitivity analysis"
                  description="Stress-test the deal if rent comes in lower, vacancy spikes, or rates rise."
                  previewBullets={[
                    "Rent ±10% scenarios",
                    "Vacancy ±5pp scenarios",
                    "Interest rate ±1pp scenarios",
                  ]}
                />
              )}
            </div>
          )}
          {activeTab !== "cash-flow" && activeTab !== "projections" && activeTab !== "tax-strategy" && activeTab !== "exit-scenarios" && activeTab !== "strategies" && activeTab !== "stress-test" && (
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
  onUpgrade,
  canUseDealScore,
  propertyType,
  isCashPurchase,
}: {
  isAnalysisLoading: boolean;
  isDealScoreLoading: boolean;
  dealScoreResult: DealScoreActionResult | null;
  isSaving: boolean;
  onUpgrade: () => void;
  canUseDealScore: boolean;
  /** Property type — passed through so the cash-flow tier max + label
   *  can branch correctly for owner-occupant deals (different bands). */
  propertyType?: AnalysisDashboardProps["propertyType"];
  /** True if the deal has no debt service (100% down). Used to
   *  relabel the DSCR breakdown tile, which otherwise reads
   *  "Above 1.25" — confusing alongside the MetricCard's "Cash purchase". */
  isCashPurchase?: boolean;
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

  if (!canUseDealScore) {
    return (
      <div className="relative overflow-hidden bg-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="pointer-events-none select-none opacity-75 blur-[4.5px]">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Deal Score
          </p>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-20 h-20 rounded-2xl ring-2 ring-primary/35 bg-[var(--brand-blue-light)] flex flex-col items-center justify-center shadow-sm">
              {/* Sample score = 72 with "Buy" + "Medium Risk" — chosen
                  to be internally consistent with the live deal-score
                  engine's bands (Strong Buy ≥75 / Buy ≥55 / Neutral ≥35
                  / Risky ≥18) and Risk Level bands (Low ≥65 / Medium ≥40
                  / High <40). Previously this showed "32" with the "Buy"
                  + "High Risk" chips — which the live engine would
                  classify as "Risky" + "High Risk", a contradiction that
                  free users could spot the moment they upgraded. */}
              <p className="text-4xl leading-none font-extrabold text-primary">72</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1 rounded-xl border border-primary/30 bg-primary text-primary-foreground text-sm font-bold">
                Buy
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
                Medium Risk
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            {/* Numbers add to 74; -2 risk penalty = 72 — math checks. */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">Cash Flow Score: 18</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">CoC Score: 21</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">Cap Rate Score: 20</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">DSCR Score: 15</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 col-span-2">
              Risk Penalty: -2
            </div>
          </div>
          <p className="text-xs leading-relaxed text-blue-800">
            This sample score preview shows the type of breakdown Pro unlocks for each deal.
          </p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/35 px-5 text-center backdrop-blur-[1px]">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground mb-1">Deal Score (Pro)</p>
          <p className="max-w-xs text-xs text-muted-foreground mb-4">
            Upgrade to Pro to unlock risk scoring, score breakdowns, and recommendation details.
          </p>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground rounded-full font-semibold text-sm"
            onClick={onUpgrade}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade to Pro"}
          </Button>
        </div>
      </div>
    );
  }

  if (!dealScoreResult || !dealScoreResult.ok || dealScoreResult.tier !== "pro") {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Deal Score
        </p>
        <div className="flex items-center justify-center min-h-40 rounded-xl border border-dashed border-border bg-muted/20 text-center px-4">
          <p className="text-sm text-muted-foreground">
            Run the analysis to view your live Deal Score and recommendation details.
          </p>
        </div>
      </div>
    );
  }

  const { score, riskLevel, recommendation, explanation, breakdown } = dealScoreResult.data;
  // Owner-occupant deals use different cash-flow bands and a 30-point
  // max (vs investor 25). Branch the explanation labels accordingly so
  // the breakdown matches the engine's actual scoring tiers.
  const isOwnerOccupant = propertyType === "owner-occupant";
  // Plain-English subline for each subscore — turns "Cash Flow Score: 25"
  // into "Cash Flow: 25/25 — Above $1,000/mo target". Computed from the
  // subscore value + property context alone (the engine's thresholds
  // are encoded here as labels). Pure display — does not touch the
  // scoring engine.
  const breakdownExplanations = {
    cashFlow: isOwnerOccupant
      ? breakdown.cashFlowScore >= 30
        ? "Above $300/mo — strong for house-hack"
        : breakdown.cashFlowScore >= 25
          ? "Within $300/mo of break-even — typical for house-hack"
          : "Owner cost meaningfully above break-even"
      : breakdown.cashFlowScore >= 25
        ? "Above $1,000/mo — strong"
        : breakdown.cashFlowScore >= 15
          ? "Positive but modest ($0–$1,000/mo)"
          : "Negative — eats into your return",
    coc:
      breakdown.cocScore >= 25
        ? "Above 12% — strong"
        : breakdown.cocScore >= 15
          ? "8–12% — healthy"
          : breakdown.cocScore >= 8
            ? "5–8% — modest"
            : "Below 5% — weak",
    capRate:
      breakdown.capRateScore >= 20
        ? "Above 8% — strong"
        : breakdown.capRateScore >= 10
          ? "5–8% — fair for the market"
          : "Below 5% — appreciation-dependent",
    dscr: isCashPurchase
      ? "N/A — all-cash purchase (no debt to cover)"
      : breakdown.dscrScore >= 20
        ? "Above 1.25 — clears lender threshold"
        : breakdown.dscrScore >= 10
          ? "1.00–1.25 — thin coverage cushion"
          : "Below 1.00 — does not cover debt",
    risk:
      breakdown.riskPenalty === 0
        ? "No penalty — risk profile is clean"
        : breakdown.riskPenalty > -10
          ? "Mild penalty for elevated risk factors"
          : breakdown.riskPenalty > -20
            ? "Moderate penalty — review CapEx, age, vacancy"
            : "Heavy penalty — multiple risk factors stacking",
  } as const;
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
          <p className={cn("text-4xl leading-none font-extrabold", activeStyle.scoreText)}>{score}</p>
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
        <ScoreBreakdownTile
          label="Cash flow"
          value={breakdown.cashFlowScore}
          max={isOwnerOccupant ? 30 : 25}
          explanation={breakdownExplanations.cashFlow}
          cellClass={activeStyle.metricCell}
        />
        <ScoreBreakdownTile
          label="Cash-on-cash"
          value={breakdown.cocScore}
          max={25}
          explanation={breakdownExplanations.coc}
          cellClass={activeStyle.metricCell}
        />
        <ScoreBreakdownTile
          label="Cap rate"
          value={breakdown.capRateScore}
          max={20}
          explanation={breakdownExplanations.capRate}
          cellClass={activeStyle.metricCell}
        />
        <ScoreBreakdownTile
          label="DSCR"
          value={breakdown.dscrScore}
          max={20}
          explanation={breakdownExplanations.dscr}
          cellClass={activeStyle.metricCell}
        />
        <ScoreBreakdownTile
          label="Risk penalty"
          value={breakdown.riskPenalty}
          max={0}
          explanation={breakdownExplanations.risk}
          cellClass={activeStyle.metricCell}
          spanFull
        />
      </div>
      <p className={cn("text-xs leading-relaxed", activeStyle.descriptionText)}>{explanation}</p>
      {/* Collapsible deep-detail breakdown. Hidden by default so the
          score card stays scannable; click-to-reveal for the analyst
          who wants the receipts behind each number. Native <details>
          keeps it zero-JS and accessible. */}
      <details className="group mt-3">
        <summary className="min-h-11 py-2 -my-1 cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1.5">
          <ChevronRight aria-hidden className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
          Why this score?
        </summary>
        <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground/80">
          <p>
            Score is the sum of cash flow ({breakdown.cashFlowScore}), CoC ({breakdown.cocScore}),
            cap rate ({breakdown.capRateScore}), and DSCR ({breakdown.dscrScore}),
            {breakdown.riskPenalty < 0 ? <> minus a risk penalty of {Math.abs(breakdown.riskPenalty)}</> : null}
            {" "}={" "}
            <span className="font-bold text-foreground">{score} / 100</span>.
            {" "}Bands: <strong>80+</strong> Strong Buy, <strong>60–79</strong> Buy,
            {" "}<strong>40–59</strong> Neutral, <strong>20–39</strong> Risky,
            {" "}<strong>&lt;20</strong> Avoid.
          </p>
          <p className="mt-2 text-muted-foreground">
            Looking to improve the score? The largest movers are typically (1) a lower
            purchase price (lifts cap rate and CoC together), (2) better financing terms
            (lifts DSCR + monthly cash flow), or (3) reducing CapEx/maintenance assumptions
            for a younger building.
          </p>
        </div>
      </details>
    </div>
  );
}

function ScoreBreakdownTile({
  label,
  value,
  max,
  explanation,
  cellClass,
  spanFull,
}: {
  label: string;
  value: number;
  max: number;
  explanation: string;
  cellClass: string;
  spanFull?: boolean;
}) {
  const valueDisplay = max > 0 ? `${value} / ${max}` : value > 0 ? `+${value}` : `${value}`;
  return (
    <div className={cn("rounded-lg p-2", cellClass, spanFull && "col-span-2")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-foreground/80">{valueDisplay}</span>
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{explanation}</p>
    </div>
  );
}

type ProPreviewKind = "projections" | "tax-strategy" | "exit-scenarios" | "strategies";

const proPreviewCopy: Record<ProPreviewKind, { title: string; description: string; metrics: string[] }> = {
  projections: {
    title: "10-Year Projections",
    description: "Unlock long-term cash flow, after-tax projections, and income trends.",
    metrics: ["Year 10 Cumulative CF", "Best Annual After-Tax CF", "10-Year After-Tax Cash Flow"],
  },
  "tax-strategy": {
    title: "Tax Strategy",
    description: "Unlock taxable income trends, depreciation, mortgage interest, and tax savings.",
    metrics: ["Year 1 Taxable Income", "Year 1 Tax Savings", "10-Year Tax Benefit"],
  },
  "exit-scenarios": {
    title: "Exit Scenarios",
    description: "Unlock equity growth, sale timing, profit breakdowns, and ROI scenarios.",
    metrics: ["Best Year to Sell", "Year 5 Profit", "Total ROI"],
  },
  strategies: {
    title: "Strategies",
    description: "Unlock the BRRRR analyzer, fix-and-flip math, and the rehab cost estimator.",
    metrics: ["Cash left in deal", "Post-refi cash flow", "Flip annualized ROI"],
  },
};

function ProFeaturePreview({
  kind,
  onUpgrade,
  result,
}: {
  kind: ProPreviewKind;
  onUpgrade: () => void;
  /**
   * The user's actual computed analysis. Optional so the component
   * still renders cleanly in any context that doesn't have a result
   * yet (defensive — should always be passed from the dashboard).
   * When present, the 3 metric tiles render with the user's REAL
   * deal numbers rather than the generic $48,260 placeholder that
   * made the gate feel like a generic ad. Personalizing these
   * numbers turns the preview into a "here's exactly what YOUR deal
   * would show" CTA — much higher converting.
   *
   * Accepts null because the call sites pass the page-level
   * `analysisResult` state which is `AnalysisResult | null` before
   * the first Calculate click.
   */
  result?: AnalysisResult | null;
}) {
  const copy = proPreviewCopy[kind];
  const bars = [18, 28, 42, 55, 70, 88, 104, 122, 142, 164];

  /**
   * Per-kind derivation of the 3 metric tile values from the user's
   * actual analysis. Conservative back-of-envelope numbers — meant to
   * give a credible peek at "this is the rough magnitude you'd see in
   * the Pro panel," not a precise forecast. Cash-purchase + edge
   * cases fall through to the generic placeholder so we never show
   * misleading numbers (e.g. negative cash flow rendered as a
   * "positive metric").
   */
  const fmtMoney = (n: number) => {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  };
  const previewValues = (() => {
    if (!result) return null;
    const annualCashFlow = result.netCashFlow * 12;
    const annualDeprecSavings = result.annualDepreciation * result.effectiveTaxRate;
    if (kind === "projections") {
      // 10yr cumulative cash flow (rough — ignores rent growth, OK for preview),
      // year-10 equity bump from amort/appreciation (rough 30% blend),
      // total ROI estimate.
      const tenYrCashFlow = annualCashFlow * 10;
      const tenYrEquity = result.monthlyRentalIncome * 12 * 3; // crude proxy
      return [fmtMoney(tenYrCashFlow), fmtMoney(tenYrEquity), `${Math.max(0, Math.round((tenYrCashFlow / Math.max(1, result.monthlyRentalIncome * 12)) * 10))}%`];
    }
    if (kind === "tax-strategy") {
      const tenYrSavings = annualDeprecSavings * 10;
      return [fmtMoney(annualDeprecSavings), fmtMoney(tenYrSavings), `${Math.round(result.effectiveTaxRate * 100)}%`];
    }
    if (kind === "exit-scenarios") {
      const year10Equity = result.monthlyRentalIncome * 12 * 4; // proxy
      const proceeds = year10Equity * 0.94; // crude after-cost
      return ["Year 10", fmtMoney(year10Equity), fmtMoney(proceeds)];
    }
    // strategies (BRRRR / flip): cash left in deal proxy, post-refi cash flow, ROI proxy
    const cashLeft = Math.max(0, result.monthlyRentalIncome * 6);
    const postRefi = result.netCashFlow * 1.2;
    return [fmtMoney(cashLeft), fmtMoney(postRefi), `${Math.max(8, Math.round(Math.abs(result.cocReturn) + 2))}%`];
  })();

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none space-y-5 blur-[3px] opacity-70">
        <div className="grid gap-3 md:grid-cols-3">
          {copy.metrics.map((metric, index) => (
            <div key={metric} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {metric}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--metric-positive)]">
                {previewValues
                  ? previewValues[index]
                  : index === 0 && kind === "exit-scenarios"
                    ? "Year 10"
                    : "$48,260"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{copy.title}</p>
              <p className="text-xs text-muted-foreground">Preview snapshot</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-4 text-sm font-semibold text-foreground">
              {kind === "tax-strategy" ? "Annual Tax Savings" : kind === "exit-scenarios" ? "Equity Growth" : "Annual Cash Flow"}
            </p>
            <div className="flex h-56 items-end gap-3 border-t border-border/60 pt-4">
              {bars.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-full rounded-t-lg",
                      kind === "tax-strategy" ? "bg-emerald-600" : "bg-primary"
                    )}
                    style={{ height }}
                  />
                  <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-4 text-sm font-semibold text-foreground">
              {kind === "tax-strategy" ? "Taxable Rental Income Trend" : kind === "exit-scenarios" ? "Property Value vs Loan Balance" : "Income vs Expenses"}
            </p>
            <div className="relative h-56 border-t border-border/60">
              <svg viewBox="0 0 420 220" className="h-full w-full">
                <path d="M20 165 C110 155 190 145 400 105" fill="none" stroke="var(--metric-positive)" strokeWidth="4" />
                <path d="M20 185 C120 180 240 176 400 162" fill="none" stroke="rgb(219 39 119)" strokeWidth="4" />
                <path d="M20 55 H400 M20 110 H400 M20 165 H400" stroke="hsl(var(--border))" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-background/55 p-4 backdrop-blur-[1px]">
        <div className="max-w-sm rounded-2xl border border-primary/20 bg-card p-5 text-center shadow-lg">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <h3 className="text-lg font-extrabold text-foreground">{copy.title} is a Pro feature</h3>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
          <Button className="mt-4 rounded-full font-semibold" onClick={onUpgrade}>
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Cash flow over time strip.
 *
 * Solves a real product gap: the headline NCF only shows month-1 cash
 * flow. But rent grows ~3%/yr and expenses ~2%/yr — so a deal that
 * cash-flows $749/mo today might be $1,420/mo by year 5 and $2,100/mo
 * by year 10. Most investors think in 10-year terms, not month 1, and
 * burying that progression inside the Pro 10-Year Projections tab
 * meant free-tier users never saw it.
 *
 * Renders three pillars (Y1 / Y5 / Y10) using monthly NCF derived
 * from result.tenYearProjection (which calculateAnalysis already
 * computes for free). No entitlement gate — this is a free-tier
 * teaser that also serves as a natural upgrade hook ("see the full
 * 10-year breakdown" in the Pro Projections tab).
 *
 * Edge cases handled:
 * - If projection is missing (calc-analysis fallback), strip self-hides.
 * - If a future-year NCF is negative (expense growth outpaces rent
 *   growth, or cash flow was marginal to begin with), the year value
 *   renders in the destructive tone instead of positive green.
 * - Compact mobile layout: pillars stack with arrows replaced by
 *   small downward chevrons.
 */
function CashFlowOverTimeStrip({ result }: { result: AnalysisResult }) {
  const years = result.tenYearProjection;
  if (!Array.isArray(years) || years.length < 10) return null;

  const yearOne = years[0];
  const yearFive = years[4];
  const yearTen = years[9];
  if (!yearOne || !yearFive || !yearTen) return null;

  // Project monthly figures from the annual projection. The annual value
  // already bakes in rent + expense growth + constant debt service, so
  // dividing by 12 gives a faithful monthly equivalent for that year.
  const points = [
    { label: "Year 1", monthly: Math.round(yearOne.netCashFlowAnnual / 12) },
    { label: "Year 5", monthly: Math.round(yearFive.netCashFlowAnnual / 12) },
    { label: "Year 10", monthly: Math.round(yearTen.netCashFlowAnnual / 12) },
  ];

  const formatMonthly = (value: number): string => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toLocaleString()}`;
  };

  // Growth ratio between Y1 and Y10 — surfaced as a single sentence
  // below the strip so the user immediately gets the "compounding"
  // insight without doing the math themselves.
  const growthMultiplier =
    yearOne.netCashFlowAnnual > 0
      ? yearTen.netCashFlowAnnual / yearOne.netCashFlowAnnual
      : null;
  const growthInsight = (() => {
    if (growthMultiplier == null) return null;
    if (!Number.isFinite(growthMultiplier)) return null;
    if (growthMultiplier >= 1.05) {
      return `Cash flow compounds ~${growthMultiplier.toFixed(1)}× over the hold period as rent grows faster than expenses.`;
    }
    if (growthMultiplier < 0.95 && growthMultiplier > 0) {
      return `Cash flow compresses over the hold period — review your rent/expense growth assumptions.`;
    }
    return null;
  })();

  return (
    <section
      aria-label="Cash flow over time"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Cash flow over time
        </p>
        <p className="text-[10px] font-medium text-muted-foreground hidden sm:block">
          monthly · 10-yr horizon
        </p>
      </div>
      <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-4">
        {points.map((point, index) => {
          const tone =
            point.monthly > 25
              ? "positive"
              : point.monthly < -25
                ? "negative"
                : "neutral";
          const valueColor =
            tone === "positive"
              ? "text-[var(--metric-positive,#16a34a)]"
              : tone === "negative"
                ? "text-[var(--metric-negative,#dc2626)]"
                : "text-foreground";
          return (
            <div
              key={point.label}
              className={cn(
                "relative rounded-xl border border-border bg-background px-3 py-3 sm:px-4 sm:py-4",
                index === 0 ? "border-primary/30 bg-primary/[0.03]" : null
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {point.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-extrabold tabular-nums sm:text-2xl",
                  valueColor
                )}
              >
                {formatMonthly(point.monthly)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                /mo
              </p>
            </div>
          );
        })}
      </div>
      {growthInsight ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {growthInsight}
        </p>
      ) : null}
    </section>
  );
}

// NetCashFlowCard was deleted — its monthly/annual/after-tax readouts
// are now surfaced upstairs in the OVERVIEW section (4 metric tiles +
// 3-up secondary chip row). Having a giant 4xl/5xl hero of the same
// number inside the Cash Flow tab was duplication. See the OVERVIEW
// grid in AnalysisDashboard for the canonical surface.

function CashFlowTab({
  result,
  isLoading,
  values,
  isPro,
}: {
  result: AnalysisResult | null;
  isLoading: boolean;
  values: InvestmentFormValues | null;
  isPro: boolean;
}) {
  // Default OPEN — users explicitly said they "love all the information"
  // and don't want it hidden. But the line-item 3-column grid duplicates
  // what the waterfall above already visualizes, so we let users
  // collapse it for a calmer view if they want. Acts as escape valve,
  // not a default-hide.
  const [showBreakdown, setShowBreakdown] = useState(true);

  if (isLoading) {
    // Skeleton matches what actually renders: time strip (short, wide),
    // waterfall (medium height), then a thin toggle row. Used to be a
    // 3-column line-item stub that didn't resemble the real content at
    // all, which made the loading state feel like a glitch.
    return (
      <div className="space-y-5 sm:space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl sm:h-24" />
        <Skeleton className="h-40 w-full rounded-2xl sm:h-48" />
        <Skeleton className="h-6 w-40" />
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
    <div className="space-y-5 sm:space-y-6">
      {/* NetCashFlowCard (big 4xl/5xl monthly/annual/after-tax hero)
          was removed from this tab. Monthly + Annual + After-tax are
          all surfaced upstairs in the OVERVIEW section (the 4 metric
          tiles + the 3-up secondary chip row), so this duplicated the
          same numbers in a larger format. The Cash Flow tab now leads
          with the time strip (which is unique to this view), giving
          the user something new to look at instead of re-stating the
          headline they just read. */}
      {/* Cash flow over time — Y1/Y5/Y10 monthly NCF strip. */}
      <CashFlowOverTimeStrip result={result} />
      {/* Where the rent goes — single-glance waterfall. Sits below
          the time strip and above the optional 3-col breakdown so
          the reading order is: how it grows → where it goes → line
          items (collapsible). */}
      <CashFlowWaterfall result={result} />
      {/* Collapsible line-item breakdown — Monthly Income, Operating
          Expenses, Debt Service / Total Cash Required. The waterfall
          above visualizes the same dollar flows; this 3-column grid
          gives the exact line items for users who want them. Default
          open; clickable header toggles. */}
      <div>
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          aria-expanded={showBreakdown}
          className="group flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-muted/50"
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {showBreakdown ? "Full breakdown" : "Show full breakdown"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showBreakdown ? "rotate-180" : "rotate-0"
            )}
            aria-hidden
          />
        </button>
      </div>
      {showBreakdown && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
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
            <span className="text-muted-foreground">Loan Payment (P&amp;I)</span>
            <span className="font-medium text-foreground">
              ${result.monthlyPayment.toLocaleString()}
            </span>
          </div>
          {/* Removed three blocks that were creating noise:
              (1) "Monthly Cost Breakdown" dashed-border inner panel —
                  re-stated P&I + tax/insurance/HOA monthly amounts that
                  are already itemized in the Operating Expenses column.
              (2) A leaked developer-debug paragraph that read like a
                  code comment ("the current engine uses monthlyPayment
                  for principal and interest only…") — internal context,
                  not end-user content.
              (3) A second Net Cash Flow line at the bottom of this
                  column. NCF is already the headline at the very top of
                  the Cash Flow tab (NetCashFlowCard). Showing it again
                  here just creates visual duplication. */}
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
            <p className="text-xl font-extrabold text-primary-foreground">
              ${result.totalCashRequired.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      </div>
      )}
      {/* Loan amortization — collapsible year-by-year view. Free
          feature, opt-in (click-to-expand). Self-hides on cash
          purchases since there's no debt to amortize. */}
      <LoanAmortizationView result={result} />
      {/* Compare financing scenarios — Pro feature. Self-hides on
          cash purchases. Click-to-open keeps default surface clean. */}
      <MortgageScenarioCompare result={result} values={values} isPro={isPro} />
    </div>
  );
}
