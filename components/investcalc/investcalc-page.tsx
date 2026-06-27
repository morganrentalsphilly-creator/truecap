"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TrendingUp,
  FileText,
  Star,
  Lock,
  Calculator,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  investmentFormSchema,
  InvestmentFormValues,
  defaultValues,
  getDefaultUnitsForPropertyType,
  isValidRentalUnit,
  normalizeInvestmentFormSnapshot,
} from "@/lib/investcalc-schema";
import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { getDealTier, type DealTier } from "@/lib/verdict";
import { PropertyTypeSection } from "./property-type-section";
import { PropertyDetailsSection } from "./property-details-section";
import { SingleFamilyUnitSection } from "./single-family-unit-section";
import { MultiFamilyUnitsSection } from "./multi-family-units-section";
import { FinancingSection } from "./financing-section";
import { OperatingExpensesSection } from "./operating-expenses-section";
import { StrategyChips } from "./strategy-chips";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/starter-templates";
import { getStrategyByKey } from "@/lib/investor-strategies";
import { AnalyzerStepRail } from "./analyzer-step-rail";
import {
  computeAnalyzerSteps,
  isAnalyzerStepId,
  type AnalyzerStepId,
} from "@/lib/analyzer-steps";
import { readAnalyzerHandoff } from "@/lib/analyzer-handoff";
import { StickyCalculateBar } from "./sticky-calculate-bar";
import { AutosaveIndicator } from "./autosave-indicator";
import { AnalysisDashboard, type AnalysisDashboardTab } from "./analysis-dashboard";
import { AnalysisErrorBoundary } from "@/components/investcalc/analysis-error-boundary";
import { AssumptionsSourceStrip } from "@/components/investcalc/assumptions-source-strip";
import { PostAnalysisEmailPrompt } from "@/components/marketing/post-analysis-email-prompt";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { saveDealAction } from "@/app/actions/saved-analyses";
import { buildDataConfidence, type EnrichmentProvenanceInput } from "@/lib/data-confidence";
import type { ReportMode } from "@/lib/pdf-export-constants";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { addDealToCompareAction } from "@/app/actions/compare";
import { getDealScoreAction, type DealScoreActionResult } from "@/app/actions/deal-score";
import { trackAnalysisRunAction } from "@/app/actions/track-analysis-run";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  createOneTimePdfCheckoutAction,
  verifyOneTimePdfPaymentAction,
} from "@/app/actions/one-time-pdf";
import { PdfPurchaseDialog } from "@/components/investcalc/pdf-purchase-dialog";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { estimatePurchasePrice } from "@/lib/estimate-price";
import {
  HERO_ANALYZE_EVENT,
  HERO_ANALYZE_STORAGE_KEY,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";

/**
 * localStorage key for the deal stashed right before redirecting to the
 * one-time-PDF Stripe Checkout. Restored (and removed) when the user
 * returns with ?pdf_purchase=<session_id>. Same-browser assumption is
 * fine - Stripe redirects back in the same tab.
 */
const ONE_TIME_PDF_DRAFT_KEY = "truecap:one-time-pdf-draft";
import { enrichPropertyAction } from "@/app/actions/enrich-property";
import { getPropertyCompsAction } from "@/app/actions/property-comps";
import type { SelectedAddress } from "./address-autocomplete";
import type { TenYearProjectionInput, ProjectionYear } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
// `generateInvestmentPDF` is dynamic-imported inside the Export PDF
// handler - it pulls in jspdf + jspdf-autotable + chart.js (~130-150 KB
// gzipped). Static-importing here would ship all of that to every
// cold homepage visitor even though only ~1-2% click Export PDF.
// We still need the value-type `ReportData` at compile time, so import
// it as `import type` which is erased entirely at runtime.
import type { ReportData } from "@/lib/pdf-generator";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioInput,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import { trackConversion } from "@/lib/analytics/track-conversion";
import { trackEvent } from "@/lib/analytics";

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";
const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";
/**
 * Auto-save key for anonymous / walk-in form drafts. Mobile paid traffic
 * gets distracted constantly (phone rings, tab swap to text), and an
 * empty form on return is a guaranteed bounce. This key persists the
 * in-progress form across reloads / tab swaps so users can pick up
 * where they left off.
 *
 * Version-suffixed so future schema changes can bump the key and
 * gracefully ignore stale drafts instead of crashing on parse.
 */
const CALC_FORM_DRAFT_KEY = "truecap_calc_form_draft_v1";
/**
 * Debounce window for the draft write - long enough that we don't hit
 * localStorage on every keystroke, short enough that a phone interruption
 * after typing a few fields will still have persisted them. 400ms is the
 * sweet spot: imperceptible to humans, kind to mobile CPUs.
 */
const CALC_FORM_DRAFT_DEBOUNCE_MS = 400;
/**
 * Remembers whether the user opened the collapsible "advanced options"
 * (financing + operating expenses) block. Presence of this key means the
 * user has an explicit preference, which suppresses the one-time
 * auto-open-after-first-result nudge. Version-suffixed like the draft key.
 */
const CALC_ADVANCED_OPEN_KEY = "truecap_calc_advanced_open_v1";

/** Safely read the draft string without throwing in Safari private mode / disabled storage. */
function readCalcDraftRaw(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(CALC_FORM_DRAFT_KEY);
  } catch {
    return null;
  }
}

/** Safely write the draft. No-op if storage is unavailable / quota exceeded. */
function writeCalcDraftRaw(json: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(CALC_FORM_DRAFT_KEY, json);
  } catch {
    /* private-mode Safari, quota exceeded, etc. - drafts are best-effort */
  }
}

/** Safely remove the draft. */
function clearCalcDraftRaw(): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(CALC_FORM_DRAFT_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Map a user-defaults payload (from user_analysis_defaults.preferences)
 * onto the form's field shape. The user-defaults schema uses
 * `interestRatePct` while the form schema uses `interestRate` - handle
 * that here so callers don't have to know about the mismatch. Returns
 * a sparse object; only keys with finite numeric values are written.
 */
function mapUserDefaultsToForm(
  userDefaults: Record<string, number> | null | undefined
): Partial<InvestmentFormValues> {
  if (!userDefaults) return {};
  const out: Record<string, number> = {};
  const passThrough: Array<keyof InvestmentFormValues> = [
    "downPaymentPct",
    "loanTermYears",
    "closingCostsPct",
    "vacancyPct",
    "mgmtPct",
    "maintenancePct",
    "capexPct",
    "taxRatePct",
    "rentGrowthPct",
    "expenseGrowthPct",
    "appreciationRatePct",
    "sellingCostPct",
  ];
  for (const key of passThrough) {
    const v = userDefaults[key as string];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key as string] = v;
    }
  }
  // The one shape mismatch - defaults schema uses interestRatePct,
  // form schema uses interestRate.
  if (
    typeof userDefaults.interestRatePct === "number" &&
    Number.isFinite(userDefaults.interestRatePct)
  ) {
    out.interestRate = userDefaults.interestRatePct;
  }
  return out as Partial<InvestmentFormValues>;
}

function buildNewAnalysisDefaults(
  propertyType: InvestmentFormValues["propertyType"],
  userDefaults?: Record<string, number> | null
): Partial<InvestmentFormValues> {
  return {
    ...defaultValues,
    propertyType,
    templateId: undefined,
    purchasePrice: undefined,
    yearBuilt: undefined,
    units: getDefaultUnitsForPropertyType(propertyType),
    // User defaults overlay last so they win against the engine's
    // built-ins. Property-specific fields (price, year, units) are
    // already nulled above and aren't part of the user-defaults schema.
    ...mapUserDefaultsToForm(userDefaults),
  };
}

/** Canonical JSON for comparing the form to the last persisted snapshot (matches save sanitization). */
function formSnapshotForCompare(values: InvestmentFormValues): string | null {
  const sanitizedUnits = (values.units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent: values.propertyType === "owner-occupant" && !!unit.isOwnerOccupied,
    })
  );
  const candidate: InvestmentFormValues = { ...values, units: sanitizedUnits };
  const parsed = investmentFormSchema.safeParse(candidate);
  return parsed.success ? JSON.stringify(parsed.data) : null;
}

const INPUT_TABS: {
  id: InputTab;
  label: string;
  mobileLabel: string;
  isPro: boolean;
  isFree?: boolean;
}[] = [
  { id: "cash-flow", label: "Cash Flow Analysis", mobileLabel: "Cash Flow", isPro: false, isFree: true },
  { id: "projections", label: "10-Year Projections", mobileLabel: "10-Year", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", mobileLabel: "Tax", isPro: true },
  { id: "deal-score", label: "Deal Score", mobileLabel: "Score", isPro: true },
];
const SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY = "truecap_saved_analysis_auto_export_pdf";

function toPdfReportData(args: {
  values: InvestmentFormValues;
  result: AnalysisResult;
  projectionYears: ProjectionYear[];
  taxYears: TaxStrategyYear[];
  exitYears: ExitScenarioYear[];
}): ReportData {
  const { values, result, projectionYears, taxYears, exitYears } = args;

  const units =
    values.propertyType === "single-family"
      ? [
          {
            label: "Unit 1",
            beds: Number(values.bedrooms ?? 0),
            baths: Number(values.bathrooms ?? 0),
            sqft: Number(values.sqft ?? 0),
            rent: Number(values.monthlyRent ?? result.monthlyRentalIncome),
          },
        ]
      : (values.units ?? []).map((unit, idx) => ({
          label: `Unit ${idx + 1}`,
          beds: Number(unit.bedrooms ?? 0),
          baths: Number(unit.bathrooms ?? 0),
          sqft: Number(unit.sqft ?? 0),
          rent: Number(unit.monthlyRent ?? 0),
        }));

  // Canonical Deal Score is always Balanced (lens-free) - the same number every
  // surface shows (analyzer headline, dashboard, My Deals, compare, share, OG).
  // The investor lens only reorders which metrics lead on the analyzer; it never
  // changes the exported score, so a shared report can't disagree with the
  // screen it came from. computeDealScore defaults to balanced when no lens is
  // passed.
  const balancedScore = computeDealScore(buildDealScoreInputFromAnalysis(values, result));
  const recommendation = balancedScore.recommendation;
  const risk = balancedScore.riskLevel;
  const score = balancedScore.score;
  const rationale = balancedScore.explanation;

  const projectionRows = projectionYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    debt: row.debtServiceAnnual,
    net: row.netCashFlowAnnual,
    tax: row.taxSavingsAnnual,
    after: row.afterTaxCashFlowAnnual,
    cum: row.cumulativeCashFlowAnnual,
  }));

  const year1Tax = taxYears.find((row) => row.year === 1);
  const totalBenefit10y = taxYears.reduce((acc, row) => acc + row.netTaxBenefitAnnual, 0);
  const taxRows = taxYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    interest: row.mortgageInterestDeductionAnnual,
    dep: row.depreciationDeductionAnnual,
    total: row.totalDeductionsAnnual,
    taxable: row.taxableRentalIncomeAnnual,
    savings: row.taxSavingsAnnual,
    benefit: row.netTaxBenefitAnnual,
  }));

  const bestExit = exitYears.reduce<ExitScenarioYear | null>(
    (best, row) => (best === null || row.totalProfit > best.totalProfit ? row : best),
    null
  );

  const year5Exit = exitYears.find((row) => row.year === 5);
  const year10Exit = exitYears.find((row) => row.year === 10) ?? exitYears[exitYears.length - 1];

  return {
    generatedAt: new Date(),
    property: {
      address: values.address,
      type: values.propertyType,
      yearBuilt: Number(values.yearBuilt ?? new Date().getFullYear()),
      purchasePrice: values.purchasePrice,
      template: values.templateId ? "Template Applied" : "Custom",
    },
    financing: {
      downPaymentPct: values.downPaymentPct,
      downPayment: result.downPayment,
      interestRate: values.interestRate,
      loanTerm: values.loanTermYears,
      closingCostsPct: result.closingCostsPct,
      closingCosts: result.closingCosts,
    },
    expenses: {
      propertyTaxPct: Number(values.propertyTaxPct ?? 0),
      insurancePct: Number(result.insurancePctEffective ?? 0),
      maintenancePct: Number(result.maintenancePctEffective ?? 0),
      vacancyPct: Number(values.vacancyPct),
      managementPct: Number(values.mgmtPct),
      capexPct: Number(result.capexPctEffective ?? 0),
      hoaMonthly: Number(result.hoaMonthly),
      utilitiesMonthly: Number(result.utilities),
      rentGrowth: Number(values.rentGrowthPct),
      expenseGrowth: Number(values.expenseGrowthPct),
      appreciation: Number(values.appreciationRatePct ?? 3),
      sellingCost: Number(values.sellingCostPct ?? 6),
      taxRate: Number(values.taxRatePct ?? result.effectiveTaxRate * 100),
    },
    units,
    performance: {
      recommendation,
      dealScore: score,
      risk,
      rationale,
      monthlyCashFlow: result.netCashFlow,
      cocReturn: result.cocReturn,
      capRate: result.capRate,
      dscr: result.dscr,
      taxSavings: result.taxSavingsMonthly,
      afterTaxCF: result.afterTaxCF,
    },
    projection10y: {
      cumulativeCF: projectionRows[projectionRows.length - 1]?.cum ?? 0,
      bestAnnualAfterTax: projectionRows.length ? Math.max(...projectionRows.map((row) => row.after)) : 0,
      totalAfterTax: projectionRows.reduce((acc, row) => acc + row.after, 0),
      rows: projectionRows,
    },
    taxStrategy: {
      year1Taxable: year1Tax?.taxableRentalIncomeAnnual ?? 0,
      year1Savings: year1Tax?.taxSavingsAnnual ?? 0,
      totalBenefit10y,
      annualDepreciation: result.annualDepreciation,
      rows: taxRows,
    },
    exitScenarios: {
      bestYear: bestExit?.year ?? 1,
      year5Profit: year5Exit?.totalProfit ?? 0,
      year10Profit: year10Exit?.totalProfit ?? 0,
      totalROI:
        result.totalCashRequired > 0 && year10Exit
          ? (year10Exit.totalProfit / result.totalCashRequired) * 100
          : 0,
      rows: exitYears.map((row) => ({
        y: row.year,
        value: row.propertyValue,
        loan: row.remainingLoanBalance,
        equity: row.equity,
        netSale: row.netSaleProceeds,
        profit: row.totalProfit,
      })),
    },
  };
}

/** What enrich-property filled, captured so we can attribute data confidence
 *  at save time (and live on the result screen). */
type EnrichmentCapture = {
  monthlyRent?: { source: "hud-fmr" | "hud-safmr"; detail?: string; fetchedAt?: string; value: number };
  interestRate?: { source: "fred"; fetchedAt?: string; value: number };
  propertyTaxPct?: { source: "state-static"; detail?: string; value: number };
};

function provNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Build the provenance payload from captured enrichment + current values,
 *  flagging a field "overridden" when the user changed it after auto-fill. */
