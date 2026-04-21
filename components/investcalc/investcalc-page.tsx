"use client";

import { useEffect, useRef, useState } from "react";
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
} from "@/lib/investcalc-schema";
import { calculateAnalysis, AnalysisResult } from "@/lib/calc-analysis";
import { PropertyTypeSection } from "./property-type-section";
import { PropertyDetailsSection } from "./property-details-section";
import { SingleFamilyUnitSection } from "./single-family-unit-section";
import { MultiFamilyUnitsSection } from "./multi-family-units-section";
import { FinancingSection } from "./financing-section";
import { OperatingExpensesSection } from "./operating-expenses-section";
import { AnalysisDashboard } from "./analysis-dashboard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { saveDealAction } from "@/app/actions/saved-analyses";
import { addDealToCompareAction } from "@/app/actions/compare";
import { requestPdfExportAction } from "@/app/actions/pdf-export";
import { getDealScoreAction, type DealScoreActionResult } from "@/app/actions/deal-score";

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";

function createEmptyUnit(isOwnerOccupied = false) {
  return {
    bedrooms: undefined,
    bathrooms: undefined,
    sqft: undefined,
    monthlyRent: undefined,
    isOwnerOccupied,
  };
}

function getUnitsForPropertyType(type: InvestmentFormValues["propertyType"]) {
  if (type === "single-family") return [createEmptyUnit(false)];
  if (type === "owner-occupant") return [createEmptyUnit(true), createEmptyUnit(false)];
  return [createEmptyUnit(false), createEmptyUnit(false)];
}

function buildNewAnalysisDefaults(
  propertyType: InvestmentFormValues["propertyType"]
): Partial<InvestmentFormValues> {
  return {
    ...defaultValues,
    propertyType,
    templateId: undefined,
    purchasePrice: undefined,
    yearBuilt: undefined,
    units: getUnitsForPropertyType(propertyType),
  };
}

