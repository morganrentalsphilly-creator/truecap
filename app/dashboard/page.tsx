import { redirect } from "next/navigation";
import { DashboardHome, type DashboardDeal, type DashboardHomeData } from "@/components/dashboard/DashboardHome";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { getTypeLabel, type PropertyType, type StoredRecommendation, type StoredRiskLevel } from "@/lib/compare-metrics";
import { getSavedAnalysesTotalCount } from "@/lib/saved-analyses-count";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DASHBOARD_ACTIVE_DEALS_LIMIT = 20;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ResultSnapshot = {
  monthlyRentalIncome?: number | string | null;
  totalOperatingExpenses?: number | string | null;
  netCashFlow?: number | string | null;
  annualCashFlow?: number | string | null;
  cocReturn?: number | string | null;
  capRate?: number | string | null;
  totalCashRequired?: number | string | null;
  score?: number | string | null;
  recommendation?: StoredRecommendation | null;
  riskLevel?: StoredRiskLevel | null;
  risk_level?: StoredRiskLevel | null;
  riskScore?: number | string | null;
  tags?: string[] | null;
  compareSnapshot?: {
    longTermSummary?: {
      totalROI?: number | string | null;
    } | null;
    exitScenarios?: {
      summary?: {
        totalROI?: number | string | null;
      } | null;
    } | null;
  } | null;
};

type SavedAnalysisDashboardRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: PropertyType | null;
  purchase_price: number | string | null;
  net_cash_flow_monthly: number | string | null;
  coc_return_pct: number | string | null;
  created_at: string;
  result_snapshot: ResultSnapshot | null;
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

function getAddress(row: SavedAnalysisDashboardRow): string {
  return row.address?.trim() || row.title?.trim() || "Untitled Property";
}

function buildDeal(row: SavedAnalysisDashboardRow): DashboardDeal {
  const snapshot = row.result_snapshot ?? {};
  return {
    id: row.id,
    address: getAddress(row),
    propertyType: row.property_type,
    propertyTypeLabel: getTypeLabel(row.property_type),
    purchasePrice: toNumber(row.purchase_price),
    cashFlowMonthly: toNumber(snapshot.netCashFlow) ?? toNumber(row.net_cash_flow_monthly),
    cocReturnPct: toNumber(snapshot.cocReturn) ?? toNumber(row.coc_return_pct),
    capRatePct: toNumber(snapshot.capRate),
    roiPct:
      toNumber(snapshot.compareSnapshot?.longTermSummary?.totalROI) ??
      toNumber(snapshot.compareSnapshot?.exitScenarios?.summary?.totalROI),
    score: toNumber(snapshot.score),
    recommendation: snapshot.recommendation ?? null,
    riskLevel: snapshot.riskLevel ?? snapshot.risk_level ?? null,
    riskScore: toNumber(snapshot.riskScore),
    tags: Array.isArray(snapshot.tags) ? snapshot.tags.filter((tag): tag is string => typeof tag === "string") : [],
  };
}

function buildDashboardData(
  rows: SavedAnalysisDashboardRow[],
  profile: ProfileRow | null,
  email: string | null | undefined
): DashboardHomeData {
  const deals = rows.map(buildDeal);

  return {
    user: {
      displayName: getDisplayName(profile, email),
      email: email ?? "",
      avatarSrc: profile?.avatar_url ?? undefined,
    },
    stats: {
      totalDeals: deals.length,
    },
    topDeals: deals
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (b.cashFlowMonthly ?? -Infinity) - (a.cashFlowMonthly ?? -Infinity))
      .slice(0, 6),
  };
}

export default async function DashboardPage() {
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

  const [{ data: profile }, savedDealTotalCount, { data: rows, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getSavedAnalysesTotalCount(supabase, user.id),
    supabase
      .from("saved_analyses")
      .select(
        "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, created_at, result_snapshot"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_ACTIVE_DEALS_LIMIT),
  ]);

  if (error) {
    return (
      <div className="dashboard-shell">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <h1 className="text-xl font-bold text-foreground">Could not load dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please try again in a few moments.</p>
          </div>
        </main>
      </div>
    );
  }

  const dashboardData = buildDashboardData(
    ((rows ?? []) as SavedAnalysisDashboardRow[]),
    (profile as ProfileRow | null) ?? null,
    user.email
  );

  return (
    <DashboardShell savedDealCount={savedDealTotalCount}>
      <DashboardHome data={dashboardData} />
    </DashboardShell>
  );
}