function buildProvenanceInput(
  capture: EnrichmentCapture,
  values: { propertyTaxPct?: unknown; interestRate?: unknown; monthlyRent?: unknown }
): EnrichmentProvenanceInput {
  const approxEq = (a: number | null, b: number | null) =>
    a != null && b != null && Math.abs(a - b) <= 0.005 * Math.max(1, Math.abs(b));
  const out: EnrichmentProvenanceInput = {};
  if (capture.propertyTaxPct) {
    out.propertyTaxPct = {
      source: "state-static",
      detail: capture.propertyTaxPct.detail,
      overridden: !approxEq(provNum(values.propertyTaxPct), capture.propertyTaxPct.value),
    };
  }
  if (capture.interestRate) {
    out.interestRate = {
      source: "fred",
      fetchedAt: capture.interestRate.fetchedAt,
      overridden: !approxEq(provNum(values.interestRate), capture.interestRate.value),
    };
  }
  if (capture.monthlyRent) {
    out.monthlyRent = {
      source: capture.monthlyRent.source,
      detail: capture.monthlyRent.detail,
      fetchedAt: capture.monthlyRent.fetchedAt,
      overridden: !approxEq(provNum(values.monthlyRent), capture.monthlyRent.value),
    };
  }
  return out;
}

export function InvestCalcPage({
  canSaveDeals = false,
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
  canUpdateSavedDeals = false,
  saveDealLimitReached = false,
  initialSavedDealCount = 0,
  savedDealLimit = null,
  isAuthenticated = false,
  userAnalysisDefaults = null,
  dealQaEnabled = false,
}: {
  canSaveDeals?: boolean;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
  canUseProjections?: boolean;
  canUseTaxStrategy?: boolean;
  canUseExitScenarios?: boolean;
  canUseDealScore?: boolean;
  /** Pro: max-allowable-offer solver card */
  canUseMaxOffer?: boolean;
  /** Pro: sensitivity analysis card */
  canUseSensitivity?: boolean;
  /** Pro: Strategies tab (BRRRR + fix-flip + rehab estimator) */
  canUseStrategies?: boolean;
  /** Pro: generate shareable read-only deal links */
  canUseShareLinks?: boolean;
  canUpdateSavedDeals?: boolean;
  saveDealLimitReached?: boolean;
  initialSavedDealCount?: number;
  savedDealLimit?: number | null;
  isAuthenticated?: boolean;
  /** User's saved analysis defaults (vacancy %, mgmt %, financing,
   *  growth rates, etc.). Fetched server-side on /; null for anon
   *  users or users who haven't set defaults. Overlaid on top of the
   *  engine's built-in defaults at form initialization + on every
   *  resetToNewAnalysis. */
  userAnalysisDefaults?: Record<string, number> | null;
  /** True when ANTHROPIC_API_KEY is configured - shows the Deal Q&A
   *  panel. Per-user limits enforced server-side in the action. */
  dealQaEnabled?: boolean;
}) {
  const router = useRouter();
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("cash-flow");
  const [activeDashboardTab, setActiveDashboardTab] = useState<AnalysisDashboardTab>("cash-flow");
  // Active investor-strategy chip ("What's your play?"). null = default full flow.
  const [activeStrategyKey, setActiveStrategyKey] = useState<string | null>(null);
  const activeStrategy = getStrategyByKey(activeStrategyKey);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // The exact form values that produced `analysisResult`. The results
  // dashboard reads from this (not a live form.getValues() snapshot) so the
  // headline metrics and the derived cards (Max Offer, Sensitivity, etc.) are
  // always computed from the SAME inputs — never a mix of frozen result +
  // live form state. Updated everywhere `analysisResult` is set.
  const [analysisValues, setAnalysisValues] = useState<InvestmentFormValues | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Live instant-verdict preview: a lightweight verdict that forms as the user
  // types, BEFORE the first explicit "Run analysis". Pure client math, kept
  // separate from analysisResult so it never triggers the heavy dashboard,
  // funnel events, or server actions - it just makes the "60-second" promise
  // feel instant. Cleared/ignored once a real run produces analysisResult.
  // HUD Fair Market Rent for the entered address (single-family), captured on
  // enrichment regardless of whether it auto-filled the field. Used as a free
  // "ground truth" benchmark to reality-check the user's rent - the single
  // assumption the deal is most sensitive to.
  const [marketRentEstimate, setMarketRentEstimate] = useState<number | null>(null);
  const [livePreview, setLivePreview] = useState<{
    tier: DealTier;
    score: number;
    netCashFlow: number;
    capRate: number;
    dscr: number;
    monthlyPayment: number;
  } | null>(null);
  // One concise, debounced screen-reader announcement for the live preview,
  // written into a persistent sr-only region (the visible card is NOT a live
  // region). Debounced past the form watcher so fast typing doesn't flood the
  // SR queue - mirrors the what-if-sliders pattern.
  const [livePreviewMsg, setLivePreviewMsg] = useState("");
  useEffect(() => {
    if (!livePreview) {
      setLivePreviewMsg("");
      return;
    }
    const lp = livePreview;
    const id = window.setTimeout(() => {
      const ncf = Math.round(lp.netCashFlow);
      const cf = `${ncf >= 0 ? "+" : "-"}$${Math.abs(ncf).toLocaleString()}/mo`;
      const dscr = lp.monthlyPayment > 0 ? `, DSCR ${lp.dscr.toFixed(2)}` : "";
      setLivePreviewMsg(
        `Live preview: ${lp.tier}, Deal Score ${lp.score} out of 100, cash flow ${cf}, cap rate ${lp.capRate.toFixed(1)}%${dscr}.`
      );
    }, 400);
    return () => window.clearTimeout(id);
  }, [livePreview]);
  // Hero "instant verdict" path: when a cold visitor types an address we
  // estimate the purchase price from local rent so the analyzer can run
  // immediately. These drive the honest "estimated price — confirm it"
  // notice on the result screen; cleared once the user edits the price and
  // re-runs (see onSubmit).
  const [priceEstimated, setPriceEstimated] = useState(false);
  const [estimatedPriceValue, setEstimatedPriceValue] = useState<number | null>(null);
  const [priceEstimateBasis, setPriceEstimateBasis] = useState<string | null>(null);
  // ── Progressive disclosure (financing + operating expenses) ──────────
  // Cold visitors start with just the basics (property type, address,
  // price, beds/rent); financing + operating expenses collapse behind a
  // toggle backed by smart defaults, so the first answer comes fast. The
  // sections stay MOUNTED (hidden via CSS) so address auto-fill still
  // writes into them and their values submit normally.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // True once the user has a remembered preference OR toggles this session.
  // Prevents the post-first-result auto-open from overriding a deliberate
  // choice (the value is read from localStorage on mount).
  const advancedUserChoiceRef = useRef(false);
  const hasAutoOpenedAdvancedRef = useRef(false);
  // ── Hero address handoff ─────────────────────────────────────────────
  // The homepage hero (hero-address-form.tsx) dispatches "truecap:hero-
  // analyze"; we apply the address (+ enrich when it carried Places
  // components) or run the sample flow. Deduped by token. The handler is
  // kept in a ref so the []-deps listener effect always calls the latest
  // closures (form, runPropertyEnrichment, handleTrySampleDeal).
  const lastHeroTokenRef = useRef<string | null>(null);
  const heroAnalyzeHandlerRef = useRef<(detail: HeroAnalyzeDetail) => void>(() => {});
  /**
   * Flipped true on mount when we restore the form from the anonymous
   * auto-save draft. Drives a small "Welcome back - picked up where
   * you left off" banner so the user understands why the form is
   * pre-filled (and can one-click "start fresh" if it's not theirs,
   * e.g. shared device).
   */
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  /**
   * Snapshot of the address from the restored draft so the welcome
   * banner can show it ("Welcome back - your draft for 1700 W Erie
   * Ave is ready"). Captured at restore time so it doesn't update if
   * the user edits the field afterwards.
   */
  const [restoredAddress, setRestoredAddress] = useState<string | null>(null);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [savedDealCount, setSavedDealCount] = useState(initialSavedDealCount);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isComparingDeals, setIsComparingDeals] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dealScoreResult, setDealScoreResult] = useState<DealScoreActionResult | null>(null);
  // ── Sample-deal Pro preview ────────────────────────────────────────
  // When the analysis was triggered from the "Try a sample deal" button
  // AND the user lacks the Pro entitlements, we unlock the full Pro
  // report (projections, tax, exit, deal score, stress-test, strategies)
  // for that one demo run. This shows prospects what Pro actually looks
  // like instead of a locked teaser. It's a pure UI unlock: the sample
  // is never saved (no analysisId), so the snapshot server actions are
  // never called and real entitlement gating is untouched. Save / PDF /
  // share / compare stay gated - those hit server actions.
  // The flag clears whenever outputs are invalidated (form drift, reset,
  // loading a saved deal) or a normal non-sample run happens.
  const [isSampleProPreview, setIsSampleProPreview] = useState(false);
  const pendingSamplePreviewRef = useRef(false);
  // ── One-time PDF purchase ($5, Stripe Checkout) ────────────────────
  // Dialog state + an unlock ref set after a verified payment. The
  // unlock lets the next Export PDF run bypass the entitlement gate and
  // is consumed on successful generation. Form values survive the
  // Stripe redirect via localStorage (see ONE_TIME_PDF_DRAFT_KEY).
  const [isPdfPurchaseDialogOpen, setIsPdfPurchaseDialogOpen] = useState(false);
  const [isStartingPdfCheckout, setIsStartingPdfCheckout] = useState(false);
  const oneTimePdfUnlockedRef = useRef(false);
  const [projectionSource, setProjectionSource] = useState<{
    analysisId: string | null;
    input: TenYearProjectionInput;
    initialYears: ProjectionYear[];
  } | null>(null);
  const [taxStrategySource, setTaxStrategySource] = useState<{
    analysisId: string | null;
    input: TaxStrategyInput;
    initialYears: TaxStrategyYear[];
  } | null>(null);
  const [exitScenarioSource, setExitScenarioSource] = useState<{
    analysisId: string | null;
    input: ExitScenarioInput;
    initialYears: ExitScenarioYear[];
  } | null>(null);
  const [savedTemplateFallback, setSavedTemplateFallback] = useState<{
    id: string;
    templateName: string;
    templateDescription: string | null;
  } | null>(null);
  const [isLoadingDealScore, setIsLoadingDealScore] = useState(false);
  const { toast } = useToast();
  const prevPropertyTypeRef = useRef<InvestmentFormValues["propertyType"]>("single-family");
  const isProgrammaticResetRef = useRef(false);
  const pendingResultsScrollRef = useRef(false);
  const formElementRef = useRef<HTMLFormElement | null>(null);
  const savedDealIdRef = useRef<string | null>(null);
  const lastPersistedFormJsonRef = useRef<string | null>(null);
  /** Form snapshot that produced the currently displayed analysis outputs (last Calculate or loaded saved deal). */
  const lastComputedFormJsonRef = useRef<string | null>(null);
  const isCalculatingRef = useRef(false);
  const autoExportPdfRef = useRef(false);
  const currentSaveDealLimitReached =
    saveDealLimitReached || (savedDealLimit !== null && savedDealCount >= savedDealLimit);
  const areAnalysisTabsEnabled = Boolean(analysisResult) && !isCalculating;

  const mapInputTabToDashboardTab = useCallback(
    (tab: InputTab): AnalysisDashboardTab | null => {
      if (tab === "cash-flow") return "cash-flow";
      if (tab === "projections") return "projections";
      if (tab === "tax-strategy") return "tax-strategy";
      return null;
    },
    []
  );

  const scrollToAnalysisResults = useCallback(() => {
    const resultsSection = document.querySelector("[data-analysis-results='true']");
    resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleInputTabClick = useCallback(
    (tab: InputTab) => {
      if (!areAnalysisTabsEnabled) return;
      setActiveInputTab(tab);
      const mappedTab = mapInputTabToDashboardTab(tab);
      if (mappedTab) setActiveDashboardTab(mappedTab);
      setTimeout(() => {
        scrollToAnalysisResults();
      }, 50);
    },
    [areAnalysisTabsEnabled, mapInputTabToDashboardTab, scrollToAnalysisResults]
  );

  // Shared between the server-action path (loadDealScore) and the
  // sample-deal Pro preview path, which computes the score client-side
  // via the same pure lib function the action wraps.

  const loadDealScore = async (values: InvestmentFormValues, result: AnalysisResult) => {
    setIsLoadingDealScore(true);
    try {
      const dealScore = await getDealScoreAction(buildDealScoreInputFromAnalysis(values, result));
      setDealScoreResult(dealScore);
    } catch (err) {
      // Swallow + log instead of throwing - there are 4+ call sites,
      // two of which are fire-and-forget (`void loadDealScore(...)`).
      // Without this, a transient server error becomes an unhandled
      // promise rejection in Sentry with no useful context. Failing
      // the score load silently is the right user-visible behavior:
      // the deal still computes, the score card just stays empty.
      console.warn("[deal-score] load failed:", err);
      setDealScoreResult(null);
    } finally {
      setIsLoadingDealScore(false);
    }
  };

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: buildNewAnalysisDefaults("single-family", userAnalysisDefaults),
    mode: "onChange",
  });

  const syncFormDirtyVersusPersisted = useCallback(() => {
    const id = savedDealIdRef.current;
    if (!id) {
      setHasUnsavedChanges(false);
      return;
    }
    const json = formSnapshotForCompare(form.getValues());
    // A null snapshot means the form is mid-restore (e.g. a multi-family
    // saved deal whose units array is partially populated while RHF
    // resets) and the schema parse failed transiently. Don't flip the
    // dirty flag on that intermediate state - the next watch tick after
    // the restore completes will compute the real answer. Previously
    // this branch set hasUnsavedChanges(true) and users saw a false
    // "Unsaved changes" badge right after loading a saved deal.
    if (!json) return;
    if (!lastPersistedFormJsonRef.current) {
      setHasUnsavedChanges(true);
      return;
    }
    setHasUnsavedChanges(json !== lastPersistedFormJsonRef.current);
  }, [form]);

  const clearAnalysisOutputs = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisValues(null);
    setProjectionSource(null);
    setTaxStrategySource(null);
    setExitScenarioSource(null);
    setDealScoreResult(null);
    setShowResults(false);
    setIsLoadingDealScore(false);
    // Clear the live instant-verdict preview too - otherwise the previous
    // deal's verdict flashes over the freshly-blanked form on New Analysis
    // (the form watcher can't self-heal: reset mutations fire under the
    // programmatic-reset guard, so no recompute runs until the next keystroke).
    setLivePreview(null);
    // Editing away from the sample deal ends the Pro preview - the
    // unlock is for the demo numbers only, not the user's own deal.
    setIsSampleProPreview(false);
  }, []);

  // Live recompute: once a result is on screen, editing any input updates the
  // analysis in place instead of blanking it until the next explicit Run.
  // Kept in a ref so the form watcher (below) subscribes ONCE and never tears
  // down its debounce timer on re-render — re-subscribing would clear the
  // pending timer and silently drop the user's final edit. The body is
  // reassigned every render (after the source builders, where the canUse*
  // flags + builders are in scope) so it always closes over fresh values.
  const recomputeOutputsFromFormRef = useRef<() => void>(() => {});

  const resetToNewAnalysis = useCallback(
    (nextPropertyType: InvestmentFormValues["propertyType"] = "single-family") => {
      isProgrammaticResetRef.current = true;
      // Re-apply user defaults on every reset so a "New Analysis" still
      // pre-fills the user's preferred vacancy/mgmt/financing values.
      const defaults = buildNewAnalysisDefaults(nextPropertyType, userAnalysisDefaults);
      // Clear any DOM-sticky values on uncontrolled inputs before syncing RHF state.
      formElementRef.current?.reset();
      form.reset(defaults, {
        keepErrors: false,
        keepDirty: false,
        keepDirtyValues: false,
        keepTouched: false,
        keepIsSubmitted: false,
        keepSubmitCount: false,
      });
      form.clearErrors();
      setSavedDealId(null);
      savedDealIdRef.current = null;
      lastPersistedFormJsonRef.current = null;
      lastComputedFormJsonRef.current = null;
      // Wipe the anonymous auto-save draft - the user is explicitly
      // asking for a fresh start. Without this they'd reset, then on
      // next page load the old draft would silently come back.
      clearCalcDraftRaw();
      clearAnalysisOutputs();
      setHasUnsavedChanges(false);
      setIsCalculating(false);
      isCalculatingRef.current = false;
      prevPropertyTypeRef.current = nextPropertyType;
      // Re-assert critical blank fields explicitly to avoid stale values after reset
      // in browser autofill/uncontrolled edge-cases.
      form.setValue("address", "", { shouldDirty: false, shouldValidate: false });
      form.setValue("purchasePrice", undefined as unknown as number, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("yearBuilt", undefined, { shouldDirty: false, shouldValidate: false });
      form.setValue("bedrooms", undefined, { shouldDirty: false, shouldValidate: false });
      form.setValue("bathrooms", undefined, { shouldDirty: false, shouldValidate: false });
      form.setValue("sqft", undefined, { shouldDirty: false, shouldValidate: false });
      form.setValue("monthlyRent", undefined, { shouldDirty: false, shouldValidate: false });
      enrichmentCaptureRef.current = {};
      setMarketRentEstimate(null);
      form.setValue("units", getDefaultUnitsForPropertyType(nextPropertyType), {
        shouldDirty: false,
        shouldValidate: false,
      });
      queueMicrotask(() => {
        isProgrammaticResetRef.current = false;
      });
    },
    [form, clearAnalysisOutputs, userAnalysisDefaults]
  );

  const propertyType = form.watch("propertyType");
  const purchasePrice = form.watch("purchasePrice");
  const watchedBedrooms = form.watch("bedrooms");

  /**
   * "Is this form value functionally empty?" - handles all the ways
   * react-hook-form can yield no value:
   *   - undefined / null  (default)
   *   - NaN               (valueAsNumber on an empty input)
   *   - 0                 (numeric placeholder)
   *   - ""                (string before valueAsNumber kicks in)
   */
  const isEmptyNumber = (v: unknown): boolean => {
    if (v === undefined || v === null) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    if (typeof v === "number") return !Number.isFinite(v) || v === 0;
    return false;
  };

  /**
   * Holds the address components from the most recent autocomplete
   * selection. We keep this around so we can re-fire the HUD rent lookup
   * once the user fills in the bedroom count (selection order is
   * typically address first, then beds/baths).
   */
  const lastSelectedAddressRef = useRef<SelectedAddress | null>(null);
  const enrichmentCaptureRef = useRef<EnrichmentCapture>({});

  /**
   * Run the enrichment lookups (state property tax, FRED mortgage rate,
   * HUD Fair Market Rent) and pre-fill the form. Idempotent: callers can
   * invoke it whenever address or bedroom count changes; existing user
   * input on monthly rent is preserved.
   */
  const runPropertyEnrichment = useCallback(
    async (place: SelectedAddress, opts?: { silent?: boolean }) => {
      const currentPropertyType = form.getValues("propertyType");
      const isSingleFamily = currentPropertyType === "single-family";
      const rawBedrooms = isSingleFamily ? form.getValues("bedrooms") : undefined;
      const bedrooms =
        typeof rawBedrooms === "number"
          ? rawBedrooms
          : rawBedrooms != null
          ? Number(rawBedrooms)
          : undefined;

      const enrichment = await enrichPropertyAction({
        state: place.state,
        county: place.county,
        zip: place.zip,
        propertyType: currentPropertyType,
        bedrooms,
      });

      const setOpts = {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      };
      const filled: string[] = [];

      // Property tax - always overwrite with the state-level rate.
      // Defaults baked into the form schema aren't location-aware, so the
      // state rate is strictly more informative.
      if (enrichment.propertyTaxPct !== undefined) {
        form.setValue("propertyTaxPct", enrichment.propertyTaxPct, setOpts);
        enrichmentCaptureRef.current.propertyTaxPct = {
          source: "state-static",
          detail: enrichment.meta.propertyTax?.state,
          value: enrichment.propertyTaxPct,
        };
        filled.push(
          `Property tax ${enrichment.propertyTaxPct.toFixed(2)}% (${enrichment.meta.propertyTax?.state})`
        );
      }

      // Interest rate - overwrite unless the user has manually edited it.
      // dirtyFields.interestRate is true only after a manual change, so
      // saved-analysis edits (which use form.reset) are also covered.
      if (enrichment.interestRate !== undefined) {
        const isDirty = form.formState.dirtyFields.interestRate;
        if (!isDirty) {
          form.setValue("interestRate", enrichment.interestRate, setOpts);
          enrichmentCaptureRef.current.interestRate = {
            source: "fred",
            fetchedAt: enrichment.meta.mortgageRate?.asOf,
            value: enrichment.interestRate,
          };
          filled.push(
            `Interest rate ${enrichment.interestRate.toFixed(2)}% (current avg)`
          );
        }
      }

      // Monthly rent - single-family only at this entry point. Multi-family
      // rents are filled per-unit by a separate effect below. `valueAsNumber:
      // true` means an empty input reads as NaN, so we must treat NaN as
      // empty too.
      let rentFilledFromHud = false;
      if (isSingleFamily && enrichment.monthlyRent !== undefined) {
        // Always record the HUD benchmark for the rent reality-check, even if
        // the user already typed their own rent (so we can compare the two).
        setMarketRentEstimate(enrichment.monthlyRent);
        const current = form.getValues("monthlyRent") as number | undefined | null;
        const isEmpty = isEmptyNumber(current);
        if (isEmpty) {
          form.setValue("monthlyRent", enrichment.monthlyRent, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
          enrichmentCaptureRef.current.monthlyRent = {
            source: enrichment.meta.rent?.source ?? "hud-fmr",
            detail: enrichment.meta.rent?.county,
            fetchedAt: enrichment.meta.rent ? String(enrichment.meta.rent.year) : undefined,
            value: enrichment.monthlyRent,
          };
          filled.push(
            `Rent ~$${enrichment.monthlyRent.toLocaleString()}/mo (HUD FMR)`
          );
          rentFilledFromHud = true;
        }
      }

      if (filled.length > 0 && !opts?.silent) {
        toast({
          title: "Auto-filled from address",
          description: rentFilledFromHud
            ? `${filled.join("  ·  ")} - HUD FMR is an area average; adjust to local comps.`
            : filled.join("  ·  "),
        });
      }
    },
    [form, toast]
  );

  /** Address-selected entry point (passed to PropertyDetailsSection). */
  const handleAddressSelected = useCallback(
    async (place: SelectedAddress) => {
      lastSelectedAddressRef.current = place;
      // New property → fresh provenance capture for this address.
      enrichmentCaptureRef.current = {};
      setMarketRentEstimate(null);
      // Funnel step - coarse only (state), never the full address (PII).
      trackEvent("address_selected", { state: place.state });
      await runPropertyEnrichment(place);
    },
    [runPropertyEnrichment]
  );

  /**
   * After an address has been picked, if the user later fills in the
   * bedroom count, re-fire the lookup so the HUD rent estimate has the
   * data it needs. Skipped silently if monthly rent is already filled.
   */
  useEffect(() => {
    const place = lastSelectedAddressRef.current;
    if (!place) return;
    if (form.getValues("propertyType") !== "single-family") return;
    // Accept any value that parses to a positive number (RHF may yield
    // strings transiently before valueAsNumber kicks in).
    const beds = Number(watchedBedrooms);
    if (!Number.isFinite(beds) || beds <= 0) return;
    // Treat NaN / 0 / empty string the same as "field has no value".
    if (!isEmptyNumber(form.getValues("monthlyRent"))) return;
    // Non-silent so the user gets explicit confirmation that the rent
    // estimate populated.
    //
    // .catch is mandatory - this useEffect can't await, so a thrown
    // error inside runPropertyEnrichment would otherwise surface as
    // an unhandled promise rejection in the browser (which fires
    // Sentry's "Load failed" / "Failed to fetch" alerts on mobile).
    // Enrichment is best-effort by design; failure is silent.
    runPropertyEnrichment(place, { silent: false }).catch((err) => {
      console.warn("[bedrooms watcher] enrichment failed:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBedrooms]);

  /**
   * Multi-family / house-hack: when the user fills in bedroom counts for
   * each unit, look up the HUD rent estimate per unit (skipping any
   * owner-occupied unit - that one doesn't generate rent). Each
   * (unitIndex, bedrooms) combo is fetched at most once per session;
   * the server caches HUD data so multiple per-unit calls don't actually
   * hit HUD multiple times.
   */
  const watchedUnits = form.watch("units");

  // ── Guided step rail (AN-1) ──────────────────────────────────────────
  // Additive orientation/navigation over the existing single-scroll form.
  // Reads form values (never writes), so it can't affect validation, the
  // manual "Run analysis" flow, or the localStorage draft.
  const watchedAddress = form.watch("address");
  const watchedMonthlyRent = form.watch("monthlyRent");
  const watchedDownPaymentPct = form.watch("downPaymentPct");
  const watchedInterestRate = form.watch("interestRate");
  const watchedLoanTermYears = form.watch("loanTermYears");

  const analyzerSteps = useMemo(
    () =>
      computeAnalyzerSteps(
        {
          propertyType,
          address: watchedAddress,
          purchasePrice,
          bedrooms: watchedBedrooms,
          monthlyRent: watchedMonthlyRent,
          units: watchedUnits,
          downPaymentPct: watchedDownPaymentPct,
          interestRate: watchedInterestRate,
          loanTermYears: watchedLoanTermYears,
        },
        { hasResults: analysisResult != null }
      ),
    [
      propertyType,
      watchedAddress,
      purchasePrice,
      watchedBedrooms,
      watchedMonthlyRent,
      watchedUnits,
      watchedDownPaymentPct,
      watchedInterestRate,
      watchedLoanTermYears,
      analysisResult,
    ]
  );

  const [activeStep, setActiveStep] = useState<AnalyzerStepId | null>(null);

  const handleStepNavigate = useCallback(
    (id: AnalyzerStepId) => {
      setActiveStep(id);
      if (id === "decision") {
        scrollToAnalysisResults();
        return;
      }
      // Financing + Expenses live inside the collapsed "advanced" block —
      // open it first, then scroll once it's had a frame to expand.
      if (id === "financing" || id === "expenses") {
        setAdvancedOpen(true);
      }
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          document
            .getElementById(`step-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 70);
      });
    },
    [scrollToAnalysisResults]
  );

  // Deep link: ?step=financing (income / expenses / decision / property)
  // scrolls to that section once on load. Ref-guarded so it fires only once.
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    const stepParam = new URLSearchParams(window.location.search).get("step");
    if (stepParam && isAnalyzerStepId(stepParam)) {
      window.setTimeout(() => handleStepNavigate(stepParam), 250);
    }
  }, [handleStepNavigate]);

  const enrichedUnitsRef = useRef<Set<string>>(new Set());
  // Build a stable dep string that changes only when a unit's
  // bedrooms or owner-occupied flag changes.
  const unitsEnrichmentKey = (watchedUnits ?? [])
    .map(
      (u, i) =>
        `${i}:${u?.bedrooms ?? ""}:${u?.isOwnerOccupied ? "1" : "0"}`
    )
    .join(",");

  useEffect(() => {
    const place = lastSelectedAddressRef.current;
    if (!place) return;
    const propType = form.getValues("propertyType");
    if (propType !== "multi-family" && propType !== "owner-occupant") return;
    const units = form.getValues("units") ?? [];

    type Pending = { idx: number; beds: number };
    const pending: Pending[] = [];
    for (let idx = 0; idx < units.length; idx++) {
      const unit = units[idx];
      if (!unit) continue;
      if (unit.isOwnerOccupied) continue;
      const beds = Number(unit.bedrooms);
      if (!Number.isFinite(beds) || beds <= 0) continue;
      if (!isEmptyNumber(unit.monthlyRent)) continue;
      const cacheKey = `${idx}:${beds}`;
      if (enrichedUnitsRef.current.has(cacheKey)) continue;
      enrichedUnitsRef.current.add(cacheKey);
      pending.push({ idx, beds });
    }
    if (pending.length === 0) return;

    // Wrapped in try/catch because Promise.all rejects on the first
    // failed action - without this, a single HUD blip would surface as
    // an unhandled rejection in the user's browser. Enrichment is
    // best-effort: if it fails, the user still types rents manually.
    (async () => {
      try {
        const results = await Promise.all(
          pending.map(({ beds }) =>
            enrichPropertyAction({
              state: place.state,
              county: place.county,
              zip: place.zip,
              propertyType: propType,
              bedrooms: beds,
            })
          )
        );

        const filledLines: string[] = [];
        for (let i = 0; i < pending.length; i++) {
          const { idx } = pending[i];
          const result = results[i];
          if (
            result.monthlyRent !== undefined &&
            isEmptyNumber(form.getValues(`units.${idx}.monthlyRent`))
          ) {
            form.setValue(
              `units.${idx}.monthlyRent`,
              result.monthlyRent,
              { shouldDirty: false, shouldTouch: false, shouldValidate: false }
            );
            filledLines.push(
              `Unit ${idx + 1}: $${result.monthlyRent.toLocaleString()}/mo`
            );
          }
        }
        if (filledLines.length > 0) {
          toast({
            title: "Auto-filled per-unit rent",
            description: `${filledLines.join("  ·  ")} - HUD FMR is an area average; adjust to local comps.`,
          });
        }
      } catch (err) {
        // Releasing the in-flight cache entries so the next interaction
        // can retry - otherwise the user is stuck waiting for a fill
        // that will never come.
        for (const { idx, beds } of pending) {
          enrichedUnitsRef.current.delete(`${idx}:${beds}`);
        }
        console.warn("[multi-unit enrichment] failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsEnrichmentKey]);

  /**
   * RentCast autofill (button-triggered). The cheap enrichment only knows
   * tax / rate / HUD-rent - beds, baths, sqft, and price can ONLY come from
   * RentCast. So an explicit "Autofill from address" button pulls the
   * property's facts + value/rent estimate and OVERWRITES the autofill-owned
   * fields (beds, baths, size, price, rent) with the fresh data - the click is
   * an explicit request for RentCast's numbers, so it replaces whatever was
   * there. On-demand by design: a comp credit is spent only on a deliberate
   * click, bounded by the per-user + global caps in the action.
   */
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillUnavailable, setAutofillUnavailable] = useState(false);

  const applyComps = useCallback(
    (e: PropertyEnrichment) => {
      const f = e.facts;
      const filled: string[] = [];
      // Explicit click = the user is asking for RentCast's numbers, so
      // OVERWRITE the autofill-owned fields rather than only filling blanks.
      const opts = { shouldDirty: false, shouldTouch: false, shouldValidate: true };
      if (f?.bedrooms != null) {
        form.setValue("bedrooms", f.bedrooms, opts);
        filled.push("beds");
      }
      if (f?.bathrooms != null) {
        form.setValue("bathrooms", f.bathrooms, opts);
        filled.push("baths");
      }
      if (f?.squareFootage != null) {
        form.setValue("sqft", f.squareFootage, opts);
        filled.push("size");
      }
      if (e.valueEstimate != null) {
        form.setValue("purchasePrice", Math.round(e.valueEstimate), opts);
        filled.push("price");
      }
      const pt = form.getValues("propertyType");
      if (e.rentEstimate != null && (pt === "single-family" || pt === "owner-occupant")) {
        form.setValue("monthlyRent", Math.round(e.rentEstimate), opts);
        filled.push("rent");
      }
      if (filled.length > 0) {
        toast({
          title: "Auto-filled from address",
          description: `Filled ${filled.join(", ")} from RentCast - adjust anything that's off.`,
        });
      }
    },
    [form, toast]
  );

  const handleAutofillFromAddress = useCallback(async () => {
    const addr = (form.getValues("address") ?? "").trim();
    if (!addr) {
      toast({ title: "Enter an address first", description: "Add the property address, then tap Autofill." });
      return;
    }
    setIsAutofilling(true);
    try {
      const r = await getPropertyCompsAction({
        address: addr,
        propertyType: form.getValues("propertyType"),
      });
      if (r.ok) {
        applyComps(r.enrichment);
        return;
      }
      if (r.code === "NOT_CONFIGURED") {
        setAutofillUnavailable(true);
        return;
      }
      const title =
        r.code === "SIGN_IN_REQUIRED"
          ? "Sign in to autofill"
          : r.code === "ENTITLEMENT_REQUIRED"
          ? "Upgrade for more autofills"
          : r.code === "CAP_REACHED"
          ? "Monthly limit reached"
          : r.code === "NOT_FOUND"
          ? "No data for this address"
          : "Couldn't autofill";
      toast({ title, description: r.message, variant: "destructive" });
    } catch {
      toast({ title: "Couldn't autofill", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setIsAutofilling(false);
    }
  }, [form, applyComps, toast]);

  /**
   * Apply a starter template's assumption set (financing + expenses + growth)
   * to the form WITHOUT touching the address / price / rent the user entered.
   * Mirrors the field mapping in template-selector-section's applyTemplateToForm.
   */
  const applyStarterAssumptions = useCallback(
    (starterKey: StarterTemplate["key"]) => {
      const starter = STARTER_TEMPLATES.find((s) => s.key === starterKey);
      if (!starter) return;
      const t = starter.template;
      const opts = { shouldDirty: true, shouldValidate: false } as const;
      form.setValue("propertyTaxPct", t.propertyTaxPct, opts);
      form.setValue("insuranceInputMode", t.insuranceInputMode, opts);
      if (t.insurancePct != null) form.setValue("insurancePct", t.insurancePct, opts);
      if (t.insuranceMo != null) form.setValue("insuranceMonthly", t.insuranceMo, opts);
      form.setValue("maintenancePct", t.maintenancePct, opts);
      form.setValue("vacancyPct", t.vacancyPct, opts);
      form.setValue("mgmtPct", t.managementPct, opts);
      form.setValue("capexPct", t.capexPct, opts);
      form.setValue("closingCostsPct", t.closingCostsPct, opts);
      form.setValue("interestRate", t.interestRatePct, opts);
      form.setValue("downPaymentPct", t.downPaymentPct, opts);
      form.setValue("expenseGrowthPct", t.expenseGrowthPct, opts);
      form.setValue("rentGrowthPct", t.rentGrowthPct, opts);
      form.setValue("appreciationRatePct", t.appreciationRatePct, opts);
      form.setValue("sellingCostPct", t.sellingCostPct, opts);
      if (t.buildingValuePct != null) form.setValue("buildingValuePct", t.buildingValuePct, opts);
      if (t.depreciationYears != null) form.setValue("depreciationYears", t.depreciationYears, opts);
      if (t.includeInterestDeduction != null)
        form.setValue("includeInterestDeduction", t.includeInterestDeduction, opts);
      if (t.taxRatePct != null) form.setValue("taxRatePct", t.taxRatePct, opts);
    },
    [form]
  );

  /**
   * "What's your play?" chip handler. Tailors the form to the chosen investor
   * strategy: sets property type, applies that play's assumption defaults, and
   * points the results view at the tab that leads with its key number. null
   * clears back to the default full flow (values left as-is).
   */
  const handleSelectStrategy = useCallback(
    (key: string | null) => {
      const strategy = getStrategyByKey(key);
      if (!strategy) {
        setActiveStrategyKey(null);
        return;
      }
      if (form.getValues("propertyType") !== strategy.propertyType) {
        form.setValue("propertyType", strategy.propertyType, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      applyStarterAssumptions(strategy.starterKey);
      setActiveStrategyKey(strategy.key);
      // BRRRR/Flip render their model inline as the results hero, so don't also
      // lead the Details tabs with the (duplicate) Strategies tab - default to
      // cash-flow context. Wholesale keeps Stress Test so "Adjust targets" lands.
      setActiveDashboardTab(strategy.primaryTab === "strategies" ? "cash-flow" : strategy.primaryTab);
      setAdvancedOpen(false);
      trackEvent("strategy_selected", { strategy: strategy.key });
    },
    [form, applyStarterAssumptions]
  );

  const buildTaxStrategySource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult
  ) => {
    const input: TaxStrategyInput = {
      monthlyRentalIncome: result.monthlyRentalIncome,
      totalOperatingExpenses: result.totalOperatingExpenses,
      annualDepreciation: result.annualDepreciation,
      yearlyInterestSchedule: result.yearlyInterestSchedule,
      rentGrowthPct: values.rentGrowthPct,
      expenseGrowthPct: values.expenseGrowthPct,
      taxRate: result.effectiveTaxRate,
      includeInterestDeduction: values.includeInterestDeduction !== false,
    };

    return {
      analysisId,
      input,
      initialYears: result.taxStrategyYears,
    };
  };

  const buildProjectionSource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult
  ) => ({
    analysisId,
    input: {
      monthlyRentalIncome: result.monthlyRentalIncome,
      totalOperatingExpenses: result.totalOperatingExpenses,
      monthlyPayment: result.monthlyPayment,
      pmiMonthly: result.pmiMonthly,
      loanAmount: result.loanAmount,
      purchasePrice: values.purchasePrice,
      taxSavingsMonthly: result.taxSavingsMonthly,
      annualDepreciation: result.annualDepreciation,
      yearlyInterestSchedule: result.yearlyInterestSchedule,
      rentGrowthPct: values.rentGrowthPct,
      expenseGrowthPct: values.expenseGrowthPct,
      taxRate: result.effectiveTaxRate,
      includeInterestDeduction: values.includeInterestDeduction !== false,
    },
    initialYears: result.tenYearProjection,
  });

  const buildExitScenarioSource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult,
    projectionYears: ProjectionYear[],
    taxStrategyYears: TaxStrategyYear[]
  ) => {
    const exitRates = resolveExitScenarioRates(values);
    const input: ExitScenarioInput = {
      purchasePrice: values.purchasePrice,
      appreciationRate: exitRates.appreciationRate,
      sellingCostPct: exitRates.sellingCostPct,
      loanAmount: result.loanAmount,
      interestRate: values.interestRate,
      loanTermYears: values.loanTermYears,
      monthlyPayment: result.monthlyPayment,
      downPayment: result.downPayment,
      closingCosts: result.closingCosts,
      cumulativeCashFlowByYear: projectionYears.map((year) => year.cumulativeCashFlowAnnual),
      cumulativeTaxBenefitByYear: taxStrategyYears.map((year) => year.cumulativeTaxBenefitAnnual),
      annualDepreciation: taxStrategyYears[0]?.depreciationDeductionAnnual ?? 0,
    };

    return {
      analysisId,
      input,
      initialYears: buildExitScenarios(input),
    };
  };

  const mergeSavedResultSnapshot = (
    rawSnapshot: unknown,
    computedResult: AnalysisResult
  ): AnalysisResult => {
    if (!rawSnapshot || typeof rawSnapshot !== "object" || Array.isArray(rawSnapshot)) {
      return computedResult;
    }

    return {
      ...computedResult,
      ...(rawSnapshot as Partial<AnalysisResult>),
    };
  };

  // Reassigned every render so it closes over the current entitlement flags,
  // builders, and form state. Mirrors onSubmit's output wiring but with NO
  // server call, spinner, toast, or analytics — pure client math for an
  // instant live update. Snapshot sources use a null analysisId so the Pro
  // panels render from the freshly computed years locally instead of firing
  // snapshot fetch/upsert server actions on every keystroke.
  recomputeOutputsFromFormRef.current = () => {
    if (isProgrammaticResetRef.current || isCalculatingRef.current) return;
    const baseline = lastComputedFormJsonRef.current;
    // No prior run → the first FULL compute stays an explicit Run (preserving
    // the funnel events, loading state, and server-action gating in onSubmit).
    // But we DO compute a lightweight live preview so the verdict forms as the
    // user types - the magic moment - without any of that machinery.
    if (baseline === null) {
      const liveParsed = investmentFormSchema.safeParse(form.getValues());
      if (liveParsed.success) {
        try {
          const r = calculateAnalysis(liveParsed.data);
          // Deal Score is free for everyone, so compute it for the preview too
          // - the hero 0-100 number forming live is the magic moment.
          const ds = computeDealScore(buildDealScoreInputFromAnalysis(liveParsed.data, r));
          setLivePreview({
            tier: getDealTier(r),
            score: ds.score,
            netCashFlow: r.netCashFlow,
            capRate: r.capRate,
            dscr: r.dscr,
            monthlyPayment: r.monthlyPayment,
          });
        } catch {
          setLivePreview(null);
        }
      } else {
        setLivePreview(null);
      }
      return;
    }
    const nextSnapshot = formSnapshotForCompare(form.getValues());
    // Unchanged, or transiently unparseable mid-edit (e.g. a required field
    // momentarily cleared): keep the last good results on screen instead of
    // blanking them — that silent blank was the core "sticky / nothing
    // happens" complaint.
    if (nextSnapshot === null || nextSnapshot === baseline) return;
    const parsed = investmentFormSchema.safeParse(form.getValues());
    if (!parsed.success) return;
    const values = parsed.data;
    const result = calculateAnalysis(values);

    // Editing away from the sample deal ends the Pro preview — the unlock is
    // for the demo numbers only, so panels re-gate to the real entitlement.
    setIsSampleProPreview(false);
    setAnalysisResult(result);
    setAnalysisValues(values);
    setProjectionSource(
      canUseProjections ? buildProjectionSource(null, values, result) : null
    );
    setTaxStrategySource(
      canUseTaxStrategy ? buildTaxStrategySource(null, values, result) : null
    );
    setExitScenarioSource(
      canUseExitScenarios
        ? buildExitScenarioSource(
            null,
            values,
            result,
            result.tenYearProjection,
            result.taxStrategyYears
          )
        : null
    );
    // Deal Score recomputed client-side with the same pure fn the server
    // action wraps — only when the user is actually entitled, so we neither
    // bypass the free-tier gate nor hammer the server on every keystroke.
    if (canUseDealScore) {
      setDealScoreResult({
        ok: true,
        tier: "pro",
        data: computeDealScore(buildDealScoreInputFromAnalysis(values, result)),
      });
    }
    lastComputedFormJsonRef.current = nextSnapshot;
  };

  useEffect(() => {
    savedDealIdRef.current = savedDealId;
  }, [savedDealId]);

  useEffect(() => {
    // Debounced (100ms): both callbacks JSON.stringify the entire form
    // for comparison, and form.watch fires on EVERY keystroke in every
    // field. Without coalescing, fast typing on a low-end phone burns
    // main-thread time per character (visible as input latency / TBT).
    // The programmatic-reset check stays SYNCHRONOUS at event time —
    // checking it inside the deferred callback would race the reset
    // flag being cleared. The recompute is read from a ref so this
    // subscription is created ONCE and its pending debounce timer is never
    // cleared by a re-render (which would drop the user's final edit).
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = form.watch(() => {
      if (isProgrammaticResetRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncFormDirtyVersusPersisted();
        recomputeOutputsFromFormRef.current();
      }, 100);
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [form, syncFormDirtyVersusPersisted]);

  /**
   * Auto-save draft for anonymous / walk-in users.
   *
   * Subscribes to form changes and debounces a localStorage write so we
   * persist the in-progress inputs without thrashing on every keystroke.
   * Skipped while we're loading a saved deal (savedDealId is set) —
   * that flow already has its own dirty-tracking and we don't want two
   * persistence systems fighting each other.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const subscription = form.watch((values) => {
      if (isProgrammaticResetRef.current) return;
      // Loaded-saved-deal flow owns its own persistence; don't shadow it.
      if (savedDealIdRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          writeCalcDraftRaw(JSON.stringify(values));
        } catch {
          /* JSON.stringify rarely throws (only on circular refs) but we never want a localStorage write to surface as an unhandled error */
        }
      }, CALC_FORM_DRAFT_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [form]);

  useEffect(() => {
    // Initialize from a one-time saved-analysis handoff when present; otherwise
    // start with a clean new-analysis state.
    isProgrammaticResetRef.current = true;
    const reopenPayloadRaw =
      window.sessionStorage.getItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY) ??
      window.localStorage.getItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
    const autoExportPdfFlag =
      window.sessionStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY) ??
      window.localStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    if (autoExportPdfFlag === "1") {
      autoExportPdfRef.current = true;
      window.sessionStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
      window.localStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    }

    if (reopenPayloadRaw) {
      try {
        const parsed = JSON.parse(reopenPayloadRaw) as {
          id?: unknown;
          formSnapshot?: unknown;
          templateFallback?: unknown;
          resultSnapshot?: unknown;
        };
        const normalized = normalizeInvestmentFormSnapshot(parsed.formSnapshot);
        if (normalized && typeof parsed.id === "string") {
          const parsedTemplateFallback =
            parsed.templateFallback &&
            typeof parsed.templateFallback === "object" &&
            !Array.isArray(parsed.templateFallback) &&
            typeof (parsed.templateFallback as { id?: unknown }).id === "string" &&
            typeof (parsed.templateFallback as { templateName?: unknown }).templateName === "string"
              ? {
                  id: (parsed.templateFallback as { id: string }).id,
                  templateName: (parsed.templateFallback as { templateName: string }).templateName,
                  templateDescription:
                    typeof (parsed.templateFallback as { templateDescription?: unknown })
                      .templateDescription === "string"
                      ? ((parsed.templateFallback as { templateDescription: string }).templateDescription)
                      : null,
                }
              : null;
          const hydratedValues: InvestmentFormValues = {
            ...normalized,
            templateId: normalized.templateId ?? parsedTemplateFallback?.id ?? undefined,
          };
          prevPropertyTypeRef.current = hydratedValues.propertyType;
          form.reset(hydratedValues);
          setSavedDealId(parsed.id);
          savedDealIdRef.current = parsed.id;
          lastPersistedFormJsonRef.current = formSnapshotForCompare(hydratedValues);
          lastComputedFormJsonRef.current = formSnapshotForCompare(hydratedValues);
          setSavedTemplateFallback(parsedTemplateFallback);
          const computedResult = calculateAnalysis(hydratedValues);
          const result = mergeSavedResultSnapshot(parsed.resultSnapshot, computedResult);
          const builtProjectionSource = canUseProjections
            ? buildProjectionSource(parsed.id, hydratedValues, result)
            : null;
          const builtTaxStrategySource = canUseTaxStrategy
            ? buildTaxStrategySource(parsed.id, hydratedValues, result)
            : null;
          setAnalysisResult(result);
          setAnalysisValues(hydratedValues);
          setProjectionSource(builtProjectionSource);
          setTaxStrategySource(builtTaxStrategySource);
          setExitScenarioSource(
            canUseExitScenarios
              ? buildExitScenarioSource(
                  parsed.id,
                  hydratedValues,
                  result,
                  result.tenYearProjection,
                  result.taxStrategyYears
                )
              : null
          );
          setDealScoreResult(null);
          setShowResults(true);
          setHasUnsavedChanges(false);
          pendingResultsScrollRef.current = true;
          void loadDealScore(hydratedValues, result);
          window.sessionStorage.removeItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
          window.localStorage.removeItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
          });
          return;
        }
      } catch {
        window.sessionStorage.removeItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
        window.localStorage.removeItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
        // Fall through to a clean reset when the handoff payload is invalid.
      }
    }

    // Calculator → analyzer handoff (P2-2): /?price=&rent=&beds=&address=
    // carries the numbers from a /tools calculator (or an embed of one).
    // Higher priority than a stale anon draft; prefills ONLY the provided
    // fields on top of defaults (partial handoffs like price+rent are
    // expected) and returns so the draft restore doesn't clobber them.
    const handoff = readAnalyzerHandoff(window.location.search);
    if (handoff) {
      if (handoff.address !== undefined) form.setValue("address", handoff.address);
      if (handoff.purchasePrice !== undefined) form.setValue("purchasePrice", handoff.purchasePrice);
      if (handoff.bedrooms !== undefined) form.setValue("bedrooms", handoff.bedrooms);
      if (handoff.monthlyRent !== undefined) form.setValue("monthlyRent", handoff.monthlyRent);
      queueMicrotask(() => {
        isProgrammaticResetRef.current = false;
      });
      return;
    }

    // No edit-handoff payload. Before falling back to a clean reset,
    // see if there's an anonymous auto-save draft from a prior visit.
    // Mobile paid traffic is the main beneficiary: phone rings mid-
    // session → returns → form is still populated → no bounce.
    const autoDraftRaw = readCalcDraftRaw();
    if (autoDraftRaw) {
      try {
        const parsedDraft = JSON.parse(autoDraftRaw) as unknown;
        const normalized = normalizeInvestmentFormSnapshot(parsedDraft);
        if (normalized) {
          prevPropertyTypeRef.current = normalized.propertyType;
          form.reset(normalized);
          // Surface the restore visibly. Without this the user just
          // sees a pre-filled form and wonders what happened.
          setRestoredFromDraft(true);
          // Capture the address so the banner can name the deal
          // specifically ("Welcome back - your draft for 1700 W Erie
          // Ave is ready"). Trim + cap to a sane length so a
          // pathologically long address can't blow out the layout.
          const addr = (normalized.address ?? "").trim();
          setRestoredAddress(addr ? addr.slice(0, 60) : null);
          // Don't auto-calculate - restoring inputs is the contract,
          // running the analysis is the user's intent click. Auto-
          // calculating would race with the loading-spinner UI and
          // ambush the user with results they didn't ask for.
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
          });
          return;
        }
        // Draft parsed but failed schema validation - wipe it so the
        // user isn't stuck with a permanently-rejected blob.
        clearCalcDraftRaw();
      } catch {
        clearCalcDraftRaw();
      }
    }

    resetToNewAnalysis("single-family");
    setSavedTemplateFallback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time mount reset
  }, []);

  useEffect(() => {
    if (isProgrammaticResetRef.current) {
      prevPropertyTypeRef.current = propertyType;
      return;
    }

    const prevType = prevPropertyTypeRef.current;
    if (prevType === propertyType) return;
    prevPropertyTypeRef.current = propertyType;
    isProgrammaticResetRef.current = true;
    // Clear single-family-only fields so stale NaN from unmounted inputs cannot fail
    // validation while Multi-Family / Owner-Occupant sections are shown.
    form.setValue("bedrooms", undefined, { shouldValidate: false, shouldDirty: false });
    form.setValue("bathrooms", undefined, { shouldValidate: false, shouldDirty: false });
    form.setValue("sqft", undefined, { shouldValidate: false, shouldDirty: false });
    form.setValue("monthlyRent", undefined, { shouldValidate: false, shouldDirty: false });
    form.setValue("units", getDefaultUnitsForPropertyType(propertyType), {
      shouldDirty: true,
      shouldValidate: true,
    });
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
    });
  }, [form, propertyType]);

  useEffect(() => {
    if (!pendingResultsScrollRef.current || isCalculating || !analysisResult) return;
    pendingResultsScrollRef.current = false;
    setTimeout(() => {
      const resultsSection = document.querySelector("[data-analysis-results='true']");
      resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [analysisResult, isCalculating]);

  // Restore the user's remembered advanced-options preference. Presence of
  // the key (either "1" or "0") marks an explicit choice, so we also flip
  // advancedUserChoiceRef to suppress the auto-open nudge below.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CALC_ADVANCED_OPEN_KEY);
      if (v === "1" || v === "0") {
        advancedUserChoiceRef.current = true;
        setAdvancedOpen(v === "1");
      }
    } catch {
      /* private mode / disabled storage - keep the default (collapsed) */
    }
  }, []);

  // Progressive disclosure nudge: the FIRST time results appear (and only
  // if the user hasn't expressed a preference), reveal the advanced
  // financing/expenses block so refining assumptions is the obvious next
  // step. Once-per-mount; never overrides a deliberate user choice, and is
  // deliberately not persisted (it's an auto behavior, not a user setting).
  useEffect(() => {
    if (!analysisResult) return;
    // In strategy-focus mode, keep the Refine section collapsed - auto-opening
    // it re-clutters the tailored form the user deliberately simplified.
    if (activeStrategyKey) return;
    if (hasAutoOpenedAdvancedRef.current || advancedUserChoiceRef.current) return;
    hasAutoOpenedAdvancedRef.current = true;
    setAdvancedOpen(true);
  }, [analysisResult, activeStrategyKey]);

  // Listen for the homepage hero's address handoff. The calculator is
  // already mounted when the hero is clicked (same page), so the live
  // event is the primary path; we ALSO drain a sessionStorage fallback
  // once on mount to cover a hard race or a cross-navigation. Both route
  // through heroAnalyzeHandlerRef.current, which dedupes on token.
  useEffect(() => {
    const onHeroAnalyze = (e: Event) => {
      const detail = (e as CustomEvent<HeroAnalyzeDetail>).detail;
      if (detail) heroAnalyzeHandlerRef.current?.(detail);
    };
    window.addEventListener(HERO_ANALYZE_EVENT, onHeroAnalyze as EventListener);
    try {
      const raw = window.sessionStorage.getItem(HERO_ANALYZE_STORAGE_KEY);
      if (raw) heroAnalyzeHandlerRef.current?.(JSON.parse(raw) as HeroAnalyzeDetail);
    } catch {
      /* malformed / unavailable storage - the live event still delivers it */
    }
    return () => window.removeEventListener(HERO_ANALYZE_EVENT, onHeroAnalyze as EventListener);
  }, []);

  const onSubmit = async (validated: InvestmentFormValues) => {
    // Use a synchronous snapshot of the live form right after validation. This
    // matches what the user sees (including fields that only exist while mounted)
    // and avoids any mismatch between RHF state and resolver output.
    const liveParse = investmentFormSchema.safeParse(form.getValues());
    const values: InvestmentFormValues = liveParse.success ? liveParse.data : validated;

    // If the user changed the purchase price away from the hero auto-
    // estimate, this verdict is on their number now — drop the
    // "estimated price" notice. (The auto-run itself keeps it: price still
    // equals the estimate at that point.)
    if (estimatedPriceValue != null && values.purchasePrice !== estimatedPriceValue) {
      setEstimatedPriceValue(null);
      setPriceEstimated(false);
    }

    isCalculatingRef.current = true;
    setIsCalculating(true);
    setIsLoadingDealScore(true);
    setShowResults(false);
    setDealScoreResult(null);

    // Consume the sample-deal Pro preview arm flag FIRST so it can never
    // leak onto a later run if anything below throws. One sample click =
    // at most one preview run.
    const sampleProPreview =
      pendingSamplePreviewRef.current &&
      !(canUseProjections && canUseTaxStrategy && canUseExitScenarios && canUseDealScore);
    pendingSamplePreviewRef.current = false;

    // PostHog funnel event - fires the moment the user commits to
    // analyzing a deal (form passed validation, calculation started).
    // This is the top of the in-product funnel above analysis_completed.
    // Properties capture the deal shape so we can later segment funnels
    // by property type / cash purchase / etc. - no PII (no address).
    trackEvent("analyzer_started", {
      property_type: values.propertyType,
      purchase_price: values.purchasePrice,
      is_cash_purchase: !values.downPaymentPct || values.downPaymentPct >= 100,
      input_tab: activeInputTab,
    });

    // Increment the global "analyses run" counter behind the homepage
    // social-proof ticker. Fires only here - on a real Run click, not on
    // saved-deal loads/restores - so it counts exactly "times Run analysis was
    // clicked." Fire-and-forget + best-effort (the action swallows its own
    // errors); never awaited, so a counter write can't slow or block the
    // analysis.
    void trackAnalysisRunAction();

    try {
      // Brief artificial delay so the loading state registers - the
      // analysis is actually instant. 400ms is enough to feel
      // intentional without burning user time. 1500ms was too long
      // for paid traffic (every second of perceived wait reduces
      // conversion measurably) - cut it ~73%.
      await new Promise((r) => setTimeout(r, 400));
      const result = calculateAnalysis(values);
      const mappedTab = mapInputTabToDashboardTab(activeInputTab);
      if (mappedTab) setActiveDashboardTab(mappedTab);
      // Sample-deal Pro preview: this run came from "Try a sample deal"
      // and the user isn't fully Pro → unlock the full report for the
      // demo (flag consumed at the top of onSubmit). Any normal run
      // exits preview mode - the state below is set unconditionally.
      setIsSampleProPreview(sampleProPreview);
      if (sampleProPreview) {
        // Funnel event - lets PostHog compare pro_checkout_started rates
        // for sessions that saw the full sample Pro report vs not.
        trackEvent("sample_pro_preview_viewed", {
          property_type: values.propertyType,
        });
      }
      // Preview runs always use a null analysisId so the trio panels
      // never call the snapshot server actions - even if a previously
      // loaded saved deal left savedDealId populated. The demo renders
      // entirely from the locally computed initialYears.
      const sourceAnalysisId = sampleProPreview ? null : savedDealId;
      const builtProjectionSource = canUseProjections || sampleProPreview
        ? buildProjectionSource(sourceAnalysisId, values, result)
        : null;
      const builtTaxStrategySource = canUseTaxStrategy || sampleProPreview
        ? buildTaxStrategySource(sourceAnalysisId, values, result)
        : null;
      setAnalysisResult(result);
      setAnalysisValues(values);
      // Fire Google Ads conversion event - primary intent signal we can
      // optimize spend against (analyze-an-actual-deal is the
      // micro-conversion that precedes signup).
      trackConversion("calc_completed");
      // PostHog funnel event - fires once the analysis is rendered.
      // Properties include the headline metrics so PostHog dashboards
      // can segment "users who saw a STRONG BUY verdict" vs "users who
      // saw AVOID" and compare downstream conversion to Pro.
      trackEvent("analysis_completed", {
        property_type: values.propertyType,
        cap_rate: result.capRate,
        coc_return: result.cocReturn,
        dscr: result.dscr,
        monthly_cash_flow: Math.round(result.netCashFlow),
        is_cash_purchase: result.monthlyPayment <= 0,
        input_tab: activeInputTab,
      });
      setProjectionSource(builtProjectionSource);
      setTaxStrategySource(builtTaxStrategySource);
      setExitScenarioSource(
        canUseExitScenarios || sampleProPreview
          ? buildExitScenarioSource(
              sourceAnalysisId,
              values,
              result,
              result.tenYearProjection,
              result.taxStrategyYears
            )
          : null
      );
      const computedFingerprint = formSnapshotForCompare(values);
      if (computedFingerprint) lastComputedFormJsonRef.current = computedFingerprint;
      setIsCalculating(false);
      setShowResults(true);
      if (sampleProPreview && !canUseDealScore) {
        // Compute the full Deal Score client-side for the demo using
        // the same pure function the server action wraps. No server
        // call, no entitlement bypass - the sample can't be saved.
        setDealScoreResult({
          ok: true,
          tier: "pro",
          data: computeDealScore(buildDealScoreInputFromAnalysis(values, result)),
        });
        setIsLoadingDealScore(false);
      } else {
        await loadDealScore(values, result);
      }
      toast({
        title: "Analysis Complete",
        description: `Net cash flow: $${result.netCashFlow.toLocaleString()}/mo | CoC: ${result.cocReturn.toFixed(1)}%`,
      });
      // Scroll to the TOP of the results dashboard, not the bottom of
      // the page. The previous behavior dumped users at the footer past
      // the entire dashboard, which felt jarring + made the headline
      // metrics + recommendation card invisible until they scrolled
      // back up. We use the data-attribute marker so we're not coupled
      // to a fragile DOM structure. By this point the dashboard has
      // already mounted (setShowResults(true) ran upstream and
      // loadDealScore awaited a server roundtrip), so the RAF is
      // belt-and-suspenders for layout-paint settle.
      requestAnimationFrame(() => {
        const target = document.querySelector('[data-analysis-results="true"]');
        if (target && typeof (target as HTMLElement).getBoundingClientRect === "function") {
          const rect = (target as HTMLElement).getBoundingClientRect();
          // Subtract a small offset so the results card isn't flush
          // with the top edge - gives the eye some breathing room.
          const y = window.scrollY + rect.top - 16;
          window.scrollTo({ top: y, behavior: "smooth" });
          // Move keyboard/screen-reader focus to the results region too, so
          // non-sighted users land on the verdict instead of being stranded
          // on the submit button while the page scrolls visually past them.
          // preventScroll: our own smooth scroll above owns the motion.
          (target as HTMLElement).focus({ preventScroll: true });
        }
      });
    } finally {
      isCalculatingRef.current = false;
      setIsCalculating(false);
      setIsLoadingDealScore(false);
      syncFormDirtyVersusPersisted();
    }
  };

  const onError = (errors: FieldErrors<InvestmentFormValues>) => {
    // Disarm the sample Pro preview if the sample submit somehow failed
    // validation - otherwise the armed flag would leak onto the user's
    // next manual Calculate and unlock Pro on their own deal.
    pendingSamplePreviewRef.current = false;
    const findFirstFieldError = (
      value: unknown,
      currentPath = ""
    ): { path: string; message?: string } | null => {
      if (!value || typeof value !== "object") return null;

      if (
        currentPath &&
        "message" in value &&
        typeof (value as { message?: unknown }).message === "string"
      ) {
        return {
          path: currentPath,
          message: (value as { message: string }).message,
        };
      }

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) {
          const nested = findFirstFieldError(
            value[i],
            currentPath ? `${currentPath}.${i}` : `${i}`
          );
          if (nested) return nested;
        }
        return null;
      }

      for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const nestedPath = currentPath ? `${currentPath}.${key}` : key;
        const nested = findFirstFieldError(nestedValue, nestedPath);
        if (nested) return nested;
      }
      return null;
    };

    const unitsErrorMessage =
      (errors.units as { message?: string; root?: { message?: string } } | undefined)?.message ??
      (errors.units as { message?: string; root?: { message?: string } } | undefined)?.root?.message;
    const hasUnitFieldErrors =
      Array.isArray(errors.units) &&
      errors.units.some(
        (unitErr) =>
          !!unitErr?.bedrooms ||
          !!unitErr?.bathrooms ||
          !!unitErr?.sqft ||
          !!unitErr?.monthlyRent
      );

    if (hasUnitFieldErrors && Array.isArray(errors.units)) {
      // Focus the first invalid unit input so the inline error message is visible.
      for (let i = 0; i < errors.units.length; i += 1) {
        const unitErr = errors.units[i];
        if (!unitErr) continue;
        const firstInvalidField = (
          ["bedrooms", "bathrooms", "sqft", "monthlyRent"] as const
        ).find((key) => !!unitErr[key]);
        if (firstInvalidField) {
          form.setFocus(`units.${i}.${firstInvalidField}` as const);
          break;
        }
      }
    }
    const firstFieldError = findFirstFieldError(errors);
    if (!hasUnitFieldErrors && firstFieldError?.path) {
      form.setFocus(firstFieldError.path as never);
    }

    toast({
      title: "Validation Error",
      description:
        unitsErrorMessage ??
        firstFieldError?.message ??
        "Please fix the highlighted fields before calculating.",
      variant: "destructive",
    });
  };

  const handleSaveDeal = async () => {
    if (savedDealId && !canUpdateSavedDeals) {
      toast({
        title: "Upgrade required",
        description: "Upgrade to update saved analyses.",
        variant: "destructive",
      });
      router.push("/profile#billing");
      return;
    }

    setIsSavingDeal(true);
    try {
      const currentValues = form.getValues();
      const result = await saveDealAction(
        currentValues,
        savedDealId,
        buildProvenanceInput(enrichmentCaptureRef.current, currentValues)
      );
      if (result.ok) {
        const parsedValues = investmentFormSchema.safeParse(form.getValues());
        setSavedDealId(result.id);
        savedDealIdRef.current = result.id;
        // Deal is now persisted server-side - the local anonymous
        // auto-save draft is no longer needed. If we leave it, the
        // next anonymous visitor on this device would see this deal's
        // inputs, which is both confusing and a minor privacy concern.
        clearCalcDraftRaw();
        if (result.mode === "inserted") {
          setSavedDealCount((count) => count + 1);
          // Auto-pull RentCast comps ONCE for a Pro user's newly-saved deal so
          // the comps appear on its report without a manual lookup. Fire-and-
          // forget - never blocks the save. The action enforces entitlement +
          // monthly caps + 30-day cache and persists the set onto the deal.
          // Gated to Pro (canUseProjections) so a free user's one-lifetime
          // comps freebie is never silently spent on save.
          if (canUseProjections && parsedValues.success && result.id) {
            void getPropertyCompsAction({
              address: parsedValues.data.address,
              propertyType: parsedValues.data.propertyType,
              dealId: result.id,
            });
          }
          // Only fire the conversion event on a true first-save, not
          // on subsequent updates of an existing deal. Otherwise a
          // power-user editing a saved deal 5 times would emit 5
          // 'deal_saved' events and skew the optimizer.
          trackConversion("deal_saved");
          trackEvent("deal_saved", {
            property_type: form.getValues().propertyType,
            purchase_price: form.getValues().purchasePrice,
            cap_rate: analysisResult?.capRate,
            monthly_cash_flow: analysisResult ? Math.round(analysisResult.netCashFlow) : undefined,
          });
        }
        const persistedJson = formSnapshotForCompare(form.getValues());
        if (persistedJson) lastPersistedFormJsonRef.current = persistedJson;
        if (parsedValues.success) {
          const values = parsedValues.data;
          const savedResult = calculateAnalysis(values);
          const builtProjectionSource = canUseProjections
            ? buildProjectionSource(result.id, values, savedResult)
            : null;
          const builtTaxStrategySource = canUseTaxStrategy
            ? buildTaxStrategySource(result.id, values, savedResult)
            : null;
          setAnalysisResult(savedResult);
          setAnalysisValues(values);
          setProjectionSource(builtProjectionSource);
          setTaxStrategySource(builtTaxStrategySource);
          setExitScenarioSource(
            canUseExitScenarios
              ? buildExitScenarioSource(
                  result.id,
                  values,
                  savedResult,
                  savedResult.tenYearProjection,
                  savedResult.taxStrategyYears
                )
              : null
          );
          if (persistedJson) lastComputedFormJsonRef.current = persistedJson;
          void loadDealScore(values, savedResult);
        } else {
          setProjectionSource((prev) => (prev ? { ...prev, analysisId: result.id } : prev));
          setTaxStrategySource((prev) => (prev ? { ...prev, analysisId: result.id } : prev));
          setExitScenarioSource((prev) => (prev ? { ...prev, analysisId: result.id } : prev));
        }
        setHasUnsavedChanges(false);
        window.dispatchEvent(new CustomEvent("saved-analyses-changed"));
        toast({
          title: result.mode === "updated" ? "Deal updated" : "Deal saved",
          description:
            result.mode === "updated"
              ? "Your saved analysis was updated with the latest inputs."
              : "Your analysis was saved to your account.",
          variant: "success",
        });
        return;
      }
      if (result.code === "SIGN_IN_REQUIRED") {
        toast({
          title: "Sign in required",
          description: "Create an account or sign in to save deals.",
          variant: "destructive",
        });
        return;
      }
      if (result.code === "ENTITLEMENT_SAVE") {
        toast({
          title: "Upgrade required",
          description: result.message ?? "Subscribe to save and unlock Pro features.",
          variant: "destructive",
        });
        return;
      }
      if (result.code === "DUPLICATE_ADDRESS") {
        toast({
          title: "Already saved",
          description:
            result.message ??
            "You already saved an analysis for this address. Open it to update, or change the address to save a new scenario.",
          action: (
            <ToastAction altText="View your saved deals" onClick={() => router.push("/saved-analyses")}>
              View deals
            </ToastAction>
          ),
        });
        return;
      }
      toast({
        title: "Could not save",
        description: result.message ?? "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDeal(false);
    }
  };

  /** Fill the form from pulled comps (facts + AVM estimates). Deal-specific
   *  fields the user typed are overwritten intentionally - they clicked "Use
   *  these numbers" - and recompute fires via the form watch. */
  const handleApplyComps = (enrichment: PropertyEnrichment) => {
    const f = enrichment.facts;
    if (f?.bedrooms != null) form.setValue("bedrooms", f.bedrooms, { shouldDirty: true, shouldValidate: true });
    if (f?.bathrooms != null) form.setValue("bathrooms", f.bathrooms, { shouldDirty: true, shouldValidate: true });
    if (f?.squareFootage != null) form.setValue("sqft", f.squareFootage, { shouldDirty: true, shouldValidate: true });
    if (enrichment.valueEstimate != null) {
      form.setValue("purchasePrice", Math.round(enrichment.valueEstimate), { shouldDirty: true, shouldValidate: true });
    }
    const pt = form.getValues("propertyType");
    if (enrichment.rentEstimate != null && (pt === "single-family" || pt === "owner-occupant")) {
      form.setValue("monthlyRent", Math.round(enrichment.rentEstimate), { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleExportPdf = async (mode: ReportMode = "personal") => {
    if (!analysisResult) return;
    const oneTimeUnlocked = oneTimePdfUnlockedRef.current;
    // Without entitlement (or auth), offer the two purchase paths
    // instead of the old dead-end toast: Pro, or the $5 one-time PDF.
    // A verified one-time payment bypasses this gate exactly once.
    if (!oneTimeUnlocked && (!isAuthenticated || !canExportPdf)) {
      setIsPdfPurchaseDialogOpen(true);
      return;
    }
    setIsExportingPdf(true);
    try {
      const values = form.getValues();
      const projectionYears = projectionSource?.initialYears ?? analysisResult.tenYearProjection;
      const taxYears = taxStrategySource?.initialYears ?? analysisResult.taxStrategyYears;
      const exitYears =
        exitScenarioSource?.initialYears ??
        buildExitScenarios({
          purchasePrice: values.purchasePrice,
          ...resolveExitScenarioRates({
            appreciationRatePct: values.appreciationRatePct,
            sellingCostPct: values.sellingCostPct,
          }),
          loanAmount: analysisResult.loanAmount,
          interestRate: values.interestRate,
          loanTermYears: values.loanTermYears,
          monthlyPayment: analysisResult.monthlyPayment,
          downPayment: analysisResult.downPayment,
          closingCosts: analysisResult.closingCosts,
          cumulativeCashFlowByYear: projectionYears.map((year) => year.cumulativeCashFlowAnnual),
          cumulativeTaxBenefitByYear: taxYears.map((year) => year.cumulativeTaxBenefitAnnual),
          annualDepreciation: taxYears[0]?.depreciationDeductionAnnual ?? 0,
        });

      // The exported Deal Score is the canonical Balanced score (computed inside
      // toPdfReportData) - the same number every surface shows - so the report
      // never contradicts the screen it came from regardless of the active lens.
      const reportData = toPdfReportData({
        values,
        result: analysisResult,
        projectionYears,
        taxYears,
        exitYears,
      });

      // Attach this deal's stored RentCast comps (saved deals only - reads the
      // saved set, no API call) so the report includes the comp tables.
      if (savedDealId) {
        try {
          const { getSavedDealCompsAction } = await import("@/app/actions/property-comps");
          const compsRes = await getSavedDealCompsAction(savedDealId);
          if (compsRes.ok && compsRes.enrichment) {
            const { enrichmentToReportComps } = await import("@/lib/report-comps");
            reportData.comps = enrichmentToReportComps(compsRes.enrichment);
          }
        } catch {
          /* export proceeds without comps */
        }
      }

      // Lazy-load the PDF generator on first Export click. This keeps
      // jspdf + chart.js (~130-150 KB gzipped) out of the homepage's
      // initial JS bundle. First click triggers a ~150-300ms fetch on a
      // slow 4G connection; subsequent clicks are instant (cached).
      const { generateInvestmentPDF } = await import("@/lib/pdf-generator");
      // Fetch Pro-tier branding (logo, color, contact info) in parallel
      // with the PDF generator dynamic import. getBranding is cheap and
      // gracefully returns null branding for unentitled or unconfigured
      // users, in which case the PDF falls back to TrueCap defaults.
      const { getBranding } = await import("@/app/actions/branding");
      const brandingResult = await getBranding();
      const brandingConfig =
        brandingResult.ok && brandingResult.branding
          ? {
              logoUrl: brandingResult.branding.logo_url,
              primaryColorHex: brandingResult.branding.primary_color_hex,
              companyName: brandingResult.branding.company_name,
              tagline: brandingResult.branding.tagline,
              contactName: brandingResult.branding.contact_name,
              contactEmail: brandingResult.branding.contact_email,
              contactPhone: brandingResult.branding.contact_phone,
              contactWebsite: brandingResult.branding.contact_website,
            }
          : null;
      await generateInvestmentPDF(reportData, brandingConfig, mode);
      // Consume the one-time unlock only after a successful generation
      // so a transient failure doesn't burn the purchase.
      if (oneTimeUnlocked) oneTimePdfUnlockedRef.current = false;
      // Fire the Google Ads conversion event. PDF export = high-intent
      // signal (user is sharing the analysis with a lender / partner).
      // Even though it's not a revenue event, surfacing it to the Ads
      // optimizer gives the bidding algo extra positive signal beyond
      // the rare 'paid_subscribed' event - critical for new accounts
      // where conversion data is sparse.
      trackConversion("pdf_exported");
      trackEvent("pdf_exported", {
        property_type: values.propertyType,
        purchase_price: values.purchasePrice,
        has_deal_score: Boolean(dealScoreResult?.ok && dealScoreResult.tier === "pro"),
      });
      // If the user hasn't configured branding yet, the toast nudges
      // them to do so. The link routes to /settings/branding, which
      // gates by entitlement: Pro users see the form, free users see
      // the upsell. So this nudge serves both as a discovery hint for
      // Pro users and a soft conversion prompt for free users.
      const brandingHint = !brandingConfig ? (
        <Link
          href="/settings/branding"
          className="mt-1 inline-block text-xs font-semibold underline-offset-2 hover:underline"
        >
          Customize how your PDFs look →
        </Link>
      ) : null;
      toast({
        title: "PDF generated",
        description: (
          <span>
            Your report was exported from the latest live analysis data.
            {brandingHint}
          </span>
        ),
        variant: "success",
      });
    } catch (err) {
      // Surface PDF errors so we don't fail silently - was silently
      // swallowed before because the original 'jspdf/dist/...' import
      // broke on some jspdf versions.
      console.error("[handleExportPdf] PDF generation failed:", err);
      toast({
        title: "PDF export failed",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong generating the PDF. Try again, and if it persists let us know.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  /**
   * Start the $5 one-time PDF checkout. Stashes the current form values
   * in localStorage first so the deal survives the Stripe redirect.
   */
  const handleBuyOneTimePdf = async () => {
    setIsStartingPdfCheckout(true);
    try {
      try {
        window.localStorage.setItem(
          ONE_TIME_PDF_DRAFT_KEY,
          JSON.stringify({ v: 1, values: form.getValues(), savedAt: Date.now() })
        );
      } catch {
        // Storage unavailable (private mode quota etc.) - checkout still
        // works; worst case the user re-enters values after returning
        // and exports with the unlock.
      }
      trackEvent("one_time_pdf_checkout_started", {
        property_type: form.getValues().propertyType,
      });
      const result = await createOneTimePdfCheckoutAction();
      if (result.ok) {
        window.location.assign(result.url);
        return; // navigating away; leave the spinner on
      }
      toast({
        title: "Checkout unavailable",
        description: result.message,
        variant: "destructive",
      });
    } catch (err) {
      console.warn("[one-time-pdf] checkout start failed:", err);
      toast({
        title: "Checkout unavailable",
        description: "Something went wrong starting checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStartingPdfCheckout(false);
    }
  };

  /**
   * Return-from-Stripe handler for the one-time PDF purchase. Runs once
   * on mount: verifies payment server-side, restores the stashed deal,
   * re-runs the analysis, and auto-exports the full PDF.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("pdf_purchase");
    if (!sessionId) return;

    // Strip the param immediately so refresh / back-nav doesn't re-run.
    params.delete("pdf_purchase");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));

    if (sessionId === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No charge was made. Your deal is still in the form below.",
      });
      return;
    }

    void (async () => {
      const verified = await verifyOneTimePdfPaymentAction({ sessionId });
      if (!verified.ok) {
        toast({
          title: "Payment not confirmed",
          description: verified.message,
          variant: "destructive",
        });
        return;
      }

      oneTimePdfUnlockedRef.current = true;
      trackEvent("one_time_pdf_purchased", {});

      // Restore the stashed deal and auto-run analysis → auto-export.
      let restoredValues: InvestmentFormValues | null = null;
      try {
        const raw = window.localStorage.getItem(ONE_TIME_PDF_DRAFT_KEY);
        if (raw) {
          const parsedDraft = JSON.parse(raw) as { values?: unknown };
          const parsedValues = investmentFormSchema.safeParse(parsedDraft?.values);
          if (parsedValues.success) restoredValues = parsedValues.data;
        }
      } catch {
        // Corrupt/missing draft - fall through to the manual path below.
      }
      window.localStorage.removeItem(ONE_TIME_PDF_DRAFT_KEY);

      if (!restoredValues) {
        toast({
          title: "Payment received - PDF unlocked",
          description:
            "Re-enter your deal and click Export PDF. Your one-time report is unlocked.",
          variant: "success",
        });
        return;
      }

      toast({
        title: "Payment received",
        description: "Rebuilding your analysis and generating the report…",
        variant: "success",
      });
      Object.entries(restoredValues).forEach(([key, value]) => {
        form.setValue(key as keyof InvestmentFormValues, value as never, {
          shouldDirty: true,
          shouldValidate: false,
          shouldTouch: false,
        });
      });
      // Auto-export once the analysis result lands (existing effect
      // watches autoExportPdfRef). Same double-RAF as the sample deal:
      // let RHF flush before submitting.
      autoExportPdfRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void form.handleSubmit(onSubmit, onError)();
        });
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewAnalysis = () => {
    // Workflow protection: if the user has unsaved work in the form
    // (analysis run + un-persisted, OR a saved deal edited but not
    // re-saved), confirm before nuking the form. resetToNewAnalysis
    // wipes address/price/rent and clears the localStorage draft, so
    // a misclick here is irrecoverable. A native confirm() is the
    // lightest possible guard - no modal infrastructure needed.
    const shouldConfirm =
      Boolean(analysisResult) || hasUnsavedChanges || Boolean(savedDealId);
    if (shouldConfirm) {
      const ok =
        typeof window === "undefined"
          ? true
          : window.confirm(
              "Start a new analysis? Your current work will be cleared.\n\nIf you want to keep this deal, cancel and save it first."
            );
      if (!ok) return;
    }
    resetToNewAnalysis("single-family");
    setSavedTemplateFallback(null);
  };

  useEffect(() => {
    if (!autoExportPdfRef.current) return;
    if (!analysisResult) return;
    autoExportPdfRef.current = false;
    void handleExportPdf();
  }, [analysisResult]);

  /**
   * Workflow protection - warn before unloading the page when the
   * user has unsaved edits to an existing saved deal. We deliberately
   * skip this for anonymous users (no save path) and brand-new
   * previews (localStorage auto-save catches them on next visit).
   * Browser policy ignores custom messages now, but the prompt itself
   * still fires - that's enough to prevent the accidental close.
   */
  useEffect(() => {
    const shouldWarn = isAuthenticated && Boolean(savedDealId) && hasUnsavedChanges;
    if (!shouldWarn) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required for older browsers - modern browsers show a generic
      // "Reload site? Changes you made may not be saved." regardless
      // of returnValue text.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isAuthenticated, savedDealId, hasUnsavedChanges]);

  const handleCompareDeals = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in before comparing deals.",
        variant: "destructive",
      });
      router.push("/auth/login");
      return;
    }
    if (!canCompareDeals) {
      toast({
        title: "Upgrade required",
        description: "Compare deals is not available for your current plan.",
        variant: "destructive",
      });
      router.push("/profile#billing");
      return;
    }
    if (!savedDealId || hasUnsavedChanges) {
      toast({
        title: "Save required",
        description: "Save the latest analysis before adding it to compare.",
        variant: "warning",
      });
      return;
    }
    setIsComparingDeals(true);
    try {
      const result = await addDealToCompareAction(savedDealId);
      if (!result.ok) {
        toast({
          title: "Could not add to compare",
          description: result.message,
          variant: result.code === "LIMIT_EXCEEDED" ? "warning" : "destructive",
        });
        return;
      }
      toast({
        title: "Added to compare",
        description: "Your saved analysis was added to the compare workspace.",
        variant: "success",
      });
      router.push("/dashboard/compare");
    } finally {
      setIsComparingDeals(false);
    }
  };

  /**
   * "Try a sample deal" - pre-fills the form with a realistic
   * Philadelphia rental and triggers calculate. The single biggest
   * friction-killer for cold paid traffic: visitor lands on the
   * calculator, sees a wall of empty fields, bounces. This button
   * gives them a fully-populated working demo in one click.
   */
  const handleTrySampleDeal = () => {
    // Shared single source of truth (lib/sample-deal.ts) - the homepage
    // hero mock card COMPUTES its displayed numbers from these same
    // values, so the demo can never contradict the marketing card
    // again (it did once: 'Strong Buy · 84' on the card, 'Risky · 20'
    // in the actual analysis).
    const sample: Partial<InvestmentFormValues> = SAMPLE_DEAL_VALUES;
    // Apply each field via setValue so RHF dirties and the form's
    // controlled inputs re-render with the new values immediately.
    Object.entries(sample).forEach(([key, value]) => {
      form.setValue(key as keyof InvestmentFormValues, value as never, {
        shouldDirty: true,
        shouldValidate: false,
        shouldTouch: false,
      });
    });

    // Arm the one-shot Pro preview for this run - consumed in onSubmit.
    pendingSamplePreviewRef.current = true;

    // Show the toast right away so the user sees confirmation that
    // the demo loaded - important because the submit fires async and
    // we want a UI signal that *something* happened on click.
    toast({
      title: "Sample rental loaded",
      description:
        "Running the analysis on a real Philadelphia rental - with a full Pro report preview unlocked for this demo.",
    });

    // Defer the submit to the next paint frame. RHF's setValue calls
    // above schedule re-renders asynchronously - submitting in the same
    // tick can race the field updates and, more importantly, the user
    // never sees the prefilled form before being teleported to results.
    // Two requestAnimationFrames = one to flush the setValue renders,
    // one to let the prefilled state actually paint, then submit.
    // Net delay ~32ms, imperceptible.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void form.handleSubmit(onSubmit, onError)();
      });
    });
  };

  // Latest-closure assignment for the hero address handoff (refs declared
  // up top; the listener effect calls this). Runs every render so it always
  // sees the current form + handlers without re-subscribing the listener.
  heroAnalyzeHandlerRef.current = (detail: HeroAnalyzeDetail) => {
    if (!detail || typeof detail.token !== "string") return;
    // Idempotency: the same payload can arrive via both the live event and
    // the sessionStorage fallback - handle it once.
    if (lastHeroTokenRef.current === detail.token) return;
    lastHeroTokenRef.current = detail.token;
    try {
      window.sessionStorage.removeItem(HERO_ANALYZE_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    // "Try a sample deal" from the hero → run the existing full sample flow.
    if (detail.sample) {
      handleTrySampleDeal();
      return;
    }

    const address = (detail.address ?? "").trim();
    if (!address) return;
    form.setValue("address", address, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });

    const landOnPrice = () => {
      // Fallback: land the user on the one field still needed.
      requestAnimationFrame(() => {
        try {
          form.setFocus("purchasePrice");
        } catch {
          /* field may be unmounted for some property types - non-fatal */
        }
      });
    };

    // No Google Places components → can't enrich or estimate; just land
    // the user on the price field (legacy behavior).
    if (!(detail.state || detail.county || detail.zip)) {
      landOnPrice();
      return;
    }

    const place: SelectedAddress = {
      formattedAddress: address,
      state: detail.state,
      county: detail.county,
      zip: detail.zip,
    };
    lastSelectedAddressRef.current = place;

    // Run the SAME enrichment an in-form selection triggers (rent/rate/
    // tax), THEN estimate a purchase price from the address-specific rent
    // so a cold visitor sees an INSTANT verdict. The price is clearly
    // labeled an estimate on the result screen and is fully editable — we
    // never persist it or pass it off as the real asking price.
    void (async () => {
      try {
        await runPropertyEnrichment(place);
      } catch (err) {
        console.warn("[hero handoff] enrichment failed:", err);
      }

      const canEstimate =
        form.getValues("propertyType") === "single-family" &&
        isEmptyNumber(form.getValues("purchasePrice")) &&
        !isEmptyNumber(form.getValues("monthlyRent"));

      if (canEstimate) {
        const est = estimatePurchasePrice({
          monthlyRent: Number(form.getValues("monthlyRent")),
          state: detail.state,
        });
        if (est) {
          form.setValue("purchasePrice", est.price, {
            shouldDirty: false,
            shouldValidate: false,
            shouldTouch: false,
          });
          setEstimatedPriceValue(est.price);
          setPriceEstimateBasis(est.basis);
          setPriceEstimated(true);
          // Auto-run the verdict. Double-rAF lets RHF flush the setValue
          // calls before validation (same pattern as the sample deal).
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              void form.handleSubmit(onSubmit, onError)();
            });
          });
          return;
        }
      }

      landOnPrice();
    })();
  };

  const toggleAdvanced = () => {
    advancedUserChoiceRef.current = true;
    const next = !advancedOpen;
    if (next) trackEvent("optional_section_opened", { source: "toggle" });
    setAdvancedOpen(next);
    try {
      window.localStorage.setItem(CALC_ADVANCED_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  /**
   * "Enter price" from the estimated-price notice: jump back to the form
   * and focus the purchase-price field so confirming the one estimated
   * input is a single click from the verdict.
   */
  const handleEditPrice = () => {
    if (typeof window !== "undefined") {
      const el = document.getElementById("main");
      if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
    }
    requestAnimationFrame(() => {
      try {
        form.setFocus("purchasePrice");
      } catch {
        /* field may be unmounted for some property types — non-fatal */
      }
    });
  };

  /**
   * "Edit assumptions" from the result-state trust strip: open the
   * Improve-accuracy section and jump back to the form so refining a
   * default is one click from the numbers the user is judging.
   */
  const handleEditAssumptions = () => {
    advancedUserChoiceRef.current = true;
    setAdvancedOpen(true);
    try {
      window.localStorage.setItem(CALC_ADVANCED_OPEN_KEY, "1");
    } catch {
      /* ignore */
    }
    trackEvent("result_assumptions_edited", {});
    trackEvent("optional_section_opened", { source: "edit_link" });
    if (typeof window !== "undefined") {
      const el = document.getElementById("main");
      if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            {/* Heading level is auth-aware: for cold visitors the
                marketing hero above already renders the page's single
                <h1> ("Stop losing deals to bad math.") - two H1s on
                one page dilutes the SEO signal and confuses screen-
                reader document outlines. For signed-in users the hero
                is skipped entirely, so this becomes the page's H1. */}
            {isAuthenticated ? (
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-foreground mb-2 text-balance">
                Analyze Your Investment Property
              </h1>
            ) : (
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-foreground mb-2 text-balance">
                Analyze Your Investment Property
              </h2>
            )}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Get institutional-grade analysis with cash flow projections, tax benefits, and risk
              assessment in seconds.
            </p>
          </div>
          {/* Sample-deal button - anonymous visitors only, before any
              analysis has run. Signed-in users already know the product
              (and their onboarding tour now starts with their own first
              deal), so the demo button is pure noise for them - removed
              Jun 2026. For cold traffic it's promoted from a quiet chip
              to a filled primary button: it's the single highest-value
              click on the page now that it unlocks the full Pro report. */}
          {!isAuthenticated && analysisResult === null && !isCalculating && (
            <button
              type="button"
              onClick={handleTrySampleDeal}
              className="group inline-flex shrink-0 flex-col items-start gap-0.5 self-start rounded-xl bg-primary px-5 py-3 text-left shadow-[0_10px_24px_rgba(0,_112,_196,0.28)] transition-transform hover:-translate-y-0.5 sm:self-end"
              aria-label="Try a sample rental - preview a sample Pro report on a real Philadelphia rental"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-foreground">
                <Sparkles className="size-4" />
                Try a sample rental
              </span>
              <span className="text-[11px] font-medium text-primary-foreground/80">
                Preview a sample Pro report
              </span>
            </button>
          )}
        </div>

        {/* "Welcome back" banner - only shown when the form was just
            restored from a localStorage auto-save draft. Without this
            the user sees a pre-filled form and wonders what happened.
            "Start fresh" wipes the draft and resets to defaults, which
            also matters for shared-device cases (cafe laptop, etc). */}
        {restoredFromDraft && analysisResult === null && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/30 bg-[var(--brand-blue-light)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 sm:items-center">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
              <p className="leading-relaxed text-foreground">
                <strong className="font-bold">Welcome back —</strong>{" "}
                {restoredAddress ? (
                  <span className="text-muted-foreground">
                    your draft for{" "}
                    <span className="font-semibold text-foreground">
                      {restoredAddress}
                    </span>{" "}
                    is ready. Edit anything below or
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    picked up where you left off. Edit anything below or
                  </span>
                )}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setRestoredFromDraft(false);
                    setRestoredAddress(null);
                    resetToNewAnalysis("single-family");
                  }}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  start fresh
                </button>
                <span className="text-muted-foreground">.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRestoredFromDraft(false)}
              aria-label="Dismiss welcome-back banner"
              className="self-end rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-card hover:text-foreground sm:self-auto sm:py-1.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input tabs - only rendered AFTER the first Calculate run.
            Previously these were always visible but disabled with a
            tooltip ("Calculate the analysis first") - which inverted
            the UX: new users saw a disabled tab strip above the form
            and misread it as "I need to pick a tab to start." Hiding
            them until results exist removes the confusion entirely;
            once analysisResult is set, the tabs appear AND are
            functional, exactly when the user needs them.

            The tabs scroll horizontally on mobile (any width) and grid
            on sm/xl. The 4-col mobile grid was previously too cramped
            and would force 10px text with tiny tap targets. */}
        {areAnalysisTabsEnabled ? (
        <div className="flex gap-1.5 sm:gap-3 mt-4 sm:mt-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4 scrollbar-none">
          {INPUT_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              disabled={!areAnalysisTabsEnabled}
              aria-disabled={!areAnalysisTabsEnabled}
              title={!areAnalysisTabsEnabled ? "Calculate the analysis first." : undefined}
              onClick={() => handleInputTabClick(tab.id)}
              className={cn(
                "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-[12px] sm:text-sm font-medium shrink-0 sm:shrink min-w-[88px] sm:min-w-0 transition-colors",
                areAnalysisTabsEnabled && tab.id === activeInputTab
                  ? "bg-[var(--brand-green-light)] border-[var(--brand-green)]/30 text-[var(--brand-green)]"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                !areAnalysisTabsEnabled && "cursor-not-allowed opacity-50 hover:bg-card hover:text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {tab.id === "cash-flow" && (
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                {tab.id === "projections" && (
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                {tab.id === "tax-strategy" && (
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                {tab.id === "deal-score" && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </div>
              {tab.isFree && !canUseProjections && (
                <span className="inline-flex text-[9px] sm:text-[10px] font-bold bg-[var(--brand-green)] text-white px-1.5 sm:px-2 py-0.5 rounded-full uppercase shrink-0 ml-1 sm:ml-1.5">
                  FREE
                </span>
              )}
              {tab.isPro &&
                ((tab.id === "projections" && !canUseProjections) ||
                  (tab.id === "tax-strategy" && !canUseTaxStrategy) ||
                  (tab.id === "deal-score" && !canUseDealScore)) && (
                // Lock icon now shows on mobile too - mobile users
                // previously couldn't tell a tab was Pro-gated until
                // they tapped and hit a paywall. Surfacing the lock
                // upfront prevents the bait-and-switch UX.
                <Lock className="block w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[var(--brand-orange)] ml-1 sm:ml-1.5" />
              )}
            </button>
          ))}
        </div>
        ) : null}
      </section>

      {/* Form */}
      {/* Bottom padding on mobile reserves room for the fixed Calculate bar
          (~h-12 button + its own safe-area pad) so the last form control is
          never trapped under it on phones with a home indicator. */}
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-16">
        <form
          ref={formElementRef}
          onSubmit={form.handleSubmit(onSubmit, onError)}
          // Cmd+Enter (Mac) / Ctrl+Enter (Win/Linux) anywhere inside
          // the form fires the calculate submit. Power-user shortcut
          // that doesn't conflict with normal field editing (plain
          // Enter still works as the textarea/Tab behavior the user
          // expects).
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void form.handleSubmit(onSubmit, onError)();
            }
          }}
          noValidate
        >
          <div className="space-y-5">
            {/* Guided step rail (AN-1) - sticky orientation + jump navigation
                over the existing form. Additive: reads values + scrolls only;
                never gates input or changes the manual run flow. */}
            <AnalyzerStepRail
              steps={analyzerSteps}
              activeStepId={activeStep}
              onNavigate={handleStepNavigate}
              className="sticky top-2 z-20"
            />

            <StrategyChips activeKey={activeStrategyKey} onSelect={handleSelectStrategy} />

            <div id="step-property" className="space-y-5 scroll-mt-24">
              {!activeStrategy && (
                <PropertyTypeSection form={form} savedTemplateFallback={savedTemplateFallback} />
              )}
              <PropertyDetailsSection
                form={form}
                onAddressSelected={handleAddressSelected}
                onAutofillFromAddress={handleAutofillFromAddress}
                isAutofilling={isAutofilling}
                // Show Autofill to anonymous users too — it's the clearest
                // expression of the core promise. The handler already returns a
                // graceful "Sign in to autofill" toast for signed-out users, so
                // the button becomes a sign-in CTA instead of being hidden.
                showAutofill={!autofillUnavailable}
                showYearBuilt={!activeStrategy}
                priceLabel={activeStrategy?.priceLabel}
              />
            </div>

            {/* Single-family: only the two fields a cash-flow run needs
                (bedrooms → HUD rent auto-fill, rent → the math) on the
                first screen. Bathrooms + square feet are optional and live
                in the "Improve accuracy" block below. */}
            <div id="step-income" className="scroll-mt-24">
              {propertyType === "single-family" && (
                <SingleFamilyUnitSection
                  form={form}
                  fields="primary"
                  hideBedrooms={!!activeStrategy}
                  rentLabel={activeStrategy?.rentLabel}
                />
              )}
              {(propertyType === "multi-family" || propertyType === "owner-occupant") && (
                <MultiFamilyUnitsSection
                  form={form}
                  isHouseHack={propertyType === "owner-occupant"}
                />
              )}
            </div>

            {/* Progressive disclosure - financing + operating expenses
                start collapsed behind smart defaults so the first run
                needs only the basics (type, address, price, beds/rent).
                The sections stay MOUNTED (hidden via CSS, not unmounted)
                so address auto-fill can still write rate/tax into them and
                their values are included on submit. The user's open/closed
                choice is remembered; the block auto-opens once after the
                first result to invite refinement. */}
            <button
              type="button"
              onClick={toggleAdvanced}
              aria-expanded={advancedOpen}
              aria-controls="advanced-options"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 text-left shadow-sm transition-colors hover:bg-muted/40"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Settings2 className="size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {advancedOpen
                      ? activeStrategy
                        ? `Hide ${activeStrategy.label} details`
                        : "Hide advanced options"
                      : activeStrategy
                        ? `Refine ${activeStrategy.label} assumptions`
                        : "Improve accuracy (optional)"}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {advancedOpen
                      ? "Bathrooms, size, financing & operating expenses"
                      : activeStrategy
                        ? `${activeStrategy.label} defaults applied - open to fine-tune financing & expenses`
                        : analysisResult
                          ? "Adjust details, financing & expenses to sharpen your numbers"
                          : "Bathrooms, size, financing & expenses - running on smart defaults"}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  advancedOpen && "rotate-180"
                )}
              />
            </button>
            <div
              id="advanced-options"
              className={cn("space-y-5", advancedOpen ? "block" : "hidden")}
            >
              {/* Optional single-family details (bathrooms + square feet) —
                  kept mounted so values persist + submit even while hidden. */}
              {propertyType === "single-family" && (
                <SingleFamilyUnitSection form={form} fields="secondary" />
              )}
              <div id="step-financing" className="scroll-mt-24">
                <FinancingSection form={form} />
              </div>
              <div id="step-expenses" className="scroll-mt-24">
                <OperatingExpensesSection form={form} purchasePrice={purchasePrice} />
              </div>
            </div>

            {/* Live instant-verdict preview - forms as the user types, before
                they ever click Run. The "60 seconds" promise made literal:
                the answer is already on screen. Pure client math; the full
                dashboard still lives behind the explicit Run below. */}
            {/* Persistent SR live region (always mounted, sibling to the
                conditional card) so the verdict-forming announcement is
                reliable and concise - mirrors the what-if-sliders pattern.
                The visible card is NOT a live region (it would churn the whole
                verbose card on every keystroke). */}
            {!showResults && !analysisResult && !isCalculating ? (
              <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {livePreviewMsg}
              </span>
            ) : null}
            {!showResults && !analysisResult && !isCalculating && livePreview ? (
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-[var(--brand-blue-light)] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                    Live preview
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide",
                      livePreview.tier === "Strong" && "bg-[var(--brand-green)] text-white",
                      livePreview.tier === "Solid" && "bg-primary text-primary-foreground",
                      livePreview.tier === "Mixed" && "bg-amber-500 text-white",
                      livePreview.tier === "Marginal" && "bg-orange-500 text-white",
                      livePreview.tier === "Negative" && "bg-red-600 text-white"
                    )}
                  >
                    {livePreview.tier}
                  </span>
                </div>
                <div className="mb-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold tabular-nums text-foreground">
                    {livePreview.score}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    / 100 Deal Score
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Cash flow
                    </div>
                    <div
                      className={cn(
                        "font-mono text-lg font-bold tabular-nums sm:text-xl",
                        // Sign + color keyed off the SAME rounded value so a
                        // sub-dollar negative (e.g. -$0.30) never renders "-$0".
                        Math.round(livePreview.netCashFlow) >= 0
                          ? "text-[var(--metric-positive)]"
                          : "text-[var(--metric-negative)]"
                      )}
                    >
                      {Math.round(livePreview.netCashFlow) >= 0 ? "+" : "-"}$
                      {Math.abs(Math.round(livePreview.netCashFlow)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Cap rate
                    </div>
                    <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                      {livePreview.capRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      DSCR
                    </div>
                    <div className="font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                      {livePreview.monthlyPayment <= 0 ? "—" : livePreview.dscr.toFixed(2)}
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
                  Updating as you type — run the full analysis for projections, tax strategy &amp; exit scenarios.
                </p>
              </div>
            ) : null}

            {/* Calculate button - solid brand color (gradient was too
                visually heavy and competed with the verdict card
                downstream). Copy standardized to "Run analysis" to
                match the homepage "Run a deal - 60 seconds" register. */}
            <Button
              type="submit"
              disabled={isCalculating}
              className={cn(
                "w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/95"
              )}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running analysis…
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  {activeStrategy?.runCta ?? "Run analysis"}
                  <ArrowUpRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {/* Bottom row: keyboard hint (left) + autosave indicator
                (right). Both desktop-only - mobile users get the
                sticky bottom Calculate bar instead, and the autosave
                indicator there would compete with iOS keyboard chrome. */}
            <div className="hidden sm:flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                  ⌘
                </kbd>
                <kbd className="inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                  Enter
                </kbd>
                <span>to calculate from anywhere</span>
              </p>
              {/* Only when the localStorage draft writer is actually active
                  (anonymous / new-deal). Editing a loaded saved deal skips
                  the draft write, so showing "Auto-saved" there would lie. */}
              {!savedDealId ? <AutosaveIndicator form={form} /> : null}
            </div>
          </div>
          {/* Mobile sticky bottom Calculate bar. Inside the form so its
              type="submit" triggers the same onSubmit handler the
              in-form button does. Appears once the user scrolls past
              ~600px so we never double up on the visible Calculate
              button. */}
          <StickyCalculateBar isCalculating={isCalculating} />
        </form>

        {/* Results - wrapped in an error boundary so a render bug in
            any child (waterfall, mortgage compare, projections, etc.)
            cannot blank the whole post-calc surface. The fallback
            surfaces the headline metrics directly from analysisResult
            so the user's numbers are never lost. */}
        {(showResults || isCalculating || analysisResult !== null) && (
          <div
            className="mt-8 scroll-mt-4 focus-visible:outline-none"
            data-analysis-results="true"
            tabIndex={-1}
            aria-label="Analysis results"
          >
            {/* Result-state trust strip - names the default sources behind
                the numbers (HUD/FRED/state) + "all editable", with a jump
                back to the form. Only once real results exist. */}
            {analysisResult && !isCalculating && priceEstimated ? (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5 text-sm shadow-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    Estimated purchase price
                    {estimatedPriceValue != null
                      ? ` (~$${estimatedPriceValue.toLocaleString("en-US")})`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    We estimated the price from local rent
                    {priceEstimateBasis ? ` — ${priceEstimateBasis}` : ""} so you could see a
                    verdict instantly. Enter the actual asking price to make this accurate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEditPrice}
                  className="shrink-0 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-muted"
                >
                  Enter price
                </button>
              </div>
            ) : null}
            {analysisResult && !isCalculating ? (
              <AssumptionsSourceStrip onEdit={handleEditAssumptions} />
            ) : null}
            <AnalysisErrorBoundary result={analysisResult}>
            <AnalysisDashboard
              result={analysisResult}
              values={analysisValues ?? form.getValues()}
              dataConfidence={
                analysisResult
                  ? buildDataConfidence(buildProvenanceInput(enrichmentCaptureRef.current, form.getValues()), {
                      hasRent: analysisResult.monthlyRentalIncome > 0,
                      hasPrice: (form.getValues("purchasePrice") ?? 0) > 0,
                      hasBeds: (form.getValues("bedrooms") ?? 0) > 0,
                    })
                  : null
              }
              isLoading={isCalculating}
              dealScoreResult={dealScoreResult}
              isLoadingDealScore={isLoadingDealScore}
              propertyType={propertyType}
              marketRentEstimate={marketRentEstimate}
              projectionSource={projectionSource}
              taxStrategySource={taxStrategySource}
              exitScenarioSource={exitScenarioSource}
              onSaveDeal={handleSaveDeal}
              onCompareDeals={handleCompareDeals}
              onExportPdf={handleExportPdf}
              onNewAnalysis={handleNewAnalysis}
              onApplyComps={handleApplyComps}
              isSaving={isSavingDeal}
              isComparing={isComparingDeals}
              isExporting={isExportingPdf}
              isSaved={Boolean(savedDealId) && !hasUnsavedChanges}
              isExistingSavedDeal={Boolean(savedDealId)}
              savedDealId={savedDealId}
              isAuthenticated={isAuthenticated}
              canSaveDeals={canSaveDeals}
              canUpdateSavedDeals={canUpdateSavedDeals}
              canCompareDeals={canCompareDeals}
              canExportPdf={canExportPdf}
              // During the sample-deal Pro preview the analysis flags
              // are OR'd open so the demo shows the real Pro report.
              // Save / PDF / share / compare keep their true gating —
              // they hit server actions which enforce entitlements.
              canUseProjections={canUseProjections || isSampleProPreview}
              canUseTaxStrategy={canUseTaxStrategy || isSampleProPreview}
              canUseExitScenarios={canUseExitScenarios || isSampleProPreview}
              canUseMaxOffer={canUseMaxOffer || isSampleProPreview}
              canUseSensitivity={canUseSensitivity || isSampleProPreview}
              canUseStrategies={canUseStrategies || isSampleProPreview}
              canUseShareLinks={canUseShareLinks}
              isSampleProPreview={isSampleProPreview}
              dealQaEnabled={dealQaEnabled}
              activeTab={activeDashboardTab}
              activeStrategy={activeStrategy}
              saveDealLimitReached={currentSaveDealLimitReached}
              persistedActionsBlockHint={
                !savedDealId
                  ? "Save this analysis first to compare or export a PDF."
                  : hasUnsavedChanges
                    ? "Save your latest changes before comparing or exporting a PDF."
                    : undefined
              }
            />
            </AnalysisErrorBoundary>
          </div>
        )}
      </main>
      {/* Anonymous email capture - fires 5s after a successful analysis
          for unauthenticated users only. Captures the email and schedules
          a 4-email drip via Resend `scheduled_at`. Once captured or
          dismissed, never re-fires in the same browser (localStorage). */}
      {!isAuthenticated ? (
        <PostAnalysisEmailPrompt
          hasCompletedAnalysis={analysisResult !== null}
          propertyAddress={form.getValues("address")}
        />
      ) : null}
      {/* Pro vs $5 one-time chooser - opens when a user without PDF
          entitlement clicks Export PDF. */}
      <PdfPurchaseDialog
        open={isPdfPurchaseDialogOpen}
        onOpenChange={setIsPdfPurchaseDialogOpen}
        onBuyOneTime={handleBuyOneTimePdf}
        isStartingCheckout={isStartingPdfCheckout}
      />
    </div>
  );
}
