import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  SavedAnalysesPage,
  type SavedAnalysisListItem,
} from "@/components/investcalc/saved-analyses-page-v2";

export const metadata: Metadata = {
  title: "Saved Analyses",
  description: "Your saved rental property analyses in TrueCap.",
  alternates: { canonical: "/dashboard/saved-analyses" },
  robots: { index: false, follow: false },
};
import { PortfolioRollupStrip } from "@/components/dashboard/portfolio-rollup-strip";
import { Topbar } from "@/components/dashboard/Topbar";
import { getCompareIdsFromCookie } from "@/app/actions/compare";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StoredRecommendation, StoredRiskLevel } from "@/lib/compare-metrics";

type SortField = "saved" | "cash-flow" | "coc" | "cap-rate" | "price";
type SortDirection = "asc" | "desc";
type DealStateFilter = "active" | "completed" | "archived" | "all";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type SavedAnalysisRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: SavedAnalysisListItem["propertyType"];
  purchase_price: number | null;
  net_cash_flow_monthly: number | null;
  coc_return_pct: number | null;
  created_at: string;
  is_completed: boolean | null;
  is_archived: boolean | null;
  result_snapshot: {
    capRate?: number | string | null;
    score?: number | string | null;
    recommendation?: StoredRecommendation | null;
    riskLevel?: StoredRiskLevel | null;
  } | null;
  form_snapshot?: unknown;
};

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

function mapSavedRow(row: SavedAnalysisRow): SavedAnalysisListItem | null {
  const capRateRaw = row.result_snapshot?.capRate;
  const parsedCapRate =
    typeof capRateRaw === "number"
      ? capRateRaw
      : typeof capRateRaw === "string"
        ? Number(capRateRaw)
        : null;
  const parsedScore =
    typeof row.result_snapshot?.score === "number"
      ? row.result_snapshot.score
      : typeof row.result_snapshot?.score === "string"
        ? Number(row.result_snapshot.score)
        : null;
  // Deals saved before the Deal Score feature (or whose snapshot is
  // partial) previously made this function return null — and the
  // caller filters nulls, so those deals SILENTLY VANISHED from the
  // list. A paying user's old deals looked deleted. Default the
  // missing display fields instead, matching the convention the
  // saved-analyses detail view already uses (Neutral / Medium Risk /
  // null score → renders as a neutral row, data intact and clickable).
  const storedRecommendation = row.result_snapshot?.recommendation ?? "Neutral";
  const storedRiskLevel = row.result_snapshot?.riskLevel ?? "Medium Risk";

  // Re-score with the current engine from the saved form values so a deal saved
  // before the holistic-score upgrade doesn't show a stale "Avoid / 0" signal.
  // Falls back to the stored verdict when the snapshot doesn't validate.
  const fresh = recomputeSavedDealVerdict(row.form_snapshot);

  return {
    id: row.id,
    address: row.address,
    title: row.title,
    propertyType: row.property_type,
    purchasePrice: row.purchase_price,
    netCashFlowMonthly: row.net_cash_flow_monthly,
    cocReturnPct: row.coc_return_pct,
    capRatePct: Number.isFinite(parsedCapRate) ? parsedCapRate : null,
    score: fresh ? fresh.score : Number.isFinite(parsedScore) ? parsedScore : null,
    recommendation: fresh ? fresh.recommendation : storedRecommendation,
    riskLevel: fresh ? fresh.riskLevel : storedRiskLevel,
    createdAt: row.created_at,
    status: row.is_completed ? "completed" : row.is_archived ? "archived" : "active",
  };
}

function normalizeSortField(value: string | undefined): SortField | null {
  if (value === "cash-flow" || value === "coc" || value === "cap-rate" || value === "price") return value;
  if (value === "saved") return "saved";
  return null;
}

function normalizeDirection(value: string | undefined): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

function normalizeDealStateFilter(value: string | undefined): DealStateFilter {
  if (value === "completed" || value === "archived" || value === "all") return value;
  return "active";
}

export default async function DashboardSavedAnalysesPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string; dir?: string; state?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "save_deal")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, compareIds, isPremium] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getCompareIdsFromCookie(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);

  const resolvedSearchParams = (await searchParams) ?? {};
  const sortField = normalizeSortField(resolvedSearchParams.sort) ?? "saved";
  const sortDirection = normalizeDirection(resolvedSearchParams.dir ?? "desc");
  const activeDealStateFilter = normalizeDealStateFilter(resolvedSearchParams.state);

  let query = supabase
    .from("saved_analyses")
    .select(
      "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, created_at, is_completed, is_archived, result_snapshot, form_snapshot"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (activeDealStateFilter === "active") {
    query = query.eq("is_completed", false).eq("is_archived", false);
  } else if (activeDealStateFilter === "completed") {
    query = query.eq("is_completed", true);
  } else if (activeDealStateFilter === "archived") {
    query = query.eq("is_archived", true);
  }

  if (sortField === "saved" && sortDirection) {
    query = query.order("created_at", { ascending: sortDirection === "asc", nullsFirst: false });
  } else if (sortField === "cash-flow") {
    query = query
      .order("net_cash_flow_monthly", { ascending: sortDirection === "asc", nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
  } else if (sortField === "coc") {
    query = query
      .order("coc_return_pct", { ascending: sortDirection === "asc", nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
  } else if (sortField === "price") {
    query = query
      .order("purchase_price", { ascending: sortDirection === "asc", nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
  } else if (sortField === "cap-rate") {
    query = query.order("created_at", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false, nullsFirst: false });
  }

  const { data: rows, error } = await query;
  const mappedItems = (rows ?? [])
    .map((row) => mapSavedRow(row as SavedAnalysisRow))
    .filter((row): row is SavedAnalysisListItem => Boolean(row));
  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

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
          <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
              <h1 className="text-xl font-bold text-foreground">Could not load saved analyses</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Please try again in a few moments.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      {/*
        Layout pattern matches /dashboard/compare and /dashboard/templates:
        outer wrapper participates in the shell's fixed-viewport flex
        column; inner div has min-h-0 + lg:overflow-y-auto so it owns
        the scroll inside the constrained shell. Without this pattern
        content past the fold is clipped at lg+ breakpoint because the
        DashboardShell sets lg:h-screen lg:overflow-hidden.
      */}
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
          {/* Portfolio rollup — one-glance summary across the filtered
              set. Self-hides when fewer than 2 deals are in scope, so
              it never competes with empty-state UX. */}
          <PortfolioRollupStrip items={mappedItems} scope={activeDealStateFilter} />
          <SavedAnalysesPage
            initialItems={mappedItems}
            initialSelectedIds={compareIds}
            activeSortField={sortField}
            activeSortDirection={sortDirection}
            activeDealStateFilter={activeDealStateFilter}
            canCompareDeals={hasPlanFeature(entitlements, "compare_deals")}
            canExportPdf={hasPlanFeature(entitlements, "pdf_export")}
          />
        </div>
      </div>
    </>
  );
}
