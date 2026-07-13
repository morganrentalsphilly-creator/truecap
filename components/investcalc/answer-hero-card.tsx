"use client";

/**
 * Answer hero card — the ONE card that leads the results: the
 * plain-English Recommendation (verdict word + description + "Why this
 * verdict?" + tips) composed with the Deal Score ring + subscore
 * breakdown, with the NextActionBanner as its footer CTA.
 *
 * EXTRACTED (Phase 2 of the calculator redesign) from
 * analysis-dashboard.tsx with minimal adaptation:
 *   - The Recommendation card JSX, DealScoreCard, ScoreBreakdownTile and
 *     buildRecommendationModel moved here verbatim (the investor-lens
 *     toggle moved OUT of the Deal Score card into the metrics band).
 *   - NextActionBanner renders as the hero footer instead of a separate
 *     block below the verdict row (content verbatim).
 *   - Blueprint grafts: Save + unsaved-changes dot in the hero corner
 *     (surfaces the SAME handler the toolbar uses — no duplicated save
 *     logic; the toolbar keeps its Save too), a cash-flow benchmark
 *     sublabel under the score, and a buy-box fit chip fed by the
 *     existing BuyBoxVerdictCard onFitChange report-up.
 *
 * Props-only contract: no fetching, no owned state — the two-stage Deal
 * Score load, the buy-box fit, and the tips fold state all arrive as
 * props from analysis-dashboard.tsx. When a strategy play leads the
 * output (strategyLeadsOutput), the dashboard swaps this hero for
 * StrategyOutcomeCard at the top level — this component never renders
 * in that branch.
 */

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MinusCircle,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { NextAction } from "@/lib/next-action";
import type { DealScoreActionResult } from "@/app/actions/deal-score";
import {
  COMPONENT_MAXES,
  getCashFlowComponentMax,
  getScoreBreakdownSum,
  isAppreciationFloorApplied,
  recommendationLabel,
} from "@/lib/deal-score";
import { buildDealTips } from "@/lib/deal-tips";
import { NextActionBanner } from "@/components/investcalc/next-action-banner";
import { cashFlowSubLabel } from "./metrics-band";

type RecommendationVariant = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";

function variantForRecommendation(recommendation: string): RecommendationVariant {
  return recommendation === "Strong Buy"
    ? "strong-buy"
    : recommendation === "Buy"
      ? "buy"
      : recommendation === "Neutral"
        ? "neutral"
        : recommendation === "Risky"
          ? "risky"
          : "avoid";
}

/** Per-variant chrome shared by the Deal Score card and the score-breakdown
 *  receipts (which render inside the Recommendation card's single "Why this
 *  verdict?" door — Choose-TrueCap Phase B, finding 4). Module-scope so the
 *  two surfaces can never drift. */
const RECOMMENDATION_STYLES: Record<
  RecommendationVariant,
  {
    scoreRing: string;
    scoreText: string;
    riskChip: string;
    metricCell: string;
    descriptionText: string;
  }
> = {
  "strong-buy": {
    scoreRing: "ring-[var(--brand-green)]/40 bg-[var(--brand-green-light)]",
    scoreText: "text-[var(--brand-green)]",
    riskChip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    metricCell: "bg-emerald-50 border border-emerald-100",
    descriptionText: "text-emerald-800",
  },
  buy: {
    scoreRing: "ring-primary/35 bg-[var(--brand-blue-light)]",
    scoreText: "text-primary",
    riskChip: "bg-blue-100 text-blue-700 border-blue-200",
    metricCell: "bg-blue-50 border border-blue-100",
    descriptionText: "text-blue-800",
  },
  neutral: {
    scoreRing: "ring-amber-300/50 bg-amber-50",
    scoreText: "text-amber-700",
    riskChip: "bg-amber-100 text-amber-700 border-amber-200",
    metricCell: "bg-amber-50 border border-amber-100",
    descriptionText: "text-amber-800",
  },
  risky: {
    scoreRing: "ring-orange-300/50 bg-orange-50",
    scoreText: "text-orange-700",
    riskChip: "bg-orange-100 text-orange-700 border-orange-200",
    metricCell: "bg-orange-50 border border-orange-100",
    descriptionText: "text-orange-800",
  },
  avoid: {
    scoreRing: "ring-red-300/50 bg-red-50",
    scoreText: "text-red-700",
    riskChip: "bg-red-100 text-red-700 border-red-200",
    metricCell: "bg-red-50 border border-red-100",
    descriptionText: "text-red-800",
  },
};

