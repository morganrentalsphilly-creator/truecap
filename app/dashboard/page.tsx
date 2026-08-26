import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { DashboardHome, type DashboardHomeData } from "@/components/dashboard/DashboardHome";
import { DealLeadsCard } from "@/components/dashboard/DealLeadsCard";
import { RetryRouteButton } from "@/components/dashboard/retry-route-button";

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
import { applicableCashOnCashValue } from "@/lib/cash-on-cash-applicability";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { recomputeCompareSnapshotFromForm } from "@/lib/compare-result-snapshot";
import { getSavedAnalysesTotalCount } from "@/lib/saved-analyses-count";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEAL_AGING_MIN_DAYS, DEAL_AGING_STAGES, daysSinceSaved } from "@/lib/deal-aging";
import { isPipelineStage, pipelineStageMeta } from "@/lib/pipeline";
import { buildRateWatch } from "@/lib/rate-watch";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";
import { computeOwnedEquity, monthsOwnedBetween } from "@/lib/owned-equity";
import {
  buildOwnedEquitySeries,
  resolveOwnedEquityBasis,
  type OwnedDealEquityBasis,
} from "@/lib/owned-equity-series";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { computeDealOfferLine } from "@/lib/deal-offer-line";
import { recordedDealOfferLine } from "@/lib/recorded-offer-ceiling";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
} from "@/lib/underwriting-model-release";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import {
  boxesForDealClient,
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
} from "@/lib/buy-box";

const DASHBOARD_ACTIVE_DEALS_LIMIT = 20;
const DASHBOARD_DEALS_SELECT =
  "id, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, created_at, methodology_version, result_snapshot, form_snapshot, pipeline_stage, tags, data_confidence";
const DASHBOARD_DEALS_SELECT_WITH_CLIENT = `${DASHBOARD_DEALS_SELECT}, client_id`;

function isMissingDashboardClientColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
      (error.code === "42703" || /column .*client_id.* does not exist/i.test(error.message ?? ""))
  );
}

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

/** Same label fallback buildDashboardDeal uses: a title that differs from the
 *  address (scenario saves) wins; otherwise address, title, or the placeholder. */
