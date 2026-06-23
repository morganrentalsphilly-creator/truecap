import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHome, type DashboardHomeData } from "@/components/dashboard/DashboardHome";
import { DealLeadsCard } from "@/components/dashboard/DealLeadsCard";

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
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { getSavedAnalysesTotalCount } from "@/lib/saved-analyses-count";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildRateWatch } from "@/lib/rate-watch";

const DASHBOARD_ACTIVE_DEALS_LIMIT = 20;

/**
 * Current 30-yr mortgage rate (FRED MORTGAGE30US), cached 6h. FRED prints
 * weekly, so a per-request fetch would be wasteful, and the cache means a slow
 * or down FRED never blocks dashboard render for long. Null on missing key or
 * failure — the rate watch is additive, so a null simply hides the strip.
 */
async function fetchCurrentMortgageRate(): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", "MORTGAGE30US");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { observations?: Array<{ value: string }> };
    const value = Number(json.observations?.[0]?.value);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

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
  // Re-score each deal with the CURRENT engine from its saved form values, so
  // the dashboard never shows a stale pre-upgrade verdict (e.g. "Avoid / 0" on
  // a deal the analyzer now scores "Neutral / 40"). Falls back to the stored
  // score when the snapshot doesn't validate.
  const deals = rows.map((row) => {
    const deal = buildDashboardDeal(row);
    const fresh = recomputeSavedDealVerdict(row.form_snapshot);
    // Recompute-on-read: score AND the headline financials (cash flow / CoC /
    // cap) come from the live engine, so the dashboard never shows numbers that
    // drifted from the stored snapshot after a calc change. ROI stays on the
    // snapshot (it's the projection engine, computed separately).
    return fresh
      ? {
          ...deal,
          score: fresh.score,
          recommendation: fresh.recommendation,
          riskLevel: fresh.riskLevel,
          breakdown: fresh.breakdown,
          cashFlowMonthly: fresh.netCashFlowMonthly,
          cocReturnPct: fresh.cocReturnPct,
          capRatePct: fresh.capRatePct,
        }
      : deal;
  });

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
  const [{ data: profile }, isPremium, dealsResult, aggregateResult, currentRate, savedTotalCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
    supabase
      .from("saved_analyses")
      .select(
        "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, created_at, result_snapshot, form_snapshot, pipeline_stage, tags, data_confidence"
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
        "purchase_price, net_cash_flow_monthly, cap_rate_raw:result_snapshot->>capRate, ncf_snapshot:result_snapshot->>netCashFlow, form_snapshot"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false),
    // Current 30-yr rate for the dashboard rate watch (cached 6h). Independent
    // of the deal queries, so it rides in the same Promise.all wave.
    fetchCurrentMortgageRate(),
    // TRUE saved-deal total (active + completed + archived, non-deleted) —
    // the same count the sidebar "My Deals" badge uses. The portfolio
    // aggregates above are ACTIVE-only, so the header showed a smaller
    // number than the sidebar badge and looked like a mismatch. We pass
    // both so the header can read "X active · Y saved total".
    getSavedAnalysesTotalCount(supabase, user.id),
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
    form_snapshot: unknown;
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
      // Recompute-on-read so the portfolio totals stay in lockstep with the
      // per-deal cards (which now recompute too) and the live engine. Falls
      // back to the snapshot/denormalized values for legacy snapshots.
      const fresh = recomputeSavedDealVerdict(r.form_snapshot);
      if (r.purchase_price != null) {
        totalValue += r.purchase_price;
        activeCount += 1;
        const cap = fresh ? fresh.capRatePct : Number(r.cap_rate_raw);
        if (Number.isFinite(cap) && r.purchase_price > 0) {
          capNum += cap * r.purchase_price;
          capDen += r.purchase_price;
        }
      }
      if (fresh) {
        totalCashFlow += fresh.netCashFlowMonthly;
      } else {
        const ncfSnap = Number(r.ncf_snapshot);
        totalCashFlow +=
          r.ncf_snapshot != null && Number.isFinite(ncfSnap)
            ? ncfSnap
            : (r.net_cash_flow_monthly ?? 0);
      }
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
  // True saved total (matches the sidebar "My Deals" badge) so the header
  // can distinguish active deals from the full saved set.
  dashboardData.savedTotalCount = savedTotalCount;
  // Rate watch — re-underwrite saved deals at today's rate; the strip shows
  // only the ones whose signal changed (null = nothing to show, strip hides).
  dashboardData.rateWatch = buildRateWatch(
    (rows ?? []) as Array<{
      id: string;
      title: string | null;
      address: string | null;
      form_snapshot: unknown;
    }>,
    currentRate
  );

  return (
    <>
      <DashboardHome data={dashboardData} canCompareDeals={hasPlanFeature(entitlements, "compare_deals")} />
      <DealLeadsCard />
    </>
  );
}
