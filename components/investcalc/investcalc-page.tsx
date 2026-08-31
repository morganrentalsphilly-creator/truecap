"use client";

/* eslint-disable react-hooks/refs, react-hooks/immutability, react-hooks/preserve-manual-memoization -- This legacy, hook-dense calculator intentionally uses refs as async workflow guards. React Compiler is not enabled for the app; keep rules-of-hooks and exhaustive-deps active while the component is incrementally decomposed. */

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
  ChevronDown,
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
  previewParse,
  InvestmentFormValues,
  defaultValues,
  describeInvestmentFormSnapshotIssue,
  getDefaultUnitsForPropertyType,
  isValidRentalUnit,
  PROPERTY_TYPES,
  STRATEGY_MODEL_INPUT_FIELDS,
  type StrategyInputErrors,
  type StrategyInputField,
  type StrategyInputs,
} from "@/lib/investcalc-schema";
import { isAllCashDownPayment } from "@/lib/financing-classification";
import { formatDscr } from "@/lib/financial-presentation";
import { buildRepeatDealDraft } from "@/lib/repeat-deal-draft";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormDraft,
  normalizeReleasedInvestmentFormSnapshot,
  releasedInvestmentFormSchema,
} from "@/lib/underwriting-model-release";
import {
  calculateAnalysis,
  mortgageInsuranceRunsToPayoff,
  AnalysisResult,
} from "@/lib/calc-analysis";
import { getDealTier } from "@/lib/verdict";
import { PropertyTypeSection } from "./property-type-section";
import {
  PropertyDetailsSection,
  YearBuiltField,
} from "./property-details-section";
import { SingleFamilyUnitSection } from "./single-family-unit-section";
import { MultiFamilyUnitsSection } from "./multi-family-units-section";
import { ListingLinkInput } from "./listing-link-input";
import { PreRunCriteriaEditor } from "./pre-run-criteria-editor";
import { FinancingSection } from "./financing-section";
import { OperatingExpensesSection } from "./operating-expenses-section";
import { BuyAndHoldAssumptionsSection } from "./buy-and-hold-assumptions-section";
import { SaveAsDefaultsChip } from "./save-as-defaults-chip";
import {
  DEFAULT_STRATEGY_KEY,
  StrategyChips,
  type StrategyAssumptionMode,
  type StrategyStarterPreview,
} from "./strategy-chips";
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
import {
  STARTER_TEMPLATES,
  type StarterTemplate,
} from "@/lib/starter-templates";
import {
  buildTemplateFormPatch,
  type TemplateFormPatchEntry,
} from "@/lib/template-form-patch";
import {
  autofillPropertyIdentity,
  decideAutofillFieldWrite,
  isSameAutofillProperty,
  normalizeAutofillPropertyAddress,
} from "@/lib/autofill-field-ownership";
import {
  unitRentRollFingerprint,
  unitRentRollWasOverridden,
} from "@/lib/unit-rent-provenance";
import type { AnalysisTemplateOption } from "@/app/actions/analysis-templates";
import {
  canChoosePropertyTypeForStrategy,
  getStrategyByKey,
  getUnderwritingHeading,
} from "@/lib/investor-strategies";
import {
  DRAFT_ANALYZER_STRATEGY_FIELD,
  activeStrategyStateKey,
  normalizeAnalyzerStrategyKey,
  persistedAnalyzerStrategyKey,
  readDraftAnalyzerStrategyKey,
  resolveCompatibleAnalyzerStrategyKey,
  type AnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import {
  isSpecialistAnalyzerStrategyKey,
  readRecordedSpecialistAnalysisSnapshot,
  type SpecialistAnalysisSnapshot,
} from "@/lib/specialist-analysis-snapshot";
import { AnalyzerStepRail } from "./analyzer-step-rail";
import {
  computeAnalyzerSteps,
  isAnalyzerStepId,
  type AnalyzerStepId,
} from "@/lib/analyzer-steps";
import {
  ANALYZER_STRATEGY_EVENT,
  isReleasedHandoffStrategy,
  consumeAnalyzerHandoff,
  type AnalyzerStrategyEventDetail,
} from "@/lib/analyzer-handoff";
import { StickyCalculateBar } from "./sticky-calculate-bar";
import {
  LiveVerdictPanel,
  type LivePreviewSnapshot,
} from "./live-verdict-panel";
import { AutosaveIndicator } from "./autosave-indicator";
import type { AnalysisDashboardTab } from "./analysis-dashboard";
import { AnalysisDashboardSkeleton } from "./analysis-dashboard-skeleton";
import { AnalysisErrorBoundary } from "@/components/investcalc/analysis-error-boundary";
import {
  TestimonialPrompt,
  dispatchProofMoment,
} from "@/components/marketing/testimonial-prompt";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useActionConfirm } from "@/components/ui/action-confirm-dialog";
import { ToastAction } from "@/components/ui/toast";
import { cn, scrollBehavior } from "@/lib/utils";
import {
  NEW_ANALYSIS_REQUEST_EVENT,
  shouldStartFreshAnalysis,
} from "@/lib/new-analysis-navigation";
import {
  saveDealAction,
  type GetSavedDealForEditingResult,
} from "@/app/actions/saved-analyses";
import { parseSavedAnalysisRevision } from "@/lib/saved-analysis-concurrency";
import {
  buildDataConfidence,
  type EnrichmentProvenanceInput,
} from "@/lib/data-confidence";
import {
  buildInputConfidence,
  formatPurchasePriceSourceLabel,
  inputConfidenceKeyForFormField,
  inputVerificationFingerprint,
  mergeInputConfidenceSourceContext,
  normalizePurchasePriceSourceContext,
  normalizeInputVerificationEvidence,
  restoreInputConfidenceSourceContext,
  type InputConfidenceFieldKey,
  type InputConfidenceSourceContext,
  type InputVerificationEvidence,
  type PurchasePriceSourceContext,
  type StartingAssumptionOrigin,
} from "@/lib/input-confidence";
import {
  buildAssumptionLedger,
  buildDecisionTargetContext,
  userDecisionFromPipelineStage,
} from "@/lib/decision-contract";
import type { ReportMode } from "@/lib/pdf-export-constants";
import { cacheSavedAnalysisPdfExport } from "@/lib/pdf/saved-analysis-cache";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { selectUnderwritingEnrichment } from "@/lib/property-enrichment/underwriting-adoption";
import { addDealToCompareAction } from "@/app/actions/compare";
import {
  getDealScoreAction,
  type DealScoreActionResult,
} from "@/app/actions/deal-score";
import { consumeProductEvaluationUsageAction } from "@/app/actions/product-evaluation";
import { claimAnonymousDecisionAction } from "@/app/actions/anonymous-decision";
import {
  anonymousDecisionPresentationGrantMatches,
  bindAnonymousDecisionPresentationGrant,
} from "@/lib/anonymous-decision-presentation";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  clearPendingMaoTarget,
  isMaoTargetDirty,
  maoTargetAnalysisFingerprint,
  maoTargetFingerprint,
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
  readPendingMaoTarget,
  readPendingMaoTargetBinding,
  writePendingMaoTarget,
} from "@/lib/mao-target-editor";
import {
  isFeatureEnabled,
  isSpecialistStrategyEnabled,
} from "@/lib/feature-flags";
import { isFeatureReleased } from "@/lib/entitlements-catalog";
import {
  financingProfileAgeBand,
  financingProfileAnalysisPatch,
  normalizeFinancingProfileSnapshot,
  type FinancingProfileSnapshot,
} from "@/lib/financing-profiles";
import {
  isLegacySavedMethodologyVersion,
  parseFrozenDealScore,
  resolveSavedAnalysisResult,
} from "@/lib/saved-analysis-methodology";
import {
  invalidateRecordedOfferCeilingForTargetEdit,
  readRecordedOfferCeiling,
  type RecordedOfferCeilingViewState,
} from "@/lib/recorded-offer-ceiling";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { getLimitingFactor } from "@/lib/limiting-factor";
import { verifyOneTimePdfPaymentAction } from "@/app/actions/one-time-pdf";
import {
  ONE_TIME_PDF_ACTIVE_CLAIM_KEY,
  ONE_TIME_PDF_DRAFT_KEY,
  ONE_TIME_PDF_LEGACY_DRAFT_KEY,
  ONE_TIME_PDF_RETURN_KEY,
  oneTimePdfClaimSecretKey,
  parseOneTimePdfClaimSecret,
  parseOneTimePdfReturnState,
} from "@/lib/one-time-pdf-return";
import { parseOneTimePdfDraft } from "@/lib/one-time-pdf-report-binding";
import type { DuplicateAddressChoice } from "@/components/investcalc/duplicate-address-dialog";
import {
  isTrueCapSyntheticSampleAddress,
  sampleProPreviewAddsCapability,
  SAMPLE_DEAL_FIXTURE,
} from "@/lib/sample-deal";
import { estimatePurchasePrice } from "@/lib/estimate-price";
import { parseListingUrl } from "@/lib/listing-url";
import { parseAddressLocation } from "@/lib/parse-address";
import {
  getListingImportMissingFields,
  HERO_ANALYZE_EVENT,
  HERO_ANALYZE_STATUS_EVENT,
  HERO_ANALYZE_STORAGE_KEY,
  type HeroAnalyzeDetail,
  type HeroAnalyzeStatusDetail,
} from "@/lib/hero-handoff";

import { enrichPropertyAction } from "@/app/actions/enrich-property";
import { getPropertyCompsAction } from "@/app/actions/property-comps";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  boxesForPersonalAnalyzerStrategy,
  buyBoxMatchesPropertyScope,
  buyBoxHasCriteria,
  deriveStateFromAddress,
  summarizeBuyBoxCriteria,
  type NamedBuyBox,
} from "@/lib/buy-box";
import {
  captureBuyBoxDecisionBasis,
  captureSelectedTargetsDecisionBasis,
  captureStarterCriteriaDecisionBasis,
  normalizeOfferCeilingDecisionBasis,
  OFFER_CEILING_DECISION_BASIS_FIELD,
  type OfferCeilingDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";
import {
  buildMaoTarget,
  chooseMaoTargetFromBuyBox,
  describeMaoTarget,
} from "@/lib/mao-targets";
import type { SelectedAddress } from "./address-autocomplete";
import type {
  TenYearProjectionInput,
  ProjectionYear,
} from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioInput,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import { trackConversion } from "@/lib/analytics/track-conversion";
import { trackEvent } from "@/lib/analytics";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import {
  analysisRunPromisesOfferCeiling,
  getAnalyzerCta,
} from "@/lib/analyzer-cta";
import { analysisDateForExplicitV1Run } from "@/lib/analysis-date";
import {
  clearPendingSaveIntent,
  hasPendingSaveIntent,
  pendingSaveIntentMatchesDraft,
  setPendingSaveIntent,
} from "@/lib/save-intent";
import {
  parseShareAuthIntent,
  SHARE_AUTH_INTENT_STORAGE_KEY,
} from "@/lib/share-auth-intent";
import dynamic from "next/dynamic";

// Dialogs below are opened only after explicit post-analysis actions. Keep
// their UI modules out of the anonymous landing bootstrap, but retain the
// complete server-rendered hero and pre-run analyzer form. Conditional mounts
// below are important: mounting a closed dynamic dialog would still request
// its chunk during hydration.
const PdfPurchaseDialog = dynamic(
  () =>
    import("@/components/investcalc/pdf-purchase-dialog").then(
      (module) => module.PdfPurchaseDialog,
    ),
  { ssr: false },
);
const DuplicateAddressDialog = dynamic(
  () =>
    import("@/components/investcalc/duplicate-address-dialog").then(
      (module) => module.DuplicateAddressDialog,
    ),
  { ssr: false },
);

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
  },
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

function reportHeroAnalyzeStatus(detail: HeroAnalyzeStatusDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<HeroAnalyzeStatusDetail>(HERO_ANALYZE_STATUS_EVENT, {
      detail,
    }),
  );
}

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";
type AutofillField =
  | "bedrooms"
  | "bathrooms"
  | "sqft"
  | "purchasePrice"
  | "monthlyRent";
type AutofillConflict = {
  field: AutofillField;
  label: string;
  current: number;
  proposed: number;
  proposedLabel?: string;
  currency?: boolean;
};

/** Every field rendered inside OperatingExpensesSection's nested disclosure.
 * Validation must open both disclosure layers before it can focus one. */
const OPERATING_EXPENSE_FIELD_PATHS = new Set([
  "propertyTaxInputMode",
  "propertyTaxPct",
  "propertyTaxAnnual",
  "insuranceInputMode",
  "insurancePct",
  "insuranceMonthly",
  "hoaMonthly",
  "utilitiesMonthly",
  "vacancyPct",
  "mgmtPct",
  "maintenancePct",
  "capexPct",
  "expenseGrowthPct",
  "rentGrowthPct",
  "appreciationRatePct",
  "sellingCostPct",
  "buildingValuePct",
  "depreciationYears",
  "includeInterestDeduction",
  "taxRatePct",
]);
const INPUT_CONFIDENCE_FORM_FIELD: Record<InputConfidenceFieldKey, string> = {
  purchasePrice: "purchasePrice",
  yearBuilt: "yearBuilt",
  rent: "monthlyRent",
  propertyTax: "propertyTaxAmount",
  insurance: "insuranceAmount",
  interestRate: "interestRate",
  downPayment: "downPaymentPct",
  closingCosts: "closingCostsPct",
  maintenance: "maintenancePct",
  capex: "capexPct",
  vacancy: "vacancyPct",
  management: "mgmtPct",
  utilities: "utilitiesMonthly",
  hoa: "hoaMonthly",
  rehabBudget: "rehabBudget",
};
const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";
/** Must match SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY in open-saved-deal-in-analyzer.tsx. */
const SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY =
  "truecap_saved_analysis_duplicate_draft";
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
  allowLegacy: boolean,
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
      window.sessionStorage.getItem(baseKey) ??
      window.localStorage.getItem(baseKey);
    window.sessionStorage.removeItem(baseKey);
    window.localStorage.removeItem(baseKey);
    return legacy;
  } catch {
    return null;
  }
}

/** Keep the analyzer URL aligned with the deal currently attached to the form.
 * This makes a successful save/reopen refresh-safe and prevents New Analysis
 * from resurrecting the prior saved row on refresh. */
function replaceSavedDealUrl(savedDealId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (savedDealId) url.searchParams.set("savedDeal", savedDealId);
    else url.searchParams.delete("savedDeal");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  } catch {
    // URL durability is best-effort; the in-memory analysis remains usable.
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
const DRAFT_INPUT_CONFIDENCE_SOURCE_CONTEXT_FIELD =
  "__truecapInputConfidenceSourceContext";
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
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(CALC_FORM_DRAFT_KEY);
  } catch {
    return null;
  }
}

/** Safely write the draft. No-op if storage is unavailable / quota exceeded. */
function writeCalcDraftRaw(json: string): void {
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(CALC_FORM_DRAFT_KEY, json);
  } catch {
    /* private-mode Safari, quota exceeded, etc. - drafts are best-effort */
  }
}

/**
 * Persist an unsaved form draft and bind its active acquisition target to the
 * exact normalized draft that will be restored on reload. Keeping these writes
 * together is load-bearing for Duplicate / Analyze another: address, price,
 * and rent evolve after the fork, so a target fingerprint captured only once
 * against the initial blank draft no longer matches the restored form.
 */
function writeCalcDraftWithMaoTarget(
  values: unknown,
  targetInput: unknown,
  sourceInput?: unknown,
  strategyKeyInput?: unknown,
  inputConfidenceSourceContext?: InputConfidenceSourceContext | null,
  decisionBasisInput?: unknown,
): void {
  if (!isReleasedUnderwritingSnapshot(values)) return;
  try {
    // A target-only change can call this writer without rebuilding the input
    // confidence ledger. Preserve the already-bound ledger instead of
    // accidentally erasing provenance simply because no form field changed.
    let sourceContext = inputConfidenceSourceContext;
    let existingDecisionBasis: OfferCeilingDecisionBasis | null = null;
    if (sourceContext === undefined || decisionBasisInput === undefined) {
      const currentDraft = readCalcDraftRaw();
      if (currentDraft) {
        try {
          const parsed = JSON.parse(currentDraft) as Record<string, unknown>;
          const existing = parsed[DRAFT_INPUT_CONFIDENCE_SOURCE_CONTEXT_FIELD];
          if (
            sourceContext === undefined &&
            existing &&
            typeof existing === "object"
          ) {
            sourceContext = existing as InputConfidenceSourceContext;
          }
          if (decisionBasisInput === undefined) {
            existingDecisionBasis = normalizeOfferCeilingDecisionBasis(
              parsed[OFFER_CEILING_DECISION_BASIS_FIELD],
            );
          }
        } catch {
          /* malformed legacy draft — write the valid current form below */
        }
      }
    }
    // A draft may be intentionally incomplete while the user is still
    // configuring a specialist lens (for example STR before ADR is entered).
    // Preserve the explicit enum identity here; strict formula compatibility
    // is enforced only when a valid analysis is saved, shared, or rendered.
    const strategyKey = persistedAnalyzerStrategyKey(
      strategyKeyInput,
      values as { avgDailyRate?: unknown },
    );
    const decisionBasis =
      decisionBasisInput === undefined
        ? existingDecisionBasis
        : normalizeOfferCeilingDecisionBasis(decisionBasisInput);
    writeCalcDraftRaw(
      JSON.stringify({
        ...(values as Record<string, unknown>),
        [DRAFT_ANALYZER_STRATEGY_FIELD]: strategyKey,
        ...(sourceContext
          ? {
              [DRAFT_INPUT_CONFIDENCE_SOURCE_CONTEXT_FIELD]: sourceContext,
            }
          : {}),
        ...(decisionBasis
          ? { [OFFER_CEILING_DECISION_BASIS_FIELD]: decisionBasis }
          : {}),
      }),
    );
  } catch {
    // Form values should be JSON-safe, but a draft is best-effort and must
    // never interrupt the calculator if a future field is not serializable.
    return;
  }

  const target = normalizeMaoTarget(targetInput);
  const normalizedDraft = normalizeReleasedInvestmentFormDraft(values);
  const analysisFingerprint = maoTargetAnalysisFingerprint(
    normalizedDraft ?? values,
  );
  const source = normalizeOfferCeilingTargetSource(sourceInput);
  if (target && analysisFingerprint) {
    writePendingMaoTarget(target, { analysisFingerprint, source });
  } else {
    clearPendingMaoTarget();
  }
}

/** Safely remove the draft. */
function clearCalcDraftRaw(): void {
  try {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(CALC_FORM_DRAFT_KEY);
  } catch {
    /* no-op */
  }
}

function restoreDecisionBasisBinding(input: {
  basis: unknown;
  target: MaoTarget | null;
  source: unknown;
  strategyKey: AnalyzerStrategyKey;
}): {
  basis: OfferCeilingDecisionBasis | null;
  source: OfferCeilingTargetSource | null;
  needsReview: boolean;
} {
  if (!input.target) return { basis: null, source: null, needsReview: false };
  const source = normalizeOfferCeilingTargetSource(input.source);
  const basis = normalizeOfferCeilingDecisionBasis(input.basis, {
    target: input.target,
    ...(source ? { source } : {}),
    strategyKey: input.strategyKey,
  });
  if (basis) return { basis, source: basis.source, needsReview: false };
  // Legacy snapshots recorded only a numeric target and, sometimes, the word
  // "buy-box". That is copied criteria—not proof of a current profile.
  return { basis: null, source: "selected-targets", needsReview: true };
}

function captureNonBuyBoxDecisionBasis(input: {
  source: Exclude<OfferCeilingTargetSource, "buy-box" | "screening-defaults">;
  target: MaoTarget;
  strategyKey: AnalyzerStrategyKey;
}): OfferCeilingDecisionBasis {
  return input.source === "starter-criteria"
    ? captureStarterCriteriaDecisionBasis(input)
    : captureSelectedTargetsDecisionBasis(input);
}

/**
 * Map a user-defaults payload (from user_analysis_defaults.preferences)
 * onto the form's field shape. The user-defaults schema uses
 * `interestRatePct` while the form schema uses `interestRate` - handle
 * that here so callers don't have to know about the mismatch. Returns
 * a sparse object; only keys with finite numeric values are written.
 */
function mapUserDefaultsToForm(
  userDefaults: Record<string, number> | null | undefined,
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

/** Reconstruct only the value-bound source label for a restored strategy.
 * The saved form remains the source of truth: this never reapplies starter
 * values, and ownership drops automatically if any current value differs. */
function buildStrategyAppliedSnapshot(
  strategyKey: string | null | undefined,
): StrategyAppliedSnapshot | null {
  const strategy = getStrategyByKey(strategyKey);
  if (!strategy) return null;
  const starter = STARTER_TEMPLATES.find(
    (candidate) => candidate.key === strategy.starterKey,
  );
  if (!starter) return null;
  return {
    label:
      strategy.key === "wholesale-mao"
        ? "Wholesale / Offer Ceiling"
        : strategy.label,
    fields: Object.fromEntries(
      buildTemplateFormPatch(starter.template).map(({ field, value }) => [
        field,
        value,
      ]),
    ),
  };
}

function buildNewAnalysisDefaults(
  propertyType: InvestmentFormValues["propertyType"],
  userDefaults?: Record<string, number> | null,
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
      allowZeroRent:
        values.propertyType === "owner-occupant" && !!unit.isOwnerOccupied,
    }),
  );
  const candidate: InvestmentFormValues = { ...values, units: sanitizedUnits };
  const parsed = releasedInvestmentFormSchema.safeParse(candidate);
  return parsed.success ? JSON.stringify(parsed.data) : null;
}

const INPUT_TABS: {
  id: InputTab;
  label: string;
  mobileLabel: string;
  isPro: boolean;
  isFree?: boolean;
}[] = [
  {
    id: "cash-flow",
    label: "Cash Flow Analysis",
    mobileLabel: "Cash Flow",
    isPro: false,
    isFree: true,
  },
  {
    id: "projections",
    label: "10-Year Projections",
    mobileLabel: "10-Year",
    isPro: true,
  },
  {
    id: "tax-strategy",
    label: "Illustrative Tax Impact",
    mobileLabel: "Tax",
    isPro: true,
  },
  {
    id: "deal-score",
    label: "Screening Index",
    mobileLabel: "Index",
    isPro: true,
  },
];
const RELEASED_INPUT_TABS = INPUT_TABS.filter(
  (tab) => tab.id !== "tax-strategy" || isFeatureReleased("tax_strategy"),
);
const SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY =
  "truecap_saved_analysis_auto_export_pdf";

/** What enrich-property filled, captured so we can attribute data confidence
 *  at save time (and live on the result screen). */
type EnrichmentCapture = {
  monthlyRent?: {
    source: "hud-fmr" | "hud-safmr" | "rentcast-estimate";
    detail?: string;
    fetchedAt?: string;
    /** Scalar single-family capture. */
    value?: number;
    /** Exact property-model / bedroom / rent binding for HUD fills. */
    rentFingerprint?: string;
    /** Once a later fill observes that the captured roll was edited, do not
     * silently re-attribute the edited roll merely because another empty unit
     * was subsequently filled from HUD. */
    invalidated?: boolean;
  };
  interestRate?: { source: "fred"; fetchedAt?: string; value: number };
};

function provNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function compactPercent(value: unknown): string | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : null;
}

/** Build the provenance payload from captured enrichment + current values,
 *  flagging a field "overridden" when the user changed it after auto-fill. */
