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
  Loader2,
  Sparkles,
  Home,
  CopyPlus,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  investmentFormSchema,
  previewParse,
  InvestmentFormValues,
  defaultValues,
  describeInvestmentFormSnapshotIssue,
  getDefaultUnitsForPropertyType,
  isValidRentalUnit,
  normalizeInvestmentFormDraft,
  normalizeInvestmentFormSnapshot,
} from "@/lib/investcalc-schema";
import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { getDealTier, type DealTier } from "@/lib/verdict";
import { PropertyTypeSection } from "./property-type-section";
import { PropertyDetailsSection, YearBuiltField } from "./property-details-section";
import { SingleFamilyUnitSection } from "./single-family-unit-section";
import { MultiFamilyUnitsSection } from "./multi-family-units-section";
import { ListingLinkInput } from "./listing-link-input";
import { FinancingSection } from "./financing-section";
import { OperatingExpensesSection } from "./operating-expenses-section";
import { SaveAsDefaultsChip } from "./save-as-defaults-chip";
// StrategyChips now renders inside AssumptionsStrip (the "Analyzing as:"
// pill's inline picker) — the page passes state/handlers down instead.
import { AssumptionsStrip } from "./assumptions-strip";
import { EnrichmentReceipt } from "./enrichment-receipt";
import {
  computeExpensesEdited,
  computeStrategyOwnedFields,
  type AssumptionChipTarget,
  type StrategyAppliedSnapshot,
} from "@/lib/assumption-chips";
import {
  STRATEGY_REVERTABLE_FIELDS,
  planPropertyTypeSwitch,
  planStrategyRevert,
  planStrategySnapshot,
  type PropertyTypeStash,
  type StrategyRevertSnapshot,
} from "@/lib/investcalc-form-preservation";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/starter-templates";
import { buildTemplateFormPatch, type TemplateFormPatchEntry } from "@/lib/template-form-patch";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import { getStrategyByKey } from "@/lib/investor-strategies";
import { AnalyzerStepRail } from "./analyzer-step-rail";
import {
  computeAnalyzerSteps,
  isAnalyzerStepId,
  type AnalyzerStepId,
} from "@/lib/analyzer-steps";
import {
  ANALYZER_STRATEGY_EVENT,
  HANDOFF_STRATEGY_KEYS,
  readAnalyzerHandoff,
  type AnalyzerStrategyEventDetail,
} from "@/lib/analyzer-handoff";
import { StickyCalculateBar } from "./sticky-calculate-bar";
import { LiveVerdictPanel, type LivePreviewSnapshot } from "./live-verdict-panel";
import { AutosaveIndicator } from "./autosave-indicator";
import type { AnalysisDashboardTab } from "./analysis-dashboard";
import { AnalysisDashboardSkeleton } from "./analysis-dashboard-skeleton";
import { AnalysisErrorBoundary } from "@/components/investcalc/analysis-error-boundary";
import { AssumptionsSourceStrip } from "@/components/investcalc/assumptions-source-strip";
import { PostAnalysisEmailPrompt } from "@/components/marketing/post-analysis-email-prompt";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn, scrollBehavior } from "@/lib/utils";
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
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { getLimitingFactor } from "@/lib/limiting-factor";
import {
  createOneTimePdfCheckoutAction,
  verifyOneTimePdfPaymentAction,
} from "@/app/actions/one-time-pdf";
import { PdfPurchaseDialog } from "@/components/investcalc/pdf-purchase-dialog";
import {
  DuplicateAddressDialog,
  type DuplicateAddressChoice,
} from "@/components/investcalc/duplicate-address-dialog";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { estimatePurchasePrice } from "@/lib/estimate-price";
import { parseListingUrl } from "@/lib/listing-url";
import { parseAddressLocation } from "@/lib/parse-address";
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
import { consumePendingSaveIntent, setPendingSaveIntent } from "@/lib/save-intent";
import dynamic from "next/dynamic";

// ── AnalysisDashboard is post-Run-only, so keep it out of the anon
// landing bundle ────────────────────────────────────────────────────
// The dashboard (2,264 lines + ~40 statically-pulled subcomponents)
// only renders behind the `showResults || isCalculating ||
// analysisResult !== null` gate below, yet a static import shipped the
// whole tree to every visitor of the static "/" ad-landing page.
// next/dynamic splits it off; the loader is kept as a named thunk so
// preloadAnalysisDashboard() can warm the chunk on first form
// interaction and on Run click — webpack caches the module request, so
// by the time results render the chunk is already local and the
// Run→results reveal doesn't visibly regress. Same pattern as the
// three Pro chart panels inside analysis-dashboard.tsx itself.
// `ssr: false` because the dashboard only ever renders post-Run in the
// browser (the gate is closed during SSR/prerender).
const loadAnalysisDashboard = () => import("./analysis-dashboard");
const AnalysisDashboard = dynamic(
  () => loadAnalysisDashboard().then((m) => m.AnalysisDashboard),
  {
    ssr: false,
    loading: () => <AnalysisDashboardSkeleton />,
  }
);
let analysisDashboardPreloaded = false;
function preloadAnalysisDashboard() {
  if (analysisDashboardPreloaded) return;
  analysisDashboardPreloaded = true;
  loadAnalysisDashboard().catch(() => {
    // Preload is best-effort — if it fails (flaky network), the dynamic
    // component retries the request when it actually mounts.
    analysisDashboardPreloaded = false;
  });
}

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";
const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";
/** Must match SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY in open-saved-deal-in-analyzer.tsx. */
const SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY = "truecap_saved_analysis_duplicate_draft";
/** Query params carrying a saved-deal handoff nonce. Must match
 *  DEAL_EDIT_HANDOFF_PARAM / DEAL_DUPLICATE_HANDOFF_PARAM in
 *  open-saved-deal-in-analyzer.tsx (constants duplicated, not imported, so
 *  the static homepage bundle doesn't pull that module in). */
const DEAL_EDIT_HANDOFF_PARAM = "dealHandoff";
const DEAL_DUPLICATE_HANDOFF_PARAM = "dealDuplicate";

/**
 * Consume a one-time saved-deal handoff payload. Nonce path first: the
 * writer (open-saved-deal-in-analyzer.tsx) stores each payload under its own
 * `<baseKey>::<nonce>` localStorage key and passes the nonce in the URL, so
 * concurrent opens can't cross-wire tabs and no shared copy lingers to
 * resurrect the previous deal on a later plain "/" visit. The un-nonced
 * shared keys remain readable as a LEGACY fallback for tabs opened by a
 * previous deploy — always deleted after reading (found or not), because an
 * unconsumed copy re-opens the old deal on every future "/" visit.
 */
function consumeSavedDealHandoffPayload(
  baseKey: string,
  nonce: string | null,
  allowLegacy: boolean
): string | null {
  try {
    if (nonce) {
      const key = `${baseKey}::${nonce}`;
      const raw = window.localStorage.getItem(key);
      window.localStorage.removeItem(key);
      if (raw) return raw;
    }
    // Legacy shared key: only when THIS navigation carries no handoff nonce
    // param at all — a pre-nonce deploy's tab always arrived at a bare "/".
    // If a nonce param IS present we're unambiguously on the new scheme, and
    // reading the (un-nonced) shared key of the OTHER handoff type could
    // spuriously consume an orphaned legacy payload during the deploy cutover
    // — e.g. a stale duplicate key firing ahead of the requested edit open.
    if (!allowLegacy) return null;
    const legacy =
      window.sessionStorage.getItem(baseKey) ?? window.localStorage.getItem(baseKey);
    window.sessionStorage.removeItem(baseKey);
    window.localStorage.removeItem(baseKey);
    return legacy;
  } catch {
    return null;
  }
}
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
 * (financing + operating expenses) block, so their open/closed choice
 * persists across sessions. Version-suffixed like the draft key.
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

/** A choice made in the address-changed dialog (save flow, update path):
 *  "new" inserts the current form as a fresh deal (the loaded saved deal
 *  stays untouched); "update-address" moves the loaded saved deal to the
 *  form's new address (allowAddressChange on the server). */
