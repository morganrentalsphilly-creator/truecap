"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronRight,
  CopyPlus,
  FileDown,
  FileText,
  Info,
  ListTodo,
  Loader2,
  MoreHorizontal,
  NotebookPen,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult } from "@/lib/calc-analysis";
import { setPendingSaveIntent } from "@/lib/save-intent";
import { WhatIfSliders, formatAdjustmentLabel, type WhatIfState } from "@/components/investcalc/what-if-sliders";
import { BreakpointSuggestionCard } from "@/components/investcalc/breakpoint-suggestion-card";
import { StressSurvivabilityCard } from "@/components/investcalc/stress-survivability-card";

// The three Pro snapshot panels each pull in recharts (~90 KB gzipped
// combined). They're tab-gated AND Pro-gated - most homepage visitors
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
import { ResultsRegion, ResultsRegionOrFragment } from "@/components/investcalc/results-region";
import { MakePriceWorkCard } from "@/components/investcalc/make-price-work-card";
import { FocusedDecisionSummary } from "@/components/investcalc/focused-decision-summary";
import { AssumptionImpactCard } from "@/components/investcalc/assumption-impact-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import { ProInlineGate } from "@/components/investcalc/pro-inline-gate";
import { BuyBoxVerdictCard } from "@/components/investcalc/buy-box-verdict-card";
import { nextActionForDeal } from "@/lib/next-action";
import { getVerdictNarrative } from "@/lib/verdict";
import { DealDriverInsight } from "@/components/investcalc/deal-driver-insight";
import { StrategyOutcomeCard } from "@/components/investcalc/strategy-outcome-card";
import type { InvestorStrategy } from "@/lib/investor-strategies";
import { deriveStateFromAddress } from "@/lib/buy-box";
import type { DealQaBuyBoxReport } from "@/lib/deal-qa-context";
import {
  buildMaoTarget,
  buyBoxContributesToMaoTarget,
  describeMaoTarget,
} from "@/lib/mao-targets";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { resolveOfferCeilingAction } from "@/app/actions/offer-ceiling";
import type {
  OfferCeilingAccessPayload,
  OfferCeilingExactResult,
} from "@/lib/offer-ceiling-access-contract";
import {
  normalizeMaoTargetForFinancing,
  reduceMaoTargetState,
} from "@/lib/mao-target-editor";
import { PropertyCompsCard } from "@/components/investcalc/property-comps-card";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { buildCompsRowSummary } from "@/lib/comps-summary";
import type { DataConfidence } from "@/lib/data-confidence";
import { REPORT_MODES, type ReportMode } from "@/lib/pdf-export-constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, Target } from "lucide-react";
import { MomentOfValueUpsell } from "@/components/marketing/moment-of-value-upsell";
import { trackEvent } from "@/lib/analytics";
import { SignupPromptCard } from "@/components/marketing/signup-prompt-card";
import { RateAlertsToggle } from "@/components/settings/rate-alerts-toggle";
import { CashFlowWaterfall } from "@/components/investcalc/cash-flow-waterfall";
import { MortgageScenarioCompare } from "@/components/investcalc/mortgage-scenario-compare";
import { LoanAmortizationView } from "@/components/investcalc/loan-amortization-view";
import { DealNotesPanel } from "@/components/investcalc/deal-notes-panel";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import { AnswerHeroCard } from "@/components/investcalc/answer-hero-card";
import { InputConfidenceCard } from "@/components/investcalc/input-confidence-card";
import { PrepareOfferCard } from "@/components/investcalc/prepare-offer-card";
import type {
  InputConfidenceFieldKey,
  InputConfidenceResult,
} from "@/lib/input-confidence";
import { DrillRow } from "@/components/investcalc/drill-row";
import { DrillLedger } from "@/components/investcalc/drill-ledger";
import {
  MetricsBand,
  buildMetricTiles,
  getSecondaryMetricKeys,
} from "@/components/investcalc/metrics-band";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildProPreviewValues, type ProPreviewKind } from "@/lib/pro-preview-values";

import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import type { ExitScenarioInput, ExitScenarioYear } from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";
import { isExtremeAnnualizedRoi } from "@/lib/extreme-value-format";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import type { UserDecision } from "@/lib/decision-contract";
import { cn, scrollBehavior } from "@/lib/utils";
import type { DealScoreActionResult } from "@/app/actions/deal-score";
import {
  APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT,
  computeTenYearAnnualizedReturnPct,
} from "@/lib/deal-score";

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  /** Current form values - needed by MaxOfferCard to re-solve at varied prices. */
  values?: InvestmentFormValues | null;
  isLoading: boolean;
  dealScoreResult: DealScoreActionResult | null;
  isLoadingDealScore: boolean;
  propertyType: "single-family" | "multi-family" | "owner-occupant";
  /** HUD area rent benchmark for the entered address (single-family). */
  marketRentEstimate?: number | null;
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
  onSaveDeal: (
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource
  ) => void | Promise<void>;
  onCompareDeals: () => void | Promise<void>;
  onExportPdf: (
    mode?: ReportMode,
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource
  ) => void | Promise<void>;
  onNewAnalysis: () => void | Promise<void>;
  /** Phase D "copy a row": clear the property identity + results but keep
   *  every assumption, so the next listing runs with the same numbers.
   *  Free + anon get it too — it's a pure form operation, no entitlement. */
  onAnalyzeAnotherLikeThis: () => void;
  /** Leave focused results mode and reveal the real assumption form. */
  onEditAssumptions: () => void;
  /** Synchronously persist the exact validated snapshot before auth navigation. */
  onPrepareAuthSave: (
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource
  ) => void;
  /** Fill the analyzer form from pulled comps (facts + estimates). */
  onApplyComps?: (enrichment: PropertyEnrichment) => void;
  /** Apply the rehab estimator's total to the deal's cash invested. */
  onApplyRehab?: (total: number) => void;
  /** Live rehabBudget form value, so the estimator's "Applied" state reflects
   *  the current input (not the last-computed snapshot). */
  currentRehabBudget?: number | null;
  isSaving?: boolean;
  isComparing?: boolean;
  isExporting?: boolean;
  isSaved?: boolean;
  isExistingSavedDeal?: boolean;
  /** The persisted deal id, when this is a saved-and-loaded deal.
   *  Used by the Deal Notes panel to fetch + persist notes. */
  savedDealId?: string | null;
  /** Explicit workflow decision restored with a saved deal. Financial output
   * never infers this value. */
  userDecision?: UserDecision;
  isAuthenticated?: boolean;
  canSaveDeals?: boolean;
  canUpdateSavedDeals?: boolean;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
  canUseProjections?: boolean;
  canUseTaxStrategy?: boolean;
  canUseExitScenarios?: boolean;
  /** Pro: max-allowable-offer solver. False = render upsell teaser. */
  canUseMaxOffer?: boolean;
  /** Pro: sensitivity grid. False = render upsell teaser. */
  canUseSensitivity?: boolean;
  /** Pro: Strategies tab. False = tab shown locked with upgrade prompt. */
  canUseStrategies?: boolean;
  /**
   * Sample-deal Pro preview mode: the analysis came from "Try a sample
   * deal" and the can-use flags above were OR'd open by the caller so
   * the visitor sees the full Pro report on the demo numbers. Renders
   * an explainer banner with the upgrade CTA. Save / PDF / share /
   * compare gating is unaffected.
   */
  isSampleProPreview?: boolean;
  saveDealLimitReached?: boolean;
  /** Client-side saved-deal count + plan limit, so the limit-reached notice
   *  can say "N of M" and stay visible without hover (the disabled Save
   *  button's title tooltip never shows on touch devices). Either may be
   *  absent (anon homepage passes neither) — the notice degrades to the
   *  plain label. */
  savedDealCount?: number | null;
  savedDealLimit?: number | null;
  /** Live data-confidence for the current analysis (computed in the analyzer
   *  from enrich-property provenance). Null hides the badge. */
  dataConfidence?: DataConfidence | null;
  /** Deterministic 15-field data-readiness assessment. Separate from Deal Fit. */
  inputConfidence?: InputConfidenceResult | null;
  onToggleInputVerified?: (key: InputConfidenceFieldKey, verified: boolean) => void;
  activeTab?: AnalysisDashboardTab;
  /** Bumped by the caller on every point-at-tab intent, so a SAME-VALUE
   *  re-point (user closed the row, then re-clicked the input tab or
   *  re-ran) still reopens the row — the parent's same-value setState
   *  otherwise bails and the effect never fires. */
  activeTabNonce?: number;
  /** Active investor strategy - drives the strategy-aware results headline. */
  activeStrategy?: InvestorStrategy | null;
  /** Shown when Compare / Export are disabled (e.g. unsaved edits). */
  persistedActionsBlockHint?: string;
  /** Exact criteria carried by a sample or another explicit analysis entry. */
  maoTargetOverride?: MaoTarget | null;
  /** Provenance persisted with an override. Without this, reopening a target
   * captured from a Buy Box would be mislabeled as a manual edit. */
  maoTargetOverrideSource?: OfferCeilingTargetSource | null;
  /** Lifts explicit target edits so Save and Share preserve the same basis. */
  onMaoTargetChange?: (target: MaoTarget) => void;
  /** Recorded solve captured atomically with a saved result. Null means this
   * is a live/current underwrite. A recorded uncaptured row suppresses the
   * current solver rather than mixing methodologies. */
  recordedOfferCeiling?: {
    captured: boolean;
    exact: OfferCeilingExactResult | null;
  } | null;
  /** Private server-derived cohort gate. The public rollout flag alone must
   * never expose the advocacy contract to all users. */
  advocacyContractEligible?: boolean;
}

export type AnalysisDashboardTab =
  | "cash-flow"
  | "projections"
  | "tax-strategy"
  | "exit-scenarios"
  | "strategies"
  | "stress-test";

/**
 * Every ledger row id. The six analysis rows ARE the AnalysisDashboardTab
 * ids (the old tab ids) so every consumer of the tab contract — metric-tap
 * jumps, input-tab clicks, and the strategy primaryTab lead — keeps working
 * unchanged. The rest are the always-visible cards that joined the ledger as
 * rows (comps, notes).
 */
export type AnalysisLedgerRowId =
  | AnalysisDashboardTab
  | "comps"
  | "notes";

