"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { PropertyTypeSection } from "./property-type-section";
import { PropertyDetailsSection } from "./property-details-section";
import { SingleFamilyUnitSection } from "./single-family-unit-section";
import { MultiFamilyUnitsSection } from "./multi-family-units-section";
import { FinancingSection } from "./financing-section";
import { OperatingExpensesSection } from "./operating-expenses-section";
import { AnalysisDashboard, type AnalysisDashboardTab } from "./analysis-dashboard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { saveDealAction } from "@/app/actions/saved-analyses";
import { addDealToCompareAction } from "@/app/actions/compare";
import { getDealScoreAction, type DealScoreActionResult } from "@/app/actions/deal-score";
import { enrichPropertyAction } from "@/app/actions/enrich-property";
import type { SelectedAddress } from "./address-autocomplete";
import type { TenYearProjectionInput, ProjectionYear } from "@/lib/ten-year-projections";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";
import { generateInvestmentPDF, type ReportData } from "@/lib/pdf-generator";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioInput,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import { buildAutoVerdict } from "@/lib/verdict";

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";
const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";

function buildNewAnalysisDefaults(
  propertyType: InvestmentFormValues["propertyType"]
): Partial<InvestmentFormValues> {
  return {
    ...defaultValues,
    propertyType,
    templateId: undefined,
    purchasePrice: undefined,
    yearBuilt: undefined,
    units: getDefaultUnitsForPropertyType(propertyType),
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
  dealScoreResult: DealScoreActionResult | null;
  projectionYears: ProjectionYear[];
  taxYears: TaxStrategyYear[];
  exitYears: ExitScenarioYear[];
}): ReportData {
  const { values, result, dealScoreResult, projectionYears, taxYears, exitYears } = args;

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

  const proScore = dealScoreResult?.ok && dealScoreResult.tier === "pro" ? dealScoreResult.data : null;
  const recommendation = proScore?.recommendation ?? "Neutral";
  const risk = proScore?.riskLevel ?? "Medium Risk";
  const score = proScore?.score ?? Math.round(Math.max(0, Math.min(100, (result.cocReturn + result.capRate) * 4)));
  // Use the Pro Deal Score explanation when available (it's tuned by the
  // same engine that computes the score). For free users, fall back to
  // the auto-verdict generator — a richer 5-6 sentence plain-English
  // summary derived from the observable metrics.
  const rationale =
    proScore?.explanation ??
    buildAutoVerdict({
      result,
      address: values.address,
      purchasePrice: values.purchasePrice,
    });

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
      bestAnnualAfterTax: Math.max(...projectionRows.map((row) => row.after)),
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

export function InvestCalcPage({
  canSaveDeals = false,
  canCompareDeals = false,
  canExportPdf = false,
  canUseProjections = false,
  canUseTaxStrategy = false,
  canUseExitScenarios = false,
  canUseDealScore = false,
  canUpdateSavedDeals = false,
  saveDealLimitReached = false,
  initialSavedDealCount = 0,
  savedDealLimit = null,
  isAuthenticated = false,
}: {
  canSaveDeals?: boolean;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
  canUseProjections?: boolean;
  canUseTaxStrategy?: boolean;
  canUseExitScenarios?: boolean;
  canUseDealScore?: boolean;
  canUpdateSavedDeals?: boolean;
  saveDealLimitReached?: boolean;
  initialSavedDealCount?: number;
  savedDealLimit?: number | null;
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("cash-flow");
  const [activeDashboardTab, setActiveDashboardTab] = useState<AnalysisDashboardTab>("cash-flow");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [savedDealCount, setSavedDealCount] = useState(initialSavedDealCount);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isComparingDeals, setIsComparingDeals] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dealScoreResult, setDealScoreResult] = useState<DealScoreActionResult | null>(null);
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

  const loadDealScore = async (values: InvestmentFormValues, result: AnalysisResult) => {
    setIsLoadingDealScore(true);
    try {
      const dealScore = await getDealScoreAction({
        propertyType: values.propertyType,
        monthlyCashFlow: result.netCashFlow,
        cashOnCashReturn: result.cocReturn,
        capRate: result.capRate,
        dscr: result.dscr,
        vacancyRate: values.vacancyPct,
        propertyAge: result.propertyAge,
        capexPct: result.capexPctEffective,
        maintenancePct: result.maintenancePctEffective,
        monthlyPropertyTax: result.propertyTax,
        monthlyRentIncome: result.monthlyRentalIncome,
        isCashPurchase: result.monthlyPayment <= 0,
      });
      setDealScoreResult(dealScore);
    } finally {
      setIsLoadingDealScore(false);
    }
  };

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: buildNewAnalysisDefaults("single-family"),
    mode: "onChange",
  });

  const syncFormDirtyVersusPersisted = useCallback(() => {
    const id = savedDealIdRef.current;
    if (!id) {
      setHasUnsavedChanges(false);
      return;
    }
    const json = formSnapshotForCompare(form.getValues());
    if (!json || !lastPersistedFormJsonRef.current) {
      setHasUnsavedChanges(true);
      return;
    }
    setHasUnsavedChanges(json !== lastPersistedFormJsonRef.current);
  }, [form]);

  const clearAnalysisOutputs = useCallback(() => {
    setAnalysisResult(null);
    setProjectionSource(null);
    setTaxStrategySource(null);
    setExitScenarioSource(null);
    setDealScoreResult(null);
    setShowResults(false);
    setIsLoadingDealScore(false);
  }, []);

  const invalidateAnalysisOutputsIfFormDriftedFromLastRun = useCallback(() => {
    if (isProgrammaticResetRef.current || isCalculatingRef.current) return;
    const baseline = lastComputedFormJsonRef.current;
    if (baseline === null) return;
    const now = formSnapshotForCompare(form.getValues());
    if (now === null || now === baseline) return;

    // Any edit after Calculate invalidates the currently shown outputs.
    lastComputedFormJsonRef.current = null;
    clearAnalysisOutputs();
  }, [form, clearAnalysisOutputs]);

  const resetToNewAnalysis = useCallback(
    (nextPropertyType: InvestmentFormValues["propertyType"] = "single-family") => {
      isProgrammaticResetRef.current = true;
      const defaults = buildNewAnalysisDefaults(nextPropertyType);
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
      form.setValue("units", getDefaultUnitsForPropertyType(nextPropertyType), {
        shouldDirty: false,
        shouldValidate: false,
      });
      queueMicrotask(() => {
        isProgrammaticResetRef.current = false;
      });
    },
    [form, clearAnalysisOutputs]
  );

  const propertyType = form.watch("propertyType");
  const purchasePrice = form.watch("purchasePrice");
  const watchedBedrooms = form.watch("bedrooms");

  /**
   * "Is this form value functionally empty?" — handles all the ways
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

      console.log("[enrich] firing", { state: place.state, county: place.county, propertyType: currentPropertyType, bedrooms });

      const enrichment = await enrichPropertyAction({
        state: place.state,
        county: place.county,
        zip: place.zip,
        propertyType: currentPropertyType,
        bedrooms,
      });

      console.log("[enrich] result", enrichment);

      const setOpts = {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      };
      const filled: string[] = [];

      // Property tax — always overwrite with the state-level rate.
      // Defaults baked into the form schema aren't location-aware, so the
      // state rate is strictly more informative.
      if (enrichment.propertyTaxPct !== undefined) {
        form.setValue("propertyTaxPct", enrichment.propertyTaxPct, setOpts);
        filled.push(
          `Property tax ${enrichment.propertyTaxPct.toFixed(2)}% (${enrichment.meta.propertyTax?.state})`
        );
      }

      // Interest rate — overwrite unless the user has manually edited it.
      // dirtyFields.interestRate is true only after a manual change, so
      // saved-analysis edits (which use form.reset) are also covered.
      if (enrichment.interestRate !== undefined) {
        const isDirty = form.formState.dirtyFields.interestRate;
        if (!isDirty) {
          form.setValue("interestRate", enrichment.interestRate, setOpts);
          filled.push(
            `Interest rate ${enrichment.interestRate.toFixed(2)}% (current avg)`
          );
        }
      }

      // Monthly rent — single-family only at this entry point. Multi-family
      // rents are filled per-unit by a separate effect below. `valueAsNumber:
      // true` means an empty input reads as NaN, so we must treat NaN as
      // empty too.
      let rentFilledFromHud = false;
      if (isSingleFamily && enrichment.monthlyRent !== undefined) {
        const current = form.getValues("monthlyRent") as number | undefined | null;
        const isEmpty = isEmptyNumber(current);
        console.log("[enrich] monthlyRent decision", {
          incoming: enrichment.monthlyRent,
          current,
          isEmpty,
        });
        if (isEmpty) {
          form.setValue("monthlyRent", enrichment.monthlyRent, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
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
            ? `${filled.join("  ·  ")} — HUD FMR is an area average; adjust to local comps.`
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
    console.log("[bedrooms watcher]", {
      watchedBedrooms,
      type: typeof watchedBedrooms,
      hasPlace: !!place,
      propertyType: form.getValues("propertyType"),
      currentRent: form.getValues("monthlyRent"),
    });
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
    runPropertyEnrichment(place, { silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBedrooms]);

  /**
   * Multi-family / house-hack: when the user fills in bedroom counts for
   * each unit, look up the HUD rent estimate per unit (skipping any
   * owner-occupied unit — that one doesn't generate rent). Each
   * (unitIndex, bedrooms) combo is fetched at most once per session;
   * the server caches HUD data so multiple per-unit calls don't actually
   * hit HUD multiple times.
   */
  const watchedUnits = form.watch("units");
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

    (async () => {
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
          description: `${filledLines.join("  ·  ")} — HUD FMR is an area average; adjust to local comps.`,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsEnrichmentKey]);

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

  useEffect(() => {
    savedDealIdRef.current = savedDealId;
  }, [savedDealId]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (isProgrammaticResetRef.current) return;
      syncFormDirtyVersusPersisted();
      invalidateAnalysisOutputsIfFormDriftedFromLastRun();
    });
    return () => subscription.unsubscribe();
  }, [form, syncFormDirtyVersusPersisted, invalidateAnalysisOutputsIfFormDriftedFromLastRun]);

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

  const onSubmit = async (validated: InvestmentFormValues) => {
    // Use a synchronous snapshot of the live form right after validation. This
    // matches what the user sees (including fields that only exist while mounted)
    // and avoids any mismatch between RHF state and resolver output.
    const liveParse = investmentFormSchema.safeParse(form.getValues());
    const values: InvestmentFormValues = liveParse.success ? liveParse.data : validated;

    isCalculatingRef.current = true;
    setIsCalculating(true);
    setIsLoadingDealScore(true);
    setShowResults(false);
    setDealScoreResult(null);
    try {
      // Simulate analysis delay
      await new Promise((r) => setTimeout(r, 1500));
      const result = calculateAnalysis(values);
      const mappedTab = mapInputTabToDashboardTab(activeInputTab);
      if (mappedTab) setActiveDashboardTab(mappedTab);
      const builtProjectionSource = canUseProjections
        ? buildProjectionSource(savedDealId, values, result)
        : null;
      const builtTaxStrategySource = canUseTaxStrategy
        ? buildTaxStrategySource(savedDealId, values, result)
        : null;
      setAnalysisResult(result);
      setProjectionSource(builtProjectionSource);
      setTaxStrategySource(builtTaxStrategySource);
      setExitScenarioSource(
        canUseExitScenarios
          ? buildExitScenarioSource(
              savedDealId,
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
      await loadDealScore(values, result);
      toast({
        title: "Analysis Complete",
        description: `Net cash flow: $${result.netCashFlow.toLocaleString()}/mo | CoC: ${result.cocReturn.toFixed(1)}%`,
      });
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } finally {
      isCalculatingRef.current = false;
      setIsCalculating(false);
      setIsLoadingDealScore(false);
      syncFormDirtyVersusPersisted();
    }
  };

  const onError = (errors: FieldErrors<InvestmentFormValues>) => {
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
      const result = await saveDealAction(form.getValues(), savedDealId);
      if (result.ok) {
        const parsedValues = investmentFormSchema.safeParse(form.getValues());
        setSavedDealId(result.id);
        savedDealIdRef.current = result.id;
        if (result.mode === "inserted") {
          setSavedDealCount((count) => count + 1);
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
            "You already saved an analysis for this address. Open your saved deals or use a different address.",
          variant: "destructive",
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

  const handleExportPdf = async () => {
    if (!analysisResult) return;
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in before exporting PDFs.",
        variant: "destructive",
      });
      router.push("/auth/login");
      return;
    }
    if (!canExportPdf) {
      toast({
        title: "Upgrade required",
        description: "PDF export is not available for your current plan.",
        variant: "destructive",
      });
      router.push("/profile#billing");
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
        });

      const reportData = toPdfReportData({
        values,
        result: analysisResult,
        dealScoreResult,
        projectionYears,
        taxYears,
        exitYears,
      });

      await generateInvestmentPDF(reportData);
      toast({
        title: "PDF generated",
        description: "Your report was exported from the latest live analysis data.",
        variant: "success",
      });
    } catch (err) {
      // Surface PDF errors so we don't fail silently — was silently
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

  const handleNewAnalysis = () => {
    resetToNewAnalysis("single-family");
    setSavedTemplateFallback(null);
  };

  useEffect(() => {
    if (!autoExportPdfRef.current) return;
    if (!analysisResult) return;
    autoExportPdfRef.current = false;
    void handleExportPdf();
  }, [analysisResult]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-foreground mb-2 text-balance">
          Analyze Your Investment Property
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Get institutional-grade analysis with cash flow projections, tax benefits, and risk
          assessment in seconds.
        </p>

        {/* Input tabs — horizontally scrollable on mobile */}
        <div className="flex gap-1.5 sm:gap-3 mt-4 sm:mt-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4 scrollbar-none max-[380px]:mx-0 max-[380px]:grid max-[380px]:grid-cols-4 max-[380px]:gap-1 max-[380px]:overflow-visible max-[380px]:px-0">
          {INPUT_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              disabled={!areAnalysisTabsEnabled}
              aria-disabled={!areAnalysisTabsEnabled}
              title={!areAnalysisTabsEnabled ? "Calculate the analysis first." : undefined}
              onClick={() => handleInputTabClick(tab.id)}
              className={cn(
                "flex items-center justify-between px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl border text-[11px] sm:text-sm font-medium shrink-0 sm:shrink min-w-[82px] sm:min-w-0 transition-colors max-[380px]:min-w-0 max-[380px]:justify-center max-[380px]:px-1 max-[380px]:text-[10px]",
                areAnalysisTabsEnabled && tab.id === activeInputTab
                  ? "bg-[var(--brand-green-light)] border-[var(--brand-green)]/30 text-[var(--brand-green)]"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                !areAnalysisTabsEnabled && "cursor-not-allowed opacity-50 hover:bg-card hover:text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-[380px]:gap-1">
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
                <span className="hidden sm:inline-flex text-[10px] font-bold bg-[var(--brand-green)] text-white px-1.5 sm:px-2 py-0.5 rounded-full uppercase shrink-0 ml-1.5">
                  FREE
                </span>
              )}
              {tab.isPro &&
                ((tab.id === "projections" && !canUseProjections) ||
                  (tab.id === "tax-strategy" && !canUseTaxStrategy) ||
                  (tab.id === "deal-score" && !canUseDealScore)) && (
                <Lock className="hidden sm:block w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[var(--brand-orange)] ml-1.5" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Form */}
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-16">
        <form ref={formElementRef} onSubmit={form.handleSubmit(onSubmit, onError)} noValidate>
          <div className="space-y-5">
            <PropertyTypeSection form={form} savedTemplateFallback={savedTemplateFallback} />
            <PropertyDetailsSection form={form} onAddressSelected={handleAddressSelected} />

            {propertyType === "single-family" && (
              <SingleFamilyUnitSection form={form} />
            )}
            {(propertyType === "multi-family" || propertyType === "owner-occupant") && (
              <MultiFamilyUnitsSection
                form={form}
                isHouseHack={propertyType === "owner-occupant"}
              />
            )}

            <FinancingSection form={form} />
            <OperatingExpensesSection form={form} purchasePrice={purchasePrice} />

            {/* Calculate button */}
            <Button
              type="submit"
              disabled={isCalculating}
              className={cn(
                "w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all",
                "bg-gradient-to-r from-primary to-[oklch(0.45_0.22_290)] text-primary-foreground",
                "hover:opacity-90"
              )}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculating Investment Analysis...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculate Investment Analysis
                  <ArrowUpRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Results */}
        {(showResults || isCalculating || analysisResult !== null) && (
          <div className="mt-8" data-analysis-results="true">
            <AnalysisDashboard
              result={analysisResult}
              values={form.getValues()}
              isLoading={isCalculating}
              dealScoreResult={dealScoreResult}
              isLoadingDealScore={isLoadingDealScore}
              propertyType={propertyType}
              projectionSource={projectionSource}
              taxStrategySource={taxStrategySource}
              exitScenarioSource={exitScenarioSource}
              onSaveDeal={handleSaveDeal}
              onCompareDeals={handleCompareDeals}
              onExportPdf={handleExportPdf}
              onNewAnalysis={handleNewAnalysis}
              isSaving={isSavingDeal}
              isComparing={isComparingDeals}
              isExporting={isExportingPdf}
              isSaved={Boolean(savedDealId) && !hasUnsavedChanges}
              isExistingSavedDeal={Boolean(savedDealId)}
              isAuthenticated={isAuthenticated}
              canSaveDeals={canSaveDeals}
              canUpdateSavedDeals={canUpdateSavedDeals}
              canCompareDeals={canCompareDeals}
              canExportPdf={canExportPdf}
              canUseProjections={canUseProjections}
              canUseTaxStrategy={canUseTaxStrategy}
              canUseExitScenarios={canUseExitScenarios}
              canUseDealScore={canUseDealScore}
              activeTab={activeDashboardTab}
              saveDealLimitReached={currentSaveDealLimitReached}
              persistedActionsBlockHint={
                !savedDealId
                  ? "Save this analysis first to compare or export a PDF."
                  : hasUnsavedChanges
                    ? "Save your latest changes before comparing or exporting a PDF."
                    : undefined
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}