function buildRecommendationModel(
  dealScoreResult: DealScoreActionResult | null,
  /** Deal-specific tips from buildDealTips (this deal's weakest subscores).
   *  Null = breakdown unavailable OR nothing weak — fall back to the canned
   *  per-recommendation list below. */
  dealTips: string[] | null
): {
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

  // The `tips` below are the generic FALLBACK list per label — used only
  // when buildDealTips has no breakdown to work from (score not loaded) or
  // nothing weak enough to call out (strong deal → no alarmist tips).
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

  const model = modelByRecommendation[recommendation];
  return {
    label: recommendation,
    ...model,
    // This deal's weakest-subscore tips lead; the canned list is the fallback.
    tips: dealTips ?? model.tips,
  };
}

function DealScoreCard({
  isAnalysisLoading,
  isDealScoreLoading,
  dealScoreResult,
  isAppreciationPlay,
  benchmarkSublabel,
}: {
  isAnalysisLoading: boolean;
  isDealScoreLoading: boolean;
  /** Canonical Balanced score from the parent - the same number the dashboard,
   *  My Deals, compare, PDF, and share surfaces show. Lens-free, so this card and
   *  the Recommendation card beside it always agree with every other surface. */
  dealScoreResult: DealScoreActionResult | null;
  /** True when the deal scores as an appreciation play (strong projected
   *  long-term return + non-negative after-tax cash flow). Surfaces a chip on
   *  the score so a Neutral verdict on a red year-1 deal is self-explanatory at
   *  a glance - the same signal that drives the Overview reframe banner. */
  isAppreciationPlay?: boolean;
  /** Plain-English cash-flow benchmark line rendered directly under the
   *  score (Phase 2 graft) - built from the SAME label the Monthly Cash
   *  Flow tile uses, so the two can never disagree. */
  benchmarkSublabel?: string | null;
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

  // dealScoreResult is the canonical Balanced score from the parent (lens-free),
  // so this card, the Recommendation card beside it, and every other surface
  // (dashboard, My Deals, compare, PDF, share) always agree.
  const { score, riskLevel, recommendation } = dealScoreResult.data;
  const activeStyle = RECOMMENDATION_STYLES[variantForRecommendation(recommendation)];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Deal Score
      </p>
      {/* The investor-lens toggle previously lived here; it moved into the
          metrics band header (Phase 2) so the lens sits beside the metric
          tiles it re-curates. */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className={cn(
            "w-20 h-20 rounded-2xl ring-2 flex flex-col items-center justify-center shadow-sm",
            activeStyle.scoreRing
          )}
        >
          <p className={cn("font-mono text-4xl leading-none font-extrabold tabular-nums", activeStyle.scoreText)}>{score}</p>
        </div>
        {/* The verdict WORD lives once, as the Recommendation card's headline
            (they always agree - both come from the canonical Balanced score).
            This card owns the NUMBER; only the risk chip + appreciation cue
            stay here, so a phone user never reconciles two identical labels. */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full border text-xs font-semibold",
              activeStyle.riskChip
            )}
          >
            {riskLevel}
          </span>
          {isAppreciationPlay ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-green)]">
              <TrendingUp aria-hidden className="size-3" />
              Appreciation play
            </span>
          ) : null}
        </div>
      </div>
      {/* Benchmark sublabel - the deal's cash flow against the same bands
          the Monthly Cash Flow tile uses, directly under the score so the
          0-100 number gets a plain-English yardstick. */}
      {benchmarkSublabel ? (
        <p className="-mt-1 mb-2 text-[11px] leading-snug text-muted-foreground">
          {benchmarkSublabel}
        </p>
      ) : null}
      {/* ONE "Why" door (Choose-TrueCap Phase B, finding 4): this card's
          "Why this score?" disclosure merged into the Recommendation card's
          "Why this verdict?" <details> — the subscore breakdown renders
          there (ScoreBreakdownReceipts), stacked under the narrative, so
          the answer hero has a single adjacent Why affordance. */}
    </div>
  );
}

