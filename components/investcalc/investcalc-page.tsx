"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { requestPdfExportAction } from "@/app/actions/pdf-export";

type InputTab = "cash-flow" | "projections" | "tax-strategy" | "deal-score";

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
  const [activeInputTab] = useState<InputTab>("cash-flow");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const propertyType = form.watch("propertyType");
  const purchasePrice = form.watch("purchasePrice") ?? 385000;

  const onSubmit = async (values: InvestmentFormValues) => {
    setIsCalculating(true);
    setShowResults(false);
    // Simulate analysis delay
    await new Promise((r) => setTimeout(r, 1500));
    const result = calculateAnalysis(values);
    setAnalysisResult(result);
    setIsCalculating(false);
    setShowResults(true);
    toast({
      title: "Analysis Complete",
      description: `Net cash flow: $${result.netCashFlow.toLocaleString()}/mo | CoC: ${result.cocReturn.toFixed(1)}%`,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const onError = () => {
    toast({
      title: "Validation Error",
      description: "Please fix the highlighted fields before calculating.",
      variant: "destructive",
    });
  };

  const handleSaveDeal = async () => {
    setIsSavingDeal(true);
    try {
      const result = await saveDealAction(form.getValues());
      if (result.ok) {
        toast({
          title: "Deal saved",
          description: "Your analysis was saved to your account.",
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
            {(propertyType === "multi-family" || propertyType === "house-hack") && (
              <MultiFamilyUnitsSection
                form={form}
                isHouseHack={propertyType === "house-hack"}
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
              propertyType={propertyType}
              onSaveDeal={handleSaveDeal}
              onExportPdf={handleExportPdf}
              isSaving={isSavingDeal}
              isExporting={isExportingPdf}
            />
          </div>
        )}
      </main>
    </div>
  );
}