function buildProvenanceInput(
  capture: EnrichmentCapture,
  values: InvestmentFormValues,
): EnrichmentProvenanceInput {
  const approxEq = (a: number | null, b: number | null) =>
    a != null &&
    b != null &&
    Math.abs(a - b) <= 0.005 * Math.max(1, Math.abs(b));
  const out: EnrichmentProvenanceInput = {};
  if (capture.interestRate) {
    out.interestRate = {
      source: "fred",
      fetchedAt: capture.interestRate.fetchedAt,
      overridden: !approxEq(
        provNum(values.interestRate),
        capture.interestRate.value,
      ),
    };
  }
  if (capture.monthlyRent) {
    const rentOverridden = capture.monthlyRent.rentFingerprint
      ? unitRentRollWasOverridden({
          capturedFingerprint: capture.monthlyRent.rentFingerprint,
          invalidated: capture.monthlyRent.invalidated,
          values,
        })
      : !approxEq(
          provNum(values.monthlyRent),
          provNum(capture.monthlyRent.value),
        );
    out.monthlyRent = {
      source: capture.monthlyRent.source,
      detail: capture.monthlyRent.detail,
      fetchedAt: capture.monthlyRent.fetchedAt,
      overridden: rentOverridden,
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
  advocacyContractEligible = false,
  initialSavedDeal = null,
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
  /** Server-derived internal rollout eligibility. This is not an entitlement
   * and must remain false for anonymous/public renders. */
  advocacyContractEligible?: boolean;
  /** Owner-scoped saved row resolved by the authenticated server route from
   * /?savedDeal=<id>. Keeping the ID in the URL makes reopen refresh-safe. */
  initialSavedDeal?: GetSavedDealForEditingResult | null;
}) {
  const router = useRouter();
  const { confirmDialog } = useActionConfirm();
  const advocacyDecisionContract =
    advocacyContractEligible && isFeatureEnabled("advocacy_decision_contract");
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("cash-flow");
  const [activeDashboardTab, setActiveDashboardTab] =
    useState<AnalysisDashboardTab>("cash-flow");
  // Bumped on every point-at-tab intent so the ledger reopens a row the
  // user closed even when the TAB VALUE is unchanged (a same-value
  // setState bails and the dashboard's effect would never fire).
  const [activeTabNonce, setActiveTabNonce] = useState(0);
  const pointDashboardAt = useCallback((tab: AnalysisDashboardTab) => {
    setActiveDashboardTab(tab);
    setActiveTabNonce((n) => n + 1);
  }, []);
  // Active investor-strategy chip ("What's your play?"). null = default full flow.
  const [activeStrategyKey, setActiveStrategyKey] = useState<string | null>(
    null,
  );
  const activeStrategyKeyRef = useRef<string | null>(null);
  const currentAnalyzerStrategyKey = (): AnalyzerStrategyKey => {
    const normalized =
      normalizeAnalyzerStrategyKey(activeStrategyKeyRef.current) ?? "buy-hold";
    return isSpecialistStrategyEnabled(normalized) ? normalized : "buy-hold";
  };
  useEffect(() => {
    activeStrategyKeyRef.current = activeStrategyKey;
  }, [activeStrategyKey]);
  // Preserve a historical strategy key for snapshot compatibility, but never
  // expose a dark specialist workflow through the live analyzer.
  const visibleActiveStrategyKey = isSpecialistStrategyEnabled(
    activeStrategyKey,
  )
    ? activeStrategyKey
    : null;
  const activeStrategy = getStrategyByKey(visibleActiveStrategyKey);
  const canChoosePropertyType = canChoosePropertyTypeForStrategy(
    visibleActiveStrategyKey,
  );
  const underwritingHeading = getUnderwritingHeading(visibleActiveStrategyKey);
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
  // play's framing ("we'll reverse-solve your Offer Ceiling" next to a NEGATIVE
  // buy-box readout). The post-run hero already suppresses that verdict via
  // strategyLeadsOutput (analysis-dashboard) — apply the same rule to the
  // in-form LiveVerdictPanel and the sticky dock readout pre-run.
  const showGenericLivePreview =
    !activeStrategy || activeStrategy.primaryTab === "cash-flow";
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  // The exact form values that produced `analysisResult`. The results
  // dashboard reads from this (not a live form.getValues() snapshot) so the
  // headline metrics and the derived cards (Offer Ceiling, Sensitivity, etc.) are
  // always computed from the SAME inputs — never a mix of frozen result +
  // live form state. Updated everywhere `analysisResult` is set.
  const [analysisValues, setAnalysisValues] =
    useState<InvestmentFormValues | null>(null);
  const [savedMethodologyLabel, setSavedMethodologyLabel] = useState<
    string | null
  >(null);
  const [recordedOfferCeiling, setRecordedOfferCeiling] =
    useState<RecordedOfferCeilingViewState>(null);
  // null = live/current strategy math; a snapshot = exact historical
  // specialist output; "unavailable" = recorded BRRRR/flip lens whose legacy
  // or malformed row cannot be safely recomputed in place.
  const [recordedSpecialistAnalysis, setRecordedSpecialistAnalysis] = useState<
    SpecialistAnalysisSnapshot | "unavailable" | null
  >(null);
  const [inputVerification, setInputVerification] =
    useState<InputVerificationEvidence>({});
  const [appliedFinancingProfile, setAppliedFinancingProfile] =
    useState<FinancingProfileSnapshot | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isEditingAssumptions, setIsEditingAssumptions] = useState(false);
  const [pendingVerificationFocusKey, setPendingVerificationFocusKey] =
    useState<InputConfidenceFieldKey | null>(null);
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
  const [marketRentEstimate, setMarketRentEstimate] = useState<number | null>(
    null,
  );
  // Multi-family sibling of marketRentEstimate: HUD FMR keyed by bedroom
  // count, for the per-unit rent reality-check in the units section. Same
  // rules: captured on enrichment, never blocks analysis, cleared on a new
  // address, silent on failure.
  const [unitFmrByBedrooms, setUnitFmrByBedrooms] = useState<Record<
    number,
    number
  > | null>(null);
  // Typed by the panel's exported snapshot shape so the two can't drift
  // (the inline duplicate did exactly that when breakEvenPrice was added).
  const [livePreview, setLivePreview] = useState<LivePreviewSnapshot | null>(
    null,
  );
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
        `Live underwriting preview: cash flow ${cf}, cap rate ${lp.capRate.toFixed(1)}%${dscr}. Review all assumptions before relying on this preliminary result.`,
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
  // Keyboard-hint modifier. Deterministic "⌘" for SSR/first paint (hydration
  // must match the server), swapped to "Ctrl" in an effect for the majority
  // non-Mac audience — the handler has always accepted both metaKey and
  // ctrlKey; only the advertised key was Mac-only.
  const [kbdModifier, setKbdModifier] = useState("⌘");
  useEffect(() => {
    if (!/Mac|iP(hone|ad|od)/.test(navigator.platform ?? "")) {
      setKbdModifier("Ctrl");
    }
  }, []);
  // The mount bootstrap can restore a draft/saved deal or intentionally
  // reset to a fresh form. Keep the server-rendered controls inert until that
  // one-time reconciliation has completed, so a fast user on a slow device
  // cannot type into SSR inputs and then lose those keystrokes to form.reset.
  const [isCalculatorReady, setIsCalculatorReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      setIsCalculatorReady(true),
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const [estimatedPriceValue, setEstimatedPriceValue] = useState<number | null>(
    null,
  );
  const [priceEstimateBasis, setPriceEstimateBasis] = useState<string | null>(
    null,
  );
  const [purchasePriceSourceLabel, setPurchasePriceSourceLabel] = useState<
    string | null
  >(null);
  // Structured counterpart to the visible receipt. The price value and
  // normalized address are retained only in memory as invalidation guards;
  // the persisted Input Confidence context stores the provider metadata under
  // the purchase-price value fingerprint, never the property address.
  const purchasePriceSourceRef = useRef<PurchasePriceSourceContext | null>(
    null,
  );
  const purchasePriceProvenanceAddressRef = useRef<string | null>(null);
  const purchasePriceProvenanceValueRef = useRef<number | null>(null);
  const bindPurchasePriceProviderSource = useCallback(
    (
      source: PurchasePriceSourceContext,
      price: number,
      address: string | null | undefined,
    ) => {
      const normalized = normalizePurchasePriceSourceContext(source);
      if (!normalized) return;
      purchasePriceSourceRef.current = normalized;
      purchasePriceProvenanceAddressRef.current =
        normalizeAutofillPropertyAddress(address);
      purchasePriceProvenanceValueRef.current = price;
      setPurchasePriceSourceLabel(formatPurchasePriceSourceLabel(normalized));
    },
    [],
  );
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
  const [listingImportStatus, setListingImportStatus] = useState<{
    token: string;
    address: string;
    phase: "looking-up" | "needs-input";
  } | null>(null);
  // ── Progressive disclosure (financing + operating expenses) ──────────
  // Cold visitors start with just the basics (property type, address,
  // price, beds/rent); financing + operating expenses collapse behind a
  // toggle backed by smart defaults, so the first answer comes fast. The
  // sections stay MOUNTED (hidden via CSS) so address auto-fill still
  // writes into them and their values submit normally.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Operating expenses has a second disclosure inside the broader accuracy
  // region. Keep it controlled here so assumption chips and validation can
  // reveal the exact field instead of landing on another collapsed panel.
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false);
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
  const heroAnalyzeHandlerRef = useRef<(detail: HeroAnalyzeDetail) => void>(
    () => {},
  );
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
   * banner can identify which saved draft is ready. Captured at restore
   * time so it doesn't update if
   * the user edits the field afterwards.
   */
  const [restoredAddress, setRestoredAddress] = useState<string | null>(null);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [isAutoSaveResuming, setIsAutoSaveResuming] = useState(false);
  // Duplicate-address collision from the save flow. Non-null opens the
  // chooser dialog with the user's own colliding saved deal so they can
  // overwrite it or keep both as scenarios.
  const [duplicateCollision, setDuplicateCollision] = useState<{
    existingId: string;
    existingTitle?: string;
    existingUnderwritingRevision?: number;
    autoAfterAuth?: boolean;
  } | null>(null);
  const [duplicateChoiceBusy, setDuplicateChoiceBusy] =
    useState<DuplicateAddressChoice | null>(null);
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
  const [deletedDealRecoveryActive, setDeletedDealRecoveryActive] =
    useState(false);
  const [underwritingConflict, setUnderwritingConflict] = useState<{
    savedDealId: string;
    autoAfterAuth?: boolean;
  } | null>(null);
  const [loadedPipelineStage, setLoadedPipelineStage] = useState<string | null>(
    null,
  );
  const [savedDealCount, setSavedDealCount] = useState(initialSavedDealCount);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Offer-criteria edits live inside the focused result until Apply is chosen.
  // Include that local draft in the page-level loss guards used by the shell.
  const [hasUnappliedTargetDraft, setHasUnappliedTargetDraft] = useState(false);
  const hasPendingDealChanges = hasUnsavedChanges || hasUnappliedTargetDraft;
  const [isComparingDeals, setIsComparingDeals] = useState(false);
  // Same-tick double-click guard for the atomic save → add → navigate flow.
  const compareInFlightRef = useRef(false);
  // React state does not expose a newly inserted id synchronously. The save
  // path records the exact completed id here so Save & compare never guesses
  // from a stale render or an address collision chooser.
  const lastCompletedSaveDealIdRef = useRef<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dealScoreResult, setDealScoreResult] =
    useState<DealScoreActionResult | null>(null);
  // Every async score request owns one sequence number. User edits and newer
  // requests advance it immediately so a late response can never repaint a
  // score calculated from older assumptions beside newer cash-flow metrics.
  const dealScoreRequestRef = useRef(0);
  // ── Sample-deal Pro preview ────────────────────────────────────────
  // When the analysis was triggered from the "Try a sample deal" button
  // AND the user lacks the Pro entitlements, we unlock the full Pro
  // report (projections, tax, exit, Screening Index, stress-test, strategies)
  // for that one demo run. This shows prospects what Pro actually looks
  // like instead of a locked teaser. It's a pure UI unlock: the sample
  // is never saved (no analysisId), so the snapshot server actions are
  // never called and real entitlement gating is untouched. Save / PDF /
  // share / compare stay gated - those hit server actions.
  // The flag clears whenever outputs are invalidated (form drift, reset,
  // loading a saved deal) or a normal non-sample run happens.
  const [isSampleProPreview, setIsSampleProPreview] = useState(false);
  // Exact price-ceiling criteria for this underwriting. Sample, tuned, and
  // restored saved-deal targets all flow through the same state so Save and
  // Share cannot silently revert to a different basis.
  const [analysisMaoTarget, setAnalysisMaoTarget] = useState<MaoTarget | null>(
    null,
  );
  const [analysisMaoTargetSource, setAnalysisMaoTargetSource] =
    useState<OfferCeilingTargetSource | null>(null);
  const [analysisDecisionBasis, setAnalysisDecisionBasis] =
    useState<OfferCeilingDecisionBasis | null>(null);
  const [decisionBasisNeedsReview, setDecisionBasisNeedsReview] =
    useState(false);
  // The pre-run adoption and submit happen in the same click. Mirror the
  // review flag in a ref so that click never reads the previous render and
  // asks the investor to choose the criteria they just chose.
  const decisionBasisNeedsReviewRef = useRef(false);
  useEffect(() => {
    decisionBasisNeedsReviewRef.current = decisionBasisNeedsReview;
  }, [decisionBasisNeedsReview]);
  // Set only by the explicit "operating economics without an Offer Ceiling"
  // action. The normal Pro path must adopt visible criteria before a run, but
  // this one-shot escape hatch is intentional and must not be mistaken for a
  // missing-target error inside onSubmit.
  const explicitTargetlessRunRef = useRef(false);
  // Hero/listing imports must finish through the exact same decision path as
  // the visible Calculate button. Keep the latest closure here because those
  // imports complete asynchronously and their listener is intentionally
  // subscribed only once.
  const primaryRunActionRef = useRef<
    (options?: { withoutOfferCeiling?: boolean }) => Promise<void>
  >(async () => {});
  const pendingProgrammaticHandoffGenerationRef = useRef<number | null>(null);
  const [personalBuyBoxes, setPersonalBuyBoxes] = useState<NamedBuyBox[]>([]);
  // null = pick the highest-priority box that matches this property;
  // "starter" = explicitly use the visible starter criteria; any other value
  // is a user-selected Buy Box id. Reset when property identity/strategy moves.
  const [preRunCriteriaChoice, setPreRunCriteriaChoice] = useState<
    string | null
  >(null);
  const [preRunCriteriaDraft, setPreRunCriteriaDraft] = useState<{
    editorKey: string;
    target: MaoTarget | null;
    dirty: boolean;
  } | null>(null);
  const [preRunBuyBoxState, setPreRunBuyBoxState] = useState<
    "idle" | "loading" | "ready" | "error"
  >(isAuthenticated && canUseMaxOffer ? "loading" : "idle");
  // Hero/listing handlers can await enrichment across several renders. Read
  // the current criteria-load state at the moment that handoff finishes, not
  // the value captured when the import started.
  const preRunBuyBoxStateRef = useRef(preRunBuyBoxState);
  preRunBuyBoxStateRef.current = preRunBuyBoxState;
  const pendingSamplePreviewRef = useRef(false);
  const pendingSampleRunRef = useRef(false);
  const autoSaveAfterAuthRef = useRef(false);
  // State updates do not synchronously disable a button. This ref closes the
  // same-tick window where a double click could otherwise submit two saves.
  const saveInFlightRef = useRef(false);
  // ── Historical one-time PDF claim recovery ─────────────────────────
  // New checkout is disabled. A previously verified, server-consumed purchase
  // unlocks exactly the deal fingerprinted at checkout. The high-entropy
  // binding secret and draft survive Stripe only in same-tab sessionStorage;
  // neither reaches the URL.
  const [isPdfPurchaseDialogOpen, setIsPdfPurchaseDialogOpen] = useState(false);
  const pdfPurchaseTriggerRef = useRef<HTMLElement | null>(null);
  // One no-signup result is server-bound to its exact released inputs. This
  // state controls only presentation; Offer Ceiling and PDF actions verify the
  // signed HttpOnly grant independently.
  const [anonymousDecisionGrantAvailable, setAnonymousDecisionGrantAvailable] =
    useState(false);
  const anonymousDecisionGrantFormJsonRef = useRef<string | null>(null);
  const clearAnonymousDecisionPresentationGrant = useCallback(() => {
    anonymousDecisionGrantFormJsonRef.current = null;
    setAnonymousDecisionGrantAvailable(false);
  }, []);
  const oneTimePdfUnlockedRef = useRef(false);
  const oneTimePdfRedemptionRef = useRef<{
    claimId: string;
    boundFormJson: string;
  } | null>(null);
  const [projectionSource, setProjectionSource] = useState<{
    analysisId: string | null;
    /** Recorded saved results are historical evidence, never a live cache key. */
    recorded?: boolean;
    input: TenYearProjectionInput;
    initialYears: ProjectionYear[];
  } | null>(null);
  const [taxStrategySource, setTaxStrategySource] = useState<{
    analysisId: string | null;
    recorded?: boolean;
    input: TaxStrategyInput;
    initialYears: TaxStrategyYear[];
  } | null>(null);
  const [exitScenarioSource, setExitScenarioSource] = useState<{
    analysisId: string | null;
    recorded?: boolean;
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
  const [templateOptions, setTemplateOptions] = useState<
    AnalysisTemplateOption[]
  >([]);
  const [isLoadingDealScore, setIsLoadingDealScore] = useState(false);
  const { toast } = useToast();
  const prevPropertyTypeRef =
    useRef<InvestmentFormValues["propertyType"]>("single-family");
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
  /** Last server-confirmed write token for the underwriting snapshot. It is
   * intentionally kept out of persisted drafts: only an owner-scoped reopen
   * may authorize an update to an existing row. */
  const savedUnderwritingRevisionRef = useRef<number | null>(null);
  /** Bumped by "Analyze another like this" — an in-flight save whose
   *  generation no longer matches must not attach its id to the forked
   *  form (the fork's savedDealId-null guarantee would be defeated). */
  const forkGenerationRef = useRef(0);
  const lastPersistedFormJsonRef = useRef<string | null>(null);
  const analysisMaoTargetRef = useRef<MaoTarget | null>(analysisMaoTarget);
  const analysisDecisionBasisRef = useRef<OfferCeilingDecisionBasis | null>(
    analysisDecisionBasis,
  );
  /** True while the CURRENT adopted-target state was seeded by the synthetic
   *  sample demo rather than an explicit user action. The sample's targets are
   *  EXAMPLE rules — they must never survive as "your selected targets" once
   *  the user underwrites their own deal (locked product decision). While
   *  armed: drafts and saves record screening-defaults instead of the sample
   *  adoption, the fork path drops the carried target, and any subsequent
   *  non-sample submit (or live recompute over edited values) clears the
   *  adopted state entirely — one-shot, matching the Pro-preview contract.
   *  Any explicit adoption (target editor edit) disarms it. */
  const sampleSeededMaoTargetRef = useRef(false);
  const lastPersistedMaoTargetJsonRef = useRef<string | null>(null);
  /** Form snapshot that produced the currently displayed analysis outputs (last Calculate or loaded saved deal). */
  const lastComputedFormJsonRef = useRef<string | null>(null);
  /** Raw source context from a reopened deal. It retains field fingerprints so
   * each attribution can be revalidated independently as assumptions change. */
  const persistedInputConfidenceSourceContextRef = useRef<unknown>(null);
  /** Input Confidence intentionally stores no address. Bind its restored
   * context to the saved address here so equal values cannot carry a prior
   * property's HUD/state attribution into a different deal. */
  const persistedInputConfidenceAddressRef = useRef<string | null>(null);
  const detachPersistedPurchasePriceSource = useCallback(() => {
    const raw = persistedInputConfidenceSourceContextRef.current;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const next = { ...(raw as Record<string, unknown>) };
    delete next.purchasePriceSource;
    delete next.purchasePriceEstimated;
    persistedInputConfidenceSourceContextRef.current = next;
  }, []);
  /** Explicit verification is value-bound too, but equal numbers can occur at
   * different properties. This second binding makes an address change retire
   * every prior attestation rather than letting it follow the numbers. */
  const inputVerificationAddressRef = useRef<string | null>(null);
  const isCalculatingRef = useRef(false);
  // Reassigned later in the render once the current entitlement flags and
  // output builders are in scope. Keeping the ref near the edit controls lets
  // "Done editing" flush the final keystroke synchronously instead of racing
  // the 100 ms watcher debounce and resurfacing the prior deal's result.
  const recomputeOutputsFromFormRef = useRef<() => void>(() => {});
  const addressEnrichmentPromiseRef = useRef<Promise<void> | null>(null);
  const deferredRunAfterEnrichmentRef = useRef(false);
  const [isAddressEnrichmentPending, setIsAddressEnrichmentPending] =
    useState(false);
  const autoExportPdfRef = useRef(false);
  const currentSaveDealLimitReached =
    saveDealLimitReached ||
    (savedDealLimit !== null && savedDealCount >= savedDealLimit);
  const areAnalysisTabsEnabled =
    Boolean(analysisResult) && !isCalculating && !isEditingAssumptions;

  useEffect(() => {
    analysisMaoTargetRef.current = analysisMaoTarget;
  }, [analysisMaoTarget]);

  useEffect(() => {
    analysisDecisionBasisRef.current = analysisDecisionBasis;
  }, [analysisDecisionBasis]);

  /** A Buy Box is property- and strategy-scoped. Explicitly changing that
   * scope must never let its frozen rules silently follow the investor into a
   * different deal model. Custom criteria remain visible but require one
   * explicit re-adoption under the new model. */
  const invalidateDecisionCriteriaForScopeChange = useCallback(() => {
    setPreRunCriteriaChoice(null);
    setPreRunCriteriaDraft(null);
    const currentTarget = analysisMaoTargetRef.current;
    if (!currentTarget) return;
    const currentIsBuyBox =
      analysisDecisionBasisRef.current?.source === "buy-box" ||
      analysisMaoTargetSource === "buy-box";
    if (currentIsBuyBox) {
      analysisMaoTargetRef.current = null;
      setAnalysisMaoTarget(null);
      setAnalysisMaoTargetSource(null);
      analysisDecisionBasisRef.current = null;
      setAnalysisDecisionBasis(null);
      decisionBasisNeedsReviewRef.current = false;
      setDecisionBasisNeedsReview(false);
      clearPendingMaoTarget();
      return;
    }
    decisionBasisNeedsReviewRef.current = true;
    setDecisionBasisNeedsReview(true);
  }, [analysisMaoTargetSource]);

  const mapInputTabToDashboardTab = useCallback(
    (tab: InputTab): AnalysisDashboardTab | null => {
      if (tab === "cash-flow") return "cash-flow";
      if (tab === "projections") return "projections";
      if (tab === "tax-strategy") return "tax-strategy";
      return null;
    },
    [],
  );

  const scrollToAnalysisResults = useCallback(() => {
    const resultsSection = document.querySelector(
      "[data-analysis-results='true']",
    );
    resultsSection?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  }, []);

  const handleBackToResult = useCallback(() => {
    // Editing is non-destructive: flush the final valid change in case the
    // investor closes the editor inside the watcher's 100 ms debounce.
    // Incomplete fields retain the last complete result behind a clear
    // stale-data warning, and form values are never discarded.
    recomputeOutputsFromFormRef.current();
    setIsEditingAssumptions(false);
    requestAnimationFrame(scrollToAnalysisResults);
  }, [scrollToAnalysisResults]);

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
          const rowHeader = document.getElementById(
            `analysis-tab-${mappedTab}`,
          );
          if (rowHeader) {
            rowHeader.scrollIntoView({
              behavior: scrollBehavior(),
              block: "start",
            });
          } else {
            scrollToAnalysisResults();
          }
        }, 50);
        return;
      }
      // Screening Index has no ledger row — it lives in the answer hero at the
      // top of the results, so results-top is the right landing for it.
      setTimeout(() => {
        scrollToAnalysisResults();
      }, 50);
    },
    [
      areAnalysisTabsEnabled,
      mapInputTabToDashboardTab,
      pointDashboardAt,
      scrollToAnalysisResults,
    ],
  );

  // Shared between the server-action path (loadDealScore) and the
  // sample-deal Pro preview path, which computes the score client-side
  // via the same pure lib function the action wraps.

  const loadDealScore = async (
    values: InvestmentFormValues,
    result: AnalysisResult,
  ) => {
    // Stale-completion guard (same contract as performSaveDeal's
    // saveGeneration): "Analyze another like this" mid-roundtrip clears
    // dealScoreResult via clearAnalysisOutputs — a late response must not
    // repopulate the OLD deal's score under the forked form.
    const scoreGeneration = forkGenerationRef.current;
    const scoreRequest = ++dealScoreRequestRef.current;
    const scoreInputFingerprint = formSnapshotForCompare(values);
    setIsLoadingDealScore(true);
    try {
      const dealScore = await getDealScoreAction(
        buildDealScoreInputFromAnalysis(values, result),
      );
      if (
        forkGenerationRef.current !== scoreGeneration ||
        dealScoreRequestRef.current !== scoreRequest ||
        formSnapshotForCompare(form.getValues()) !== scoreInputFingerprint
      ) {
        return;
      }
      setDealScoreResult(dealScore);
    } catch (err) {
      // Swallow + log instead of throwing - there are 4+ call sites,
      // two of which are fire-and-forget (`void loadDealScore(...)`).
      // Without this, a transient server error becomes an unhandled
      // promise rejection in Sentry with no useful context. Failing
      // the score load silently is the right user-visible behavior:
      // the deal still computes, the score card just stays empty.
      console.warn("[deal-score] load failed:", err);
      if (
        forkGenerationRef.current === scoreGeneration &&
        dealScoreRequestRef.current === scoreRequest
      )
        setDealScoreResult(null);
    } finally {
      if (dealScoreRequestRef.current === scoreRequest) {
        setIsLoadingDealScore(false);
      }
    }
  };

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(releasedInvestmentFormSchema),
    defaultValues: buildNewAnalysisDefaults(
      "single-family",
      userAnalysisDefaults,
    ),
    mode: "onChange",
  });
  const liveStrategyInputs: StrategyInputs = {
    rehabBudget: form.watch("rehabBudget"),
    strategyArv: form.watch("strategyArv"),
    strategyHoldMonths: form.watch("strategyHoldMonths"),
    brrrrRefiLtvPct: form.watch("brrrrRefiLtvPct"),
    brrrrRefiRatePct: form.watch("brrrrRefiRatePct"),
    brrrrRefiTermYears: form.watch("brrrrRefiTermYears"),
    brrrrRefiClosingCostsPct: form.watch("brrrrRefiClosingCostsPct"),
    fixFlipSellingCostsPct: form.watch("fixFlipSellingCostsPct"),
    fixFlipDownPaymentPct: form.watch("fixFlipDownPaymentPct"),
    fixFlipCarryMonthly: form.watch("fixFlipCarryMonthly"),
  };
  const strategyInputErrors: StrategyInputErrors = Object.fromEntries(
    (Object.keys(liveStrategyInputs) as StrategyInputField[])
      .map((field) => [field, form.formState.errors[field]?.message])
      .filter(
        (entry): entry is [StrategyInputField, string] =>
          typeof entry[1] === "string",
      ),
  );
  const handleStrategyInputChange = useCallback(
    (field: StrategyInputField, value: number | undefined) => {
      form.setValue(field, value as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const handleAppliedFinancingProfileChange = useCallback(
    (profile: FinancingProfileSnapshot | null) => {
      setAppliedFinancingProfile(profile);
      // The frozen financing origin is part of the saved underwriting record,
      // even when detaching it leaves the numeric form values unchanged. Make
      // that provenance change visible to the normal Save/navigation guards.
      if (savedDealIdRef.current) setHasUnsavedChanges(true);
      if (
        !profile?.lastVerifiedAt ||
        financingProfileAgeBand(profile.lastVerifiedAt) !== "0_30_days"
      )
        return;

      // A recently dated profile is the user's explicit lender-term
      // confirmation. Stale quotes remain visible but do not raise confidence.
      // Add fingerprinted evidence only for modeled fields the profile
      // actually supplied; editing any value invalidates it automatically.
      const patch = financingProfileAnalysisPatch(profile);
      const values = form.getValues();
      const verifiedKeys: InputConfidenceFieldKey[] = [];
      if (profile.interestRatePct != null) verifiedKeys.push("interestRate");
      if (patch.downPaymentPct !== undefined) verifiedKeys.push("downPayment");
      if (patch.closingCostsPct !== undefined)
        verifiedKeys.push("closingCosts");
      if (verifiedKeys.length === 0) return;

      inputVerificationAddressRef.current = normalizeAutofillPropertyAddress(
        values.address,
      );
      setInputVerification((current) => {
        const next: InputVerificationEvidence = { ...current };
        for (const key of verifiedKeys) {
          next[key] = {
            verifiedAt: profile.lastVerifiedAt ?? undefined,
            evidenceType: "recent-verified-financing-profile",
            fingerprint: inputVerificationFingerprint(values, key),
          };
        }
        return next;
      });
    },
    [form],
  );

  const syncFormDirtyVersusPersisted = useCallback(() => {
    const id = savedDealIdRef.current;
    if (!id) {
      setHasUnsavedChanges(false);
      return;
    }
    const json = formSnapshotForCompare(form.getValues());
    const targetChanged = isMaoTargetDirty(
      analysisMaoTargetRef.current,
      lastPersistedMaoTargetJsonRef.current,
    );
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
      if (lastPersistedFormJsonRef.current || targetChanged)
        setHasUnsavedChanges(true);
      return;
    }
    if (!lastPersistedFormJsonRef.current) {
      setHasUnsavedChanges(true);
      return;
    }
    setHasUnsavedChanges(
      json !== lastPersistedFormJsonRef.current || targetChanged,
    );
  }, [form]);

  const handleAnalysisMaoTargetChange = useCallback(
    (target: MaoTarget) => {
      // Ref update is synchronous so an edit made while Save is in flight is
      // visible to the completion's dirty reconciliation.
      analysisMaoTargetRef.current = target;
      setAnalysisMaoTarget(target);
      setAnalysisMaoTargetSource("selected-targets");
      const decisionBasis = captureSelectedTargetsDecisionBasis({
        target,
        strategyKey: currentAnalyzerStrategyKey(),
      });
      analysisDecisionBasisRef.current = decisionBasis;
      setAnalysisDecisionBasis(decisionBasis);
      setDecisionBasisNeedsReview(false);
      // Editing the rules IS explicit adoption — even if the editor was
      // seeded by the sample, the user has now made these targets theirs.
      sampleSeededMaoTargetRef.current = false;
      // The edited criteria no longer match the atomically recorded solve.
      // Keep recorded mode fail-closed until an explicit Run or Save replaces
      // the whole base result too; otherwise today's inverse solver would sit
      // beside historical base metrics for one mixed-methodology view.
      setRecordedOfferCeiling(invalidateRecordedOfferCeilingForTargetEdit);
      syncFormDirtyVersusPersisted();
      // A new/guest analysis has no server row yet, so target-only edits must
      // travel with the local draft just like form-field edits. The form.watch
      // draft writer does not fire for this separate target state.
      if (!savedDealIdRef.current) {
        const values = form.getValues();
        try {
          writeCalcDraftWithMaoTarget(
            values,
            target,
            "selected-targets",
            activeStrategyKeyRef.current,
            undefined,
            decisionBasis,
          );
        } catch {
          /* storage unavailable — current-session target remains intact */
        }
      }
    },
    [form, syncFormDirtyVersusPersisted],
  );

  const clearAnalysisOutputs = useCallback(() => {
    clearAnonymousDecisionPresentationGrant();
    setAnalysisResult(null);
    setAnalysisValues(null);
    setProjectionSource(null);
    setTaxStrategySource(null);
    setExitScenarioSource(null);
    setDealScoreResult(null);
    setShowResults(false);
    setSavedMethodologyLabel(null);
    setRecordedOfferCeiling(null);
    setRecordedSpecialistAnalysis(null);
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
    setAnalysisMaoTarget(null);
    setAnalysisMaoTargetSource(null);
    analysisDecisionBasisRef.current = null;
    setAnalysisDecisionBasis(null);
    setDecisionBasisNeedsReview(false);
    sampleSeededMaoTargetRef.current = false;
    clearPendingMaoTarget();
    setIsEditingAssumptions(false);
  }, [clearAnonymousDecisionPresentationGrant]);

  // Live recompute: once a result is on screen, editing any input updates the
  // analysis in place instead of blanking it until the next explicit Run.
  // Kept in a ref so the form watcher (below) subscribes ONCE and never tears
  // down its debounce timer on re-render — re-subscribing would clear the
  // pending timer and silently drop the user's final edit. The body is
  // reassigned every render (after the source builders, where the canUse*
  // flags + builders are in scope) so it always closes over fresh values.
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
    (
      nextPropertyType: InvestmentFormValues["propertyType"] = "single-family",
    ) => {
      isProgrammaticResetRef.current = true;
      // Invalidate every async calculation/enrichment completion owned by the
      // property being left before clearing the form.
      forkGenerationRef.current += 1;
      // Re-apply user defaults on every reset so a "New Analysis" still
      // pre-fills the user's preferred vacancy/mgmt/financing values.
      const defaults = buildNewAnalysisDefaults(
        nextPropertyType,
        userAnalysisDefaults,
      );
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
      savedUnderwritingRevisionRef.current = null;
      setUnderwritingConflict(null);
      setLoadedPipelineStage(null);
      lastPersistedFormJsonRef.current = null;
      lastPersistedMaoTargetJsonRef.current = null;
      lastComputedFormJsonRef.current = null;
      // Wipe the anonymous auto-save draft - the user is explicitly
      // asking for a fresh start. Without this they'd reset, then on
      // next page load the old draft would silently come back.
      clearCalcDraftRaw();
      clearAnalysisOutputs();
      setPreRunCriteriaChoice(null);
      setInputVerification({});
      inputVerificationAddressRef.current = null;
      persistedInputConfidenceSourceContextRef.current = null;
      persistedInputConfidenceAddressRef.current = null;
      setAppliedFinancingProfile(null);
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
      form.setValue("address", "", {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("purchasePrice", undefined as unknown as number, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("yearBuilt", undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("bedrooms", undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("bathrooms", undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("sqft", undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue("monthlyRent", undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
      enrichmentCaptureRef.current = {};
      setMarketRentEstimate(null);
      // Same rules as marketRentEstimate: a fresh session must never judge
      // its units against the PREVIOUS deal's market benchmark.
      setUnitFmrByBedrooms(null);
      unitFmrKeyRef.current = null;
      enrichedUnitsRef.current.clear();
      // …and the enrichment TRIGGERS, not just the captures — the same
      // guarantee the fork path gives. With the old refs armed, typing
      // bedrooms (or hand-typing the next address without picking a
      // suggestion) re-ran enrichment against the PREVIOUS deal's place:
      // wrong-county HUD rent onto the fresh form,
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
      setListingImportStatus(null);
      setExpenseDetailsOpen(false);
      setPriceEstimated(false);
      setEstimatedPriceValue(null);
      setPriceEstimateBasis(null);
      setPurchasePriceSourceLabel(null);
      purchasePriceSourceRef.current = null;
      purchasePriceProvenanceAddressRef.current = null;
      purchasePriceProvenanceValueRef.current = null;
      // The active play must not outlive the assumptions it applied: the
      // form.reset above restored factory values, so a surviving
      // "Analyzing as: <play>" pill (plus STR income inputs / Wholesale
      // labels) would claim a tailored analysis the numbers no longer
      // reflect (BROWSER-3).
      setActiveStrategyKey(null);
      activeStrategyKeyRef.current = null;
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
    [form, clearAnalysisOutputs, userAnalysisDefaults],
  );

  const propertyType = form.watch("propertyType");
  const propertyTypeLabel =
    PROPERTY_TYPES.find((type) => type.value === propertyType)?.label ??
    "Property";
  const purchasePrice = form.watch("purchasePrice");
  const watchedBedrooms = form.watch("bedrooms");

  // A strategy switch can unmount a specialist control. Keep every valid
  // assumption so returning to that model is seamless, but clear an invalid
  // value once its owning control is genuinely absent; an invisible field
  // must never strand Run/Save behind an error the user cannot reach. STR's
  // hidden bedroom count follows the same rule.
  useEffect(() => {
    const parsed = releasedInvestmentFormSchema.safeParse(form.getValues());
    if (parsed.success) return;
    const invalidTopLevelFields = new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((field): field is string => typeof field === "string"),
    );
    const candidates: string[] = [...STRATEGY_MODEL_INPUT_FIELDS];
    if (activeStrategy?.incomeMode === "str") candidates.push("bedrooms");
    for (const field of candidates) {
      if (!invalidTopLevelFields.has(field)) continue;
      // A mounted card owns the error and shows its inline recovery. Only
      // remove invalid state that has become unreachable after a switch.
      if (document.getElementsByName(field).length > 0) continue;
      form.setValue(field as keyof InvestmentFormValues, undefined as never, {
        shouldDirty: true,
        shouldValidate: false,
      });
      form.clearErrors(field as keyof InvestmentFormValues);
    }
  }, [
    activeStrategy?.incomeMode,
    activeStrategyKey,
    form,
    liveStrategyInputs.brrrrRefiClosingCostsPct,
    liveStrategyInputs.brrrrRefiLtvPct,
    liveStrategyInputs.brrrrRefiRatePct,
    liveStrategyInputs.brrrrRefiTermYears,
    liveStrategyInputs.fixFlipCarryMonthly,
    liveStrategyInputs.fixFlipDownPaymentPct,
    liveStrategyInputs.fixFlipSellingCostsPct,
    liveStrategyInputs.strategyArv,
    liveStrategyInputs.strategyHoldMonths,
    watchedBedrooms,
  ]);

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
  // the identical address) from a real move. The normalized FULL address +
  // ZIP avoids the false-positive collision created by street-number + ZIP
  // (two different streets in one ZIP can share a number). Cleared wherever
  // lastEnrichedAddressRef is.
  const lastEnrichedGeoRef = useRef<{
    state?: string;
    zip: string | null;
    normalizedAddress: string | null;
  } | null>(null);
  const seedRestoredAddressIdentity = (address: string | null | undefined) => {
    const formattedAddress = address?.trim();
    if (!formattedAddress) {
      lastSelectedAddressRef.current = null;
      lastEnrichedAddressRef.current = null;
      lastEnrichedGeoRef.current = null;
      return;
    }
    const parsed = parseAddressLocation(formattedAddress);
    const restoredPlace: SelectedAddress = {
      formattedAddress,
      ...(parsed.state ? { state: parsed.state } : {}),
      ...(parsed.zip ? { zip: parsed.zip } : {}),
    };
    lastSelectedAddressRef.current = restoredPlace;
    lastEnrichedAddressRef.current = formattedAddress;
    lastEnrichedGeoRef.current = {
      state: restoredPlace.state,
      ...autofillPropertyIdentity(restoredPlace),
    };
  };

  /**
   * One source-of-truth for every confidence/provenance consumer. A reopened
   * deal contributes only fingerprint-valid saved fields, current enrichment
   * wins for fields it just sourced, and current dirty fields join (rather
   * than replace) still-valid saved edit context.
   */
  const resolveLiveInputConfidenceContext = useCallback(
    (
      values: InvestmentFormValues,
      liveTouchedFields:
        | Record<string, unknown>
        | ReadonlySet<string>
        | null = null,
    ) => {
      const currentAddress = normalizeAutofillPropertyAddress(values.address);
      const persistedAddress = persistedInputConfidenceAddressRef.current;
      const persistedSourceContext =
        persistedAddress !== null && persistedAddress === currentAddress
          ? persistedInputConfidenceSourceContextRef.current
          : null;
      const currentPrice = Number(values.purchasePrice);
      const livePurchasePriceSource =
        purchasePriceSourceRef.current &&
        purchasePriceProvenanceAddressRef.current === currentAddress &&
        Number.isFinite(currentPrice) &&
        purchasePriceProvenanceValueRef.current === currentPrice
          ? purchasePriceSourceRef.current
          : undefined;

      const valueRecord = values as unknown as Record<string, unknown>;
      const startingAssumptionOrigins: Partial<
        Record<InputConfidenceFieldKey, StartingAssumptionOrigin>
      > = {};
      const addValueBoundOrigins = (
        fields: Record<string, unknown>,
        origin: StartingAssumptionOrigin,
      ) => {
        const ownedFields = computeStrategyOwnedFields(
          { label: origin.label, fields },
          valueRecord,
        );
        for (const formField of ownedFields) {
          const confidenceKey = inputConfidenceKeyForFormField(formField);
          if (!confidenceKey || startingAssumptionOrigins[confidenceKey])
            continue;
          // A confidence row can cover several controls. Attribute it only
          // from the modeled value itself—not from a coincidentally matching
          // companion such as loan term, PMI mode, or the inactive tax mode.
          if (confidenceKey === "interestRate" && formField !== "interestRate")
            continue;
          if (
            confidenceKey === "propertyTax" &&
            formField !==
              (values.propertyTaxInputMode === "annual"
                ? "propertyTaxAnnual"
                : "propertyTaxPct")
          )
            continue;
          if (
            confidenceKey === "insurance" &&
            formField !==
              (values.insuranceInputMode === "monthly"
                ? "insuranceMonthly"
                : "insurancePct")
          )
            continue;
          startingAssumptionOrigins[confidenceKey] = origin;
        }
      };

      // Most specific reusable source wins. Every claim is tied to the exact
      // current value, so editing a field immediately removes the label.
      if (strategyAppliedRef.current) {
        addValueBoundOrigins(strategyAppliedRef.current.fields, {
          kind: "strategy-default",
          label: `${strategyAppliedRef.current.label} starter`,
        });
      }
      const linkedTemplate = values.templateId
        ? templateOptions.find((template) => template.id === values.templateId)
        : null;
      if (linkedTemplate) {
        addValueBoundOrigins(
          Object.fromEntries(
            buildTemplateFormPatch(linkedTemplate).map(({ field, value }) => [
              field,
              value,
            ]),
          ),
          {
            kind: "template",
            label: `Template: ${linkedTemplate.templateName}`,
          },
        );
      }
      addValueBoundOrigins(
        mapUserDefaultsToForm(userAnalysisDefaults) as Record<string, unknown>,
        {
          kind: "account-default",
          label: "Your saved account default",
        },
      );

      return mergeInputConfidenceSourceContext({
        persistedSourceContext,
        values,
        liveProvenance: buildProvenanceInput(
          enrichmentCaptureRef.current,
          values,
        ),
        liveTouchedFields,
        liveStartingAssumptionOrigins: startingAssumptionOrigins,
        // `undefined` lets a still-matching restored/draft estimate survive
        // the render in which React is applying its restored UI state. A
        // real price edit changes the fingerprint and therefore still clears
        // the flag immediately; fresh analyses have no restored flag.
        livePurchasePriceEstimated: priceEstimated ? true : undefined,
        livePurchasePriceSource,
      });
    },
    [priceEstimated, templateOptions, userAnalysisDefaults],
  );

  const buildLiveInputConfidenceSourceContext = useCallback(
    (
      values: InvestmentFormValues,
      liveTouchedFields: Record<string, unknown> | ReadonlySet<string> | null,
    ): InputConfidenceSourceContext => {
      const source = resolveLiveInputConfidenceContext(
        values,
        liveTouchedFields,
      );
      return buildInputConfidence({
        values,
        provenance: source.provenance,
        touchedFields: new Set(source.touchedInputFields),
        startingAssumptionOrigins: source.startingAssumptionOrigins,
        purchasePriceEstimated: source.purchasePriceEstimated,
        purchasePriceSource: source.purchasePriceSource,
      }).sourceContext;
    },
    [resolveLiveInputConfidenceContext],
  );

  /**
   * Run the released enrichment lookups (FRED mortgage rate and HUD Fair
   * Market Rent) and pre-fill the form. Property tax intentionally remains a
   * manual/local input; the retired static state table was too coarse for NOI.
   * Idempotent: callers can
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
      const placeKey =
        place.formattedAddress ??
        `${place.state ?? ""}:${place.county ?? ""}:${place.zip ?? ""}`;
      if (lastEnrichedAddressRef.current !== placeKey) {
        // The formatted string changed — but that alone can't distinguish a
        // real move from the SAME property re-picked with different
        // formatting (typed commit "…PA 19140" → Google's "…PA 19140, USA"
        // — the default flow now that pasted addresses commit on blur).
        // Compare exact normalized address + ZIP ⇒ same property; same ZIP +
        // state ⇒ same HUD market (SAFMR is ZIP-granular, so its value stays
        // valid across a formatting-only change).
        // null prior means first selection or a loaded saved deal
        // (form.reset leaves everything non-dirty), which must never clear.
        const prevGeo = lastEnrichedGeoRef.current;
        const nextIdentity = autofillPropertyIdentity(place);
        const sameProperty = isSameAutofillProperty(prevGeo, place);
        const sameMarket =
          sameProperty ||
          (prevGeo !== null &&
            prevGeo.zip !== null &&
            prevGeo.zip === nextIdentity.zip &&
            prevGeo.state === place.state);
        const isSwap = lastEnrichedAddressRef.current !== null && !sameProperty;
        // Re-selecting the same property may only change display formatting
        // (for example Google appends ", USA"). Preserve the value-bound
        // provenance and market benchmarks in that case; clearing them would
        // relabel unchanged FRED/state/HUD values as unsourced defaults.
        if (!sameProperty) {
          enrichmentCaptureRef.current = {};
          setMarketRentEstimate(null);
          setUnitFmrByBedrooms(null);
          unitFmrKeyRef.current = null;
        }
        lastEnrichedAddressRef.current = placeKey;
        lastEnrichedGeoRef.current = {
          state: place.state,
          ...nextIdentity,
        };
        if (isSwap) {
          persistedInputConfidenceSourceContextRef.current = null;
          persistedInputConfidenceAddressRef.current = null;
          setInputVerification({});
          inputVerificationAddressRef.current = null;
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
            form.setValue(
              "purchasePrice",
              undefined as unknown as number,
              clearOpts,
            );
          }
          if (!dirty.bedrooms) form.setValue("bedrooms", undefined, clearOpts);
          if (!dirty.bathrooms)
            form.setValue("bathrooms", undefined, clearOpts);
          if (!dirty.sqft) form.setValue("sqft", undefined, clearOpts);
          const units = form.getValues("units") ?? [];
          for (let i = 0; i < units.length; i++) {
            if (
              !isEmptyNumber(units[i]?.monthlyRent) &&
              !dirty.units?.[i]?.monthlyRent
            ) {
              form.setValue(`units.${i}.monthlyRent`, undefined, clearOpts);
            }
          }
        }
      }
      const currentPropertyType = form.getValues("propertyType");
      const isSingleFamily = currentPropertyType === "single-family";
      const rawBedrooms = isSingleFamily
        ? form.getValues("bedrooms")
        : undefined;
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
      const bedrooms = Number.isFinite(parsedBedrooms)
        ? parsedBedrooms
        : undefined;

      let enrichment: Awaited<ReturnType<typeof enrichPropertyAction>>;
      try {
        enrichment = await enrichPropertyAction({
          state: place.state,
          county: place.county,
          zip: place.zip,
          propertyType: currentPropertyType,
          bedrooms,
        });
      } catch (error) {
        // A network rejection or stale-deploy Server Action must never leave
        // the analyzer stuck in a loading state. Enrichment is optional: keep
        // the user's explicit values authoritative and let them continue.
        console.warn("[property enrichment] lookup failed:", error);
        if (!opts?.silent) {
          toast({
            title: "Property lookup unavailable",
            description:
              "You can keep underwriting with the values you enter. Try Autofill again when the connection recovers.",
            variant: "warning",
          });
        }
        return;
      }

      // Stale-completion guard (same contract as performSaveDeal's
      // saveGeneration): "Analyze another like this" or a newer address
      // selection while this roundtrip was in flight means these results
      // describe a deal the user already left — writing them would fill the
      // fresh form with the OLD market's tax/rate/rent under a misleading
      // "Auto-filled from address" toast.
      if (
        forkGenerationRef.current !== enrichGeneration ||
        lastSelectedAddressRef.current !== place ||
        form.getValues("propertyType") !== currentPropertyType
      ) {
        return;
      }

      const setOpts = {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      };
      const filled: string[] = [];

      /** Address benchmarks may replace only the untouched product starting
       * value on a genuinely new analysis. A populated draft, saved deal,
       * template, strategy, user default, or user edit owns its value even
       * though RHF may report it as non-dirty after reset(). Equal protected
       * values are left alone too, so a coincidental match is not relabeled
       * as if FRED/the state supplied it during this session. */
      const mayAdoptStartingBenchmark = (
        field: "interestRate",
        proposedValue: number,
        productStartingValue: number,
        extraProtection = false,
      ) => {
        const currentValue = form.getValues(field);
        const currentNumber = Number(currentValue);
        const currentIsProductStart =
          Number.isFinite(currentNumber) &&
          currentNumber === productStartingValue;
        const strategyOwnsField = Boolean(
          strategyAppliedRef.current &&
          Object.prototype.hasOwnProperty.call(
            strategyAppliedRef.current.fields,
            field,
          ),
        );
        const isReplaceableProductDefault =
          currentIsProductStart &&
          autoApplyEligibleRef.current &&
          !savedDealIdRef.current &&
          !form.getValues("templateId") &&
          !form.formState.dirtyFields[field] &&
          !strategyOwnsField &&
          !extraProtection;
        const decision = decideAutofillFieldWrite({
          currentValue,
          proposedValue,
          replaceableDefault: isReplaceableProductDefault,
        });
        return (
          decision.action === "write" &&
          (decision.reason !== "same-value" || isReplaceableProductDefault)
        );
      };

      // Interest rate — same ownership rule. An account-level lender/default
      // rate is intentional even when it equals TrueCap's starting number.
      if (enrichment.interestRate !== undefined) {
        const userRateDefault = userAnalysisDefaults?.interestRatePct;
        const hasUserRateDefault =
          typeof userRateDefault === "number" &&
          Number.isFinite(userRateDefault);
        if (
          mayAdoptStartingBenchmark(
            "interestRate",
            enrichment.interestRate,
            Number(defaultValues.interestRate ?? 6.75),
            hasUserRateDefault,
          )
        ) {
          form.setValue("interestRate", enrichment.interestRate, setOpts);
          enrichmentCaptureRef.current.interestRate = {
            source: "fred",
            fetchedAt: enrichment.meta.mortgageRate?.asOf,
            value: enrichment.interestRate,
          };
          filled.push(
            `Interest rate ${enrichment.interestRate.toFixed(2)}% (current avg)`,
          );
        }
      }

      // Monthly rent - single-family only at this entry point. Multi-family
      // rents are filled per-unit by a separate effect below. `valueAsNumber:
      // true` means an empty input reads as NaN, so we must treat NaN as
      // empty too.
      let rentFilledFromHud = false;
      let rentIsStateAverage = false;
      if (isSingleFamily && enrichment.monthlyRent !== undefined) {
        // Always record the HUD benchmark for the rent reality-check, even if
        // the user already typed their own rent (so we can compare the two).
        setMarketRentEstimate(enrichment.monthlyRent);
        const current = form.getValues("monthlyRent") as
          | number
          | undefined
          | null;
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
            fetchedAt: enrichment.meta.rent
              ? String(enrichment.meta.rent.year)
              : undefined,
            value: enrichment.monthlyRent,
            rentFingerprint: unitRentRollFingerprint(form.getValues()),
          };
          filled.push(
            `Rent ~$${Math.round(enrichment.monthlyRent).toLocaleString()}/mo ${
              enrichment.meta.rent?.stateAverage
                ? "(HUD statewide average)"
                : "(HUD FMR)"
            }`,
          );
          rentFilledFromHud = true;
          rentIsStateAverage = Boolean(enrichment.meta.rent?.stateAverage);
        }
      }

      if (filled.length > 0 && !opts?.silent) {
        toast({
          title: "Auto-filled from address",
          description: rentFilledFromHud
            ? `${filled.join("  ·  ")} - ${
                rentIsStateAverage
                  ? "No local HUD match — this is a statewide average; local rents vary widely, so adjust to comps."
                  : "HUD FMR is an area average; adjust to local comps."
              }`
            : filled.join("  ·  "),
        });
      }
      if (filled.length > 0) {
        trackEvent("analyzer_autofill_completed", {
          property_type: currentPropertyType,
          fields_filled: filled.length,
        });
      }
    },
    [form, toast, userAnalysisDefaults],
  );

  const runTrackedPropertyEnrichment = useCallback(
    (place: SelectedAddress, opts?: { silent?: boolean }) => {
      const request = runPropertyEnrichment(place, opts);
      addressEnrichmentPromiseRef.current = request;
      setIsAddressEnrichmentPending(true);
      void request.finally(() => {
        if (addressEnrichmentPromiseRef.current !== request) return;
        addressEnrichmentPromiseRef.current = null;
        setIsAddressEnrichmentPending(false);
      });
      return request;
    },
    [runPropertyEnrichment],
  );

  /**
   * Confirm a real property swap before any address entry point can combine
   * the new address with the previous deal's identity, price, or rent. This is
   * shared by autocomplete and hero/listing handoffs so every doorway follows
   * the same trust contract.
   */
  const preparePropertySwap = useCallback(
    async (nextPlace: SelectedAddress): Promise<boolean> => {
      const selectedPreviousPlace = lastSelectedAddressRef.current;
      const completedPreviousAddress = analysisValues?.address?.trim() ?? "";
      const visiblePreviousAddress = String(
        form.getValues("address") ?? "",
      ).trim();
      const previousAddress =
        selectedPreviousPlace?.formattedAddress?.trim() ||
        completedPreviousAddress ||
        visiblePreviousAddress;
      if (!previousAddress) return true;

      const previousPlace =
        selectedPreviousPlace ??
        (() => {
          const parsed = parseAddressLocation(previousAddress);
          return {
            formattedAddress: previousAddress,
            state: parsed.state,
            zip: parsed.zip,
          } satisfies SelectedAddress;
        })();
      if (
        isSameAutofillProperty(
          autofillPropertyIdentity(previousPlace),
          nextPlace,
        )
      ) {
        return true;
      }

      const currentValues = form.getValues();
      const hasPropertySpecificValues = Boolean(
        !isEmptyNumber(currentValues.purchasePrice) ||
        !isEmptyNumber(currentValues.monthlyRent) ||
        !isEmptyNumber(currentValues.yearBuilt) ||
        !isEmptyNumber(currentValues.currentMonthlyRent) ||
        !isEmptyNumber(currentValues.stabilizedMonthlyRent) ||
        !isEmptyNumber(currentValues.currentPropertyValue) ||
        !isEmptyNumber(currentValues.stabilizedPropertyValue) ||
        !isEmptyNumber(currentValues.recurringOtherIncomeMonthly) ||
        !isEmptyNumber(currentValues.recurringOtherExpenseMonthly) ||
        !isEmptyNumber(currentValues.turnoverReserveMonthly) ||
        !isEmptyNumber(currentValues.leasingReserveMonthly) ||
        !isEmptyNumber(currentValues.landscapingMonthly) ||
        !isEmptyNumber(currentValues.pestControlMonthly) ||
        !isEmptyNumber(currentValues.administrativeMonthly) ||
        !isEmptyNumber(currentValues.propertyTaxAnnual) ||
        !isEmptyNumber(currentValues.insuranceMonthly) ||
        !isEmptyNumber(currentValues.hoaMonthly) ||
        !isEmptyNumber(currentValues.utilitiesMonthly) ||
        !isEmptyNumber(currentValues.avgDailyRate) ||
        !isEmptyNumber(currentValues.rehabBudget) ||
        !isEmptyNumber(currentValues.strategyArv) ||
        currentValues.bedrooms != null ||
        currentValues.bathrooms != null ||
        currentValues.sqft != null ||
        currentValues.units?.some(
          (unit) =>
            unit.monthlyRent != null ||
            unit.stabilizedMonthlyRent != null ||
            unit.bedrooms != null ||
            unit.bathrooms != null ||
            unit.sqft != null,
        ),
      );
      if (!hasPropertySpecificValues) return true;

      const useNewProperty = await confirmDialog({
        title: "Use this new property?",
        body:
          "Using it will clear the previous property’s price, rent, bedrooms, and physical details. Financing and general operating assumptions will stay.",
        confirmLabel: "Use new property",
        cancelLabel: "Keep previous address",
      });
      if (!useNewProperty) {
        form.setValue("address", previousAddress, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        toast({
          title: "Kept the previous property",
          description: "No property facts or assumptions were changed.",
        });
        return false;
      }

      const clearOpts = {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      } as const;
      form.setValue("purchasePrice", undefined as unknown as number, clearOpts);
      form.setValue("monthlyRent", undefined, clearOpts);
      form.setValue("yearBuilt", undefined, clearOpts);
      form.setValue("bedrooms", undefined, clearOpts);
      form.setValue("bathrooms", undefined, clearOpts);
      form.setValue("sqft", undefined, clearOpts);
      form.setValue(
        "units",
        getDefaultUnitsForPropertyType(currentValues.propertyType),
        clearOpts,
      );

      // Dollar amounts and operating facts tied to one address must never
      // hitchhike into the next deal. Keep reusable percentages, rates, term,
      // growth, and tax-model settings; reset property-specific dollars and
      // rents. V2 requires explicit zeroes for optional operating lines, so a
      // fresh property starts honestly at zero instead of inheriting old data.
      const v2 = currentValues.underwritingModelVersion === "2.0";
      form.setValue(
        "unitCount",
        v2
          ? getDefaultUnitsForPropertyType(currentValues.propertyType).length
          : undefined,
        clearOpts,
      );
      form.setValue("currentMonthlyRent", undefined, clearOpts);
      form.setValue("stabilizedMonthlyRent", undefined, clearOpts);
      form.setValue("currentPropertyValue", undefined, clearOpts);
      form.setValue("stabilizedPropertyValue", undefined, clearOpts);
      form.setValue("operatingScenario", "current", clearOpts);
      form.setValue("acquisitionCredits", v2 ? 0 : undefined, clearOpts);
      form.setValue(
        "recurringOtherIncomeMonthly",
        v2 ? 0 : undefined,
        clearOpts,
      );
      form.setValue(
        "recurringOtherExpenseMonthly",
        v2 ? 0 : undefined,
        clearOpts,
      );
      form.setValue("turnoverReserveMonthly", undefined, clearOpts);
      form.setValue("leasingReserveMonthly", undefined, clearOpts);
      form.setValue("landscapingMonthly", undefined, clearOpts);
      form.setValue("pestControlMonthly", undefined, clearOpts);
      form.setValue("administrativeMonthly", undefined, clearOpts);
      form.setValue("propertyTaxAnnual", undefined, clearOpts);
      form.setValue("propertyTaxPct", undefined, clearOpts);
      form.setValue("propertyTaxInputMode", "percent", clearOpts);
      form.setValue("insuranceMonthly", undefined, clearOpts);
      form.setValue("insurancePct", undefined, clearOpts);
      form.setValue("insuranceInputMode", "percent", clearOpts);
      form.setValue("hoaMonthly", v2 ? 0 : undefined, clearOpts);
      form.setValue("utilitiesMonthly", v2 ? 0 : undefined, clearOpts);
      form.setValue("avgDailyRate", undefined, clearOpts);
      form.setValue("occupancyPct", undefined, clearOpts);
      form.setValue("strFurnishingCost", undefined, clearOpts);
      form.setValue("rehabBudget", v2 ? 0 : undefined, clearOpts);
      form.setValue("renovationStartMonth", undefined, clearOpts);
      form.setValue("renovationDurationMonths", undefined, clearOpts);
      form.setValue("renovationRentLossPct", undefined, clearOpts);
      form.setValue("strategyArv", undefined, clearOpts);
      form.setValue("fixFlipCarryMonthly", undefined, clearOpts);
      form.setValue("templateId", undefined, clearOpts);
      if (
        currentValues.financingMode === "fixed-down" ||
        currentValues.financingMode === "fixed-loan"
      ) {
        form.setValue("financingMode", "percent-down", clearOpts);
        form.setValue("fixedDownPaymentAmount", undefined, clearOpts);
        form.setValue("fixedLoanAmount", undefined, clearOpts);
      }
      if (currentValues.closingCostsInputMode === "fixed") {
        form.setValue("closingCostsInputMode", "percent", clearOpts);
        form.setValue("closingCostsFixed", undefined, clearOpts);
      }
      form.setValue("loanFees", v2 ? 0 : undefined, clearOpts);
      form.setValue("initialReserve", v2 ? 0 : undefined, clearOpts);
      form.setValue("originationFee", undefined, clearOpts);
      form.setValue("lenderEscrowDeposit", undefined, clearOpts);
      form.setValue("lenderReserveDeposit", undefined, clearOpts);
      setPriceEstimated(false);
      setEstimatedPriceValue(null);
      setPriceEstimateBasis(null);
      setPurchasePriceSourceLabel(null);
      purchasePriceSourceRef.current = null;
      purchasePriceProvenanceAddressRef.current = null;
      purchasePriceProvenanceValueRef.current = null;
      setMarketRentEstimate(null);
      setUnitFmrByBedrooms(null);
      unitFmrKeyRef.current = null;
      persistedInputConfidenceSourceContextRef.current = null;
      persistedInputConfidenceAddressRef.current = null;
      setInputVerification({});
      inputVerificationAddressRef.current = null;
      toast({
        title: "Property-specific values cleared",
        description:
          "Financing and general operating assumptions were kept for the new address.",
      });
      return true;
    },
    [analysisValues, confirmDialog, form, toast],
  );

  /** Address-selected entry point (passed to PropertyDetailsSection). */
  const handleAddressSelected = useCallback(
    async (place: SelectedAddress) => {
      if (!(await preparePropertySwap(place))) return;
      enrichedUnitsRef.current.clear();
      lastSelectedAddressRef.current = place;
      // runPropertyEnrichment owns the identity check. It clears captures for
      // a genuinely different property while preserving exact provenance for
      // a same-address re-selection whose display formatting changed.
      // Funnel step - boolean only; never location/address data.
      trackEvent("address_selected", { has_state: Boolean(place.state) });
      await runTrackedPropertyEnrichment(place);
    },
    [preparePropertySwap, runTrackedPropertyEnrichment],
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
    runTrackedPropertyEnrichment(place, { silent: false }).catch((err) => {
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
  const listingImportMissingFields = useMemo(
    () =>
      listingImportStatus
        ? getListingImportMissingFields({
            propertyType,
            purchasePrice,
            bedrooms: watchedBedrooms,
            monthlyRent: watchedMonthlyRent,
            units: watchedUnits,
          })
        : [],
    [
      listingImportStatus,
      propertyType,
      purchasePrice,
      watchedBedrooms,
      watchedMonthlyRent,
      watchedUnits,
    ],
  );
  useEffect(() => {
    if (!listingImportStatus) return;
    if (
      normalizeAutofillPropertyAddress(watchedAddress) !==
      normalizeAutofillPropertyAddress(listingImportStatus.address)
    ) {
      setListingImportStatus(null);
      return;
    }
    if (
      listingImportStatus.phase === "needs-input" &&
      listingImportMissingFields.length === 0
    ) {
      reportHeroAnalyzeStatus({
        token: listingImportStatus.token,
        status: "ready",
      });
      setListingImportStatus(null);
    }
  }, [listingImportMissingFields, listingImportStatus, watchedAddress]);
  useEffect(() => {
    if (!isAuthenticated || !canUseMaxOffer) {
      setPersonalBuyBoxes([]);
      setPreRunBuyBoxState("idle");
      return;
    }
    let cancelled = false;
    setPreRunBuyBoxState("loading");
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok || !result.canUse) {
          setPersonalBuyBoxes([]);
          setPreRunBuyBoxState(result.ok ? "ready" : "error");
          return;
        }
        setPersonalBuyBoxes(result.boxes);
        setPreRunBuyBoxState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPersonalBuyBoxes([]);
        setPreRunBuyBoxState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [canUseMaxOffer, isAuthenticated]);

  const preRunPropertyState = deriveStateFromAddress(watchedAddress);
  const eligiblePreRunBuyBoxes = useMemo(() => {
    return boxesForPersonalAnalyzerStrategy(
      personalBuyBoxes,
      activeStrategyKey as AnalyzerStrategyKey | null,
    )
      .filter((box) => box.isActive && buyBoxHasCriteria(box))
      .filter((box) =>
        buyBoxMatchesPropertyScope(box, {
          propertyType,
          state: preRunPropertyState,
        }),
      )
      .sort((a, b) =>
        a.isDefault === b.isDefault
          ? a.sortOrder - b.sortOrder
          : a.isDefault
            ? -1
            : 1,
      );
  }, [activeStrategyKey, personalBuyBoxes, preRunPropertyState, propertyType]);
  const preRunBuyBox = useMemo(() => {
    if (preRunCriteriaChoice === "starter") return null;
    return (
      eligiblePreRunBuyBoxes.find((box) => box.id === preRunCriteriaChoice) ??
      eligiblePreRunBuyBoxes[0] ??
      null
    );
  }, [eligiblePreRunBuyBoxes, preRunCriteriaChoice]);
  useEffect(() => {
    setPreRunCriteriaChoice(null);
  }, [activeStrategyKey, preRunPropertyState, propertyType]);
  useEffect(() => {
    if (!form.formState.dirtyFields.address || !preRunPropertyState) return;
    const rules = analysisDecisionBasis?.rules;
    if (rules?.kind !== "buy-box") return;
    const targetStates = rules.criteria.targetStates;
    if (
      targetStates.length > 0 &&
      !targetStates.includes(preRunPropertyState)
    ) {
      invalidateDecisionCriteriaForScopeChange();
    }
  }, [
    analysisDecisionBasis,
    form.formState.dirtyFields.address,
    invalidateDecisionCriteriaForScopeChange,
    preRunPropertyState,
  ]);
  const preRunBuyBoxTarget = useMemo(
    () =>
      preRunBuyBox
        ? chooseMaoTargetFromBuyBox(preRunBuyBox, {
            isCashPurchase: isAllCashDownPayment(watchedDownPaymentPct),
          })
        : null,
    [preRunBuyBox, watchedDownPaymentPct],
  );
  const starterPreRunTarget = useMemo(
    () =>
      buildMaoTarget(null, {
        isCashPurchase: isAllCashDownPayment(watchedDownPaymentPct),
      }),
    [watchedDownPaymentPct],
  );
  const watchedInterestRate = form.watch("interestRate");
  const watchedLoanTermYears = form.watch("loanTermYears");
  const watchedVacancyPct = form.watch("vacancyPct");
  const watchedMaintenancePct = form.watch("maintenancePct");
  const watchedMgmtPct = form.watch("mgmtPct");
  const watchedCapexPct = form.watch("capexPct");
  const livePreviewAssumptionBasis = [
    compactPercent(watchedDownPaymentPct) != null
      ? `${compactPercent(watchedDownPaymentPct)}% down`
      : null,
    compactPercent(watchedInterestRate) != null
      ? `${compactPercent(watchedInterestRate)}% interest`
      : null,
    compactPercent(watchedVacancyPct) != null
      ? `${compactPercent(watchedVacancyPct)}% vacancy`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
          maintenancePct: watchedMaintenancePct,
          vacancyPct: watchedVacancyPct,
          mgmtPct: watchedMgmtPct,
          capexPct: watchedCapexPct,
        },
        {
          hasResults: analysisResult != null,
          hasDecisionCriteria: Boolean(
            analysisMaoTarget &&
            analysisMaoTargetSource &&
            isAdoptedOfferCeilingTargetSource(analysisMaoTargetSource),
          ),
        },
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
      watchedMaintenancePct,
      watchedVacancyPct,
      watchedMgmtPct,
      watchedCapexPct,
      analysisResult,
      analysisMaoTarget,
      analysisMaoTargetSource,
    ],
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
    [scrollToAnalysisResults],
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
    (target: AssumptionChipTarget, focusFieldId?: string) => {
      if (focusFieldId) {
        setAdvancedOpen(true);
        if (target === "expenses") setExpenseDetailsOpen(true);
        // Both the outer accuracy panel and the nested expense disclosure
        // commit asynchronously. Wait for them, then move focus off the chip
        // and onto the exact assumption the user asked to edit.
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            const field =
              document.getElementById(focusFieldId) ??
              (document.getElementsByName(focusFieldId)[0] as
                | HTMLElement
                | undefined);
            field?.focus({ preventScroll: true });
            field?.scrollIntoView({
              behavior: scrollBehavior(),
              block: "center",
            });
          }, 70);
        });
        return;
      }
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
    [handleStepNavigate],
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
      (u, i) => `${i}:${u?.bedrooms ?? ""}:${u?.isOwnerOccupied ? "1" : "0"}`,
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
    const enrichmentGeneration = forkGenerationRef.current;

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
            }),
          ),
        );

        if (
          forkGenerationRef.current !== enrichmentGeneration ||
          lastSelectedAddressRef.current !== place
        ) {
          return;
        }

        const rentFingerprintBeforeFill = unitRentRollFingerprint(
          form.getValues(),
        );
        const priorRentCapture = enrichmentCaptureRef.current.monthlyRent;
        const priorUnitRentCaptureWasInvalidated = Boolean(
          priorRentCapture?.rentFingerprint &&
          (priorRentCapture.invalidated === true ||
            priorRentCapture.rentFingerprint !== rentFingerprintBeforeFill),
        );
        const filledLines: string[] = [];
        let filledRentSource: "hud-fmr" | "hud-safmr" | null = null;
        let filledRentDetail: string | undefined;
        let filledRentFetchedAt: string | undefined;
        for (let i = 0; i < pending.length; i++) {
          const { idx } = pending[i];
          const result = results[i];
          if (
            result.monthlyRent !== undefined &&
            isEmptyNumber(form.getValues(`units.${idx}.monthlyRent`))
          ) {
            form.setValue(`units.${idx}.monthlyRent`, result.monthlyRent, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
            filledLines.push(
              `Unit ${idx + 1}: $${Math.round(result.monthlyRent).toLocaleString()}/mo`,
            );
            if (!filledRentSource) {
              filledRentSource = result.meta.rent?.source ?? "hud-fmr";
              filledRentDetail = result.meta.rent?.county;
              filledRentFetchedAt = result.meta.rent
                ? String(result.meta.rent.year)
                : undefined;
            }
          }
        }
        if (filledLines.length > 0) {
          // Bind the HUD attribution to the exact complete rent roll, not a
          // scalar top-level rent (which multi-family models do not use). A $1
          // edit to any unit changes the shared rent fingerprint immediately,
          // so Input Confidence falls back to "Your entered rent" instead of
          // continuing to claim HUD. If a later HUD request fills another
          // empty row after the captured roll was edited, preserve that
          // invalidation rather than laundering the edited values back to HUD.
          enrichmentCaptureRef.current.monthlyRent = {
            source: filledRentSource ?? "hud-fmr",
            detail: filledRentDetail,
            fetchedAt: filledRentFetchedAt,
            rentFingerprint: unitRentRollFingerprint(form.getValues()),
            ...(priorUnitRentCaptureWasInvalidated
              ? { invalidated: true }
              : {}),
          };
          // Same disclosure contract as the single-family fill: a statewide
          // mean must never wear the local-FMR label.
          const anyStateAverage = results.some(
            (r) => r?.meta?.rent?.stateAverage === true,
          );
          toast({
            title: "Auto-filled per-unit rent",
            description: `${filledLines.join("  ·  ")} - ${
              anyStateAverage
                ? "No local HUD match — these are statewide averages; local rents vary widely, so adjust to comps."
                : "HUD FMR is an area average; adjust to local comps."
            }`,
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
          .filter((b) => Number.isFinite(b) && b > 0),
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
          setUnitFmrByBedrooms((prev) => ({
            ...(prev ?? {}),
            ...result.fmrByBedrooms,
          }));
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
   * property's facts + value/rent estimate. Empty or autofill-owned fields are
   * filled directly; manually entered values are preserved until the user
   * explicitly selects an estimate in the review dialog. On-demand by design:
   * a comp credit is spent only on a deliberate click, bounded by the per-user
   * + global caps in the action.
   */
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillUnavailable, setAutofillUnavailable] = useState(false);
  const [pendingAutofillReview, setPendingAutofillReview] = useState<{
    enrichment: PropertyEnrichment;
    conflicts: AutofillConflict[];
  } | null>(null);
  const [approvedAutofillFields, setApprovedAutofillFields] = useState<
    Set<AutofillField>
  >(() => new Set());
  // (listingUrl / listingUrlError / listingLinkOpen are declared up top so
  // resetToNewAnalysis can clear them — see the hero listing-link comment.)

  const applyComps = useCallback(
    (
      e: PropertyEnrichment,
      approvedOverwrites: ReadonlySet<AutofillField> = new Set(),
    ) => {
      const f = e.facts;
      const adopted = selectUnderwritingEnrichment(e);
      const filled: string[] = [];
      const mayWrite = (field: AutofillField, proposed: number) => {
        const decision = decideAutofillFieldWrite({
          currentValue: form.getValues(field),
          proposedValue: proposed,
          explicitlyApproved: approvedOverwrites.has(field),
        });
        // A coincidental match does not make RentCast the source of a value
        // already owned by the user, a template, or a restored deal.
        return decision.action === "write" && decision.reason !== "same-value";
      };
      const opts = {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      };
      if (f?.bedrooms != null && mayWrite("bedrooms", f.bedrooms)) {
        form.setValue("bedrooms", f.bedrooms, opts);
        filled.push("beds");
      }
      if (f?.bathrooms != null && mayWrite("bathrooms", f.bathrooms)) {
        form.setValue("bathrooms", f.bathrooms, opts);
        filled.push("baths");
      }
      if (f?.squareFootage != null && mayWrite("sqft", f.squareFootage)) {
        form.setValue("sqft", f.squareFootage, opts);
        filled.push("size");
      }
      // Only an active listing may become the ASKING price. With no listing
      // and an empty field, the AVM fills as a labeled, editable ESTIMATE
      // (block below) and is never presented as an asking price.
      const priceIsAsking = adopted.purchasePriceSource === "active-listing";
      let wroteAskingPrice = false;
      if (
        adopted.purchasePrice != null &&
        mayWrite("purchasePrice", adopted.purchasePrice)
      ) {
        form.setValue("purchasePrice", adopted.purchasePrice, opts);
        filled.push("asking price");
        wroteAskingPrice = priceIsAsking;
        if (priceIsAsking) {
          bindPurchasePriceProviderSource(
            {
              kind: "active-listing",
              provider: "rentcast",
              fetchedAt: e.fetchedAt,
            },
            adopted.purchasePrice,
            form.getValues("address"),
          );
        }
        setPriceEstimated(!priceIsAsking);
        setEstimatedPriceValue(
          priceIsAsking ? null : Math.round(adopted.purchasePrice),
        );
        setPriceEstimateBasis(
          priceIsAsking ? null : "RentCast's value estimate for this address",
        );
      }
      // No listing price and the user hasn't typed one: the AVM the lookup
      // already paid for fills the gap as a clearly-labeled, editable
      // ESTIMATE (same machinery as the hero rent-multiple path — amber
      // "Estimated purchase price" strip, never persisted as a fact). It
      // is never adopted as an asking price and never overwrites a typed
      // value. Without this, the field the analysis can't run without
      // stayed empty while RentCast's value estimate was silently thrown
      // away (founder-reported).
      let priceIsAvmEstimate = false;
      const avmEstimate = Number(e.valueEstimate);
      if (
        adopted.purchasePrice == null &&
        Number.isFinite(avmEstimate) &&
        avmEstimate > 0 &&
        isEmptyNumber(form.getValues("purchasePrice"))
      ) {
        const rounded = Math.round(avmEstimate);
        form.setValue("purchasePrice", rounded, opts);
        setEstimatedPriceValue(rounded);
        setPriceEstimateBasis("RentCast's value estimate for this address");
        setPriceEstimated(true);
        bindPurchasePriceProviderSource(
          {
            kind: "avm-estimate",
            provider: "rentcast",
            fetchedAt: e.fetchedAt,
          },
          rounded,
          form.getValues("address"),
        );
        priceIsAvmEstimate = true;
        filled.push("estimated value");
      }
      const pt = form.getValues("propertyType");
      if (
        adopted.monthlyRent != null &&
        (pt === "single-family" || pt === "owner-occupant") &&
        mayWrite("monthlyRent", adopted.monthlyRent)
      ) {
        form.setValue("monthlyRent", adopted.monthlyRent, opts);
        setMarketRentEstimate(adopted.monthlyRent);
        enrichmentCaptureRef.current.monthlyRent = {
          source: "rentcast-estimate",
          detail: "RentCast market-rent estimate",
          fetchedAt: e.fetchedAt,
          value: adopted.monthlyRent,
        };
        filled.push("estimated market rent");
      }
      if (filled.length > 0) {
        toast({
          title: "Auto-filled from address",
          description: `Filled ${filled.join(", ")} from RentCast.${
            wroteAskingPrice
              ? " Price is the active listing's asking price."
              : priceIsAvmEstimate
                ? " Price is RentCast's value estimate — replace it with the real asking price."
                : ""
          } Every value stays editable.`,
        });
      }
    },
    [bindPurchasePriceProviderSource, form, toast],
  );

  const findAutofillConflicts = useCallback(
    (enrichment: PropertyEnrichment): AutofillConflict[] => {
      const facts = enrichment.facts;
      const adopted = selectUnderwritingEnrichment(enrichment);
      const propertyType = form.getValues("propertyType");
      const candidates: Array<
        Omit<AutofillConflict, "current" | "proposed"> & {
          proposed: number | null | undefined;
        }
      > = [
        { field: "bedrooms", label: "Bedrooms", proposed: facts?.bedrooms },
        { field: "bathrooms", label: "Bathrooms", proposed: facts?.bathrooms },
        { field: "sqft", label: "Square feet", proposed: facts?.squareFootage },
        {
          field: "purchasePrice",
          label: "Purchase price",
          proposed: adopted.purchasePrice,
          proposedLabel:
            adopted.purchasePriceSource === "active-listing"
              ? "Active listing asking price"
              : "RentCast value estimate",
          currency: true,
        },
        {
          field: "monthlyRent",
          label: "Monthly rent",
          proposed:
            propertyType === "single-family" ||
            propertyType === "owner-occupant"
              ? adopted.monthlyRent
              : null,
          currency: true,
        },
      ];
      return candidates.flatMap((candidate) => {
        if (candidate.proposed == null || !Number.isFinite(candidate.proposed))
          return [];
        const currentValue = form.getValues(candidate.field);
        const decision = decideAutofillFieldWrite({
          currentValue,
          proposedValue: candidate.proposed,
        });
        if (decision.action !== "conflict") {
          return [];
        }
        const current = Number(currentValue);
        return [{ ...candidate, current, proposed: candidate.proposed }];
      });
    },
    [form],
  );

  const handleAutofillFromAddress = useCallback(async () => {
    const addr = (form.getValues("address") ?? "").trim();
    if (!addr) {
      toast({
        title: "Enter an address first",
        description: "Add the property address, then tap Autofill.",
      });
      return;
    }
    const propertyTypeAtRequest = form.getValues("propertyType");
    const autofillGeneration = forkGenerationRef.current;
    setIsAutofilling(true);
    try {
      const r = await getPropertyCompsAction({
        address: addr,
        propertyType: propertyTypeAtRequest,
      });
      if (
        forkGenerationRef.current !== autofillGeneration ||
        (form.getValues("address") ?? "").trim() !== addr ||
        form.getValues("propertyType") !== propertyTypeAtRequest
      ) {
        return;
      }
      if (r.ok) {
        const conflicts = findAutofillConflicts(r.enrichment);
        if (conflicts.length > 0) {
          setApprovedAutofillFields(new Set());
          setPendingAutofillReview({ enrichment: r.enrichment, conflicts });
        } else {
          applyComps(r.enrichment);
        }
        return;
      }
      if (r.code === "NOT_CONFIGURED") {
        setAutofillUnavailable(true);
        return;
      }
      // Signed-out users see this button as a deliberate sign-in CTA (see the
      // showAutofill comment below) — answering their first click with a red
      // error toast punished the exact action we invited. Offer the account
      // path; the anon draft watcher already preserves the typed address, so
      // they return to the same form and can autofill immediately.
      if (r.code === "SIGN_IN_REQUIRED") {
        toast({
          title: "Create a free account to autofill",
          description:
            "Beds, size, and market rent fill from the address. Your entries are kept while you sign up.",
          action: (
            <ToastAction
              altText="Create a free account and come back to this analysis"
              onClick={() => {
                router.push("/auth/sign-up?next=/dashboard/new");
              }}
            >
              Create free account
            </ToastAction>
          ),
        });
        return;
      }
      if (r.code === "ENTITLEMENT_REQUIRED") {
        toast({
          title: "Free lookup used",
          description: r.message,
          action: (
            <ToastAction
              altText="See Pro plans with 50 lookups per month"
              onClick={() => {
                router.push("/pricing");
              }}
            >
              See plans
            </ToastAction>
          ),
        });
        return;
      }
      const title =
        r.code === "CAP_REACHED"
          ? "Monthly limit reached"
          : r.code === "NOT_FOUND"
            ? "No data for this address"
            : "Couldn't autofill";
      toast({ title, description: r.message, variant: "destructive" });
    } catch {
      toast({
        title: "Couldn't autofill",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsAutofilling(false);
    }
  }, [form, applyComps, findAutofillConflicts, toast, router]);

  // Paste a Zillow/Redfin/Realtor link → parse the address from the URL slug
  // (we never fetch the page — those sites block bots with a captcha) and run it
  // through the hero-handoff flow: set address, enrich (HUD rent / FRED rate).
  // Pro users additionally get available beds/baths/sqft, market
  // rent, and either an active-listing asking price or a clearly labeled AVM
  // estimate from RentCast. Then it moves the user to review and run.
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
      zip: parsed.zip,
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
      const opts = { shouldDirty: true, shouldValidate: false } as const;
      const applied: Record<string, unknown> = {};
      const write = <K extends keyof InvestmentFormValues>(
        field: K,
        value: InvestmentFormValues[K],
      ) => {
        form.setValue(field, value as never, opts);
        applied[field] = value;
      };
      // Shared mapper keeps explicit/default template selection and strategy
      // starters identical, including PMI/MIP fields and sentinel handling.
      for (const { field, value } of buildTemplateFormPatch(starter.template)) {
        write(field, value);
      }
      return applied;
    },
    [form],
  );

  /** Preview only the starter values that differ from the live form so the
   *  strategy confirmation can name real consequences before any write. */
  const getStrategyStarterChangePreview = useCallback(
    (strategyKey: string): StrategyStarterPreview | null => {
      const strategy = getStrategyByKey(strategyKey);
      if (!strategy) return null;
      const starter = STARTER_TEMPLATES.find(
        (candidate) => candidate.key === strategy.starterKey,
      );
      if (!starter) return null;

      const currentValues = form.getValues();
      const sameValue = (current: unknown, next: unknown) => {
        if (current == null && next == null) return true;
        if (typeof next === "number") {
          const currentNumber =
            typeof current === "number" || typeof current === "string"
              ? Number(current)
              : Number.NaN;
          return Number.isFinite(currentNumber) && currentNumber === next;
        }
        return current === next;
      };
      const changed = buildTemplateFormPatch(starter.template).filter(
        ({ field, value }) => !sameValue(currentValues[field], value),
      );
      const byField = new Map(changed.map((entry) => [entry.field, entry]));
      const highlightFields: Array<{
        field: keyof InvestmentFormValues;
        label: string;
        suffix?: string;
      }> = [
        { field: "downPaymentPct", label: "Down payment", suffix: "%" },
        { field: "interestRate", label: "Rate", suffix: "%" },
        { field: "vacancyPct", label: "Vacancy", suffix: "%" },
        { field: "mgmtPct", label: "Management", suffix: "%" },
        { field: "maintenancePct", label: "Maintenance", suffix: "%" },
        { field: "capexPct", label: "CapEx", suffix: "%" },
        { field: "propertyTaxPct", label: "Property tax", suffix: "%" },
        { field: "insurancePct", label: "Insurance", suffix: "%" },
      ];
      const formatPreviewValue = (value: unknown, suffix = "") =>
        value == null || value === "" ? "not set" : `${String(value)}${suffix}`;
      const highlights = highlightFields.flatMap(({ field, label, suffix }) => {
        const entry = byField.get(field);
        if (!entry) return [];
        return [
          `${label} ${formatPreviewValue(currentValues[field], suffix)} → ${formatPreviewValue(entry.value, suffix)}`,
        ];
      });

      return {
        changedFieldCount: changed.length,
        highlights: highlights.slice(0, 3),
      };
    },
    [form],
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
    if (enrichmentCaptureRef.current.interestRate)
      skipFields.add("interestRate");
    const patch = buildTemplateFormPatch(tpl, { skipFields });
    if (patch.length === 0) return;
    // Snapshot exactly what we're about to overwrite (+ templateId) so
    // Undo restores the untouched form, not a blanket factory reset.
    autoApplyUndoRef.current = [
      ...patch.map(({ field }) => ({ field, value: form.getValues(field) })),
      { field: "templateId" as const, value: form.getValues("templateId") },
    ];
    isProgrammaticResetRef.current = true;
    const opts = {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    };
    for (const { field, value } of patch)
      form.setValue(field, value as never, opts);
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
        <ToastAction
          altText="Undo — use standard defaults instead"
          onClick={undoAutoAppliedTemplate}
        >
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
  const handleTemplatesLoaded = useCallback(
    (templates: AnalysisTemplateOption[]) => {
      defaultTemplateRef.current = templates.find((t) => t.isDefault) ?? null;
      // Keep the full list for template-name resolution in the assumptions
      // strip / receipt (the chip shows "Template: <name> ✓").
      setTemplateOptions(templates);
      autoApplyDefaultTemplateRef.current();
    },
    [],
  );

  /** Explicit selector picks reconcile the auto-apply. The Undo toast can
   *  be evicted within seconds (TOAST_LIMIT=1 — the enrichment toast
   *  replaces it), so "None" doubles as the durable escape hatch: while
   *  the auto-apply snapshot is live it restores the pre-apply values
   *  (no-op otherwise — explicit-pick users keep today's behavior). An
   *  explicit template pick supersedes the auto-apply instead: drop the
   *  snapshot so a later "None"/Undo can't stomp the user's choice. */
  const handleExplicitTemplateChange = useCallback(
    (templateId: string | null) => {
      if (templateId) {
        // Only the snapshot is dropped — NOT the suppressed flag, so a
        // future "New Analysis" reset still auto-applies their default.
        autoApplyUndoRef.current = null;
        return;
      }
      undoAutoAppliedTemplateRef.current();
    },
    [],
  );

  /**
   * "What's your play?" chip handler. Tailors the form to the chosen investor
   * strategy and points the results view at the tab that leads with its key
   * number. Chip clicks explicitly choose whether to keep current shared
   * assumptions or apply the play's starter set. Link-seeded strategies retain
   * the established starter behavior. null ("Clear") can either keep current
   * shared assumptions or restore the safe pre-play snapshot.
   */
  const handleSelectStrategy = useCallback(
    // `source` separates real chip clicks from link-seeded landings
    // (persona pages / homepage persona cards) in analytics, so seeded
    // traffic can't inflate chip-engagement numbers.
    (
      key: string | null,
      source: "chip" | "link" = "chip",
      assumptionMode: StrategyAssumptionMode = "starter",
    ) => {
      // The URL parser and visible chips are gated too, but this handler is
      // the authoritative state-materialization boundary. A crafted browser
      // event or future caller cannot apply starter inputs for a dark model.
      if (key && !isSpecialistStrategyEnabled(key)) return;
      // Choosing another lens is an explicit request to leave the recorded
      // specialist view. The normal form watcher/Run path will produce current
      // outputs; until then, never keep presenting the prior strategy snapshot
      // as if it belonged to the new selection.
      setRecordedSpecialistAnalysis(null);
      invalidateDecisionCriteriaForScopeChange();
      const strategy = getStrategyByKey(key);
      const strOpts = { shouldDirty: true, shouldValidate: false } as const;
      const snapshotRevertFields = (): Record<string, unknown> => {
        const values = form.getValues() as unknown as Record<string, unknown>;
        const snapshot: Record<string, unknown> = {};
        for (const field of STRATEGY_REVERTABLE_FIELDS)
          snapshot[field] = values[field];
        return snapshot;
      };
      if (!strategy) {
        const defaultStrategy = getStrategyByKey(DEFAULT_STRATEGY_KEY);
        const wasUsingStrategy = activeStrategyKeyRef.current !== null;
        const keptRestoredAssumptions =
          wasUsingStrategy && strategyRevertRef.current === null;
        setActiveStrategyKey(null);
        activeStrategyKeyRef.current = null;
        if (assumptionMode === "keep") {
          // The user explicitly chose continuity over a revert. Release the
          // strategy's ownership markers, retain every shared form value, and
          // clear only STR-only income fields that the Buy & Hold model cannot
          // interpret. No financing, reserve, growth, tax, or exit input moves.
          strategyRevertRef.current = null;
          strategyAppliedRef.current = null;
          if (
            defaultStrategy &&
            form.getValues("propertyType") !== defaultStrategy.propertyType
          ) {
            form.setValue(
              "propertyType",
              defaultStrategy.propertyType,
              strOpts,
            );
          }
          form.setValue("avgDailyRate", undefined, strOpts);
          form.setValue("occupancyPct", undefined, strOpts);
          form.setValue("strFurnishingCost", undefined, strOpts);
          if (wasUsingStrategy) {
            toast({
              title: "Buy & Hold view selected",
              description:
                "Your financing, expense, growth, and tax assumptions were kept. Review the rent before running again.",
            });
          }
          return;
        }
        if (assumptionMode === "starter" && defaultStrategy) {
          if (form.getValues("propertyType") !== defaultStrategy.propertyType) {
            form.setValue(
              "propertyType",
              defaultStrategy.propertyType,
              strOpts,
            );
          }
          const applied = applyStarterAssumptions(defaultStrategy.starterKey);
          strategyRevertRef.current = null;
          strategyAppliedRef.current = applied
            ? { label: defaultStrategy.label, fields: applied }
            : null;
          form.setValue("avgDailyRate", undefined, strOpts);
          form.setValue("occupancyPct", undefined, strOpts);
          form.setValue("strFurnishingCost", undefined, strOpts);
          toast({
            title: "Buy & Hold starter values applied",
            description:
              "Review the financing, expenses, and monthly rent before running again.",
          });
          return;
        }
        // "Clear" has to mean clear. Put back what the play overwrote:
        // property type (whose restore hands the parked rent / beds / baths
        // / sq ft back through the type-switch stash), financing, tax and
        // the rest of the starter set — but never a field the user has
        // edited since, because that number is theirs now.
        const revert = planStrategyRevert(
          strategyRevertRef.current,
          form.getValues() as unknown as Record<string, unknown>,
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
            // Recompute against RHF's real defaults. This clears the dirty
            // flags created by a strategy for factory/account defaults while
            // preserving a genuinely user-edited pre-strategy value.
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: false,
          });
        }
        // Clear STR income fields so a derived ADR×occupancy income can't leak
        // into the default (monthly-rent) flow after the chip is cleared.
        form.setValue("avgDailyRate", undefined, strOpts);
        form.setValue("occupancyPct", undefined, strOpts);
        form.setValue("strFurnishingCost", undefined, strOpts);
        if (keptRestoredAssumptions) {
          toast({
            title: "Buy & Hold view selected",
            description:
              "Your saved assumptions were kept because this browser does not have the earlier pre-strategy baseline. Review financing and expenses before running again.",
          });
        }
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
      const applied =
        assumptionMode === "starter"
          ? applyStarterAssumptions(strategy.starterKey)
          : null;
      if (applied) for (const field of Object.keys(applied)) written.add(field);
      const materializeStrategyDefault = (
        field: StrategyInputField,
        value: number,
      ) => {
        if (form.getValues(field) != null) return;
        form.setValue(field, value as never, {
          shouldDirty: true,
          shouldValidate: false,
        });
        if (applied) applied[field] = value;
        written.add(field);
      };
      // These values were previously only visual `??` fallbacks. Write them
      // into the form so Save/draft/share freeze the assumptions the user
      // actually saw; future default changes cannot rewrite history.
      if (strategy.key === "brrrr") {
        materializeStrategyDefault("strategyHoldMonths", 6);
        materializeStrategyDefault("brrrrRefiLtvPct", 75);
        materializeStrategyDefault(
          "brrrrRefiRatePct",
          Number(form.getValues("interestRate")),
        );
        materializeStrategyDefault("brrrrRefiTermYears", 30);
        materializeStrategyDefault("brrrrRefiClosingCostsPct", 2);
      } else if (strategy.key === "fix-flip") {
        materializeStrategyDefault("strategyHoldMonths", 6);
        materializeStrategyDefault("fixFlipSellingCostsPct", 7);
        materializeStrategyDefault(
          "fixFlipDownPaymentPct",
          Number(form.getValues("downPaymentPct")),
        );
      }
      // Record what the play wrote so the assumption chips badge those
      // values as "<play>" defaults, not "yours" (BROWSER-2). A field drops
      // out of the owned set the moment its value diverges (a real user
      // edit); the whole set drops on Clear, which now restores the values
      // the badges were describing.
      strategyAppliedRef.current = applied
        ? {
            label:
              strategy.key === "wholesale-mao"
                ? "Wholesale / Offer Ceiling"
                : strategy.label,
            fields: applied,
          }
        : null;
      // The starter set just overwrote any applied template's values —
      // leaving templateId linked would resurface "Template: <name> ✓"
      // after Clear over numbers that are no longer the template's, and a
      // Save would persist the stale template_id
      // (TEMPLATE-CHIP-STALE-AFTER-STRATEGY).
      if (assumptionMode === "starter" && form.getValues("templateId")) {
        form.setValue("templateId", undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
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
      activeStrategyKeyRef.current = strategy.key;
      // BRRRR/Flip render their model inline as the results hero, so don't also
      // lead the Details tabs with the (duplicate) Strategies tab - default to
      // cash-flow context. Wholesale keeps Stress Test so "Adjust targets" lands.
      pointDashboardAt(
        strategy.primaryTab === "strategies"
          ? "cash-flow"
          : strategy.primaryTab,
      );
      setAdvancedOpen(false);
      trackEvent("strategy_selected", {
        strategy: strategy.key,
        source,
        assumptionMode,
      });
    },
    [
      form,
      applyStarterAssumptions,
      pointDashboardAt,
      toast,
      invalidateDecisionCriteriaForScopeChange,
    ],
  );

  const buildTaxStrategySource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult,
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
    result: AnalysisResult,
  ) => ({
    analysisId,
    input: {
      monthlyRentalIncome:
        result.monthlyRentalIncome + (result.recurringOtherIncomeMonthly ?? 0),
      scheduledRentMonthly: result.monthlyRentalIncome,
      recurringOtherIncomeMonthly: result.recurringOtherIncomeMonthly ?? 0,
      fixedOperatingExpensesMonthly:
        result.propertyTax +
        result.insurance +
        result.hoa +
        result.utilities +
        (result.recurringOtherExpenseMonthly ?? 0) +
        (result.turnoverReserveMonthly ?? 0) +
        (result.leasingReserveMonthly ?? 0) +
        (result.landscapingMonthly ?? 0) +
        (result.pestControlMonthly ?? 0) +
        (result.administrativeMonthly ?? 0),
      vacancyPct: values.vacancyPct,
      maintenancePct: values.maintenancePct,
      managementPct: values.mgmtPct,
      capexPct: values.capexPct,
      totalOperatingExpenses: result.totalOperatingExpenses,
      capexReserveMonthly: result.capex,
      monthlyPayment: result.monthlyPayment,
      pmiMonthly: result.pmiMonthly,
      pmiNoCancel: mortgageInsuranceRunsToPayoff(
        values.propertyType,
        values.pmiNoCancel,
      ),
      interestRate: values.interestRate,
      loanTermYears: values.loanTermYears,
      amortizationTermYears:
        values.amortizationTermYears ?? values.loanTermYears,
      interestOnlyMonths: values.interestOnlyMonths ?? 0,
      loanAmount: result.loanAmount,
      purchasePrice: values.purchasePrice,
      taxSavingsMonthly: result.taxSavingsMonthly,
      annualDepreciation: result.annualDepreciation,
      yearlyInterestSchedule: result.yearlyInterestSchedule,
      rentGrowthPct: values.rentGrowthPct,
      expenseGrowthPct: values.expenseGrowthPct,
      taxRate: result.effectiveTaxRate,
      includeInterestDeduction: values.includeInterestDeduction !== false,
      renovationStartMonth: values.renovationStartMonth,
      renovationDurationMonths: values.renovationDurationMonths,
      renovationRentLossPct: values.renovationRentLossPct,
    },
    initialYears: result.tenYearProjection,
  });

  const buildExitScenarioSource = (
    analysisId: string | null,
    values: InvestmentFormValues,
    result: AnalysisResult,
    projectionYears: ProjectionYear[],
    taxStrategyYears: TaxStrategyYear[],
  ) => {
    const exitRates = resolveExitScenarioRates(values);
    const input: ExitScenarioInput = {
      purchasePrice: values.purchasePrice,
      appreciationRate: exitRates.appreciationRate,
      sellingCostPct: exitRates.sellingCostPct,
      loanAmount: result.loanAmount,
      interestRate: values.interestRate,
      loanTermYears: values.loanTermYears,
      amortizationTermYears:
        values.amortizationTermYears ?? values.loanTermYears,
      interestOnlyMonths: values.interestOnlyMonths ?? 0,
      monthlyPayment: result.monthlyPayment,
      downPayment: result.downPayment,
      closingCosts: result.closingCosts,
      initialCashInvested: result.totalCashRequired,
      cumulativeCashFlowByYear: projectionYears.map(
        (year) => year.cumulativeCashFlowAnnual,
      ),
      cumulativeTaxBenefitByYear: taxStrategyYears.map(
        (year) => year.cumulativeTaxBenefitAnnual,
      ),
      annualDepreciation: taxStrategyYears[0]?.depreciationDeductionAnnual ?? 0,
    };

    return {
      analysisId,
      input,
      initialYears: buildExitScenarios(input),
    };
  };

  const mergeSavedResultSnapshot = (
    methodologyVersion: unknown,
    rawSnapshot: unknown,
    computedResult: AnalysisResult,
    values: InvestmentFormValues,
  ) => {
    // Saved results are recorded history, including same-standard rows. Only
    // explicitly unpinned legacy rows retain the labeled compatibility
    // recompute; re-running is always a separate user action.
    const score = computeDealScore(
      buildDealScoreInputFromAnalysis(values, computedResult),
    );
    return resolveSavedAnalysisResult({
      methodologyVersion,
      resultSnapshot: rawSnapshot,
      recomputedResult: computedResult,
      recomputedExtras: {
        score: score.score,
        recommendation: score.recommendation,
        riskLevel: score.riskLevel,
        breakdown: score.breakdown,
        explanation: score.explanation,
      },
    });
  };

  // Reassigned every render so it closes over the current entitlement flags,
  // builders, and form state. Mirrors onSubmit's output wiring but with NO
  // server call, spinner, toast, or analytics — pure client math for an
  // instant live update. Snapshot sources use a null analysisId so the Pro
  // panels render from the freshly computed years locally instead of firing
  // snapshot fetch/upsert server actions on every keystroke.
  recomputeOutputsFromFormRef.current = () => {
    if (isProgrammaticResetRef.current || isCalculatingRef.current) return;
    // The sample launcher stages many field writes before its deferred submit.
    // Treat that window as one atomic demo run; a live recompute in between
    // would retire the sample criteria before the background-tab backstop can
    // submit the fixture.
    if (pendingSampleRunRef.current) return;
    const baseline = lastComputedFormJsonRef.current;
    // No prior run → the first FULL compute stays an explicit Run (preserving
    // the funnel events, loading state, and server-action gating in onSubmit).
    // But we DO compute a lightweight live preview so the verdict forms as the
    // user types - the magic moment - without any of that machinery.
    if (baseline === null) {
      // previewParse (not the full schema): the live verdict forms on
      // price + rent alone — address is required for save/share but the
      // math never reads it, so it must not gate the magic moment.
      const liveValues = form.getValues();
      if (!isReleasedUnderwritingSnapshot(liveValues)) {
        setLivePreview(null);
        return;
      }
      const liveParsed = previewParse(liveValues);
      if (liveParsed.success) {
        try {
          const r = calculateAnalysis(liveParsed.data);
          // The reverse-price solver is a paid feature. Pro customers get a
          // break-even preview here; Free visitors get the factual metrics and
          // nonnumeric next-step guidance rendered by LiveVerdictPanel.
          // Offer Ceiling is resolved only after a full analysis through the
          // entitlement-aware server action. The pre-submit live preview
          // deliberately carries no exact reverse-solver output.
          const breakEven = null;
          const tier = getDealTier(r);
          setLivePreview({
            netCashFlow: r.netCashFlow,
            capRate: r.capRate,
            dscr: r.dscr,
            monthlyPayment: r.monthlyPayment,
            breakEvenPrice: breakEven,
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
    const parsed = releasedInvestmentFormSchema.safeParse(form.getValues());
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
    if (
      estimatedPriceValue != null &&
      values.purchasePrice !== estimatedPriceValue
    ) {
      setEstimatedPriceValue(null);
      setPriceEstimated(false);
      setPurchasePriceSourceLabel(null);
      purchasePriceSourceRef.current = null;
      purchasePriceProvenanceAddressRef.current = null;
      purchasePriceProvenanceValueRef.current = null;
    }
    const result = calculateAnalysis(values);

    // Editing away from the sample deal ends the Pro preview — the unlock is
    // for the demo numbers only, so panels re-gate to the real entitlement.
    setIsSampleProPreview(false);
    // …and the sample's example targets end with it. The live recompute is
    // now grading the USER's edited numbers; example rules must not keep
    // scoring them as "your selected targets" (they were never adopted).
    if (sampleSeededMaoTargetRef.current) {
      sampleSeededMaoTargetRef.current = false;
      analysisMaoTargetRef.current = null;
      setAnalysisMaoTarget(null);
      setAnalysisMaoTargetSource("screening-defaults");
      analysisDecisionBasisRef.current = null;
      setAnalysisDecisionBasis(null);
      setDecisionBasisNeedsReview(false);
      clearPendingMaoTarget();
    }
    // These outputs were just recomputed from the live form. They are no
    // longer a historical saved-analysis view, so a frozen/legacy provenance
    // label would be stale and misleading.
    setSavedMethodologyLabel(null);
    setRecordedOfferCeiling(null);
    setRecordedSpecialistAnalysis(null);
    setAnalysisResult(result);
    setAnalysisValues(values);
    setProjectionSource(
      canUseProjections ? buildProjectionSource(null, values, result) : null,
    );
    setTaxStrategySource(
      canUseTaxStrategy ? buildTaxStrategySource(null, values, result) : null,
    );
    setExitScenarioSource(
      canUseExitScenarios
        ? buildExitScenarioSource(
            null,
            values,
            result,
            result.tenYearProjection,
            result.taxStrategyYears,
          )
        : null,
    );
    // Screening Index recomputed client-side with the same pure fn the server
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
    const subscription = form.watch((values, { name }) => {
      if (isProgrammaticResetRef.current) return;
      const grantedFormSnapshot = anonymousDecisionGrantFormJsonRef.current;
      if (
        grantedFormSnapshot !== null &&
        !anonymousDecisionPresentationGrantMatches(
          grantedFormSnapshot,
          formSnapshotForCompare(values as InvestmentFormValues),
        )
      ) {
        // Clear before the debounced live recompute. Sensitivity is computed
        // entirely in the browser, so even a brief stale presentation grant
        // would expose a second resource without server verification.
        clearAnonymousDecisionPresentationGrant();
      }
      // Invalidate an in-flight server score before the debounced live
      // recompute runs. Otherwise a fast response can briefly pair score A
      // with the investor's already-edited result B.
      dealScoreRequestRef.current += 1;
      setIsLoadingDealScore(false);
      // The visible provider/screening receipt is bound to BOTH property
      // identity and the exact adopted value. Clear it on the first address or
      // price edit (including programmatic writes), before the debounced
      // recompute can present the new number under the old source label.
      const priceProvenanceAddress = purchasePriceProvenanceAddressRef.current;
      const priceProvenanceValue = purchasePriceProvenanceValueRef.current;
      if (
        priceProvenanceAddress !== null &&
        (name === "address" ||
          name === "purchasePrice" ||
          normalizeAutofillPropertyAddress(values.address) !==
            priceProvenanceAddress ||
          Number(values.purchasePrice) !== priceProvenanceValue)
      ) {
        detachPersistedPurchasePriceSource();
        purchasePriceSourceRef.current = null;
        purchasePriceProvenanceAddressRef.current = null;
        purchasePriceProvenanceValueRef.current = null;
        setPurchasePriceSourceLabel(null);
        setPriceEstimated(false);
        setEstimatedPriceValue(null);
        setPriceEstimateBasis(null);
      }
      // SourceContext has no address by design. The first user-driven address
      // change permanently detaches the reopened deal's source context, even
      // if the next property happens to use the same numeric assumptions.
      const persistedAddress = persistedInputConfidenceAddressRef.current;
      if (
        persistedAddress !== null &&
        normalizeAutofillPropertyAddress(values.address) !== persistedAddress
      ) {
        persistedInputConfidenceSourceContextRef.current = null;
        persistedInputConfidenceAddressRef.current = null;
      }
      const verificationAddress = inputVerificationAddressRef.current;
      if (
        verificationAddress !== null &&
        normalizeAutofillPropertyAddress(values.address) !== verificationAddress
      ) {
        setInputVerification({});
        inputVerificationAddressRef.current = null;
      }
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
  }, [
    clearAnonymousDecisionPresentationGrant,
    detachPersistedPurchasePriceSource,
    form,
    syncFormDirtyVersusPersisted,
  ]);

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
    const subscription = form.watch(() => {
      if (isProgrammaticResetRef.current) return;
      // Loaded-saved-deal flow owns its own persistence; don't shadow it.
      if (savedDealIdRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // The synthetic demo is a disposable product tour, not the investor's
        // next deal. Persisting its values made every later login reopen the
        // sample as an apparent draft and forced repeat users to clear it by
        // hand before real work. Preserve any earlier genuine draft instead.
        if (pendingSampleRunRef.current || sampleSeededMaoTargetRef.current) {
          return;
        }
        // Sample-seeded example targets are session theater, not user
        // adoption — persisting them would resurrect "your selected
        // targets" on the next reload of a deal the user never targeted.
        const sampleSeeded = sampleSeededMaoTargetRef.current;
        const currentValues = form.getValues();
        writeCalcDraftWithMaoTarget(
          currentValues,
          sampleSeeded ? null : analysisMaoTargetRef.current,
          sampleSeeded ? "screening-defaults" : analysisMaoTargetSource,
          activeStrategyKeyRef.current,
          buildLiveInputConfidenceSourceContext(
            currentValues,
            form.formState.dirtyFields as Record<string, unknown>,
          ),
          sampleSeeded ? null : analysisDecisionBasisRef.current,
        );
      }, CALC_FORM_DRAFT_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [analysisMaoTargetSource, buildLiveInputConfidenceSourceContext, form]);

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
    const duplicateHandoffNonce = handoffParams.get(
      DEAL_DUPLICATE_HANDOFF_PARAM,
    );
    const analyzerHandoff = consumeAnalyzerHandoff(
      window.location.search,
      window.sessionStorage,
    );
    const requestedExplicitFreshAnalysis = handoffParams.get("fresh") === "1";
    const hasBillingReturn =
      handoffParams.has("billing") || handoffParams.has("session_id");
    // The flag is an instruction, not durable page state. Remove it before
    // any save can add ?savedDeal= or a refresh can repeat the reset. Keep the
    // parsed value above for this one initialization pass.
    if (requestedExplicitFreshAnalysis) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("fresh");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      } catch {
        /* URL cleanup is best-effort; initialization below still runs once. */
      }
    }
    // A legacy (pre-nonce) tab always arrives at a bare "/"; a new-scheme
    // open always carries a nonce param. So the un-nonced shared keys are
    // only a valid fallback when NEITHER param is present — otherwise a
    // new-scheme open must never consume an orphaned legacy key of the
    // other handoff type.
    const allowLegacyHandoff =
      editHandoffNonce === null && duplicateHandoffNonce === null;
    if (!allowLegacyHandoff) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete(DEAL_EDIT_HANDOFF_PARAM);
        url.searchParams.delete(DEAL_DUPLICATE_HANDOFF_PARAM);
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      } catch {
        /* history unavailable — a stale param only costs a no-op re-read */
      }
    }
    if (initialSavedDeal && !initialSavedDeal.ok) {
      toast({
        title: "Couldn't open this deal",
        description: initialSavedDeal.message,
        variant: "destructive",
      });
      resetToNewAnalysis("single-family");
      setSavedTemplateFallback(null);
      replaceSavedDealUrl(null);
      return;
    }

    // Every dashboard New Analysis entry carries ?fresh=1. Unlike the
    // same-route shell event, a cross-route navigation remounts this page;
    // without an explicit mount branch the anonymous auto-draft below wins
    // and the button labelled "New Analysis" quietly reopens the old deal.
    // Preserve every intentional continuity path: a server-loaded saved deal,
    // nonce-keyed edit/duplicate handoff, or calculator/persona handoff is
    // stronger evidence than the generic fresh flag.
    const requestsExplicitFreshAnalysis = shouldStartFreshAnalysis({
      requested: requestedExplicitFreshAnalysis,
      hasInitialSavedDeal: Boolean(initialSavedDeal),
      hasEditHandoff: editHandoffNonce !== null,
      hasDuplicateHandoff: duplicateHandoffNonce !== null,
      hasAnalyzerHandoff: analyzerHandoff !== null,
      hasBillingReturn,
    });
    if (requestsExplicitFreshAnalysis) {
      resetToNewAnalysis("single-family");
      setSavedTemplateFallback(null);
      replaceSavedDealUrl(null);
      return;
    }
    const reopenPayloadRaw = initialSavedDeal?.ok
      ? JSON.stringify({
          id: initialSavedDeal.id,
          schemaVersion: initialSavedDeal.schemaVersion,
          methodologyVersion: initialSavedDeal.methodologyVersion,
          underwritingRevision: initialSavedDeal.underwritingRevision,
          pipelineStage: initialSavedDeal.pipelineStage,
          formSnapshot: initialSavedDeal.formSnapshot,
          templateFallback: initialSavedDeal.templateFallback,
          resultSnapshot: initialSavedDeal.resultSnapshot,
        })
      : consumeSavedDealHandoffPayload(
          SAVED_ANALYSIS_EDIT_DRAFT_KEY,
          editHandoffNonce,
          allowLegacyHandoff,
        );
    const autoExportPdfFlag =
      window.sessionStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY) ??
      window.localStorage.getItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    if (autoExportPdfFlag === "1") {
      autoExportPdfRef.current = true;
      window.sessionStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
      window.localStorage.removeItem(SAVED_ANALYSIS_AUTO_EXPORT_PDF_KEY);
    }

    // Duplicate handoff (My Deals → "Duplicate"): fork reusable financing and
    // policy percentages into a NEW deal, while clearing property identity,
    // rents, parcel/quote costs, repairs, and property provenance. No
    // savedDealId → a save is a fresh insert (never overwrites the original).
    // Checked before the edit-draft path; isolated from it.
    const duplicatePayloadRaw = consumeSavedDealHandoffPayload(
      SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY,
      duplicateHandoffNonce,
      allowLegacyHandoff,
    );
    if (duplicatePayloadRaw) {
      try {
        const parsed = JSON.parse(duplicatePayloadRaw) as {
          formSnapshot?: unknown;
          analyzerStrategyKey?: unknown;
        };
        // Lenient fallback: the fork wipes address/price/rents anyway, so a
        // legacy snapshot the strict schema rejects (e.g. a pre-Apr-2026
        // 0-rent unit) can still donate its assumptions — this keeps
        // "Duplicate assumptions" working as the recovery path for frozen
        // legacy deals.
        const normalized =
          normalizeReleasedInvestmentFormSnapshot(parsed.formSnapshot) ??
          normalizeReleasedInvestmentFormDraft(parsed.formSnapshot);
        if (normalized) {
          const forked = buildRepeatDealDraft(normalized);
          prevPropertyTypeRef.current = normalized.propertyType;
          form.reset(forked);
          const duplicatedAnalyzerStrategyKey = persistedAnalyzerStrategyKey(
            parsed.analyzerStrategyKey,
            normalized,
          );
          const duplicatedActiveStrategy = activeStrategyStateKey(
            duplicatedAnalyzerStrategyKey,
          );
          activeStrategyKeyRef.current = duplicatedActiveStrategy;
          setActiveStrategyKey(duplicatedActiveStrategy);
          strategyAppliedRef.current = buildStrategyAppliedSnapshot(
            duplicatedActiveStrategy,
          );
          // A duplicate has no property identity yet. Never carry the source
          // deal's Buy Box or custom ceiling into that blank property: both can
          // be market/model-specific, and the new address must resolve its own
          // eligible criteria. Reusable financing and expense assumptions still
          // come from buildRepeatDealDraft above.
          analysisMaoTargetRef.current = null;
          setAnalysisMaoTarget(null);
          setAnalysisMaoTargetSource(null);
          analysisDecisionBasisRef.current = null;
          setAnalysisDecisionBasis(null);
          decisionBasisNeedsReviewRef.current = false;
          setDecisionBasisNeedsReview(false);
          setPreRunCriteriaChoice(null);
          setPreRunCriteriaDraft(null);
          clearPendingMaoTarget();
          // Persist the blank-identity fork immediately; the debounced watcher
          // is intentionally suppressed during this programmatic reset. Later
          // user edits rebind the same target through the normal draft writer.
          writeCalcDraftWithMaoTarget(
            forked,
            null,
            "screening-defaults",
            activeStrategyKeyRef.current,
            undefined,
            null,
          );
          setInputVerification({});
          inputVerificationAddressRef.current = null;
          persistedInputConfidenceSourceContextRef.current = null;
          persistedInputConfidenceAddressRef.current = null;
          enrichmentCaptureRef.current = {};
          setSavedTemplateFallback(null);
          setMarketRentEstimate(null);
          setUnitFmrByBedrooms(null);
          unitFmrKeyRef.current = null;
          lastSelectedAddressRef.current = null;
          lastEnrichedAddressRef.current = null;
          lastEnrichedGeoRef.current = null;
          setListingLinkOpen(false);
          setListingUrl("");
          setListingUrlError(false);
          setListingImportStatus(null);
          setPriceEstimated(false);
          setEstimatedPriceValue(null);
          setPriceEstimateBasis(null);
          setPurchasePriceSourceLabel(null);
          purchasePriceSourceRef.current = null;
          purchasePriceProvenanceAddressRef.current = null;
          purchasePriceProvenanceValueRef.current = null;
          // New deal: no savedDealId, no results yet (price/rent cleared → the
          // live preview forms once the user enters the new property).
          toast({
            title: "Assumptions duplicated",
            description:
              "Enter the new property's address, price, and rent. Financing and percentage policies carried over; property-specific costs need review.",
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
          methodologyVersion?: unknown;
          underwritingRevision?: unknown;
          pipelineStage?: unknown;
        };
        const normalized = normalizeReleasedInvestmentFormSnapshot(
          parsed.formSnapshot,
        );
        if (normalized && typeof parsed.id === "string") {
          const parsedTemplateFallback =
            parsed.templateFallback &&
            typeof parsed.templateFallback === "object" &&
            !Array.isArray(parsed.templateFallback) &&
            typeof (parsed.templateFallback as { id?: unknown }).id ===
              "string" &&
            typeof (parsed.templateFallback as { templateName?: unknown })
              .templateName === "string"
              ? {
                  id: (parsed.templateFallback as { id: string }).id,
                  templateName: (
                    parsed.templateFallback as { templateName: string }
                  ).templateName,
                  templateDescription:
                    typeof (
                      parsed.templateFallback as {
                        templateDescription?: unknown;
                      }
                    ).templateDescription === "string"
                      ? (
                          parsed.templateFallback as {
                            templateDescription: string;
                          }
                        ).templateDescription
                      : null,
                }
              : null;
          const hydratedValues: InvestmentFormValues = {
            ...normalized,
            templateId:
              normalized.templateId ?? parsedTemplateFallback?.id ?? undefined,
          };
          prevPropertyTypeRef.current = hydratedValues.propertyType;
          form.reset(hydratedValues);
          seedRestoredAddressIdentity(hydratedValues.address);
          setSavedDealId(parsed.id);
          savedDealIdRef.current = parsed.id;
          savedUnderwritingRevisionRef.current = parseSavedAnalysisRevision(
            parsed.underwritingRevision,
          );
          replaceSavedDealUrl(parsed.id);
          setLoadedPipelineStage(
            typeof parsed.pipelineStage === "string"
              ? parsed.pipelineStage
              : null,
          );
          lastPersistedFormJsonRef.current =
            formSnapshotForCompare(hydratedValues);
          lastComputedFormJsonRef.current =
            formSnapshotForCompare(hydratedValues);
          setSavedTemplateFallback(parsedTemplateFallback);
          const savedResultRecord =
            parsed.resultSnapshot &&
            typeof parsed.resultSnapshot === "object" &&
            !Array.isArray(parsed.resultSnapshot)
              ? (parsed.resultSnapshot as Record<string, unknown>)
              : null;
          // Restore the exact analysis lens recorded with the result. Key
          // only — the saved form values remain the source of truth, so no
          // starter assumptions are reapplied. Legacy rows safely infer STR
          // only because ADR changes the income formula; advanced strategies
          // are never guessed from overlapping numeric values.
          const restoredAnalyzerStrategyKey =
            resolveCompatibleAnalyzerStrategyKey(
              savedResultRecord?.analyzerStrategyKey,
              hydratedValues,
            );
          const restoredActiveStrategy = activeStrategyStateKey(
            restoredAnalyzerStrategyKey,
          );
          activeStrategyKeyRef.current = restoredActiveStrategy;
          setActiveStrategyKey(restoredActiveStrategy);
          strategyAppliedRef.current = buildStrategyAppliedSnapshot(
            restoredActiveStrategy,
          );
          clearPendingMaoTarget();
          const restoredMaoTarget = normalizeMaoTarget(
            savedResultRecord?.maxOfferTarget,
          );
          const restoredMaoTargetSource = normalizeOfferCeilingTargetSource(
            savedResultRecord?.maxOfferTargetSource,
          );
          const restoredDecisionBinding = restoreDecisionBasisBinding({
            basis: savedResultRecord?.[OFFER_CEILING_DECISION_BASIS_FIELD],
            target: restoredMaoTarget,
            source: restoredMaoTargetSource,
            strategyKey: restoredAnalyzerStrategyKey,
          });
          analysisMaoTargetRef.current = restoredMaoTarget;
          lastPersistedMaoTargetJsonRef.current =
            maoTargetFingerprint(restoredMaoTarget);
          setAnalysisMaoTarget(restoredMaoTarget);
          setAnalysisMaoTargetSource(
            restoredMaoTarget ? restoredDecisionBinding.source : null,
          );
          analysisDecisionBasisRef.current = restoredDecisionBinding.basis;
          setAnalysisDecisionBasis(restoredDecisionBinding.basis);
          setDecisionBasisNeedsReview(restoredDecisionBinding.needsReview);
          const savedInputConfidence =
            savedResultRecord?.inputConfidence &&
            typeof savedResultRecord.inputConfidence === "object" &&
            !Array.isArray(savedResultRecord.inputConfidence)
              ? (savedResultRecord.inputConfidence as Record<string, unknown>)
              : null;
          // Validate the persisted source context at the handoff boundary,
          // then retain its raw fingerprints so each field can be rechecked
          // independently against later edits. Invalid/legacy context fails
          // closed to no restored provenance.
          const restoredSourceContext = restoreInputConfidenceSourceContext(
            savedInputConfidence?.sourceContext,
            hydratedValues,
          );
          const hasRestoredSourceContext =
            Object.keys(restoredSourceContext.provenance).length > 0 ||
            restoredSourceContext.touchedInputFields.length > 0 ||
            Object.keys(restoredSourceContext.startingAssumptionOrigins)
              .length > 0 ||
            restoredSourceContext.purchasePriceEstimated ||
            restoredSourceContext.purchasePriceSource !== null;
          persistedInputConfidenceSourceContextRef.current =
            hasRestoredSourceContext
              ? (savedInputConfidence?.sourceContext ?? null)
              : null;
          persistedInputConfidenceAddressRef.current = hasRestoredSourceContext
            ? normalizeAutofillPropertyAddress(hydratedValues.address)
            : null;
          // Reopening must not harden an AVM/rent-multiple screening value
          // into an "asking price." Restore the warning only while the saved
          // value-bound purchase-price fingerprint still matches.
          if (restoredSourceContext.purchasePriceSource) {
            const restoredPrice = Number(hydratedValues.purchasePrice);
            purchasePriceSourceRef.current =
              restoredSourceContext.purchasePriceSource;
            purchasePriceProvenanceAddressRef.current =
              normalizeAutofillPropertyAddress(hydratedValues.address);
            purchasePriceProvenanceValueRef.current =
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null;
            setPriceEstimated(
              restoredSourceContext.purchasePriceSource.kind === "avm-estimate",
            );
            setEstimatedPriceValue(
              restoredSourceContext.purchasePriceSource.kind ===
                "avm-estimate" &&
                Number.isFinite(restoredPrice) &&
                restoredPrice > 0
                ? restoredPrice
                : null,
            );
            setPriceEstimateBasis(
              restoredSourceContext.purchasePriceSource.kind === "avm-estimate"
                ? "the saved RentCast AVM estimate"
                : null,
            );
            setPurchasePriceSourceLabel(
              formatPurchasePriceSourceLabel(
                restoredSourceContext.purchasePriceSource,
              ),
            );
          } else if (restoredSourceContext.purchasePriceEstimated) {
            const restoredPrice = Number(hydratedValues.purchasePrice);
            purchasePriceSourceRef.current = null;
            purchasePriceProvenanceAddressRef.current =
              normalizeAutofillPropertyAddress(hydratedValues.address);
            purchasePriceProvenanceValueRef.current =
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null;
            setPriceEstimated(true);
            setEstimatedPriceValue(
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null,
            );
            setPriceEstimateBasis("the saved automated screening estimate");
            setPurchasePriceSourceLabel("Saved automated screening estimate");
          } else {
            purchasePriceSourceRef.current = null;
            purchasePriceProvenanceAddressRef.current = null;
            purchasePriceProvenanceValueRef.current = null;
            setPriceEstimated(false);
            setEstimatedPriceValue(null);
            setPriceEstimateBasis(null);
            setPurchasePriceSourceLabel(null);
          }
          const restoredVerification = normalizeInputVerificationEvidence(
            savedInputConfidence?.verificationEvidence,
          );
          setInputVerification(restoredVerification);
          inputVerificationAddressRef.current =
            Object.keys(restoredVerification).length > 0
              ? normalizeAutofillPropertyAddress(hydratedValues.address)
              : null;
          setAppliedFinancingProfile(
            normalizeFinancingProfileSnapshot(
              savedResultRecord?.financingProfile,
            ),
          );
          const computedResult = calculateAnalysis(hydratedValues);
          const resolution = mergeSavedResultSnapshot(
            parsed.methodologyVersion,
            parsed.resultSnapshot,
            computedResult,
            hydratedValues,
          );
          const result = resolution.result;
          if (resolution.usesRecordedSnapshot) {
            const recorded = readRecordedOfferCeiling(savedResultRecord);
            setRecordedOfferCeiling(
              recorded.captured
                ? { captured: true, exact: recorded.exact }
                : { captured: false, exact: null },
            );
            if (isSpecialistAnalyzerStrategyKey(restoredAnalyzerStrategyKey)) {
              setRecordedSpecialistAnalysis(
                readRecordedSpecialistAnalysisSnapshot({
                  resultSnapshot: savedResultRecord,
                  strategyKey: restoredAnalyzerStrategyKey,
                  coreMethodologyVersion: resolution.storedMethodologyVersion,
                }) ?? "unavailable",
              );
            } else {
              setRecordedSpecialistAnalysis(null);
            }
          } else {
            setRecordedOfferCeiling(null);
            setRecordedSpecialistAnalysis(null);
          }
          if (!result) {
            // A newer methodology's incomplete snapshot cannot be made whole
            // with today's math without fabricating a mixed-version decision.
            // Keep the editable assumptions available and require an explicit
            // Run to create a new current-standard underwrite.
            setAnalysisResult(null);
            setAnalysisValues(null);
            setProjectionSource(null);
            setTaxStrategySource(null);
            setExitScenarioSource(null);
            setDealScoreResult(null);
            setShowResults(false);
            setHasUnsavedChanges(false);
            setRecordedSpecialistAnalysis(null);
            toast({
              title: "Saved result needs an explicit re-underwrite",
              description:
                "Its frozen methodology snapshot is not compatible with this app version. The assumptions are loaded; choose Run Analysis to create current-standard results.",
            });
            queueMicrotask(() => {
              isProgrammaticResetRef.current = false;
            });
            return;
          }
          // A recorded result is immutable historical evidence. Supplying its
          // saved row ID to a live snapshot action would let today's projection
          // code overwrite the long-term rows that were recorded at save time.
          const recordedAnalysisId = resolution.usesRecordedSnapshot
            ? null
            : parsed.id;
          const builtProjectionSource = canUseProjections
            ? {
                ...buildProjectionSource(
                  recordedAnalysisId,
                  hydratedValues,
                  result,
                ),
                recorded: resolution.usesRecordedSnapshot,
              }
            : null;
          const builtTaxStrategySource = canUseTaxStrategy
            ? {
                ...buildTaxStrategySource(
                  recordedAnalysisId,
                  hydratedValues,
                  result,
                ),
                recorded: resolution.usesRecordedSnapshot,
              }
            : null;
          setAnalysisResult(result);
          setStaleResultsWarning(false);
          setAnalysisValues(hydratedValues);
          setProjectionSource(builtProjectionSource);
          setTaxStrategySource(builtTaxStrategySource);
          setExitScenarioSource(
            canUseExitScenarios
              ? {
                  ...buildExitScenarioSource(
                    recordedAnalysisId,
                    hydratedValues,
                    result,
                    result.tenYearProjection,
                    result.taxStrategyYears,
                  ),
                  recorded: resolution.usesRecordedSnapshot,
                }
              : null,
          );
          const frozenScore = parseFrozenDealScore(resolution.result);
          setDealScoreResult(
            frozenScore ? { ok: true, tier: "pro", data: frozenScore } : null,
          );
          setShowResults(true);
          setSavedMethodologyLabel(
            resolution.shouldFreeze
              ? `Frozen TrueCap Underwriting Standard v${resolution.storedMethodologyVersion}`
              : isLegacySavedMethodologyVersion(
                    resolution.storedMethodologyVersion,
                  )
                ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
                : resolution.usesRecordedSnapshot
                  ? `Recorded TrueCap Underwriting Standard v${resolution.storedMethodologyVersion}`
                  : `TrueCap Underwriting Standard v${resolution.storedMethodologyVersion}`,
          );
          setHasUnsavedChanges(false);
          pendingResultsScrollRef.current = true;
          // A frozen result and score move together. Invoking the current score
          // engine here would silently pair new Screening Index arithmetic with old
          // financial outputs.
          // The resolver already switched financials + score atomically.
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
          typeof parsed.id === "string"
            ? normalizeReleasedInvestmentFormDraft(parsed.formSnapshot)
            : null;
        if (lenient && typeof parsed.id === "string") {
          const issue = describeInvestmentFormSnapshotIssue(
            parsed.formSnapshot,
          );
          prevPropertyTypeRef.current = lenient.propertyType;
          form.reset(lenient);
          seedRestoredAddressIdentity(lenient.address);
          persistedInputConfidenceSourceContextRef.current = null;
          persistedInputConfidenceAddressRef.current = null;
          setInputVerification({});
          inputVerificationAddressRef.current = null;
          const lenientResultRecord =
            parsed.resultSnapshot &&
            typeof parsed.resultSnapshot === "object" &&
            !Array.isArray(parsed.resultSnapshot)
              ? (parsed.resultSnapshot as Record<string, unknown>)
              : null;
          const restoredAnalyzerStrategyKey = persistedAnalyzerStrategyKey(
            lenientResultRecord?.analyzerStrategyKey,
            lenient,
          );
          const restoredActiveStrategy = activeStrategyStateKey(
            restoredAnalyzerStrategyKey,
          );
          activeStrategyKeyRef.current = restoredActiveStrategy;
          setActiveStrategyKey(restoredActiveStrategy);
          strategyAppliedRef.current = buildStrategyAppliedSnapshot(
            restoredActiveStrategy,
          );
          setSavedDealId(parsed.id);
          savedDealIdRef.current = parsed.id;
          savedUnderwritingRevisionRef.current = parseSavedAnalysisRevision(
            parsed.underwritingRevision,
          );
          replaceSavedDealUrl(parsed.id);
          setLoadedPipelineStage(
            typeof parsed.pipelineStage === "string"
              ? parsed.pipelineStage
              : null,
          );
          lastPersistedFormJsonRef.current = formSnapshotForCompare(lenient);
          clearPendingMaoTarget();
          const restoredMaoTarget = normalizeMaoTarget(
            parsed.resultSnapshot && typeof parsed.resultSnapshot === "object"
              ? (parsed.resultSnapshot as Record<string, unknown>)
                  .maxOfferTarget
              : null,
          );
          const restoredTargetSource = normalizeOfferCeilingTargetSource(
            parsed.resultSnapshot && typeof parsed.resultSnapshot === "object"
              ? (parsed.resultSnapshot as Record<string, unknown>)
                  .maxOfferTargetSource
              : null,
          );
          const restoredDecisionBinding = restoreDecisionBasisBinding({
            basis: lenientResultRecord?.[OFFER_CEILING_DECISION_BASIS_FIELD],
            target: restoredMaoTarget,
            source: restoredTargetSource,
            strategyKey: restoredAnalyzerStrategyKey,
          });
          analysisMaoTargetRef.current = restoredMaoTarget;
          lastPersistedMaoTargetJsonRef.current =
            maoTargetFingerprint(restoredMaoTarget);
          setAnalysisMaoTarget(restoredMaoTarget);
          setAnalysisMaoTargetSource(
            restoredMaoTarget ? restoredDecisionBinding.source : null,
          );
          analysisDecisionBasisRef.current = restoredDecisionBinding.basis;
          setAnalysisDecisionBasis(restoredDecisionBinding.basis);
          setDecisionBasisNeedsReview(restoredDecisionBinding.needsReview);
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

    // Calculator → analyzer handoff (P2-2): exact values arrive through a
    // short-lived same-tab payload; backward-compatible direct query links
    // are scrubbed by the pre-analytics head bootstrap before hydration.
    // Higher priority than a stale anon draft; prefills ONLY the provided
    // fields on top of defaults (partial handoffs like price+rent are
    // expected) and returns so the draft restore doesn't clobber them.
    const handoff = analyzerHandoff;
    if (handoff) {
      // A tools/persona handoff is a new analysis. Never let an abandoned
      // guest-save target from another property attach to it.
      clearPendingMaoTarget();
      persistedInputConfidenceSourceContextRef.current = null;
      persistedInputConfidenceAddressRef.current = null;
      setInputVerification({});
      inputVerificationAddressRef.current = null;
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
          form.setValue(
            "units",
            getDefaultUnitsForPropertyType(handoff.propertyType),
            {
              shouldDirty: false,
              shouldValidate: false,
            },
          );
        }
      }
      if (handoff.address !== undefined)
        form.setValue("address", handoff.address);
      if (handoff.purchasePrice !== undefined)
        form.setValue("purchasePrice", handoff.purchasePrice);
      if (handoff.bedrooms !== undefined)
        form.setValue("bedrooms", handoff.bedrooms);
      if (handoff.monthlyRent !== undefined)
        form.setValue("monthlyRent", handoff.monthlyRent);
      if (handoff.interestRate !== undefined)
        form.setValue("interestRate", handoff.interestRate);
      if (handoff.propertyTaxPct !== undefined) {
        form.setValue("propertyTaxPct", handoff.propertyTaxPct);
      }
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
        const normalized = normalizeReleasedInvestmentFormDraft(parsedDraft);
        if (normalized) {
          const restoredAnalyzerStrategyKey = persistedAnalyzerStrategyKey(
            readDraftAnalyzerStrategyKey(parsedDraft),
            normalized,
          );
          const pendingMaoBinding = readPendingMaoTargetBinding(
            maoTargetAnalysisFingerprint(normalized),
          );
          // The exact demo is sometimes written deliberately for a just-clicked
          // Save or Share authentication handoff. That recent, draft-bound
          // intent is not stale sample residue: it must survive long enough to
          // restore the result and complete the action without a second click.
          const resumesPendingSaveAfterAuth =
            isAuthenticated && pendingSaveIntentMatchesDraft(normalized);
          let resumesPendingShareAfterAuth = false;
          if (isAuthenticated) {
            try {
              resumesPendingShareAfterAuth =
                parseShareAuthIntent(
                  window.sessionStorage.getItem(SHARE_AUTH_INTENT_STORAGE_KEY),
                  { currentPath: window.location.pathname },
                )?.context === "analysis";
            } catch {
              /* unavailable tab storage — no resumable share intent */
            }
          }
          const matchesSyntheticSampleDraft =
            restoredAnalyzerStrategyKey === SAMPLE_DEAL_FIXTURE.strategyKey &&
            isTrueCapSyntheticSampleAddress(normalized.address);
          const isSyntheticSampleDraft =
            matchesSyntheticSampleDraft &&
            !resumesPendingSaveAfterAuth &&
            !resumesPendingShareAfterAuth;
          if (isSyntheticSampleDraft) {
            // Clean up drafts created by older releases that did persist the
            // demo. A synthetic sample must never become the default starting
            // point for an authenticated investor's next work session.
            clearCalcDraftRaw();
            clearPendingMaoTarget();
            resetToNewAnalysis("single-family");
            queueMicrotask(() => {
              isProgrammaticResetRef.current = false;
            });
            return;
          }
          prevPropertyTypeRef.current = normalized.propertyType;
          form.reset(normalized);
          seedRestoredAddressIdentity(normalized.address);
          const pendingMaoTarget = pendingMaoBinding?.target ?? null;
          const draftRecord =
            parsedDraft &&
            typeof parsedDraft === "object" &&
            !Array.isArray(parsedDraft)
              ? (parsedDraft as Record<string, unknown>)
              : null;
          const restoredDecisionBinding = restoreDecisionBasisBinding({
            basis: draftRecord?.[OFFER_CEILING_DECISION_BASIS_FIELD],
            target: pendingMaoTarget,
            source: pendingMaoBinding?.source,
            strategyKey: restoredAnalyzerStrategyKey,
          });
          analysisMaoTargetRef.current = pendingMaoTarget;
          setAnalysisMaoTarget(pendingMaoTarget);
          setAnalysisMaoTargetSource(
            pendingMaoTarget ? restoredDecisionBinding.source : null,
          );
          analysisDecisionBasisRef.current = restoredDecisionBinding.basis;
          setAnalysisDecisionBasis(restoredDecisionBinding.basis);
          setDecisionBasisNeedsReview(restoredDecisionBinding.needsReview);
          const draftSourceContext =
            draftRecord?.[DRAFT_INPUT_CONFIDENCE_SOURCE_CONTEXT_FIELD];
          const restoredDraftSourceContext =
            restoreInputConfidenceSourceContext(draftSourceContext, normalized);
          const hasRestoredDraftSourceContext =
            Object.keys(restoredDraftSourceContext.provenance).length > 0 ||
            restoredDraftSourceContext.touchedInputFields.length > 0 ||
            Object.keys(restoredDraftSourceContext.startingAssumptionOrigins)
              .length > 0 ||
            restoredDraftSourceContext.purchasePriceEstimated ||
            restoredDraftSourceContext.purchasePriceSource !== null;
          persistedInputConfidenceSourceContextRef.current =
            hasRestoredDraftSourceContext ? (draftSourceContext ?? null) : null;
          persistedInputConfidenceAddressRef.current =
            hasRestoredDraftSourceContext
              ? normalizeAutofillPropertyAddress(normalized.address)
              : null;
          if (restoredDraftSourceContext.purchasePriceSource) {
            const restoredPrice = Number(normalized.purchasePrice);
            purchasePriceSourceRef.current =
              restoredDraftSourceContext.purchasePriceSource;
            purchasePriceProvenanceAddressRef.current =
              normalizeAutofillPropertyAddress(normalized.address);
            purchasePriceProvenanceValueRef.current =
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null;
            setPriceEstimated(
              restoredDraftSourceContext.purchasePriceSource.kind ===
                "avm-estimate",
            );
            setEstimatedPriceValue(
              restoredDraftSourceContext.purchasePriceSource.kind ===
                "avm-estimate" &&
                Number.isFinite(restoredPrice) &&
                restoredPrice > 0
                ? restoredPrice
                : null,
            );
            setPriceEstimateBasis(
              restoredDraftSourceContext.purchasePriceSource.kind ===
                "avm-estimate"
                ? "the restored RentCast AVM estimate"
                : null,
            );
            setPurchasePriceSourceLabel(
              formatPurchasePriceSourceLabel(
                restoredDraftSourceContext.purchasePriceSource,
              ),
            );
          } else if (restoredDraftSourceContext.purchasePriceEstimated) {
            const restoredPrice = Number(normalized.purchasePrice);
            purchasePriceSourceRef.current = null;
            purchasePriceProvenanceAddressRef.current =
              normalizeAutofillPropertyAddress(normalized.address);
            purchasePriceProvenanceValueRef.current =
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null;
            setPriceEstimated(true);
            setEstimatedPriceValue(
              Number.isFinite(restoredPrice) && restoredPrice > 0
                ? restoredPrice
                : null,
            );
            setPriceEstimateBasis("the restored automated screening estimate");
            setPurchasePriceSourceLabel(
              "Restored automated screening estimate",
            );
          } else {
            purchasePriceSourceRef.current = null;
            purchasePriceProvenanceAddressRef.current = null;
            purchasePriceProvenanceValueRef.current = null;
            setPriceEstimated(false);
            setEstimatedPriceValue(null);
            setPriceEstimateBasis(null);
            setPurchasePriceSourceLabel(null);
          }
          setInputVerification({});
          inputVerificationAddressRef.current = null;
          const restoredActiveStrategy = activeStrategyStateKey(
            restoredAnalyzerStrategyKey,
          );
          activeStrategyKeyRef.current = restoredActiveStrategy;
          setActiveStrategyKey(restoredActiveStrategy);
          strategyAppliedRef.current = buildStrategyAppliedSnapshot(
            restoredActiveStrategy,
          );
          // Surface the restore visibly. Without this the user just
          // sees a pre-filled form and wonders what happened.
          setRestoredFromDraft(true);
          // Capture the address so the banner can name the saved draft.
          // Trim + cap to a sane length so a
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
          if (resumesPendingSaveAfterAuth) {
            autoSaveAfterAuthRef.current = true;
            setIsAutoSaveResuming(true);
            // The guest already chose Save after seeing a completed result.
            // Authentication can add Pro capabilities, but it must not turn
            // that completed free screen into a new, blocking target-setup
            // task. Resume the exact kind of run they left: the synthetic
            // sample keeps its fixture criteria; a real targetless screen
            // remains targetless and saves automatically.
            if (matchesSyntheticSampleDraft) {
              pendingSampleRunRef.current = true;
              pendingSamplePreviewRef.current = true;
            } else if (
              !pendingMaoTarget ||
              restoredDecisionBinding.needsReview
            ) {
              explicitTargetlessRunRef.current = true;
            }
            toast({
              title: "Welcome back — saving your deal",
              description: addr
                ? `Re-running the analysis for ${addr.slice(0, 60)}, then saving it automatically.`
                : "Re-running your analysis, then saving it automatically.",
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
          // A guest who chose Share has already expressed the intent to see
          // this analysis and finish the disclosure step after auth. The
          // ShareLinkButton can consume and reopen only after results mount,
          // so re-run this exact restored draft once for a recent, same-route
          // analysis intent. Unlike the Save path above, this must never set
          // autoSaveAfterAuthRef: sharing does not silently persist a deal.
          if (isAuthenticated) {
            try {
              const rawShareIntent = window.sessionStorage.getItem(
                SHARE_AUTH_INTENT_STORAGE_KEY,
              );
              const shareIntent = parseShareAuthIntent(rawShareIntent, {
                currentPath: window.location.pathname,
              });
              if (shareIntent?.context === "analysis") {
                // Share is the same continuity contract as Save: sign-in is
                // authorization, not permission to replace the completed
                // result with a target-setup dead end. The sample reruns with
                // its fixture criteria; a real targetless screen stays
                // targetless for this one resumed action.
                if (matchesSyntheticSampleDraft) {
                  pendingSampleRunRef.current = true;
                  pendingSamplePreviewRef.current = true;
                } else if (
                  !pendingMaoTarget ||
                  restoredDecisionBinding.needsReview
                ) {
                  explicitTargetlessRunRef.current = true;
                }
                toast({
                  title: "Welcome back — your analysis is ready to share",
                  description: addr
                    ? `Re-running the analysis for ${addr.slice(0, 60)}, then reopening Share.`
                    : "Re-running your analysis, then reopening Share.",
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
              // Invalid, expired, wrong-route, and wrong-context intents are
              // not allowed to surprise a later analysis in this tab.
              if (rawShareIntent) {
                window.sessionStorage.removeItem(SHARE_AUTH_INTENT_STORAGE_KEY);
              }
            } catch {
              // Session storage is optional. Fall through to the normal
              // input-only draft restore when it is unavailable.
            }
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
        clearPendingSaveIntent();
      } catch {
        clearCalcDraftRaw();
        clearPendingSaveIntent();
      }
    }

    // A save intent without its exact restorable draft must never attach to a
    // later analysis on this browser.
    if (hasPendingSaveIntent()) clearPendingSaveIntent();

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
    invalidateDecisionCriteriaForScopeChange();
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
  }, [form, invalidateDecisionCriteriaForScopeChange, propertyType]);

  const hasResultsForFocusHandoff = analysisResult !== null;
  useEffect(() => {
    if (
      !pendingResultsScrollRef.current ||
      isCalculating ||
      !hasResultsForFocusHandoff
    )
      return;
    // Consume the handoff before scheduling it. Changes to scores, save state,
    // or other result details can rerender this surface later, but they must
    // never pull focus away from whatever the user is doing.
    pendingResultsScrollRef.current = false;
    const frame = requestAnimationFrame(() => {
      const resultsSection = document.querySelector(
        "[data-analysis-results='true']",
      );
      if (!(resultsSection instanceof HTMLElement)) return;
      resultsSection.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
      resultsSection.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hasResultsForFocusHandoff, isCalculating]);

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
      if (raw)
        heroAnalyzeHandlerRef.current?.(JSON.parse(raw) as HeroAnalyzeDetail);
    } catch {
      /* malformed / unavailable storage - the live event still delivers it */
    }
    return () =>
      window.removeEventListener(
        HERO_ANALYZE_EVENT,
        onHeroAnalyze as EventListener,
      );
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
      if (!isReleasedHandoffStrategy(detail.strategy)) return;
      handleSelectStrategy(detail.strategy, "link");
    };
    window.addEventListener(
      ANALYZER_STRATEGY_EVENT,
      onStrategySeed as EventListener,
    );
    return () =>
      window.removeEventListener(
        ANALYZER_STRATEGY_EVENT,
        onStrategySeed as EventListener,
      );
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
    const focusPath = () => {
      form.setFocus(path as never);
      // Controlled specialist inputs live outside RHF's registered DOM tree
      // but still carry their exact schema field as `name`. Fall back to the
      // located element so validation can never point at an unfocusable field.
      const target = findEl();
      if (target && document.activeElement !== target) target.focus();
    };
    // Phase 4: while the hero's listing-URL row is open, the address input
    // is CSS-hidden (swapped out, still mounted). A validation error on
    // "address" must swap it back in first — same deadend class as the
    // collapsed-advanced case below.
    if (listingLinkOpen && path === "address") {
      setListingLinkOpen(false);
      requestAnimationFrame(() => {
        focusPath();
        findEl()?.scrollIntoView({
          behavior: scrollBehavior(),
          block: "center",
        });
      });
      return;
    }
    const el = findEl();
    const rootField = path.split(".")[0] ?? path;
    const inCollapsedExpenseDetails =
      !expenseDetailsOpen && OPERATING_EXPENSE_FIELD_PATHS.has(rootField);
    const inCollapsedAdvanced =
      !advancedOpen && !!el && el.closest("#advanced-options") !== null;
    if (!inCollapsedAdvanced && !inCollapsedExpenseDetails) {
      focusPath();
      findEl()?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "center",
      });
      return;
    }
    setAdvancedOpen(true);
    if (inCollapsedExpenseDetails) setExpenseDetailsOpen(true);
    // Defer one frame so the section is visible before focusing (focus on
    // a display:none input is dropped), then bring the field into view —
    // focus's default scroll can leave it flush against the viewport edge.
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        focusPath();
        findEl()?.scrollIntoView({
          behavior: scrollBehavior(),
          block: "center",
        });
      }, 70);
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
    const parsed = releasedInvestmentFormSchema.safeParse(form.getValues());
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
    const pendingEnrichment = addressEnrichmentPromiseRef.current;
    if (pendingEnrichment) {
      if (deferredRunAfterEnrichmentRef.current) return;
      deferredRunAfterEnrichmentRef.current = true;
      toast({
        title: "Finishing the property lookup",
        description:
          "We’ll run automatically as soon as the address-based assumptions are ready.",
      });
      try {
        await pendingEnrichment;
      } catch {
        // Enrichment is best-effort. The explicit form values remain the
        // calculation authority if the lookup fails.
      } finally {
        deferredRunAfterEnrichmentRef.current = false;
      }
      requestAnimationFrame(() => {
        void form.handleSubmit(onSubmit, onError)();
      });
      return;
    }
    const explicitlyTargetless = explicitTargetlessRunRef.current;
    explicitTargetlessRunRef.current = false;
    const isPendingSampleRun = pendingSampleRunRef.current;
    const runPromisesOfferCeiling = analysisRunPromisesOfferCeiling({
      canCalculateMaxOffer: canUseMaxOffer,
      strategyKey: activeStrategyKeyRef.current,
    });
    if (
      runPromisesOfferCeiling &&
      !isPendingSampleRun &&
      (!analysisMaoTargetRef.current ||
        decisionBasisNeedsReviewRef.current ||
        sampleSeededMaoTargetRef.current) &&
      !explicitlyTargetless
    ) {
      toast({
        title: "Choose decision criteria first",
        description:
          "Use the criteria shown above to calculate an Offer Ceiling, or choose the operating-economics option to continue without one.",
      });
      return;
    }
    // Warm the dynamic AnalysisDashboard chunk in parallel with the calc
    // (covers programmatic runs — hero handoff, saved-deal restore —
    // that never focused a form field). No-op if already loaded.
    preloadAnalysisDashboard();
    // Use a synchronous snapshot of the live form right after validation. This
    // matches what the user sees (including fields that only exist while mounted)
    // and avoids any mismatch between RHF state and resolver output.
    const currentFormValues = form.getValues();
    // v1 Property Age feeds the Screening Index, so every explicit run must
    // carry its own date instead of borrowing the browser's year inside the
    // engine. Persist it in RHF immediately so Save/Share/draft snapshots use
    // the exact same serialized input that produced the result. The unreleased
    // v2 path keeps its existing explicit-date semantics untouched.
    const runAnalysisDate =
      currentFormValues.underwritingModelVersion === "2.0"
        ? currentFormValues.analysisDate
        : analysisDateForExplicitV1Run({
            existingAnalysisDate: currentFormValues.analysisDate,
            // The synthetic sample is a versioned fixture shared with the
            // homepage. Preserve its audit date so opening the demo never
            // changes its Screening Index after a calendar-year boundary.
            // Every real-property run still receives today's UTC date.
            preserveExisting: pendingSampleRunRef.current,
          });
    if (runAnalysisDate && currentFormValues.analysisDate !== runAnalysisDate) {
      form.setValue("analysisDate", runAnalysisDate, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    const datedFormValues = runAnalysisDate
      ? { ...currentFormValues, analysisDate: runAnalysisDate }
      : currentFormValues;
    const liveParse = releasedInvestmentFormSchema.safeParse(datedFormValues);
    const values: InvestmentFormValues = liveParse.success
      ? liveParse.data
      : {
          ...validated,
          ...(runAnalysisDate ? { analysisDate: runAnalysisDate } : {}),
        };

    // If the user changed the purchase price away from the hero auto-
    // estimate, this verdict is on their number now — drop the
    // "estimated price" notice. (The auto-run itself keeps it: price still
    // equals the estimate at that point.)
    if (
      estimatedPriceValue != null &&
      values.purchasePrice !== estimatedPriceValue
    ) {
      setEstimatedPriceValue(null);
      setPriceEstimated(false);
      setPurchasePriceSourceLabel(null);
      purchasePriceSourceRef.current = null;
      purchasePriceProvenanceAddressRef.current = null;
      purchasePriceProvenanceValueRef.current = null;
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
    let autoSavedAfterAuth = false;

    // Consume the sample-deal Pro preview arm flag FIRST so it can never
    // leak onto a later run if anything below throws. One sample click =
    // at most one preview run.
    //
    // "Not fully Pro yet" is measured against what this preview can actually
    // show (see sampleProPreviewAddsCapability). Requiring an UNRELEASED
    // panel — false for every plan, and not unlocked by the preview either —
    // made the escape hatch unreachable, so a subscriber who resumed a
    // Save/Share sign-in on the sample was demoted into demo framing and lost
    // the property address off their own decision summary.
    const sampleProPreview =
      pendingSamplePreviewRef.current &&
      sampleProPreviewAddsCapability({
        canUseProjections,
        canUseTaxStrategy,
        canUseExitScenarios,
        canUseDealScore,
      });
    pendingSamplePreviewRef.current = false;
    const isSampleRun = pendingSampleRunRef.current;
    pendingSampleRunRef.current = false;
    if (isSampleRun) {
      setAnalysisMaoTarget({ ...SAMPLE_DEAL_FIXTURE.maoTarget });
      setAnalysisMaoTargetSource(SAMPLE_DEAL_FIXTURE.targetProfile.source);
      const sampleBasis = captureSelectedTargetsDecisionBasis({
        target: SAMPLE_DEAL_FIXTURE.maoTarget,
        strategyKey: SAMPLE_DEAL_FIXTURE.strategyKey,
      });
      analysisDecisionBasisRef.current = sampleBasis;
      setAnalysisDecisionBasis(sampleBasis);
      setDecisionBasisNeedsReview(false);
      sampleSeededMaoTargetRef.current = true;
    } else if (sampleSeededMaoTargetRef.current) {
      // The sample's example targets live for exactly the sample run — the
      // same one-shot contract as the Pro preview above. Any later submit is
      // the user's own underwriting, and example rules must never grade it
      // as "your selected targets" (they were never adopted). Fall back to
      // the not-adopted state; the user can review + adopt targets
      // explicitly from the result.
      sampleSeededMaoTargetRef.current = false;
      analysisMaoTargetRef.current = null;
      setAnalysisMaoTarget(null);
      setAnalysisMaoTargetSource("screening-defaults");
      analysisDecisionBasisRef.current = null;
      setAnalysisDecisionBasis(null);
      setDecisionBasisNeedsReview(false);
      clearPendingMaoTarget();
    }

    // Canonical funnel start: validation passed and calculation is beginning.
    // Keep this taxonomy-only; underwriting inputs never enter analytics.
    const inputMethod = isSampleRun
      ? "sample"
      : listingUrl.trim()
        ? "listing_url"
        : "address";
    trackEvent("property_input_method_selected", { method: inputMethod });
    trackEvent("analysis_started", {
      route_category: "analyzer",
      calculator_slug: "rental-property",
    });
    const dirty = form.formState.dirtyFields as Record<string, unknown>;
    const assumptionsChanged =
      computeExpensesEdited(dirty) ||
      [
        "downPaymentPct",
        "interestRate",
        "loanTermYears",
        "monthlyRent",
        "propertyTaxPct",
        "propertyTaxAnnual",
        "insurancePct",
        "insuranceMonthly",
        "rentGrowthPct",
        "expenseGrowthPct",
        "appreciationRatePct",
        "sellingCostPct",
      ].some((field) => Boolean(dirty[field]));
    if (assumptionsChanged) {
      trackEvent("assumptions_updated", { source: "analyzer_run" });
      trackEvent("material_assumption_overridden", {
        source: "analyzer_run",
        field_group: "underwriting_assumptions",
      });
    }

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
      const computedFingerprint = formSnapshotForCompare(values);
      if (!isAuthenticated) {
        clearAnonymousDecisionPresentationGrant();
        if (!isSampleRun) {
          const anonymousGrant = await claimAnonymousDecisionAction(values);
          const boundFormSnapshot = bindAnonymousDecisionPresentationGrant(
            anonymousGrant.ok,
            computedFingerprint,
            formSnapshotForCompare(form.getValues()),
          );
          anonymousDecisionGrantFormJsonRef.current = boundFormSnapshot;
          setAnonymousDecisionGrantAvailable(boundFormSnapshot !== null);
          if (!anonymousGrant.ok) {
            toast({
              title:
                anonymousGrant.code === "LIMIT_REACHED"
                  ? "No-signup decision used"
                  : anonymousGrant.code === "RATE_LIMITED"
                    ? "No-signup decision paused"
                    : anonymousGrant.code === "UNAVAILABLE"
                      ? "Complete decision unavailable"
                      : "Review required",
              description: anonymousGrant.message,
              variant: "warning",
            });
          }
        }
      }
      if (isAuthenticated && canUseMaxOffer && !isSampleRun) {
        if (!computedFingerprint) {
          toast({
            title: "Could not verify evaluation usage",
            description:
              "Your inputs are still here. Review them and try again.",
            variant: "destructive",
          });
          return;
        }
        const usage = await consumeProductEvaluationUsageAction({
          kind: "deal",
          values,
        });
        if (!usage.ok) {
          toast({
            title:
              usage.code === "LIMIT_REACHED" || usage.code === "EXPIRED"
                ? "Product evaluation complete"
                : "Could not verify evaluation access",
            description: usage.message,
            variant: usage.code === "SERVER_ERROR" ? "destructive" : "warning",
          });
          router.refresh();
          return;
        }
        if (
          usage.access === "evaluation" &&
          usage.wasNewUsage &&
          usage.dealsUsed != null
        ) {
          trackEvent("evaluation_deal_completed", {
            deal_number: usage.dealsUsed,
          });
          if (usage.dealsUsed === 2) {
            trackEvent("second_deal_completed", { within_days: 21 });
          }
          if (
            usage.dealsUsed === 1 &&
            usage.startedAt &&
            Date.now() - Date.parse(usage.startedAt) <= 24 * 60 * 60 * 1000
          ) {
            trackEvent("first_value_within_24h", {
              value_event: "complete_decision",
            });
          }
        }
      }
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
      const builtProjectionSource =
        canUseProjections || sampleProPreview
          ? buildProjectionSource(sourceAnalysisId, values, result)
          : null;
      const builtTaxStrategySource = canUseTaxStrategy
        ? buildTaxStrategySource(sourceAnalysisId, values, result)
        : null;
      // An explicit Run is the user's opt-in to re-underwrite under the
      // currently deployed standard. Retire any saved-version provenance at
      // the same moment the replacement outputs become visible.
      setSavedMethodologyLabel(null);
      setRecordedOfferCeiling(null);
      setRecordedSpecialistAnalysis(null);
      setAnalysisResult(result);
      // A full Run just validated + computed from the live form — the
      // results are current by definition.
      setStaleResultsWarning(false);
      setAnalysisValues(values);
      // Fire Google Ads conversion event - primary intent signal we can
      // optimize spend against (analyze-an-actual-deal is the
      // micro-conversion that precedes signup).
      trackConversion("calc_completed");
      // Canonical funnel completion: calculation succeeded and the result was
      // committed to visible state. Do not emit aliases for the same moment.
      trackEvent("analysis_completed", {
        route_category: "analyzer",
        calculator_slug: "rental-property",
      });
      try {
        const firstAnalysisKey = "truecap_first_analysis_completed_v1";
        if (window.localStorage.getItem(firstAnalysisKey) !== "1") {
          window.localStorage.setItem(firstAnalysisKey, "1");
          trackEvent("first_analysis_completed", {
            is_authenticated: isAuthenticated,
          });
        }
      } catch {
        // Storage can be blocked; analysis completion remains instrumented by
        // the canonical event above without risking the product workflow.
      }
      setProjectionSource(builtProjectionSource);
      setTaxStrategySource(builtTaxStrategySource);
      setExitScenarioSource(
        canUseExitScenarios
          ? buildExitScenarioSource(
              sourceAnalysisId,
              values,
              result,
              result.tenYearProjection,
              result.taxStrategyYears,
            )
          : null,
      );
      if (computedFingerprint)
        lastComputedFormJsonRef.current = computedFingerprint;
      setIsCalculating(false);
      setShowResults(true);
      setIsEditingAssumptions(false);
      // Every explicit Run brings the ANSWER to the user (the existing
      // results-scroll effect consumes this). Without it, only the
      // saved-deal reopen path scrolled — on phones and short windows the
      // verdict mounted below the fold and the user who tapped Run kept
      // staring at the form (UX walkthrough P0-2). Live recomputes never
      // pass through onSubmit, so mid-edit repaints don't yank the page.
      pendingResultsScrollRef.current = true;
      if (sampleProPreview && !canUseDealScore) {
        // Compute the full Screening Index client-side for the demo using
        // the same pure function the server action wraps. No server
        // call, no entitlement bypass - the sample can't be saved.
        setDealScoreResult({
          ok: true,
          tier: "pro",
          data: computeDealScore(
            buildDealScoreInputFromAnalysis(values, result),
          ),
        });
        setIsLoadingDealScore(false);
      } else {
        await loadDealScore(values, result);
      }
      if (autoSaveAfterAuthRef.current) {
        const savedAutomatically = await performSaveDeal({
          autoAfterAuth: true,
        });
        autoSavedAfterAuth = savedAutomatically === true;
      }
      // Forked away while the score loaded → the toast (and the results
      // scroll below, which no-ops on the unmounted dashboard) belong to a
      // deal that's no longer on screen.
      if (forkGenerationRef.current !== runGeneration) return;
      // The focused result is the completion feedback. A second, generic
      // "Analysis Complete" toast duplicated the same metrics, competed with
      // the result handoff, and could cover mobile actions. Keep a toast only
      // when authentication also completed a distinct background save.
      if (autoSavedAfterAuth) {
        toast({
          title: "Deal saved automatically",
          description: "Your underwriting is now available from any device.",
          variant: "success",
        });
      }
    } catch (error) {
      // This block used to be try/finally with no catch. A throw anywhere above
      // — an offline fetch, a 5xx from a server action — became an unhandled
      // promise rejection: the spinner reset, the button re-enabled, and the
      // page was left EXACTLY as it was. No error, no retry, no scroll. The
      // user pressed the primary CTA and the product did nothing, twice, in
      // silence. Failing visibly is the minimum; failing with a way forward is
      // the point.
      Sentry.captureException(error, {
        tags: { feature: "analyzer-run" },
      });
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      toast({
        title: offline ? "You appear to be offline" : "That run didn’t finish",
        description: offline
          ? "Your inputs are safe. Reconnect and run it again."
          : "Something went wrong on our end. Your inputs are safe — try again.",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Run the analysis again"
            onClick={() => {
              void form.handleSubmit(onSubmit, onError)();
            }}
          >
            Try again
          </ToastAction>
        ),
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
    if (autoSaveAfterAuthRef.current) {
      // The bound draft itself is invalid, so this intent is terminal. Leaving
      // it armed would retry on every reload and could later attach to a
      // different draft after the user edits the form.
      clearPendingSaveIntent();
      autoSaveAfterAuthRef.current = false;
      setIsAutoSaveResuming(false);
    }
    const findFirstFieldError = (
      value: unknown,
      currentPath = "",
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
            currentPath ? `${currentPath}.${i}` : `${i}`,
          );
          if (nested) return nested;
        }
        return null;
      }

      for (const [key, nestedValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const nestedPath = currentPath ? `${currentPath}.${key}` : key;
        const nested = findFirstFieldError(nestedValue, nestedPath);
        if (nested) return nested;
      }
      return null;
    };

    const unitsErrorMessage =
      (
        errors.units as
          | { message?: string; root?: { message?: string } }
          | undefined
      )?.message ??
      (
        errors.units as
          | { message?: string; root?: { message?: string } }
          | undefined
      )?.root?.message;
    const hasUnitFieldErrors =
      Array.isArray(errors.units) &&
      errors.units.some(
        (unitErr) =>
          !!unitErr?.bedrooms ||
          !!unitErr?.bathrooms ||
          !!unitErr?.sqft ||
          !!unitErr?.monthlyRent,
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
      firstFieldError?.path === "monthlyRent" &&
      activeStrategy?.incomeMode === "str";
    if (!hasUnitFieldErrors && firstFieldError?.path) {
      // Opens the collapsed Advanced Options section first when the invalid
      // field (financing / expenses / SF bathrooms+sqft) lives inside it.
      focusInvalidField(
        strHiddenRentError ? "avgDailyRate" : firstFieldError.path,
      );
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
        : (unitsErrorMessage ??
          firstFieldError?.message ??
          "Please fix the highlighted fields before calculating."),
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
      /** Completing the explicit anonymous Save click after authentication. */
      autoAfterAuth?: boolean;
      /** Revision captured for an explicit chooser target. Plain updates use
       * the token attached to the currently reopened deal. */
      expectedUnderwritingRevisionOverride?: number;
      /** Exact target currently rendered by the results dashboard. This is
       * required for an untouched late-loaded buy-box seed, which otherwise
       * exists only inside the child dashboard until the user edits it. */
      maxOfferTargetOverride?: MaoTarget;
      maxOfferTargetSourceOverride?: OfferCeilingTargetSource;
    } = {},
  ) => {
    // Snapshot the fork generation: if "Analyze another like this" fires
    // while this save is in flight, the completion below must NOT
    // re-attach the source deal's id to the forked form (or clear the
    // fork's draft) — that silently turned the NEXT deal's save into an
    // overwrite of the source.
    const saveGeneration = forkGenerationRef.current;
    // An explicit chooser target must win even while completing the post-auth
    // auto-save. Otherwise "Update existing" retries an insert and loops back
    // into the duplicate dialog. Only the initial auto-save ignores a stale id.
    const targetExistingId =
      options.existingIdOverride ??
      (options.autoAfterAuth || options.forceInsert ? null : savedDealId);
    if (targetExistingId && !canUpdateSavedDeals) {
      toast({
        title: "Upgrade required",
        description: "Upgrade to update deals in My Deals.",
        variant: "destructive",
      });
      router.push("/profile#billing");
      return;
    }

    if (saveInFlightRef.current) return false;
    saveInFlightRef.current = true;

    let awaitingResolution = false;
    setIsSavingDeal(true);
    try {
      const currentValues = form.getValues();
      const confidenceContext = resolveLiveInputConfidenceContext(
        currentValues,
        form.formState.dirtyFields as Record<string, unknown>,
      );
      const analysisFingerprint = maoTargetAnalysisFingerprint(currentValues);
      const pendingMaoBinding =
        readPendingMaoTargetBinding(analysisFingerprint);
      const rawCandidateMaxOfferTarget =
        normalizeMaoTarget(options.maxOfferTargetOverride) ??
        analysisMaoTargetRef.current ??
        pendingMaoBinding?.target ??
        null;
      const candidateMaxOfferTarget = normalizeMaoTargetForFinancing(
        rawCandidateMaxOfferTarget,
        {
          isCashPurchase: isAllCashDownPayment(currentValues.downPaymentPct),
        },
      );
      let candidateMaxOfferTargetSource =
        options.maxOfferTargetSourceOverride ??
        analysisMaoTargetSource ??
        pendingMaoBinding?.source ??
        (candidateMaxOfferTarget ? "selected-targets" : "screening-defaults");
      if (
        rawCandidateMaxOfferTarget &&
        maoTargetFingerprint(rawCandidateMaxOfferTarget) !==
          maoTargetFingerprint(candidateMaxOfferTarget)
      ) {
        // Financing changed after target adoption. DSCR is meaningless for an
        // all-cash deal, so converge the parent state to the exact target that
        // can safely be persisted instead of letting Save send a stale rule.
        const financingSafeTargetSource = candidateMaxOfferTarget
          ? candidateMaxOfferTargetSource === "starter-criteria"
            ? "starter-criteria"
            : "selected-targets"
          : "screening-defaults";
        analysisMaoTargetRef.current = candidateMaxOfferTarget;
        setAnalysisMaoTarget(candidateMaxOfferTarget);
        setAnalysisMaoTargetSource(financingSafeTargetSource);
        candidateMaxOfferTargetSource = financingSafeTargetSource;
        const normalizedBasis = candidateMaxOfferTarget
          ? captureNonBuyBoxDecisionBasis({
              source:
                financingSafeTargetSource === "starter-criteria"
                  ? "starter-criteria"
                  : "selected-targets",
              target: candidateMaxOfferTarget,
              strategyKey: currentAnalyzerStrategyKey(),
            })
          : null;
        analysisDecisionBasisRef.current = normalizedBasis;
        setAnalysisDecisionBasis(normalizedBasis);
        setDecisionBasisNeedsReview(false);
        if (!candidateMaxOfferTarget) clearPendingMaoTarget();
      }
      // Sample-seeded example targets never persist as an adoption — a saved
      // copy of (or fork from) the demo records screening-defaults until the
      // user adopts rules themselves. The DISPLAYED state must converge to
      // that persisted row too: leaving the sample target live while the row
      // records null pins isMaoTargetDirty (→ "Unsaved changes") in a state
      // no amount of re-saving could ever clear.
      const sampleSeededTarget = sampleSeededMaoTargetRef.current;
      if (sampleSeededTarget) {
        sampleSeededMaoTargetRef.current = false;
        analysisMaoTargetRef.current = null;
        setAnalysisMaoTarget(null);
        setAnalysisMaoTargetSource("screening-defaults");
        analysisDecisionBasisRef.current = null;
        setAnalysisDecisionBasis(null);
        setDecisionBasisNeedsReview(false);
        clearPendingMaoTarget();
      }
      const targetWasAdopted =
        !sampleSeededTarget &&
        isAdoptedOfferCeilingTargetSource(candidateMaxOfferTargetSource);
      const maxOfferTargetSnapshot = targetWasAdopted
        ? candidateMaxOfferTarget
        : null;
      let decisionBasisSnapshot = maxOfferTargetSnapshot
        ? normalizeOfferCeilingDecisionBasis(analysisDecisionBasisRef.current, {
            target: maxOfferTargetSnapshot,
            source: candidateMaxOfferTargetSource,
            strategyKey: currentAnalyzerStrategyKey(),
          })
        : null;
      // A historical target with only the anonymous `buy-box` source cannot
      // be attributed to any current account row. Preserve the exact numeric
      // criteria as selected custom rules and capture that truthful basis.
      if (
        maxOfferTargetSnapshot &&
        candidateMaxOfferTargetSource === "buy-box" &&
        !decisionBasisSnapshot
      ) {
        candidateMaxOfferTargetSource = "selected-targets";
      }
      if (maxOfferTargetSnapshot && !decisionBasisSnapshot) {
        decisionBasisSnapshot = captureNonBuyBoxDecisionBasis({
          source:
            candidateMaxOfferTargetSource === "starter-criteria"
              ? "starter-criteria"
              : "selected-targets",
          target: maxOfferTargetSnapshot,
          strategyKey: currentAnalyzerStrategyKey(),
        });
      }
      const maxOfferTargetSourceSnapshot: OfferCeilingTargetSource =
        maxOfferTargetSnapshot
          ? candidateMaxOfferTargetSource
          : "screening-defaults";
      if (maxOfferTargetSnapshot && !analysisMaoTargetRef.current) {
        analysisMaoTargetRef.current = maxOfferTargetSnapshot;
        setAnalysisMaoTarget(maxOfferTargetSnapshot);
      }
      if (maxOfferTargetSnapshot) {
        setAnalysisMaoTargetSource(maxOfferTargetSourceSnapshot);
        analysisDecisionBasisRef.current = decisionBasisSnapshot;
        setAnalysisDecisionBasis(decisionBasisSnapshot);
        setDecisionBasisNeedsReview(false);
      }
      const expectedUnderwritingRevision = targetExistingId
        ? (options.expectedUnderwritingRevisionOverride ??
          (targetExistingId === savedDealIdRef.current
            ? savedUnderwritingRevisionRef.current
            : null))
        : null;
      const result = await saveDealAction(
        currentValues,
        targetExistingId,
        confidenceContext.provenance,
        {
          ...(options.saveAsNewScenario ? { saveAsNewScenario: true } : {}),
          ...(options.allowAddressChange ? { allowAddressChange: true } : {}),
          ...(targetExistingId && expectedUnderwritingRevision !== null
            ? { expectedUnderwritingRevision }
            : {}),
          inputVerification,
          touchedInputFields: confidenceContext.touchedInputFields,
          startingAssumptionOrigins:
            confidenceContext.startingAssumptionOrigins,
          purchasePriceEstimated: confidenceContext.purchasePriceEstimated,
          purchasePriceSource: confidenceContext.purchasePriceSource,
          inputSourceContextProvided: true,
          ...(isFeatureEnabled("financing_profiles")
            ? { financingProfileSnapshot: appliedFinancingProfile }
            : {}),
          maxOfferTarget: maxOfferTargetSnapshot,
          maxOfferTargetSource: maxOfferTargetSourceSnapshot,
          offerCeilingDecisionBasis: decisionBasisSnapshot,
          analyzerStrategyKey: activeStrategyKeyRef.current ?? "buy-hold",
        },
      );
      if (result.ok) {
        clearPendingMaoTarget();
        if (options.autoAfterAuth) {
          clearPendingSaveIntent();
          autoSaveAfterAuthRef.current = false;
          setIsAutoSaveResuming(false);
          trackEvent("analysis_saved_after_signup", {
            property_type: currentValues.propertyType,
          });
        }
        // A save that came from a chooser dialog succeeded - close it.
        setDuplicateCollision(null);
        setAddressChangedPrompt(null);
        setUnderwritingConflict(null);
        setDeletedDealRecoveryActive(false);
        // Deal-agnostic bookkeeping first — it must run even when a fork
        // races this save (the deal DID persist server-side): the local
        // count feeds the client save-limit gate, and the event refreshes
        // header/My Deals listeners, regardless of which deal the form
        // now holds.
        if (result.mode === "inserted") {
          setSavedDealCount((count) => {
            // Third saved deal = a real workflow habit forming — the
            // high-signal moment for the one-question testimonial ask.
            if (count + 1 === 3) dispatchProofMoment("third_save");
            return count + 1;
          });
        }
        window.dispatchEvent(new CustomEvent("saved-analyses-changed"));
        // parsedValues derives from the payload actually sent (NOT a fresh
        // form.getValues()): edits made while the save was in flight must
        // not be stamped as the persisted/displayed "saved" state.
        const parsedValues =
          releasedInvestmentFormSchema.safeParse(currentValues);
        // Fork raced this save (see saveGeneration above): the form now
        // holds the NEXT deal — do not attach the saved id or clear the
        // fork's draft.
        if (saveGeneration !== forkGenerationRef.current) {
          toast({
            title: "Deal saved",
            description: "Saved before you moved on — find it in My Deals.",
            variant: "success",
          });
          return true;
        }
        setSavedDealId(result.id);
        savedDealIdRef.current = result.id;
        lastCompletedSaveDealIdRef.current = result.id;
        savedUnderwritingRevisionRef.current = result.underwritingRevision;
        replaceSavedDealUrl(result.id);
        if (result.mode === "inserted") setLoadedPipelineStage(null);
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
          });
        }
        // The persisted baseline is the payload the server actually stored
        // (currentValues) — never a fresh form.getValues(): recording
        // mid-flight edits as "persisted" flipped the badge to "Saved"
        // while the DB row held the pre-edit numbers.
        const persistedJson = formSnapshotForCompare(currentValues);
        if (persistedJson) lastPersistedFormJsonRef.current = persistedJson;
        lastPersistedMaoTargetJsonRef.current = maoTargetFingerprint(
          maxOfferTargetSnapshot,
        );
        if (parsedValues.success) {
          const values = parsedValues.data;
          const savedResult = calculateAnalysis(values);
          // The server captured the persisted solve atomically. This client
          // response intentionally carries no paid result, so return to the
          // live server boundary until the row is reopened.
          setRecordedOfferCeiling(null);
          setSavedMethodologyLabel(null);
          setRecordedSpecialistAnalysis(null);
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
                  savedResult.taxStrategyYears,
                )
              : null,
          );
          if (persistedJson) lastComputedFormJsonRef.current = persistedJson;
          void loadDealScore(values, savedResult);
        } else {
          setProjectionSource((prev) =>
            prev ? { ...prev, analysisId: result.id } : prev,
          );
          setTaxStrategySource((prev) =>
            prev ? { ...prev, analysisId: result.id } : prev,
          );
          setExitScenarioSource((prev) =>
            prev ? { ...prev, analysisId: result.id } : prev,
          );
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
          // it. Use the product's same-tab navigation convention so a phone
          // investor does not accumulate hidden analyzer/workspace tabs.
          action:
            result.mode === "inserted" ? (
              <ToastAction
                altText="Open this deal's workspace"
                onClick={() => {
                  router.push(`/dashboard/saved-analyses/${result.id}`);
                }}
              >
                Open deal workspace
              </ToastAction>
            ) : undefined,
        });
        return true;
      }
      if (result.code === "SIGN_IN_REQUIRED") {
        // Server-side backstop (the UI normally gates anon saves before this
        // action runs — e.g. an expired session mid-edit lands here). Don't
        // dead-end the highest-intent click: offer the sign-in route and set
        // the pending-save-intent flag so their deal auto-resumes after auth.
        toast({
          title: "Account needed to save",
          description:
            "Create a free account (or sign in) and this deal saves itself.",
          variant: "destructive",
          action: (
            <ToastAction
              altText="Create a free account and come back to this deal"
              onClick={() => {
                writeCalcDraftWithMaoTarget(
                  currentValues,
                  maxOfferTargetSnapshot,
                  options.maxOfferTargetSourceOverride ??
                    analysisMaoTargetSource ??
                    "selected-targets",
                  activeStrategyKeyRef.current,
                  buildLiveInputConfidenceSourceContext(
                    currentValues,
                    form.formState.dirtyFields as Record<string, unknown>,
                  ),
                  decisionBasisSnapshot,
                );
                setPendingSaveIntent(currentValues);
                // Sign-up, not login — anon savers are mostly first-timers;
                // the sign-up page has a "Sign in" cross-link that keeps ?next.
                router.push("/auth/sign-up?next=/dashboard/new");
              }}
            >
              Create free account
            </ToastAction>
          ),
        });
        return;
      }
      if (result.code === "ENTITLEMENT_SAVE") {
        if (options.autoAfterAuth) {
          clearPendingSaveIntent();
          autoSaveAfterAuthRef.current = false;
          setIsAutoSaveResuming(false);
        }
        // Three causes share this code. A PAID user at a finite cap frees
        // space; a FREE user at the 5-deal cap is the product's most natural
        // upgrade moment — it must actually offer the upgrade (deriving
        // "at cap" from canSaveDeals alone sent free users to Manage deals
        // and never mentioned Pro); a plan with no save entitlement at all
        // upgrades. Paid is derived from the existing client paid proxy
        // (canUpdateSavedDeals), never a plan-name string.
        const isPaidPlan = canUpdateSavedDeals;
        const freeAtCap = !isPaidPlan && canSaveDeals;
        toast({
          title: isPaidPlan
            ? "Saved-deal limit reached"
            : freeAtCap
              ? "Free limit: 5 saved deals"
              : "Upgrade required",
          description:
            (freeAtCap
              ? "Delete a deal to free a slot, or go Pro for unlimited saved deals. Archived deals still count."
              : null) ??
            result.message ??
            (isPaidPlan
              ? "You're at your plan's saved-deal limit. Delete a deal to free space; archived deals still count."
              : "Subscribe to save and unlock Pro features."),
          variant: isPaidPlan ? "destructive" : "default",
          action: (
            <ToastAction
              altText={
                isPaidPlan ? "Manage your saved deals" : "See TrueCap plans"
              }
              onClick={() =>
                router.push(
                  isPaidPlan ? "/dashboard/saved-analyses" : "/pricing",
                )
              }
            >
              {isPaidPlan ? "Manage deals" : "See Pro plans"}
            </ToastAction>
          ),
        });
        return;
      }
      if (result.code === "STALE_DATA") {
        // Preserve every local edit. The user chooses whether to reload the
        // newest saved row or keep this work as a separately named scenario;
        // never guess which version should win.
        if (targetExistingId) {
          awaitingResolution = true;
          setDuplicateCollision(null);
          setAddressChangedPrompt(null);
          setUnderwritingConflict({
            savedDealId: targetExistingId,
            autoAfterAuth: options.autoAfterAuth,
          });
          return;
        }
      }
      if (result.code === "MIGRATION_PENDING") {
        toast({
          title: "Saved-deal updates are temporarily paused",
          description:
            result.message ??
            "Apply the saved-analysis concurrency migration before updating existing deals. Your edits are still on this screen.",
          variant: "destructive",
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
        savedUnderwritingRevisionRef.current = null;
        setUnderwritingConflict(null);
        replaceSavedDealUrl(null);
        lastPersistedFormJsonRef.current = null;
        lastPersistedMaoTargetJsonRef.current = null;
        const recoveryValues = form.getValues();
        try {
          writeCalcDraftWithMaoTarget(
            recoveryValues,
            analysisMaoTargetRef.current,
            analysisMaoTargetSource,
            activeStrategyKeyRef.current,
            buildLiveInputConfidenceSourceContext(
              recoveryValues,
              form.formState.dirtyFields as Record<string, unknown>,
            ),
            analysisDecisionBasisRef.current,
          );
        } catch {
          /* storage unavailable — the on-screen recovery path still remains */
        }
        // There is no persisted baseline after detaching, so the generic dirty
        // synchronizer would call this clean. Keep the recovery truth explicit.
        setHasUnsavedChanges(true);
        setDeletedDealRecoveryActive(true);
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
          awaitingResolution = true;
          setAddressChangedPrompt(null);
          setDuplicateCollision({
            existingId: result.existingId,
            existingTitle: result.existingTitle,
            existingUnderwritingRevision: result.existingUnderwritingRevision,
            autoAfterAuth: options.autoAfterAuth,
          });
          return;
        }
        toast({
          title: "Already saved",
          description:
            result.message ??
            "You already saved an analysis for this address. Open it to update, or change the address to save a new scenario.",
          action: (
            <ToastAction
              altText="View your saved deals"
              onClick={() => router.push("/saved-analyses")}
            >
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
    } catch {
      if (options.autoAfterAuth) setIsAutoSaveResuming(false);
      // The action REJECTED rather than returning {ok:false} — a network blip
      // mid-save, a cold-start 500, or a tab one deploy behind main (Next 16
      // throws on an unrecognized Server Action). The finally below already
      // frees the button, but without this catch the throw was UNHANDLED and
      // the user got no signal at all: their deal silently didn't save while
      // the UI looked idle. Toast a retryable message; the "Unsaved changes"
      // badge stays armed so a retry is one click away. Mirrors login-form.tsx.
      toast({
        title: "Could not save",
        description:
          "Something interrupted the save. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      saveInFlightRef.current = false;
      setIsSavingDeal(false);
      if (
        options.autoAfterAuth &&
        !awaitingResolution &&
        hasPendingSaveIntent()
      ) {
        setIsAutoSaveResuming(false);
      }
    }
    return false;
  };

  const handleSaveDeal = async (
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource,
  ) => {
    if (hasUnappliedTargetDraft) {
      toast({
        title: "Finish your criteria edits first",
        description: "Apply or cancel the criteria edits before saving.",
        variant: "warning",
      });
      return false;
    }
    const normalizedTarget = normalizeMaoTarget(maoTarget);
    let normalizedSource =
      normalizeOfferCeilingTargetSource(source) ??
      (normalizedTarget ? "selected-targets" : "screening-defaults");
    const adoptedTarget =
      normalizedTarget && isAdoptedOfferCeilingTargetSource(normalizedSource)
        ? normalizedTarget
        : null;
    if (adoptedTarget) {
      let decisionBasis = normalizeOfferCeilingDecisionBasis(
        analysisDecisionBasisRef.current,
        {
          target: adoptedTarget,
          source: normalizedSource,
          strategyKey: currentAnalyzerStrategyKey(),
        },
      );
      if (normalizedSource === "buy-box" && !decisionBasis) {
        normalizedSource = "selected-targets";
      }
      if (!decisionBasis) {
        decisionBasis = captureNonBuyBoxDecisionBasis({
          source:
            normalizedSource === "starter-criteria"
              ? "starter-criteria"
              : "selected-targets",
          target: adoptedTarget,
          strategyKey: currentAnalyzerStrategyKey(),
        });
      }
      // Adopt the exact target the child rendered before starting IO. This
      // captures an untouched buy-box seed and keeps a failed save visibly
      // dirty instead of claiming the old persisted target is still current.
      analysisMaoTargetRef.current = adoptedTarget;
      setAnalysisMaoTarget(adoptedTarget);
      setAnalysisMaoTargetSource(normalizedSource);
      analysisDecisionBasisRef.current = decisionBasis;
      setAnalysisDecisionBasis(decisionBasis);
      setDecisionBasisNeedsReview(false);
      syncFormDirtyVersusPersisted();
    }
    return performSaveDeal({
      ...(adoptedTarget
        ? {
            maxOfferTargetOverride: adoptedTarget,
            maxOfferTargetSourceOverride: normalizedSource,
          }
        : {}),
    });
  };

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
          ? {
              existingIdOverride: duplicateCollision.existingId,
              ...(duplicateCollision.existingUnderwritingRevision !== undefined
                ? {
                    expectedUnderwritingRevisionOverride:
                      duplicateCollision.existingUnderwritingRevision,
                  }
                : {}),
              autoAfterAuth: duplicateCollision.autoAfterAuth,
            }
          : // forceInsert alongside saveAsNewScenario: "save as scenario"
            // always means INSERT a sibling at this address. Without it, a
            // collision reached while a saved deal is attached (the
            // address-changed flow: deal A loaded, address retyped to deal
            // B's) would re-target deal A's id, take the server's update
            // path (which ignores saveAsNewScenario), and bounce back into
            // the ADDRESS_CHANGED dialog — a chooser loop. When no deal is
            // attached (the plain duplicate flow), forceInsert is a no-op.
            {
              saveAsNewScenario: true,
              forceInsert: true,
              autoAfterAuth: duplicateCollision.autoAfterAuth,
            },
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
            },
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
    const adopted = selectUnderwritingEnrichment(enrichment);
    if (f?.bedrooms != null)
      form.setValue("bedrooms", f.bedrooms, {
        shouldDirty: true,
        shouldValidate: true,
      });
    if (f?.bathrooms != null)
      form.setValue("bathrooms", f.bathrooms, {
        shouldDirty: true,
        shouldValidate: true,
      });
    if (f?.squareFootage != null)
      form.setValue("sqft", f.squareFootage, {
        shouldDirty: true,
        shouldValidate: true,
      });
    if (adopted.purchasePrice != null) {
      form.setValue("purchasePrice", adopted.purchasePrice, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (adopted.purchasePriceSource === "active-listing") {
        bindPurchasePriceProviderSource(
          {
            kind: "active-listing",
            provider: "rentcast",
            fetchedAt: enrichment.fetchedAt,
          },
          adopted.purchasePrice,
          form.getValues("address"),
        );
        setPriceEstimated(false);
        setEstimatedPriceValue(null);
        setPriceEstimateBasis(null);
      }
    }
    const pt = form.getValues("propertyType");
    if (
      adopted.monthlyRent != null &&
      (pt === "single-family" || pt === "owner-occupant")
    ) {
      form.setValue("monthlyRent", adopted.monthlyRent, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setMarketRentEstimate(adopted.monthlyRent);
      enrichmentCaptureRef.current.monthlyRent = {
        source: "rentcast-estimate",
        detail: "RentCast market-rent estimate",
        fetchedAt: enrichment.fetchedAt,
        value: adopted.monthlyRent,
      };
    }
  };

  // "Apply to deal" from the rehab estimator — writes the estimate into the
  // rehabBudget field (Financing) so it counts toward cash invested. The
  // estimator stops being a dead-end calculator.
  const handleApplyRehab = (total: number) => {
    const amount = Math.max(0, Math.round(total));
    form.setValue("rehabBudget", amount, {
      shouldDirty: true,
      shouldValidate: true,
    });
    toast({
      title: "Rehab added to the deal",
      description: `$${Math.round(amount).toLocaleString()} added to cash invested. Your live result is updating now.`,
    });
  };

  const handleExportPdf = async (
    mode: ReportMode = "personal",
    maoTarget?: MaoTarget,
    maoTargetSource?: OfferCeilingTargetSource,
  ) => {
    if (!analysisResult) return;
    const exportTrigger =
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (hasUnappliedTargetDraft) {
      toast({
        title: "Finish your criteria edits first",
        description: "Apply or cancel the criteria edits before exporting.",
        variant: "warning",
      });
      return;
    }
    // Capture the exact target before the entitlement chooser returns early.
    // The one-time Pack dialog opens on that early path, then Stripe performs
    // a full-page round trip; without this synchronous ref update the Pack
    // would silently fall back to canonical defaults on return.
    const requestedMaoTarget = normalizeMaoTarget(maoTarget);
    const requestedMaoTargetSource =
      normalizeOfferCeilingTargetSource(maoTargetSource) ??
      analysisMaoTargetSource ??
      "selected-targets";
    if (requestedMaoTarget) {
      analysisMaoTargetRef.current = requestedMaoTarget;
      setAnalysisMaoTarget(requestedMaoTarget);
      setAnalysisMaoTargetSource(requestedMaoTargetSource);
    }
    const oneTimeUnlocked = oneTimePdfUnlockedRef.current;
    // Without entitlement (or auth), offer the two purchase paths
    // instead of the old dead-end toast. New one-time checkout is disabled.
    // A verified one-time payment bypasses this gate exactly once.
    if (
      !oneTimeUnlocked &&
      !anonymousDecisionGrantAvailable &&
      (!isAuthenticated || !canExportPdf)
    ) {
      trackEvent("paywall_viewed", {
        trigger: "pdf_export",
        placement: "analyzer_results",
      });
      pdfPurchaseTriggerRef.current = exportTrigger;
      setIsPdfPurchaseDialogOpen(true);
      return;
    }
    if (oneTimeUnlocked) {
      const redemption = oneTimePdfRedemptionRef.current;
      const currentFormJson = formSnapshotForCompare(form.getValues());
      if (
        !redemption ||
        !currentFormJson ||
        currentFormJson !== redemption.boundFormJson
      ) {
        toast({
          title: "This report is bound to the purchased deal",
          description:
            "Restore the exact deal used at checkout, then retry. The purchase cannot be moved to different property inputs.",
          variant: "destructive",
        });
        return;
      }
    }
    setIsExportingPdf(true);
    try {
      const values = form.getValues();
      let savedExport: { id: string; renderFingerprint: string } | undefined;
      // Bind a reopened saved result to the same owner-scoped input/fingerprint
      // path as My Deals. The exact no-signup decision deliberately skips this
      // saved-row preflight even after signup: its signed grant is the authority
      // and the evaluation ledger intentionally does not debit that first deal.
      // The server remains the publication authority in both paths.
      if (
        !oneTimeUnlocked &&
        !anonymousDecisionGrantAvailable &&
        savedDealId &&
        !hasPendingDealChanges
      ) {
        const { getSavedAnalysisPdfExportAction } =
          await import("@/app/actions/saved-analyses");
        const savedAuthority = await getSavedAnalysisPdfExportAction(
          savedDealId,
          { bypassCache: mode !== "personal" },
        );
        if (!savedAuthority.ok) {
          toast({
            title: "Could not export PDF",
            description: savedAuthority.message,
            variant: "destructive",
          });
          return;
        }
        if (savedAuthority.source === "cache") {
          const { downloadPdfFromBase64 } = await import("@/lib/pdf/download");
          downloadPdfFromBase64(
            savedAuthority.pdfBase64,
            "Investment-Analysis-Report.pdf",
          );
          toast({
            title: "PDF downloaded",
            description: "Your verified saved report was downloaded.",
            variant: "success",
          });
          dispatchProofMoment("pdf_export");
          return;
        }
        savedExport = {
          id: savedAuthority.id,
          renderFingerprint: savedAuthority.renderFingerprint,
        };
      }
      const pendingMaoBinding = readPendingMaoTargetBinding(
        maoTargetAnalysisFingerprint(values),
      );
      const reportMaoTarget =
        normalizeMaoTarget(maoTarget) ??
        analysisMaoTargetRef.current ??
        pendingMaoBinding?.target ??
        readPendingMaoTarget(maoTargetAnalysisFingerprint(values));
      const reportMaoTargetSource =
        normalizeOfferCeilingTargetSource(maoTargetSource) ??
        analysisMaoTargetSource ??
        pendingMaoBinding?.source ??
        "selected-targets";

      // The report is COMPOSED ON THE SERVER. It used to be built here in the
      // browser, which meant the `canExportPdf` check a few lines up was the
      // only thing standing between a free user and the paid report — and a
      // check that runs in the client is not a check. The server action
      // re-verifies entitlement (or a genuine $5 pack claim) before it renders
      // a single byte, and resolves branding itself so co-branding cannot be
      // granted by posting a logo URL.
      //
      // Bonus: jspdf no longer ships to the browser at all, so the homepage
      // bundle drops the ~130-150 KB gzipped it used to carry for this button.
      const { generateReportPdfAction } =
        await import("@/app/actions/generate-report-pdf");
      const { downloadPdfFromBase64 } = await import("@/lib/pdf/download");

      // The one-time pack path proves purchase with the claim the buyer holds.
      // Read the secret from session storage, where the return handler put it.
      let claimPayload:
        | { id: string; secret: string; values: typeof values }
        | undefined;
      if (oneTimeUnlocked) {
        const redemption = oneTimePdfRedemptionRef.current;
        if (redemption) {
          try {
            const secret = parseOneTimePdfClaimSecret(
              window.sessionStorage.getItem(
                oneTimePdfClaimSecretKey(redemption.claimId),
              ),
            );
            if (secret)
              claimPayload = { id: redemption.claimId, secret, values };
          } catch {
            // Storage unavailable — fall through to the entitlement check.
          }
        }
      }

      const pdfResult = await generateReportPdfAction({
        values,
        maxOfferTarget: reportMaoTarget,
        maxOfferTargetSource: reportMaoTargetSource,
        mode,
        ...(savedExport ? { savedExport } : {}),
        ...(claimPayload ? { claim: claimPayload } : {}),
      });

      if (!pdfResult.ok) {
        // An unentitled caller is offered the two purchase paths, exactly as
        // the pre-flight check does — the server is simply the authority now.
        if (
          pdfResult.code === "ENTITLEMENT_REQUIRED" ||
          pdfResult.code === "SIGN_IN_REQUIRED"
        ) {
          trackEvent("paywall_viewed", {
            trigger: "pdf_export_server_gate",
            placement: "analyzer_results",
          });
          pdfPurchaseTriggerRef.current = exportTrigger;
          setIsPdfPurchaseDialogOpen(true);
          return;
        }
        toast({
          title: "Export failed",
          description: pdfResult.message,
          variant: "destructive",
        });
        return;
      }

      downloadPdfFromBase64(pdfResult.pdfBase64, pdfResult.filename);
      // The saved-deal analyzer and My Deals must converge on the same
      // retained-report path. Only the personal report is cacheable: the row
      // currently stores one PDF object, while lender/partner/agent modes have
      // deliberately different presentation and already bypass that cache.
      if (savedExport && mode === "personal" && pdfResult.cacheAttestation) {
        void cacheSavedAnalysisPdfExport({
          analysisId: savedExport.id,
          renderFingerprint: savedExport.renderFingerprint,
          artifactAttestation: pdfResult.cacheAttestation,
          pdfBase64: pdfResult.pdfBase64,
        });
      }
      const brandingConfig = pdfResult.hasBranding ? {} : null;
      // Keep the browser/deal-bound claim in same-tab sessionStorage after
      // generation. A synthetic download click cannot prove that the browser
      // actually saved the file, so deleting the secret here would break the
      // promised 24-hour recovery path for a blocked/cancelled local download.
      // The server remains authoritative: it accepts only the same secret,
      // user (when present), and exact deal fingerprint, and expires recovery
      // 24 hours after atomic consumption. Session storage disappears with the
      // tab and never becomes a reusable URL credential.
      if (oneTimeUnlocked) {
        try {
          window.sessionStorage.removeItem(ONE_TIME_PDF_ACTIVE_CLAIM_KEY);
          // Clean up only the pre-security draft key, never the general
          // anonymous calculator auto-save draft.
          window.localStorage.removeItem(ONE_TIME_PDF_LEGACY_DRAFT_KEY);
        } catch {
          // Recovery storage is already present. Legacy cleanup must not turn
          // a successful download into failure.
        }
      }
      // Fire the Google Ads conversion event. PDF export = high-intent
      // signal (user is sharing the analysis with a lender / partner).
      // Even though it's not a revenue event, surfacing it to the Ads
      // optimizer gives the bidding algo extra positive signal beyond
      // the rare 'paid_subscribed' event - critical for new accounts
      // where conversion data is sparse.
      trackConversion("pdf_exported");
      trackEvent("pdf_exported", {
        property_type: values.propertyType,
        has_deal_score: Boolean(
          dealScoreResult?.ok && dealScoreResult.tier === "pro",
        ),
      });
      // A completed export is the other high-signal testimonial moment
      // (the prompt component self-caps to once per browser, ever).
      dispatchProofMoment("pdf_export");
      trackEvent("report_generated", { report_type: mode });
      trackEvent("decision_memo_generated", {
        surface: "analyzer",
        audience: mode,
        methodology_version: analysisResult.methodologyVersion,
      });
      if (advocacyDecisionContract && reportMaoTarget) {
        const reportTargetContext = buildDecisionTargetContext({
          target: reportMaoTarget,
          source: reportMaoTargetSource,
          profileId: isSampleProPreview
            ? SAMPLE_DEAL_FIXTURE.targetProfile.id
            : null,
          profileName: isSampleProPreview
            ? SAMPLE_DEAL_FIXTURE.targetProfile.name
            : null,
          profileVersion: isSampleProPreview
            ? SAMPLE_DEAL_FIXTURE.targetProfile.version
            : null,
        });
        trackEvent("memo_generated", {
          surface: "analyzer",
          model_version: analysisResult.methodologyVersion,
          rule_set_version:
            reportTargetContext.profileVersion ??
            reportTargetContext.identityStatus,
        });
      }
      trackEvent("report_viewed", { report_type: mode, surface: "pdf_export" });
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
            {savedExport
              ? "Your report was generated from the saved inputs using the current compatible underwriting methodology."
              : "Your report was generated from the latest live inputs using the current underwriting methodology."}
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
   * Return-from-Stripe handler. The root-layout bootstrap already moved the
   * public claim id out of the URL before any analytics script loaded. This
   * effect combines it with the separately stored secret + exact draft,
   * consumes the server claim, and auto-exports only that bound deal.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Defense in depth for non-standard rendering/dev environments where the
    // head bootstrap did not run. Capture only the non-secret UUID. A legacy
    // Stripe Session id is deliberately discarded and can no longer redeem.
    try {
      const currentUrl = new URL(window.location.href);
      const claimId = currentUrl.searchParams.get("pdf_claim");
      const legacy = currentUrl.searchParams.get("pdf_purchase");
      if (claimId || legacy) {
        const returnState = claimId
          ? { v: 2, kind: "claim" as const, claimId, capturedAt: Date.now() }
          : legacy === "cancelled"
            ? { v: 2, kind: "cancelled" as const, capturedAt: Date.now() }
            : { v: 2, kind: "legacy" as const, capturedAt: Date.now() };
        try {
          window.sessionStorage.setItem(
            ONE_TIME_PDF_RETURN_KEY,
            JSON.stringify(returnState),
          );
        } catch {
          // Continue to strip even when storage is unavailable. Privacy wins.
        }
        currentUrl.searchParams.delete("pdf_claim");
        currentUrl.searchParams.delete("pdf_purchase");
        window.history.replaceState(
          window.history.state,
          "",
          currentUrl.pathname + currentUrl.search + currentUrl.hash,
        );
      }
    } catch {
      // The root bootstrap is the primary path; malformed-location fallback
      // must never break the calculator.
    }

    let returnState = null;
    try {
      returnState = parseOneTimePdfReturnState(
        window.sessionStorage.getItem(ONE_TIME_PDF_RETURN_KEY),
      );
    } catch {
      return;
    }
    if (!returnState) return;

    if (returnState.kind === "cancelled") {
      try {
        window.sessionStorage.removeItem(ONE_TIME_PDF_RETURN_KEY);
      } catch {
        // Cleanup is best-effort. Keep the claim secret/draft until this tab
        // closes in case the user returns to Stripe from browser history and
        // completes the still-open hosted session after cancelling once.
      }
      toast({
        title: "Checkout cancelled",
        description:
          "No charge was made. Your deal is still in the form below.",
      });
      return;
    }

    if (returnState.kind === "legacy") {
      // Pre-hardening Checkout Session ids were reusable bearer capabilities
      // and had no server-side deal binding. Retrofitting "first claimant
      // wins" would preserve the takeover bug, so legacy automatic redemption
      // fails closed. Stripe/support records remain available for fulfillment.
      try {
        window.sessionStorage.removeItem(ONE_TIME_PDF_RETURN_KEY);
      } catch {
        // Non-fatal; the URL token was already destroyed by the bootstrap.
      }
      toast({
        title: "Secure verification required",
        description:
          "This checkout used the older return format and cannot be auto-redeemed safely. Contact hello@usetruecap.com with the email used at checkout; your payment record is intact.",
        variant: "destructive",
      });
      return;
    }

    let claimSecret: string | null = null;
    let restoredValues: InvestmentFormValues | null = null;
    let restoredMaoTarget: MaoTarget | null = null;
    let restoredMaoTargetSource: OfferCeilingTargetSource = "selected-targets";
    let boundFormJson: string | null = null;
    try {
      const secretRaw = window.sessionStorage.getItem(
        oneTimePdfClaimSecretKey(returnState.claimId),
      );
      claimSecret = parseOneTimePdfClaimSecret(secretRaw);
      const draftRaw = window.sessionStorage.getItem(ONE_TIME_PDF_DRAFT_KEY);
      const restoredDraft = parseOneTimePdfDraft(draftRaw);
      if (restoredDraft) {
        restoredValues = restoredDraft.values;
        restoredMaoTarget = restoredDraft.target;
        restoredMaoTargetSource = restoredDraft.source;
        boundFormJson = formSnapshotForCompare(restoredDraft.values);
      }
    } catch {
      // Corrupt/missing binding data is handled by the fail-closed branch.
    }

    if (
      !claimSecret ||
      !restoredValues ||
      !restoredMaoTarget ||
      !boundFormJson
    ) {
      toast({
        title: "Return to the checkout tab",
        description:
          "This one-time purchase is bound to the browser tab and exact deal that started it. If that tab is unavailable, contact hello@usetruecap.com with your checkout email.",
        variant: "destructive",
      });
      return;
    }

    const verifyAndExport = async (): Promise<void> => {
      let verified: Awaited<ReturnType<typeof verifyOneTimePdfPaymentAction>>;
      try {
        verified = await verifyOneTimePdfPaymentAction({
          claimId: returnState.claimId,
          claimSecret,
          values: restoredValues,
          maxOfferTarget: restoredMaoTarget,
          maxOfferTargetSource: restoredMaoTargetSource,
        });
      } catch (err) {
        console.warn("[one-time-pdf] verify call failed:", err);
        verified = {
          ok: false,
          code: "SERVER_ERROR",
          message:
            "Could not verify payment. Please try again or contact hello@usetruecap.com.",
        };
      }
      if (!verified.ok) {
        const canRetry =
          verified.code === "SERVER_ERROR" ||
          verified.code === "NOT_PAID" ||
          verified.code === "IDENTITY_MISMATCH";
        const title =
          verified.code === "ACCESS_SUSPENDED"
            ? "Report access paused"
            : verified.code === "ACCESS_REVOKED"
              ? "Report access revoked"
              : "Payment not confirmed";
        toast({
          title,
          description: verified.message,
          variant: "destructive",
          action: canRetry ? (
            <ToastAction
              altText="Retry payment verification"
              onClick={() => void verifyAndExport()}
            >
              Retry verification
            </ToastAction>
          ) : undefined,
        });
        return;
      }

      oneTimePdfUnlockedRef.current = true;
      oneTimePdfRedemptionRef.current = {
        claimId: verified.claimId,
        boundFormJson,
      };
      if (!verified.recovered) {
        trackEvent("complete_decision_purchased", {});
        trackEvent("one_time_pdf_purchased", {});
        trackEvent("single_deal_purchased", {
          price_variant:
            verified.priceVariant ??
            getMarketingOfferConfig().singleDealPriceVariant,
        });
        trackEvent("deal_decision_pack_purchased", {
          price_variant:
            verified.priceVariant ??
            getMarketingOfferConfig().singleDealPriceVariant,
        });
        trackEvent("single_deal_checkout_completed", {
          price_variant:
            verified.priceVariant ??
            getMarketingOfferConfig().singleDealPriceVariant,
        });
      }

      toast({
        title: verified.recovered
          ? "Secure report restored"
          : "Payment received",
        description: "Rebuilding your analysis and generating the report…",
        variant: "success",
      });
      // Pack credit (server-confirmed, so no env plumbing needed here):
      // tell the buyer their purchase counts toward Pro while the window
      // is live. Delayed so it isn't replaced by the export toast.
      if (verified.proCredit) {
        const creditDollars = Math.round(verified.proCredit.amountCents / 100);
        const creditDeadline = new Date(verified.proCredit.eligibleUntil);
        window.setTimeout(() => {
          trackEvent("pack_credit_offer_shown", {});
          toast({
            title: `Your $${creditDollars} is good toward Pro`,
            description: `Upgrade by ${creditDeadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })} and this purchase is credited to your first Pro invoice automatically.`,
            variant: "success",
          });
        }, 6000);
      }
      persistedInputConfidenceSourceContextRef.current = null;
      persistedInputConfidenceAddressRef.current = null;
      setInputVerification({});
      inputVerificationAddressRef.current = null;
      analysisMaoTargetRef.current = restoredMaoTarget;
      setAnalysisMaoTarget(restoredMaoTarget);
      setAnalysisMaoTargetSource(restoredMaoTargetSource);
      const restoredDecisionBasis = captureNonBuyBoxDecisionBasis({
        source:
          restoredMaoTargetSource === "starter-criteria"
            ? "starter-criteria"
            : "selected-targets",
        target: restoredMaoTarget,
        strategyKey: currentAnalyzerStrategyKey(),
      });
      analysisDecisionBasisRef.current = restoredDecisionBasis;
      setAnalysisDecisionBasis(restoredDecisionBasis);
      setDecisionBasisNeedsReview(false);
      // A verified paid claim is the opposite of sample theater — never let a
      // stale sample flag strip the recorded target from the rebuilt report.
      sampleSeededMaoTargetRef.current = false;
      Object.entries(restoredValues).forEach(([key, value]) => {
        form.setValue(key as keyof InvestmentFormValues, value as never, {
          shouldDirty: true,
          shouldValidate: false,
          shouldTouch: false,
        });
      });
      seedRestoredAddressIdentity(restoredValues.address);
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

  const handleNewAnalysis = async () => {
    // Workflow protection: if the user has unsaved work in the form
    // (analysis run + un-persisted, OR a saved deal edited but not
    // re-saved), confirm before nuking the form. resetToNewAnalysis
    // wipes address/price/rent and clears the localStorage draft, so
    // a misclick here is irrecoverable. A native confirm() is the
    // lightest possible guard - no modal infrastructure needed.
    const shouldConfirm =
      hasPendingDealChanges ||
      (!savedDealId && (Boolean(analysisResult) || form.formState.isDirty));
    if (shouldConfirm) {
      const ok = await confirmDialog({
        title: "Start a new analysis?",
        body: hasUnappliedTargetDraft
          ? "Your unapplied criteria edits will be cleared.\n\nCancel, then apply or cancel those edits first."
          : "Your current work will be cleared.\n\nIf you want to keep this deal, cancel and save it first.",
        confirmLabel: "Start new analysis",
      });
      if (!ok) return;
    }
    // A specialist strategy owns its property model. resetToNewAnalysis clears
    // the strategy, so clear its model with it; otherwise House Hack could
    // visually become Buy & Hold while retaining owner-occupant math. A manual
    // multi-family Buy & Hold user still keeps that useful repeat preference.
    resetToNewAnalysis(
      activeStrategyKeyRef.current
        ? "single-family"
        : (form.getValues("propertyType") ?? "single-family"),
    );
    replaceSavedDealUrl(null);
    setSavedTemplateFallback(null);
    setDeletedDealRecoveryActive(false);
  };

  // Dashboard-shell New Analysis controls stay mounted with this route. A
  // same-route Next.js Link does not remount the calculator, so handle the
  // shell's explicit reset request through the same guarded path as the
  // in-report action.
  useEffect(() => {
    const onRequest = () => handleNewAnalysis();
    window.addEventListener(NEW_ANALYSIS_REQUEST_EVENT, onRequest);
    return () =>
      window.removeEventListener(NEW_ANALYSIS_REQUEST_EVENT, onRequest);
  });

  /**
   * "Analyze another like this" (Phase D) — the in-flow copy-a-row. From the
   * CURRENT form values (no save required): keep reusable financing and general
   * operating assumptions while clearing the prior property's identity, income, parcel
   * costs, quote amounts, repairs, template link, and result state.
   *
   * Deliberately NOT resetToNewAnalysis: that path rebuilds factory/template
   * defaults. This one mirrors the My Deals "Duplicate" fork
   * (SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY mount branch above) without the
   * save + navigation — same clear list, same "assumptions are the point"
   * semantics. Property-specific entries are still user work, so confirm
   * before clearing them just as New Analysis does.
   */
  const handleAnalyzeAnotherLikeThis = async () => {
    const shouldConfirm = hasPendingDealChanges || !savedDealId;
    const ok =
      !shouldConfirm ||
      (await confirmDialog({
        title: "Analyze another property?",
        body: hasUnappliedTargetDraft
          ? "Your unapplied criteria edits will be cleared.\n\nCancel, then apply or cancel those edits first."
          : "This unsaved result will be cleared.\n\nReusable financing and general operating assumptions will remain. Offer criteria will be matched again for the next property. Save first if you want to keep this deal.",
        confirmLabel: "Analyze another",
      }));
    if (!ok) return;
    isProgrammaticResetRef.current = true;
    const sourceValues = form.getValues();
    const sourceInputContext = buildLiveInputConfidenceSourceContext(
      sourceValues,
      form.formState.dirtyFields as Record<string, unknown>,
    );
    const forkedValues = buildRepeatDealDraft(sourceValues);
    const forkedValuesForConfidence = forkedValues as InvestmentFormValues;
    const survivingSourceContext = restoreInputConfidenceSourceContext(
      sourceInputContext,
      forkedValuesForConfidence,
    );
    const forkedInputSourceContext = buildInputConfidence({
      values: forkedValuesForConfidence,
      provenance: survivingSourceContext.provenance,
      touchedFields: new Set(survivingSourceContext.touchedInputFields),
      startingAssumptionOrigins:
        survivingSourceContext.startingAssumptionOrigins,
      purchasePriceEstimated: survivingSourceContext.purchasePriceEstimated,
      purchasePriceSource: survivingSourceContext.purchasePriceSource,
    }).sourceContext;
    // A new property gets a fresh property-scoped Buy Box resolution. Carrying
    // the previous deal's adopted target made the convenient repeat workflow
    // silently screen a new market/property type against stale criteria.
    const carriedMaoTarget = null;
    const carriedDecisionBasis = null;
    const carriedMaoTargetSource = null;
    const carriedBasisNeedsReview = false;
    sampleSeededMaoTargetRef.current = false;
    setPreRunCriteriaChoice(null);
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
    form.reset(forkedValues);
    form.clearErrors();
    // A save from here is a NEW deal — never an overwrite of the source.
    setSavedDealId(null);
    savedDealIdRef.current = null;
    savedUnderwritingRevisionRef.current = null;
    setUnderwritingConflict(null);
    replaceSavedDealUrl(null);
    setLoadedPipelineStage(null);
    lastPersistedFormJsonRef.current = null;
    lastPersistedMaoTargetJsonRef.current = null;
    lastComputedFormJsonRef.current = null;
    setHasUnsavedChanges(false);
    // Property-specific captures + benchmarks: the next deal must never be
    // judged against the PREVIOUS address's enrichment / HUD FMR / estimate.
    enrichmentCaptureRef.current = {};
    persistedInputConfidenceSourceContextRef.current = null;
    persistedInputConfidenceAddressRef.current = null;
    setInputVerification({});
    inputVerificationAddressRef.current = null;
    setMarketRentEstimate(null);
    setUnitFmrByBedrooms(null);
    unitFmrKeyRef.current = null;
    enrichedUnitsRef.current.clear();
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
    setPurchasePriceSourceLabel(null);
    purchasePriceSourceRef.current = null;
    purchasePriceProvenanceAddressRef.current = null;
    purchasePriceProvenanceValueRef.current = null;
    // Stale listing-URL row (BROWSER-3 class) and the draft-restore banner
    // both name the OLD property — clear with the identity.
    setListingLinkOpen(false);
    setListingUrl("");
    setListingUrlError(false);
    setListingImportStatus(null);
    setSavedTemplateFallback(null);
    setRestoredFromDraft(false);
    setRestoredAddress(null);
    // Back to the input phase. clearAnalysisOutputs never touches form
    // values, so the kept assumptions are safe.
    clearAnalysisOutputs();
    analysisMaoTargetRef.current = carriedMaoTarget;
    setAnalysisMaoTarget(carriedMaoTarget);
    setAnalysisMaoTargetSource(carriedMaoTargetSource);
    analysisDecisionBasisRef.current = carriedDecisionBasis;
    setAnalysisDecisionBasis(carriedDecisionBasis);
    setDecisionBasisNeedsReview(carriedBasisNeedsReview);
    setIsCalculating(false);
    isCalculatingRef.current = false;
    // The forked assumptions are the point — the default-template auto-apply
    // must NOT fire over them (mirrors the Duplicate mount branch, which
    // never arms eligibility). Also drop any live auto-apply Undo snapshot:
    // restoring pre-apply values now would stomp the fork.
    autoApplyEligibleRef.current = false;
    autoApplyUndoRef.current = null;
    // Overwrite the anon draft so a reload restores this partial fork instead
    // of the SOURCE deal the watcher last wrote. The lenient draft normalizer
    // accepts the blank identity; the target-aware writer binds the carried
    // criteria now and rebinds them as address/price/rent are entered.
    try {
      writeCalcDraftWithMaoTarget(
        forkedValues,
        carriedMaoTarget,
        carriedMaoTargetSource,
        activeStrategyKeyRef.current,
        forkedInputSourceContext,
        carriedDecisionBasis,
      );
    } catch {
      /* storage unavailable — the fork still works for this session */
    }
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
    });
    toast({
      title: "Reusable assumptions kept",
      description:
        "Enter the next property's address, price, and rent. Financing and general operating assumptions carried over; Offer criteria, tax, insurance, and other property-specific inputs will be matched or reviewed again.",
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
   * user has unsaved edits to an existing saved deal. Anonymous and brand-new
   * form edits still use local draft recovery, but component-local criteria
   * edits cannot be recovered and therefore also arm this guard.
   * Browser policy ignores custom messages now, but the prompt itself
   * still fires - that's enough to prevent the accidental close.
   */
  useEffect(() => {
    const shouldWarn =
      hasUnappliedTargetDraft ||
      (isAuthenticated && Boolean(savedDealId) && hasUnsavedChanges);
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
  }, [
    hasUnappliedTargetDraft,
    hasUnsavedChanges,
    isAuthenticated,
    savedDealId,
  ]);

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
    const shouldWarn =
      hasUnappliedTargetDraft ||
      (isAuthenticated && Boolean(savedDealId) && hasUnsavedChanges);
    if (!shouldWarn) return;
    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      // Left click only; modifier clicks open new tabs and leave this page alive.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
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
      // The dashboard shell's same-route New Analysis links dispatch the
      // calculator's guarded reset event. Let that one owner show the warning;
      // prompting here as well made users confirm the same reset twice.
      if (
        window.location.pathname === "/dashboard/new" &&
        destination.pathname === "/dashboard/new"
      ) {
        return;
      }
      // Hash-only jump on the current page: no navigation, nothing lost.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash !== ""
      ) {
        return;
      }
      // An in-app dialog is asynchronous, and preventDefault() only works
      // synchronously — so block the navigation FIRST, ask, and re-issue it
      // ourselves on confirm. router.push preserves the client-side
      // navigation the intercepted <Link> would have performed.
      event.preventDefault();
      event.stopPropagation();
      void (async () => {
        const confirmed = await confirmDialog({
          title: hasUnappliedTargetDraft
            ? "Leave and discard criteria edits?"
            : "Leave without saving?",
          body: hasUnappliedTargetDraft
            ? "You have unapplied criteria edits on this deal."
            : "You have unsaved changes on this deal.",
          confirmLabel: "Leave page",
          cancelLabel: "Stay",
          destructive: true,
        });
        if (confirmed) {
          router.push(
            `${destination.pathname}${destination.search}${destination.hash}`,
          );
        }
      })();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [
    confirmDialog,
    router,
    hasUnappliedTargetDraft,
    hasUnsavedChanges,
    isAuthenticated,
    savedDealId,
  ]);

  const handleCompareDeals = async (
    maoTarget?: MaoTarget,
    source?: OfferCeilingTargetSource,
  ) => {
    if (compareInFlightRef.current) return;
    if (hasUnappliedTargetDraft) {
      toast({
        title: "Finish your criteria edits first",
        description: "Apply or cancel the criteria edits before comparing.",
        variant: "warning",
      });
      return;
    }
    trackEvent("comparison_started", { source: "analysis_result" });
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
    compareInFlightRef.current = true;
    setIsComparingDeals(true);
    try {
      let dealIdForCompare = savedDealId;
      if (!dealIdForCompare || hasPendingDealChanges) {
        // Reset before this exact attempt; a previous successful Save must
        // never authorize Compare after the current save opened a conflict or
        // duplicate-address chooser instead of completing.
        lastCompletedSaveDealIdRef.current = null;
        const saved = await handleSaveDeal(maoTarget, source);
        if (saved !== true) return;
        dealIdForCompare = lastCompletedSaveDealIdRef.current;
        if (!dealIdForCompare) {
          toast({
            title: "Saved, but Compare did not start",
            description:
              "Open Compare again after the saved deal finishes loading.",
            variant: "warning",
          });
          return;
        }
      }

      const result = await addDealToCompareAction(dealIdForCompare);
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
      trackEvent("deal_compared", { source: "analysis_result" });
      trackEvent("comparison_completed", { count_bucket: "2" });
      router.push("/dashboard/compare");
    } catch {
      toast({
        title: "Could not start Compare",
        description:
          "Something interrupted the request. Your analysis remains on this screen; try again.",
        variant: "destructive",
      });
    } finally {
      compareInFlightRef.current = false;
      setIsComparingDeals(false);
    }
  };

  /**
   * "Try a sample deal" - pre-fills the form with a synthetic
   * demonstration rental and triggers calculate. The single biggest
   * friction-killer for cold paid traffic: visitor lands on the
   * calculator, sees a wall of empty fields, bounces. This button
   * gives them a fully-populated working demo in one click.
   */
  const handleTrySampleDeal = () => {
    // A second tap while the first sample submit is still deferred (double-rAF
    // + 150ms backstop) would fire a second, NON-sample submit that consumes
    // the one-shot preview/target state and strips the demo it just launched.
    if (pendingSampleRunRef.current) return;
    // Shared single source of truth (lib/sample-deal.ts) - the homepage
    // hero mock card COMPUTES its displayed numbers from these same
    // values, so the demo can never contradict the marketing card
    // again (it did once: 'Strong Buy · 84' on the card, 'Risky · 20'
    // in the actual analysis).
    const sample: Partial<InvestmentFormValues> = SAMPLE_DEAL_FIXTURE.values;
    // Seed the sample's exact acquisition targets before any form mutation or
    // deferred submit. React may render intermediate form updates while the
    // requestAnimationFrame submit is waiting; setting this only inside
    // onSubmit allowed the focused result to mount once with the canonical
    // break-even target ($0 cash flow), which its MaxOfferCard could then feed
    // back into the dashboard. The early seed makes the launch atomic from
    // the user's perspective. onSubmit reasserts the same fixture after
    // validation as a defense against any intervening reset.
    analysisMaoTargetRef.current = { ...SAMPLE_DEAL_FIXTURE.maoTarget };
    setAnalysisMaoTarget({ ...SAMPLE_DEAL_FIXTURE.maoTarget });
    // The synthetic fixture carries a versioned, explicitly adopted example
    // profile. Keep its source tied to that fixture contract instead of
    // silently treating it as the ordinary starter criteria. The
    // sampleSeeded flag below prevents this demo-only adoption from ever
    // becoming the investor's saved or next-deal criteria.
    setAnalysisMaoTargetSource(SAMPLE_DEAL_FIXTURE.targetProfile.source);
    const sampleBasis = captureSelectedTargetsDecisionBasis({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      strategyKey: SAMPLE_DEAL_FIXTURE.strategyKey,
    });
    analysisDecisionBasisRef.current = sampleBasis;
    setAnalysisDecisionBasis(sampleBasis);
    setDecisionBasisNeedsReview(false);
    sampleSeededMaoTargetRef.current = true;
    // Apply each field via setValue so RHF dirties and the form's
    // controlled inputs re-render with the new values immediately.
    Object.entries(sample).forEach(([key, value]) => {
      form.setValue(key as keyof InvestmentFormValues, value as never, {
        shouldDirty: true,
        shouldValidate: false,
        shouldTouch: false,
      });
    });
    seedRestoredAddressIdentity(SAMPLE_DEAL_FIXTURE.values.address);

    // Arm the one-shot Pro preview for this run - consumed in onSubmit.
    pendingSamplePreviewRef.current = true;
    pendingSampleRunRef.current = true;
    strategyAppliedRef.current = null;
    strategyRevertRef.current = null;
    setActiveStrategyKey(SAMPLE_DEAL_FIXTURE.strategyKey);
    activeStrategyKeyRef.current = SAMPLE_DEAL_FIXTURE.strategyKey;

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

  /**
   * Hero/listing handoffs finish through the same one-click path as the visible
   * Calculate action. The criteria card already shows exactly which Buy Box or
   * starter criteria will be adopted, so sending the investor backward for a
   * second confirmation only made a successful import feel broken.
   */
  const submitProgrammaticHandoff = () => {
    const isWaitingForCriteria =
      analysisRunPromisesOfferCeiling({
        canCalculateMaxOffer: canUseMaxOffer,
        strategyKey: activeStrategyKeyRef.current,
      }) &&
      preRunBuyBoxStateRef.current === "loading" &&
      (!analysisMaoTargetRef.current ||
        decisionBasisNeedsReviewRef.current ||
        sampleSeededMaoTargetRef.current);
    if (isWaitingForCriteria) {
      pendingProgrammaticHandoffGenerationRef.current =
        forkGenerationRef.current;
      toast({
        title: "Finishing your decision criteria",
        description:
          "The property is ready. We’ll continue the analysis automatically as soon as your Buy Boxes finish loading.",
      });
      return;
    }
    void primaryRunActionRef.current();
  };

  // Latest-closure assignment for the hero address handoff (refs declared
  // up top; the listener effect calls this). Runs every render so it always
  // sees the current form + handlers without re-subscribing the listener.
  heroAnalyzeHandlerRef.current = async (detail: HeroAnalyzeDetail) => {
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
    const isListingHandoff = detail.token.startsWith("listing:");
    const parsedLocation = parseAddressLocation(address);
    const nextPlace: SelectedAddress = {
      formattedAddress: address,
      state: detail.state ?? parsedLocation.state,
      county: detail.county,
      zip: detail.zip ?? parsedLocation.zip,
    };
    if (!(await preparePropertySwap(nextPlace))) {
      setListingImportStatus(null);
      reportHeroAnalyzeStatus({
        token: detail.token,
        status: "cancelled",
      });
      return;
    }
    reportHeroAnalyzeStatus({ token: detail.token, status: "received" });
    if (isListingHandoff) {
      setListingImportStatus({
        token: detail.token,
        address,
        phase: "looking-up",
      });
    }
    form.setValue("address", address, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });

    const landOnPrice = (missedAutofill = false) => {
      const missingFields = getListingImportMissingFields({
        propertyType: form.getValues("propertyType"),
        purchasePrice: form.getValues("purchasePrice"),
        bedrooms: form.getValues("bedrooms"),
        monthlyRent: form.getValues("monthlyRent"),
        units: form.getValues("units"),
      });
      if (isListingHandoff) {
        if (missingFields.length === 0) {
          setListingImportStatus(null);
          reportHeroAnalyzeStatus({ token: detail.token, status: "ready" });
          return;
        }
        setListingImportStatus({
          token: detail.token,
          address,
          phase: "needs-input",
        });
        reportHeroAnalyzeStatus({
          token: detail.token,
          status: "needs-input",
        });
        requestAnimationFrame(() => {
          focusInvalidField(missingFields[0].path);
        });
        return;
      }

      reportHeroAnalyzeStatus({ token: detail.token, status: "needs-input" });
      if (missedAutofill) {
        // The one case the instant-verdict path can't cover: we couldn't even
        // recover a state from the typed string. Nudge instead of dead air.
        toast({
          title: "Enter the asking price to finish",
          description:
            "Couldn't auto-detect the location from that address — type the price below, or pick a suggestion as you type for full auto-fill.",
        });
      } else {
        // Enrichment ran but couldn't finish the screen (usually: no bedroom
        // count yet, so no HUD rent → no estimated price). Landing here
        // silently read as "the button did nothing" — say exactly what's
        // missing (founder call 2026-08-25: prompt, don't assume bedrooms).
        // A listing paste may have already filled the price; telling that
        // user to "add the asking price" while focusing a filled field reads
        // as a bug — name only the fields that are actually empty.
        const priceMissing = isEmptyNumber(form.getValues("purchasePrice"));
        toast({
          title: priceMissing
            ? "Two fields to your first screen"
            : "One field to your first screen",
          description: priceMissing
            ? "Add the asking price, and bedrooms to auto-estimate rent from HUD area data — then run the analysis."
            : "Add bedrooms to auto-estimate rent from HUD area data (or type the monthly rent) — then run the analysis.",
        });
        if (!priceMissing) {
          requestAnimationFrame(() => {
            try {
              form.setFocus("bedrooms");
            } catch {
              /* field may be unmounted for some property types - non-fatal */
            }
          });
          return;
        }
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
    const resolvedState = detail.state ?? parsedLocation.state;
    const resolvedCounty = detail.county;
    const resolvedZip = detail.zip ?? parsedLocation.zip;

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
    enrichedUnitsRef.current.clear();
    lastSelectedAddressRef.current = place;
    const handoffGeneration = forkGenerationRef.current;
    const handoffPropertyType = form.getValues("propertyType");
    const handoffAddressKey = normalizeAutofillPropertyAddress(address);
    const handoffStillCurrent = () =>
      lastHeroTokenRef.current === detail.token &&
      forkGenerationRef.current === handoffGeneration &&
      form.getValues("propertyType") === handoffPropertyType &&
      normalizeAutofillPropertyAddress(form.getValues("address")) ===
        handoffAddressKey;
    const releaseStaleHandoff = () => {
      if (lastHeroTokenRef.current !== detail.token) return;
      const addressStillMatches =
        normalizeAutofillPropertyAddress(form.getValues("address")) ===
        handoffAddressKey;
      if (isListingHandoff && addressStillMatches) {
        setListingImportStatus({
          token: detail.token,
          address,
          phase: "needs-input",
        });
      } else {
        setListingImportStatus(null);
      }
      reportHeroAnalyzeStatus({
        token: detail.token,
        status: addressStillMatches ? "needs-input" : "cancelled",
      });
    };

    // Run the SAME enrichment an in-form selection triggers (rent/rate/
    // tax), THEN estimate a purchase price from the address-specific rent
    // so a cold visitor sees an INSTANT verdict. The price is clearly
    // labeled an estimate on the result screen and is fully editable — we
    // never persist it or pass it off as the real asking price.
    void (async () => {
      try {
        await runTrackedPropertyEnrichment(place);
      } catch (err) {
        console.warn("[hero handoff] enrichment failed:", err);
      }
      if (!handoffStillCurrent()) {
        releaseStaleHandoff();
        return;
      }

      // Listing-link paste by a Pro user: the portal page is bot-blocked, so the
      // only way to get the real property facts (beds/baths/sqft) + value + rent
      // is a RentCast lookup by address. proOnly → a free user's one freebie is
      // never spent here; they fall through to the address + estimate path.
      let compsFilled = false;
      if (isListingHandoff && isAuthenticated) {
        try {
          const r = await getPropertyCompsAction({
            address,
            propertyType: form.getValues("propertyType"),
            proOnly: true,
            // Also pull the real for-sale list price (the asking price), not
            // just the AVM estimate — the whole point of pasting the listing.
            includeListing: true,
          });
          if (r.ok && handoffStillCurrent()) {
            applyComps(r.enrichment);
            compsFilled = true;
          }
        } catch (err) {
          console.warn("[listing comps] lookup failed:", err);
        }
      }

      if (!handoffStillCurrent()) {
        releaseStaleHandoff();
        return;
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
          if (!handoffStillCurrent()) {
            releaseStaleHandoff();
            return;
          }
          form.setValue("purchasePrice", est.price, {
            shouldDirty: false,
            shouldValidate: false,
            shouldTouch: false,
          });
          setEstimatedPriceValue(est.price);
          setPriceEstimateBasis(est.basis);
          setPriceEstimated(true);
          purchasePriceSourceRef.current = null;
          purchasePriceProvenanceAddressRef.current =
            normalizeAutofillPropertyAddress(address);
          purchasePriceProvenanceValueRef.current = est.price;
          setPurchasePriceSourceLabel(
            `Automated screening estimate (${est.basis})`,
          );
          // Auto-run the verdict. Double-rAF lets RHF flush the setValue
          // calls before validation (same pattern as the sample deal).
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!handoffStillCurrent()) {
                releaseStaleHandoff();
                return;
              }
              setListingImportStatus(null);
              reportHeroAnalyzeStatus({
                token: detail.token,
                status: "ready",
              });
              submitProgrammaticHandoff();
            });
          });
          return;
        }
      }

      // Comps already populated price + rent (Pro listing paste) → run the
      // verdict straight away instead of landing on the price field.
      if (
        handoffStillCurrent() &&
        compsFilled &&
        !isEmptyNumber(form.getValues("purchasePrice")) &&
        !isEmptyNumber(form.getValues("monthlyRent"))
      ) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!handoffStillCurrent()) {
              releaseStaleHandoff();
              return;
            }
            setListingImportStatus(null);
            reportHeroAnalyzeStatus({
              token: detail.token,
              status: "ready",
            });
            submitProgrammaticHandoff();
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
   * merged value-bound context the result strip + confidence badge use.
   */
  const getLiveProvenance = useCallback(
    () =>
      resolveLiveInputConfidenceContext(
        form.getValues(),
        form.formState.dirtyFields as Record<string, unknown>,
      ).provenance,
    [form, resolveLiveInputConfidenceContext],
  );
  const getLiveTouchedInputFields = useCallback(
    () =>
      resolveLiveInputConfidenceContext(
        form.getValues(),
        form.formState.dirtyFields as Record<string, unknown>,
      ).touchedInputFields,
    [form, resolveLiveInputConfidenceContext],
  );
  const getEnrichmentCapture = useCallback(
    () => enrichmentCaptureRef.current,
    [],
  );

  const currentInputConfidence = useMemo(() => {
    if (!analysisResult || !analysisValues) return null;
    const sourceContext = resolveLiveInputConfidenceContext(
      analysisValues,
      form.formState.dirtyFields as Record<string, unknown>,
    );
    return buildInputConfidence({
      values: analysisValues,
      provenance: sourceContext.provenance,
      touchedFields: new Set(sourceContext.touchedInputFields),
      startingAssumptionOrigins: sourceContext.startingAssumptionOrigins,
      purchasePriceEstimated: sourceContext.purchasePriceEstimated,
      purchasePriceSource: sourceContext.purchasePriceSource,
      verified: inputVerification,
    });
  }, [
    analysisResult,
    analysisValues,
    form.formState.dirtyFields,
    inputVerification,
    resolveLiveInputConfidenceContext,
  ]);

  useEffect(() => {
    if (!pendingVerificationFocusKey || !isEditingAssumptions) return;

    const key = pendingVerificationFocusKey;
    const field = currentInputConfidence?.fields.find(
      (candidate) => candidate.key === key,
    );
    const propertyType = form.getValues("propertyType");
    const strategyKey = resolveCompatibleAnalyzerStrategyKey(
      activeStrategyKeyRef.current,
      form.getValues(),
    );
    let frameId = 0;
    let attempts = 0;
    let cancelled = false;

    const findVisibleTarget = (): HTMLElement | null => {
      let target: HTMLElement | null = null;
      if (key === "rent" && strategyKey === "short-term") {
        // Monthly rent remains mounted but hidden for STR. Focus the actual
        // revenue control instead; occupancy is alongside it in the same row.
        target = document.getElementById("avgDailyRate");
      } else if (key === "rent" && propertyType !== "single-family") {
        // Unit income is a rollup. The group focus avoids choosing an
        // arbitrary unit or the owner-occupied row in a house hack.
        target = document.getElementById("step-income");
      } else {
        target = document.getElementById(INPUT_CONFIDENCE_FORM_FIELD[key]);
      }
      return target && target.getClientRects().length > 0 ? target : null;
    };

    const focusWhenReady = () => {
      if (cancelled) return;
      const target = findVisibleTarget();
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          behavior: scrollBehavior(),
          block: "center",
        });
        setPendingVerificationFocusKey(null);
        return;
      }

      attempts += 1;
      if (attempts < 20) {
        frameId = window.requestAnimationFrame(focusWhenReady);
        return;
      }

      const fallbackAnchor =
        key === "rent"
          ? "step-income"
          : key === "yearBuilt"
            ? "step-extras"
            : field?.editTarget === "financing" ||
                field?.editTarget === "expenses"
              ? `step-${field.editTarget}`
              : "step-property";
      const fallback = document.getElementById(fallbackAnchor);
      fallback?.focus({ preventScroll: true });
      fallback?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
      setPendingVerificationFocusKey(null);
    };

    frameId = window.requestAnimationFrame(focusWhenReady);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [
    advancedOpen,
    currentInputConfidence,
    expenseDetailsOpen,
    form,
    isEditingAssumptions,
    pendingVerificationFocusKey,
  ]);

  const handleReviewVerificationInput = useCallback(
    (key: InputConfidenceFieldKey) => {
      const field = currentInputConfidence?.fields.find(
        (candidate) => candidate.key === key,
      );
      const needsAdvancedPanel = key !== "purchasePrice" && key !== "rent";

      setIsEditingAssumptions(true);
      if (needsAdvancedPanel) setAdvancedOpen(true);
      if (field?.editTarget === "expenses") setExpenseDetailsOpen(true);
      setPendingVerificationFocusKey(key);
    },
    [currentInputConfidence],
  );

  const handleToggleInputVerified = useCallback(
    (key: InputConfidenceFieldKey, verified: boolean) => {
      const sourceValues = analysisValues ?? form.getValues();
      const next: InputVerificationEvidence = { ...inputVerification };
      if (verified) {
        next[key] = {
          verifiedAt: new Date().toISOString(),
          evidenceType: "user-confirmed",
          fingerprint: inputVerificationFingerprint(sourceValues, key),
        };
      } else {
        delete next[key];
      }

      // Confirmations live in the saved result snapshot, not in a form field.
      // Without explicitly dirtying a loaded deal here, the UI could still
      // say "Saved" and allow a PDF/compare using evidence that would vanish
      // on navigation because no form watcher fires for this state change.
      if (savedDealIdRef.current) setHasUnsavedChanges(true);

      const sourceContext = resolveLiveInputConfidenceContext(
        sourceValues,
        form.formState.dirtyFields as Record<string, unknown>,
      );
      const previousConfidence = buildInputConfidence({
        values: sourceValues,
        provenance: sourceContext.provenance,
        touchedFields: new Set(sourceContext.touchedInputFields),
        startingAssumptionOrigins: sourceContext.startingAssumptionOrigins,
        purchasePriceEstimated: sourceContext.purchasePriceEstimated,
        purchasePriceSource: sourceContext.purchasePriceSource,
        verified: inputVerification,
      });
      const nextConfidence = buildInputConfidence({
        values: sourceValues,
        provenance: sourceContext.provenance,
        touchedFields: new Set(sourceContext.touchedInputFields),
        startingAssumptionOrigins: sourceContext.startingAssumptionOrigins,
        purchasePriceEstimated: sourceContext.purchasePriceEstimated,
        purchasePriceSource: sourceContext.purchasePriceSource,
        verified: next,
      });
      setInputVerification(next);
      inputVerificationAddressRef.current =
        Object.keys(next).length > 0
          ? normalizeAutofillPropertyAddress(sourceValues.address)
          : null;

      if (verified) {
        const sourceClass = previousConfidence.fields.find(
          (item) => item.key === key,
        )?.sourceClass;
        if (advocacyDecisionContract) {
          trackEvent("material_input_reviewed", {
            field_key: key,
            source_class: sourceClass ?? "unknown",
            confirmation_type: "user-confirmed",
            method_version: nextConfidence.methodVersion,
          });
        } else {
          trackEvent("assumption_verified", {
            field_key: key,
            source_class: sourceClass ?? "unknown",
            method_version: nextConfidence.methodVersion,
          });
          trackEvent("material_input_verified", {
            field_key: key,
            evidence_level: "user-confirmed",
            method_version: nextConfidence.methodVersion,
          });
        }
      }
      if (advocacyDecisionContract) {
        const previousEvidence = buildAssumptionLedger(previousConfidence);
        const nextEvidence = buildAssumptionLedger(nextConfidence);
        if (previousEvidence.readiness !== nextEvidence.readiness) {
          trackEvent("evidence_readiness_changed", {
            from_state: previousEvidence.readiness,
            to_state: nextEvidence.readiness,
            contract_version: nextEvidence.contractVersion,
          });
        }
      } else if (previousConfidence.stage !== nextConfidence.stage) {
        trackEvent("decision_readiness_changed", {
          from_stage: previousConfidence.stage,
          to_stage: nextConfidence.stage,
          method_version: nextConfidence.methodVersion,
        });
      }
      if (
        !advocacyDecisionContract &&
        nextConfidence.score > previousConfidence.score
      ) {
        const band = (score: number) =>
          score >= 80
            ? "80-100"
            : score >= 55
              ? "55-79"
              : score >= 30
                ? "30-54"
                : "0-29";
        trackEvent("confidence_increased", {
          from_band: band(previousConfidence.score),
          to_band: band(nextConfidence.score),
          method_version: nextConfidence.methodVersion,
        });
      }
      if (
        !advocacyDecisionContract &&
        previousConfidence.stage !== "offer-ready" &&
        nextConfidence.stage === "offer-ready"
      ) {
        trackEvent("offer_ready_reached", {
          method_version: nextConfidence.methodVersion,
          confidence_band: "80-100",
        });
      }
    },
    [
      advocacyDecisionContract,
      analysisValues,
      form,
      inputVerification,
      resolveLiveInputConfidenceContext,
    ],
  );

  const toggleAdvanced = () => {
    const next = !advancedOpen;
    if (next) {
      trackEvent("optional_section_opened", { source: "toggle" });
      trackEvent("assumptions_opened", { source: "toggle" });
    }
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
    setIsEditingAssumptions(true);
    // Purchase price is a primary field. Opening every financing/expense
    // control at the same time turns a one-field correction into a wall of
    // inputs, which is especially punishing in repeated-deal work.
    setAdvancedOpen(false);
    if (typeof window !== "undefined") {
      const el = document.getElementById("main");
      if (el)
        window.scrollTo({ top: el.offsetTop - 64, behavior: scrollBehavior() });
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
    (typeof purchasePrice === "number" &&
      Number.isFinite(purchasePrice) &&
      purchasePrice > 0) ||
    (typeof watchedMonthlyRent === "number" &&
      Number.isFinite(watchedMonthlyRent) &&
      watchedMonthlyRent > 0) ||
    (watchedUnits ?? []).some(
      (unit) =>
        typeof unit?.monthlyRent === "number" &&
        Number.isFinite(unit.monthlyRent) &&
        unit.monthlyRent > 0,
    );
  const showEmptyStateSampleLine =
    isInputPhase && isAuthenticated && !hasMeaningfulInput && !listingLinkOpen;
  const hasPropertyAvailable = Boolean(watchedAddress?.trim());
  const needsAddressForFullAnalysis =
    !hasPropertyAvailable &&
    (hasMeaningfulInput ||
      activeStrategyKey !== null ||
      form.formState.isDirty);
  // The primary CTA may become the sample launcher ONLY on a pristine form
  // that is still using the implicit Buy & Hold default.
  // With price/rent already typed (address pending), one tap on what looks
  // like the Run button used to setValue the entire sample fixture over the
  // user's numbers with no confirmation — a destructive swap disguised as
  // the action the live preview told them to take.
  // An explicit specialist selection is meaningful intent even before the
  // user types an address. Launching the Buy & Hold sample from a BRRRR/flip/
  // wholesale/STR button would silently replace that intent and its starter
  // assumptions, so specialist modes always keep their own submit path.
  const primaryCtaRunsSample =
    activeStrategyKey === null &&
    !hasPropertyAvailable &&
    !hasMeaningfulInput &&
    !form.formState.isDirty;
  const canUseActiveStrategyPrimaryOutput =
    !activeStrategy?.primaryOutputIsPro ||
    (activeStrategy.key === "wholesale-mao"
      ? canUseMaxOffer
      : canUseStrategies);
  const analyzerCta = getAnalyzerCta({
    hasProperty: !primaryCtaRunsSample,
    canCalculateMaxOffer: canUseMaxOffer,
    strategyRunCta: activeStrategy?.runCta,
    canUseStrategyPrimaryOutput: canUseActiveStrategyPrimaryOutput,
    requiresAddressBeforeRun: needsAddressForFullAnalysis,
  });
  const hasAdoptedAnalysisTarget = Boolean(
    analysisMaoTarget &&
    analysisMaoTargetSource &&
    !decisionBasisNeedsReview &&
    !sampleSeededMaoTargetRef.current &&
    isAdoptedOfferCeilingTargetSource(analysisMaoTargetSource),
  );
  const activeRunPromisesOfferCeiling = analysisRunPromisesOfferCeiling({
    canCalculateMaxOffer: canUseMaxOffer,
    strategyKey: activeStrategyKey,
  });
  const hasExplicitPreRunCriteriaChoice = preRunCriteriaChoice !== null;
  const needsPreRunTargetChoice =
    activeRunPromisesOfferCeiling &&
    (!hasAdoptedAnalysisTarget || hasExplicitPreRunCriteriaChoice);
  const proposedPreRunTarget = hasExplicitPreRunCriteriaChoice
    ? (preRunBuyBoxTarget ?? starterPreRunTarget)
    : decisionBasisNeedsReview && analysisMaoTarget
      ? analysisMaoTarget
      : (preRunBuyBoxTarget ?? starterPreRunTarget);
  const proposedPreRunSource: OfferCeilingTargetSource =
    hasExplicitPreRunCriteriaChoice
      ? preRunBuyBoxTarget
        ? "buy-box"
        : "starter-criteria"
      : decisionBasisNeedsReview && analysisMaoTarget
        ? "selected-targets"
        : preRunBuyBoxTarget
          ? "buy-box"
          : "starter-criteria";
  const shouldUseAdoptedPreRunTarget =
    hasAdoptedAnalysisTarget && !hasExplicitPreRunCriteriaChoice;
  const preRunEditorBaseTarget = shouldUseAdoptedPreRunTarget
    ? analysisMaoTarget!
    : proposedPreRunTarget;
  const preRunEditorBaseSource = shouldUseAdoptedPreRunTarget
    ? analysisMaoTargetSource!
    : proposedPreRunSource;
  const preRunIsCashPurchase = isAllCashDownPayment(watchedDownPaymentPct);
  const preRunEditorKey = `${
    shouldUseAdoptedPreRunTarget
      ? `adopted:${preRunEditorBaseSource}`
      : preRunBuyBox
        ? `box:${preRunBuyBox.id}`
        : "starter"
  }:${maoTargetFingerprint(preRunEditorBaseTarget)}:${preRunIsCashPurchase ? "cash" : "debt"}`;
  const activePreRunCriteriaDraft =
    preRunCriteriaDraft?.editorKey === preRunEditorKey
      ? preRunCriteriaDraft
      : null;
  const preRunCriteriaInvalid = activePreRunCriteriaDraft?.target === null;
  const visibleDecisionTarget = activePreRunCriteriaDraft
    ? activePreRunCriteriaDraft.target
    : preRunEditorBaseTarget;
  const handlePreRunCriteriaDraftChange = useCallback(
    (target: MaoTarget | null, dirty: boolean) => {
      setPreRunCriteriaDraft((current) => {
        const nextFingerprint = maoTargetFingerprint(target);
        if (
          current?.editorKey === preRunEditorKey &&
          current.dirty === dirty &&
          maoTargetFingerprint(current.target) === nextFingerprint
        ) {
          return current;
        }
        return { editorKey: preRunEditorKey, target, dirty };
      });
    },
    [preRunEditorKey],
  );
  const decisionTargetLabel = visibleDecisionTarget
    ? describeMaoTarget(visibleDecisionTarget)
    : "Fix the criteria below before calculating";
  const focusedResultsMode =
    Boolean(analysisResult) &&
    showResults &&
    !isCalculating &&
    !isEditingAssumptions;
  const postAnalysisMode =
    Boolean(analysisResult) &&
    showResults &&
    !isCalculating &&
    !isEditingAssumptions;
  const decisionCriteriaBlockPrimaryAction =
    !needsAddressForFullAnalysis &&
    (preRunCriteriaInvalid ||
      (needsPreRunTargetChoice && preRunBuyBoxState === "loading"));
  const primaryActionLabel = isAddressEnrichmentPending
    ? "Finishing property lookup…"
    : needsAddressForFullAnalysis
      ? analyzerCta
      : needsPreRunTargetChoice && preRunBuyBoxState === "loading"
        ? "Loading your criteria…"
        : activeRunPromisesOfferCeiling
          ? isEditingAssumptions
            ? "Recalculate analysis"
            : "Analyze deal & calculate ceiling"
          : isEditingAssumptions
            ? "Recalculate analysis"
            : analyzerCta;

  const commitPreRunTarget = (
    target: MaoTarget,
    source: OfferCeilingTargetSource,
    buyBox: NamedBuyBox | null = null,
  ) => {
    const strategyKey = currentAnalyzerStrategyKey();
    const decisionBasis =
      source === "buy-box" && buyBox
        ? captureBuyBoxDecisionBasis({ box: buyBox, target, strategyKey })
        : captureNonBuyBoxDecisionBasis({
            source:
              source === "starter-criteria"
                ? "starter-criteria"
                : "selected-targets",
            target,
            strategyKey,
          });
    analysisMaoTargetRef.current = target;
    setAnalysisMaoTarget(target);
    setAnalysisMaoTargetSource(source);
    analysisDecisionBasisRef.current = decisionBasis;
    setAnalysisDecisionBasis(decisionBasis);
    decisionBasisNeedsReviewRef.current = false;
    setDecisionBasisNeedsReview(false);
    setPreRunCriteriaChoice(null);
    setPreRunCriteriaDraft(null);
    sampleSeededMaoTargetRef.current = false;
    writeCalcDraftWithMaoTarget(
      form.getValues(),
      target,
      source,
      activeStrategyKeyRef.current,
      undefined,
      decisionBasis,
    );
  };

  const handlePrimaryRunAction = async (options?: {
    withoutOfferCeiling?: boolean;
  }) => {
    if (needsAddressForFullAnalysis) {
      void form.trigger("address");
      focusInvalidField("address");
      return;
    }
    if (primaryCtaRunsSample) {
      handleTrySampleDeal();
      return;
    }

    const pendingEnrichment = addressEnrichmentPromiseRef.current;
    if (pendingEnrichment) {
      if (deferredRunAfterEnrichmentRef.current) return;
      deferredRunAfterEnrichmentRef.current = true;
      toast({
        title: "Finishing the property lookup",
        description:
          "We’ll continue automatically as soon as the address-based assumptions are ready.",
      });
      try {
        await pendingEnrichment;
      } catch {
        // Best-effort enrichment failed; explicit inputs remain authoritative.
      } finally {
        deferredRunAfterEnrichmentRef.current = false;
      }
    }

    if (options?.withoutOfferCeiling) {
      explicitTargetlessRunRef.current = true;
      analysisMaoTargetRef.current = null;
      setAnalysisMaoTarget(null);
      setAnalysisMaoTargetSource("screening-defaults");
      analysisDecisionBasisRef.current = null;
      setAnalysisDecisionBasis(null);
      decisionBasisNeedsReviewRef.current = false;
      setDecisionBasisNeedsReview(false);
      sampleSeededMaoTargetRef.current = false;
      clearPendingMaoTarget();
    } else if (activeRunPromisesOfferCeiling && preRunCriteriaInvalid) {
      toast({
        title: "Fix the decision criteria",
        description:
          "Correct the highlighted value or choose at least one criterion before calculating an Offer Ceiling.",
        variant: "destructive",
      });
      document.getElementById("decision-criteria")?.focus();
      return;
    } else if (
      activeRunPromisesOfferCeiling &&
      activePreRunCriteriaDraft?.dirty &&
      activePreRunCriteriaDraft.target
    ) {
      commitPreRunTarget(
        { ...activePreRunCriteriaDraft.target },
        "selected-targets",
      );
    } else if (needsPreRunTargetChoice) {
      if (preRunBuyBoxState === "loading") {
        toast({
          title: "Decision criteria are still loading",
          description:
            "Wait a moment, or analyze the operating economics without an Offer Ceiling.",
        });
        return;
      }
      const target = { ...proposedPreRunTarget };
      commitPreRunTarget(target, proposedPreRunSource, preRunBuyBox);
    }

    void form.handleSubmit(onSubmit, onError)();
  };

  // Programmatic imports and explicit clicks now share one owner for target
  // adoption, validation, enrichment sequencing, and submit. If a handoff
  // arrived while Buy Boxes were loading, resume it exactly once when loading
  // settles (the starter criteria remain a safe fallback on lookup failure).
  primaryRunActionRef.current = handlePrimaryRunAction;
  useEffect(() => {
    const pendingGeneration = pendingProgrammaticHandoffGenerationRef.current;
    if (pendingGeneration === null || preRunBuyBoxState === "loading") {
      return;
    }
    pendingProgrammaticHandoffGenerationRef.current = null;
    // A reset or "next deal" invalidates every in-flight handoff. Never let a
    // late Buy Box response submit a different property than the imported one.
    if (pendingGeneration !== forkGenerationRef.current) return;
    void primaryRunActionRef.current();
  }, [preRunBuyBoxState]);

  useEffect(() => {
    if (postAnalysisMode) {
      document.body.setAttribute("data-truecap-results-mode", "true");
    } else {
      document.body.removeAttribute("data-truecap-results-mode");
    }
    return () => document.body.removeAttribute("data-truecap-results-mode");
  }, [postAnalysisMode]);

  // Tell the marketing chrome the visitor is now USING the analyzer. The
  // homepage's sticky conversion bar ("Ready to underwrite a deal? It's
  // free · Analyze free") listens for this and hides — it kept selling the
  // analyzer over the form and even over the RESULTS, eating ~90px of a
  // phone viewport mid-analysis (UX walkthrough P1-4). Event-based so the
  // marketing component needs no import from the calculator tree.
  // Address or result state is durable evidence of a real analysis. React Hook
  // Form can mark programmatically seeded defaults dirty during hydration, so
  // `isDirty` would suppress the marketing prompt before the visitor acts.
  // The conversion bar's IntersectionObserver independently hides it whenever
  // the calculator itself is on screen, including price/rent-only drafts.
  const analyzerEngaged = hasPropertyAvailable || analysisResult !== null;
  useEffect(() => {
    if (!analyzerEngaged) return;
    window.dispatchEvent(new Event("tc-analyzer-engaged"));
  }, [analyzerEngaged]);

  const liveFormValues = form.getValues();
  const liveResultSourceContext = resolveLiveInputConfidenceContext(
    liveFormValues,
    form.formState.dirtyFields as Record<string, unknown>,
  );
  return (
    <div className="min-h-screen bg-background">
      {deletedDealRecoveryActive ? (
        <div
          role="alert"
          className="mx-auto mt-4 flex max-w-7xl flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">
              Your edits are safe on this device
            </p>
            <p className="text-muted-foreground">
              The saved deal was removed in another tab. This analysis is now an
              unsaved new deal; save it again to keep it in My Deals.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0"
            disabled={isSavingDeal}
            onClick={() => void performSaveDeal({ forceInsert: true })}
          >
            Save as new deal
          </Button>
        </div>
      ) : null}
      {/* Hero section */}
      <section
        className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6",
          focusedResultsMode && "hidden",
        )}
      >
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
                {underwritingHeading}
              </h1>
            ) : (
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-foreground mb-2 text-balance">
                {underwritingHeading}
              </h2>
            )}
            {/* ONE headline (Choose-TrueCap Phase B, finding 3): this page
                heading IS the hero title now — the hero card below lost its
                internal "Analyze a deal" title row, and the old
                "institutional-grade analysis…" subtitle collapsed into the
                card's one-line signpost so the page reads as a single door. */}
            {/* Keep the promise narrower than the providers: active-listing
                price and property facts may be available, while tax, rent,
                and value fields can still be estimates. Every imported value
                remains labeled and editable before calculation. */}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Confirm the property, price, income, and assumptions. TrueCap then
              shows whether the deal works and why.
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
              className="group inline-flex min-h-11 shrink-0 flex-col items-start gap-0.5 self-start rounded-xl bg-primary px-5 py-3 text-left shadow-[0_10px_24px_rgba(0,_112,_196,0.28)] transition-transform hover:-translate-y-0.5 sm:self-end"
              aria-label="Try a synthetic sample rental and preview a sample Pro report"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-foreground">
                <Sparkles className="size-4" />
                Try a sample rental
              </span>
              <span className="text-[11px] font-medium text-primary-foreground">
                Preview a sample Pro report
              </span>
            </button>
          )}
        </div>

        {/* Restored-draft notice - only shown when the form was just
            restored from a localStorage auto-save draft. Without this
            the user sees a pre-filled form and wonders what happened.
            "Start fresh" wipes the draft and resets to defaults, which
            also matters for shared-device cases (cafe laptop, etc). */}
        {restoredFromDraft && analysisResult === null && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
              <Sparkles
                className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0"
                aria-hidden
              />
              <p
                role="status"
                className="min-w-0 leading-relaxed text-foreground [overflow-wrap:anywhere]"
              >
                <strong className="font-bold">
                  Draft restored from this browser
                </strong>
                {restoredAddress ? (
                  <span className="text-muted-foreground">
                    : {restoredAddress}.
                  </span>
                ) : (
                  <span className="text-muted-foreground">.</span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  Review or edit it below.
                </span>
              </p>
            </div>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                  setRestoredFromDraft(false);
                  setRestoredAddress(null);
                  resetToNewAnalysis("single-family");
                  requestAnimationFrame(() =>
                    document.getElementById("address")?.focus(),
                  );
                }}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-[var(--brand-blue-text)] underline-offset-2 hover:bg-card hover:underline"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestoredFromDraft(false);
                  requestAnimationFrame(() =>
                    document.getElementById("address")?.focus(),
                  );
                }}
                aria-label="Dismiss restored-draft notice"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {!focusedResultsMode ? (
          <div className="mt-4">
            <StrategyChips
              activeKey={visibleActiveStrategyKey}
              onSelect={(key, assumptionMode) =>
                handleSelectStrategy(key, "chip", assumptionMode)
              }
              getStarterChangePreview={getStrategyStarterChangePreview}
              canRestoreAssumptions={strategyRevertRef.current !== null}
            />
          </div>
        ) : null}

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
            {RELEASED_INPUT_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                disabled={!areAnalysisTabsEnabled}
                aria-disabled={!areAnalysisTabsEnabled}
                aria-pressed={tab.id === activeInputTab}
                title={
                  !areAnalysisTabsEnabled
                    ? "Calculate the analysis first."
                    : undefined
                }
                onClick={() => handleInputTabClick(tab.id)}
                className={cn(
                  "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-[12px] sm:text-sm font-medium shrink-0 sm:shrink min-w-[88px] sm:min-w-0 transition-colors",
                  areAnalysisTabsEnabled && tab.id === activeInputTab
                    ? "bg-[var(--brand-green-light)] border-[var(--brand-green)]/30 text-[var(--brand-green)]"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                  !areAnalysisTabsEnabled &&
                    "cursor-not-allowed opacity-50 hover:bg-card hover:text-muted-foreground",
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
      <main
        id="main"
        className="max-w-7xl mx-auto px-4 sm:px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-16"
      >
        <form
          ref={formElementRef}
          data-calc-form="true"
          data-calculator-ready={isCalculatorReady ? "true" : "false"}
          aria-busy={!isCalculatorReady}
          inert={isCalculatorReady ? undefined : true}
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
              void handlePrimaryRunAction();
              return;
            }
            if (
              event.key === "Enter" &&
              !event.defaultPrevented &&
              event.target instanceof HTMLInputElement
            ) {
              // Plain Enter should never surprise-run a financial analysis.
              // Move through the visible form instead; Cmd/Ctrl+Enter and the
              // explicit primary button remain the deliberate run actions.
              event.preventDefault();
              const fields = Array.from(
                formElementRef.current?.querySelectorAll<HTMLElement>(
                  "input:not([disabled]):not([type='hidden']), select:not([disabled])",
                ) ?? [],
              ).filter((field) => field.offsetParent !== null);
              const index = fields.indexOf(event.target);
              fields[index + 1]?.focus();
            }
          }}
          noValidate
          className={focusedResultsMode ? "hidden" : undefined}
        >
          <div className="space-y-5">
            {isEditingAssumptions && analysisResult ? (
              <section
                aria-label="Editing analysis assumptions"
                className="rounded-2xl border border-primary/25 bg-background/95 p-4 shadow-lg backdrop-blur sm:sticky sm:top-2 sm:z-30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">
                      Editing this analysis
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {needsPreRunTargetChoice
                        ? "Review the visible decision criteria below. The update action will adopt those criteria before calculating an Offer Ceiling."
                        : "Change only what you need. Edits stay in the form; incomplete entries keep the last complete result clearly labeled. Your saved deal is unchanged until you press Save."}
                    </p>
                  </div>
                  <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      onClick={handleBackToResult}
                    >
                      Done editing
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 shrink-0"
                      disabled={
                        isCalculating ||
                        isAddressEnrichmentPending ||
                        decisionCriteriaBlockPrimaryAction
                      }
                      onClick={() => void handlePrimaryRunAction()}
                    >
                      {primaryActionLabel}
                    </Button>
                  </div>
                </div>
                <div
                  className="mt-3 border-t border-border/70 pt-3"
                  data-edit-live-readout="true"
                >
                  <p
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      staleResultsWarning
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-primary",
                    )}
                  >
                    {staleResultsWarning
                      ? "Last complete result · fix the highlighted input"
                      : "Live · unsaved"}
                  </p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Cash flow
                      </dt>
                      <dd
                        className={cn(
                          "truncate font-mono font-bold tabular-nums",
                          analysisResult.netCashFlow >= 0
                            ? "text-[var(--metric-positive)]"
                            : "text-[var(--metric-negative)]",
                        )}
                      >
                        {analysisResult.netCashFlow >= 0 ? "+" : "−"}$
                        {Math.abs(
                          Math.round(analysisResult.netCashFlow),
                        ).toLocaleString()}
                        /mo
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Cap rate
                      </dt>
                      <dd className="font-mono font-bold tabular-nums text-foreground">
                        {analysisResult.capRate.toFixed(1)}%
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        DSCR
                      </dt>
                      <dd className="font-mono font-bold tabular-nums text-foreground">
                        {formatDscr(
                          analysisResult.dscr,
                          analysisResult.monthlyPayment > 0,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            ) : null}
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
                isInputPhase &&
                  showGenericLivePreview &&
                  "lg:grid lg:grid-cols-5 lg:gap-x-8",
              )}
            >
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
                tabIndex={-1}
                aria-label="Analyze a deal"
                className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 lg:col-span-3 lg:col-start-1"
              >
                <div className="space-y-6">
                  <PropertyDetailsSection
                    form={form}
                    chrome="bare"
                    onAddressSelected={handleAddressSelected}
                    onAutofillFromAddress={handleAutofillFromAddress}
                    isAutofilling={isAutofilling}
                    autofillRequiresAccount={!isAuthenticated}
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
                    priceSourceLabel={purchasePriceSourceLabel}
                    onPurchasePriceEdited={() => {
                      detachPersistedPurchasePriceSource();
                      setPurchasePriceSourceLabel(null);
                      setPriceEstimated(false);
                      setEstimatedPriceValue(null);
                      setPriceEstimateBasis(null);
                      purchasePriceSourceRef.current = null;
                      purchasePriceProvenanceAddressRef.current = null;
                      purchasePriceProvenanceValueRef.current = null;
                    }}
                    hideAddressInput={listingLinkOpen}
                    listingLinkSlot={
                      <ListingLinkInput
                        open={listingLinkOpen}
                        onOpenChange={(open) => {
                          setListingLinkOpen(open);
                          if (open) setListingImportStatus(null);
                        }}
                        value={listingUrl}
                        onValueChange={(value) => {
                          setListingUrl(value);
                          setListingUrlError(false);
                        }}
                        hasError={listingUrlError}
                        onSubmit={handleListingUrl}
                        importStatus={
                          listingImportStatus
                            ? {
                                phase: listingImportStatus.phase,
                                missingFields: listingImportMissingFields,
                              }
                            : null
                        }
                        onFocusMissingField={focusInvalidField}
                      />
                    }
                    sampleSlot={
                      showEmptyStateSampleLine ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No address handy?{" "}
                          <button
                            type="button"
                            onClick={handleTrySampleDeal}
                            className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline"
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
                  <fieldset
                    id="step-income"
                    tabIndex={-1}
                    className="min-w-0 scroll-mt-24 rounded-xl border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <legend className="mb-2 text-sm font-semibold text-foreground">
                      3. Rental income
                    </legend>
                    {canChoosePropertyType ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleChipNavigate(
                            "property",
                            `property-type-${propertyType}`,
                          )
                        }
                        aria-expanded={advancedOpen}
                        aria-controls="advanced-options"
                        className="mb-4 flex min-h-11 w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                          Property type:{" "}
                          <strong className="font-semibold text-foreground">
                            {propertyTypeLabel}
                          </strong>
                        </span>
                        <span className="shrink-0 font-semibold text-primary">
                          Change
                        </span>
                      </button>
                    ) : null}
                    {propertyType === "single-family" && (
                      <SingleFamilyUnitSection
                        form={form}
                        chrome="bare"
                        fields="primary"
                        hideBedrooms={activeStrategy?.incomeMode === "str"}
                        rentLabel={activeStrategy?.rentLabel}
                        strMode={activeStrategy?.incomeMode === "str"}
                      />
                    )}
                    {(propertyType === "multi-family" ||
                      propertyType === "owner-occupant") && (
                      <MultiFamilyUnitsSection
                        form={form}
                        isHouseHack={propertyType === "owner-occupant"}
                        fmrByBedrooms={unitFmrByBedrooms}
                        chrome="bare"
                      />
                    )}
                  </fieldset>
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
                    active={
                      !showResults &&
                      !analysisResult &&
                      !isCalculating &&
                      showGenericLivePreview
                    }
                    // Suppressed while a solve-oriented play is active — see
                    // showGenericLivePreview. The SR message is gated with it so
                    // screen readers never hear the contradictory verdict either.
                    livePreview={showGenericLivePreview ? livePreview : null}
                    livePreviewMsg={
                      showGenericLivePreview ? livePreviewMsg : ""
                    }
                    assumptionBasis={livePreviewAssumptionBasis}
                    desktopAction={
                      <div>
                        <Button
                          type="button"
                          onClick={() => void handlePrimaryRunAction()}
                          disabled={
                            isCalculating || decisionCriteriaBlockPrimaryAction
                          }
                          data-desktop-run-action="true"
                          className="h-12 w-full rounded-xl font-bold"
                        >
                          <Calculator className="mr-2 size-5" />
                          {primaryActionLabel}
                          <ArrowUpRight className="ml-2 size-5" />
                        </Button>
                        <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
                          {activeRunPromisesOfferCeiling
                            ? `Offer Ceiling criteria: ${decisionTargetLabel}`
                            : "Run the complete analysis with the assumptions shown."}
                        </p>
                      </div>
                    }
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
                />
              </div>

              {/* Assumptions strip - replaces the "Improve accuracy (optional)"
                toggle button as the entry point to the advanced region. The
                chips state each pre-answered value with its source; tapping
                one opens the SAME mounted-but-hidden block below and scrolls
                to its #step-* anchor (handleStepNavigate mechanics). The
                progressive-disclosure contract is unchanged: financing +
                operating expenses stay MOUNTED (hidden via CSS, not
                unmounted) so address auto-fill still writes the rate into
                financing and every value is included on submit; the remembered
                open/closed choice and the one-time auto-open after the first
                result both keep working on the same advancedOpen state. */}
              <div className="lg:col-span-3 lg:col-start-1">
                <AssumptionsStrip
                  form={form}
                  getProvenance={getLiveProvenance}
                  getTouchedInputFields={getLiveTouchedInputFields}
                  advancedOpen={advancedOpen}
                  expenseDetailsOpen={expenseDetailsOpen}
                  onNavigate={handleChipNavigate}
                  onHideDetails={toggleAdvanced}
                  activeStrategyKey={visibleActiveStrategyKey}
                  // The play's starter-written field set + label, so chips over
                  // strategy-set values badge as the play's defaults instead of
                  // "yours" (BROWSER-2). Read fresh each render — the strip
                  // re-renders on every strategy pick and form write.
                  strategyApplied={
                    visibleActiveStrategyKey ? strategyAppliedRef.current : null
                  }
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
                  advancedOpen ? "block" : "hidden",
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
                {(canChoosePropertyType ||
                  propertyType !== "single-family") && (
                  <div id="step-type" className="scroll-mt-24 space-y-5">
                    {(propertyType === "multi-family" ||
                      propertyType === "owner-occupant") && (
                      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <Home className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm text-foreground">
                            Property extras
                          </span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </div>
                        <YearBuiltField form={form} />
                      </div>
                    )}
                    {canChoosePropertyType && (
                      <PropertyTypeSection
                        form={form}
                        savedTemplateFallback={savedTemplateFallback}
                        onTemplatesLoaded={handleTemplatesLoaded}
                        onExplicitTemplateChange={handleExplicitTemplateChange}
                      />
                    )}
                  </div>
                )}
                <div
                  id="step-financing"
                  tabIndex={-1}
                  className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FinancingSection
                    form={form}
                    appliedProfile={appliedFinancingProfile}
                    onAppliedProfileChange={handleAppliedFinancingProfileChange}
                  />
                </div>
                <div
                  id="step-expenses"
                  tabIndex={-1}
                  className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <OperatingExpensesSection
                    form={form}
                    purchasePrice={purchasePrice}
                    detailsOpen={expenseDetailsOpen}
                    onDetailsOpenChange={setExpenseDetailsOpen}
                  />
                  {/* SaveAsDefaultsChip moved to the assumptions-strip footer
                    (Phase 3) — same component, same props, new mount. */}
                </div>
                <BuyAndHoldAssumptionsSection form={form} />
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
                  <div
                    id="step-extras"
                    tabIndex={-1}
                    className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SingleFamilyUnitSection
                      form={form}
                      fields="secondary"
                      extraFields={<YearBuiltField form={form} />}
                    />
                  </div>
                )}
              </div>

              {activeRunPromisesOfferCeiling ? (
                <section
                  id="decision-criteria"
                  tabIndex={-1}
                  aria-label="Offer Ceiling criteria"
                  className="rounded-2xl border border-primary/20 bg-[var(--brand-blue-light)] p-4 lg:col-span-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                      Offer Ceiling criteria
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {shouldUseAdoptedPreRunTarget
                        ? analysisMaoTargetSource === "buy-box"
                          ? `Using Buy Box${
                              analysisDecisionBasis?.rules.kind === "buy-box"
                                ? `: ${analysisDecisionBasis.rules.boxName}`
                                : ""
                            }`
                          : analysisMaoTargetSource === "starter-criteria"
                            ? "Using TrueCap starter criteria"
                            : "Using your selected criteria"
                        : preRunBuyBoxState === "loading"
                          ? "Loading your saved criteria…"
                          : preRunBuyBox
                            ? `Will use Buy Box: ${preRunBuyBox.name}`
                            : "Will use TrueCap starter criteria"}
                    </p>
                    <p className="mt-1 text-sm text-foreground/80">
                      {preRunBuyBoxState === "loading" &&
                      !hasAdoptedAnalysisTarget
                        ? "Checking for a Buy Box that matches this strategy, property type, and market."
                        : decisionTargetLabel}
                    </p>
                    {preRunBuyBoxState === "error" &&
                    !hasAdoptedAnalysisTarget ? (
                      <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                        Your Buy Boxes could not be loaded. TrueCap will use the
                        starter criteria shown here; you can change them before
                        calculating.
                      </p>
                    ) : null}
                  </div>
                  {preRunBuyBoxState !== "loading" ? (
                    <details className="group mt-3 rounded-xl border border-primary/20 bg-background/70 px-2 py-1">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        Change criteria
                        <ChevronDown
                          aria-hidden
                          className="size-4 transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <div className="space-y-4 border-t border-primary/15 px-2 py-4">
                        {eligiblePreRunBuyBoxes.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Saved criteria sets
                            </p>
                            <div
                              className="mt-2 flex flex-wrap gap-2"
                              role="group"
                              aria-label="Choose an Offer Ceiling criteria set"
                            >
                              {eligiblePreRunBuyBoxes.map((box) => {
                                const adoptedBoxId =
                                  shouldUseAdoptedPreRunTarget &&
                                  analysisDecisionBasis?.rules.kind ===
                                    "buy-box"
                                    ? analysisDecisionBasis.rules.boxId
                                    : null;
                                const selected = hasExplicitPreRunCriteriaChoice
                                  ? preRunBuyBox?.id === box.id
                                  : adoptedBoxId === box.id ||
                                    (!shouldUseAdoptedPreRunTarget &&
                                      preRunBuyBox?.id === box.id);
                                return (
                                  <button
                                    key={box.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setPreRunCriteriaChoice(box.id)
                                    }
                                    className={cn(
                                      "min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      selected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-foreground hover:bg-muted",
                                    )}
                                  >
                                    <span className="block font-bold">
                                      {box.name}
                                    </span>
                                    <span
                                      className={cn(
                                        "mt-0.5 block",
                                        selected
                                          ? "text-primary-foreground/80"
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {summarizeBuyBoxCriteria(box)}
                                    </span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                aria-pressed={
                                  preRunCriteriaChoice === "starter" ||
                                  (!shouldUseAdoptedPreRunTarget &&
                                    !hasExplicitPreRunCriteriaChoice &&
                                    preRunBuyBox === null)
                                }
                                onClick={() =>
                                  setPreRunCriteriaChoice("starter")
                                }
                                className={cn(
                                  "min-h-11 rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  preRunCriteriaChoice === "starter" ||
                                    (!shouldUseAdoptedPreRunTarget &&
                                      !hasExplicitPreRunCriteriaChoice &&
                                      preRunBuyBox === null)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:bg-muted",
                                )}
                              >
                                Starter criteria
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <PreRunCriteriaEditor
                          key={preRunEditorKey}
                          target={preRunEditorBaseTarget}
                          isCashPurchase={preRunIsCashPurchase}
                          onChange={handlePreRunCriteriaDraftChange}
                        />
                      </div>
                    </details>
                  ) : null}
                </section>
              ) : null}

              {/* Calculate button - solid brand color (gradient was too
                visually heavy and competed with the verdict card
                downstream). Copy standardized to "Run analysis" to
                match the homepage "Run a deal - 60 seconds" register. */}
              <Button
                type="button"
                onClick={() => void handlePrimaryRunAction()}
                disabled={isCalculating || decisionCriteriaBlockPrimaryAction}
                data-inform-submit="true"
                className={cn(
                  "h-14 w-full rounded-2xl text-base font-bold shadow-lg transition-all max-[250px]:h-auto max-[250px]:min-h-14 max-[250px]:whitespace-normal max-[250px]:px-2 max-[250px]:py-3 max-[250px]:text-center max-[250px]:text-sm max-[250px]:leading-tight",
                  "bg-primary text-primary-foreground hover:bg-primary/95",
                  "lg:col-span-3 lg:col-start-1",
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
                    {primaryActionLabel}
                    <ArrowUpRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              {needsPreRunTargetChoice ? (
                <details className="group w-full lg:col-span-3">
                  <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    More analysis options
                    <ChevronDown
                      aria-hidden
                      className="size-4 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <button
                    type="button"
                    onClick={() =>
                      void handlePrimaryRunAction({ withoutOfferCeiling: true })
                    }
                    disabled={isCalculating}
                    className="mx-auto flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Analyze cash flow without an Offer Ceiling
                  </button>
                </details>
              ) : null}
              {/* Bottom row: keyboard hint (left) + autosave indicator
                (right). Both desktop-only - mobile users get the
                sticky bottom Calculate bar instead, and the autosave
                indicator there would compete with iOS keyboard chrome. */}
              <div className="hidden sm:flex items-center justify-between gap-3 text-[11px] text-muted-foreground lg:col-span-3 lg:col-start-1">
                <p className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    {kbdModifier}
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
          {/* Phone/tablet sticky bottom Calculate bar. Inside the form so its
              type="submit" triggers the same onSubmit handler the
              in-form button does. Appears once the user scrolls past
              ~600px so we never double up on the visible Calculate
              button, and retires at the lg desktop cockpit. */}
          {!isEditingAssumptions ? (
            <StickyCalculateBar
              isCalculating={isCalculating}
              hasResults={analysisResult !== null}
              ctaLabel={primaryActionLabel}
              isActionDisabled={decisionCriteriaBlockPrimaryAction}
              onTrySample={
                primaryCtaRunsSample ? handleTrySampleDeal : undefined
              }
              onCalculate={
                primaryCtaRunsSample
                  ? undefined
                  : () => void handlePrimaryRunAction()
              }
              // Verdict dock readout: only pre-results (same gate as the
              // in-form LiveVerdictPanel), and suppressed while a solve-
              // oriented play is active (showGenericLivePreview). Once a real
              // run lands, the bar renders exactly as before this prop existed.
              livePreview={
                !showResults &&
                !analysisResult &&
                !isCalculating &&
                showGenericLivePreview
                  ? livePreview
                  : null
              }
            />
          ) : null}
        </form>

        {/* Results - wrapped in an error boundary so a render bug in
            any child (waterfall, mortgage compare, projections, etc.)
            cannot blank the whole post-calc surface. The fallback
            surfaces the headline metrics directly from analysisResult
            so the user's numbers are never lost. */}
        {!isEditingAssumptions &&
          (showResults || isCalculating || analysisResult !== null) && (
            <div
              className="mt-8 scroll-mt-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:scroll-mt-24"
              data-analysis-results="true"
              role="region"
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
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                    aria-hidden
                  />
                  <p className="min-w-0 flex-1 text-foreground">
                    These numbers reflect your last complete entry — finish the
                    highlighted field to update them.
                  </p>
                  <button
                    type="button"
                    onClick={handleJumpToFirstInvalidField}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-input bg-background px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Go to field
                  </button>
                </div>
              ) : null}
              {analysisResult && !isCalculating && savedMethodologyLabel ? (
                <p className="mb-3 text-[11px] font-semibold text-muted-foreground">
                  {savedMethodologyLabel} ·{" "}
                  <Link
                    href="/methodology"
                    className="text-primary hover:underline"
                  >
                    methodology
                  </Link>
                </p>
              ) : null}
              {/* Result-state trust strip - names the default sources behind
                the starting values (HUD/FRED benchmarks + manual tax) and
                "all editable", with a jump
                back to the form. Only once real results exist. */}
              {analysisResult && !isCalculating && priceEstimated ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5 text-sm shadow-sm">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      Estimated purchase price
                      {estimatedPriceValue != null
                        ? ` (~$${estimatedPriceValue.toLocaleString("en-US")})`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      We estimated the price
                      {priceEstimateBasis
                        ? ` (${priceEstimateBasis})`
                        : " from local rent data"}{" "}
                      so you could see a provisional screening result. Enter the
                      actual asking price to update the screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditPrice}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-input bg-background px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Enter price
                  </button>
                </div>
              ) : null}
              <AnalysisErrorBoundary result={analysisResult}>
                <AnalysisDashboard
                  result={analysisResult}
                  values={analysisValues ?? form.getValues()}
                  dataConfidence={
                    analysisResult
                      ? buildDataConfidence(
                          liveResultSourceContext.provenance,
                          {
                            hasRent: analysisResult.monthlyRentalIncome > 0,
                            hasPrice: (liveFormValues.purchasePrice ?? 0) > 0,
                            hasBeds: (liveFormValues.bedrooms ?? 0) > 0,
                          },
                        )
                      : null
                  }
                  inputConfidence={currentInputConfidence}
                  onToggleInputVerified={handleToggleInputVerified}
                  isLoading={isCalculating}
                  dealScoreResult={dealScoreResult}
                  isLoadingDealScore={isLoadingDealScore}
                  propertyType={propertyType}
                  marketRentEstimate={marketRentEstimate}
                  projectionSource={projectionSource}
                  taxStrategySource={taxStrategySource}
                  exitScenarioSource={exitScenarioSource}
                  recordedSpecialistAnalysis={recordedSpecialistAnalysis}
                  onSaveDeal={(
                    maoTarget: MaoTarget | undefined,
                    source: OfferCeilingTargetSource | undefined,
                  ) => {
                    void handleSaveDeal(maoTarget, source);
                  }}
                  onCompareDeals={handleCompareDeals}
                  onExportPdf={handleExportPdf}
                  onNewAnalysis={handleNewAnalysis}
                  onAnalyzeAnotherLikeThis={handleAnalyzeAnotherLikeThis}
                  onPrepareAuthSave={(
                    maoTarget: MaoTarget | undefined,
                    source: OfferCeilingTargetSource | undefined,
                  ) => {
                    const snapshot = releasedInvestmentFormSchema.safeParse(
                      form.getValues(),
                    );
                    const exactValues = snapshot.success
                      ? snapshot.data
                      : analysisValues;
                    const normalizedSource =
                      normalizeOfferCeilingTargetSource(source);
                    const exactTarget =
                      !sampleSeededMaoTargetRef.current &&
                      normalizedSource &&
                      isAdoptedOfferCeilingTargetSource(normalizedSource)
                        ? normalizeMaoTarget(maoTarget)
                        : null;
                    if (exactTarget) {
                      analysisMaoTargetRef.current = exactTarget;
                      setAnalysisMaoTarget(exactTarget);
                      setAnalysisMaoTargetSource(normalizedSource);
                    } else {
                      analysisMaoTargetRef.current = null;
                      setAnalysisMaoTarget(null);
                      setAnalysisMaoTargetSource("screening-defaults");
                      analysisDecisionBasisRef.current = null;
                      setAnalysisDecisionBasis(null);
                      setDecisionBasisNeedsReview(false);
                    }
                    if (exactValues) {
                      writeCalcDraftWithMaoTarget(
                        exactValues,
                        exactTarget,
                        exactTarget ? normalizedSource : "screening-defaults",
                        activeStrategyKeyRef.current,
                        buildLiveInputConfidenceSourceContext(
                          exactValues,
                          form.formState.dirtyFields as Record<string, unknown>,
                        ),
                        exactTarget ? analysisDecisionBasisRef.current : null,
                      );
                      return exactValues;
                    }
                    return null;
                  }}
                  onEditAssumptions={() => {
                    setIsEditingAssumptions(true);
                    // Return to the short underwriting form first. Investors can
                    // open the exact assumption chip they need; the generic Edit
                    // action should not explode the entire advanced form.
                    setAdvancedOpen(false);
                    requestAnimationFrame(() => {
                      document
                        .querySelector('[data-calc-form="true"]')
                        ?.scrollIntoView({
                          behavior: scrollBehavior(),
                          block: "start",
                        });
                    });
                  }}
                  onReviewVerificationInput={handleReviewVerificationInput}
                  onApplyComps={handleApplyComps}
                  onApplyRehab={handleApplyRehab}
                  currentRehabBudget={liveStrategyInputs.rehabBudget ?? null}
                  strategyInputs={liveStrategyInputs}
                  strategyInputErrors={strategyInputErrors}
                  onStrategyInputChange={handleStrategyInputChange}
                  isSaving={isSavingDeal || isAutoSaveResuming}
                  isComparing={isComparingDeals}
                  isExporting={isExportingPdf}
                  isSaved={Boolean(savedDealId) && !hasPendingDealChanges}
                  isExistingSavedDeal={Boolean(savedDealId)}
                  savedDealId={savedDealId}
                  userDecision={userDecisionFromPipelineStage(
                    savedDealId ? loadedPipelineStage : null,
                  )}
                  isAuthenticated={isAuthenticated}
                  canSaveDeals={canSaveDeals}
                  canUpdateSavedDeals={canUpdateSavedDeals}
                  canCompareDeals={canCompareDeals}
                  canExportPdf={canExportPdf || anonymousDecisionGrantAvailable}
                  canExportUnsavedPdf={anonymousDecisionGrantAvailable}
                  // During the sample-deal Pro preview the analysis flags
                  // are OR'd open so the demo shows the real Pro report.
                  // Save / PDF / share / compare keep their true gating —
                  // they hit server actions which enforce entitlements.
                  canUseProjections={canUseProjections || isSampleProPreview}
                  canUseTaxStrategy={canUseTaxStrategy}
                  canUseExitScenarios={canUseExitScenarios}
                  canUseMaxOffer={
                    (canUseMaxOffer &&
                      (isAuthenticated || anonymousDecisionGrantAvailable)) ||
                    isSampleProPreview
                  }
                  priceIsEstimated={priceEstimated}
                  canUseSensitivity={
                    (canUseSensitivity &&
                      (isAuthenticated || anonymousDecisionGrantAvailable)) ||
                    isSampleProPreview
                  }
                  canUseStrategies={canUseStrategies}
                  isSampleProPreview={isSampleProPreview}
                  advocacyContractEligible={advocacyContractEligible}
                  maoTargetOverride={analysisMaoTarget}
                  maoTargetOverrideSource={analysisMaoTargetSource}
                  adoptedDecisionBasis={analysisDecisionBasis}
                  onMaoTargetChange={handleAnalysisMaoTargetChange}
                  onTargetDraftBlockingChange={setHasUnappliedTargetDraft}
                  recordedOfferCeiling={recordedOfferCeiling}
                  activeTab={activeDashboardTab}
                  activeTabNonce={activeTabNonce}
                  activeStrategy={activeStrategy}
                  saveDealLimitReached={currentSaveDealLimitReached}
                  savedDealCount={savedDealCount}
                  savedDealLimit={savedDealLimit}
                  persistedActionsBlockHint={
                    !savedDealId
                      ? anonymousDecisionGrantAvailable
                        ? "Create a free account to save or compare this decision."
                        : "Save this analysis first to compare or export a PDF."
                      : hasUnappliedTargetDraft
                        ? "Apply or cancel your criteria edits before comparing or exporting."
                        : hasUnsavedChanges
                          ? "Save your latest changes before comparing or exporting a PDF."
                          : undefined
                  }
                />
              </AnalysisErrorBoundary>
            </div>
          )}
      </main>
      {/* One-question testimonial ask after a PDF export or third saved
          deal (window event from those handlers). Once per browser, ever;
          submissions go to founder review — nothing renders publicly from
          here (lib/proof-records.ts is the publication gate). */}
      <TestimonialPrompt />
      {/* Pro report upgrade - new one-time purchases are temporarily disabled.
          Existing paid-claim recovery remains handled above. */}
      {isPdfPurchaseDialogOpen ? (
        <PdfPurchaseDialog
          open
          onOpenChange={setIsPdfPurchaseDialogOpen}
          returnFocusRef={pdfPurchaseTriggerRef}
        />
      ) : null}
      {/* Duplicate-address chooser - opens when saving an address that's
          already in saved deals: overwrite it, keep both, or cancel. */}
      {duplicateCollision ? (
        <DuplicateAddressDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              const cancelledAutoSave = Boolean(
                duplicateCollision.autoAfterAuth,
              );
              setDuplicateCollision(null);
              if (cancelledAutoSave) {
                // Cancel means "do not complete this automatic save." Release
                // the focused-results Save controls and acknowledge the intent
                // so reload does not reopen the same collision forever.
                autoSaveAfterAuthRef.current = false;
                setIsAutoSaveResuming(false);
                clearPendingSaveIntent();
                clearPendingMaoTarget();
                toast({
                  title: "Automatic save canceled",
                  description:
                    "Your analysis is still here. You can save it whenever you’re ready.",
                });
              }
            }
          }}
          existingTitle={duplicateCollision.existingTitle}
          busyChoice={duplicateChoiceBusy}
          onUpdateExisting={() => void handleDuplicateChoice("update")}
          onSaveAsScenario={() => void handleDuplicateChoice("scenario")}
        />
      ) : null}
      {/* Autofill conflict review — manually entered values remain authoritative
          unless the user explicitly selects the returned estimate. */}
      <Dialog
        open={pendingAutofillReview !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAutofillReview(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review values before autofill</DialogTitle>
            <DialogDescription>
              You already entered these values. We&apos;ll keep yours unless you
              explicitly choose the estimate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {pendingAutofillReview?.conflicts.map((conflict) => {
              const useEstimate = approvedAutofillFields.has(conflict.field);
              const format = (value: number) =>
                conflict.currency
                  ? `$${Math.round(value).toLocaleString("en-US")}${
                      conflict.field === "monthlyRent" ? "/mo" : ""
                    }`
                  : value.toLocaleString("en-US");
              return (
                <div
                  key={conflict.field}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {conflict.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Yours:{" "}
                      <span className="font-medium text-foreground">
                        {format(conflict.current)}
                      </span>
                      {" · "}
                      {conflict.proposedLabel ?? "Estimate"}:{" "}
                      <span className="font-medium text-foreground">
                        {format(conflict.proposed)}
                      </span>
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label={`${conflict.label} value source`}
                    className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1"
                  >
                    <button
                      type="button"
                      aria-pressed={!useEstimate}
                      onClick={() =>
                        setApprovedAutofillFields((current) => {
                          const next = new Set(current);
                          next.delete(conflict.field);
                          return next;
                        })
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground aria-pressed:bg-card aria-pressed:shadow-sm"
                    >
                      Keep mine
                    </button>
                    <button
                      type="button"
                      aria-pressed={useEstimate}
                      onClick={() =>
                        setApprovedAutofillFields((current) => {
                          const next = new Set(current);
                          next.add(conflict.field);
                          return next;
                        })
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground aria-pressed:bg-card aria-pressed:shadow-sm"
                    >
                      {conflict.proposedLabel === "Active listing asking price"
                        ? "Use listing price"
                        : "Use estimate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setPendingAutofillReview(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                if (!pendingAutofillReview) return;
                applyComps(
                  pendingAutofillReview.enrichment,
                  approvedAutofillFields,
                );
                setPendingAutofillReview(null);
              }}
            >
              Apply reviewed values
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={underwritingConflict !== null}
        onOpenChange={(next) => {
          if (next || isSavingDeal) return;
          const canceledAutomaticSave = Boolean(
            underwritingConflict?.autoAfterAuth,
          );
          setUnderwritingConflict(null);
          if (canceledAutomaticSave) {
            autoSaveAfterAuthRef.current = false;
            setIsAutoSaveResuming(false);
            clearPendingSaveIntent();
            clearPendingMaoTarget();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This underwriting changed elsewhere</DialogTitle>
            <DialogDescription>
              A newer saved version exists. Your edits are still on this screen
              and have not overwritten it. Load the latest version, or keep your
              edits as a separate scenario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={isSavingDeal}
              onClick={() => {
                const targetId = underwritingConflict?.savedDealId;
                if (!targetId) return;
                if (underwritingConflict.autoAfterAuth) {
                  autoSaveAfterAuthRef.current = false;
                  setIsAutoSaveResuming(false);
                  clearPendingSaveIntent();
                  clearPendingMaoTarget();
                }
                window.location.assign(
                  `${isAuthenticated ? "/dashboard/new" : "/"}?savedDeal=${encodeURIComponent(targetId)}`,
                );
              }}
            >
              Reload latest
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={isSavingDeal}
              onClick={() => {
                const autoAfterAuth = underwritingConflict?.autoAfterAuth;
                void performSaveDeal({
                  forceInsert: true,
                  saveAsNewScenario: true,
                  autoAfterAuth,
                });
              }}
            >
              {isSavingDeal ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save edits as new scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addressChangedPrompt !== null}
        onOpenChange={(next) => {
          // Don't let backdrop/Esc close the dialog mid-save.
          if (!next && addressChangedChoiceBusy === null)
            setAddressChangedPrompt(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>The address changed</DialogTitle>
            <DialogDescription>
              {addressChangedPrompt?.existingTitle
                ? `Your current inputs use a different address than “${addressChangedPrompt.existingTitle}”.`
                : "Your current inputs use a different address than the saved deal you loaded."}{" "}
              Save them as their own deal, or move the saved deal to the new
              address.
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
