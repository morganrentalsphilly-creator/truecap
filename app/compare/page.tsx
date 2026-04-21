import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCompareIdsFromCookie } from "@/app/actions/compare";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/investcalc/header";
import { CompareDealsClient, type CompareDealViewModel } from "@/components/investcalc/compare-deals-client";
import { buildDealAssumptions } from "@/lib/compare-assumptions";
import { recommendationToSignal, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_COMPARE_ITEMS = 4;

type ResultSnapshot = {
  monthlyRentalIncome?: number | string | null;
  totalOperatingExpenses?: number | string | null;
  monthlyPayment?: number | string | null;
  netCashFlow?: number | string | null;
  annualCashFlow?: number | string | null;
  cocReturn?: number | string | null;
  capRate?: number | string | null;
  dscr?: number | string | null;
  taxSavingsMonthly?: number | string | null;
  afterTaxCF?: number | string | null;
  totalCashRequired?: number | string | null;
  propertyTax?: number | string | null;
  propertyAge?: number | string | null;
  maintenancePctEffective?: number | string | null;
  capexPctEffective?: number | string | null;
  score?: number | string | null;
  recommendation?: StoredRecommendation | null;
  riskLevel?: StoredRiskLevel | null;
};

type SavedAnalysisRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: PropertyType | null;
  purchase_price: number | string | null;
  net_cash_flow_monthly: number | string | null;
  coc_return_pct: number | string | null;
  property_tax_pct: number | string | null;
  maintenance_pct: number | string | null;
  capex_pct: number | string | null;
  vacancy_pct: number | string | null;
  year_built: number | string | null;
  result_snapshot: ResultSnapshot | null;
  form_snapshot: unknown;
  interest_rate_pct?: number | string | null;
  loan_term_years?: number | string | null;
  down_payment_pct?: number | string | null;
  management_pct?: number | string | null;
  monthly_rent?: number | string | null;
  insurance_mo?: number | string | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapDeal(row: SavedAnalysisRow): CompareDealViewModel {
  const snapshot = row.result_snapshot ?? {};
  const netCashFlow = toNumber(snapshot.netCashFlow) ?? toNumber(row.net_cash_flow_monthly);
  const cocReturn = toNumber(snapshot.cocReturn) ?? toNumber(row.coc_return_pct);
  const capRate = toNumber(snapshot.capRate);
  const purchasePrice = toNumber(row.purchase_price);
  const storedScore = toNumber(snapshot.score);
  const storedRecommendation = snapshot.recommendation ?? null;
  const storedRiskLevel = snapshot.riskLevel ?? null;
  const scoringComplete = storedScore != null && !!storedRecommendation && !!storedRiskLevel;
  const signal = scoringComplete ? recommendationToSignal(storedRecommendation) : null;

  const metrics = {
    netCashFlow,
    cocReturn,
    capRate,
    afterTaxCF: toNumber(snapshot.afterTaxCF),
    annualCashFlow: toNumber(snapshot.annualCashFlow),
    dscr: toNumber(snapshot.dscr),
    monthlyRentalIncome: toNumber(snapshot.monthlyRentalIncome),
    totalOperatingExpenses: toNumber(snapshot.totalOperatingExpenses),
    purchasePrice,
    totalCashRequired: toNumber(snapshot.totalCashRequired),
    monthlyPayment: toNumber(snapshot.monthlyPayment),
    taxSavingsMonthly: toNumber(snapshot.taxSavingsMonthly),
  };

  const assumptions = buildDealAssumptions(row.form_snapshot, row);

  return {
    id: row.id,
    address: row.address?.trim() || row.title?.trim() || "Untitled Property",
    propertyType: row.property_type,
    purchasePrice,
    score: storedScore,
    recommendation: storedRecommendation,
    riskLevel: storedRiskLevel,
    scoringComplete,
    metrics,
    signal,
    assumptions,
  };
}

export default async function ComparePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getEntitlementsForUser(supabase, user.id);
  if (!entitlements.features.includes("save_deal")) {
    redirect("/");
  }

  const ids = await getCompareIdsFromCookie();

  if (ids.length < 1) {
    return (
      <>
        <Header initialUser={user} />
        <main className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plus className="size-5" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Compare Deals</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Save a deal or select 2-4 saved analyses to compare side by side.
            </p>
            <Button className="mt-5 rounded-full" asChild>
              <Link href="/saved-analyses">Go to Saved Analyses</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  const { data: rows, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, property_tax_pct, maintenance_pct, capex_pct, vacancy_pct, year_built, result_snapshot, form_snapshot, interest_rate_pct, loan_term_years, down_payment_pct, management_pct, monthly_rent, insurance_mo"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .in("id", ids);

  if (error) {
    return (
      <>
        <Header initialUser={user} />
        <main className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <h1 className="text-xl font-bold text-foreground">Could not load comparison</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please try again in a few moments.</p>
          </div>
        </main>
      </>
    );
  }

  const rowById = new Map((rows ?? []).map((row) => [row.id, row as SavedAnalysisRow]));
  const deals = ids.map((id) => rowById.get(id)).filter((row): row is SavedAnalysisRow => Boolean(row)).map(mapDeal);
  const bestDealId = [...deals]
    .filter((deal) => deal.scoringComplete && deal.score != null)
    .sort((a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY))[0]?.id;

  return (
    <>
      <Header initialUser={user} />
      <CompareDealsClient deals={deals} bestDealId={bestDealId} />
    </>
  );
}