// The six analysis rows, in the exact order the tabs had. `icon` is the
// same glyph each mobile tab carried (every row keeps a distinct glyph).
const TABS: { id: AnalysisDashboardTab; label: string; icon: LucideIcon; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", icon: TrendingUp, isPro: false },
  { id: "projections", label: "10-Year Projections", icon: ArrowUpRight, isPro: true },
  { id: "tax-strategy", label: "Illustrative Tax Impact", icon: FileText, isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", icon: Building2, isPro: true },
  // Renamed from "Strategies" (Jun 2026 UX pass) - vague label for the
  // not-Excel-power-user audience; the row IS the BRRRR + fix-and-flip
  // + rehab analyzers, so say that.
  { id: "strategies", label: "BRRRR & Flip", icon: Target, isPro: true },
  // Stress Test consolidates Offer Ceiling + Sensitivity Grid —
  // both Pro features that previously rendered as always-visible cards
  // between the metrics row and the tab bar. Keeping them in one row
  // keeps the headline scroll calmer without losing the features.
  { id: "stress-test", label: "Stress Test", icon: Activity, isPro: true },
];

const ALL_LEDGER_ROW_IDS: AnalysisLedgerRowId[] = [
  ...TABS.map((t) => t.id),
  "comps",
  "notes",
];

/** Every row starts closed except the lead row (the old "active tab"). */
function buildInitialOpenRows(lead: AnalysisDashboardTab): Record<AnalysisLedgerRowId, boolean> {
  const rows = Object.fromEntries(
    ALL_LEDGER_ROW_IDS.map((id) => [id, false])
  ) as Record<AnalysisLedgerRowId, boolean>;
  rows[lead] = true;
  return rows;
}

/**
 * Is this an "appreciation play" - a financed deal whose year-1 cash flow
 * is negative (usually high leverage) but which still pays off after-tax
 * and projects a strong 10-year total return? These deals read as
 * uniformly red in the year-1 Overview even though they're viable holds;
 * the context banner reframes that without faking the year-1 facts.
 */
function isAppreciationPlayDeal(
  r: AnalysisResult,
  propertyType: string,
  annualizedReturnPct: number | null
): boolean {
  return (
    propertyType !== "owner-occupant" &&
    r.monthlyPayment > 0 &&
    r.netCashFlow < 0 &&
    r.afterTaxCF >= 0 &&
    (annualizedReturnPct ?? 0) > APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT
  );
}

function fmtPct(n: number) {
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

export function AnalysisDashboard({
  result,
  values = null,
  isLoading,
  dealScoreResult,
  isLoadingDealScore,
  propertyType,
  marketRentEstimate,
  projectionSource,
  taxStrategySource,
  exitScenarioSource,
  onSaveDeal,
  onCompareDeals,
  onExportPdf,
  onNewAnalysis,
  onAnalyzeAnotherLikeThis,
  onEditAssumptions,
  onPrepareAuthSave,
  onApplyComps,
  onApplyRehab,
  currentRehabBudget,
  isSaving = false,
  isComparing = false,
  isExporting = false,
  isSaved = false,
  isExistingSavedDeal = false,
  savedDealId = null,
  userDecision = "undecided",
  isAuthenticated = false,
  canSaveDeals = false,
  canUpdateSavedDeals = false,
  canCompareDeals = false,
  canExportPdf = false,
  canUseProjections = false,
  canUseTaxStrategy = false,
  canUseExitScenarios = false,
  canUseMaxOffer = false,
  canUseSensitivity = false,
  canUseStrategies = false,
  isSampleProPreview = false,
  saveDealLimitReached = false,
  savedDealCount = null,
  savedDealLimit = null,
  dataConfidence = null,
  inputConfidence = null,
  onToggleInputVerified,
  activeTab: activeTabProp,
  activeTabNonce = 0,
  activeStrategy = null,
  persistedActionsBlockHint,
  maoTargetOverride = null,
  maoTargetOverrideSource = null,
  onMaoTargetChange,
  recordedOfferCeiling = null,
  advocacyContractEligible = false,
}: AnalysisDashboardProps) {
  const showInputConfidence = isFeatureEnabled("input_confidence");
  const showOfferReadyStatus = isFeatureEnabled("offer_ready_status");
  const showDecisionThresholds = isFeatureEnabled("what_needs_to_be_true_v2");
  const showDealDecisionPack = isFeatureEnabled("deal_decision_pack");
  const advocacyDecisionContract =
    advocacyContractEligible && isFeatureEnabled("advocacy_decision_contract");
  // Ledger open state (Phase 5) - replaces the single activeTab. Rows are
  // INDEPENDENT multi-open accordions: opening one never closes a sibling
  // (single-open enforcement was explicitly rejected). The lead row (the
  // old "active tab") starts open so the content the tab bar showed by
  // default - cash flow, or the strategy's primaryTab when a play leads -
  // is still on screen without a tap.
  const [openRows, setOpenRows] = useState<Record<AnalysisLedgerRowId, boolean>>(() =>
    buildInitialOpenRows(activeTabProp ?? "cash-flow")
  );
  const openRow = useCallback((id: AnalysisLedgerRowId) => {
    setOpenRows((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    // The ledger now lives inside the collapsed "Go deeper" region, so opening
    // a row while its ancestor <details> is shut left the user looking at an
    // unchanged page — every deep link into a row (metric taps, the
    // stress-test jump, activeTab handoffs) silently no-oped. Reveal the
    // ancestor at this single funnel that all of them pass through.
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const row = document.getElementById(`analysis-tab-${id}`);
        const region = row?.closest("details");
        if (region && !region.open) region.open = true;
      });
    }
  }, []);
  const setRowOpen = useCallback((id: AnalysisLedgerRowId, open: boolean) => {
    setOpenRows((prev) => (prev[id] === open ? prev : { ...prev, [id]: open }));
    if (open) {
      // Tier-3 engagement: which deep-analysis rows people still open once
      // they are no longer stacked on the decision screen.
      trackEvent("deep_analysis_opened", { row: id });
    }
    if (open && id === "stress-test") {
      trackEvent("stress_test_opened", { placement: "analysis_ledger" });
      trackEvent("downside_viewed", { placement: "analysis_ledger" });
      trackEvent("targets_opened", { placement: "analysis_ledger" });
    }
  }, []);
  // KEPT NAME + SIGNATURE from the tab era so no caller churns:
  // "switch to tab X" is now "open row X and scroll it into view".
  // Consumers: metric-tap jumps (METRIC_JUMP_TARGETS via handleMetricJump)
  // and anything else that points the results at a section. Wholesale owns
  // its target editor inline now, so its Tune action no longer dead-ends on
  // the sensitivity-only Stress Test row.
  const setActiveTab = useCallback(
    (id: AnalysisDashboardTab) => {
      openRow(id);
      requestAnimationFrame(() => {
        document
          // #max-offer-result lived in the pre-rebuild layout; the jump
          // silently no-oped once that branch retired.
          .getElementById(`analysis-tab-${id}`)
          ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      });
    },
    [openRow]
  );
  // When a non-cash-flow strategy is active (Wholesale/BRRRR/Flip), lead the
  // results with that play's real answer instead of the generic buy-box verdict.
  const strategyLeadsOutput = !!activeStrategy && activeStrategy.primaryTab !== "cash-flow";
  // Show only the first 3 recommendation tips by default - beyond that
  // the Recommendation card starts feeling busy. User can expand to see
  // the rest. Resets implicitly when the parent component re-mounts on
  // a new analysis; we don't reset on each recommendation change because
  // most users keep this collapsed anyway.
  const [showAllTips, setShowAllTips] = useState(false);

  // Mobile-only "More" overflow for the action toolbar. Below sm the row
  // keeps the 3 post-analysis actions that matter (Save / PDF / SHARE —
  // the growth loop stays one tap) and folds Compare, New Analysis and
  // the report-style picker in here so the grid never wraps into a
  // ragged second row. Controlled so a menu item can close the popover
  // before firing its action.
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  // Sample-Pro-preview banner dismissal (Phase 2: the banner slimmed to a
  // one-line dismissible strip so it no longer pushes the answer down on
  // the 375px first paint). Resets on remount, matching the old banner.
  const [sampleBannerDismissed, setSampleBannerDismissed] = useState(false);

  // Buy-box fit reported up by BuyBoxVerdictCard (client-side fetch lives
  // there), consumed by the Next Action banner so both speak with one
  // voice. null = no active box / not evaluated.
  const [buyBoxAnyPass, setBuyBoxAnyPass] = useState<boolean | null>(null);
  // Deal Q&A grounding depth — assembled ONLY from what this surface already
  // computes/holds (no new fetches): the buy-box evaluation reported up by
  // BuyBoxVerdictCard, the comp set reported up by PropertyCompsCard, the
  // Offer Ceiling solved from the current form values, and the exit-scenario return
  // summary. Absent pieces are simply omitted from the AI context.
  const [buyBoxQaReport, setBuyBoxQaReport] = useState<DealQaBuyBoxReport | null>(null);
  const requiresBuyBoxTargetResolution = Boolean(
    isAuthenticated && canUseMaxOffer && !maoTargetOverride && !isSampleProPreview
  );
  // Buy Box criteria are account-scoped, not property-scoped. Editing the
  // address re-evaluates fit synchronously against the already-loaded boxes;
  // it must not reset readiness without triggering a matching refetch.
  const buyBoxTargetScopeKey = requiresBuyBoxTargetResolution ? "account" : "explicit";
  const [buyBoxTargetResolutionState, setBuyBoxTargetResolutionState] = useState<
    "loading" | "ready" | "error"
  >(requiresBuyBoxTargetResolution ? "loading" : "ready");
  useEffect(() => {
    setBuyBoxTargetResolutionState(
      requiresBuyBoxTargetResolution ? "loading" : "ready"
    );
  }, [buyBoxTargetScopeKey, requiresBuyBoxTargetResolution]);
  const effectiveBuyBoxTargetResolutionState = requiresBuyBoxTargetResolution
    ? buyBoxTargetResolutionState
    : "ready";
  const targetActionsBlocked = effectiveBuyBoxTargetResolutionState !== "ready";
  const targetActionsBlockedReason =
    buyBoxTargetResolutionState === "error"
      ? "Your Buy Box could not be loaded. Refresh to retry before saving, sharing, or exporting."
      : "Loading your Buy Box criteria before this action is available.";
  const [compsQaData, setCompsQaData] = useState<PropertyEnrichment | null>(null);
  // Comps provider NOT_CONFIGURED on this deployment: the card self-hides,
  // so the ledger row shell must hide with it (a header must never front
  // an empty row). Sticky for the session — the provider won't appear
  // mid-session.
  const [compsUnavailable, setCompsUnavailable] = useState(false);
  // Comps already on screen shouldn't stay hidden behind a click. When a saved
  // deal loads its previously-saved comp set — free, no RentCast quota (see the
  // mount effect in property-comps-card) — open the row once so the finding is
  // visible instead of collapsed behind "Comps pulled".
  //
  // Deliberately fires AT MOST ONCE, so it can never re-open a row the user
  // collapsed on purpose. The live-pull path is unaffected: the user is already
  // inside the open row when they click Run comps.
  const compsAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!compsQaData || compsAutoOpenedRef.current) return;
    compsAutoOpenedRef.current = true;
    openRow("comps");
  }, [compsQaData, openRow]);
  // Comps belong to ONE address. The card clears itself on address change
  // while mounted, but New Analysis empties the address and UNMOUNTS it —
  // an unmounted card can't report null, so the dashboard clears too or a
  // stale set would ground the NEXT deal's AI answers on the old property.
  const compsAddressRef = useRef<string | null | undefined>(values?.address);
  useEffect(() => {
    if (compsAddressRef.current === values?.address) return;
    compsAddressRef.current = values?.address;
    setCompsQaData(null);
  }, [values?.address]);

  // What-if slider state. When the user drags rent / rate, this holds
  // the adjusted result; otherwise null and we render the base `result`
  // unchanged. SCOPED: only the 4 Overview tier metric cards consume
  // this - projections, illustrative tax impact, exit scenarios, Screening Index, and
  // every Pro panel stay anchored to the saved/base analysis. Sliders
  // are a "what-if peek" on headline numbers, not a full reanalysis.
  const [whatIfState, setWhatIfState] = useState<WhatIfState | null>(null);
  const [scenarioResetNotice, setScenarioResetNotice] = useState(false);
  // Drives a remount key on the sliders so reopening the panel starts them at
  // zero in lockstep with the (reset) headline cards — otherwise the collapsed-
  // but-still-mounted sliders keep stale positions while the cards show base.
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  // Defer the what-if state (React 19): the slider thumb stays responsive while
  // React renders the metric-card update at a lower priority and can interrupt
  // intermediate frames during a fast drag. Zero lag at rest; on slow phones the
  // cards trail the thumb by a frame then snap — the right trade vs a fixed
  // debounce (which would lag even fast phones). The base `result` is unchanged,
  // so the Overview banner (which reads it directly) never flickers.
  const deferredWhatIfState = useDeferredValue(whatIfState);
  const displayResult: AnalysisResult | null =
    deferredWhatIfState?.result ?? result;
  const baseAssumptionsSignature = useMemo(() => JSON.stringify(values), [values]);
  const previousBaseAssumptionsRef = useRef(baseAssumptionsSignature);
  useEffect(() => {
    if (previousBaseAssumptionsRef.current === baseAssumptionsSignature) return;
    previousBaseAssumptionsRef.current = baseAssumptionsSignature;
    if (whatIfState?.isAdjusted) {
      setWhatIfState(null);
      setWhatIfOpen(false);
      setScenarioResetNotice(true);
    }
  }, [baseAssumptionsSignature, whatIfState?.isAdjusted]);
  useEffect(() => {
    if (!scenarioResetNotice) return;
    const timeout = window.setTimeout(() => setScenarioResetNotice(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [scenarioResetNotice]);
  // Holistic context for the Overview. Computed from the BASE result (not
  // the what-if state) so dragging sliders doesn't flicker the banner.
  // Reuses the same exit-scenario engine as the Screening Index + PDF.
  const annualizedReturnPct = useMemo(
    () => (result && values ? computeTenYearAnnualizedReturnPct(values, result) : null),
    [result, values]
  );
  const appreciationPlay =
    !!result && isAppreciationPlayDeal(result, propertyType, annualizedReturnPct);

  // ── Deal Q&A grounding context (see the state block above) ──────────
  // Offer Ceiling: only when the user can see the Stress Test solver (Pro / sample
  // preview) so free-tier answers can't leak a gated number. Basis follows
  // lib/mao-targets: the user's buy-box thresholds when set, else the
  // canonical default floor — always labeled. Memoized on the BASE
  // result/values (never the what-if sliders), matching the Screening Index.
  const isCashPurchase = Boolean(result && result.monthlyPayment <= 0);
  const financingSafeOverride = useMemo(
    () =>
      maoTargetOverride
        ? normalizeMaoTargetForFinancing(maoTargetOverride, { isCashPurchase })
        : null,
    [isCashPurchase, maoTargetOverride]
  );
  const resolvedMaoSeed = useMemo(() => {
    if (!values || !result) return null;
    if (maoTargetOverride) {
      return financingSafeOverride ?? buildMaoTarget(null, { isCashPurchase });
    }
    const thresholds = buyBoxQaReport?.maoThresholds ?? null;
    return buildMaoTarget(thresholds, { isCashPurchase });
  }, [values, result, isCashPurchase, maoTargetOverride, financingSafeOverride, buyBoxQaReport]);
  const maoTargetAnalysisKey = `${values?.address?.trim().toLowerCase() ?? ""}|${
    maoTargetOverride ? "override" : "standard"
  }|${isCashPurchase ? "cash" : "debt"}`;
  const [maoTargetState, dispatchMaoTarget] = useReducer(reduceMaoTargetState, {
    target: resolvedMaoSeed,
    analysisKey: maoTargetAnalysisKey,
    touched: false,
  });
  // Normalize synchronously as well as through the seed effect below. Effects
  // run after paint; without this render-time guard, a financed → cash edit
  // could expose one frame of a DSCR-only solve at the solver's upper bound
  // and let an immediate Save/Share capture that meaningless target.
  const synchronousMaoTarget =
    maoTargetState.analysisKey !== maoTargetAnalysisKey || !maoTargetState.touched
      ? resolvedMaoSeed
      : maoTargetState.target;
  const activeMaoTarget = useMemo(
    () => normalizeMaoTargetForFinancing(synchronousMaoTarget, { isCashPurchase }),
    [synchronousMaoTarget, isCashPurchase]
  );
  const resolvedMaoSeedKey = JSON.stringify(resolvedMaoSeed);
  useEffect(() => {
    dispatchMaoTarget({
      type: "seed",
      target: resolvedMaoSeed,
      analysisKey: maoTargetAnalysisKey,
    });
  }, [maoTargetAnalysisKey, resolvedMaoSeedKey, resolvedMaoSeed]);
  const handleMaoTargetChange = useCallback((target: MaoTarget) => {
    dispatchMaoTarget({ type: "edit", target });
    onMaoTargetChange?.(target);
  }, [onMaoTargetChange]);
  const buyBoxIsTargetSource =
    (maoTargetOverrideSource === "buy-box" && Boolean(financingSafeOverride)) ||
    (!maoTargetOverride &&
      !maoTargetState.touched &&
      buyBoxContributesToMaoTarget(buyBoxQaReport?.maoThresholds ?? null, {
        isCashPurchase,
      }));
  const offerCeilingTargetSource: OfferCeilingTargetSource = buyBoxIsTargetSource
    ? "buy-box"
    : (financingSafeOverride ? maoTargetOverrideSource : null) ??
      (financingSafeOverride || maoTargetState.touched
        ? "selected-targets"
        : "screening-defaults");
  const targetAdopted = isAdoptedOfferCeilingTargetSource(
    offerCeilingTargetSource
  );
  // Screening defaults are examples, not investor instructions. Keep one
  // canonical pair for every persistence/export boundary so Save, Share, PDF,
  // and post-auth continuity cannot silently turn those examples into the
  // user's acquisition criteria.
  const adoptedMaoTarget = targetAdopted
    ? activeMaoTarget ?? undefined
    : undefined;
  const adoptedMaoTargetSource = targetAdopted
    ? offerCeilingTargetSource
    : undefined;

  // The inverse solver is a paid decision tool, so neither the exact result
  // nor its uncertainty endpoints are calculated in this client component.
  // The server re-checks the live subscription (including grandfathered paid
  // plans) and returns a discriminated exact-or-preview payload. A stale
  // response is kept out of the render by binding it to the complete request
  // key; rapid target/assumption edits cannot flash the prior deal's ceiling.
  const offerCeilingRequestKey =
    !recordedOfferCeiling &&
    !targetActionsBlocked &&
    targetAdopted &&
    values &&
    result &&
    activeMaoTarget
      ? JSON.stringify({
          values,
          target: activeMaoTarget,
          source: offerCeilingTargetSource,
        })
      : null;
  const [offerCeilingResolution, setOfferCeilingResolution] = useState<{
    key: string | null;
    status: "idle" | "loading" | "ready" | "error";
    payload: OfferCeilingAccessPayload | null;
  }>({ key: null, status: "idle", payload: null });
  const [offerCeilingRetryNonce, setOfferCeilingRetryNonce] = useState(0);
  useEffect(() => {
    if (!offerCeilingRequestKey || !values || !activeMaoTarget) {
      setOfferCeilingResolution({ key: null, status: "idle", payload: null });
      return;
    }
    let cancelled = false;
    setOfferCeilingResolution({
      key: offerCeilingRequestKey,
      status: "loading",
      payload: null,
    });
    void resolveOfferCeilingAction({
      values,
      target: activeMaoTarget,
      source: offerCeilingTargetSource,
    })
      .then((resolved) => {
        if (cancelled) return;
        setOfferCeilingResolution({
          key: offerCeilingRequestKey,
          status: resolved.ok ? "ready" : "error",
          payload: resolved.ok ? resolved.data : null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setOfferCeilingResolution({
          key: offerCeilingRequestKey,
          status: "error",
          payload: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeMaoTarget,
    offerCeilingRequestKey,
    offerCeilingRetryNonce,
    offerCeilingTargetSource,
    values,
  ]);
  const currentOfferCeilingPayload: OfferCeilingAccessPayload | null =
    recordedOfferCeiling
      ? canUseMaxOffer && recordedOfferCeiling.captured
        ? { access: "exact", exact: recordedOfferCeiling.exact }
        : null
      : offerCeilingResolution.key === offerCeilingRequestKey &&
          offerCeilingResolution.status === "ready"
        ? offerCeilingResolution.payload
        : null;
  const offerCeilingIsLoading = Boolean(
    !recordedOfferCeiling &&
      offerCeilingRequestKey &&
      (offerCeilingResolution.key !== offerCeilingRequestKey ||
        offerCeilingResolution.status === "loading")
  );
  const offerCeilingHasError = Boolean(
    !recordedOfferCeiling && offerCeilingResolution.status === "error"
  );
  const exactOfferCeiling =
    currentOfferCeilingPayload?.access === "exact"
      ? currentOfferCeilingPayload.exact
      : null;
  const freeOfferCeilingPreview =
    currentOfferCeilingPayload?.access === "preview"
      ? currentOfferCeilingPayload.range
      : null;
  const maoQaContext = exactOfferCeiling && activeMaoTarget
    ? {
        maxOffer: exactOfferCeiling.presentation.ceiling,
        basis: describeMaoTarget(activeMaoTarget),
        fromBuyBox: buyBoxIsTargetSource,
        achieved: exactOfferCeiling.achieved,
      }
    : null;

  const decisionViewedKey = values && result ? `${values.address}|${values.purchasePrice}` : null;
  const lastDecisionViewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!decisionViewedKey || lastDecisionViewedRef.current === decisionViewedKey) return;
    lastDecisionViewedRef.current = decisionViewedKey;
    trackEvent("decision_viewed", { property_type: values?.propertyType });
  }, [decisionViewedKey, values?.propertyType]);
  // Exit-engine return summary feeds the deeper-analysis summary and Deal Q&A
  // projection context. It does not displace the first-year core metrics.
  const returnSummary = useMemo(
    () =>
      exitScenarioSource
        ? computeReturnSummaryFromExitYears(exitScenarioSource.initialYears)
        : null,
    [exitScenarioSource]
  );
  const router = useRouter();
  // Send the user back to the calculator after auth (?next=/) so the
  // auto-saved form draft restores their analysis instead of landing them on
  // a blank homepage with their work seemingly gone. The pending-save-intent
  // flag upgrades that restore: because the user explicitly clicked SAVE
  // before auth, the calculator auto-runs their analysis on return and points
  // them back at Save — completing the click they already made instead of
  // asking them to redo it (goToLogin's only caller is the Save button).
  // Route to SIGN-UP, not login: an anonymous saver is overwhelmingly a
  // first-time visitor, and the login page's "Welcome back" framing was
  // a wall at their highest-intent moment. Sign-up leads with one-tap
  // Google OAuth and keeps a "Sign in" cross-link (which threads ?next)
  // for the rare returning user.
  const goToLogin = () => {
    onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource);
    setPendingSaveIntent();
    router.push("/auth/sign-up?next=/");
  };
  // Auth-aware upgrade routing (BROWSER-1 / STRATEGY-UPSELL-LOGIN-DEADEND):
  // /profile is auth-gated and server-redirects anonymous users to
  // /auth/login with NO ?next param, so an anon "Get Pro" / "Start your
  // free-trial" tap dead-ended at a login wall with the billing
  // intent dropped. Anonymous users go to /pricing instead (matching
  // ProInlineGate — the sibling gate that always did this right);
  // authenticated users keep the direct billing deep link.
  const goToBilling = () => {
    if (!isAuthenticated) {
      router.push("/pricing");
      return;
    }
    router.push("/profile#billing");
  };
  const tabEntitlements: Record<AnalysisDashboardTab, boolean> = {
    "cash-flow": true,
    projections: canUseProjections,
    "tax-strategy": canUseTaxStrategy,
    "exit-scenarios": canUseExitScenarios,
    // Strategies tab (BRRRR + Fix-and-Flip + rehab estimator) is now a
    // Pro feature - gated by canUseStrategies. Free users see the tab
    // with a lock icon and the ProFeaturePreview placeholder on click.
    strategies: canUseStrategies,
    // Stress Test tab houses Offer Ceiling + Sensitivity Grid.
    // It unlocks if EITHER underlying entitlement is granted, since the
    // tab itself shows both cards (with a per-card Pro gate if only one
    // is unlocked).
    "stress-test": canUseMaxOffer || canUseSensitivity,
  };

  // (The roving-tabindex tablist keyboard nav retired with the tab bar -
  // DrillLedger provides the accordion equivalent: ArrowUp/Down + Home/End
  // move focus between row headers.)

  const isEditingLockedByPlan = isAuthenticated && isExistingSavedDeal && !canUpdateSavedDeals;
  const isSaveLimitLockedByPlan = isAuthenticated && !isExistingSavedDeal && saveDealLimitReached;
  const isSaveLockedByPlan =
    isEditingLockedByPlan || isSaveLimitLockedByPlan || (isAuthenticated && !canSaveDeals);
  // Why Save is locked - shared verbatim by the toolbar Save button's
  // title and the hero-corner Save (Phase 2 surfaces the same action in
  // both places; the logic lives once).
  const saveLockedHint = isEditingLockedByPlan
    ? "Upgrade to update saved analyses."
    : isSaveLimitLockedByPlan
      ? "Saved deal limit reached for your plan."
      : isAuthenticated && !canSaveDeals
        ? "Save is not available for your current plan."
        : undefined;
  // The ONE save entry point - used by the toolbar button and the
  // hero-corner Save so the sign-in redirect + handler never diverge.
  const handleSaveClick = () => {
    if (targetActionsBlocked || isSaveLockedByPlan) return;
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    // NOTE: deal_saved is emitted on the SUCCESS path in investcalc-page —
    // firing it here too double-counted every real save and counted every
    // rejected one.
    void onSaveDeal(adoptedMaoTarget, adoptedMaoTargetSource);
  };
  const handleExportPdf = (mode?: ReportMode) => {
    if (targetActionsBlocked) return;
    void onExportPdf(
      mode,
      adoptedMaoTarget,
      adoptedMaoTargetSource
    );
  };
  const handlePrepareOffer = () => {
    if (targetActionsBlocked) return;
    trackEvent("prepare_my_offer_clicked", {
      offer_ready_stage: inputConfidence?.stage ?? "unknown",
    });
    trackEvent("deal_decision_pack_started", {
      source: "analysis_result",
      methodology_version: result?.methodologyVersion ?? "unknown",
    });
    handleExportPdf("personal");
  };

  // Metric tap → jump to the ledger row that explains it (Phase 2 wiring,
  // Phase 5 target). Same ids (METRIC_JUMP_TARGETS map to the old tab ids,
  // which ARE the row ids) - setActiveTab now opens the row + scrolls it
  // into view, so this is a straight delegate.
  const handleMetricJump = setActiveTab;

  // Programmatic tab pointing from the page (input-tab clicks, the
  // strategy primaryTab lead, onSubmit) - opens the row WITHOUT
  // scrolling, exactly matching the old semantics where changing the
  // active tab never moved the viewport (the page scrolls to the results
  // container itself when it wants to). The mount-time value seeds the
  // initial open state above.
  useEffect(() => {
    if (!activeTabProp) return;
    openRow(activeTabProp);
    // activeTabNonce: same-value re-points (closed row + re-clicked input
    // tab / re-run) bump the nonce so this effect fires again.
  }, [activeTabProp, activeTabNonce, openRow]);

  // One-glance "what do I do next" - the single imperative step that turns a
  // verdict into action ("Lower your offer or raise rent", "Make your offer").
  // Derived from the BASE result (not the what-if sliders) so it stays
  // consistent with the Screening Index + verdict above it. Same lib that drives
  // the saved-deal pages, so the wording never diverges between surfaces.
  const nextAction =
    result && !isLoading
      ? nextActionForDeal({
          netCashFlow: result.netCashFlow,
          dscr: result.dscr ?? null,
          monthlyPayment: result.monthlyPayment ?? null,
          // Reported up by BuyBoxVerdictCard on this same surface, so the
          // banner can never say "make your offer" one card above a
          // "Misses your buy box" verdict (null = no box / not evaluated).
          meetsBuyBox: buyBoxAnyPass,
        })
      : null;

  // Canonical Grand Slam funnel milestones. Object-identity guards keep
  // React Strict Mode and buy-box state updates from double-counting a single
  // result while still recording a genuinely new calculation.
  const trackedVerdictResultRef = useRef<AnalysisResult | null>(null);
  useEffect(() => {
    if (!result || isLoading || trackedVerdictResultRef.current === result) return;
    trackedVerdictResultRef.current = result;
    trackEvent("verdict_viewed", {
      decision_tone: nextAction?.tone ?? "review",
      is_cash_purchase: result.monthlyPayment <= 0,
    });
    if (canUseMaxOffer) {
      trackEvent("max_offer_unlocked", { placement: "analysis_result" });
    }
  }, [canUseMaxOffer, isLoading, nextAction?.tone, result]);

  const trackedDealFitResultRef = useRef<AnalysisResult | null>(null);
  const trackedInputConfidenceResultRef = useRef<AnalysisResult | null>(null);
  useEffect(() => {
    if (!result || isLoading) return;
    if (
      trackedDealFitResultRef.current !== result &&
      dealScoreResult?.ok &&
      dealScoreResult.tier === "pro"
    ) {
      trackedDealFitResultRef.current = result;
      const score = dealScoreResult.data.score;
      trackEvent("deal_fit_viewed", {
        score_band: score >= 80 ? "80-100" : score >= 60 ? "60-79" : score >= 40 ? "40-59" : "0-39",
        methodology_version: result.methodologyVersion,
      });
    }
    if (
      trackedInputConfidenceResultRef.current !== result &&
      showInputConfidence &&
      inputConfidence
    ) {
      trackedInputConfidenceResultRef.current = result;
      trackEvent("input_confidence_viewed", {
        score_band:
          inputConfidence.score >= 80
            ? "80-100"
            : inputConfidence.score >= 55
              ? "55-79"
              : inputConfidence.score >= 30
                ? "30-54"
                : "0-29",
        stage: inputConfidence.stage,
        sensitivity_risk: inputConfidence.sensitivityRisk,
        method_version: inputConfidence.methodVersion,
      });
    }
  }, [dealScoreResult, inputConfidence, isLoading, result, showInputConfidence]);

  const trackedBuyBoxResultRef = useRef<{ result: AnalysisResult; passes: boolean } | null>(null);
  useEffect(() => {
    if (!result || buyBoxAnyPass == null) return;
    if (
      trackedBuyBoxResultRef.current?.result === result &&
      trackedBuyBoxResultRef.current.passes === buyBoxAnyPass
    ) return;
    trackedBuyBoxResultRef.current = { result, passes: buyBoxAnyPass };
    trackEvent("buy_box_result_viewed", { passes: buyBoxAnyPass });
  }, [buyBoxAnyPass, result]);

  // Plain-English "why this verdict" - the per-deal narrative (cash flow,
  // cap rate, DSCR, CoC) that the PDF/share already use but free users never
  // saw on screen. Free-tier safe and per-deal; rendered with progressive
  // disclosure inside the Recommendation card so the first read stays calm.
  const verdictNarrative =
    result && !isLoading
      ? getVerdictNarrative({
          result,
          address: values?.address,
          purchasePrice: values?.purchasePrice,
        })
      : null;

  const labelMap: Record<string, string> = {
    "single-family": "Single Family",
    "multi-family": "Multi-Family",
    "owner-occupant": "Owner Occupant",
  };

  // Metric tiles are built once and shared between the fixed first-year row
  // and the "Show all metrics" fold, so the two cannot diverge.
  const metricTiles = buildMetricTiles({
    displayResult,
    result,
    isScenarioActive: Boolean(deferredWhatIfState?.isAdjusted),
    isLoading,
    address: values?.address,
    propertyType,
    annualizedReturnPct,
    onMetricSelect: handleMetricJump,
  });
  const secondaryMetricKeys = getSecondaryMetricKeys();

  // ── Closed-row summary lines (Phase 5, the Ledger's unique asset) ──
  // ONE truthful line per closed ledger row, derived ONLY from numbers
  // already computed on this surface — never new math, never a fake
  // number. Rows whose data would need a Pro fetch (the exit-engine IRR
  // for free users) or a user action (comps) fall back to a neutral
  // verb-first line instead. The stress line reads the SAME deferred
  // what-if state as the metric tiles, which the "Play with the numbers"
  // panel resets to null on collapse — so a stale stressed number can
  // never linger in a closed-row phrase.
  const fmtSignedMonthly = (n: number) =>
    `${n >= 0 ? "+" : "−"}$${Math.abs(Math.round(n)).toLocaleString()}/mo`;
  const annualTaxSavings = result ? Math.round(result.taxSavingsMonthly * 12) : 0;
  const rowSummaries: Record<AnalysisLedgerRowId, string> = {
    "cash-flow": result
      ? `$${Math.round(result.monthlyRentalIncome).toLocaleString()} rent − $${Math.round(
          result.monthlyRentalIncome - result.netCashFlow
        ).toLocaleString()} costs = ${fmtSignedMonthly(result.netCashFlow)}`
      : "See where the rent goes, month by month",
    projections:
      result && annualizedReturnPct != null
        ? `~${Math.round(annualizedReturnPct)}%/yr total return over 10 years${
            // Finding 5: beyond the deal-score's own top band (>15%/yr),
            // the closed-row phrase carries the caution too.
            isExtremeAnnualizedRoi(annualizedReturnPct) ? " — verify assumptions" : ""
          }`
        : "See year-by-year cash flow, equity & returns",
    "tax-strategy":
      result && annualTaxSavings > 0
        ? `~$${annualTaxSavings.toLocaleString()}/yr modeled tax impact at the entered rate`
        : "See the modeled effect of depreciation and interest",
    "exit-scenarios":
      returnSummary?.irrPct != null
        ? `IRR ${returnSummary.irrPct.toFixed(1)}% over ${returnSummary.years} yrs`
        : "When should you sell? Model the exit",
    strategies: "Run the BRRRR & fix-and-flip numbers",
    "stress-test": deferredWhatIfState?.isAdjusted
      ? `${deferredWhatIfState.result.netCashFlow >= 0 ? "Survives" : "Goes negative under"} ${formatAdjustmentLabel(
          deferredWhatIfState.rentPct,
          deferredWhatIfState.pricePct,
          deferredWhatIfState.ratePp,
          deferredWhatIfState.vacancyPp
        )}: ${fmtSignedMonthly(deferredWhatIfState.result.netCashFlow)}`
      : "Stress it — see what happens when assumptions get worse",
    comps: buildCompsRowSummary(compsQaData, values?.monthlyRent ?? null, values?.purchasePrice ?? null, {
      propertyType: values?.propertyType,
    }),
    notes: "Your private notes on this deal",
  };

  // ── Tier-1 derivations (Aug-2026 hierarchy rebuild) ──────────────────
  // Presentation only: reads the ALREADY-COMPUTED Screening Index. The
  // recommendation string is the INTERNAL enum; <Verdict> maps it.
  const decisionFirst = isFeatureEnabled("decision_first_results");
  return (
    <div className="space-y-6">
      {/* Sample-deal Pro preview banner - slimmed to a one-line dismissible
          strip (Phase 2) so it no longer pushes the answer below the fold on
          the 375px first paint. Still explains why every Pro tab is open on
          the demo and converts the "wow" into a pricing visit; gradient +
          border language still matches ProInlineGate. */}
      {isSampleProPreview && !sampleBannerDismissed && (
        <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-gradient-to-r from-[var(--brand-blue-light)] via-card to-card py-1 pl-3 pr-1">
          <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            Sample deal — the full Pro report is unlocked for this demo.
          </p>
          <Button
            size="sm"
            className="h-7 shrink-0 gap-1 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground"
            onClick={goToBilling}
          >
            Get Pro
          </Button>
          <button
            type="button"
            aria-label="Dismiss the sample deal banner"
            onClick={() => setSampleBannerDismissed(true)}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      {deferredWhatIfState?.isAdjusted ? (
        <div
          role="status"
          className="sticky top-16 z-20 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
        >
          <strong>Scenario only.</strong> These numbers are temporary. Your saved base assumptions have not changed. Scenario values below are labeled Scenario; the Decision card and Offer Ceiling remain labeled Base.
        </div>
      ) : null}
      {scenarioResetNotice ? (
        <div role="status" className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          Scenario reset because the base assumptions changed.
        </div>
      ) : null}
      {targetActionsBlocked ? (
        <div
          role={buyBoxTargetResolutionState === "error" ? "alert" : "status"}
          className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{targetActionsBlockedReason}</span>
          {buyBoxTargetResolutionState === "error" ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 px-3 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Refresh and retry
            </button>
          ) : null}
        </div>
      ) : null}

      <h1
        id="analysis-decision-title"
        className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
      >
        First-pass underwriting
      </h1>

      {decisionFirst && result && values && activeMaoTarget ? (
        <section aria-labelledby="analysis-decision-title" className="space-y-3">
          <FocusedDecisionSummary
            values={values}
            result={result}
            offerCeiling={exactOfferCeiling?.presentation ?? null}
            exactBreakpointLabels={exactOfferCeiling?.decisionBreakpoints ?? []}
            rangePreview={freeOfferCeilingPreview}
            target={activeMaoTarget}
            targetLabel={describeMaoTarget(activeMaoTarget)}
            targetSource={offerCeilingTargetSource}
            targetAdopted={targetAdopted}
            targetProfileId={
              isSampleProPreview
                ? SAMPLE_DEAL_FIXTURE.targetProfile.id
                : buyBoxIsTargetSource && !maoTargetOverride
                ? buyBoxQaReport?.selectedBox.id ?? null
                : null
            }
            targetProfileVersion={
              isSampleProPreview
                ? SAMPLE_DEAL_FIXTURE.targetProfile.version
                : null
            }
            // A persisted Buy Box target is a frozen numeric snapshot. Until
            // its box id/name/fingerprint is stored too, never relabel it with
            // whichever live box happens to be selected today.
            buyBoxName={
              isSampleProPreview
                ? SAMPLE_DEAL_FIXTURE.targetProfile.name
                : buyBoxIsTargetSource && !maoTargetOverride
                ? buyBoxQaReport?.selectedBox.name ?? null
                : null
            }
            buyBoxFit={
              maoTargetOverrideSource === "buy-box" && maoTargetOverride
                ? null
                : buyBoxAnyPass
            }
            buyBoxHasUnknownRules={Boolean(
              buyBoxQaReport?.context.checks.some((check) => check.pass == null)
            )}
            userDecision={userDecision}
            inputConfidence={inputConfidence}
            canShowPriceCeiling={currentOfferCeilingPayload?.access === "exact"}
            canTunePriceCeiling={canUseMaxOffer}
            isOfferCeilingLoading={offerCeilingIsLoading}
            offerCeilingError={offerCeilingHasError}
            onRetryOfferCeiling={() => {
              setOfferCeilingRetryNonce((current) => current + 1);
            }}
            isScenarioActive={Boolean(deferredWhatIfState?.isAdjusted)}
            onTargetChange={handleMaoTargetChange}
            onAdoptTarget={() => handleMaoTargetChange(activeMaoTarget)}
            onTuneTargetsOpened={() => {
              trackEvent("targets_opened", { placement: "decision_summary" });
            }}
            onEditAssumptions={onEditAssumptions}
            onSave={handleSaveClick}
            onCompareDeals={onCompareDeals}
            onAnalyzeAnotherLikeThis={onAnalyzeAnotherLikeThis}
            onNewAnalysis={onNewAnalysis}
            onUpgrade={goToBilling}
            isSaving={isSaving}
            isComparing={isComparing}
            isSaved={isSaved}
            canCompareDeals={canCompareDeals}
            persistedActionsBlockHint={persistedActionsBlockHint}
            isSaveLocked={isSaveLockedByPlan}
            saveLockedHint={saveLockedHint}
            savedDealId={savedDealId}
            isAuthenticated={isAuthenticated}
            onPrepareAuthShare={() => {
              onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource);
            }}
            targetResolutionState={effectiveBuyBoxTargetResolutionState}
            targetResolutionMessage={targetActionsBlockedReason}
            advocacyContractEnabled={advocacyDecisionContract}
          />
        </section>
      ) : null}
      {/* Answer hero - the ONE card that leads the results (Phase 2:
          answer-hero-card.tsx composes the Recommendation content, the Deal
          Score ring + breakdown, and the NextActionBanner footer). DOM-first,
          so the verdict-first mobile ordering is intrinsic and the old
          order-1/order-2 swap wrapper is retired. When a non-cash-flow
          strategy is active (Wholesale/BRRRR/Flip), StrategyOutcomeCard IS
          the hero - the same early swap as before, now top-level. */}
      {strategyLeadsOutput ? (
        targetActionsBlocked ? null : activeStrategy && values ? (
          <StrategyOutcomeCard
            strategy={activeStrategy}
            values={values}
            result={result}
            canUseMaxOffer={canUseMaxOffer}
            canUseStrategies={canUseStrategies}
            activeMaoTarget={activeMaoTarget}
            offerCeiling={exactOfferCeiling}
            isOfferCeilingLoading={offerCeilingIsLoading}
            hasExactOfferCeilingAccess={currentOfferCeilingPayload?.access === "exact"}
            offerCeilingError={offerCeilingHasError}
            onMaoTargetChange={handleMaoTargetChange}
            onTuneTargetsOpened={() => {
              trackEvent("targets_opened", { placement: "wholesale_outcome" });
            }}
            onUpgrade={goToBilling}
          />
        ) : null
      ) : decisionFirst ? null : (
        <AnswerHeroCard
          isLoading={isLoading}
          isLoadingDealScore={isLoadingDealScore}
          dealScoreResult={dealScoreResult}
          result={result}
          propertyType={propertyType}
          isAppreciationPlay={appreciationPlay}
          verdictNarrative={verdictNarrative}
          nextAction={nextAction}
          buyBoxFit={buyBoxAnyPass}
          showAllTips={showAllTips}
          onToggleShowAllTips={() => setShowAllTips((prev) => !prev)}
          onSave={handleSaveClick}
          isSaving={isSaving}
          isSaveLocked={isSaveLockedByPlan}
          saveLockedHint={saveLockedHint}
          hasUnsavedChanges={isExistingSavedDeal && !isSaved}
          purchasePrice={values?.purchasePrice ?? null}
          maxOffer={maoQaContext?.maxOffer ?? null}
        />
      )}

      {/* The upgrade moment belongs immediately after the answer, while the
          acquisition decision is still top-of-mind. It exposes the exact
          missing outcome (Offer Ceiling) without inventing a number for Free. */}
      {/* The retired legacy MaxOfferCard calculated paid solver output in the
          browser. The legacy layout consumes the server-authorized summary
          below instead, so a feature-flag rollback cannot reopen that path. */}

      {result && values && !isLoading && !canUseMaxOffer ? (
        <MomentOfValueUpsell
          purchasePrice={Number(values.purchasePrice ?? 0)}
          netCashFlow={result.netCashFlow}
          capRate={result.capRate}
          cocReturn={result.cocReturn}
          decisionTone={nextAction?.tone ?? "review"}
          isPaid={canUseMaxOffer}
        />
      ) : null}

      {(showInputConfidence || advocacyDecisionContract) && result && !isLoading && inputConfidence && onToggleInputVerified ? (
        <InputConfidenceCard
          confidence={inputConfidence}
          showOfferReadyStatus={showOfferReadyStatus}
          advocacyContractEnabled={advocacyDecisionContract}
          dealFitScore={
            dealScoreResult?.ok && dealScoreResult.tier === "pro"
              ? dealScoreResult.data.score
              : null
          }
          onEditAssumptions={onEditAssumptions}
          onToggleVerified={onToggleInputVerified}
        />
      ) : null}

      {showDealDecisionPack && result && !isLoading ? (
        <PrepareOfferCard
          stage={inputConfidence?.stage ?? null}
          remainingVerificationCount={inputConfidence?.offerReadyRemaining.length ?? null}
          isPreparing={isExporting}
          onPrepare={handlePrepareOffer}
        />
      ) : null}
      {/* The focused decision summary owns Save, Share, target tuning and
          assumption editing when decision-first is on. Keep this legacy
          six-action toolbar behind the kill switch only. */}
      {!decisionFirst ? (
        /* Action bar — identity strip ("what is this?") + Quick Actions
           ("what can I do with it?"). */
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Identity strip - property type + saved-status badge.
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
                  : "Complete analysis — click Save to keep this deal."
            }
          >
            {/* "Not saved", never "Preview": the analysis a fresh run shows
                is complete — only persistence is missing. "Preview" read as
                "this isn't the real result / there's another step"
                (UX walkthrough P1-5). */}
            {isSaved
              ? "Saved"
              : isExistingSavedDeal
                ? "Unsaved changes"
                : "Not saved"}
          </span>
          {/* Cross-link to this deal's workspace (checklist, docs, notes,
              scenarios) — only when a saved deal is loaded. Contextual link, not
              new top-level nav. */}
          {isExistingSavedDeal && savedDealId ? (
            <Link
              href={`/dashboard/saved-analyses/${savedDealId}`}
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Deal workspace
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
        {/* Quick Actions - naked button row, no panel chrome.
            Previously wrapped in a bordered card with a floating
            "Quick actions" label, which added visual weight without
            adding meaning - the 4 buttons themselves are clearly a
            toolbar. Removing the chrome lets the row read as inline
            with the identity strip.
            Below sm the row is 3 equal actions (Save / PDF / Share) plus a
            slim auto-width "More" overflow - 5-6 cells in grid-cols-4
            wrapped into a ragged second row at ~82px each. sm+ keeps the
            original 4-col grid with every action inline. */}
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-1.5 sm:grid-cols-4 sm:gap-2 xl:min-w-[560px] max-[380px]:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveClick}
                disabled={isSaving || isSaveLockedByPlan || targetActionsBlocked}
                title={targetActionsBlocked ? targetActionsBlockedReason : saveLockedHint}
                className="h-11 gap-1 rounded-xl px-2 text-[11px] sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
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
              {/* Hidden below sm - lives in the "More" overflow there. */}
              <Button
                variant="outline"
                size="sm"
                className="hidden h-11 gap-1 rounded-xl px-2 text-[11px] sm:inline-flex sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
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
                className="h-11 gap-1 rounded-xl bg-primary px-2 text-[11px] font-semibold text-primary-foreground sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm max-[380px]:gap-0.5 max-[380px]:rounded-lg max-[380px]:px-1 max-[380px]:text-[10px]"
                onClick={() => handleExportPdf()}
                // Clickable for users WITHOUT the entitlement on purpose:
                // the click opens the Pro report upgrade dialog. Existing
                // paid one-time claims can still recover, but new Pack
                // checkout is temporarily disabled.
                disabled={targetActionsBlocked || isExporting || (canExportPdf && !isSaved)}
                title={
                  targetActionsBlocked
                    ? targetActionsBlockedReason
                    : canExportPdf && !isSaved
                    ? persistedActionsBlockHint ?? "Save this analysis before exporting PDF."
                    : !canExportPdf
                      ? "PDF reports are included with TrueCap Pro."
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
              {/* Report-style menu - only for users who can actually export
                  (entitled + saved). Lets them pick a lender / partner /
                  personal variant; the main button stays the personal default
                  and keeps its purchase-dialog behavior for everyone else.
                  Hidden below sm - the modes live in the "More" overflow. */}
              {canExportPdf && isSaved ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden h-11 rounded-xl px-2 sm:inline-flex sm:h-10"
                      disabled={isExporting || targetActionsBlocked}
                      aria-label="Choose a report style"
                      title="Choose a report style (lender / partner / personal)"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-1.5">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Export as…
                    </p>
                    {REPORT_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isExporting || targetActionsBlocked}
                        onClick={() => handleExportPdf(m.id)}
                        className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="text-sm font-semibold text-foreground">{m.label}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{m.description}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : null}
              {/* Phase D "copy a row" — quiet OUTLINE secondary next to the
                  filled New Analysis so the two paths read differently:
                  Like This = same assumptions, New Analysis = fresh start.
                  Pure form operation, so free + anon get it too. Hidden
                  below sm — lives in the "More" overflow there. */}
              <Button
                size="sm"
                variant="outline"
                // col-span-2: the label is the feature ("same assumptions" in
                // the user's own words) and Button is whitespace-nowrap — one
                // minmax(0,1fr) column would clip it.
                className="hidden h-11 gap-1 rounded-xl px-2 text-[11px] sm:col-span-2 sm:inline-flex sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm"
                onClick={onAnalyzeAnotherLikeThis}
                title="Keeps your assumptions — just enter the next property"
              >
                <CopyPlus className="w-3.5 h-3.5 shrink-0 sm:mr-1.5" />
                <span>Analyze another like this</span>
              </Button>
              {/* Hidden below sm — New Analysis lives in "More" there.
                  Share keeps the 3-up slot instead: the read-only share
                  link is the growth loop, and burying it a tap deep on
                  the mobile-majority audience risks the one action that
                  markets TrueCap for free. */}
              <Button
                size="sm"
                className="hidden h-11 gap-1 rounded-xl bg-primary px-2 text-[11px] font-semibold text-primary-foreground sm:inline-flex sm:h-10 sm:gap-0 sm:rounded-xl sm:px-4 sm:text-sm"
                onClick={() => void onNewAnalysis()}
                title="Create a new analysis"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 sm:mr-1.5" />
                <span className="hidden sm:inline">New Analysis</span>
                <span className="sm:hidden">New</span>
              </Button>
              {/* Share is FREE for everyone - the read-only /d/[encoded]
                  view is the core growth loop (every shared deal markets
                  TrueCap). Icon-forward and kept in the 3-up row at every
                  width for exactly that reason. */}
              <ShareLinkButton
                values={values}
                isAuthenticated={isAuthenticated}
                savedDealId={savedDealId}
                maoTarget={adoptedMaoTarget}
                maoTargetSource={adoptedMaoTargetSource}
                disabled={targetActionsBlocked}
                disabledReason={targetActionsBlockedReason}
                onPrepareAuth={() => {
                  onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource);
                }}
              />
              {/* Mobile-only "More" overflow - Compare, New Analysis and
                  the report-style modes fold in here below sm (see the
                  grid comment above). Every action stays reachable. */}
              <Popover open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 rounded-xl px-2 sm:hidden max-[380px]:rounded-lg max-[380px]:px-1"
                    aria-label="More actions"
                    title="More actions (Compare, Share, report style)"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-1.5">
                  <button
                    type="button"
                    disabled={!isSaved || !canCompareDeals || isComparing}
                    onClick={() => {
                      setMoreActionsOpen(false);
                      void onCompareDeals();
                    }}
                    title={
                      !isSaved
                        ? persistedActionsBlockHint ?? "Save this analysis before comparing it."
                        : !canCompareDeals
                          ? "Compare is not available for your current plan."
                          : undefined
                    }
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ListTodo className="size-4 shrink-0 text-muted-foreground" />
                    Compare Deals
                  </button>
                  {/* Phase D "copy a row" — same-assumptions fork, listed
                      above New Analysis so the repeat-screening path is
                      seen first. The subtext carries the distinction the
                      desktop tooltip makes. */}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreActionsOpen(false);
                      onAnalyzeAnotherLikeThis();
                    }}
                    className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <CopyPlus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        Analyze another like this
                      </span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        Keeps your assumptions — just enter the next property
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreActionsOpen(false);
                      void onNewAnalysis();
                    }}
                    title="Create a new analysis"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <Sparkles className="size-4 shrink-0 text-muted-foreground" />
                    New Analysis
                  </button>
                  {canExportPdf && isSaved ? (
                    <>
                      <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Export as…
                      </p>
                      {REPORT_MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={isExporting || targetActionsBlocked}
                          onClick={() => {
                            setMoreActionsOpen(false);
                            handleExportPdf(m.id);
                          }}
                          className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="text-sm font-semibold text-foreground">{m.label}</span>
                          <span className="block text-[11px] leading-snug text-muted-foreground">{m.description}</span>
                        </button>
                      ))}
                    </>
                  ) : null}
                </PopoverContent>
              </Popover>
              {/* Cross-link to batch triage (/dashboard/triage, "Screen
                  Listings" in the sidebar) - the "I have 5 more listings to
                  check" moment happens right after a single analysis
                  finishes, and this is the only affordance pointing at the
                  paste-many-rows tool from the results view. Muted one-line
                  text, NOT another button, so the de-densified toolbar stays
                  calm. Gated on canCompareDeals - the same entitlement that
                  gates the sidebar item - so anon/free users see nothing. */}
              {/* Save-limit notice - the disabled Save button's title tooltip
                  is desktop-hover-only, so this is the ALWAYS-VISIBLE (mobile
                  included) explanation + the path to act. NOTE: only DELETING
                  frees a slot — the capacity count in saveDealAction counts
                  every non-deleted row, archived included — so the copy must
                  not promise that archiving helps. Muted one-line text, same
                  quiet register as the triage cross-link below. */}
              {isSaveLimitLockedByPlan ? (
                <p className="col-span-full px-1 pt-0.5 text-xs text-muted-foreground">
                  Saved-deal limit reached
                  {savedDealCount != null && savedDealLimit != null
                    ? ` (${savedDealCount} of ${savedDealLimit})`
                    : ""}{" "}
                  —{" "}
                  <Link
                    href="/dashboard/saved-analyses"
                    className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                  >
                    delete one to free a slot
                    <ArrowUpRight aria-hidden className="size-3" />
                  </Link>
                </p>
              ) : null}
              {canCompareDeals ? (
                <p className="col-span-full px-1 pt-0.5 text-xs text-muted-foreground">
                  Screening several listings?{" "}
                  <Link
                    href="/dashboard/triage"
                    className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                  >
                    Screen a shortlist
                    <ArrowUpRight aria-hidden className="size-3" />
                  </Link>
                </p>
              ) : null}
        </div>
      </div>
      ) : null}

      {/* "What decides this deal" - elevates the single biggest sensitivity
          driver (from the same engine as the Cash Flow tab's tornado) to a
          headline next to the verdict. Hidden during a strategy-led output
          (that has its own framing) and while loading. */}
      {/* MERGED into "What moves this deal" (AssumptionImpactCard, now inside
          "Why this number"): both render computeAssumptionImpact, and this one
          only elevated the #1 driver the other already ranks first — the
          identical fact, stated twice in a row. */}
      {!decisionFirst && result && values && !isLoading && !strategyLeadsOutput ? (
        <DealDriverInsight values={values} result={result} marketRentEstimate={marketRentEstimate} />
      ) : null}

      {/* Existing deterministic breakpoint solver, promoted out of the
          collapsed what-if drawer. On a weak or marginal deal this answers
          the next acquisition question: what has to change for it to work? */}
      {!decisionFirst && result && values && !isLoading && !strategyLeadsOutput && !showDecisionThresholds ? (
        <BreakpointSuggestionCard values={values} result={result} />
      ) : null}

      {/* Buy Box verdict - personalized "meets your buy box" line that
          complements the Screening Index above. Self-gates: only authenticated
          Pro users with an active Buy Box (≥1 criterion) ever see it.
          Evaluates the BASE result (not the what-if sliders), matching the
          Screening Index. */}
      {result && values ? (
        <BuyBoxVerdictCard
          enabled={Boolean(isAuthenticated)}
          metrics={{
            capRatePct: result.capRate ?? null,
            cocPct: result.cocReturn ?? null,
            dscr: result.dscr ?? null,
            cashFlowMonthly: result.netCashFlow ?? null,
            purchasePrice: values.purchasePrice ?? null,
            propertyType: values.propertyType,
            state: deriveStateFromAddress(values.address),
            isCashPurchase: result.monthlyPayment <= 0,
          }}
          values={values}
          onFitChange={setBuyBoxAnyPass}
          onQaContextChange={setBuyBoxQaReport}
          onLoadStateChange={setBuyBoxTargetResolutionState}
        />
      ) : null}

      {/* Offer Ceiling is a first-class acquisition answer, not just another
          metric. This compact summary uses the exact same deterministic
          engine and Buy Box target basis as the editable solver below. */}
      {maoQaContext && values && !strategyLeadsOutput && !showDecisionThresholds && !decisionFirst ? (
        <section
          aria-labelledby="max-offer-summary-title"
          className="rounded-2xl border-2 border-primary/30 bg-[var(--brand-blue-light)] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Target className="size-4" aria-hidden />
                <h2 id="max-offer-summary-title" className="text-xs font-extrabold uppercase tracking-widest">
                  Offer Ceiling
                </h2>
                {maoQaContext.fromBuyBox ? (
                  <span className="rounded-full border border-primary/25 bg-card px-2 py-0.5 text-[10px] font-semibold">
                    From your Buy Box
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-mono text-4xl font-extrabold tabular-nums tracking-tight text-primary sm:text-5xl">
                ${Math.round(maoQaContext.maxOffer).toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Highest modeled price that still meets {maoQaContext.basis} under the assumptions shown. This is not a recommended offer.
              </p>
            </div>
            <div className="text-sm sm:text-right">
              {Number(values.purchasePrice) > maoQaContext.maxOffer ? (
                <p className="font-bold text-foreground">
                  ${Math.round(Number(values.purchasePrice) - maoQaContext.maxOffer).toLocaleString("en-US")} below the current price
                </p>
              ) : (
                <p className="font-bold text-[var(--brand-green)]">Current price meets these modeled targets</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                At the ceiling: ${Math.round(maoQaContext.achieved.netCashFlow).toLocaleString("en-US")}/mo · {maoQaContext.achieved.capRate.toFixed(1)}% cap · {maoQaContext.achieved.dscr > 0 ? maoQaContext.achieved.dscr.toFixed(2) : "—"} DSCR
              </p>
              <button
                type="button"
                onClick={() => {
                  trackEvent("targets_opened", { placement: "legacy_max_offer_summary" });
                  document.getElementById("max-offer-result")?.scrollIntoView({
                    behavior: scrollBehavior(),
                    block: "start",
                  });
                }}
                className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-md font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Review and tune targets <ArrowUpRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {/* Fixed first-year metrics lead here. Long-term returns remain in the
          dedicated Long-term analysis region and secondary disclosure. */}
      {/* REGION 3 · THE NUMBERS — metrics grid + stress tools behind one
          disclosure when decision-first is on; a loose block otherwise. */}
      <ResultsRegionOrFragment
        enabled={decisionFirst}
        id="the-numbers"
        question="The numbers"
        payoff="Every metric, and the levers that move them"
        openEvent="the_numbers_opened"
      >
      <div className={cn("space-y-3", strategyLeadsOutput && "hidden")}>
        <section aria-labelledby="numbers-section-title" className="space-y-3">
        <h2 id="numbers-section-title" className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
          {deferredWhatIfState?.isAdjusted ? "Scenario numbers" : "Numbers"}
        </h2>
        <MetricsBand
          tiles={metricTiles}
          dataConfidence={dataConfidence}
          dealPropertyType={values?.propertyType}
        />

        {/* Quick-screen ratios investors use to triage at a glance: break-even
            occupancy (how much vacancy the deal can absorb before cash flow
            hits zero), GRM, and rent-to-price (the "1% rule"). Derived from the
            existing result — no new inputs. */}
        {result && !deferredWhatIfState?.isAdjusted ? (() => {
          const price = result.loanAmount + result.downPayment;
          const annualRent = result.monthlyRentalIncome * 12;
          const grm = annualRent > 0 ? price / annualRent : null;
          const rentToPrice = price > 0 ? (result.monthlyRentalIncome / price) * 100 : null;
          // Costs that don't scale with occupancy (vacancy is the occupancy
          // variable itself) that the collected rent must cover.
          const fixedCosts =
            result.totalOperatingExpenses - result.vacancy + result.monthlyPayment + result.pmiMonthly;
          const breakEvenOcc =
            result.monthlyRentalIncome > 0 ? (fixedCosts / result.monthlyRentalIncome) * 100 : null;
          const chips: Array<{ label: string; value: string; hint: string }> = [
            {
              label: "Break-even occupancy",
              value:
                breakEvenOcc == null ? "—" : breakEvenOcc > 100 ? ">100%" : `${Math.round(breakEvenOcc)}%`,
              hint: "Occupancy needed to cover all costs — lower means more vacancy cushion.",
            },
            { label: "GRM", value: grm == null ? "—" : grm.toFixed(1), hint: "Price ÷ annual gross rent (lower is cheaper)." },
            {
              label: "Rent-to-price",
              value: rentToPrice == null ? "—" : `${rentToPrice.toFixed(2)}%`,
              hint: "Monthly rent ÷ price — the 1% rule of thumb.",
            },
          ];
          return (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  title={c.hint}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                >
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-bold tabular-nums text-foreground">{c.value}</span>
                </span>
              ))}
            </div>
          );
        })() : null}

        {/* Appreciation-play context banner - reframes a deal whose
            year-1 cards read uniformly red (negative cash flow, sub-1
            DSCR) but which pays off after-tax and projects a strong
            10-year total return. Sourced from the BASE result + the same
            exit-scenario engine as the Screening Index, so it never contradicts
            them. Does NOT alter the year-1 facts above - it explains them. */}
        {appreciationPlay && result && !deferredWhatIfState?.isAdjusted ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-[var(--brand-green)]">
              <TrendingUp className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--brand-green)]">
                Long-term projection differs from the year-1 operating result
              </p>
              <p className="text-xs leading-relaxed text-foreground/70">
                Year-1 cash flow is negative because of the high leverage, but after the
                year-1 tax effect (depreciation + deductible interest, net of tax on the
                rental income) it runs about{" "}
                <strong className="text-foreground">
                  +${Math.round(result.afterTaxCF).toLocaleString()}/mo
                </strong>
                , and the projected 10-year total return is{" "}
                <strong className="text-foreground">
                  ~{Math.round(annualizedReturnPct ?? 0)}%/yr
                </strong>{" "}
                (modeled appreciation + loan paydown). This projection depends on the stated
                growth and exit assumptions; it does not offset the year-1 shortfall or establish
                that the property is a suitable investment.
              </p>
            </div>
          </div>
        ) : null}

        {/* Secondary metrics - everything not in the lens's primary 3,
            collapsed by default so the first read stays uncrowded. One tap
            reveals the full metric set. */}
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ChevronRight aria-hidden className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
            Show all metrics
            <span className="h-px flex-1 bg-border" />
          </summary>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {secondaryMetricKeys.map((k) => metricTiles[k])}
          </div>
        </details>
        </section>

        <section aria-labelledby="risks-section-title" className="space-y-3 pt-2">
          <h2 id="risks-section-title" className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
            {deferredWhatIfState?.isAdjusted ? "Base risks and verification" : "Risks and verification"}
          </h2>
          {result && values && !isLoading && !strategyLeadsOutput ? (
            <>
              <DealDriverInsight values={values} result={result} marketRentEstimate={marketRentEstimate} />
              <AssumptionImpactCard values={values} />
            </>
          ) : null}
        </section>

        {/* Stress-test tools - collapsed by default so the first read of the
            Overview is calm (verdict + numbers). One click reveals the live
            what-if sliders + the "what would make it Solid" targets. Closing
            the panel resets any what-if adjustment so the headline cards
            always return to the actual deal. */}
        {result && values ? (
          <section aria-labelledby="downside-section-title" className="space-y-3 pt-2">
          <h2 id="downside-section-title" className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
            Downside scenario
          </h2>
          <details
            className="group"
            onToggle={(e) => {
              const open = (e.currentTarget as HTMLDetailsElement).open;
              setWhatIfOpen(open);
              if (!open) setWhatIfState(null);
            }}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-2xl border border-primary/20 bg-[var(--brand-blue-light)] px-4 py-3 transition-colors hover:border-primary/40">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
                <SlidersHorizontal className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  Play with the numbers
                </span>
                <span className="block text-xs text-muted-foreground">
                  Drag the levers - or tap Worst case - and watch the screening result move, live.
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              />
            </summary>
            <div className="mt-2 space-y-3">
              <WhatIfSliders
                key={whatIfOpen ? "open" : "closed"}
                values={values}
                baseResult={result}
                onStateChange={setWhatIfState}
              />
              {/* Survivability readout - renders whenever ANY stress is
                  active (worst-case preset or a hand-dragged slider) and
                  answers "does it still cash-flow?" in plain English.
                  Reads the same deferred state as the metric tiles so the
                  two can never disagree mid-drag. Free for everyone. */}
              {deferredWhatIfState?.isAdjusted ? (
                <StressSurvivabilityCard
                  base={result}
                  stressed={deferredWhatIfState.result}
                  adjustmentLabel={formatAdjustmentLabel(
                    deferredWhatIfState.rentPct,
                    deferredWhatIfState.pricePct,
                    deferredWhatIfState.ratePp,
                    deferredWhatIfState.vacancyPp
                  )}
                />
              ) : null}
            </div>
          </details>
          </section>
        ) : null}
      </div>
      </ResultsRegionOrFragment>

      {/* REGION 3 · WHY THIS NUMBER — deliberately AFTER "The numbers".
          The reader sees the metrics first, then the reasoning that
          explains them; the justification lands better once the figures
          it refers to are already on screen. */}
      {decisionFirst && !strategyLeadsOutput && exactOfferCeiling ? (
        /* REGION 2 · WHY THIS NUMBER — the reasoning paragraph, the risk
           bullets, the make-your-price-work inverse, and the ranked
           drivers, behind ONE collapsed disclosure. Previously four
           separate top-level blocks that each restated the conclusion. */
        <ResultsRegion
          id="why-this-number"
          question="Why this number"
          payoff="The reasoning, the risks, and what would have to change"
          openEvent="why_this_number_opened"
        >
          <div className="space-y-4">
            {/* RESTORED: this panel lived inside MaxOfferCard and vanished
                from the DOM when the Decision-tier merge suppressed that
                card. It is the answer to "but what if I still want this
                house at this price". */}
            {/* Pro-gated: this solve lived inside MaxOfferCard, which only
                ever rendered under canUseMaxOffer. Restoring it ungated
                leaked the required-rent / required-rate answer to free. */}
            {exactOfferCeiling ? (
              <MakePriceWorkCard
                currentPrice={Number(values?.purchasePrice ?? 0)}
                result={exactOfferCeiling.makePriceWork}
              />
            ) : null}
          </div>
        </ResultsRegion>
      ) : null}


      {/* Sale & rent comps moved into the ledger below ("Check rent
          against the market" row) - Phase 5. The card itself is
          unchanged: keepMounted so its saved-comps mount fetch and
          on-demand pull-on-click economics are identical. */}

      {/* Free-tier prompt - shows ONE card, not two stacked.
          Decision tree:
            - Anonymous user → SignupPromptCard (cheap "save this" ask).
              Signing up is the lower-friction win; we don't double-up
              with a Pro pitch on top of it.
            - Signed-in free users already saw the deal-specific Offer Ceiling
              upgrade moment directly after the answer above.
            - Pro user → nothing renders here.
          Previously both rendered for anonymous users, which buried
          the Pro pitch under the signup ask. */}
      {result && !isLoading && !isAuthenticated && (
        <SignupPromptCard
          address={values?.address}
          isAuthenticated={isAuthenticated}
          onPrepareSaveIntent={() =>
            onPrepareAuthSave(adoptedMaoTarget, adoptedMaoTargetSource)
          }
        />
      )}
      {/* Retention: when a signed-in user has a saved deal on screen, offer
          the rate-alert opt-in right where the intent is, instead of burying
          it in /settings. Self-hides if already enabled or the schema
          migration isn't applied. Sends are governed by the send-rate-alerts
          cron (RATE_ALERTS_MODE) — this only captures the consent. */}
      {result && !isLoading && isAuthenticated && isSaved && (
        <RateAlertsToggle variant="inline" />
      )}

      {/* THE LEDGER (Phase 5) - the results tab bar + tab panels converted
          into independent MULTI-OPEN accordion rows (opening one never
          closes a sibling), plus the on-demand cards (comps, Deal Q&A,
          notes) that joined the ledger as rows. Row ids ARE the old
          AnalysisDashboardTab ids and each row hosts the EXACT panel its
          tab hosted: same entitlement gates (a locked row opens to the
          same ProFeaturePreview / ProInlineGate the locked tab showed),
          same lazy mount-on-first-open economics (recharts chunks +
          snapshot server actions still fire on first open, never on page
          load). Closed, each row carries one truthful summary line so the
          shut page reads as an executive summary. The old "Details"
          landmark strip retired - the hero/ledger boundary IS the
          landmark now. */}
      {/* REGION 4 · GO DEEPER — amortization, projections, tax, exits,
          BRRRR/flip, stress test, comps. One entry point, reachable from
          near the top, instead of eight stacked top-level rows. */}
      <ResultsRegionOrFragment
        enabled={decisionFirst}
        id="go-deeper"
        question="Go deeper"
        payoff="Amortization, projections, tax, exits, stress tests, comps"
        openEvent="go_deeper_opened"
      >
      <section aria-labelledby="long-term-section-title" className="space-y-3">
      <h2 id="long-term-section-title" className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
        {deferredWhatIfState?.isAdjusted ? "Base long-term analysis" : "Long-term analysis"}
      </h2>
      <DrillLedger label="Deeper analysis">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <DrillRow
              key={tab.id}
              id={tab.id}
              title={tab.label}
              icon={<Icon className="size-4" />}
              summary={rowSummaries[tab.id]}
              locked={tab.isPro && !tabEntitlements[tab.id]}
              open={openRows[tab.id]}
              onOpenChange={(open) => setRowOpen(tab.id, open)}
            >
              {tab.id === "cash-flow" && (
                <CashFlowTab
                  result={result}
                  isLoading={isLoading}
                  values={values}
                  isPro={canUseStrategies || canUseSensitivity || canUseProjections}
                />
              )}
              {tab.id === "projections" && !canUseProjections && (
                <ProFeaturePreview kind="projections" onUpgrade={goToBilling} result={result} values={values} />
              )}
              {tab.id === "projections" && canUseProjections && projectionSource && (
                <TenYearProjectionsPanel source={projectionSource} />
              )}
              {tab.id === "projections" && canUseProjections && !projectionSource && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Run the analysis to see the 10-year projection.
                </div>
              )}
              {tab.id === "tax-strategy" && !canUseTaxStrategy && (
                <ProFeaturePreview kind="tax-strategy" onUpgrade={goToBilling} result={result} values={values} />
              )}
              {tab.id === "tax-strategy" && canUseTaxStrategy && taxStrategySource && (
                <TaxStrategyPanel source={taxStrategySource} />
              )}
              {tab.id === "tax-strategy" && canUseTaxStrategy && !taxStrategySource && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Run the analysis to see the illustrative tax-impact view.
                </div>
              )}
              {tab.id === "exit-scenarios" && !canUseExitScenarios && (
                <ProFeaturePreview kind="exit-scenarios" onUpgrade={goToBilling} result={result} values={values} />
              )}
              {tab.id === "exit-scenarios" && canUseExitScenarios && exitScenarioSource && (
                <ExitScenariosPanel source={exitScenarioSource} />
              )}
              {tab.id === "exit-scenarios" && canUseExitScenarios && !exitScenarioSource && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Run the analysis to see exit scenarios.
                </div>
              )}
              {tab.id === "strategies" && !canUseStrategies && (
                <ProFeaturePreview kind="strategies" onUpgrade={goToBilling} result={result} values={values} />
              )}
              {tab.id === "strategies" && canUseStrategies && (
                <StrategiesPanel values={values} result={result} onApplyRehab={onApplyRehab} currentRehabBudget={currentRehabBudget} />
              )}
              {/* Stress Test row — the paid Offer Ceiling is promoted directly
                  beneath the verdict above. This row now focuses on downside
                  sensitivity so the same answer never renders twice. */}
              {tab.id === "stress-test" && (
                <div className="space-y-4">
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
            </DrillRow>
          );
        })}

        {/* Sale & rent comps - on-demand external enrichment (RentCast).
            Paid + address gated; pulls only on click (API cost control);
            self-hides if the provider isn't configured. keepMounted: the
            card was always mounted pre-ledger, so its saved-comps mount
            fetch and its Q&A onDataChange report-up keep firing exactly
            as before - the row only changes what's VISIBLE. The row shell
            mirrors the card's own enabled gate (authed + address) so a
            header never fronts a card that renders nothing. */}
        {isAuthenticated && values?.address && !compsUnavailable ? (
          <DrillRow
            id="comps"
            title="Check rent against the market"
            icon={<Search className="size-4" />}
            summary={rowSummaries.comps}
            open={openRows.comps}
            onOpenChange={(open) => setRowOpen("comps", open)}
            keepMounted
          >
            <PropertyCompsCard
              enabled={Boolean(isAuthenticated)}
              address={values.address}
              propertyType={values.propertyType}
              bedrooms={values.bedrooms ?? null}
              bathrooms={values.bathrooms ?? null}
              squareFootage={values.sqft ?? null}
              currentRent={values.monthlyRent ?? null}
              currentPrice={values.purchasePrice ?? null}
              savedDealId={savedDealId}
              onApply={onApplyComps}
              onDataChange={setCompsQaData}
              onUnavailableChange={setCompsUnavailable}
            />
          </DrillRow>
        ) : null}

        {/* The 'Where these numbers came from' and 'Ask about this deal'
            ledger rows were removed by founder decision 2026-08-17 (low
            utility). Provenance still lives on each input chip and in the
            enrichment receipt; the Deal Q&A server action remains but has
            no mount. */}
        {/* Deal notes - last row, saved deals only. keepMounted so the
            panel's first-mount notes fetch still fires when the saved
            deal loads (not on first row open), exactly as before.
            Due-diligence + documents live in the dashboard deal
            workspace (/dashboard/saved-analyses/[id]). */}
        {isExistingSavedDeal && savedDealId ? (
          <DrillRow
            id="notes"
            title="Notes"
            icon={<NotebookPen className="size-4" />}
            summary={rowSummaries.notes}
            open={openRows.notes}
            onOpenChange={(open) => setRowOpen("notes", open)}
            keepMounted
          >
            <DealNotesPanel savedDealId={savedDealId} />
          </DrillRow>
        ) : null}
      </DrillLedger>
      </section>
      </ResultsRegionOrFragment>
    </div>
  );
}