function aggregateRowLabel(r: { address: string | null; title: string | null }): string {
  const address = r.address?.trim();
  const title = r.title?.trim();
  if (address && title && title !== address) return title;
  return address || title || "Untitled Property";
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
    const baseDeal = buildDashboardDeal(row);
    const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
    const resolution = resolveSavedAnalysisSnapshot({
      methodologyVersion: row.methodology_version,
      resultSnapshot: row.result_snapshot,
      recomputedSnapshot: recomputed
        ? toRecomputedSavedAnalysisSnapshot(recomputed)
        : undefined,
    });
    const fresh = resolution.didRecompute ? recomputed : null;
    const deal = {
      ...baseDeal,
      methodologyLabel: resolution.shouldFreeze
        ? `Frozen Standard v${resolution.storedMethodologyVersion}`
        : isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion)
          ? resolution.didRecompute
            ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
            : `Legacy analysis · stored snapshot (current v${TRUECAP_UNDERWRITING_STANDARD_VERSION} recompute unavailable)`
          : `Standard v${resolution.storedMethodologyVersion}`,
    };
    // Recompute-on-read: score AND the headline financials (cash flow / CoC /
    // cap) come from the live engine, so the dashboard never shows numbers that
    // drifted from the stored snapshot after a calc change. The 10-yr ROI is
    // recomputed too (exit-tax-aware) so it never shows a stale pre-exit-tax
    // figure next to freshly-saved post-tax deals.
    const freshRoi = resolution.didRecompute
      ? recomputeCompareSnapshotFromForm(row.form_snapshot)?.longTermSummary?.totalROI
      : null;
    return fresh
      ? {
          ...deal,
          score: fresh.score,
          recommendation: fresh.recommendation,
          riskLevel: fresh.riskLevel,
          breakdown: fresh.breakdown,
          cashFlowMonthly: fresh.netCashFlowMonthly,
          // Annual cash flow was left stale while monthly recomputed, so the
          // risk-adjusted return axis divided a stale numerator by a fresh
          // DSCR. Recompute it from the fresh monthly (mirrors Compare).
          annualCashFlow: fresh.netCashFlowMonthly * 12,
          cocReturnPct: applicableCashOnCashValue(
            fresh.cocReturnPct,
            fresh.cashToClose
          ),
          capRatePct: fresh.capRatePct,
          // DSCR + cash-to-close were left on the stale snapshot while every
          // neighbour recomputed fresh, so /dashboard disagreed with the My
          // Deals list (which already uses fresh.dscr/cashToClose). Carry them.
          dscr: fresh.dscr,
          cashToClose: fresh.cashToClose,
          // monthlyPayment feeds the buy-box fit loop's cash-purchase
          // derivation (monthlyPayment <= 0) — stale snapshots missing it
          // made the SAME deal pass here but miss on My Deals (which uses
          // the recompute's isCashPurchase). One canon.
          monthlyPayment: fresh.monthlyPayment,
          roiPct: typeof freshRoi === "number" ? freshRoi : deal.roiPct,
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
  const [{ data: profile }, isPremium, dealsResult, aggregateResult, currentRate, savedTotalCount, dueDiligenceResult, ownedResult, buyBoxesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
    supabase
      .from("saved_analyses")
      .select(DASHBOARD_DEALS_SELECT_WITH_CLIENT)
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
        "id, title, address, purchase_price, net_cash_flow_monthly, methodology_version, cap_rate_raw:result_snapshot->>capRate, ncf_snapshot:result_snapshot->>netCashFlow, score_raw:result_snapshot->>score, recommendation_raw:result_snapshot->>recommendation, roi_raw:result_snapshot->compareSnapshot->longTermSummary->>totalROI, form_snapshot, created_at, pipeline_stage"
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
    // Due-diligence deadlines for ALL the user's ACTIVE deals (NOT the 20-row
    // recency sample above — deal #21's inspection deadline is exactly the one
    // that lapses unnoticed). We query deal_due_diligence and inner-join the
    // parent saved_analyses row so we can filter to active (non-archived,
    // non-completed, non-deleted) deals and pull the address label in one
    // round-trip. RLS scopes both tables to the user; the extra user_id filter
    // is belt-and-suspenders. The "Due this week" card computes overdue/
    // due-soon status client-side in the viewer's local time.
    supabase
      .from("deal_due_diligence")
      .select("analysis_id, items, saved_analyses!inner(id, address, title, is_archived, is_completed, deleted_at)")
      .eq("user_id", user.id)
      .eq("saved_analyses.is_archived", false)
      .eq("saved_analyses.is_completed", false)
      .is("saved_analyses.deleted_at", null),
    // OWNED (completed) deals — the month-3 surface (M3-1). Every query above
    // filters is_completed=false, so a customer whose deals all closed saw
    // "No saved deals yet" — factually false. Selects only what the equity
    // math + cash-flow sum need. close_date ships in its own migration; a
    // 42703 here is retried below without it (count + cash flow still work,
    // the equity figures simply don't render). Same completed scope as
    // My Deals' ?state=completed filter (is_completed only, RLS-scoped).
    supabase
      .from("saved_analyses")
      .select("id, is_completed, net_cash_flow_monthly, methodology_version, result_snapshot, form_snapshot, close_date")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", true),
    // Buy boxes (PV-1/PV-6): the same RLS-scoped user_buy_boxes read My Deals
    // and the deal workspace use (listBuyBoxesAction — canUse gate +
    // MIGRATION_PENDING tolerance built in). Any failure degrades to "no
    // boxes" → every buy-box surface on the home page renders nothing.
    listBuyBoxesAction().catch(() => null),
  ]);

  const profileRow = (profile as ProfileRow | null) ?? null;
  // Widen the selected row shape before the compatibility retry: the primary
  // query includes client_id while the pre-migration fallback intentionally
  // cannot, and both are normalized through SavedAnalysisDashboardRow below.
  let rows = dealsResult.data as unknown[] | null;
  let error = dealsResult.error;
  // client_id belongs to the newest Agent Pro migration. Older/partially
  // migrated environments still get the dashboard; they simply have no
  // client-specific box scope to apply.
  if (isMissingDashboardClientColumn(error)) {
    const fallbackDealsResult = await supabase
      .from("saved_analyses")
      .select(DASHBOARD_DEALS_SELECT)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_ACTIVE_DEALS_LIMIT);
    rows = fallbackDealsResult.data as unknown[] | null;
    error = fallbackDealsResult.error;
  }
  // A stored internal v2 result must not become visible merely because the
  // dashboard can fall back to recorded metrics when recomputation declines.
  rows = (rows ?? []).filter((row) =>
    isReleasedUnderwritingSnapshot(
      (row as { form_snapshot?: unknown }).form_snapshot
    )
  );

  // Full-portfolio aggregates (see query note above). Null on error —
  // getPortfolioTotals falls back to the 20-deal sample, same as before.
  type AggregateRow = {
    // id/title/address ride along (still scalar-only) so the rate watch can
    // monitor EVERY active deal, not the 20-row recency sample below.
    id: string;
    title: string | null;
    address: string | null;
    purchase_price: number | null;
    net_cash_flow_monthly: number | null;
    cap_rate_raw: string | null;
    ncf_snapshot: string | null;
    score_raw: string | null;
    recommendation_raw: string | null;
    roi_raw: string | null;
    methodology_version: string | null;
    form_snapshot: unknown;
    // Scalar ride-alongs for the deal-aging line — aging deals are by
    // definition OLD, so the 20-row recency sample below is exactly the
    // wrong set to compute them from (deal #21 is the one going cold).
    created_at: string | null;
    pipeline_stage: string | null;
  };
  let portfolioAggregates: DashboardHomeData["portfolioAggregates"] = null;
  // Hoisted so the rate watch below can reuse the full active set; null when
  // the aggregate query failed (rate watch then falls back to the sample).
  let fullActiveRows: AggregateRow[] | null = null;
  if (aggregateResult.error) {
    // The unbounded aggregate query failed → the dashboard falls back to the
    // ≤20-deal sample, which UNDERSTATES portfolio totals for 20+ deal users.
    // Surface it loudly (truth-layer integrity) rather than show wrong numbers
    // silently — prod log forwarding is off, so this must be a Sentry message.
    Sentry.captureMessage("dashboard portfolio aggregates query failed — falling back to ≤20-deal sample", {
      level: "warning",
      tags: { feature: "dashboard-aggregates" },
      extra: { code: aggregateResult.error.code, message: aggregateResult.error.message },
    });
  }
  if (!aggregateResult.error) {
    const aggRows = ((aggregateResult.data ?? []) as unknown as AggregateRow[]).filter(
      (row) => isReleasedUnderwritingSnapshot(row.form_snapshot)
    );
    fullActiveRows = aggRows;
    let totalValue = 0;
    let totalCashFlow = 0;
    let capNum = 0;
    let capDen = 0;
    let activeCount = 0;
    // NT-4: Decision Center / KPI winners tracked over the FULL active set —
    // scalars only (id + label + value), never the row set, so a 21+-deal
    // user's deal #23 can win "Best deal" or trip "Needs review" without
    // ballooning the client payload. The 20-row sample stays the fallback
    // in DashboardHome when this aggregate query failed.
    let bestByScore: { id: string; address: string; score: number; recommendation: string } | null =
      null;
    let worstNegative: { id: string; address: string; cashFlowMonthly: number } | null = null;
    let bestRoi: { id: string; address: string; roiPct: number } | null = null;
    let negativeCount = 0;
    for (const r of aggRows) {
      // Recompute-on-read so the portfolio totals stay in lockstep with the
      // per-deal cards (which now recompute too) and the live engine. Falls
      // back to the snapshot/denormalized values for legacy snapshots.
      const recomputed = recomputeSavedDealVerdict(r.form_snapshot);
      const resolution = resolveSavedAnalysisSnapshot({
        methodologyVersion: r.methodology_version,
        resultSnapshot: {
          capRate: r.cap_rate_raw,
          netCashFlow: r.ncf_snapshot,
          score: r.score_raw,
          recommendation: r.recommendation_raw,
        },
        recomputedSnapshot: recomputed
          ? toRecomputedSavedAnalysisSnapshot(recomputed)
          : undefined,
      });
      const fresh = resolution.didRecompute ? recomputed : null;
      const label = aggregateRowLabel(r);
      if (r.purchase_price != null) {
        totalValue += r.purchase_price;
        activeCount += 1;
        // Guard the legacy fallback: cap_rate_raw is null when absent, and
        // Number(null) === 0 passes Number.isFinite — folding a phantom 0%
        // (weighted by full price) into the headline weighted-cap aggregate.
        // Keep a missing cap OUT entirely (mirrors the ncf branch below).
        const cap = fresh ? fresh.capRatePct : (r.cap_rate_raw != null ? Number(r.cap_rate_raw) : NaN);
        if (Number.isFinite(cap) && r.purchase_price > 0) {
          capNum += cap * r.purchase_price;
          capDen += r.purchase_price;
        }
      }
      // Cash flow with the SAME fresh → snapshot → denormalized fallback chain
      // the totals always used, reused for the negative-deal winners so
      // "Needs review" counts legacy rows too.
      let ncf: number | null;
      if (fresh) {
        ncf = fresh.netCashFlowMonthly;
      } else {
        const ncfSnap = Number(r.ncf_snapshot);
        ncf =
          r.ncf_snapshot != null && Number.isFinite(ncfSnap)
            ? ncfSnap
            : r.net_cash_flow_monthly;
      }
      totalCashFlow += ncf ?? 0;
      const resolvedScore = fresh?.score ?? (r.score_raw != null ? Number(r.score_raw) : null);
      const resolvedRecommendation = fresh?.recommendation ?? r.recommendation_raw;
      if (
        resolvedScore != null &&
        Number.isFinite(resolvedScore) &&
        resolvedRecommendation &&
        (bestByScore == null || resolvedScore > bestByScore.score)
      ) {
        bestByScore = {
          id: r.id,
          address: label,
          score: resolvedScore,
          recommendation: resolvedRecommendation,
        };
      }
      if (ncf != null && ncf < 0) {
        negativeCount += 1;
        if (worstNegative == null || ncf < worstNegative.cashFlowMonthly) {
          worstNegative = { id: r.id, address: label, cashFlowMonthly: ncf };
        }
      }
      // 10-yr ROI from the same exit-tax-aware recompute the sample cards use.
      const roi = resolution.didRecompute
        ? recomputeCompareSnapshotFromForm(r.form_snapshot)?.longTermSummary?.totalROI
        : r.roi_raw != null
          ? Number(r.roi_raw)
          : null;
      if (typeof roi === "number" && Number.isFinite(roi) && (bestRoi == null || roi > bestRoi.roiPct)) {
        bestRoi = { id: r.id, address: label, roiPct: roi };
      }
    }
    portfolioAggregates = {
      totalValue,
      totalCashFlow,
      weightedCap: capDen > 0 ? capNum / capDen : null,
      activeCount,
      totalCount: aggRows.length,
      winners: { bestByScore, worstNegative, bestRoi, negativeCount },
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
            <RetryRouteButton className="mt-4" />
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
  dashboardData.portfolioAggregateStatus = aggregateResult.error ? "unavailable" : "ready";
  // Offer Ceiling per deal — the number the product is sold on, absent from this
  // screen until now. Recomputed from form_snapshot via the same
  // computeDealOfferLine path My Deals uses (no new math, no new query).
  // Deliberately over the DETAILED rows only: this is a bounded set, whereas
  // the aggregate set is unbounded and each solve costs ~28 calc iterations.
  // Runs AFTER activeBuyBoxes resolves (below) — see the reassignment there.

  dashboardData.portfolioAggregates = portfolioAggregates;
  // True saved total (matches the sidebar "My Deals" badge) so the header
  // can distinguish active deals from the full saved set.
  dashboardData.savedTotalCount = savedTotalCount;

  // Deal aging — the workspace DealAgingNudge's signal (deals sitting ≥7 days
  // in Negotiating / Offer / Under contract), surfaced on the home action lane so the user
  // doesn't have to already open the deal to learn it's going cold. Same
  // thresholds via lib/deal-aging; created_at + pipeline_stage ride the
  // queries already on the page, so this costs no extra IO. Computed over the
  // FULL active set (aging deals are by definition old, so the 20-row recency
  // sample is exactly the wrong set for them — the rate-watch precedent);
  // falls back to the sample only if the aggregate query failed. Honesty rule
  // carries over: days count from created_at (saved), never "in stage N days"
  // — there is no stage_changed_at column. Oldest first (coldest deal leads).
  {
    const nowMs = Date.now();
    dashboardData.agingDeals = (
      (fullActiveRows ?? (rows ?? [])) as Array<
        Pick<SavedAnalysisDashboardRow, "id" | "address" | "title"> & {
          created_at: string | null;
          pipeline_stage?: string | null;
        }
      >
    )
      .flatMap((r) => {
        const stage = isPipelineStage(r.pipeline_stage) ? r.pipeline_stage : null;
        if (!stage || !DEAL_AGING_STAGES.includes(stage)) return [];
        const days = daysSinceSaved(r.created_at, nowMs);
        if (days == null || days < DEAL_AGING_MIN_DAYS) return [];
        return [
          {
            id: r.id,
            address: aggregateRowLabel(r),
            stageLabel: pipelineStageMeta(stage).short,
            days,
          },
        ];
      })
      .sort((a, b) => b.days - a.days);
  }

  // ── Buy-box fit (PV-1 / PV-6) ─────────────────────────────────────────
  // Evaluate every ACTIVE deal against the user's active boxes server-side —
  // the exact My Deals pattern (evaluateBuyBoxes/summarizeBuyBoxFit, pure, no
  // extra IO) over fields DashboardDeal already carries. Powers the header
  // subtitle, the Decision Center tile, and the Deal Decision List badges/
  // sort. Users without a usable box get `buyBox` unset → every consuming
  // surface renders nothing (invisible until useful).
  const activeBuyBoxes =
    buyBoxesResult && buyBoxesResult.ok && buyBoxesResult.canUse
      ? buyBoxesResult.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b))
      : [];
  const buyBoxesResolved = Boolean(buyBoxesResult?.ok);
  // FEATURE_CATALOG marks Offer Ceiling as `gate: "paid"`; production Pro plan JSON has
  // no `mao` feature flag. Paid subscription status is therefore the complete
  // and fail-closed gate here.
  const canShowMao = isPremium;

  // Offer Ceiling per DETAILED row (bounded set). Same lib/deal-offer-line path
  // My Deals uses, so the two screens can never quote different numbers. The
  // paid gate wraps the entire solve, not only its rendering, so a free user
  // cannot receive a hidden Offer Ceiling value in the dashboard payload.
  if (canShowMao) {
    const offerById = new Map<string, number | null>();
    const basisById = new Map<string, DashboardDeal["maxOfferBasis"]>();
    const basisLabelById = new Map<string, string | null>();
    for (const row of (rows ?? []) as SavedAnalysisDashboardRow[]) {
      const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
      const methodologyResolution = resolveSavedAnalysisSnapshot({
        methodologyVersion: row.methodology_version,
        resultSnapshot: row.result_snapshot,
        recomputedSnapshot: recomputed
          ? toRecomputedSavedAnalysisSnapshot(recomputed)
          : undefined,
      });
      if (methodologyResolution.usesRecordedSnapshot) {
        const recorded = recordedDealOfferLine({
          snapshot: row.result_snapshot,
          isShoppingStage: true,
        });
        if (recorded) {
          const offer = recorded.offer;
          offerById.set(
            row.id,
            offer && offer.kind !== "blocked" ? offer.maxPrice ?? null : null
          );
          basisById.set(
            row.id,
            offer && offer.kind !== "blocked" ? offer.basis : null
          );
          basisLabelById.set(
            row.id,
            offer && offer.kind !== "blocked"
              ? recorded.basisLabel || null
              : null
          );
        }
        // Older rows without an atomic capture remain blank. Never fill a
        // recorded result with a solve from today's formula.
        continue;
      }
      const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
      if (!values) continue;
      const persistedTargetSource = normalizeOfferCeilingTargetSource(
        row.result_snapshot?.maxOfferTargetSource
      );
      const persistedMaoTarget =
        persistedTargetSource == null ||
        isAdoptedOfferCeilingTargetSource(persistedTargetSource)
          ? normalizeMaoTarget(row.result_snapshot?.maxOfferTarget)
          : null;
      // A stored target is self-contained. A legacy row is not: if the
      // account Buy Box lookup failed, hide its ceiling instead of silently
      // substituting TrueCap's canonical default.
      if (!persistedMaoTarget && !buyBoxesResolved) continue;
      try {
        const { offer, basisLabel } = computeDealOfferLine(values, activeBuyBoxes, {
          isShoppingStage: true,
          dealClientId: row.client_id ?? null,
          persistedMaoTarget,
        });
        // "blocked" carries no price by design — no dollar figure can fix a
        // wrong-market miss, so it must stay null rather than invent one.
        offerById.set(
          row.id,
          offer && offer.kind !== "blocked" ? offer.maxPrice ?? null : null
        );
        // The solver reports the basis it ACTUALLY used per row (a user can
        // hold a buy box that doesn't apply to a given deal). Re-deriving it
        // page-wide from "does this user own any buy box" credited their
        // criteria on rows solved against TrueCap's default bar.
        basisById.set(
          row.id,
          offer && offer.kind !== "blocked" ? offer.basis : null
        );
        basisLabelById.set(
          row.id,
          offer && offer.kind !== "blocked" ? basisLabel || null : null
        );
      } catch {
        // One unsolvable deal must never take down the dashboard.
      }
    }
    const withOffer = (deal: DashboardDeal) => ({
      ...deal,
      maxOffer: offerById.get(deal.id) ?? null,
      maxOfferBasis: basisById.get(deal.id) ?? null,
      maxOfferBasisLabel: basisLabelById.get(deal.id) ?? null,
    });
    dashboardData.allDeals = dashboardData.allDeals.map(withOffer);
    dashboardData.topDeals = dashboardData.topDeals.map(withOffer);
  }
  const ownBuyBoxes = boxesForDealClient(activeBuyBoxes, null);
  if (activeBuyBoxes.length > 0 && dashboardData.allDeals.length > 0) {
    const fitByDealId: Record<string, BuyBoxFitSummary> = {};
    let passingCount = 0;
    for (const deal of dashboardData.allDeals) {
      const metrics: BuyBoxDealMetrics = {
        capRatePct: deal.capRatePct,
        cocPct: deal.cocReturnPct,
        dscr: deal.dscr,
        cashFlowMonthly: deal.cashFlowMonthly,
        purchasePrice: deal.purchasePrice,
        propertyType: deal.propertyType,
        state: deriveStateFromAddress(deal.address),
        // calc-analysis canon: monthlyPayment <= 0 means a cash purchase, so
        // the DSCR criterion is skipped (N/A), never failed — same derivation
        // as getRiskReturn / getPortfolioKpis.
        isCashPurchase: deal.monthlyPayment != null && deal.monthlyPayment <= 0,
      };
      // The dashboard is the agent's OWN portfolio. Passing null scopes to
      // boxes with no client (lib/buy-box boxesForDealClient) — otherwise one
      // buyer's criteria drove the "N of M pass your buy box" headline for
      // every deal the agent owns.
      const results = evaluateBuyBoxes(ownBuyBoxes, metrics).filter((r) => r.result.active);
      if (results.length === 0) continue;
      const summary = summarizeBuyBoxFit(results);
      fitByDealId[deal.id] = summary;
      if (summary.anyPass) passingCount += 1;
    }
    if (Object.keys(fitByDealId).length > 0) {
      dashboardData.buyBox = {
        activeBoxCount: activeBuyBoxes.length,
        passingCount,
        evaluatedCount: dashboardData.allDeals.length,
        // The detailed query is capped at DASHBOARD_ACTIVE_DEALS_LIMIT; the
        // "X of your N deals" headline/tile only render when the evaluated
        // set IS the full active set (under the cap, or the unbounded
        // aggregate query confirms nothing was left out). Per-deal badges
        // and the Fit sort stay correct on the sample either way.
        complete:
          (rows ?? []).length < DASHBOARD_ACTIVE_DEALS_LIMIT ||
          (fullActiveRows != null && fullActiveRows.length <= dashboardData.allDeals.length),
        fitByDealId,
      };
      // PV-6: stable-boost passing deals into the top-6 slice so a deal that
      // meets the user's box but ranks #7 by generic score is never invisible
      // on the home page. Array.prototype.sort is stable, so equal-fit deals
      // keep their existing score-then-cash-flow order (allDeals is already
      // sorted by that comparator above).
      if (passingCount > 0) {
        dashboardData.topDeals = [...dashboardData.allDeals]
          .sort(
            (a, b) =>
              (fitByDealId[b.id]?.anyPass ? 1 : 0) - (fitByDealId[a.id]?.anyPass ? 1 : 0)
          )
          .slice(0, 6);
      }
    }
  }
  // Due-diligence deadlines for the "Due this week" card. Shape the RLS-scoped
  // query result into { id, address, items } per active deal; the client card
  // statuses each item in the viewer's local time and self-hides when nothing
  // is overdue/due-soon. On error (incl. the migration being unapplied) we log
  // and pass nothing — the card renders null, never a broken empty state.
  type DueDiligenceJoinRow = {
    analysis_id: string;
    items: unknown;
    // PostgREST returns the inner-joined to-one relation as an object, but
    // types it loosely — narrow to what we read (id + address label).
    saved_analyses: { id: string; address: string | null; title: string | null } | null;
  };
  if (dueDiligenceResult.error) {
    Sentry.captureMessage("dashboard due-diligence deadlines query failed — 'Due this week' card hidden", {
      level: "warning",
      tags: { feature: "dashboard-due-this-week" },
      extra: { code: dueDiligenceResult.error.code, message: dueDiligenceResult.error.message },
    });
  } else {
    const ddRows = (dueDiligenceResult.data ?? []) as unknown as DueDiligenceJoinRow[];
    dashboardData.dueThisWeek = ddRows.map((r) => ({
      id: r.saved_analyses?.id ?? r.analysis_id,
      address: r.saved_analyses?.address?.trim() || r.saved_analyses?.title?.trim() || "Untitled Property",
      items: r.items,
    }));
  }

  // Rate watch — re-underwrite saved deals at today's rate; the strip shows
  // only the ones whose signal changed (null = nothing to show, strip hides).
  // Fed from the UNBOUNDED aggregate rows so a 21+-deal user's deal #21 is
  // monitored too — the email cron scans ALL non-archived deals, and the strip
  // must never tell a different story ("Monitoring 20" while 23 are watched).
  // Falls back to the 20-row sample only if the aggregate query failed.
  dashboardData.rateWatch = buildRateWatch(
    fullActiveRows ??
      ((rows ?? []) as Array<{
        id: string;
        title: string | null;
        address: string | null;
        form_snapshot: unknown;
      }>),
    currentRate
  );
  // Truthful-alerts flag: the strip only promises alert EMAILS when the
  // send-rate-alerts cron is actually live (G1 fallback — see lib/rate-alerts-mode).
  dashboardData.alertsLive = rateAlertEmailsLive();

  // ── Owned portfolio (M3-1 / WOW-3) ────────────────────────────────────
  // Shape the completed-deals query into the home's owned strip + equity
  // chart. Recompute-on-read for cash flow (fresh engine, stored fallback);
  // equity derives from close_date + the deal's own saved assumptions via
  // the same computeRowEquity math My Deals uses. Deals without a close date
  // (or with the migration unapplied) count toward N but contribute nothing
  // to the equity figures — degrade, never crash.
  type OwnedRow = {
    id: string;
    is_completed: boolean | null;
    net_cash_flow_monthly: number | null;
    methodology_version?: string | null;
    result_snapshot?: Record<string, unknown> | null;
    form_snapshot: unknown;
    close_date?: string | null;
  };
  const isMissingColumn = (e: { code?: string; message?: string } | null | undefined) =>
    !!e && (e.code === "42703" || /column .* does not exist/i.test(e.message ?? ""));
  let ownedRows: OwnedRow[] | null = null;
  if (!ownedResult.error) {
    ownedRows = (ownedResult.data ?? []) as unknown as OwnedRow[];
  } else if (isMissingColumn(ownedResult.error)) {
    // close_date migration not applied yet → retry without the column so the
    // owned COUNT (and the false-header fix) still work; equity stays hidden.
    const fallback = await supabase
      .from("saved_analyses")
      .select("id, is_completed, net_cash_flow_monthly, methodology_version, result_snapshot, form_snapshot")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", true);
    if (!fallback.error) ownedRows = (fallback.data ?? []) as unknown as OwnedRow[];
  }
  if (ownedRows == null) {
    // Query failed outright → the owned section hides. Surface it (an owner
    // silently seeing "No saved deals yet" again is the exact M3-1 regression).
    Sentry.captureMessage("dashboard owned-portfolio query failed — owned section hidden", {
      level: "warning",
      tags: { feature: "dashboard-owned-portfolio" },
      extra: { code: ownedResult.error?.code, message: ownedResult.error?.message },
    });
  } else if (ownedRows.length > 0) {
    const now = new Date();
    let ownedCashFlow = 0;
    let totalEquity = 0;
    let equityGain = 0;
    let datedCount = 0;
    const equityBases: OwnedDealEquityBasis[] = [];
    for (const r of ownedRows) {
      const recomputed = recomputeSavedDealVerdict(r.form_snapshot);
      const resolution = resolveSavedAnalysisSnapshot({
        methodologyVersion: r.methodology_version,
        resultSnapshot: r.result_snapshot,
        recomputedSnapshot: recomputed
          ? toRecomputedSavedAnalysisSnapshot(recomputed)
          : undefined,
      });
      const fresh = resolution.didRecompute ? recomputed : null;
      const frozenCashFlow = Number(resolution.snapshot.netCashFlow);
      ownedCashFlow += fresh
        ? fresh.netCashFlowMonthly
        : Number.isFinite(frozenCashFlow)
          ? frozenCashFlow
          : (r.net_cash_flow_monthly ?? 0);
      const basis = resolution.shouldFreeze ? null : resolveOwnedEquityBasis(r);
      const summary = basis
        ? computeOwnedEquity(basis.input, monthsOwnedBetween(basis.closeDate, now))
        : null;
      if (basis && summary) {
        totalEquity += summary.equity;
        equityGain += summary.totalEquityGain;
        datedCount += 1;
        equityBases.push(basis);
      }
    }
    dashboardData.ownedPortfolio = {
      count: ownedRows.length,
      monthlyCashFlow: ownedCashFlow,
      totalEquity: datedCount > 0 ? totalEquity : null,
      equityGain: datedCount > 0 ? equityGain : null,
      datedCount,
      series: equityBases.length > 0 ? buildOwnedEquitySeries(equityBases, now) : null,
      // False when the close_date fallback fired (migration unapplied):
      // the "add close dates" CTA would dead-end on a My Deals page whose
      // date editor is hidden for the same reason.
      equityEnabled: !ownedResult.error,
    };
  }

  return (
    <DashboardHome
      data={dashboardData}
      canCompareDeals={hasPlanFeature(entitlements, "compare_deals")}
      leadsSlot={<DealLeadsCard />}
    />
  );
}