type AddressChangedChoice = "new" | "update-address";

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
      // Effective % — annual-$ mode derives it from the bill (the raw
      // propertyTaxPct field is undefined in that mode and printed "0%").
      propertyTaxPct: Math.round(Number(result.propertyTaxPctEffective ?? 0) * 100) / 100,
      propertyTaxAnnualBill:
        values.propertyTaxInputMode === "annual" && values.propertyTaxAnnual != null
          ? Number(values.propertyTaxAnnual)
          : null,
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
  values: {
    propertyTaxPct?: unknown;
    propertyTaxInputMode?: unknown;
    propertyTaxAnnual?: unknown;
    interestRate?: unknown;
    monthlyRent?: unknown;
  }
): EnrichmentProvenanceInput {
  const approxEq = (a: number | null, b: number | null) =>
    a != null && b != null && Math.abs(a - b) <= 0.005 * Math.max(1, Math.abs(b));
  const out: EnrichmentProvenanceInput = {};
  if (capture.propertyTaxPct) {
    // Annual-$ mode with a bill typed = the user's number is what the calc
    // actually uses — claiming "state effective rate" would be false.
    const annualOverride =
      values.propertyTaxInputMode === "annual" && provNum(values.propertyTaxAnnual) != null;
    out.propertyTaxPct = {
      source: "state-static",
      detail: capture.propertyTaxPct.detail,
      overridden:
        annualOverride || !approxEq(provNum(values.propertyTaxPct), capture.propertyTaxPct.value),
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
  // Bumped on every point-at-tab intent so the ledger reopens a row the
  // user closed even when the TAB VALUE is unchanged (a same-value
  // setState bails and the dashboard's effect would never fire).
  const [activeTabNonce, setActiveTabNonce] = useState(0);
  const pointDashboardAt = useCallback((tab: AnalysisDashboardTab) => {
    setActiveDashboardTab(tab);
    setActiveTabNonce((n) => n + 1);
  }, []);
  // Active investor-strategy chip ("What's your play?"). null = default full flow.
  const [activeStrategyKey, setActiveStrategyKey] = useState<string | null>(null);
  const activeStrategy = getStrategyByKey(activeStrategyKey);
  // What the active play's starter set actually WROTE (field → value), plus
  // the play's label (BROWSER-2). The starter writes are dirty on purpose
  // (the default-template auto-apply skips dirty fields), but "dirty" also
  // drives the chips' "yours" provenance badge — this record lets the strip
  // + results ledger badge strategy-written values as the play's defaults
  // instead of falsely claiming the user typed them. A field drops out of
  // the set the moment its current value diverges from what the starter
  // wrote (the enrichment "overridden" pattern), i.e. on a real user edit.
  const strategyAppliedRef = useRef<StrategyAppliedSnapshot | null>(null);
  // What the form held BEFORE the first play of this lens was applied, plus
  // what the play left behind (STRATEGY-CLEAR-RESTORES). "Clear" reads this
  // to put the pre-play values back — a control labelled Clear that only
  // dropped the label left the user on the play's property type, financing
  // and tax with no way back to their address-derived numbers. Set once per
  // lens (switching plays keeps the ORIGINAL before-values, refreshes the
  // after-values) and dropped on Clear / New Analysis.
  const strategyRevertRef = useRef<StrategyRevertSnapshot | null>(null);
  // Pre-run live verdict gating (LIVE-VERDICT-VS-STRATEGY-FRAMING): while a
  // solve-oriented play is active (Wholesale/BRRRR/Flip — primaryTab !==
  // "cash-flow"), the generic asking-price verdict directly contradicts the
  // play's framing ("we'll reverse-solve your max offer" next to a NEGATIVE
  // buy-box readout). The post-run hero already suppresses that verdict via
  // strategyLeadsOutput (analysis-dashboard) — apply the same rule to the
  // in-form LiveVerdictPanel and the sticky dock readout pre-run.
  const showGenericLivePreview = !activeStrategy || activeStrategy.primaryTab === "cash-flow";
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // The exact form values that produced `analysisResult`. The results
  // dashboard reads from this (not a live form.getValues() snapshot) so the
  // headline metrics and the derived cards (Max Offer, Sensitivity, etc.) are
  // always computed from the SAME inputs — never a mix of frozen result +
  // live form state. Updated everywhere `analysisResult` is set.
  const [analysisValues, setAnalysisValues] = useState<InvestmentFormValues | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // True when a full result is on screen but the CURRENT form no longer
  // parses (e.g. the user cleared Purchase Price to retype it and got
  // interrupted). The live recompute deliberately keeps the last good
  // numbers up instead of blanking them; this flag drives a slim,
  // non-blocking amber strip over the results so those numbers are never
  // silently mistaken for current ones. Cleared the moment the form parses
  // again (recompute), on a fresh run, a saved-deal restore, or a reset.
  const [staleResultsWarning, setStaleResultsWarning] = useState(false);
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
  // Multi-family sibling of marketRentEstimate: HUD FMR keyed by bedroom
  // count, for the per-unit rent reality-check in the units section. Same
  // rules: captured on enrichment, never blocks analysis, cleared on a new
  // address, silent on failure.
  const [unitFmrByBedrooms, setUnitFmrByBedrooms] = useState<Record<number, number> | null>(null);
  // Typed by the panel's exported snapshot shape so the two can't drift
  // (the inline duplicate did exactly that when breakEvenPrice was added).
  const [livePreview, setLivePreview] = useState<LivePreviewSnapshot | null>(null);
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
  // Hero listing-link toggle (Phase 4): while open, the URL row renders in
  // the address input's place (the address block is CSS-hidden, never
  // unmounted — RHF registration + enrichment writes are untouched).
  // Declared up here (not next to the autofill state) so resetToNewAnalysis
  // below can clear all three — a stale URL / red parse-error state used to
  // survive New Analysis and keep the fresh hero's address input hidden
  // (BROWSER-3).
  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState(false);
  const [listingLinkOpen, setListingLinkOpen] = useState(false);
  // ── Progressive disclosure (financing + operating expenses) ──────────
  // Cold visitors start with just the basics (property type, address,
  // price, beds/rent); financing + operating expenses collapse behind a
  // toggle backed by smart defaults, so the first answer comes fast. The
  // sections stay MOUNTED (hidden via CSS) so address auto-fill still
  // writes into them and their values submit normally.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // (The pre-redesign auto-open-advanced-after-first-result nudge was
  // removed: post-Phase-3 the assumptions strip's chips are the designed
  // entry point to this region, and post-Phase-4 the block also holds the
  // property-type/template panel — the nudge silently expanded 3-4 panels
  // the user never opened. The strip chips + the ledger's "Edit
  // assumptions" now carry discoverability.)
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
  // Duplicate-address collision from the save flow. Non-null opens the
  // chooser dialog with the user's own colliding saved deal so they can
  // overwrite it or keep both as scenarios.
  const [duplicateCollision, setDuplicateCollision] = useState<{
    existingId: string;
    existingTitle?: string;
  } | null>(null);
  const [duplicateChoiceBusy, setDuplicateChoiceBusy] = useState<DuplicateAddressChoice | null>(null);
  // Address-changed collision from the update path: the loaded saved deal's
  // address no longer matches the form. Non-null opens the chooser dialog
  // (save as new deal / update this deal's address / cancel) so Save never
  // dead-ends while the stale id stays attached.
  const [addressChangedPrompt, setAddressChangedPrompt] = useState<{
    targetId: string;
    existingTitle?: string;
  } | null>(null);
  const [addressChangedChoiceBusy, setAddressChangedChoiceBusy] =
    useState<AddressChangedChoice | null>(null);
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
  /**
   * The Pro user's template list, captured when TemplateSelectorSection
   * reports it (free/anon: stays empty). The assumptions strip + enrichment
   * receipt resolve the watched templateId to a display name from this —
   * state (not a ref) so the chip re-renders when the list arrives after
   * a templateId was already restored from a draft/saved deal.
   */
  const [templateOptions, setTemplateOptions] = useState<AnalysisTemplateOption[]>([]);
  const [isLoadingDealScore, setIsLoadingDealScore] = useState(false);
  const { toast } = useToast();
  const prevPropertyTypeRef = useRef<InvestmentFormValues["propertyType"]>("single-family");
  // Parking lot for the income + physical facts a property-type switch has
  // to unmount (TYPE-SWITCH-PRESERVES-INPUT). Switching type must never be
  // a delete: the outgoing type's rent roll / single-family facts are
  // parked here and restored if the user comes back to that type. Cleared
  // whenever the whole form is replaced (reset, draft/saved-deal load,
  // fork) — a parked rent roll belongs to the deal it came from.
  const propertyTypeStashRef = useRef<PropertyTypeStash>({});
  const isProgrammaticResetRef = useRef(false);
  const pendingResultsScrollRef = useRef(false);
  const formElementRef = useRef<HTMLFormElement | null>(null);
  const savedDealIdRef = useRef<string | null>(null);
  /** Bumped by "Analyze another like this" — an in-flight save whose
   *  generation no longer matches must not attach its id to the forked
   *  form (the fork's savedDealId-null guarantee would be defeated). */
  const forkGenerationRef = useRef(0);
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
    resultsSection?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, []);

  const handleInputTabClick = useCallback(
    (tab: InputTab) => {
      if (!areAnalysisTabsEnabled) return;
      setActiveInputTab(tab);
      const mappedTab = mapInputTabToDashboardTab(tab);
      if (mappedTab) {
        pointDashboardAt(mappedTab);
        // Ledger era: pointDashboardAt opens the row WITHOUT scrolling (the
        // old no-scroll tab semantics), so land the viewport on the row
        // header itself once it has had a beat to open — scrolling to the
        // results TOP left the opened row thousands of px below the fold,
        // i.e. a dead click (INPUT-TAB-BAR-POST-LEDGER-DEAD-CLICK). The
        // `analysis-tab-${id}` ids are the ledger row headers (drill-row).
        setTimeout(() => {
          const rowHeader = document.getElementById(`analysis-tab-${mappedTab}`);
          if (rowHeader) {
            rowHeader.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
          } else {
            scrollToAnalysisResults();
          }
        }, 50);
        return;
      }
      // Deal Score has no ledger row — it lives in the answer hero at the
      // top of the results, so results-top is the right landing for it.
      setTimeout(() => {
        scrollToAnalysisResults();
      }, 50);
    },
    [areAnalysisTabsEnabled, mapInputTabToDashboardTab, pointDashboardAt, scrollToAnalysisResults]
  );

  // Shared between the server-action path (loadDealScore) and the
  // sample-deal Pro preview path, which computes the score client-side
  // via the same pure lib function the action wraps.

  const loadDealScore = async (values: InvestmentFormValues, result: AnalysisResult) => {
    // Stale-completion guard (same contract as performSaveDeal's
    // saveGeneration): "Analyze another like this" mid-roundtrip clears
    // dealScoreResult via clearAnalysisOutputs — a late response must not
    // repopulate the OLD deal's score under the forked form.
    const scoreGeneration = forkGenerationRef.current;
    setIsLoadingDealScore(true);
    try {
      const dealScore = await getDealScoreAction(buildDealScoreInputFromAnalysis(values, result));
      if (forkGenerationRef.current !== scoreGeneration) return;
      setDealScoreResult(dealScore);
    } catch (err) {
      // Swallow + log instead of throwing - there are 4+ call sites,
      // two of which are fire-and-forget (`void loadDealScore(...)`).
      // Without this, a transient server error becomes an unhandled
      // promise rejection in Sentry with no useful context. Failing
      // the score load silently is the right user-visible behavior:
      // the deal still computes, the score card just stays empty.
      console.warn("[deal-score] load failed:", err);
      if (forkGenerationRef.current === scoreGeneration) setDealScoreResult(null);
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
    // A null snapshot means the form doesn't parse right now. Two distinct
    // cases hide in that:
    //   - No persisted baseline yet (lastPersistedFormJsonRef null): the
    //     form is mid-restore (e.g. a multi-family saved deal whose units
    //     array is partially populated while RHF resets). Don't flip the
    //     dirty flag on that intermediate state - the next watch tick after
    //     the restore completes computes the real answer. (Flipping it here
    //     showed a false "Unsaved changes" badge right after load.)
    //   - A persisted baseline EXISTS: the user broke the parse by editing
    //     (e.g. cleared the rent field as step one of a change). That IS a
    //     divergence from the persisted row - arm the dirty flag so the
    //     badge and the beforeunload guard don't keep claiming "Saved"
    //     while the on-screen form no longer matches the saved deal.
    if (!json) {
      if (lastPersistedFormJsonRef.current) setHasUnsavedChanges(true);
      return;
    }
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
    // No results on screen → nothing to be stale.
    setStaleResultsWarning(false);
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

  // ── Default-template auto-apply (roadmap P1-7) ───────────────────────
  // A Pro user who marked a template as their default gets THEIR
  // assumptions on every brand-new analyzer session — zero clicks. The
  // template list arrives via TemplateSelectorSection's onTemplatesLoaded
  // callback (no second fetch). Refs, not state: none of this should
  // re-render anything — the applied form values do that.
  /** The user's is_default template, captured when the list loads. */
  const defaultTemplateRef = useRef<AnalysisTemplateOption | null>(null);
  /** True only when the session started factory-fresh (clean reset or a
   *  tools-calculator handoff). Draft restores, saved-deal edits, and
   *  share-link "Make this mine" imports (which arrive via the draft key)
   *  leave it false so their values are never clobbered. */
  const autoApplyEligibleRef = useRef(false);
  /** Set when the user clicks Undo on the applied-defaults toast — they
   *  said no, so we stay factory for the rest of this mount. */
  const autoApplySuppressedRef = useRef(false);
  /** Pre-apply values of exactly the fields we overwrote, for one-click undo. */
  const autoApplyUndoRef = useRef<TemplateFormPatchEntry[] | null>(null);
  // Latest-closure fn ref (same pattern as recomputeOutputsFromFormRef):
  // resetToNewAnalysis below needs to call it, but the body closes over
  // helpers declared later (enrichmentCaptureRef, toast wiring).
  const autoApplyDefaultTemplateRef = useRef<() => void>(() => {});
  /** Latest-closure ref for the undo, so the stable
   *  handleExplicitTemplateChange callback can reach it. */
  const undoAutoAppliedTemplateRef = useRef<() => void>(() => {});

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
      // The parked rent roll / single-family facts belong to the deal this
      // reset just cleared — carrying them forward would resurrect the old
      // property's numbers the first time the user touches Property Type.
      propertyTypeStashRef.current = {};
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
      // Same rules as marketRentEstimate: a fresh session must never judge
      // its units against the PREVIOUS deal's market benchmark.
      setUnitFmrByBedrooms(null);
      unitFmrKeyRef.current = null;
      // …and the enrichment TRIGGERS, not just the captures — the same
      // guarantee the fork path gives. With the old refs armed, typing
      // bedrooms (or hand-typing the next address without picking a
      // suggestion) re-ran enrichment against the PREVIOUS deal's place:
      // wrong-state tax and wrong-county HUD rent onto the fresh form,
      // with a toast claiming they came "from address".
      lastSelectedAddressRef.current = null;
      lastEnrichedAddressRef.current = null;
      lastEnrichedGeoRef.current = null;
      // The welcome-back banner names a draft this reset just wiped
      // (clearCalcDraftRaw above) — left set, it resurrects over the blank
      // form claiming the old address's draft "is ready".
      setRestoredFromDraft(false);
      setRestoredAddress(null);
      // Phase-4 hero listing-link toggle: a stale URL row (especially its
      // red parse-error state) otherwise survives New Analysis and keeps the
      // fresh hero's address input CSS-hidden behind it (BROWSER-3).
      setListingLinkOpen(false);
      setListingUrl("");
      setListingUrlError(false);
      // The active play must not outlive the assumptions it applied: the
      // form.reset above restored factory values, so a surviving
      // "Analyzing as: <play>" pill (plus STR income inputs / Wholesale
      // labels) would claim a tailored analysis the numbers no longer
      // reflect (BROWSER-3).
      setActiveStrategyKey(null);
      strategyAppliedRef.current = null;
      strategyRevertRef.current = null;
      form.setValue("units", getDefaultUnitsForPropertyType(nextPropertyType), {
        shouldDirty: false,
        shouldValidate: false,
      });
      // A reset IS a brand-new session — re-arm and re-apply the user's
      // default template (no-op until the template list has loaded, and
      // for free users / users without a default it never does anything).
      autoApplyEligibleRef.current = true;
      autoApplyDefaultTemplateRef.current();
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
  // Dedup key for the multi-family FMR benchmark fetch: metro + the sorted
  // distinct bedroom counts already looked up. Cleared on a new address.
  const unitFmrKeyRef = useRef<string | null>(null);
  // The address whose enrichment provenance is currently captured. Distinct
  // from lastSelectedAddressRef (which callers set BEFORE enriching) so we can
  // detect a genuinely new address inside runPropertyEnrichment and drop stale
  // provenance — the hero/listing path otherwise leaked the prior address's
  // sourcing into the data-confidence badge + saved deal.
  const lastEnrichedAddressRef = useRef<string | null>(null);
  // Geo facts of that same enrichment, kept so the swap-clear below can tell
  // "same property, different formatting" (typed commit → Google re-pick of
  // the identical address) from a real move: the formatted STRING differs in
  // both cases, but street number + ZIP don't lie. Cleared wherever
  // lastEnrichedAddressRef is.
  const lastEnrichedGeoRef = useRef<{
    state?: string;
    zip?: string;
    streetNum: string | null;
  } | null>(null);

  /**
   * Run the enrichment lookups (state property tax, FRED mortgage rate,
   * HUD Fair Market Rent) and pre-fill the form. Idempotent: callers can
   * invoke it whenever address or bedroom count changes; existing user
   * input on monthly rent is preserved.
   */
  const runPropertyEnrichment = useCallback(
    async (place: SelectedAddress, opts?: { silent?: boolean }) => {
      // Captured for the post-await staleness check below. Callers set
      // lastSelectedAddressRef to `place` BEFORE calling (autocomplete pick,
      // typed-address commit, hero/listing handoff, bedrooms watcher), so an
      // identity compare after the roundtrip detects a newer selection.
      const enrichGeneration = forkGenerationRef.current;
      // New address → clear the previous address's captured provenance + market
      // rent BEFORE repopulating, so the confidence badge can't attribute the
      // old "from <addr>" sourcing to this deal (every enrichment path, incl.
      // the hero/listing handoff, funnels through here).
      const placeKey = place.formattedAddress ?? `${place.state ?? ""}:${place.county ?? ""}:${place.zip ?? ""}`;
      if (lastEnrichedAddressRef.current !== placeKey) {
        // The formatted string changed — but that alone can't distinguish a
        // real move from the SAME property re-picked with different
        // formatting (typed commit "…PA 19140" → Google's "…PA 19140, USA"
        // — the default flow now that pasted addresses commit on blur).
        // Compare geo facts: same street number + same ZIP ⇒ same property;
        // same ZIP + state ⇒ same market (HUD SAFMR and state tax are
        // ZIP/state-granular, so market values stay valid across it).
        // null prior means first selection or a loaded saved deal
        // (form.reset leaves everything non-dirty), which must never clear.
        const prevGeo = lastEnrichedGeoRef.current;
        const streetNum = place.formattedAddress?.trim().match(/^(\d+)/)?.[1] ?? null;
        const sameProperty =
          prevGeo !== null &&
          prevGeo.zip !== undefined &&
          prevGeo.zip === place.zip &&
          prevGeo.streetNum !== null &&
          prevGeo.streetNum === streetNum;
        const sameMarket =
          sameProperty ||
          (prevGeo !== null &&
            prevGeo.zip !== undefined &&
            prevGeo.zip === place.zip &&
            prevGeo.state === place.state);
        const isSwap = lastEnrichedAddressRef.current !== null && !sameProperty;
        enrichmentCaptureRef.current = {};
        setMarketRentEstimate(null);
        setUnitFmrByBedrooms(null);
        unitFmrKeyRef.current = null;
        lastEnrichedAddressRef.current = placeKey;
        lastEnrichedGeoRef.current = { state: place.state, zip: place.zip, streetNum };
        if (isSwap) {
          // Auto-filled values describe the OLD property/market and must not
          // survive the swap: HUD/comps fills use shouldDirty:false while
          // user typing sets dirty, so non-dirty is exactly "not the user's
          // number". Price/beds/baths/sqft are the old property's identity
          // facts (applyComps writes them non-dirty too) — cleared on any
          // property change. Rent is market-priced; it only clears when the
          // MARKET actually changed (a same-ZIP move keeps the same HUD
          // figure), and refills from the new market further down this call.
          const clearOpts = {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          } as const;
          const dirty = form.formState.dirtyFields;
          if (!sameMarket && !dirty.monthlyRent) {
            form.setValue("monthlyRent", undefined, clearOpts);
          }
          if (!dirty.purchasePrice) {
            form.setValue("purchasePrice", undefined as unknown as number, clearOpts);
          }
          if (!dirty.bedrooms) form.setValue("bedrooms", undefined, clearOpts);
          if (!dirty.bathrooms) form.setValue("bathrooms", undefined, clearOpts);
          if (!dirty.sqft) form.setValue("sqft", undefined, clearOpts);
          const units = form.getValues("units") ?? [];
          for (let i = 0; i < units.length; i++) {
            if (!isEmptyNumber(units[i]?.monthlyRent) && !dirty.units?.[i]?.monthlyRent) {
              form.setValue(`units.${i}.monthlyRent`, undefined, clearOpts);
            }
          }
        }
      }
      const currentPropertyType = form.getValues("propertyType");
      const isSingleFamily = currentPropertyType === "single-family";
      const rawBedrooms = isSingleFamily ? form.getValues("bedrooms") : undefined;
      // valueAsNumber yields NaN for an EMPTY bedrooms input — and NaN fails
      // the action's z.number() input check, which used to reject the WHOLE
      // payload: address-selection enrichment silently returned nothing (no
      // rate, no tax) until the bedrooms watcher re-fired with a real count
      // (ENRICH-NAN-BEDROOMS-EMPTY-RESULT). Send undefined instead.
      const parsedBedrooms =
        typeof rawBedrooms === "number"
          ? rawBedrooms
          : rawBedrooms != null
          ? Number(rawBedrooms)
          : undefined;
      const bedrooms = Number.isFinite(parsedBedrooms) ? parsedBedrooms : undefined;

      const enrichment = await enrichPropertyAction({
        state: place.state,
        county: place.county,
        zip: place.zip,
        propertyType: currentPropertyType,
        bedrooms,
      });

      // Stale-completion guard (same contract as performSaveDeal's
      // saveGeneration): "Analyze another like this" or a newer address
      // selection while this roundtrip was in flight means these results
      // describe a deal the user already left — writing them would fill the
      // fresh form with the OLD market's tax/rate/rent under a misleading
      // "Auto-filled from address" toast.
      if (
        forkGenerationRef.current !== enrichGeneration ||
        lastSelectedAddressRef.current !== place
      ) {
        return;
      }

      const setOpts = {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      };
      const filled: string[] = [];

      // Property tax - overwrite the schema default with the state-level
      // rate (defaults aren't location-aware, so the state rate is strictly
      // more informative) but never a manual edit — the same dirtyFields
      // contract interestRate gets below. Tax is editable in TWO modes
      // (percent / annual $), so a user-typed value in either one blocks
      // the overwrite; the bedrooms watcher re-runs this whole function
      // mid-deal and would otherwise silently revert a corrected rate.
      if (enrichment.propertyTaxPct !== undefined) {
        const taxEdited =
          form.formState.dirtyFields.propertyTaxPct ||
          form.formState.dirtyFields.propertyTaxAnnual;
        if (!taxEdited) {
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
      setUnitFmrByBedrooms(null);
      unitFmrKeyRef.current = null;
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
            ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        }, 70);
      });
    },
    [scrollToAnalysisResults]
  );

  /**
   * Assumptions-strip chip tap → the EXACT handleStepNavigate mechanics.
   * "financing" / "expenses" ARE AnalyzerStepIds, so they go straight
   * through the existing handler (open advanced + #step-* scroll). Two chip
   * targets live inside the advanced block with no analyzer step of their
   * own and get the same open-then-scroll sequence pointed at their wrapper:
   *  - "extras"   → #step-extras (SF year-built/bathrooms/sqft panel)
   *  - "property" → #step-type (the property-type + template panel — moved
   *    from above the hero into the strip's panel region in Phase 4 — plus
   *    the MF/house-hack year-built card). The step RAIL's "property" step
   *    still routes through handleStepNavigate to the #step-property hero.
   */
  const handleChipNavigate = useCallback(
    (target: AssumptionChipTarget) => {
      if (target === "extras" || target === "property") {
        const anchor = target === "extras" ? "step-extras" : "step-type";
        setAdvancedOpen(true);
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            document
              .getElementById(anchor)
              ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
          }, 70);
        });
        return;
      }
      handleStepNavigate(target);
    },
    [handleStepNavigate]
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

    // Key the "already enriched" cache by METRO too — otherwise after the user
    // changes the address to a new market, the same idx:beds key is still
    // present and HUD per-unit autofill is permanently suppressed for the new
    // metro (it would silently never fill again).
    const metroPrefix = `${place.state ?? ""}:${place.county ?? ""}:${place.zip ?? ""}`;
    type Pending = { idx: number; beds: number };
    const pending: Pending[] = [];
    for (let idx = 0; idx < units.length; idx++) {
      const unit = units[idx];
      if (!unit) continue;
      if (unit.isOwnerOccupied) continue;
      const beds = Number(unit.bedrooms);
      if (!Number.isFinite(beds) || beds <= 0) continue;
      if (!isEmptyNumber(unit.monthlyRent)) continue;
      const cacheKey = `${metroPrefix}:${idx}:${beds}`;
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
          enrichedUnitsRef.current.delete(`${metroPrefix}:${idx}:${beds}`);
        }
        console.warn("[multi-unit enrichment] failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsEnrichmentKey]);

  /**
   * Multi-family / house-hack HUD rent reality-check: fetch the FMR
   * benchmark for the DISTINCT bedroom counts across units (the autofill
   * effect above only runs for units with EMPTY rent — this one must also
   * cover the duplex modeled at $2,400/unit the user typed themselves).
   * One action call per (metro, distinct-beds-set); the server dedupes to
   * at most one HUD HTTP fetch via its caches. Pure nudge: failures are
   * silent and analysis never waits on it.
   */
  useEffect(() => {
    const place = lastSelectedAddressRef.current;
    if (!place) return;
    const propType = form.getValues("propertyType");
    if (propType !== "multi-family" && propType !== "owner-occupant") return;
    const units = form.getValues("units") ?? [];
    const distinctBeds = [
      ...new Set(
        units
          .map((u) => Math.round(Number(u?.bedrooms)))
          .filter((b) => Number.isFinite(b) && b > 0)
      ),
    ];
    if (distinctBeds.length === 0) return;
    const metroPrefix = `${place.state ?? ""}:${place.county ?? ""}:${place.zip ?? ""}`;
    const key = `${metroPrefix}|${[...distinctBeds].sort((a, b) => a - b).join(",")}`;
    if (unitFmrKeyRef.current === key) return;
    unitFmrKeyRef.current = key;

    enrichPropertyAction({
      state: place.state,
      county: place.county,
      zip: place.zip,
      propertyType: propType,
      unitBedrooms: distinctBeds,
    })
      .then((result) => {
        // Stale-response guard (mirrors the .catch): if the user switched
        // addresses while this fetch was in flight, merging would judge the
        // NEW deal's rents against the OLD market's FMRs.
        if (unitFmrKeyRef.current !== key) return;
        if (result.fmrByBedrooms) {
          // Merge: earlier distinct-bed sets for the SAME address stay
          // valid (address changes clear the whole map upstream).
          setUnitFmrByBedrooms((prev) => ({ ...(prev ?? {}), ...result.fmrByBedrooms }));
        }
      })
      .catch((err) => {
        // Release the key so a later bedrooms/address change can retry.
        if (unitFmrKeyRef.current === key) unitFmrKeyRef.current = null;
        console.warn("[multi-family FMR check] enrichment failed:", err);
      });
    // watchedAddress is included so picking an address AFTER typing the
    // units still triggers the benchmark fetch (unitsEnrichmentKey alone
    // wouldn't change in that order).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsEnrichmentKey, watchedAddress]);

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
  // (listingUrl / listingUrlError / listingLinkOpen are declared up top so
  // resetToNewAnalysis can clear them — see the hero listing-link comment.)

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
      // Prefer the REAL for-sale list price (asking price) when we have it;
      // fall back to the AVM value estimate otherwise.
      const price = e.listPrice ?? e.valueEstimate;
      const priceIsAsking = e.listPrice != null;
      if (price != null) {
        form.setValue("purchasePrice", Math.round(price), opts);
        filled.push(priceIsAsking ? "asking price" : "price");
      }
      const pt = form.getValues("propertyType");
      if (e.rentEstimate != null && (pt === "single-family" || pt === "owner-occupant")) {
        form.setValue("monthlyRent", Math.round(e.rentEstimate), opts);
        filled.push("rent");
      }
      if (filled.length > 0) {
        toast({
          title: "Auto-filled from address",
          description: `Filled ${filled.join(", ")} from RentCast${
            priceIsAsking ? " (asking price from the active listing)" : ""
          } - adjust anything that's off.`,
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

  // Paste a Zillow/Redfin/Realtor link → parse the address from the URL slug
  // (we never fetch the page — those sites block bots with a captcha) and run it
  // through the hero-handoff flow: set address, enrich (HUD rent / FRED rate /
  // state tax). Pro users additionally get beds/baths/sqft + value + rent pulled
  // from RentCast by address (the listing's own numbers aren't fetchable);
  // everyone else gets an estimated price. Then it auto-runs the verdict.
  const handleListingUrl = useCallback(() => {
    const parsed = parseListingUrl(listingUrl);
    if (!parsed) {
      setListingUrlError(true);
      return;
    }
    setListingUrlError(false);
    heroAnalyzeHandlerRef.current?.({
      token: `listing:${parsed.address}:${Date.now()}`,
      address: parsed.address,
      state: parsed.state,
    });
    setListingUrl("");
    // Successful parse → swap the address input back in so the user sees
    // the parsed address land in the form (Phase 4 hero toggle).
    setListingLinkOpen(false);
  }, [listingUrl]);

  /**
   * Apply a starter template's assumption set (financing + expenses + growth)
   * to the form WITHOUT touching the address / price / rent the user entered.
   * Mirrors the field mapping in template-selector-section's applyTemplateToForm.
   *
   * Writes stay `shouldDirty: true` on purpose (the default-template
   * auto-apply skips dirty fields, so a later auto-apply can't stomp the
   * play's values). Returns the exact field → value record it wrote so the
   * caller can badge those chips as the PLAY's defaults instead of letting
   * the dirty flag masquerade as a user edit (BROWSER-2).
   */
  const applyStarterAssumptions = useCallback(
    (starterKey: StarterTemplate["key"]): Record<string, unknown> | null => {
      const starter = STARTER_TEMPLATES.find((s) => s.key === starterKey);
      if (!starter) return null;
      const t = starter.template;
      const opts = { shouldDirty: true, shouldValidate: false } as const;
      const applied: Record<string, unknown> = {};
      const write = <K extends keyof InvestmentFormValues>(
        field: K,
        value: InvestmentFormValues[K]
      ) => {
        form.setValue(field, value as never, opts);
        applied[field] = value;
      };
      write("propertyTaxPct", t.propertyTaxPct);
      write("insuranceInputMode", t.insuranceInputMode);
      if (t.insurancePct != null) write("insurancePct", t.insurancePct);
      if (t.insuranceMo != null) write("insuranceMonthly", t.insuranceMo);
      write("maintenancePct", t.maintenancePct);
      write("vacancyPct", t.vacancyPct);
      write("mgmtPct", t.managementPct);
      write("capexPct", t.capexPct);
      write("closingCostsPct", t.closingCostsPct);
      write("interestRate", t.interestRatePct);
      write("downPaymentPct", t.downPaymentPct);
      // Mortgage-insurance overrides (FHA MIP etc.). Always set — including back
      // to undefined — so a prior strategy's PMI settings don't leak forward.
      write("pmiAnnualRatePct", t.pmiAnnualRatePct ?? undefined);
      write("pmiNoCancel", t.pmiNoCancel ?? undefined);
      write("expenseGrowthPct", t.expenseGrowthPct);
      write("rentGrowthPct", t.rentGrowthPct);
      write("appreciationRatePct", t.appreciationRatePct);
      write("sellingCostPct", t.sellingCostPct);
      if (t.buildingValuePct != null) write("buildingValuePct", t.buildingValuePct);
      if (t.depreciationYears != null) write("depreciationYears", t.depreciationYears);
      if (t.includeInterestDeduction != null)
        write("includeInterestDeduction", t.includeInterestDeduction);
      if (t.taxRatePct != null) write("taxRatePct", t.taxRatePct);
      return applied;
    },
    [form]
  );

  /**
   * One-click undo for the default-template auto-apply: restore the exact
   * pre-apply values (factory defaults + any user_analysis_defaults overlay)
   * and stop auto-applying for the rest of this mount — the user said no.
   * Plain closure (captured by the toast at apply time); touches only refs
   * + the stable form object, so staleness isn't a concern.
   */
  const undoAutoAppliedTemplate = () => {
    const undo = autoApplyUndoRef.current;
    if (!undo) return;
    autoApplyUndoRef.current = null;
    autoApplySuppressedRef.current = true;
    isProgrammaticResetRef.current = true;
    for (const { field, value } of undo) {
      form.setValue(field, value as never, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
      recomputeOutputsFromFormRef.current();
    });
  };
  undoAutoAppliedTemplateRef.current = undoAutoAppliedTemplate;

  // Latest-closure assignment for the default-template auto-apply (ref
  // declared next to resetToNewAnalysis, which re-triggers it). Guards, in
  // order: template list not loaded / no default; session didn't start
  // factory-fresh (draft restore, saved-deal edit, "Make this mine");
  // user clicked Undo; a saved deal is loaded; a template is already
  // applied (explicitly picked or carried by a restore). Per-field: never
  // overwrite a field the user edited (dirty) or one address-enrichment
  // filled — enrichment stays the winner for rate/tax, exactly how the
  // user_analysis_defaults overlay already defers to it (applied with
  // shouldDirty:false, so a later FRED/state-tax fill still overwrites).
  autoApplyDefaultTemplateRef.current = () => {
    const tpl = defaultTemplateRef.current;
    if (!tpl) return;
    if (!autoApplyEligibleRef.current || autoApplySuppressedRef.current) return;
    if (savedDealIdRef.current) return;
    if (form.getValues("templateId")) return;
    const dirty = form.formState.dirtyFields as Record<string, unknown>;
    const skipFields = new Set<keyof InvestmentFormValues>();
    for (const key of Object.keys(dirty)) {
      if (dirty[key]) skipFields.add(key as keyof InvestmentFormValues);
    }
    if (enrichmentCaptureRef.current.propertyTaxPct) skipFields.add("propertyTaxPct");
    if (enrichmentCaptureRef.current.interestRate) skipFields.add("interestRate");
    const patch = buildTemplateFormPatch(tpl, { skipFields });
    if (patch.length === 0) return;
    // Snapshot exactly what we're about to overwrite (+ templateId) so
    // Undo restores the untouched form, not a blanket factory reset.
    autoApplyUndoRef.current = [
      ...patch.map(({ field }) => ({ field, value: form.getValues(field) })),
      { field: "templateId" as const, value: form.getValues("templateId") },
    ];
    isProgrammaticResetRef.current = true;
    const opts = { shouldDirty: false, shouldTouch: false, shouldValidate: false };
    for (const { field, value } of patch) form.setValue(field, value as never, opts);
    // Link the deal to the template like an explicit pick would — the
    // selector chip shows the template name, and a save records template_id.
    form.setValue("templateId", tpl.id, opts);
    // One apply per session: disarm until the next clean reset re-arms.
    // Without this, a selector remount (strategy-chip toggle) re-fires
    // onTemplatesLoaded and could re-apply after the user picked "None".
    autoApplyEligibleRef.current = false;
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
      recomputeOutputsFromFormRef.current();
    });
    // The quiet "why isn't this form factory-fresh" explanation + escape
    // hatch. Matches the enrichment "Auto-filled from address" pattern.
    toast({
      title: "Your default template was applied",
      description: `"${tpl.templateName}" pre-filled your assumptions for this deal.`,
      action: (
        <ToastAction altText="Undo — use standard defaults instead" onClick={undoAutoAppliedTemplate}>
          Undo
        </ToastAction>
      ),
    });
  };

  /** TemplateSelectorSection reports the Pro user's templates here once
   *  loaded (free/anon users: never called). Capture the default and try
   *  the auto-apply — by now the mount init effect has already decided
   *  eligibility (child effects fire before the parent's, and the list
   *  arrives a server roundtrip later regardless). */
  const handleTemplatesLoaded = useCallback((templates: AnalysisTemplateOption[]) => {
    defaultTemplateRef.current = templates.find((t) => t.isDefault) ?? null;
    // Keep the full list for template-name resolution in the assumptions
    // strip / receipt (the chip shows "Template: <name> ✓").
    setTemplateOptions(templates);
    autoApplyDefaultTemplateRef.current();
  }, []);

  /** Explicit selector picks reconcile the auto-apply. The Undo toast can
   *  be evicted within seconds (TOAST_LIMIT=1 — the enrichment toast
   *  replaces it), so "None" doubles as the durable escape hatch: while
   *  the auto-apply snapshot is live it restores the pre-apply values
   *  (no-op otherwise — explicit-pick users keep today's behavior). An
   *  explicit template pick supersedes the auto-apply instead: drop the
   *  snapshot so a later "None"/Undo can't stomp the user's choice. */
  const handleExplicitTemplateChange = useCallback((templateId: string | null) => {
    if (templateId) {
      // Only the snapshot is dropped — NOT the suppressed flag, so a
      // future "New Analysis" reset still auto-applies their default.
      autoApplyUndoRef.current = null;
      return;
    }
    undoAutoAppliedTemplateRef.current();
  }, []);

  /**
   * "What's your play?" chip handler. Tailors the form to the chosen investor
   * strategy: sets property type, applies that play's assumption defaults, and
   * points the results view at the tab that leads with its key number. null
   * ("Clear") exits the lens AND puts back the pre-play values of every field
   * the play wrote that the user hasn't edited since (STRATEGY-CLEAR-RESTORES).
   */
  const handleSelectStrategy = useCallback(
    // `source` separates real chip clicks from link-seeded landings
    // (persona pages / homepage persona cards) in analytics, so seeded
    // traffic can't inflate chip-engagement numbers.
    (key: string | null, source: "chip" | "link" = "chip") => {
      const strategy = getStrategyByKey(key);
      const strOpts = { shouldDirty: true, shouldValidate: false } as const;
      const snapshotRevertFields = (): Record<string, unknown> => {
        const values = form.getValues() as unknown as Record<string, unknown>;
        const snapshot: Record<string, unknown> = {};
        for (const field of STRATEGY_REVERTABLE_FIELDS) snapshot[field] = values[field];
        return snapshot;
      };
      if (!strategy) {
        setActiveStrategyKey(null);
        // "Clear" has to mean clear. Put back what the play overwrote:
        // property type (whose restore hands the parked rent / beds / baths
        // / sq ft back through the type-switch stash), financing, tax and
        // the rest of the starter set — but never a field the user has
        // edited since, because that number is theirs now.
        const revert = planStrategyRevert(
          strategyRevertRef.current,
          form.getValues() as unknown as Record<string, unknown>
        );
        strategyRevertRef.current = null;
        // BROWSER-2 kept the play's provenance badges after Clear on the
        // grounds that "the values ARE still the play's". After a real
        // revert they aren't, so the badges must go with them — the rule
        // (badge the value's true owner) is unchanged.
        strategyAppliedRef.current = null;
        // Same options as the auto-apply Undo: an undo restores values, it
        // doesn't pretend the user typed them.
        for (const { field, value } of revert) {
          form.setValue(field, value as never, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        }
        // Clear STR income fields so a derived ADR×occupancy income can't leak
        // into the default (monthly-rent) flow after the chip is cleared.
        form.setValue("avgDailyRate", undefined, strOpts);
        form.setValue("occupancyPct", undefined, strOpts);
        form.setValue("strFurnishingCost", undefined, strOpts);
        return;
      }
      // Captured BEFORE the first write of THIS invocation. It is both the
      // pre-lens `before` on the first play and — on every later play — the
      // evidence of what the user typed since the last one, which is what
      // stops a second chip from claiming (and Clear from destroying) a
      // value the play never wrote.
      const preWrite = snapshotRevertFields();
      // Exactly what this invocation writes. Only these may refresh `after`.
      const written = new Set<string>();
      if (form.getValues("propertyType") !== strategy.propertyType) {
        form.setValue("propertyType", strategy.propertyType, {
          shouldDirty: true,
          shouldValidate: false,
        });
        written.add("propertyType");
      }
      const applied = applyStarterAssumptions(strategy.starterKey);
      if (applied) for (const field of Object.keys(applied)) written.add(field);
      // Record what the play wrote so the assumption chips badge those
      // values as "<play>" defaults, not "yours" (BROWSER-2). A field drops
      // out of the owned set the moment its value diverges (a real user
      // edit); the whole set drops on Clear, which now restores the values
      // the badges were describing.
      strategyAppliedRef.current = applied
        ? { label: strategy.label, fields: applied }
        : null;
      // The starter set just overwrote any applied template's values —
      // leaving templateId linked would resurface "Template: <name> ✓"
      // after Clear over numbers that are no longer the template's, and a
      // Save would persist the stale template_id
      // (TEMPLATE-CHIP-STALE-AFTER-STRATEGY).
      if (form.getValues("templateId")) {
        form.setValue("templateId", undefined, { shouldDirty: true, shouldValidate: false });
        written.add("templateId");
      }
      // Keep the income data model aligned with the inputs the chip shows. STR
      // collects nightly rate + occupancy (income is derived from them), so seed
      // a default occupancy and drop any stale monthly rent. Every other play
      // collects monthly rent, so clear any STR fields left from a prior STR run.
      if (strategy.incomeMode === "str") {
        form.setValue("monthlyRent", undefined, strOpts);
        written.add("monthlyRent");
        if (form.getValues("occupancyPct") == null) {
          form.setValue("occupancyPct", 65, strOpts); // ~US STR average; user-editable
        }
      } else {
        form.setValue("avgDailyRate", undefined, strOpts);
        form.setValue("occupancyPct", undefined, strOpts);
        form.setValue("strFurnishingCost", undefined, strOpts);
      }
      // Both halves of the undo, now that every write has landed. Rolling it
      // forward (rather than re-capturing `after` wholesale) is what keeps a
      // second chip from adopting a value the user typed BETWEEN plays and
      // handing it to Clear to destroy — see planStrategySnapshot.
      // monthlyRent is the one field a play clears only INDIRECTLY on a
      // property-type change: the reactive effect parks it after this
      // handler returns, so it reads as unwritten here and the type-switch
      // stash owns restoring it. That's the same value either way; the stash
      // just has the whole rent roll, not one number.
      strategyRevertRef.current = planStrategySnapshot({
        previous: strategyRevertRef.current,
        preWrite,
        postWrite: snapshotRevertFields(),
        written,
      });
      setActiveStrategyKey(strategy.key);
      // BRRRR/Flip render their model inline as the results hero, so don't also
      // lead the Details tabs with the (duplicate) Strategies tab - default to
      // cash-flow context. Wholesale keeps Stress Test so "Adjust targets" lands.
      pointDashboardAt(strategy.primaryTab === "strategies" ? "cash-flow" : strategy.primaryTab);
      setAdvancedOpen(false);
      trackEvent("strategy_selected", { strategy: strategy.key, source });
    },
    [form, applyStarterAssumptions, pointDashboardAt]
  );

  const buildTaxStrategySource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult
  ) => {
    const input: TaxStrategyInput = {
      monthlyRentalIncome: result.monthlyRentalIncome,
      totalOperatingExpenses: result.totalOperatingExpenses,
      capexReserveMonthly: result.capex,
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
      capexReserveMonthly: result.capex,
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
      initialCashInvested: result.totalCashRequired,
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

    // Fresh math wins: the stored snapshot goes stale after engine
    // corrections (PMI, CapEx-taxable), and rendering it over the computed
    // result made the analyzer contradict the workspace header's
    // recompute-on-read — then every number jumped on the first edit when
    // the live recompute took over. The snapshot only contributes fields
    // calculateAnalysis doesn't produce (stored score/recommendation
    // metadata etc.) — same fresh-over-stored precedence as the PDF export
    // path. calculateAnalysis returns every AnalysisResult field, so no
    // stale snapshot value can shadow a computed one.
    return {
      ...(rawSnapshot as Partial<AnalysisResult>),
      ...computedResult,
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
      // previewParse (not the full schema): the live verdict forms on
      // price + rent alone — address is required for save/share but the
      // math never reads it, so it must not gate the magic moment.
      const liveParsed = previewParse(form.getValues());
      if (liveParsed.success) {
        try {
          const r = calculateAnalysis(liveParsed.data);
          // Deal Score is free for everyone, so compute it for the preview too
          // - the hero 0-100 number forming live is the magic moment.
          const ds = computeDealScore(buildDealScoreInputFromAnalysis(liveParsed.data, r));
          // A negative first number is what MOST cold visitors see (random
          // addresses rarely cash-flow at ask) — without a path out it reads
          // as a dead end and invites a bounce. Solve the break-even price
          // (cash flow ≥ $0, same solver the MAO card uses) so the preview
          // can say "try $X as your offer" instead of just "Negative".
          // Pure client math on the debounced recompute; null when already
          // positive or unsolvable.
          const breakEven =
            r.netCashFlow < 0
              ? calculateMaxAllowableOffer(liveParsed.data, { monthlyCashFlow: 0 })
              : null;
          const tier = getDealTier(r);
          setLivePreview({
            tier,
            score: ds.score,
            netCashFlow: r.netCashFlow,
            capRate: r.capRate,
            dscr: r.dscr,
            monthlyPayment: r.monthlyPayment,
            breakEvenPrice: breakEven ? breakEven.maxPrice : null,
            // Mixed/Marginal one-liner ("DSCR 1.08 — below the 1.25 lenders
            // want") so the amber pill isn't a dead end — pure string pick
            // from metrics already in hand, no extra solver work.
            limitingFactor: getLimitingFactor(tier, r),
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
    // Unchanged since the last compute: nothing to do, and the results
    // match the form again (covers the user restoring a cleared value).
    if (nextSnapshot !== null && nextSnapshot === baseline) {
      setStaleResultsWarning(false);
      return;
    }
    // Transiently unparseable mid-edit (e.g. a required field momentarily
    // cleared): keep the last good results on screen instead of blanking
    // them — that silent blank was the core "sticky / nothing happens"
    // complaint — but FLAG them as stale. If the field stays invalid (user
    // got interrupted mid-retype), the results header shows a non-blocking
    // "reflects your last complete entry" strip instead of letting stale
    // numbers pass as current (STALE-RESULTS-NO-RERUN-SIGNAL).
    if (nextSnapshot === null) {
      setStaleResultsWarning(true);
      return;
    }
    const parsed = investmentFormSchema.safeParse(form.getValues());
    if (!parsed.success) {
      setStaleResultsWarning(true);
      return;
    }
    setStaleResultsWarning(false);
    const values = parsed.data;
    // Mirror onSubmit's guard: the live recompute repaints every number the
    // moment the user types the real asking price, so the "Estimated
    // purchase price (~$X)" strip must drop right then too — not only on an
    // explicit re-Run (ESTIMATED-PRICE-STRIP-STALE-AFTER-LIVE-RECOMPUTE).
    if (estimatedPriceValue != null && values.purchasePrice !== estimatedPriceValue) {
      setEstimatedPriceValue(null);
      setPriceEstimated(false);
    }
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
    // Nonce-keyed handoff (see consumeSavedDealHandoffPayload): the opener
    // passes the payload's localStorage key nonce in the URL. Strip the
    // one-time params immediately so a reload (or a copied URL) never
    // re-attempts a consumed handoff.
    const handoffParams = new URLSearchParams(window.location.search);
    const editHandoffNonce = handoffParams.get(DEAL_EDIT_HANDOFF_PARAM);
    const duplicateHandoffNonce = handoffParams.get(DEAL_DUPLICATE_HANDOFF_PARAM);
    // A legacy (pre-nonce) tab always arrives at a bare "/"; a new-scheme
    // open always carries a nonce param. So the un-nonced shared keys are
    // only a valid fallback when NEITHER param is present — otherwise a
    // new-scheme open must never consume an orphaned legacy key of the
    // other handoff type.
    const allowLegacyHandoff = editHandoffNonce === null && duplicateHandoffNonce === null;
    if (!allowLegacyHandoff) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete(DEAL_EDIT_HANDOFF_PARAM);
        url.searchParams.delete(DEAL_DUPLICATE_HANDOFF_PARAM);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      } catch {
        /* history unavailable — a stale param only costs a no-op re-read */
      }
    }
    const reopenPayloadRaw = consumeSavedDealHandoffPayload(
      SAVED_ANALYSIS_EDIT_DRAFT_KEY,
      editHandoffNonce,
      allowLegacyHandoff
    );
    const autoExportPdfFlag =
      window.sessionStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY) ??
      window.localStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    if (autoExportPdfFlag === "1") {
      autoExportPdfRef.current = true;
      window.sessionStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
      window.localStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    }

    // Duplicate handoff (My Deals → "Duplicate"): fork the deal's ASSUMPTIONS
    // into a NEW deal. Restore financing/expenses/vacancy/etc. but clear the
    // property identity (address/price/rent, incl. per-unit rents) so the
    // user just enters the new property — the "copy a row, change 3 cells"
    // flow. No savedDealId → a save is a fresh insert (never overwrites the
    // original). Checked before the edit-draft path; isolated from it.
    const duplicatePayloadRaw = consumeSavedDealHandoffPayload(
      SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY,
      duplicateHandoffNonce,
      allowLegacyHandoff
    );
    if (duplicatePayloadRaw) {
      try {
        const parsed = JSON.parse(duplicatePayloadRaw) as { formSnapshot?: unknown };
        // Lenient fallback: the fork wipes address/price/rents anyway, so a
        // legacy snapshot the strict schema rejects (e.g. a pre-Apr-2026
        // 0-rent unit) can still donate its assumptions — this keeps
        // "Duplicate assumptions" working as the recovery path for frozen
        // legacy deals.
        const normalized =
          normalizeInvestmentFormSnapshot(parsed.formSnapshot) ??
          normalizeInvestmentFormDraft(parsed.formSnapshot);
        if (normalized) {
          const forked: Partial<InvestmentFormValues> = {
            ...normalized,
            address: "",
            purchasePrice: undefined,
            monthlyRent: undefined,
            // Income is property-specific: an STR deal's nightly rate ×
            // occupancy is this property's revenue, and carrying it into the
            // fork silently prices the NEW deal on the OLD property's income
            // (calc-analysis derives income from ADR when set, so even a
            // typed rent would be ignored) —
            // STR-STRATEGY-RESTORE-INVISIBLE-INCOME.
            avgDailyRate: undefined,
            occupancyPct: undefined,
            strFurnishingCost: undefined,
            units: (normalized.units ?? []).map((u) => ({ ...u, monthlyRent: undefined })),
          };
          prevPropertyTypeRef.current = normalized.propertyType;
          form.reset(forked);
          // New deal: no savedDealId, no results yet (price/rent cleared → the
          // live preview forms once the user enters the new property).
          toast({
            title: "Assumptions duplicated",
            description:
              "Enter the new property's address, price & rent — your financing and expense assumptions carried over.",
          });
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
          });
          return;
        }
      } catch {
        // Malformed payload → fall through to a clean new-analysis init.
      }
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
          // Reconcile the restored income model with the strategy UI: a
          // positive nightly rate means this deal was built in Short-term
          // Rental mode — without the key the ADR/occupancy inputs stay
          // hidden and "Monthly rent" renders EMPTY while calc-analysis
          // still derives income from ADR (typed rent silently ignored) —
          // STR-STRATEGY-RESTORE-INVISIBLE-INCOME. Key only; the restored
          // values are the truth, so no starter re-apply.
          if ((hydratedValues.avgDailyRate ?? 0) > 0) {
            setActiveStrategyKey("short-term");
          }
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
          setStaleResultsWarning(false);
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
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
          });
          return;
        }
        // Strict normalize failed (a legacy row the current schema rejects,
        // e.g. a pre-Apr-2026 deal saved with rent 0 back when the schema
        // allowed it). Refusing to open froze those deals behind a circular
        // toast ("open it and re-save" — opening WAS the failing step).
        // Open the FORM via the lenient draft normalizer instead: the
        // sanitized inputs load, validation flags the offending field, and
        // Save (still full-schema-gated) persists the fix to the same row.
        // No results render — the schema rejected these values, so nothing
        // computed from them should either.
        const lenient =
          typeof parsed.id === "string" ? normalizeInvestmentFormDraft(parsed.formSnapshot) : null;
        if (lenient && typeof parsed.id === "string") {
          const issue = describeInvestmentFormSnapshotIssue(parsed.formSnapshot);
          prevPropertyTypeRef.current = lenient.propertyType;
          form.reset(lenient);
          if ((lenient.avgDailyRate ?? 0) > 0) {
            setActiveStrategyKey("short-term");
          }
          setSavedDealId(parsed.id);
          savedDealIdRef.current = parsed.id;
          lastPersistedFormJsonRef.current = formSnapshotForCompare(lenient);
          toast({
            title: "One field needs a fix",
            description: issue
              ? `This deal was saved in an older format. Fix "${issue}", then Run and re-save.`
              : "This deal was saved in an older format. Fix the highlighted field, then Run and re-save.",
          });
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
            // Surface the failing field inline right away — the toast names
            // it, the form highlights it.
            void form.trigger();
          });
          return;
        }
      } catch {
        // Malformed JSON — fall through to the failure toast below.
      }
      // Payload present but not restorable: malformed beyond even the
      // lenient normalizer (corrupt JSON / non-object snapshot). The user
      // clicked "Open Analysis", so a silently blank calculator reads as
      // data loss — say what happened and land on the clean form (NOT the
      // anon-draft restore below, which could resurrect an unrelated draft
      // under this toast). The payload was consumed at read time, so it
      // can't re-fail on every future "/" visit. Advice must not loop back
      // to the failing step: reopening won't fix unreadable data, support
      // recovery can.
      toast({
        title: "Couldn't open this deal",
        description:
          "This deal's saved data is unreadable, so it can't be reopened. Email hello@usetruecap.com with the property address and we'll recover it.",
        variant: "destructive",
      });
      resetToNewAnalysis("single-family");
      setSavedTemplateFallback(null);
      return;
    }

    // Calculator → analyzer handoff (P2-2): /?price=&rent=&beds=&address=
    // carries the numbers from a /tools calculator (or an embed of one).
    // Higher priority than a stale anon draft; prefills ONLY the provided
    // fields on top of defaults (partial handoffs like price+rent are
    // expected) and returns so the draft restore doesn't clobber them.
    const handoff = readAnalyzerHandoff(window.location.search);
    if (handoff) {
      // Property type first: a persona/marketing link (?type=owner-occupant)
      // lands the visitor on the right form. We're inside the mount reset
      // (isProgrammaticResetRef is true), so the reactive propertyType effect
      // is suppressed — seed the units + sync prevPropertyTypeRef here, the
      // same way that effect would, so multi-family / owner-occupant get
      // their unit rows instead of an empty grid.
      if (handoff.propertyType !== undefined) {
        form.setValue("propertyType", handoff.propertyType);
        prevPropertyTypeRef.current = handoff.propertyType;
        if (handoff.propertyType !== "single-family") {
          form.setValue("units", getDefaultUnitsForPropertyType(handoff.propertyType), {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
      }
      if (handoff.address !== undefined) form.setValue("address", handoff.address);
      if (handoff.purchasePrice !== undefined) form.setValue("purchasePrice", handoff.purchasePrice);
      if (handoff.bedrooms !== undefined) form.setValue("bedrooms", handoff.bedrooms);
      if (handoff.monthlyRent !== undefined) form.setValue("monthlyRent", handoff.monthlyRent);
      // A handed-off deal is still a NEW deal: the user's default template
      // may pre-fill the assumption fields (never the handed-off
      // price/rent/beds/address — the patch doesn't touch those).
      autoApplyEligibleRef.current = true;
      queueMicrotask(() => {
        isProgrammaticResetRef.current = false;
        // Strategy chip from the link (/?strategy=brrrr — persona pages):
        // applied AFTER the reset flag drops so the chip handler behaves
        // exactly like a user click — the reactive propertyType effect
        // seeds units, starter assumptions apply (and win over any ?type=
        // seeded above), and the results view leads with the play's tab.
        if (handoff.strategy) handleSelectStrategy(handoff.strategy, "link");
        // Form the live verdict from the handed-off numbers right away —
        // the preview normally only wakes on the first keystroke, leaving
        // a pre-filled form with no numbers anywhere (same contract as the
        // draft restore below: preview yes, full auto-run no).
        recomputeOutputsFromFormRef.current();
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
        // Lenient normalizer: an interrupted draft is usually
        // schema-INCOMPLETE (address + price, no rent yet) — the strict
        // snapshot gate rejected exactly the drafts this feature exists
        // for and the catch below then wiped them.
        const normalized = normalizeInvestmentFormDraft(parsedDraft);
        if (normalized) {
          prevPropertyTypeRef.current = normalized.propertyType;
          form.reset(normalized);
          // Same reconciliation as the saved-deal edit path above: an STR
          // draft (avgDailyRate > 0) must restore the "short-term" play so
          // its income inputs render — otherwise the rent field shows empty
          // while ADR income drives the verdict and typed rent is ignored
          // (STR-STRATEGY-RESTORE-INVISIBLE-INCOME).
          if ((normalized.avgDailyRate ?? 0) > 0) {
            setActiveStrategyKey("short-term");
          }
          // Surface the restore visibly. Without this the user just
          // sees a pre-filled form and wonders what happened.
          setRestoredFromDraft(true);
          // Capture the address so the banner can name the deal
          // specifically ("Welcome back - your draft for 1700 W Erie
          // Ave is ready"). Trim + cap to a sane length so a
          // pathologically long address can't blow out the layout.
          const addr = (normalized.address ?? "").trim();
          setRestoredAddress(addr ? addr.slice(0, 60) : null);
          // EXCEPTION to the no-auto-calculate contract below: the user
          // clicked SAVE while anonymous and just returned from auth
          // (pending-save-intent flag, set by the Save button's goToLogin).
          // Their "intent click" already happened pre-auth — re-run the
          // analysis so the result they tried to save is back on screen,
          // and point them at Save. Without this they land on a pre-filled
          // but inert form and must re-Calculate + re-Save manually — a
          // conversion leak at the moment of highest intent. Double-RAF
          // mirrors the PDF-return flow: let RHF flush before submitting.
          if (isAuthenticated && consumePendingSaveIntent()) {
            toast({
              title: "Welcome back — your deal is ready",
              description: addr
                ? `Re-running your analysis for ${addr.slice(0, 60)}. Hit Save to keep it.`
                : "Re-running your analysis. Hit Save to keep it.",
              variant: "success",
            });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                void form.handleSubmit(onSubmit, onError)();
              });
            });
            queueMicrotask(() => {
              isProgrammaticResetRef.current = false;
            });
            return;
          }
          // Don't auto-calculate - restoring inputs is the contract,
          // running the analysis is the user's intent click. Auto-
          // calculating would race with the loading-spinner UI and
          // ambush the user with results they didn't ask for. The LIVE
          // PREVIEW is different: it's the same pure-client math that
          // forms beside the user's hands as they type, so a restored
          // draft should come back with its verdict already forming —
          // not a full form with zero numbers until the first keystroke
          // (RESTORED-DRAFT-NO-LIVE-VERDICT).
          queueMicrotask(() => {
            isProgrammaticResetRef.current = false;
            recomputeOutputsFromFormRef.current();
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
      // A programmatic type change means the whole form was just replaced
      // (reset / draft restore / saved-deal load / hero handoff), so the
      // parked facts describe a property that is no longer on screen.
      propertyTypeStashRef.current = {};
      return;
    }

    const prevType = prevPropertyTypeRef.current;
    if (prevType === propertyType) return;
    prevPropertyTypeRef.current = propertyType;
    isProgrammaticResetRef.current = true;
    // A type switch UNMOUNTS the other model's inputs — it must never DELETE
    // what the user (or auto-fill) put in them (TYPE-SWITCH-PRESERVES-INPUT).
    // The plan parks the outgoing type's rent roll + single-family facts,
    // restores whatever this type held last time, and carries the rent
    // across the shapes that have a slot for it. Multi-Family ↔ Owner
    // Occupant is the same rent roll under a different label, so it now
    // survives the switch outright instead of being replaced by empty rows.
    // Single-family-only fields still land as undefined while a multi-unit
    // section is shown — stale NaN from an unmounted input must not fail
    // validation — but the values wait in the stash instead of being gone.
    const plan = planPropertyTypeSwitch({
      prevType,
      nextType: propertyType,
      units: form.getValues("units"),
      singleFamily: {
        bedrooms: form.getValues("bedrooms"),
        bathrooms: form.getValues("bathrooms"),
        sqft: form.getValues("sqft"),
        monthlyRent: form.getValues("monthlyRent"),
      },
      stash: propertyTypeStashRef.current,
    });
    propertyTypeStashRef.current = plan.stash;
    const factOpts = { shouldValidate: false, shouldDirty: false } as const;
    form.setValue("bedrooms", plan.singleFamily.bedrooms, factOpts);
    form.setValue("bathrooms", plan.singleFamily.bathrooms, factOpts);
    form.setValue("sqft", plan.singleFamily.sqft, factOpts);
    form.setValue("monthlyRent", plan.singleFamily.monthlyRent, factOpts);
    form.setValue("units", plan.units, {
      shouldDirty: true,
      shouldValidate: true,
    });
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
      // Restored income has to reach the live verdict: the writes above all
      // fired while the programmatic flag suppressed the watch subscription,
      // so without this the preview keeps the pre-switch numbers until the
      // next keystroke (same reasoning as RESTORED-DRAFT-NO-LIVE-VERDICT).
      recomputeOutputsFromFormRef.current();
    });
  }, [form, propertyType]);

  useEffect(() => {
    if (!pendingResultsScrollRef.current || isCalculating || !analysisResult) return;
    pendingResultsScrollRef.current = false;
    setTimeout(() => {
      const resultsSection = document.querySelector("[data-analysis-results='true']");
      resultsSection?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }, 100);
  }, [analysisResult, isCalculating]);

  // Restore the user's remembered advanced-options preference.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CALC_ADVANCED_OPEN_KEY);
      if (v === "1" || v === "0") {
        setAdvancedOpen(v === "1");
      }
    } catch {
      /* private mode / disabled storage - keep the default (collapsed) */
    }
  }, []);

  // (The one-time auto-open-advanced-after-first-result nudge was removed —
  // see the advancedOpen declaration comment. The assumptions strip's chips
  // and the ledger's "Edit assumptions" row are the refine entry points.)

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

  // Listen for the persona cards' strategy handoff. The cards live on "/"
  // with the calculator, so their seeded links are same-route soft navs —
  // the ?strategy= URL param alone is inert (the mount-time
  // readAnalyzerHandoff never re-runs). The cards dispatch this event on
  // click; hard loads still go through the mount path above.
  useEffect(() => {
    const onStrategySeed = (e: Event) => {
      const detail = (e as CustomEvent<AnalyzerStrategyEventDetail>).detail;
      if (!detail?.strategy) return;
      // Same validation contract as readAnalyzerHandoff: unknown keys are
      // ignored (never treated as a "clear strategy" click).
      if (!(HANDOFF_STRATEGY_KEYS as readonly string[]).includes(detail.strategy)) return;
      handleSelectStrategy(detail.strategy, "link");
    };
    window.addEventListener(ANALYZER_STRATEGY_EVENT, onStrategySeed as EventListener);
    return () => window.removeEventListener(ANALYZER_STRATEGY_EVENT, onStrategySeed as EventListener);
  }, [handleSelectStrategy]);

  /**
   * Focus an invalid field, first un-hiding the collapsed Advanced Options
   * region when the field lives inside it. The financing, operating-expense
   * and single-family bathrooms/sqft inputs all render inside
   * #advanced-options, which is CSS-hidden (display:none) while
   * advancedOpen is false — form.setFocus on a hidden input is a silent
   * no-op, so without this a validation error behind the collapsed section
   * left the user with a destructive toast pointing at a field that was
   * nowhere on screen (HIDDEN-FIELD-VALIDATION-DEADEND).
   */
  const focusInvalidField = (path: string) => {
    // register() puts the RHF path in the name attribute; most inputs also
    // carry it as their id. Either is enough to locate the DOM node.
    const findEl = () =>
      (document.getElementsByName(path)[0] as HTMLElement | undefined) ??
      document.getElementById(path) ??
      undefined;
    // Phase 4: while the hero's listing-URL row is open, the address input
    // is CSS-hidden (swapped out, still mounted). A validation error on
    // "address" must swap it back in first — same deadend class as the
    // collapsed-advanced case below.
    if (listingLinkOpen && path === "address") {
      setListingLinkOpen(false);
      requestAnimationFrame(() => {
        form.setFocus("address");
        findEl()?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      });
      return;
    }
    const el = findEl();
    const inCollapsedAdvanced =
      !advancedOpen && !!el && el.closest("#advanced-options") !== null;
    if (!inCollapsedAdvanced) {
      form.setFocus(path as never);
      return;
    }
    setAdvancedOpen(true);
    // Defer one frame so the section is visible before focusing (focus on
    // a display:none input is dropped), then bring the field into view —
    // focus's default scroll can leave it flush against the viewport edge.
    requestAnimationFrame(() => {
      form.setFocus(path as never);
      findEl()?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    });
  };

  /**
   * Jump-to-fix for the stale-results strip: find the first field the
   * schema rejects, surface its inline error, and focus it (opening the
   * collapsed Advanced section when needed). Uses a fresh safeParse rather
   * than formState.errors because the live recompute never runs RHF
   * validation — mid-edit invalidity exists only at the schema level.
   */
  const handleJumpToFirstInvalidField = () => {
    const parsed = investmentFormSchema.safeParse(form.getValues());
    if (parsed.success) return; // already healed — the strip clears on the next recompute
    const issue = parsed.error.issues[0];
    if (!issue || issue.path.length === 0) return;
    const path = issue.path.join(".");
    // Trigger validation for exactly this field so "the highlighted field"
    // is literal (inline message + red border), then focus it.
    void form.trigger(path as never);
    focusInvalidField(path);
  };

  const onSubmit = async (validated: InvestmentFormValues) => {
    // Warm the dynamic AnalysisDashboard chunk in parallel with the calc
    // (covers programmatic runs — hero handoff, saved-deal restore —
    // that never focused a form field). No-op if already loaded.
    preloadAnalysisDashboard();
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
    // For the post-await completion toast below: a fork during the deal-score
    // roundtrip must not fire "Analysis Complete" for the deal the user just
    // left (TOAST_LIMIT=1 — it would evict the fork's "Assumptions kept").
    const runGeneration = forkGenerationRef.current;

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
      // COLD FIRST RUN ONLY: once a result or the live preview is
      // already on screen the user is looking at the answer, so the
      // spinner theater is pure manufactured wait — repeat Runs (Pro
      // screening several listings) and preview-visible Runs jump
      // straight to the dashboard (TTFV-2 / SWITCHBACK-3).
      if (!analysisResult && !livePreview) {
        await new Promise((r) => setTimeout(r, 400));
      }
      const result = calculateAnalysis(values);
      const mappedTab = mapInputTabToDashboardTab(activeInputTab);
      if (mappedTab) pointDashboardAt(mappedTab);
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
      // A full Run just validated + computed from the live form — the
      // results are current by definition.
      setStaleResultsWarning(false);
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
      // Every explicit Run brings the ANSWER to the user (the existing
      // results-scroll effect consumes this). Without it, only the
      // saved-deal reopen path scrolled — on phones and short windows the
      // verdict mounted below the fold and the user who tapped Run kept
      // staring at the form (UX walkthrough P0-2). Live recomputes never
      // pass through onSubmit, so mid-edit repaints don't yank the page.
      pendingResultsScrollRef.current = true;
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
      // Forked away while the score loaded → the toast (and the results
      // scroll below, which no-ops on the unmounted dashboard) belong to a
      // deal that's no longer on screen.
      if (forkGenerationRef.current !== runGeneration) return;
      toast({
        title: "Analysis Complete",
        // Rounded like every other surface that shows this number (an
        // unrounded float renders "$1,234.567/mo" — reads like a bug), and
        // "Cash-on-cash" spelled out: the toast is the one line every
        // first-run user reads, so no unexpanded jargon.
        // Sign keyed off the SAME rounded value (live-verdict-panel pattern)
        // so a sub-dollar negative never renders "-$0".
        description: `Net cash flow: ${Math.round(result.netCashFlow) < 0 ? "-" : ""}$${Math.abs(Math.round(result.netCashFlow)).toLocaleString()}/mo | Cash-on-cash: ${result.cocReturn.toFixed(1)}%`,
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
          window.scrollTo({ top: y, behavior: scrollBehavior() });
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
          focusInvalidField(`units.${i}.${firstInvalidField}`);
          break;
        }
      }
    }
    const firstFieldError = findFirstFieldError(errors);
    // Short-term play + both STR inputs empty: the schema's STR detection
    // keys on field PRESENCE, so it falls through to "Enter monthly rent" —
    // but in STR mode the rent input is CSS-hidden (setFocus on display:none
    // is a silent no-op), the exact HIDDEN-FIELD-VALIDATION-DEADEND class.
    // Route the error to the visible STR inputs instead: focus the nightly
    // rate and say what the play actually needs.
    const strHiddenRentError =
      firstFieldError?.path === "monthlyRent" && activeStrategy?.incomeMode === "str";
    if (!hasUnitFieldErrors && firstFieldError?.path) {
      // Opens the collapsed Advanced Options section first when the invalid
      // field (financing / expenses / SF bathrooms+sqft) lives inside it.
      focusInvalidField(strHiddenRentError ? "avgDailyRate" : firstFieldError.path);
    }

    // Address-only block: the live preview already showed the verdict on
    // price + rent, so a red "Validation Error" here reads as "you did
    // something wrong" when the user just hasn't typed an address yet.
    // Give a calm, specific nudge that points at what's left and why
    // (Run/Save/Share need the real address) instead of alarming them.
    const onlyAddressMissing =
      !!errors.address &&
      !hasUnitFieldErrors &&
      Object.keys(errors).every((k) => k === "address");
    if (onlyAddressMissing) {
      toast({
        title: "Add the property address",
        description:
          "Your live estimate is ready above — add the address to run the full analysis and save it.",
      });
      return;
    }

    toast({
      title: "Validation Error",
      description: strHiddenRentError
        ? "Enter a nightly rate and occupancy % for the short-term play."
        : unitsErrorMessage ??
          firstFieldError?.message ??
          "Please fix the highlighted fields before calculating.",
      variant: "destructive",
    });
  };

  /** Core save. `existingIdOverride` / `saveAsNewScenario` come from the
   *  duplicate-address dialog choices; `forceInsert` / `allowAddressChange`
   *  come from the address-changed dialog (save as new deal vs. move the
   *  loaded deal to the new address); the plain Save button passes none of
   *  them (via `handleSaveDeal` below), which keeps the original behavior. */
  const performSaveDeal = async (
    options: {
      existingIdOverride?: string;
      saveAsNewScenario?: boolean;
      /** Ignore the attached savedDealId and insert a fresh deal — the
       *  loaded saved deal stays untouched. */
      forceInsert?: boolean;
      /** Update path only: let the server move the loaded deal to the
       *  form's (changed) address instead of returning ADDRESS_CHANGED. */
      allowAddressChange?: boolean;
    } = {}
  ) => {
    // Snapshot the fork generation: if "Analyze another like this" fires
    // while this save is in flight, the completion below must NOT
    // re-attach the source deal's id to the forked form (or clear the
    // fork's draft) — that silently turned the NEXT deal's save into an
    // overwrite of the source.
    const saveGeneration = forkGenerationRef.current;
    const targetExistingId = options.forceInsert
      ? null
      : options.existingIdOverride ?? savedDealId;
    if (targetExistingId && !canUpdateSavedDeals) {
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
        targetExistingId,
        buildProvenanceInput(enrichmentCaptureRef.current, currentValues),
        options.saveAsNewScenario || options.allowAddressChange
          ? {
              ...(options.saveAsNewScenario ? { saveAsNewScenario: true } : {}),
              ...(options.allowAddressChange ? { allowAddressChange: true } : {}),
            }
          : undefined
      );
      if (result.ok) {
        // A save that came from a chooser dialog succeeded - close it.
        setDuplicateCollision(null);
        setAddressChangedPrompt(null);
        // Deal-agnostic bookkeeping first — it must run even when a fork
        // races this save (the deal DID persist server-side): the local
        // count feeds the client save-limit gate, and the event refreshes
        // header/My Deals listeners, regardless of which deal the form
        // now holds.
        if (result.mode === "inserted") {
          setSavedDealCount((count) => count + 1);
        }
        window.dispatchEvent(new CustomEvent("saved-analyses-changed"));
        // parsedValues derives from the payload actually sent (NOT a fresh
        // form.getValues()): edits made while the save was in flight must
        // not be stamped as the persisted/displayed "saved" state.
        const parsedValues = investmentFormSchema.safeParse(currentValues);
        // Fork raced this save (see saveGeneration above): the form now
        // holds the NEXT deal — do not attach the saved id or clear the
        // fork's draft.
        if (saveGeneration !== forkGenerationRef.current) {
          toast({
            title: "Deal saved",
            description: "Saved before you moved on — find it in My Deals.",
            variant: "success",
          });
          return;
        }
        setSavedDealId(result.id);
        savedDealIdRef.current = result.id;
        // Deal is now persisted server-side - the local anonymous
        // auto-save draft is no longer needed. If we leave it, the
        // next anonymous visitor on this device would see this deal's
        // inputs, which is both confusing and a minor privacy concern.
        clearCalcDraftRaw();
        if (result.mode === "inserted") {
          // (savedDealCount was already bumped above, pre-fork-guard.)
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
            property_type: currentValues.propertyType,
            purchase_price: currentValues.purchasePrice,
            cap_rate: analysisResult?.capRate,
            monthly_cash_flow: analysisResult ? Math.round(analysisResult.netCashFlow) : undefined,
          });
        }
        // The persisted baseline is the payload the server actually stored
        // (currentValues) — never a fresh form.getValues(): recording
        // mid-flight edits as "persisted" flipped the badge to "Saved"
        // while the DB row held the pre-edit numbers.
        const persistedJson = formSnapshotForCompare(currentValues);
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
        // Recompute the dirty flag against the just-recorded baseline
        // instead of force-clearing it: if the user edited while the save
        // roundtrip was in flight, the divergence re-arms the "Unsaved
        // changes" badge (and the beforeunload guard) for one more Save.
        syncFormDirtyVersusPersisted();
        toast({
          title: result.mode === "updated" ? "Deal updated" : "Deal saved",
          description:
            result.mode === "updated"
              ? "Your saved analysis was updated with the latest inputs."
              : "Saved — checklist, docs and notes now live in its workspace.",
          variant: "success",
          // First save is the moment a user can learn the workspace
          // (checklist / docs / notes / scenarios) exists — don't dead-end
          // it. New tab, not router.push: the analyzer keeps the just-run
          // result mounted, mirroring the dashboard→analyzer convention
          // ("Open Analysis" opens a NEW tab so the source stays put — see
          // refresh-on-return.tsx).
          action:
            result.mode === "inserted" ? (
              <ToastAction
                altText="Open this deal's workspace in a new tab"
                onClick={() => {
                  window.open(`/dashboard/saved-analyses/${result.id}`, "_blank", "noopener");
                }}
              >
                Open deal workspace
              </ToastAction>
            ) : undefined,
        });
        return;
      }
      if (result.code === "SIGN_IN_REQUIRED") {
        // Server-side backstop (the UI normally gates anon saves before this
        // action runs — e.g. an expired session mid-edit lands here). Don't
        // dead-end the highest-intent click: offer the sign-in route and set
        // the pending-save-intent flag so their deal auto-resumes after auth.
        toast({
          title: "Account needed to save",
          description: "Create a free account (or sign in) and this deal saves itself.",
          variant: "destructive",
          action: (
            <ToastAction
              altText="Create a free account and come back to this deal"
              onClick={() => {
                setPendingSaveIntent();
                // Sign-up, not login — anon savers are mostly first-timers;
                // the sign-up page has a "Sign in" cross-link that keeps ?next.
                router.push("/auth/sign-up?next=/");
              }}
            >
              Create free account
            </ToastAction>
          ),
        });
        return;
      }
      if (result.code === "ENTITLEMENT_SAVE") {
        // Two causes share this code: a paid user AT their saved-deal cap
        // (canSaveDeals true) needs to free space; a non-paid user needs to
        // upgrade. Route the action to the place that actually resolves each
        // — a plain message here was a dead end on mobile (no hover title).
        const atCap = canSaveDeals;
        toast({
          title: atCap ? "Saved-deal limit reached" : "Upgrade required",
          description:
            result.message ??
            (atCap
              ? "You're at your plan's saved-deal limit. Archive or delete a deal to free space."
              : "Subscribe to save and unlock Pro features."),
          variant: "destructive",
          action: (
            <ToastAction
              altText={atCap ? "Manage your saved deals" : "See TrueCap plans"}
              onClick={() => router.push(atCap ? "/dashboard/saved-analyses" : "/pricing")}
            >
              {atCap ? "Manage deals" : "See plans"}
            </ToastAction>
          ),
        });
        return;
      }
      if (result.code === "ADDRESS_CHANGED") {
        // Update path refused: the form's address diverged from the loaded
        // saved deal's. A plain toast here was a dead end (Save re-failed
        // forever while the stale id stayed attached) — open the chooser
        // instead: save as a new deal / move this deal to the new address /
        // cancel. targetExistingId is always set when the server takes the
        // update path; if it somehow isn't, fall through to the generic
        // could-not-save toast below.
        if (targetExistingId) {
          setAddressChangedPrompt({
            targetId: targetExistingId,
            existingTitle: result.existingTitle,
          });
          return;
        }
      }
      if (result.code === "DEAL_DELETED") {
        // The saved deal this session was attached to is gone (deleted or
        // archived in another tab / My Deals). Detach the stale id so the
        // next Save inserts instead of re-targeting the dead row, and give
        // the user a one-click save-as-new path for the inputs on screen.
        // Close either chooser too — the row they were aimed at is gone.
        setDuplicateCollision(null);
        setAddressChangedPrompt(null);
        setSavedDealId(null);
        savedDealIdRef.current = null;
        lastPersistedFormJsonRef.current = null;
        syncFormDirtyVersusPersisted();
        toast({
          title: "This deal was deleted",
          description:
            result.message ??
            "The saved deal you were editing was deleted or archived. Save your current inputs as a new deal to keep them.",
          variant: "destructive",
          action: (
            // forceInsert (not a plain re-save): this action's closure
            // captured the pre-detach savedDealId, so an implicit-target
            // save would re-aim at the deleted row and loop this toast.
            <ToastAction
              altText="Save these inputs as a new deal"
              onClick={() => void performSaveDeal({ forceInsert: true })}
            >
              Save as new deal
            </ToastAction>
          ),
        });
        return;
      }
      if (result.code === "DUPLICATE_ADDRESS") {
        // When the action identified the user's own colliding deal, open the
        // chooser dialog (update it / save as scenario / cancel) instead of
        // dead-ending. The address-changed chooser closes first — a
        // save-as-new choice from it can land here when the new address
        // already has its own saved deal, and only one dialog may own the
        // screen. Without an id (a lookup miss) keep the actionable toast.
        if (result.existingId) {
          setAddressChangedPrompt(null);
          setDuplicateCollision({
            existingId: result.existingId,
            existingTitle: result.existingTitle,
          });
          return;
        }
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

  const handleSaveDeal = async () => performSaveDeal();

  /** A choice made in the duplicate-address dialog. "update" overwrites the
   *  colliding saved deal in place; "scenario" inserts a second analysis for
   *  the same address. Success closes the dialog inside performSaveDeal;
   *  failures surface as toasts and leave the dialog open to retry/cancel. */
  const handleDuplicateChoice = async (choice: DuplicateAddressChoice) => {
    if (!duplicateCollision) return;
    setDuplicateChoiceBusy(choice);
    try {
      await performSaveDeal(
        choice === "update"
          ? { existingIdOverride: duplicateCollision.existingId }
          : // forceInsert alongside saveAsNewScenario: "save as scenario"
            // always means INSERT a sibling at this address. Without it, a
            // collision reached while a saved deal is attached (the
            // address-changed flow: deal A loaded, address retyped to deal
            // B's) would re-target deal A's id, take the server's update
            // path (which ignores saveAsNewScenario), and bounce back into
            // the ADDRESS_CHANGED dialog — a chooser loop. When no deal is
            // attached (the plain duplicate flow), forceInsert is a no-op.
            { saveAsNewScenario: true, forceInsert: true }
      );
    } finally {
      setDuplicateChoiceBusy(null);
    }
  };

  /** A choice made in the address-changed dialog. "new" re-saves WITHOUT the
   *  attached id (a fresh insert; the loaded deal stays untouched — success
   *  attaches the NEW id, and a duplicate collision on the new address flows
   *  into the duplicate chooser). "update-address" re-saves against the same
   *  id with allowAddressChange so the saved deal moves to the new address.
   *  Success closes the dialog inside performSaveDeal; failures surface as
   *  toasts and leave the dialog open to retry/cancel. */
  const handleAddressChangedChoice = async (choice: AddressChangedChoice) => {
    if (!addressChangedPrompt) return;
    setAddressChangedChoiceBusy(choice);
    try {
      await performSaveDeal(
        choice === "new"
          ? { forceInsert: true }
          : {
              existingIdOverride: addressChangedPrompt.targetId,
              allowAddressChange: true,
            }
      );
    } finally {
      setAddressChangedChoiceBusy(null);
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

  // "Apply to deal" from the rehab estimator — writes the estimate into the
  // rehabBudget field (Financing) so it counts toward cash invested. The
  // estimator stops being a dead-end calculator.
  const handleApplyRehab = (total: number) => {
    const amount = Math.max(0, Math.round(total));
    form.setValue("rehabBudget", amount, { shouldDirty: true, shouldValidate: true });
    toast({
      title: "Rehab added to the deal",
      description: `$${amount.toLocaleString()} added to cash invested — re-run to see the impact on cash-on-cash.`,
    });
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
          initialCashInvested: analysisResult.totalCashRequired,
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

    const stripPurchaseParam = () => {
      const current = new URLSearchParams(window.location.search);
      current.delete("pdf_purchase");
      const rest = current.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    };

    if (sessionId === "cancelled") {
      // Nothing to verify — strip immediately so refresh / back-nav is clean.
      stripPurchaseParam();
      toast({
        title: "Checkout cancelled",
        description: "No charge was made. Your deal is still in the form below.",
      });
      return;
    }

    // Verify FIRST; only a confirmed payment strips the session id from the
    // URL. Stripping before the verify call meant a transient failure left a
    // PAID customer with a "try again" toast and nothing to retry — the id
    // was gone from every piece of client state, and recovery was a support
    // email. Now a failure keeps the id (URL + this closure) so the retry
    // action and a plain refresh both re-verify; re-verifying a paid session
    // is explicitly harmless (see app/actions/one-time-pdf.ts).
    const verifyAndExport = async (): Promise<void> => {
      let verified: Awaited<ReturnType<typeof verifyOneTimePdfPaymentAction>>;
      try {
        verified = await verifyOneTimePdfPaymentAction({ sessionId });
      } catch (err) {
        // A thrown server-action fetch (network blip mid-redirect) must
        // land in the same retryable toast, not an unhandled rejection the
        // paid customer never sees.
        console.warn("[one-time-pdf] verify call failed:", err);
        verified = {
          ok: false,
          code: "SERVER_ERROR",
          message: "Could not verify payment. Please try again or contact hello@usetruecap.com.",
        };
      }
      if (!verified.ok) {
        toast({
          title: "Payment not confirmed",
          description: verified.message,
          variant: "destructive",
          action: (
            <ToastAction
              altText="Retry payment verification"
              onClick={() => void verifyAndExport()}
            >
              Retry verification
            </ToastAction>
          ),
        });
        return;
      }

      stripPurchaseParam();
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
    };
    void verifyAndExport();
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
    // Keep the current property type on New Analysis — a multi-family repeat
    // user shouldn't be silently reset to single-family and have to re-pick
    // it + re-confirm units every single deal (new-analysis-hardcodes-single-
    // family). The mount-time reset stays single-family.
    resetToNewAnalysis(form.getValues("propertyType") ?? "single-family");
    setSavedTemplateFallback(null);
  };

  /**
   * "Analyze another like this" (Phase D) — the in-flow copy-a-row. From the
   * CURRENT form values (no save required): keep every assumption (financing,
   * expenses, taxes, insurance, vacancy, growth rates, active play,
   * templateId link) and clear ONLY the property identity + results, so the
   * screen-6-listings investor runs the next address with the same
   * assumptions instead of resetting to factory via New Analysis.
   *
   * Deliberately NOT resetToNewAnalysis: that path rebuilds factory/template
   * defaults. This one mirrors the My Deals "Duplicate" fork
   * (SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY mount branch above) without the
   * save + navigation — same clear list, same "assumptions are the point"
   * semantics. No confirm(): unlike New Analysis nothing irreplaceable is
   * lost (assumptions survive; only identity fields blank).
   */
  const handleAnalyzeAnotherLikeThis = () => {
    isProgrammaticResetRef.current = true;
    // Invalidate any in-flight save: performSaveDeal's completion must not
    // re-attach the SOURCE deal's id (or clear the fork draft) after this
    // fork — clicking Save then fork during the roundtrip silently turned
    // the NEXT deal's save into an overwrite of the source (verifier
    // should-fix). The generation is re-checked after the save's await.
    forkGenerationRef.current += 1;
    // The fork blanks property identity + income, so anything parked by an
    // earlier property-type switch belongs to the property being left
    // behind — keeping it would let a type toggle re-fill the NEXT deal
    // with the previous one's rents.
    propertyTypeStashRef.current = {};
    const clearOpts = { shouldDirty: false, shouldValidate: false } as const;
    // Property identity — the Duplicate-fork clear list PLUS yearBuilt /
    // beds / baths / sqft (this in-flow fork deliberately clears more than
    // the saved-deal mount branch: those are property identity too).
    // setValue on MOUNTED registered fields (never unmount-clear — the STR
    // QA lesson); the input form stays mounted through the results phase.
    form.setValue("address", "", clearOpts);
    form.setValue("purchasePrice", undefined as unknown as number, clearOpts);
    form.setValue("yearBuilt", undefined, clearOpts);
    form.setValue("bedrooms", undefined, clearOpts);
    form.setValue("bathrooms", undefined, clearOpts);
    form.setValue("sqft", undefined, clearOpts);
    form.setValue("monthlyRent", undefined, clearOpts);
    // STR income is property-specific: ADR × occupancy is the OLD
    // property's revenue (calc-analysis derives income from ADR when set,
    // silently ignoring typed rent) — STR-STRATEGY-RESTORE-INVISIBLE-INCOME.
    // The active play itself is an assumption and survives.
    form.setValue("avgDailyRate", undefined, clearOpts);
    form.setValue("occupancyPct", undefined, clearOpts);
    form.setValue("strFurnishingCost", undefined, clearOpts);
    // MF: keep the unit STRUCTURE (count + beds/baths/sqft are close on
    // like-kind listings and cheap to tweak), clear the rents — identical to
    // the Duplicate fork's per-unit treatment.
    form.setValue(
      "units",
      (form.getValues("units") ?? []).map((u) => ({ ...u, monthlyRent: undefined })),
      clearOpts
    );
    form.clearErrors();
    // A save from here is a NEW deal — never an overwrite of the source.
    setSavedDealId(null);
    savedDealIdRef.current = null;
    lastPersistedFormJsonRef.current = null;
    lastComputedFormJsonRef.current = null;
    setHasUnsavedChanges(false);
    // Property-specific captures + benchmarks: the next deal must never be
    // judged against the PREVIOUS address's enrichment / HUD FMR / estimate.
    enrichmentCaptureRef.current = {};
    setMarketRentEstimate(null);
    setUnitFmrByBedrooms(null);
    unitFmrKeyRef.current = null;
    // …and the enrichment TRIGGERS, not just the captures (verifier
    // live-confirmed): with the old refs armed, the MF benchmark effect
    // refetched the OLD metro's FMRs on the very next render, and the SF
    // bedrooms watcher could re-enrich a hand-typed new address from the
    // old county — silently judging the next deal against the wrong market.
    lastSelectedAddressRef.current = null;
    lastEnrichedAddressRef.current = null;
    lastEnrichedGeoRef.current = null;
    setPriceEstimated(false);
    setEstimatedPriceValue(null);
    setPriceEstimateBasis(null);
    // Stale listing-URL row (BROWSER-3 class) and the draft-restore banner
    // both name the OLD property — clear with the identity.
    setListingLinkOpen(false);
    setListingUrl("");
    setListingUrlError(false);
    setRestoredFromDraft(false);
    setRestoredAddress(null);
    // Back to the input phase. clearAnalysisOutputs never touches form
    // values, so the kept assumptions are safe.
    clearAnalysisOutputs();
    setIsCalculating(false);
    isCalculatingRef.current = false;
    // The forked assumptions are the point — the default-template auto-apply
    // must NOT fire over them (mirrors the Duplicate mount branch, which
    // never arms eligibility). Also drop any live auto-apply Undo snapshot:
    // restoring pre-apply values now would stomp the fork.
    autoApplyEligibleRef.current = false;
    autoApplyUndoRef.current = null;
    // Overwrite the anon draft so a reload does NOT restore the SOURCE
    // deal the watcher last wrote. (The forked snapshot itself won't pass
    // the full-schema restore — no address/price — so a reload lands on a
    // clean form: acceptable; restoring the old property would not be.)
    try {
      writeCalcDraftRaw(JSON.stringify(form.getValues()));
    } catch {
      /* storage unavailable — the fork still works for this session */
    }
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
    });
    toast({
      title: "Assumptions kept",
      description:
        "Enter the next property's address, price & rent — everything else carried over.",
    });
    // Land the user on the (now visible again) address input. Deferred a
    // beat so the results section has unmounted and the input phase is the
    // scroll target — same timing as the results-scroll effect above.
    setTimeout(() => {
      form.setFocus("address");
      (document.getElementById("address") ?? undefined)?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "center",
      });
    }, 100);
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

  /**
   * Same protection for IN-APP navigation: beforeunload never fires for App
   * Router client-side transitions, so clicking Dashboard / My Deals in the
   * header silently unmounted the page and dropped the unsaved edits (the
   * anon auto-save draft deliberately skips writes while a saved deal is
   * loaded, so there was no recovery path). A capture-phase document click
   * listener intercepts internal <a href> navigations before next/link's own
   * handler and confirms first. Scoped to exactly the beforeunload
   * condition; external links, new-tab targets, downloads, hash-only jumps,
   * and modifier/middle clicks all pass through untouched.
   */
  useEffect(() => {
    const shouldWarn = isAuthenticated && Boolean(savedDealId) && hasUnsavedChanges;
    if (!shouldWarn) return;
    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      // Left click only; modifier clicks open new tabs and leave this page alive.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      // External navigations hard-unload → beforeunload above already covers them.
      if (destination.origin !== window.location.origin) return;
      // Hash-only jump on the current page: no navigation, nothing lost.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash !== ""
      ) {
        return;
      }
      const confirmed = window.confirm(
        "You have unsaved changes on this deal — leave without saving?"
      );
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
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
    //
    // A timeout backstop races the rAF chain: rAF starves in occluded /
    // backgrounded tabs (browser throttling), and a starved chain meant
    // the promised sample report NEVER ran — the form filled and then
    // nothing (UX walkthrough P0-3). The guard makes whichever fires
    // first the only submit.
    let sampleSubmitted = false;
    const fireSampleSubmit = () => {
      if (sampleSubmitted) return;
      sampleSubmitted = true;
      void form.handleSubmit(onSubmit, onError)();
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(fireSampleSubmit);
    });
    setTimeout(fireSampleSubmit, 150);
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

    const landOnPrice = (missedAutofill = false) => {
      if (missedAutofill) {
        // The one case the instant-verdict path can't cover: we couldn't even
        // recover a state from the typed string. Nudge instead of dead air.
        toast({
          title: "Enter the asking price to finish",
          description:
            "Couldn't auto-detect the location from that address — type the price below, or pick a suggestion as you type for full auto-fill.",
        });
      }
      requestAnimationFrame(() => {
        try {
          form.setFocus("purchasePrice");
        } catch {
          /* field may be unmounted for some property types - non-fatal */
        }
      });
    };

    // Google Places only returns structured components when the visitor PICKS a
    // suggestion. Fast typers / dropdown-dismissers / ad-blocked-Places users
    // submit a bare string — recover the state (+ ZIP) from it so they still get
    // the instant verdict instead of dead-ending on a blank form.
    let resolvedState = detail.state;
    let resolvedCounty = detail.county;
    let resolvedZip = detail.zip;
    if (!(resolvedState || resolvedCounty || resolvedZip)) {
      const parsed = parseAddressLocation(address);
      if (parsed.state) {
        resolvedState = parsed.state;
        resolvedZip = parsed.zip;
      }
    }

    // Still nothing usable (no state anywhere) → land on the price field with a
    // one-line nudge. Rare: only when the typed string has no state or ZIP.
    if (!(resolvedState || resolvedCounty || resolvedZip)) {
      landOnPrice(true);
      return;
    }

    const place: SelectedAddress = {
      formattedAddress: address,
      state: resolvedState,
      county: resolvedCounty,
      zip: resolvedZip,
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

      // Listing-link paste by a Pro user: the portal page is bot-blocked, so the
      // only way to get the real property facts (beds/baths/sqft) + value + rent
      // is a RentCast lookup by address. proOnly → a free user's one freebie is
      // never spent here; they fall through to the address + estimate path.
      let compsFilled = false;
      if (detail.token.startsWith("listing:") && isAuthenticated) {
        try {
          const r = await getPropertyCompsAction({
            address,
            propertyType: form.getValues("propertyType"),
            proOnly: true,
            // Also pull the real for-sale list price (the asking price), not
            // just the AVM estimate — the whole point of pasting the listing.
            includeListing: true,
          });
          if (r.ok) {
            applyComps(r.enrichment);
            compsFilled = true;
          }
        } catch (err) {
          console.warn("[listing comps] lookup failed:", err);
        }
      }

      const canEstimate =
        form.getValues("propertyType") === "single-family" &&
        isEmptyNumber(form.getValues("purchasePrice")) &&
        !isEmptyNumber(form.getValues("monthlyRent"));

      if (canEstimate) {
        const est = estimatePurchasePrice({
          monthlyRent: Number(form.getValues("monthlyRent")),
          state: resolvedState,
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

      // Comps already populated price + rent (Pro listing paste) → run the
      // verdict straight away instead of landing on the price field.
      if (
        compsFilled &&
        !isEmptyNumber(form.getValues("purchasePrice")) &&
        !isEmptyNumber(form.getValues("monthlyRent"))
      ) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            void form.handleSubmit(onSubmit, onError)();
          });
        });
        return;
      }

      landOnPrice();
    })();
  };

  /**
   * Live provenance + raw capture getters for the input-side assumptions
   * strip and enrichment receipt. Read FRESH on every child render (the
   * children subscribe to form writes themselves), so chips re-derive the
   * instant enrichment/template setValue-writes land — the same
   * buildProvenanceInput the result strip + confidence badge use.
   */
  const getLiveProvenance = useCallback(
    () => buildProvenanceInput(enrichmentCaptureRef.current, form.getValues()),
    [form]
  );
  const getEnrichmentCapture = useCallback(() => enrichmentCaptureRef.current, []);

  const toggleAdvanced = () => {
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
      if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: scrollBehavior() });
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
   * advanced assumptions region (financing + expenses behind the
   * assumptions strip) and jump back to the form so refining a
   * default is one click from the numbers the user is judging.
   */
  const handleEditAssumptions = () => {
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
      if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: scrollBehavior() });
    }
  };

  /**
   * Input-phase gate — the SAME expression the LiveVerdictPanel /
   * EnrichmentReceipt `active` props and the sticky dock readout use
   * (kept inline there; aliased here for the cockpit grid only).
   * Pre-run at lg+ the form renders as a two-column cockpit (fields
   * left, sticky live verdict right); once results exist the grid
   * classes drop away and the form returns to today's full-width
   * single column — the cockpit is an input-phase layout only, and
   * the results below the form stay full-width exactly as before.
   */
  const isInputPhase = !showResults && !analysisResult && !isCalculating;

  /**
   * Sample-deal empty-state affordance (Choose-TrueCap Phase C, finding 6):
   * a quiet "See a sample deal →" line inside the hero card, directly under
   * the address input — exactly where a first-timer stares at the empty
   * form. Pristine-form only: it disappears the moment ANY meaningful input
   * exists (address, price, or rent — SF field or any MF unit), and while
   * the listing-URL row is open. Signed-in users only: anonymous visitors
   * already get the filled "Try a sample rental" hero button above (kept
   * unchanged); rendering both would re-crowd the empty state this plan
   * just decluttered. Clicks run the EXISTING handleTrySampleDeal flow
   * (Pro-preview arming included) — no behavior change.
   */
  const hasMeaningfulInput =
    Boolean(watchedAddress?.trim()) ||
    (typeof purchasePrice === "number" && Number.isFinite(purchasePrice) && purchasePrice > 0) ||
    (typeof watchedMonthlyRent === "number" && Number.isFinite(watchedMonthlyRent) && watchedMonthlyRent > 0) ||
    (watchedUnits ?? []).some(
      (unit) => typeof unit?.monthlyRent === "number" && Number.isFinite(unit.monthlyRent) && unit.monthlyRent > 0
    );
  const showEmptyStateSampleLine =
    isInputPhase && isAuthenticated && !hasMeaningfulInput && !listingLinkOpen;

  // Tell the marketing chrome the visitor is now USING the analyzer. The
  // homepage's sticky conversion bar ("Ready to underwrite a deal? It's
  // free · Analyze free") listens for this and hides — it kept selling the
  // analyzer over the form and even over the RESULTS, eating ~90px of a
  // phone viewport mid-analysis (UX walkthrough P1-4). Event-based so the
  // marketing component needs no import from the calculator tree.
  const analyzerEngaged = hasMeaningfulInput || analysisResult !== null;
  useEffect(() => {
    if (!analyzerEngaged) return;
    window.dispatchEvent(new Event("tc-analyzer-engaged"));
  }, [analyzerEngaged]);

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
            {/* ONE headline (Choose-TrueCap Phase B, finding 3): this page
                heading IS the hero title now — the hero card below lost its
                internal "Analyze a deal" title row, and the old
                "institutional-grade analysis…" subtitle collapsed into the
                card's one-line signpost so the page reads as a single door. */}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Type an address — we fill the rest.
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
          data-calc-form="true"
          onSubmit={form.handleSubmit(onSubmit, onError)}
          // First interaction with any field (address focus included)
          // warms the dynamic AnalysisDashboard chunk — one-shot, see
          // preloadAnalysisDashboard above.
          onFocusCapture={preloadAnalysisDashboard}
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
                never gates input or changes the manual run flow.
                RESULTS-PHASE ONLY (Choose-TrueCap Phase B, finding 2): the
                pre-fill rail state was incoherent (green checks on untouched
                Financing/Expenses because defaults exist, numbers elsewhere,
                a cryptic "Decision" step) and the 3-field hero + assumptions
                chips already carry input-phase wayfinding. Post-run the rail
                stays: it's the jump-nav between the form sections and the
                Decision anchor while refining a live result. The chips keep
                using handleStepNavigate's mechanics either way. */}
            {!isInputPhase && (
              <AnalyzerStepRail
                steps={analyzerSteps}
                activeStepId={activeStep}
                onNavigate={handleStepNavigate}
                // Desktop-only (BROWSER-5, per the Verdict Ledger blueprint):
                // at 375px the five pills clipped mid-circle with no scroll
                // affordance. Sticky from sm: — on phones the bottom Run bar
                // anchors the flow anyway.
                className="hidden sm:sticky sm:top-2 sm:z-20 sm:block"
              />
            )}

            {/* DESKTOP COCKPIT (input phase, lg+ only) — two-column grid per
                the redesign blueprint §2: LEFT (3/5 ≈ 726px at max-w-7xl) =
                hero + receipt + assumptions strip + advanced region + Run;
                RIGHT (2/5) = the LiveVerdictPanel in a sticky container so
                the verdict forms in-view while typing. Below lg this wrapper
                is a plain block carrying the SAME space-y-5 the parent uses,
                so mobile stacking is byte-identical (the v4 space-y margin
                lands on the same visible boxes as before; the lg:col-* /
                lg:row-* classes on children are inert outside a grid parent).
                The grid classes are gated on isInputPhase: post-run the panel
                renders nothing, so the form snaps back to full width instead
                of leaving a dead 40% gutter. At lg the space-y margins double
                as the row gaps (no gap-y), which keeps trailing empty grid
                rows (advanced region closed → one unused row from the right
                rail's row-span) at exactly 0px tall. */}
            <div
              className={cn(
                "space-y-5",
                isInputPhase && "lg:grid lg:grid-cols-5 lg:gap-x-8"
              )}
            >
            {/* "What's your play?" strategy chips — demoted from a top-of-form
                card into the assumptions strip below (the "Analyzing as:" pill
                opens the same StrategyChips picker; behavior unchanged). */}

            {/* HERO CARD — "Analyze a deal" (Phase 4, hero unification).
                ONE bordered card wrapping the three core field groups with
                question-language group headers (the Three Questions graft):
                "Where's the deal?" (address + autocomplete + Autofill, with
                the inline listing-link toggle), "What does it cost?"
                (purchase price) and "What does it earn?" (beds + rent for
                SF, the MF units block for multi/house-hack). The EXISTING
                section mounts move inside unchanged — chrome="bare" only
                drops their own card chrome; registration, field ids and the
                #step-property / #step-income scroll anchors are untouched.
                The old standalone "Paste a listing link" card collapsed
                into ListingLinkInput inside the address group, and the
                property-type + template card moved into the assumptions
                strip's panel region below (#step-type). Year built is NOT
                here — it lives in the "Property extras" panel. */}
            {/* The card's internal title row ("Analyze a deal" + signpost)
                collapsed into the page heading above (Phase B, finding 3) —
                one headline, one signpost. aria-label keeps the landmark
                named for screen readers now that no heading lives inside. */}
            <section
              id="step-property"
              aria-label="Analyze a deal"
              className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm p-6 lg:col-span-3 lg:col-start-1"
            >
              <div className="space-y-6">
                <PropertyDetailsSection
                  form={form}
                  chrome="bare"
                  onAddressSelected={handleAddressSelected}
                  onAutofillFromAddress={handleAutofillFromAddress}
                  isAutofilling={isAutofilling}
                  // Show Autofill to anonymous users too — it's the clearest
                  // expression of the core promise. The handler already returns a
                  // graceful "Sign in to autofill" toast for signed-out users, so
                  // the button becomes a sign-in CTA instead of being hidden.
                  showAutofill={!autofillUnavailable}
                  // Year built is out of the hero for every mode (Phase 4) —
                  // it renders in the "Property extras" panel instead
                  // (#step-extras for SF, the #step-type panel for MF).
                  showYearBuilt={false}
                  priceLabel={activeStrategy?.priceLabel}
                  hideAddressInput={listingLinkOpen}
                  listingLinkSlot={
                    <ListingLinkInput
                      open={listingLinkOpen}
                      onOpenChange={setListingLinkOpen}
                      value={listingUrl}
                      onValueChange={(value) => {
                        setListingUrl(value);
                        setListingUrlError(false);
                      }}
                      hasError={listingUrlError}
                      onSubmit={handleListingUrl}
                    />
                  }
                  sampleSlot={
                    showEmptyStateSampleLine ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No address handy?{" "}
                        <button
                          type="button"
                          onClick={handleTrySampleDeal}
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          See a sample deal →
                        </button>
                      </p>
                    ) : undefined
                  }
                />

                {/* "What does it earn?" — single-family: only the two fields
                    a cash-flow run needs (bedrooms → HUD rent auto-fill,
                    rent → the math) on the first screen; bathrooms + square
                    feet stay optional in the "Property extras" panel below.
                    MF/house-hack: the units block, mount unchanged. */}
                <div id="step-income" className="scroll-mt-24">
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    What does it earn?
                  </p>
                  {propertyType === "single-family" && (
                    <SingleFamilyUnitSection
                      form={form}
                      chrome="bare"
                      fields="primary"
                      hideBedrooms={!!activeStrategy}
                      rentLabel={activeStrategy?.rentLabel}
                      strMode={activeStrategy?.incomeMode === "str"}
                    />
                  )}
                  {(propertyType === "multi-family" || propertyType === "owner-occupant") && (
                    <MultiFamilyUnitsSection
                      form={form}
                      isHouseHack={propertyType === "owner-occupant"}
                      fmrByBedrooms={unitFmrByBedrooms}
                      chrome="bare"
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Live instant-verdict preview (extracted to LiveVerdictPanel) —
                relocated from below the advanced block to directly under the
                income section, so the answer is the next thing on screen
                while the user types the three core fields. State (livePreview
                + the debounced SR message) stays here; the panel is purely
                presentational.
                COCKPIT (lg+): the outer div is the right-column grid item —
                it stretches across every left-column row (row-span-6) so the
                inner lg:sticky container has the full input area as its
                travel range (lg:top-24 clears the sticky h-16 site header).
                Below lg both wrappers are plain margin-less blocks: when the
                panel shows its card the wrapper occupies exactly the card's
                box (same space-y margin slot as before), and when the panel
                renders nothing they are empty zero-height blocks whose
                space-y margins collapse through — mobile spacing identical
                in every panel state, and no dead white rail at lg since the
                wrappers carry no chrome. */}
            <div className="lg:col-start-4 lg:col-span-2 lg:row-start-1 lg:row-span-6">
              <div className="lg:sticky lg:top-24">
                <LiveVerdictPanel
                  active={!showResults && !analysisResult && !isCalculating}
                  // Suppressed while a solve-oriented play is active — see
                  // showGenericLivePreview. The SR message is gated with it so
                  // screen readers never hear the contradictory verdict either.
                  livePreview={showGenericLivePreview ? livePreview : null}
                  livePreviewMsg={showGenericLivePreview ? livePreviewMsg : ""}
                />
              </div>
            </div>

            {/* Enrichment receipt - the durable one-line record of what
                enrichment / template auto-apply filled (toasts retained).
                Same input-phase gate as the LiveVerdictPanel above.
                The wrapper div exists only to place the component in the
                cockpit's left column at lg (the component takes no
                className); below lg it is margin-transparent — see the
                cockpit note above. */}
            {/* empty:hidden — when the receipt renders null (fresh form),
                grid items don't margin-collapse, so this wrapper's space-y
                margin created a 20px phantom row at lg (verifier-measured
                40px hero→strip gap vs the uniform 20px rhythm). */}
            <div className="empty:hidden lg:col-span-3 lg:col-start-1">
              <EnrichmentReceipt
                form={form}
                active={!showResults && !analysisResult && !isCalculating}
                getCapture={getEnrichmentCapture}
                templateOptions={templateOptions}
                savedTemplateFallback={savedTemplateFallback}
                hasActiveStrategy={Boolean(activeStrategy)}
              />
            </div>

            {/* Assumptions strip - replaces the "Improve accuracy (optional)"
                toggle button as the entry point to the advanced region. The
                chips state each pre-answered value with its source; tapping
                one opens the SAME mounted-but-hidden block below and scrolls
                to its #step-* anchor (handleStepNavigate mechanics). The
                progressive-disclosure contract is unchanged: financing +
                operating expenses stay MOUNTED (hidden via CSS, not
                unmounted) so address auto-fill still writes rate/tax into
                them and their values are included on submit; the remembered
                open/closed choice and the one-time auto-open after the first
                result both keep working on the same advancedOpen state. */}
            <div className="lg:col-span-3 lg:col-start-1">
            <AssumptionsStrip
              form={form}
              getProvenance={getLiveProvenance}
              advancedOpen={advancedOpen}
              onNavigate={handleChipNavigate}
              onHideDetails={toggleAdvanced}
              activeStrategyKey={activeStrategyKey}
              onSelectStrategy={handleSelectStrategy}
              // The play's starter-written field set + label, so chips over
              // strategy-set values badge as the play's defaults instead of
              // "yours" (BROWSER-2). Read fresh each render — the strip
              // re-renders on every strategy pick and form write.
              strategyApplied={strategyAppliedRef.current}
              templateOptions={templateOptions}
              savedTemplateFallback={savedTemplateFallback}
              footer={
                <SaveAsDefaultsChip
                  form={form}
                  enabled={Boolean(isAuthenticated)}
                  currentDefaults={userAnalysisDefaults}
                />
              }
            />
            </div>
            <div
              id="advanced-options"
              className={cn(
                "space-y-5 lg:col-span-3 lg:col-start-1",
                advancedOpen ? "block" : "hidden"
              )}
            >
              {/* "Property type & template" panel — the PropertyTypeSection
                  mount moved from above the hero into the strip's panel
                  region (Phase 4; deferred from Phase 3). Same component,
                  same props, new location: the template chip and the MF
                  "Property extras" chip land here via
                  handleChipNavigate("property") → #step-type. Kept MOUNTED
                  while hidden (the advanced block's proven CSS-hide
                  pattern) so template loading + auto-apply behave exactly
                  as before. For MF/house-hack the relocated Year Built
                  block leads the panel (compact card first, so the extras
                  chip's tap lands on a visible year-built input); SF
                  year-built lives in #step-extras below instead. */}
              {!activeStrategy && (
                <div id="step-type" className="scroll-mt-24 space-y-5">
                  {(propertyType === "multi-family" || propertyType === "owner-occupant") && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">Property extras</span>
                        <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
                      </div>
                      <YearBuiltField form={form} />
                    </div>
                  )}
                  <PropertyTypeSection
                    form={form}
                    savedTemplateFallback={savedTemplateFallback}
                    onTemplatesLoaded={handleTemplatesLoaded}
                    onExplicitTemplateChange={handleExplicitTemplateChange}
                  />
                </div>
              )}
              <div id="step-financing" className="scroll-mt-24">
                <FinancingSection form={form} />
              </div>
              <div id="step-expenses" className="scroll-mt-24">
                <OperatingExpensesSection form={form} purchasePrice={purchasePrice} />
                {/* SaveAsDefaultsChip moved to the assumptions-strip footer
                    (Phase 3) — same component, same props, new mount. */}
              </div>
              {/* Optional single-family details (year built + bathrooms +
                  square feet) — kept mounted so values persist + submit even
                  while hidden. Rendered LAST inside the accuracy block:
                  these are reference-only fields (calc-analysis never reads
                  them), so the levers that actually move the verdict —
                  financing + expenses — lead the refine pass (CL-3). The
                  #step-extras id is the "Property extras" chip's scroll
                  anchor. Year built moved here from the hero (Phase 4) via
                  the extraFields slot — same block, one rendered instance,
                  hidden in strategy mode exactly as showYearBuilt was. */}
              {propertyType === "single-family" && (
                <div id="step-extras" className="scroll-mt-24">
                  <SingleFamilyUnitSection
                    form={form}
                    fields="secondary"
                    extraFields={!activeStrategy ? <YearBuiltField form={form} /> : undefined}
                  />
                </div>
              )}
            </div>

            {/* Calculate button - solid brand color (gradient was too
                visually heavy and competed with the verdict card
                downstream). Copy standardized to "Run analysis" to
                match the homepage "Run a deal - 60 seconds" register. */}
            <Button
              type="submit"
              disabled={isCalculating}
              data-inform-submit="true"
              className={cn(
                "w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/95",
                "lg:col-span-3 lg:col-start-1"
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
            <div className="hidden sm:flex items-center justify-between gap-3 text-[11px] text-muted-foreground lg:col-span-3 lg:col-start-1">
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
            {/* end DESKTOP COCKPIT grid wrapper */}
          </div>
          {/* Mobile sticky bottom Calculate bar. Inside the form so its
              type="submit" triggers the same onSubmit handler the
              in-form button does. Appears once the user scrolls past
              ~600px so we never double up on the visible Calculate
              button. */}
          <StickyCalculateBar
            isCalculating={isCalculating}
            hasResults={analysisResult !== null}
            // Verdict dock readout: only pre-results (same gate as the
            // in-form LiveVerdictPanel), and suppressed while a solve-
            // oriented play is active (showGenericLivePreview). Once a real
            // run lands, the bar renders exactly as before this prop existed.
            livePreview={
              !showResults && !analysisResult && !isCalculating && showGenericLivePreview
                ? livePreview
                : null
            }
          />
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
            {/* Stale-results signal (STALE-RESULTS-NO-RERUN-SIGNAL): the live
                recompute keeps the last good numbers on screen while a form
                field is mid-edit; if the form is left unparseable this slim,
                non-blocking amber strip says so — with a jump straight to the
                first invalid field. Disappears the moment the form parses
                again (the recompute clears the flag). */}
            {analysisResult && !isCalculating && staleResultsWarning ? (
              <div
                role="status"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm shadow-sm"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <p className="min-w-0 flex-1 text-foreground">
                  These numbers reflect your last complete entry — finish the
                  highlighted field to update them.
                </p>
                <button
                  type="button"
                  onClick={handleJumpToFirstInvalidField}
                  className="shrink-0 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-muted"
                >
                  Go to field
                </button>
              </div>
            ) : null}
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
            <AnalysisErrorBoundary result={analysisResult}>
            <AnalysisDashboard
              result={analysisResult}
              // "Where these numbers came from" ledger row (redesign P5
              // follow-up): the results-side assumptions strip demotes from
              // a standalone card above the dashboard into a quiet row —
              // provenance stays truthful (P1-8), chrome="bare" avoids the
              // card-in-card seam inside the row.
              assumptionsSlot={
                analysisResult && !isCalculating ? (
                  <AssumptionsSourceStrip
                    chrome="bare"
                    onEdit={handleEditAssumptions}
                    provenance={buildProvenanceInput(enrichmentCaptureRef.current, form.getValues())}
                    // Shared helper (same predicate the input-side strip
                    // uses), excluding fields the active play's starter set
                    // wrote: strategy writes are dirty on purpose, but they
                    // are the PLAY's defaults, not user edits — claiming
                    // "yours" here was a provenance lie (BROWSER-2).
                    expensesEdited={computeExpensesEdited(
                      form.formState.dirtyFields as Record<string, unknown>,
                      computeStrategyOwnedFields(
                        strategyAppliedRef.current,
                        form.getValues() as unknown as Record<string, unknown>
                      )
                    )}
                  />
                ) : null
              }
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
              onAnalyzeAnotherLikeThis={handleAnalyzeAnotherLikeThis}
              onApplyComps={handleApplyComps}
              onApplyRehab={handleApplyRehab}
              currentRehabBudget={form.watch("rehabBudget") ?? null}
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
              isSampleProPreview={isSampleProPreview}
              dealQaEnabled={dealQaEnabled}
              activeTab={activeDashboardTab}
              activeTabNonce={activeTabNonce}
              activeStrategy={activeStrategy}
              saveDealLimitReached={currentSaveDealLimitReached}
              savedDealCount={savedDealCount}
              savedDealLimit={savedDealLimit}
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
      {/* Duplicate-address chooser - opens when saving an address that's
          already in saved deals: overwrite it, keep both, or cancel. */}
      <DuplicateAddressDialog
        open={duplicateCollision !== null}
        onOpenChange={(next) => {
          if (!next) setDuplicateCollision(null);
        }}
        existingTitle={duplicateCollision?.existingTitle}
        busyChoice={duplicateChoiceBusy}
        onUpdateExisting={() => void handleDuplicateChoice("update")}
        onSaveAsScenario={() => void handleDuplicateChoice("scenario")}
      />
      {/* Address-changed chooser - opens when Save targets a loaded saved
          deal whose address no longer matches the form (same pattern as the
          duplicate-address chooser above): save the current inputs as a new
          deal, move the saved deal to the new address, or cancel. */}
      <Dialog
        open={addressChangedPrompt !== null}
        onOpenChange={(next) => {
          // Don't let backdrop/Esc close the dialog mid-save.
          if (!next && addressChangedChoiceBusy === null) setAddressChangedPrompt(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>The address changed</DialogTitle>
            <DialogDescription>
              {addressChangedPrompt?.existingTitle
                ? `Your current inputs use a different address than “${addressChangedPrompt.existingTitle}”.`
                : "Your current inputs use a different address than the saved deal you loaded."}{" "}
              Save them as their own deal, or move the saved deal to the new address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Save as new - the most common intent (screening the next
                property on top of a loaded deal), so it's listed first. */}
            <button
              type="button"
              onClick={() => void handleAddressChangedChoice("new")}
              disabled={addressChangedChoiceBusy !== null}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <CopyPlus className="size-4 text-primary" />
                  Save as a new deal
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Keep the saved deal as it is and save your current inputs as a
                  separate deal for the new address.
                </p>
              </div>
              {addressChangedChoiceBusy === "new" ? (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
            </button>

            {/* Move the saved deal - e.g. an address typo fix or a re-pick
                whose formatting differs from the stored string. */}
            <button
              type="button"
              onClick={() => void handleAddressChangedChoice("update-address")}
              disabled={addressChangedChoiceBusy !== null}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <PencilLine className="size-4 text-muted-foreground" />
                  Update this deal&rsquo;s address
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Update the saved deal with your current inputs, new address
                  included. Its notes, comps, and share links stay attached.
                </p>
              </div>
              {addressChangedChoiceBusy === "update-address" ? (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
            </button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={addressChangedChoiceBusy !== null}
              onClick={() => setAddressChangedPrompt(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
