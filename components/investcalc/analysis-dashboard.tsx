"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  TrendingUp,
  CheckCircle2,
  MinusCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
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
import { TenYearProjectionsPanel } from "@/components/investcalc/ten-year-projections/panel";
import { TaxStrategyPanel } from "@/components/investcalc/tax-strategy/panel";
import { ExitScenariosPanel } from "@/components/investcalc/exit-scenarios/panel";
import { MaxOfferCard } from "@/components/investcalc/max-offer-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import { ProInlineGate } from "@/components/investcalc/pro-inline-gate";
import { Activity, Target } from "lucide-react";
import { MomentOfValueUpsell } from "@/components/marketing/moment-of-value-upsell";
import { SignupPromptCard } from "@/components/marketing/signup-prompt-card";
import { CashFlowWaterfall } from "@/components/investcalc/cash-flow-waterfall";
import { MortgageScenarioCompare } from "@/components/investcalc/mortgage-scenario-compare";
// ShareLinkButton import temporarily removed — Share button was pulled from
// the Quick Actions row because it wrapped onto a second line. Component
// + share-link.ts + /d/[encoded] route all remain in the codebase ready
// for re-introduction in a less prominent UI spot.
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import type { GLOSSARY } from "@/lib/glossary";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

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

export type AnalysisDashboardTab = "cash-flow" | "projections" | "tax-strategy" | "exit-scenarios" | "strategies";
type RecommendationVariant = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";

const TABS: { id: AnalysisDashboardTab; label: string; mobileLabel: string; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", mobileLabel: "Cash Flow", isPro: false },
  { id: "projections", label: "10-Year Projections", mobileLabel: "10-Year", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", mobileLabel: "Tax", isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", mobileLabel: "Exit", isPro: true },
  { id: "strategies", label: "Strategies", mobileLabel: "Strategy", isPro: true },
];

/**
 * Inline market-context labels surfaced under each metric tile.
 *
 * Phase 1: hard-coded national-average bands. The thresholds match
 * the scoring engine's thresholds in lib/deal-score.ts so the metric
 * subline and the score subline tell the same story.
 *
 * Phase 2 (when we add per-market data): switch these to lookups
 * against lib/market-benchmarks by state/MSA so the subline reads
 * "Philadelphia median: 6.1%" instead of a national band.
 */
