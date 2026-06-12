import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHome, type DashboardHomeData } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your TrueCap investor dashboard — saved deals, portfolio insights, and Pro tools.",
  alternates: { canonical: "/dashboard" },
  robots: { index: false, follow: false },
};
import {
  getDashboardNavAccess,
  getEntitlementsForUser,
  hasDashboardAccess,
  hasDashboardInsightsAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { buildDashboardDeal, type SavedAnalysisDashboardRow } from "@/lib/dashboard-deal-mapping";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DASHBOARD_ACTIVE_DEALS_LIMIT = 20;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function getDisplayName(profile: ProfileRow | null, email?: string | null): string {
  const profileName =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profileName || email?.split("@")[0] || "Investor";
}

function buildDashboardData(
  rows: SavedAnalysisDashboardRow[],
  profile: ProfileRow | null,
  email: string | null | undefined,
  isPremium: boolean,
  canAccessDashboard: boolean
): DashboardHomeData {
  const deals = rows.map(buildDashboardDeal);

  return {
    user: {
      displayName: getDisplayName(profile, email),
      email: email ?? "",
      avatarSrc: profile?.avatar_url ?? undefined,
      isPremium,
      canAccessDashboard,
    },
    stats: {
      totalDeals: deals.length,
    },
    allDeals: deals,
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
  if (!hasDashboardAccess(entitlements)) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);
  const canViewDashboardInsights = hasDashboardInsightsAccess(entitlements);

  if (!canViewDashboardInsights) {
    redirect("/dashboard/saved-analyses");
  }

  // All four reads are independent once the entitlement guards above
  // have passed — run them in ONE round-trip wave instead of two
  // sequential awaits (the deals query previously waited for the
  // profile/count/premium wave to finish for no reason).
  const [{ data: profile }, isPremium, dealsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
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

  const profileRow = (profile as ProfileRow | null) ?? null;
  const { data: rows, error } = dealsResult;

  if (error) {
    return (
      <div className="flex-1 min-w-0">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
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
    profileRow,
    user.email,
    isPremium,
    navAccess.dashboard
  );

  return (
    <>
      <DashboardHome data={dashboardData} canCompareDeals={hasPlanFeature(entitlements, "compare_deals")} />
    </>
  );
}
