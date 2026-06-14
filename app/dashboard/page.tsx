import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHome, type DashboardHomeData } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your TrueCap investor dashboard — saved deals, portfolio insights, and Pro tools.",
  alternates: { canonical: "/dashboard" },
  robots: { index: false, follow: false },
};
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasDashboardInsightsAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
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
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
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
  const [{ data: profile }, isPremium, dealsResult, aggregateResult] = await Promise.all([
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
    // Lightweight UNBOUNDED aggregate query — the detailed query above
    // is capped at DASHBOARD_ACTIVE_DEALS_LIMIT for the card/chart UI,
    // which previously made Portfolio Overview totals silently wrong
    // for users with 21+ active deals (sums computed over a recency
    // sample). This fetches only three scalar fields per deal (the
    // capRate is plucked from the snapshot JSON server-side), so even
    // hundreds of deals cost almost nothing.
    supabase
      .from("saved_analyses")
      .select(
        "purchase_price, net_cash_flow_monthly, cap_rate_raw:result_snapshot->>capRate, ncf_snapshot:result_snapshot->>netCashFlow"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false),
  ]);

  const profileRow = (profile as ProfileRow | null) ?? null;
  const { data: rows, error } = dealsResult;

  // Full-portfolio aggregates (see query note above). Null on error —
  // getPortfolioTotals falls back to the 20-deal sample, same as before.
  type AggregateRow = {
    purchase_price: number | null;
    net_cash_flow_monthly: number | null;
    cap_rate_raw: string | null;
    ncf_snapshot: string | null;
  };
  let portfolioAggregates: DashboardHomeData["portfolioAggregates"] = null;
  if (!aggregateResult.error) {
    const aggRows = (aggregateResult.data ?? []) as AggregateRow[];
    let totalValue = 0;
    let totalCashFlow = 0;
    let capNum = 0;
    let capDen = 0;
    let activeCount = 0;
    for (const r of aggRows) {
      if (r.purchase_price != null) {
        totalValue += r.purchase_price;
        activeCount += 1;
        const cap = Number(r.cap_rate_raw);
        if (r.cap_rate_raw != null && Number.isFinite(cap) && r.purchase_price > 0) {
          capNum += cap * r.purchase_price;
          capDen += r.purchase_price;
        }
      }
      // Prefer the snapshot's netCashFlow — the SAME source the per-deal
      // cards use (see buildDashboardDeal) — so the headline total can't
      // disagree with the rows below it. Fall back to the denormalized
      // column only when the snapshot lacks the field.
      const ncfSnap = Number(r.ncf_snapshot);
      totalCashFlow +=
        r.ncf_snapshot != null && Number.isFinite(ncfSnap)
          ? ncfSnap
          : (r.net_cash_flow_monthly ?? 0);
    }
    portfolioAggregates = {
      totalValue,
      totalCashFlow,
      weightedCap: capDen > 0 ? capNum / capDen : null,
      activeCount,
      totalCount: aggRows.length,
    };
  }

  if (error) {
    return (
      <div className="flex-1 min-w-0">
        <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <h1 className="text-xl font-bold text-foreground">Could not load dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong loading your deals. This is usually temporary.
            </p>
            <Link
              href="/dashboard"
              prefetch={false}
              className="mt-4 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Reload dashboard
            </Link>
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
  dashboardData.portfolioAggregates = portfolioAggregates;

  return (
    <>
      <DashboardHome data={dashboardData} canCompareDeals={hasPlanFeature(entitlements, "compare_deals")} />
    </>
  );
}