const INPUT_TABS: {
  id: InputTab;
  label: string;
  isPro: boolean;
  isFree?: boolean;
}[] = [
  { id: "cash-flow", label: "Cash Flow Analysis", isPro: false, isFree: true },
  { id: "projections", label: "10-Year Projections", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", isPro: true },
  { id: "deal-score", label: "Deal Score", isPro: true },
];

export function InvestCalcPage() {
  const router = useRouter();
  const [activeInputTab] = useState<InputTab>("cash-flow");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isComparingDeals, setIsComparingDeals] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dealScoreResult, setDealScoreResult] = useState<DealScoreActionResult | null>(null);
  const [isLoadingDealScore, setIsLoadingDealScore] = useState(false);
  const { toast } = useToast();
  const prevPropertyTypeRef = useRef<InvestmentFormValues["propertyType"]>("single-family");
  const isProgrammaticResetRef = useRef(false);

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: buildNewAnalysisDefaults("single-family"),
    mode: "onChange",
  });

  const propertyType = form.watch("propertyType");
  const purchasePrice = form.watch("purchasePrice");

  useEffect(() => {
    const subscription = form.watch((_value, { type }) => {
      if (type === "change" && !isProgrammaticResetRef.current) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    // Force clean "new analysis" defaults once on mount. Do not depend on `form`
    // reference — in some setups it can churn and repeatedly reset user input.
    isProgrammaticResetRef.current = true;
    form.reset(buildNewAnalysisDefaults("single-family"));
    setSavedDealId(null);
    setAnalysisResult(null);
    setDealScoreResult(null);
    setShowResults(false);
    setHasUnsavedChanges(false);
    prevPropertyTypeRef.current = "single-family";
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time mount reset
  }, []);

  useEffect(() => {
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
    form.setValue("units", getUnitsForPropertyType(propertyType), {
      shouldDirty: true,
      shouldValidate: true,
    });
    queueMicrotask(() => {
      isProgrammaticResetRef.current = false;
    });
  }, [form, propertyType]);

  const onSubmit = async (validated: InvestmentFormValues) => {
    // Use a synchronous snapshot of the live form right after validation. This
    // matches what the user sees (including fields that only exist while mounted)
    // and avoids any mismatch between RHF state and resolver output.
    const liveParse = investmentFormSchema.safeParse(form.getValues());
    const values: InvestmentFormValues = liveParse.success ? liveParse.data : validated;

    setIsCalculating(true);
    setIsLoadingDealScore(true);
    setShowResults(false);
    setDealScoreResult(null);
    setHasUnsavedChanges(true);
    try {
      // Simulate analysis delay
      await new Promise((r) => setTimeout(r, 1500));
      const result = calculateAnalysis(values);
      setAnalysisResult(result);
      setIsCalculating(false);
      setShowResults(true);
      const dealScore = await getDealScoreAction({
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
      });
      setDealScoreResult(dealScore);
      toast({
        title: "Analysis Complete",
        description: `Net cash flow: $${result.netCashFlow.toLocaleString()}/mo | CoC: ${result.cocReturn.toFixed(1)}%`,
      });
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } finally {
      setIsCalculating(false);
      setIsLoadingDealScore(false);
    }
  };

  const onError = (errors: FieldErrors<InvestmentFormValues>) => {
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

    toast({
      title: "Validation Error",
      description: unitsErrorMessage ?? "Please fix the highlighted fields before calculating.",
      variant: "destructive",
    });
  };

  const handleSaveDeal = async () => {
    setIsSavingDeal(true);
    try {
      const result = await saveDealAction(form.getValues(), savedDealId);
      if (result.ok) {
        setSavedDealId(result.id);
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
    if (!savedDealId || hasUnsavedChanges) {
      toast({
        title: "Save required",
        description: "Save the latest analysis before exporting a PDF.",
        variant: "warning",
      });
      return;
    }
    setIsExportingPdf(true);
    try {
      const gate = await requestPdfExportAction();
      if (gate.ok) {
        toast({
          title: "Export authorized",
          description: "PDF generation can be wired here next; your plan allows export.",
        });
        return;
      }
      if (gate.code === "SIGN_IN_REQUIRED") {
        toast({
          title: "Sign in required",
          description: "Sign in to export PDFs and compare deals.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Upgrade required",
        description: "PDF export is included with Pro.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCompareDeals = async () => {
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
      router.push("/compare");
    } finally {
      setIsComparingDeals(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground mb-2 text-balance">
          Analyze Your Investment Property
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Get institutional-grade analysis with cash flow projections, tax benefits, and risk
          assessment in seconds.
        </p>

        {/* Input tabs — horizontally scrollable on mobile */}
        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 scrollbar-none">
          {INPUT_TABS.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm font-medium shrink-0 sm:shrink min-w-[160px] sm:min-w-0",
                tab.id === activeInputTab
                  ? "bg-[var(--brand-green-light)] border-[var(--brand-green)]/30 text-[var(--brand-green)]"
                  : "bg-card border-border text-muted-foreground"
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
                <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
              </div>
              {tab.isFree && (
                <span className="text-[10px] font-bold bg-[var(--brand-green)] text-white px-1.5 sm:px-2 py-0.5 rounded-full uppercase shrink-0 ml-1.5">
                  FREE
                </span>
              )}
              {tab.isPro && (
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[var(--brand-orange)] ml-1.5" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-16">
        <form onSubmit={form.handleSubmit(onSubmit, onError)} noValidate>
          <div className="space-y-5">
            <PropertyTypeSection form={form} />
            <PropertyDetailsSection form={form} />

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
        {(showResults || isCalculating) && (
          <div className="mt-8">
            <AnalysisDashboard
              result={analysisResult}
              isLoading={isCalculating}
              dealScoreResult={dealScoreResult}
              isLoadingDealScore={isLoadingDealScore}
              propertyType={propertyType}
              onSaveDeal={handleSaveDeal}
              onCompareDeals={handleCompareDeals}
              onExportPdf={handleExportPdf}
              isSaving={isSavingDeal}
              isComparing={isComparingDeals}
              isExporting={isExportingPdf}
              isSaved={Boolean(savedDealId) && !hasUnsavedChanges}
            />
          </div>
        )}
      </main>
    </div>
  );
}
