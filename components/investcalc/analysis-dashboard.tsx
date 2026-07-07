"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  TrendingUp,
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
  SlidersHorizontal,
  MoreHorizontal,
  X,
  Search,
  MessageCircle,
  NotebookPen,
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
import { MaxOfferCard } from "@/components/investcalc/max-offer-card";
import { AssumptionImpactCard } from "@/components/investcalc/assumption-impact-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import { ProInlineGate } from "@/components/investcalc/pro-inline-gate";
import { DealQaPanel } from "@/components/investcalc/deal-qa-panel";
import { DealSummaryCard } from "@/components/investcalc/deal-summary-card";
import { BuyBoxVerdictCard } from "@/components/investcalc/buy-box-verdict-card";
import { nextActionForDeal } from "@/lib/next-action";
import { getVerdictNarrative } from "@/lib/verdict";
import { DealDriverInsight } from "@/components/investcalc/deal-driver-insight";
import { StrategyOutcomeCard } from "@/components/investcalc/strategy-outcome-card";
import { StrategyLensOutcomeCard } from "@/components/investcalc/strategy-lens-outcome-card";
import type { InvestorStrategy } from "@/lib/investor-strategies";
import { deriveStateFromAddress } from "@/lib/buy-box";
import {
  buildCompsQaContext,
  buildProjectionQaContext,
  type DealQaBuyBoxReport,
  type DealQaExtraContext,
} from "@/lib/deal-qa-context";
import {
  buildMaoTarget,
  buyBoxContributesToMaoTarget,
  describeMaoTarget,
} from "@/lib/mao-targets";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { PropertyCompsCard } from "@/components/investcalc/property-comps-card";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import type { DataConfidence } from "@/lib/data-confidence";
import { REPORT_MODES, type ReportMode } from "@/lib/pdf-export-constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, Target } from "lucide-react";
import { MomentOfValueUpsell } from "@/components/marketing/moment-of-value-upsell";
import { SignupPromptCard } from "@/components/marketing/signup-prompt-card";
import { RateAlertsToggle } from "@/components/settings/rate-alerts-toggle";
import { CashFlowWaterfall } from "@/components/investcalc/cash-flow-waterfall";
import { MortgageScenarioCompare } from "@/components/investcalc/mortgage-scenario-compare";
import { LoanAmortizationView } from "@/components/investcalc/loan-amortization-view";
import { DealNotesPanel } from "@/components/investcalc/deal-notes-panel";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import { AnswerHeroCard } from "@/components/investcalc/answer-hero-card";
import { DrillRow } from "@/components/investcalc/drill-row";
import { DrillLedger } from "@/components/investcalc/drill-ledger";
import {
  MetricsBand,
  buildMetricTiles,
  getSecondaryMetricKeys,
} from "@/components/investcalc/metrics-band";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import type { ExitScenarioInput, ExitScenarioYear } from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";
import { isExtremeAnnualizedRoi } from "@/lib/extreme-value-format";
import { cn } from "@/lib/utils";
import type { DealScoreActionResult } from "@/app/actions/deal-score";
import {
  APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT,
  computeTenYearAnnualizedReturnPct,
  DEAL_STRATEGY_STORAGE_KEY,
  type DealStrategy,
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
  onSaveDeal: () => void | Promise<void>;
  onCompareDeals: () => void | Promise<void>;
  onExportPdf: (mode?: ReportMode) => void | Promise<void>;
  onNewAnalysis: () => void | Promise<void>;
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
  /**
   * True when ANTHROPIC_API_KEY is configured (passed down from the
   * page). Controls whether the Deal Q&A panel renders at all - the
   * per-user limits are enforced server-side in the action.
   */
  dealQaEnabled?: boolean;
  saveDealLimitReached?: boolean;
  /** Live data-confidence for the current analysis (computed in the analyzer
   *  from enrich-property provenance). Null hides the badge. */
  dataConfidence?: DataConfidence | null;
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
  /**
   * Results-side AssumptionsSourceStrip, rendered by investcalc-page (it
   * needs the form's provenance) and passed in here so it can live inside
   * the ledger's "Where these numbers came from" row (Phase 5 blueprint —
   * a prop on AnalysisDashboard, never on InvestCalcPage, so the
   * two-homepage rule holds). Until a caller passes it, the strip simply
   * stays where it renders today and this row doesn't exist.
   */
  assumptionsSlot?: ReactNode;
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
 * jumps, StrategyOutcomeCard's onJumpToTab, the input-tab clicks and
 * the strategy primaryTab lead — keeps working unchanged. The rest are the
 * always-visible cards that joined the ledger as rows (comps, assumptions,
 * Deal Q&A, notes).
 */
export type AnalysisLedgerRowId =
  | AnalysisDashboardTab
  | "comps"
  | "assumptions"
  | "deal-qa"
  | "notes";

// The six analysis rows, in the exact order the tabs had. `icon` is the
// same glyph each mobile tab carried (every row keeps a distinct glyph).
const TABS: { id: AnalysisDashboardTab; label: string; icon: LucideIcon; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", icon: TrendingUp, isPro: false },
  { id: "projections", label: "10-Year Projections", icon: ArrowUpRight, isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", icon: FileText, isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", icon: Building2, isPro: true },
  // Renamed from "Strategies" (Jun 2026 UX pass) - vague label for the
  // not-Excel-power-user audience; the row IS the BRRRR + fix-and-flip
  // + rehab analyzers, so say that.
  { id: "strategies", label: "BRRRR & Flip", icon: Target, isPro: true },
  // Stress Test consolidates Max Allowable Offer + Sensitivity Grid —
  // both Pro features that previously rendered as always-visible cards
  // between the metrics row and the tab bar. Keeping them in one row
  // keeps the headline scroll calmer without losing the features.
  { id: "stress-test", label: "Stress Test", icon: Activity, isPro: true },
];

const ALL_LEDGER_ROW_IDS: AnalysisLedgerRowId[] = [
  ...TABS.map((t) => t.id),
  "comps",
  "assumptions",
  "deal-qa",
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
  onApplyComps,
  onApplyRehab,
  currentRehabBudget,
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
  canUseMaxOffer = false,
  canUseSensitivity = false,
  canUseStrategies = false,
  isSampleProPreview = false,
  dealQaEnabled = false,
  saveDealLimitReached = false,
  dataConfidence = null,
  activeTab: activeTabProp,
  activeTabNonce = 0,
  activeStrategy = null,
  persistedActionsBlockHint,
  assumptionsSlot,
}: AnalysisDashboardProps) {
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
  }, []);
  const setRowOpen = useCallback((id: AnalysisLedgerRowId, open: boolean) => {
    setOpenRows((prev) => (prev[id] === open ? prev : { ...prev, [id]: open }));
  }, []);
  // KEPT NAME + SIGNATURE from the tab era so no caller churns:
  // "switch to tab X" is now "open row X and scroll it into view".
  // Consumers: StrategyOutcomeCard's onJumpToTab, the metric-tap jump
  // wiring (METRIC_JUMP_TARGETS via handleMetricJump), and anything
  // else that pointed the results at a section.
  const setActiveTab = useCallback(
    (id: AnalysisDashboardTab) => {
      openRow(id);
      requestAnimationFrame(() => {
        document
          .getElementById(`analysis-tab-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  // MAO solved from the current form values, and the exit-scenario return
  // summary. Absent pieces are simply omitted from the AI context.
  const [buyBoxQaReport, setBuyBoxQaReport] = useState<DealQaBuyBoxReport | null>(null);
  const [compsQaData, setCompsQaData] = useState<PropertyEnrichment | null>(null);
  // Comps provider NOT_CONFIGURED on this deployment: the card self-hides,
  // so the ledger row shell must hide with it (a header must never front
  // an empty row). Sticky for the session — the provider won't appear
  // mid-session.
  const [compsUnavailable, setCompsUnavailable] = useState(false);
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
  // this - projections, tax strategy, exit scenarios, deal score, and
  // every Pro panel stay anchored to the saved/base analysis. Sliders
  // are a "what-if peek" on headline numbers, not a full reanalysis.
  const [whatIfState, setWhatIfState] = useState<WhatIfState | null>(null);
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
  // Holistic context for the Overview. Computed from the BASE result (not
  // the what-if state) so dragging sliders doesn't flicker the banner.
  // Reuses the same exit-scenario engine as the Deal Score + PDF.
  const annualizedReturnPct = useMemo(
    () => (result && values ? computeTenYearAnnualizedReturnPct(values, result) : null),
    [result, values]
  );
  const appreciationPlay =
    !!result && isAppreciationPlayDeal(result, propertyType, annualizedReturnPct);

  // ── Deal Q&A grounding context (see the state block above) ──────────
  // MAO: only when the user can see the Stress Test solver (Pro / sample
  // preview) so free-tier answers can't leak a gated number. Basis follows
  // lib/mao-targets: the user's buy-box thresholds when set, else the
  // canonical default floor — always labeled. Memoized on the BASE
  // result/values (never the what-if sliders), matching the Deal Score.
  const maoQaContext = useMemo(() => {
    if (!values || !result || !canUseMaxOffer) return null;
    const isCashPurchase = result.monthlyPayment <= 0;
    const thresholds = buyBoxQaReport?.maoThresholds ?? null;
    const target = buildMaoTarget(thresholds, { isCashPurchase });
    const mao = calculateMaxAllowableOffer(values, target);
    if (!mao) return null;
    return {
      maxOffer: mao.maxPrice,
      basis: describeMaoTarget(target),
      fromBuyBox: buyBoxContributesToMaoTarget(thresholds, { isCashPurchase }),
    };
  }, [values, result, canUseMaxOffer, buyBoxQaReport]);
  // Exit-engine return summary - feeds BOTH the metrics band's folded-in
  // IRR / equity-multiple / total-return members and the Deal Q&A
  // projection context below (exitScenarioSource is already
  // entitlement-gated by the caller).
  const returnSummary = useMemo(
    () =>
      exitScenarioSource
        ? computeReturnSummaryFromExitYears(exitScenarioSource.initialYears)
        : null,
    [exitScenarioSource]
  );
  // 10-yr headline from the same exit series the returns members render.
  const projectionQaContext = useMemo(
    () => buildProjectionQaContext(returnSummary),
    [returnSummary]
  );
  const compsQaContext = useMemo(
    () => (compsQaData ? buildCompsQaContext(compsQaData) : null),
    [compsQaData]
  );
  const dealQaContext = useMemo<DealQaExtraContext | undefined>(() => {
    const ctx: DealQaExtraContext = {
      ...(buyBoxQaReport ? { buyBox: buyBoxQaReport.context } : {}),
      ...(maoQaContext ? { mao: maoQaContext } : {}),
      ...(projectionQaContext ? { projection: projectionQaContext } : {}),
      ...(compsQaContext ? { comps: compsQaContext } : {}),
    };
    return Object.keys(ctx).length > 0 ? ctx : undefined;
  }, [buyBoxQaReport, maoQaContext, projectionQaContext, compsQaContext]);
  // Investor lens - owned HERE (the common parent of the Deal Score + the
  // metric cards) so the metric ordering reacts when it changes. Persisted
  // across deals so a cash-flow investor isn't reset to Balanced each analysis.
  // The lens only reorders which metrics LEAD (see PRIMARY_METRICS); the Deal
  // Score itself is lens-free (canonical Balanced) on every surface, so the
  // headline number never diverges between the analyzer and the dashboard/
  // My Deals/compare/PDF.
  const [strategy, setStrategy] = useState<DealStrategy>("balanced");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DEAL_STRATEGY_STORAGE_KEY);
      if (saved === "cash-flow" || saved === "balanced" || saved === "appreciation") {
        setStrategy(saved);
      }
    } catch {
      // private mode - default Balanced
    }
  }, []);
  const pickStrategy = (next: DealStrategy) => {
    setStrategy(next);
    try {
      window.localStorage.setItem(DEAL_STRATEGY_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };
  const router = useRouter();
  // Send the user back to the calculator after auth (?next=/) so the
  // auto-saved form draft restores their analysis instead of landing them on
  // a blank homepage with their work seemingly gone. The pending-save-intent
  // flag upgrades that restore: because the user explicitly clicked SAVE
  // before auth, the calculator auto-runs their analysis on return and points
  // them back at Save — completing the click they already made instead of
  // asking them to redo it (goToLogin's only caller is the Save button).
  const goToLogin = () => {
    setPendingSaveIntent();
    router.push("/auth/login?next=/");
  };
  // Auth-aware upgrade routing (BROWSER-1 / STRATEGY-UPSELL-LOGIN-DEADEND):
  // /profile is auth-gated and server-redirects anonymous users to
  // /auth/login with NO ?next param, so an anon "Get Pro" / "Start your
  // 3-day free trial" tap dead-ended at a login wall with the billing
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
    // Stress Test tab houses Max Allowable Offer + Sensitivity Grid.
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
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    void onSaveDeal();
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
  // consistent with the Deal Score + verdict above it. Same lib that drives
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

  // Lens-curated metric tiles - built once (in metrics-band.tsx, where the
  // per-metric benchmark logic now lives) and shared between the metrics
  // band's primary row and the "Show all metrics" secondary fold below,
  // so the two can never diverge. Tap-to-jump wiring rides along.
  const metricTiles = buildMetricTiles({
    displayResult,
    result,
    isLoading,
    address: values?.address,
    propertyType,
    annualizedReturnPct,
    onMetricSelect: handleMetricJump,
  });
  const secondaryMetricKeys = getSecondaryMetricKeys(strategy);

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
        ? `~$${annualTaxSavings.toLocaleString()}/yr in tax savings on paper`
        : "See depreciation, interest & what you'd keep",
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
      : "Stress it — find your max offer and worst case",
    comps: compsQaData
      ? "Comps pulled — see how your rent & price compare"
      : "Not run yet — pull comps for this address",
    assumptions: "Every source behind these numbers — and how to change them",
    "deal-qa": "Ask anything about this deal",
    notes: "Your private notes on this deal",
  };

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
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      {/* Answer hero - the ONE card that leads the results (Phase 2:
          answer-hero-card.tsx composes the Recommendation content, the Deal
          Score ring + breakdown, and the NextActionBanner footer). DOM-first,
          so the verdict-first mobile ordering is intrinsic and the old
          order-1/order-2 swap wrapper is retired. When a non-cash-flow
          strategy is active (Wholesale/BRRRR/Flip), StrategyOutcomeCard IS
          the hero - the same early swap as before, now top-level. */}
      {strategyLeadsOutput ? (
        activeStrategy && values ? (
          <StrategyOutcomeCard
            strategy={activeStrategy}
            values={values}
            result={result}
            canUseMaxOffer={canUseMaxOffer}
            canUseStrategies={canUseStrategies}
            onJumpToTab={setActiveTab}
            onUpgrade={goToBilling}
          />
        ) : null
      ) : (
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
        />
      )}

      {/* Strategy-lens outcome - makes the investor lens visibly DO something
          at the verdict: names the metrics that carry the deal for that
          investor type and how this deal does on them. Balanced (the default)
          renders nothing - invisible until a lens is actively chosen. BASE-
          result driven (matches the Deal Score + verdict); hidden while a
          strategy play leads the output (the lens tiles are hidden there too).
          Bands are display-only, in lib/strategy-lens-outcome. */}
      {result && !isLoading && !strategyLeadsOutput ? (
        <StrategyLensOutcomeCard
          strategy={strategy}
          result={result}
          annualizedReturnPct={annualizedReturnPct}
          isOwnerOccupant={propertyType === "owner-occupant"}
        />
      ) : null}

      {/* Action bar - split into two visually distinct elements:
          a lightweight identity strip ("what is this?") and a
          chunkier Quick Actions panel ("what can I do with it?").
          Previously these were nested inside the same rounded card,
          which gave the area a busy double-border feel. */}
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
                  : "This is a preview - click Save to persist this deal."
            }
          >
            {isSaved
              ? "Saved"
              : isExistingSavedDeal
                ? "Unsaved changes"
                : "Preview"}
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
                disabled={isSaving || isSaveLockedByPlan}
                title={saveLockedHint}
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
                onClick={() => void onExportPdf()}
                // Clickable for users WITHOUT the entitlement on purpose:
                // the click opens the Pro-vs-$5-one-time purchase dialog
                // (see PdfPurchaseDialog in investcalc-page). The isSaved
                // requirement only applies to entitled users - one-time
                // buyers are often anonymous and can't save at all.
                disabled={isExporting || (canExportPdf && !isSaved)}
                title={
                  canExportPdf && !isSaved
                    ? persistedActionsBlockHint ?? "Save this analysis before exporting PDF."
                    : !canExportPdf
                      ? "Get the lender-ready PDF - included with Pro, or $5 one-time."
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
                      disabled={isExporting}
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
                        disabled={isExporting}
                        onClick={() => void onExportPdf(m.id)}
                        className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="text-sm font-semibold text-foreground">{m.label}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{m.description}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : null}
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
              <ShareLinkButton values={values} savedDealId={savedDealId} />
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
                          disabled={isExporting}
                          onClick={() => {
                            setMoreActionsOpen(false);
                            void onExportPdf(m.id);
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
              {canCompareDeals ? (
                <p className="col-span-full px-1 pt-0.5 text-xs text-muted-foreground">
                  Screening several listings?{" "}
                  <Link
                    href="/dashboard/triage"
                    className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                  >
                    Triage them at once
                    <ArrowUpRight aria-hidden className="size-3" />
                  </Link>
                </p>
              ) : null}
        </div>
      </div>

      {/* "What decides this deal" - elevates the single biggest sensitivity
          driver (from the same engine as the Cash Flow tab's tornado) to a
          headline next to the verdict. Hidden during a strategy-led output
          (that has its own framing) and while loading. */}
      {result && values && !isLoading && !strategyLeadsOutput ? (
        <DealDriverInsight values={values} result={result} marketRentEstimate={marketRentEstimate} />
      ) : null}

      {/* Buy Box verdict - personalized "meets your buy box" line that
          complements the Deal Score above. Self-gates: only authenticated
          Pro users with an active Buy Box (≥1 criterion) ever see it.
          Evaluates the BASE result (not the what-if sliders), matching the
          Deal Score. */}
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
          onFitChange={setBuyBoxAnyPass}
          onQaContextChange={setBuyBoxQaReport}
        />
      ) : null}

      {/* Metrics band (Phase 2: metrics-band.tsx) - the lens-curated primary
          tiles with the 10-year-returns members folded in and the investor
          lens control in the band header. Secondary tiles stay below in
          "Show all metrics"; the interactive stress-test tools sit in a
          labeled group under all the numbers, so controls never crowd the
          answer (reading order: NUMBERS FIRST, TOOLS LAST).

          The cash-flow / CoC / cap-rate / DSCR / 10-yr-return tiles read
          from `displayResult` (= whatIfState.result when sliders are
          non-zero, else base result) so they react live to the
          stress-test sliders; the after-tax / annual-CF / tax-savings
          tiles read base `result` so Pro panels don't thrash on drags. */}
      <div className={cn("space-y-3", strategyLeadsOutput && "hidden")}>
        <MetricsBand
          tiles={metricTiles}
          strategy={strategy}
          onStrategyChange={pickStrategy}
          dataConfidence={dataConfidence}
          returnSummary={returnSummary}
          onMetricSelect={handleMetricJump}
        />

        {/* Quick-screen ratios investors use to triage at a glance: break-even
            occupancy (how much vacancy the deal can absorb before cash flow
            hits zero), GRM, and rent-to-price (the "1% rule"). Derived from the
            existing result — no new inputs. */}
        {result ? (() => {
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
            exit-scenario engine as the Deal Score, so it never contradicts
            them. Does NOT alter the year-1 facts above - it explains them. */}
        {appreciationPlay && result ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-[var(--brand-green)]">
              <TrendingUp className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--brand-green)]">
                Stronger than it looks - this is an appreciation play, not a losing deal.
              </p>
              <p className="text-xs leading-relaxed text-foreground/70">
                Year-1 cash flow is negative because of the high leverage, but after the
                depreciation + interest shield it runs about{" "}
                <strong className="text-foreground">
                  +${Math.round(result.afterTaxCF).toLocaleString()}/mo
                </strong>
                , and the projected 10-year total return is{" "}
                <strong className="text-foreground">
                  ~{Math.round(annualizedReturnPct ?? 0)}%/yr
                </strong>{" "}
                (appreciation + loan paydown). The monthly shortfall is the cost of low money
                down - confirm you can carry it and that your rent and appreciation assumptions
                hold.
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

        {/* Stress-test tools - collapsed by default so the first read of the
            Overview is calm (verdict + numbers). One click reveals the live
            what-if sliders + the "what would make it Solid" targets. Closing
            the panel resets any what-if adjustment so the headline cards
            always return to the actual deal. */}
        {result && values ? (
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
                  Drag the levers - or tap Worst case - and watch the verdict move, live.
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
              <BreakpointSuggestionCard values={values} result={result} />
            </div>
          </details>
        ) : null}
      </div>

      {/* Sale & rent comps moved into the ledger below ("Check rent
          against the market" row) - Phase 5. The card itself is
          unchanged: keepMounted so its saved-comps mount fetch and
          on-demand pull-on-click economics are identical. */}

      {/* Free-tier prompt - shows ONE card, not two stacked.
          Decision tree:
            - Anonymous user → SignupPromptCard (cheap "save this" ask).
              Signing up is the lower-friction win; we don't double-up
              with a Pro pitch on top of it.
            - Signed-in free user → MomentOfValueUpsell (deal-specific
              Pro pitch - they've already cleared signup, so it's time
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
          onExportPdf={onExportPdf}
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
                <ProFeaturePreview kind="projections" onUpgrade={goToBilling} result={result} />
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
                <ProFeaturePreview kind="tax-strategy" onUpgrade={goToBilling} result={result} />
              )}
              {tab.id === "tax-strategy" && canUseTaxStrategy && taxStrategySource && (
                <TaxStrategyPanel source={taxStrategySource} />
              )}
              {tab.id === "tax-strategy" && canUseTaxStrategy && !taxStrategySource && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Run the analysis to see the tax strategy view.
                </div>
              )}
              {tab.id === "exit-scenarios" && !canUseExitScenarios && (
                <ProFeaturePreview kind="exit-scenarios" onUpgrade={goToBilling} result={result} />
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
                <ProFeaturePreview kind="strategies" onUpgrade={goToBilling} result={result} />
              )}
              {tab.id === "strategies" && canUseStrategies && (
                <StrategiesPanel values={values} result={result} onApplyRehab={onApplyRehab} currentRehabBudget={currentRehabBudget} />
              )}
              {/* Stress Test row - Max Allowable Offer + Sensitivity Grid.
                  Each card independently respects its own entitlement: a
                  user could have unlocked one without the other (rare, but
                  possible if entitlements drift). Cards render as full
                  tools when entitled, or as ProInlineGate teasers when not. */}
              {tab.id === "stress-test" && (
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
                  {canUseMaxOffer ? <AssumptionImpactCard values={values} /> : null}
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

        {/* "Where these numbers came from" - the results-side assumptions
            strip, passed down from investcalc-page via assumptionsSlot
            (it needs the form's provenance so it can't render here).
            Renders only when a caller provides it. */}
        {assumptionsSlot ? (
          <DrillRow
            id="assumptions"
            title="Where these numbers came from"
            icon={<Info className="size-4" />}
            summary={rowSummaries.assumptions}
            open={openRows.assumptions}
            onOpenChange={(open) => setRowOpen("assumptions", open)}
            keepMounted
          >
            {assumptionsSlot}
          </DrillRow>
        ) : null}

        {/* Deal Q&A - grounded AI explainer, now a ledger row. Renders
            only when the page says the feature is configured (Anthropic
            key present). Free users get a few questions/day (server-
            enforced - the limit is untouched by the ledger). keepMounted
            so a typed-but-unsent question survives a collapse. */}
        {dealQaEnabled && result && values && !isLoading ? (
          <DrillRow
            id="deal-qa"
            title="Ask about this deal"
            icon={<MessageCircle className="size-4" />}
            summary={rowSummaries["deal-qa"]}
            open={openRows["deal-qa"]}
            onOpenChange={(open) => setRowOpen("deal-qa", open)}
            keepMounted
          >
            <div className="space-y-4">
              <DealSummaryCard values={values} context={dealQaContext} />
              <DealQaPanel values={values} context={dealQaContext} />
            </div>
          </DrillRow>
        ) : null}

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
}) {
  const copy = proPreviewCopy[kind];
  const bars = [18, 28, 42, 55, 70, 88, 104, 122, 142, 164];

  /**
   * Per-kind derivation of the 3 metric tile values from the user's
   * actual analysis. Conservative back-of-envelope numbers - meant to
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
      // 10yr cumulative cash flow (rough - ignores rent growth, OK for preview),
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
 * flow. But rent grows ~3%/yr and expenses ~2%/yr - so a deal that
 * cash-flows $749/mo today might be $1,420/mo by year 5 and $2,100/mo
 * by year 10. Most investors think in 10-year terms, not month 1, and
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
