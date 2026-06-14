import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Compare Deals",
  description: "Compare 2-4 saved rental analyses side by side in your TrueCap dashboard.",
  alternates: { canonical: "/dashboard/compare" },
  robots: { index: false, follow: false },
};
import { getCompareIdsFromCookie } from "@/app/actions/compare";
import { Button } from "@/components/ui/button";
import { CompareDealsClient, type CompareDealViewModel } from "@/components/investcalc/compare-deals-client";
import { Topbar } from "@/components/dashboard/Topbar";
import { buildDealAssumptions } from "@/lib/compare-assumptions";
import {
  parseCompareSnapshotV1,
  type CompareSnapshotV1,
} from "@/lib/compare-result-snapshot";
import { recommendationToSignal, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_COMPARE_ITEMS = 4;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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
  snapshotVersion?: number | string | null;
  compareSnapshot?: unknown;
};

type SavedAnalysisRow = {
  id: string;
  created_at: string | null;
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
  insurance_input_mode?: string | null;
  insurance_pct?: number | string | null;
  insurance_mo?: number | string | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getDisplayName(profile: ProfileRow | null, email?: string | null): string {
  const profileName =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profileName || email?.split("@")[0] || "Investor";
}

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
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
  const compareSnapshotVersion = toNumber(snapshot.snapshotVersion ?? null);
  const compareSnapshot: CompareSnapshotV1 | null = parseCompareSnapshotV1(snapshot.compareSnapshot);

  return {
    id: row.id,
    address: row.address?.trim() || row.title?.trim() || "Untitled Property",
    createdAt: row.created_at,
    propertyType: row.property_type,
    purchasePrice,
    score: storedScore,
    recommendation: storedRecommendation,
    riskLevel: storedRiskLevel,
    scoringComplete,
    metrics,
    signal,
    assumptions,
    compareSnapshotVersion,
    compareSnapshot,
  };
}

export default async function DashboardComparePage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "compare_deals")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, ids, isPremium] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getCompareIdsFromCookie(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);
  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

  if (ids.length < 1) {
    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={initials}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <main id="main" className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Plus className="size-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">Compare Deals</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Save a deal or select 2-4 saved analyses to compare side by side.
              </p>
              <Button className="mt-5 rounded-full" asChild>
                <Link href="/dashboard/saved-analyses">Go to Saved Analyses</Link>
              </Button>
            </div>
          </main>
        </div>
      </>
    );
  }

  const { data: rows, error } = await supabase
    .from("saved_analyses")
    .select(
      "id, created_at, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, property_tax_pct, maintenance_pct, capex_pct, vacancy_pct, year_built, result_snapshot, form_snapshot, interest_rate_pct, loan_term_years, down_payment_pct, management_pct, monthly_rent, insurance_input_mode, insurance_pct, insurance_mo"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("is_completed", false)
    .eq("is_archived", false)
    .in("id", ids);

  if (error) {
    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={initials}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <main id="main" className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
              <h1 className="text-xl font-bold text-foreground">Could not load comparison</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please try again in a few moments.</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  const rowById = new Map((rows ?? []).map((row) => [row.id, row as SavedAnalysisRow]));
  const deals = ids.map((id) => rowById.get(id)).filter((row): row is SavedAnalysisRow => Boolean(row)).map(mapDeal);

  // Stale-cookie recovery: cookie has IDs but none match a current
  // active deal (deleted, archived, or marked completed since the
  // user picked them). Send them back to saved-analyses where the
  // selection UI can be rebuilt — otherwise they land on a confusing
  // half-empty compare grid with no clear next action.
  if (ids.length > 0 && deals.length === 0) {
    redirect("/dashboard/saved-analyses");
  }

  // Touch last_activity_at on the compared deals — fire-and-forget so
  // a slow Supabase round-trip never blocks the page render. Awaiting
  // this caused intermittent compare-page hangs ("system locks up" per
  // user report). The activity timestamp is a nice-to-have signal for
  // the stale-archive job, not load-bearing for the comparison UI.
  if (deals.length > 0) {
    const dealIdsToTouch = deals.map((deal) => deal.id);
    void supabase
      .from("saved_analyses")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("id", dealIdsToTouch)
      .then(({ error: touchError }) => {
        if (touchError) {
          // Silent — failing to bump activity_at is non-critical.
          console.warn("[compare] failed to bump last_activity_at:", touchError.message);
        }
      });
  }

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden">
        <Topbar
          displayName={displayName}
          email={user.email ?? ""}
          initials={initials}
          avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
          isPremium={isPremium}
          canAccessDashboard={navAccess.dashboard}
        />
        <div className="flex-1 min-h-0 lg:overflow-y-auto">
          <CompareDealsClient deals={deals.slice(0, MAX_COMPARE_ITEMS)} />
        </div>
      </div>
    </>
  );
}