const proPreviewCopy: Record<ProPreviewKind, { title: string; description: string; metrics: string[] }> = {
  projections: {
    title: "10-Year Projections",
    description: "Unlock long-term cash flow, after-tax projections, and income trends.",
    metrics: ["Year 10 Cumulative CF", "Best Annual After-Tax CF", "10-Year After-Tax Cash Flow"],
  },
  "tax-strategy": {
    title: "Illustrative Tax Impact",
    description: "Unlock modeled taxable rental income, depreciation, mortgage interest, and tax impact at the entered marginal rate.",
    metrics: ["Year 1 Taxable Rental Income", "Year 1 Modeled Tax Impact", "10-Year Modeled Tax Impact"],
  },
  "exit-scenarios": {
    title: "Exit Scenarios",
    description: "Unlock equity growth, sale timing, profit breakdowns, and ROI scenarios.",
    metrics: ["Highest Modeled Profit", "Year 5 Profit", "Total ROI"],
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
  values,
}: {
  kind: ProPreviewKind;
  onUpgrade: () => void;
  /**
   * The user's actual computed analysis. Optional so the component
   * still renders cleanly in any context that doesn't have a result
   * yet (defensive - should always be passed from the dashboard).
   * When present, the 3 metric tiles render with the user's REAL
   * deal numbers rather than the generic $48,260 placeholder that
   * made the gate feel like a generic ad. Personalizing these
   * numbers turns the preview into a "here's exactly what YOUR deal
   * would show" CTA - much higher converting.
   *
   * Accepts null because the call sites pass the page-level
   * `analysisResult` state which is `AnalysisResult | null` before
   * the first Calculate click.
   */
  result?: AnalysisResult | null;
  /** Form values — needed to recompute exit scenarios with the same inputs
   *  the Pro panel uses. Optional/null-safe like `result`. */
  values?: InvestmentFormValues | null;
}) {
  const copy = proPreviewCopy[kind];
  const bars = [18, 28, 42, 55, 70, 88, 104, 122, 142, 164];

  // The tiles promise "what YOUR deal would show" — so they come from the
  // SAME engines the paid panels render (embedded tenYearProjection /
  // taxStrategyYears + the exit-scenario builder), never proxy arithmetic.
  // Null (no result, or a kind like strategies whose outputs need inputs
  // the user hasn't given yet) falls through to the generic placeholder.
  const previewValues = buildProPreviewValues(kind, result, values);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none space-y-5 blur-[3px] opacity-70">
        <div className="grid gap-3 md:grid-cols-3">
          {copy.metrics.map((metric, index) => {
            const tileValue = previewValues
              ? previewValues[index]!
              : index === 0 && kind === "exit-scenarios"
                ? "Year 10"
                : "$48,260";
            return (
              <div key={metric} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {metric}
                </p>
                {/* Real numbers can be negative — don't tint a loss green. */}
                <p
                  className={cn(
                    "mt-2 text-2xl font-extrabold",
                    tileValue.startsWith("-")
                      ? "text-[var(--metric-negative)]"
                      : "text-[var(--metric-positive)]"
                  )}
                >
                  {tileValue}
                </p>
              </div>
            );
          })}
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
          <h3 className="text-lg font-extrabold text-foreground">
            {kind === "projections"
              ? "See what this deal could produce over 10 years"
              : kind === "tax-strategy"
                ? "See the estimated after-tax picture"
                : kind === "exit-scenarios"
                  ? "Know when the exit changes the outcome"
                  : "Test the strategy before committing rehab capital"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
          <Button className="mt-4 rounded-full font-semibold" onClick={onUpgrade}>
            Unlock this decision view
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
 * flow. But rent grows ~3%/yr and expenses ~2%/yr - so a deal that
 * year-1 cash flow can change materially as rent and expenses grow over
 * time. Most investors think in 10-year terms, not month 1, and
 * burying that progression inside the Pro 10-Year Projections tab
 * meant free-tier users never saw it.
 *
 * Renders three pillars (Y1 / Y5 / Y10) using monthly NCF derived
 * from result.tenYearProjection (which calculateAnalysis already
 * computes for free). No entitlement gate - this is a free-tier
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

  // Growth ratio between Y1 and Y10 - surfaced as a single sentence
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
      return `Cash flow compresses over the hold period - review your rent/expense growth assumptions.`;
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

// NetCashFlowCard was deleted - its monthly/annual/after-tax readouts
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
  // Default OPEN - users explicitly said they "love all the information"
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
        Run the analysis to see your cash flow.
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
      {/* Cash flow over time - Y1/Y5/Y10 monthly NCF strip. */}
      <CashFlowOverTimeStrip result={result} />
      {/* Where the rent goes - single-glance waterfall. Sits below
          the time strip and above the optional 3-col breakdown so
          the reading order is: how it grows → where it goes → line
          items (collapsible). */}
      <CashFlowWaterfall result={result} />
      {/* Collapsible line-item breakdown - Monthly Income, Operating
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
            Full breakdown
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
              ${Math.round(result.loanAmount).toLocaleString()}
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
                  for principal and interest only…") - internal context,
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
          <div className="flex justify-between text-sm mb-1">
            <div>
              <p className="text-muted-foreground">Closing Costs</p>
              <p className="text-xs text-muted-foreground">{fmtPct(result.closingCostsPct)}</p>
            </div>
            <span className="font-semibold text-foreground">
              ${result.closingCosts.toLocaleString()}
            </span>
          </div>
          {/* Up-front rehab + STR furnishing are in totalCashRequired too, so
              itemize the residual or the lines won't sum to Total Investment. */}
          {(() => {
            const upfrontExtra = Math.max(
              0,
              Math.round(result.totalCashRequired - result.downPayment - result.closingCosts)
            );
            return upfrontExtra > 0 ? (
              <div className="flex justify-between text-sm mb-3">
                <p className="text-muted-foreground">Rehab / Furnishing</p>
                <span className="font-semibold text-foreground">
                  ${upfrontExtra.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="mb-2" />
            );
          })()}
          <div className="bg-primary rounded-xl p-4 flex justify-between items-center">
            <p className="text-sm font-semibold text-primary-foreground">
              Total Investment
            </p>
            <p className="text-xl font-extrabold text-primary-foreground">
              ${result.totalCashRequired.toLocaleString()}
            </p>
          </div>
          {/* Lender-reserves note - DISPLAY-ONLY arithmetic over existing
              results (no calc/verdict change). Lenders on financed deals
              typically require 2-6 months of the full housing payment
              (PITI + PMI + HOA) in reserves ON TOP of down payment +
              closing, which blindsides new investors who budgeted only
              the Total Investment above. Hidden on cash purchases
              (monthlyPayment <= 0) - no lender, no reserves. */}
          {result.monthlyPayment > 0 &&
            (() => {
              const pitiMonthly =
                result.monthlyPayment +
                result.propertyTax +
                result.insurance +
                result.pmiMonthly +
                result.hoa;
              const reservesLow = Math.round(pitiMonthly * 2);
              const reservesHigh = Math.round(pitiMonthly * 6);
              return (
                <p className="mt-2 text-xs text-muted-foreground">
                  Lenders typically also want ~${reservesLow.toLocaleString()}–$
                  {reservesHigh.toLocaleString()} in reserves (2–6 months of PITI) — plan
                  cash beyond closing.
                </p>
              );
            })()}
        </div>
      </div>
      </div>
      )}
      {/* Loan amortization - collapsible year-by-year view. Free
          feature, opt-in (click-to-expand). Self-hides on cash
          purchases since there's no debt to amortize. */}
      <LoanAmortizationView result={result} />
      {/* Compare financing scenarios - Pro feature. Self-hides on
          cash purchases. Click-to-open keeps default surface clean. */}
      <MortgageScenarioCompare result={result} values={values} isPro={isPro} />
    </div>
  );
}
