import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import {
  SavedAnalysesPage,
  type SavedAnalysisListItem,
} from "@/components/investcalc/saved-analyses-page-v2";
import { getCompareIdsFromCookie } from "@/app/actions/compare";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SortField = "saved" | "cash-flow" | "coc" | "cap-rate" | "price";
type SortDirection = "asc" | "desc";
type StoredRecommendation = "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";
type StoredRiskLevel = "Low Risk" | "Medium Risk" | "High Risk";

type SavedAnalysisRow = {
  id: string;
  address: string | null;
  title: string | null;
  property_type: SavedAnalysisListItem["propertyType"];
  purchase_price: number | null;
  net_cash_flow_monthly: number | null;
  coc_return_pct: number | null;
  created_at: string;
  result_snapshot: {
    capRate?: number | string | null;
    score?: number | string | null;
    recommendation?: StoredRecommendation | null;
    riskLevel?: StoredRiskLevel | null;
  } | null;
};

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
  const recommendation = row.result_snapshot?.recommendation ?? null;
  const riskLevel = row.result_snapshot?.riskLevel ?? null;
  if (!Number.isFinite(parsedScore) || !recommendation || !riskLevel) {
    return null;
  }

  return {
    id: row.id,
    address: row.address,
    title: row.title,
    propertyType: row.property_type,
    purchasePrice: row.purchase_price,
    netCashFlowMonthly: row.net_cash_flow_monthly,
    cocReturnPct: row.coc_return_pct,
    capRatePct: Number.isFinite(parsedCapRate) ? parsedCapRate : null,
    score: parsedScore,
    recommendation,
    riskLevel,
    createdAt: row.created_at,
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

export default async function SavedAnalysesRoutePage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string; dir?: string }>;
}) {
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

  const resolvedSearchParams = (await searchParams) ?? {};
  const sortField = normalizeSortField(resolvedSearchParams.sort);
  const sortDirection = sortField ? normalizeDirection(resolvedSearchParams.dir) : null;

  let query = supabase
    .from("saved_analyses")
    .select(
      "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, created_at, result_snapshot"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null);

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
  const compareIds = await getCompareIdsFromCookie();

  if (error) {
    return (
      <>
        <Header initialUser={user} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <h1 className="text-xl font-bold text-foreground">Could not load saved analyses</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Please try again in a few moments.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header initialUser={user} />
      <SavedAnalysesPage
        initialItems={(rows ?? [])
          .map((row) => mapSavedRow(row as SavedAnalysisRow))
          .filter((row): row is SavedAnalysisListItem => Boolean(row))}
        initialSelectedIds={compareIds}
        activeSortField={sortField}
        activeSortDirection={sortDirection}
      />
    </>
  );
}