function capRateBenchmarkLabel(capRatePct: number): string {
  if (capRatePct > 8) return "Above 8% — top quartile";
  if (capRatePct > 5) return "5–8% — fair for market";
  return "Below 5% — appreciation-dependent";
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
        <span className="text-xs text-muted-foreground">{sub}</span>
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
      {/* Action bar */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 rounded-xl   px-3 py-2 xl:border-0 xl:bg-transparent xl:px-0 xl:py-0">
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
          <div className="relative rounded-2xl border border-border p-2 pt-3 shadow-sm xl:min-w-[560px] max-[380px]:p-1.5 max-[380px]:pt-3">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Quick actions
            </span>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-[380px]:gap-1">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <MetricCard
          label="Monthly Cash Flow"
          glossaryTerm="cashFlow"
          value={result ? (result.netCashFlow >= 0 ? fmt(result.netCashFlow) : `-${fmt(result.netCashFlow)}`) : "—"}
          sub={result ? cashFlowBenchmarkLabel(result.netCashFlow) : undefined}
          color={result ? (result.netCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="CoC Return"
          glossaryTerm="coc"
          value={result ? `${result.cocReturn >= 0 ? "+" : ""}${result.cocReturn.toFixed(1)}%` : "—"}
          sub={result ? cocBenchmarkLabel(result.cocReturn) : undefined}
          color={result ? (result.cocReturn >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="Cap Rate"
          glossaryTerm="capRate"
          value={result ? `+${result.capRate.toFixed(1)}%` : "—"}
          sub={result ? capRateBenchmarkLabel(result.capRate) : undefined}
          color="text-[var(--metric-positive)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="DSCR"
          glossaryTerm="dscr"
          // Cash purchases have no debt service, so DSCR is undefined. We
          // surface "—" + a clear sub-label rather than a misleading 0.00 /
          // "Underwater" badge.
          value={
            result
              ? result.monthlyPayment <= 0
                ? "—"
                : result.dscr.toFixed(2)
              : "—"
          }
          sub={
            result
              ? result.monthlyPayment <= 0
                ? "Cash purchase"
                : result.dscr >= 1.25
                ? "Bankable (≥1.25)"
                : result.dscr >= 1.0
                ? "Tight (≥1.0)"
                : "Underwater"
              : undefined
          }
          color={
            result
              ? result.monthlyPayment <= 0
                ? undefined
                : result.dscr >= 1.25
                ? "text-[var(--metric-positive)]"
                : "text-[var(--metric-negative)]"
              : undefined
          }
          isLoading={isLoading}
        />
        <MetricCard
          label="Estimated Tax Savings"
          glossaryTerm="taxSavings"
          value={result ? fmt(result.taxSavingsMonthly) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
        <MetricCard
          label="After-Tax CF"
          glossaryTerm="afterTaxCF"
          value={result ? fmt(result.afterTaxCF) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
      </div>

      {/* Anonymous signup prompt — fires AFTER a free analysis for
          unauthenticated users. Soft conversion ask ("save this for
          later") with Google one-tap. Sits above the Pro upsell
          because signup is the cheaper conversion — users who won't
          commit to Pro today will often sign up to save their work,
          which makes the Pro pitch possible later. */}
      {result && !isLoading && !isAuthenticated && (
        <SignupPromptCard
          address={values?.address}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Moment-of-value Pro upsell — fires for free users only, using this
          specific deal's numbers so the pitch is relevant, not generic. */}
      {result && !isLoading && !canUseProjections && (
        <MomentOfValueUpsell
          netCashFlow={result.netCashFlow}
          capRate={result.capRate}
          cocReturn={result.cocReturn}
          estimatedAnnualTaxSavings={Math.round((result.taxSavingsMonthly ?? 0) * 12)}
          isPaid={canUseProjections}
        />
      )}

      {/* Max Allowable Offer — Pro feature. Free users see a teaser that
          routes them to /pricing; paid users get the actual solver. */}
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

      {/* Sensitivity grid — Pro feature. Free users see a teaser. */}
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
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.isPro && !tabEntitlements[tab.id] && (
                <span className="hidden sm:inline-flex text-[9px] sm:text-[10px] font-bold bg-[var(--brand-orange)] text-white px-1 sm:px-1.5 py-0.5 rounded-full uppercase">
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
            <ProFeaturePreview kind="projections" onUpgrade={goToBilling} />
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
            <ProFeaturePreview kind="tax-strategy" onUpgrade={goToBilling} />
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
            <ProFeaturePreview kind="exit-scenarios" onUpgrade={goToBilling} />
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
            <ProFeaturePreview kind="strategies" onUpgrade={goToBilling} />
          )}
          {activeTab === "strategies" && canUseStrategies && (
            <StrategiesPanel values={values} result={result} />
          )}
          {activeTab !== "cash-flow" && activeTab !== "projections" && activeTab !== "tax-strategy" && activeTab !== "exit-scenarios" && activeTab !== "strategies" && (
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
              <p className="text-4xl leading-none font-black text-primary">32</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1 rounded-xl border border-primary/30 bg-primary text-primary-foreground text-sm font-bold">
                Buy
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-700 text-xs font-semibold">
                High Risk
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">Cash Flow Score: 25</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">CoC Score: 8</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">Cap Rate Score: 10</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">DSCR Score: 10</div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 col-span-2">
              Risk Penalty: -13
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
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1.5">
          <span className="transition-transform group-open:rotate-90" aria-hidden>▸</span>
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
}: {
  kind: ProPreviewKind;
  onUpgrade: () => void;
}) {
  const copy = proPreviewCopy[kind];
  const bars = [18, 28, 42, 55, 70, 88, 104, 122, 142, 164];

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none space-y-5 blur-[3px] opacity-70">
        <div className="grid gap-3 md:grid-cols-3">
          {copy.metrics.map((metric, index) => (
            <div key={metric} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {metric}
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--metric-positive)]">
                {index === 0 && kind === "exit-scenarios" ? "Year 10" : "$48,260"}
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
          <h3 className="text-lg font-black text-foreground">{copy.title} is a Pro feature</h3>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
          <Button className="mt-4 rounded-full font-semibold" onClick={onUpgrade}>
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-6 sm:space-y-8">
      {/* Where the rent goes — single-glance waterfall. Sits above
          the detailed 3-column breakdown so users see the SHAPE of
          the deal before they read the line items. */}
      <CashFlowWaterfall result={result} />
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
      {/* Compare financing scenarios — Pro feature. Self-hides on
          cash purchases. Click-to-open keeps default surface clean. */}
      <MortgageScenarioCompare result={result} values={values} isPro={isPro} />
    </div>
  );
}