/**
 * Score-breakdown receipts — the per-subscore tiles + the "how the number
 * adds up" box that used to live behind the Deal Score card's own
 * "Why this score?" disclosure. Now rendered inside the Recommendation
 * card's single "Why this verdict?" door (narrative first, receipts second).
 * Content verbatim; renders null unless a pro-tier score is loaded.
 */
function ScoreBreakdownReceipts({
  dealScoreResult,
  propertyType,
  isCashPurchase,
}: {
  dealScoreResult: DealScoreActionResult | null;
  /** Property type - the cash-flow tier max + label branch for
   *  owner-occupant deals (different bands). */
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  /** True if the deal has no debt service (100% down). Used to
   *  relabel the DSCR breakdown tile, which otherwise reads
   *  "Above 1.25" - confusing alongside the MetricCard's "Cash purchase". */
  isCashPurchase?: boolean;
}) {
  if (!dealScoreResult?.ok || dealScoreResult.tier !== "pro") return null;
  const { score, recommendation, breakdown } = dealScoreResult.data;
  // Owner-occupant deals use different cash-flow bands and a 30-point
  // max (vs investor 25). Branch the explanation labels accordingly so
  // the breakdown matches the engine's actual scoring tiers.
  const isOwnerOccupant = propertyType === "owner-occupant";
  // Appreciation-play floor: when the engine held the score up, the factor
  // arithmetic below does NOT sum to the headline — detect it so the
  // receipts paragraph can reconcile explicitly.
  const floorApplied = isAppreciationFloorApplied(breakdown, score);
  const componentSum = getScoreBreakdownSum(breakdown);
  // Plain-English subline for each subscore - turns "Cash Flow Score: 25"
  // into "Cash Flow: 25/25 - Above $1,000/mo target". Computed from the
  // subscore value + property context alone (the engine's thresholds
  // are encoded here as labels). Pure display - does not touch the
  // scoring engine.
  const breakdownExplanations = {
    cashFlow: isOwnerOccupant
      ? breakdown.cashFlowScore >= 30
        ? "Above $300/mo - strong for house-hack"
        : breakdown.cashFlowScore >= 25
          ? "Within $300/mo of break-even - typical for house-hack"
          : "Owner cost meaningfully above break-even"
      : breakdown.cashFlowScore >= 18
        ? "Above $500/mo - strong"
        : breakdown.cashFlowScore >= 8
          ? "Positive but modest ($0–$500/mo)"
          : "Negative - relies on appreciation + tax to pay off",
    coc:
      breakdown.cocScore >= 17
        ? "Above 7% - strong"
        : breakdown.cocScore >= 13
          ? "5–7% - healthy"
          : breakdown.cocScore >= 8
            ? "3–5% - modest"
            : "Below 3% - weak",
    capRate:
      breakdown.capRateScore >= 13
        ? "Above 6.5% - strong"
        : breakdown.capRateScore >= 9
          ? "5–6.5% - fair for the market"
          : "Below 5% - returns rely on price growth",
    dscr: isCashPurchase
      ? "N/A - all-cash purchase (no debt to cover)"
      : breakdown.dscrScore >= 13
        ? "Above 1.20 - clears lender threshold"
        : breakdown.dscrScore >= 7
          ? "1.10–1.20 - thin coverage cushion"
          : breakdown.dscrScore >= 3
            ? "1.00–1.10 - very tight"
            : "Below 1.00 - does not cover debt",
    totalReturn:
      breakdown.totalReturnScore >= 20
        ? "Above 11%/yr projected - strong long-term wealth build"
        : breakdown.totalReturnScore >= 14
          ? "8–11%/yr projected - solid total return"
          : breakdown.totalReturnScore >= 8
            ? "5–8%/yr projected - modest total return"
            : "Below 5%/yr projected - limited long-term upside",
    risk:
      breakdown.riskPenalty === 0
        ? "No penalty - risk profile is clean"
        : breakdown.riskPenalty > -10
          ? "Mild penalty for elevated risk factors"
          : breakdown.riskPenalty > -20
            ? "Moderate penalty - review CapEx, age, vacancy"
            : "Heavy penalty - multiple risk factors stacking",
  } as const;
  const metricCell = RECOMMENDATION_STYLES[variantForRecommendation(recommendation)].metricCell;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <ScoreBreakdownTile
          label="Cash flow"
          value={breakdown.cashFlowScore}
          max={getCashFlowComponentMax(propertyType)}
          explanation={breakdownExplanations.cashFlow}
          cellClass={metricCell}
        />
        <ScoreBreakdownTile
          label="Cash-on-cash"
          value={breakdown.cocScore}
          max={COMPONENT_MAXES.coc}
          explanation={breakdownExplanations.coc}
          cellClass={metricCell}
        />
        <ScoreBreakdownTile
          label="Cap rate"
          value={breakdown.capRateScore}
          max={COMPONENT_MAXES.capRate}
          explanation={breakdownExplanations.capRate}
          cellClass={metricCell}
        />
        <ScoreBreakdownTile
          label="DSCR"
          value={breakdown.dscrScore}
          max={COMPONENT_MAXES.dscr}
          explanation={breakdownExplanations.dscr}
          cellClass={metricCell}
        />
        <ScoreBreakdownTile
          label="Total return (10-yr)"
          value={breakdown.totalReturnScore}
          max={COMPONENT_MAXES.totalReturn}
          explanation={breakdownExplanations.totalReturn}
          cellClass={metricCell}
          spanFull
        />
        <ScoreBreakdownTile
          label="Risk penalty"
          value={breakdown.riskPenalty}
          max={0}
          explanation={breakdownExplanations.risk}
          cellClass={metricCell}
          spanFull
        />
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground/80">
        <p>
          {floorApplied ? (
            // Appreciation-play floor engaged: the factors do NOT sum to the
            // headline, so reconcile explicitly instead of reciting an
            // equation that doesn't add up.
            <>
              Cash flow ({breakdown.cashFlowScore}), CoC ({breakdown.cocScore}),
              cap rate ({breakdown.capRateScore}), DSCR ({breakdown.dscrScore}), and 10-year total
              return ({breakdown.totalReturnScore})
              {breakdown.riskPenalty < 0 ? <>, minus a risk penalty of {Math.abs(breakdown.riskPenalty)},</> : null}
              {" "}sum to {componentSum} — but this deal is an appreciation play (strong projected
              10-year total return with non-negative after-tax cash flow), so the score is held at{" "}
              <span className="font-bold text-foreground">{score} / 100</span> instead of reading
              as weak fundamentals.
            </>
          ) : (
            <>
              Score is the sum of cash flow ({breakdown.cashFlowScore}), CoC ({breakdown.cocScore}),
              cap rate ({breakdown.capRateScore}), DSCR ({breakdown.dscrScore}), and 10-year total
              return ({breakdown.totalReturnScore}),
              {breakdown.riskPenalty < 0 ? <> minus a risk penalty of {Math.abs(breakdown.riskPenalty)}</> : null}
              {" "}={" "}
              <span className="font-bold text-foreground">{score} / 100</span>.
            </>
          )}
          {" "}Bands: <strong>75+</strong> Strong Buy, <strong>55–74</strong> Buy,
          {" "}<strong>35–54</strong> Neutral, <strong>18–34</strong> Risky,
          {" "}<strong>&lt;18</strong> Avoid.
          {" "}This is the same score on every screen - your investor lens reorders which
          metrics lead, but never changes the number.
        </p>
        <p className="mt-2 text-muted-foreground">
          Looking to improve the score? The largest movers are typically (1) a lower
          purchase price (lifts cap rate and CoC together), (2) better financing terms
          (lifts DSCR + monthly cash flow), or (3) reducing CapEx/maintenance assumptions
          for a younger building.
        </p>
      </div>
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

export function AnswerHeroCard({
  isLoading,
  isLoadingDealScore,
  dealScoreResult,
  result,
  propertyType,
  isAppreciationPlay,
  verdictNarrative,
  nextAction,
  buyBoxFit,
  showAllTips,
  onToggleShowAllTips,
  onSave,
  isSaving,
  isSaveLocked,
  saveLockedHint,
  hasUnsavedChanges,
}: {
  isLoading: boolean;
  /** Two-stage load: the base analysis lands first, the Deal Score action
   *  resolves after — the recommendation side keeps its skeleton until
   *  BOTH are done, exactly as before the extraction. */
  isLoadingDealScore: boolean;
  dealScoreResult: DealScoreActionResult | null;
  result: AnalysisResult | null;
  propertyType: "single-family" | "multi-family" | "owner-occupant";
  isAppreciationPlay: boolean;
  /** Plain-English "why this verdict" sentences (lib/verdict). */
  verdictNarrative: { sentences: string[] } | null;
  /** The single imperative next step; renders as the hero footer. */
  nextAction: NextAction | null;
  /** Buy-box fit reported up by BuyBoxVerdictCard via the existing
   *  onFitChange wiring (null = no active box / not evaluated). */
  buyBoxFit: boolean | null;
  showAllTips: boolean;
  onToggleShowAllTips: () => void;
  /** The SAME save handler the toolbar uses (sign-in redirect included). */
  onSave: () => void;
  isSaving: boolean;
  isSaveLocked: boolean;
  saveLockedHint?: string;
  /** Drives the unsaved-changes dot on the corner Save (mirrors the
   *  identity strip's "Unsaved changes" badge condition). */
  hasUnsavedChanges: boolean;
}) {
  const isCashPurchase = Boolean(result && result.monthlyPayment <= 0);
  // Deal-specific tips from THIS deal's weakest subscores (null when the
  // pro-tier breakdown isn't loaded or nothing is weak enough to call out —
  // buildRecommendationModel then falls back to its canned per-label list).
  const dealTips = buildDealTips({
    breakdown:
      dealScoreResult?.ok && dealScoreResult.tier === "pro"
        ? dealScoreResult.data.breakdown
        : null,
    propertyType,
    isCashPurchase,
    metrics: result
      ? {
          netCashFlow: result.netCashFlow,
          cocReturn: result.cocReturn,
          capRate: result.capRate,
          dscr: result.dscr,
        }
      : undefined,
  });
  // Canonical Balanced verdict - identical to the dashboard, My Deals,
  // compare, PDF, and share surfaces. The lens never changes it.
  const recommendation = buildRecommendationModel(dealScoreResult, dealTips);
  // Pro-tier score loaded → the merged "Why this verdict?" door also stacks
  // the subscore receipts (free tier / anon: narrative only, as before).
  const hasScoreBreakdown = Boolean(
    dealScoreResult?.ok && dealScoreResult.tier === "pro"
  );
  // Cash-flow yardstick under the score - reuses the Monthly Cash Flow
  // tile's exact benchmark label so the two can never disagree.
  const benchmarkSublabel =
    result && !isLoading
      ? `${result.netCashFlow >= 0 ? "+" : "-"}$${Math.abs(Math.round(result.netCashFlow)).toLocaleString()}/mo cash flow · ${cashFlowSubLabel(result)}`
      : null;

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 md:grid-cols-3">
      <DealScoreCard
        isAnalysisLoading={isLoading}
        isDealScoreLoading={isLoadingDealScore}
        dealScoreResult={dealScoreResult}
        isAppreciationPlay={isAppreciationPlay}
        benchmarkSublabel={benchmarkSublabel}
      />

      {/* Recommendation card. Visually FIRST below md (order-first) so the
          first thing a phone user reads after Run is the plain-English
          verdict, not the abstract 0-100 score - the Deal Score card keeps
          its default order 0 and stacks second. md+ keeps DOM order
          (score col 1, recommendation cols 2-3), so desktop is unchanged. */}
      <div
        className={cn(
          "order-first md:order-none md:col-span-2 rounded-2xl border p-4 sm:p-6",
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
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Recommendation
              </p>
              {/* Hero-corner Save - surfaces the toolbar's exact save
                  handler so the primary retention action never buries
                  below the fold on mobile. The dot = unsaved changes. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                disabled={isSaving || isSaveLocked}
                title={saveLockedHint}
                className="relative -mr-2 -mt-1.5 h-8 shrink-0 gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3.5" aria-hidden />
                )}
                Save
                {hasUnsavedChanges && !isSaving ? (
                  <>
                    <span
                      aria-hidden
                      className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-[var(--brand-orange)]"
                    />
                    <span className="sr-only">(unsaved changes)</span>
                  </>
                ) : null}
              </Button>
            </div>
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
                {recommendationLabel(recommendation.label)}
              </h2>
            </div>
            {/* Buy-box fit chip - only when a box evaluated (fed by the
                existing BuyBoxVerdictCard onFitChange report-up); the full
                per-criterion card stays below the hero as before. Visual
                language mirrors BuyBoxFitBadge (My Deals / Compare). */}
            {buyBoxFit !== null ? (
              <div className="-mt-1 mb-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    buyBoxFit
                      ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
                      : "border-amber-300 bg-amber-50 text-amber-700"
                  )}
                >
                  <Target className="size-3" aria-hidden />
                  {buyBoxFit ? "Meets your buy box" : "Misses your buy box"}
                </span>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground mb-4">
              {recommendation.description}
            </p>
            {/* THE one "Why" door (Phase B, finding 4). Progressive
                disclosure: the verdict + one-line description stay the calm
                first read; ONE tap reveals BOTH the plain-English narrative
                (per-deal, free-tier safe) AND the subscore receipts that
                used to hide behind the Deal Score card's separate "Why this
                score?" disclosure — narrative first, breakdown stacked
                below. Native <details>/<summary> keeps the surviving
                disclosure's keyboard + a11y behavior (Enter/Space toggles,
                open state exposed to AT). */}
            {(verdictNarrative && verdictNarrative.sentences.length > 0) ||
            hasScoreBreakdown ? (
              <details className="group mb-4 -mt-1">
                {/* min-h-11 (44px): the score breakdown's ONLY reach path
                    now routes through this door, and the retired "Why this
                    score?" summary deliberately carried the 44px tap-target
                    standard (changelog a11y fix) — carry it forward. */}
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
                  />
                  Why this verdict?
                </summary>
                {verdictNarrative && verdictNarrative.sentences.length > 0 ? (
                  <ul className="mt-1.5 space-y-1.5 pl-1">
                    {verdictNarrative.sentences.map((s, i) => (
                      <li key={i} className="text-sm leading-relaxed text-foreground/80">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {hasScoreBreakdown ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Score breakdown
                    </p>
                    <ScoreBreakdownReceipts
                      dealScoreResult={dealScoreResult}
                      propertyType={propertyType}
                      isCashPurchase={isCashPurchase}
                    />
                  </div>
                ) : null}
              </details>
            ) : null}
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
                    onClick={onToggleShowAllTips}
                    className="mt-2 cursor-pointer text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
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
            Run the analysis to see your results.
          </div>
        )}
      </div>

      {/* Next action - the one imperative step the verdict implies, now the
          hero's footer CTA (content verbatim from the standalone banner).
          BASE-result driven (matches the Deal Score + verdict above). */}
      {nextAction ? (
        <div className="md:col-span-3">
          <NextActionBanner action={nextAction} />
        </div>
      ) : null}
    </div>
  );
}
