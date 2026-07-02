/**
 * Per-deal workspace in the Pro dashboard: the due-diligence checklist +
 * documents for one saved deal. These were moved out of the analyzer's
 * underwrite output (analysis-dashboard) so the deal output stays focused on
 * the numbers, and live here in the dashboard instead. Reuses the same
 * self-contained cards (each fetches its own data given just the deal id).
 *
 * Guard mirrors /dashboard/saved-analyses exactly: signed in + dashboard
 * access + save_deal entitlement, else redirect. The deal is loaded
 * ownership-scoped (user_id + not deleted); missing / foreign → back to the
 * list (so it doubles as an ownership check, not just not-found).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { DueDiligenceCard } from "@/components/investcalc/due-diligence-card";
import { DealDocumentsCard } from "@/components/investcalc/deal-documents-card";
import { DealDetailsCard } from "@/components/investcalc/deal-details-card";
import { DealCommentsPanel } from "@/components/investcalc/deal-comments-panel";
import { ScenariosCard } from "@/components/investcalc/scenarios-card";
import { NextActionBanner } from "@/components/investcalc/next-action-banner";
import { DealAgingNudge } from "@/components/investcalc/deal-aging-nudge";
import { nextActionForDeal } from "@/lib/next-action";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type BuyBoxPropertyType,
} from "@/lib/buy-box";
import { isPipelineStage, DEFAULT_PIPELINE_STAGE } from "@/lib/pipeline";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Deal checklist & documents",
  robots: { index: false, follow: false },
};

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

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

export default async function DealWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [{ data: profile }, isPremium, { data: deal }, buyBoxesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
    supabase
      .from("saved_analyses")
      .select(
        "id, address, title, property_type, purchase_price, form_snapshot, result_snapshot, net_cash_flow_monthly, pipeline_stage, created_at"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle(),
    // Buy-box fit (PV-5): the same RLS-scoped user_buy_boxes read My Deals
    // uses (listBuyBoxesAction — canUse gate + MIGRATION_PENDING tolerance
    // built in). Any failure, missing table, or entitlement miss degrades to
    // "no boxes" → the banner behaves exactly as before. Never crash.
    listBuyBoxesAction().catch(() => null),
  ]);

  // Missing or not owned (the user_id filter makes this an ownership check) →
  // back to the list rather than a dead page.
  if (!deal) {
    redirect("/dashboard/saved-analyses");
  }

  const dealRow = deal as {
    id: string;
    address: string | null;
    title: string | null;
    property_type: string | null;
    purchase_price: number | null;
    form_snapshot: unknown;
    result_snapshot: Record<string, unknown> | null;
    net_cash_flow_monthly: number | null;
    pipeline_stage: string | null;
    created_at: string | null;
  };
  const heading = dealRow.address?.trim() || dealRow.title?.trim() || "Untitled property";

  // Recommended next step from the saved underwrite (cash flow + DSCR),
  // adjusted for where the deal sits in the pipeline (a closed deal is told
  // to track equity, not to make an offer).
  //
  // Recompute-on-read: derive the inputs from the CURRENT engine via the form
  // snapshot — the stored result_snapshot goes stale after engine corrections
  // (PMI, CapEx-taxable), so this banner could contradict the dashboard's
  // recomputed "cash-flow negative" warning that deep-links here. Falls back
  // to the stored snapshot for legacy forms that don't validate (exact same
  // pattern as app/dashboard/saved-analyses/page.tsx mapSavedRow).
  const snap = dealRow.result_snapshot ?? {};
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  // null (criterion skipped) — NOT 0 (criterion failed) — for metrics the
  // legacy snapshot may simply not carry.
  const numOrNull = (v: unknown): number | null => (v == null ? null : num(v));
  const fresh = recomputeSavedDealVerdict(dealRow.form_snapshot);
  const netCashFlow = fresh
    ? fresh.netCashFlowMonthly
    : num(snap["netCashFlow"] ?? dealRow.net_cash_flow_monthly);
  const dscr = fresh ? fresh.dscr : snap["dscr"] != null ? num(snap["dscr"]) : null;
  const monthlyPayment = fresh ? fresh.monthlyPayment : num(snap["monthlyPayment"]);

  // Buy-box fit (PV-5): evaluate the user's active boxes against the SAME
  // recomputed-with-stored-fallback numbers the banner uses, server-side
  // (pure, no IO). null when the user has no usable box — the banner and the
  // personal line then behave exactly as before.
  const activeBuyBoxes =
    buyBoxesResult && buyBoxesResult.ok && buyBoxesResult.canUse
      ? buyBoxesResult.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b))
      : [];
  let buyBoxFit: BuyBoxFitSummary | null = null;
  // The fit's one personal, number-carrying line ("Biggest gap — Cap rate:
  // 5.2% vs ≥ 6.0% (0.8pp short)") from the box that decides the verdict:
  // the first passing box on a pass, else the highest-priority active box
  // (evaluateBuyBoxes returns default-first). Null when no numeric
  // criterion applied.
  let buyBoxPersonalLine: string | null = null;
  if (activeBuyBoxes.length > 0) {
    const propertyType: BuyBoxPropertyType | null =
      dealRow.property_type === "single-family" ||
      dealRow.property_type === "multi-family" ||
      dealRow.property_type === "owner-occupant"
        ? dealRow.property_type
        : null;
    const metrics: BuyBoxDealMetrics = {
      capRatePct: fresh ? fresh.capRatePct : numOrNull(snap["capRate"]),
      cocPct: fresh ? fresh.cocReturnPct : numOrNull(snap["cocReturn"]),
      dscr,
      cashFlowMonthly: netCashFlow,
      purchasePrice: dealRow.purchase_price != null ? num(dealRow.purchase_price) : numOrNull(snap["purchasePrice"]),
      propertyType,
      state: deriveStateFromAddress(dealRow.address),
      // calc-analysis canon: monthlyPayment <= 0 means a cash purchase, so
      // the DSCR criterion is skipped (N/A), never failed.
      isCashPurchase: fresh ? fresh.isCashPurchase : monthlyPayment <= 0,
    };
    const boxResults = evaluateBuyBoxes(activeBuyBoxes, metrics).filter((r) => r.result.active);
    if (boxResults.length > 0) {
      buyBoxFit = summarizeBuyBoxFit(boxResults);
      const leadResult = boxResults.find((r) => r.result.passes) ?? boxResults[0];
      buyBoxPersonalLine = leadResult?.result.personalLine ?? null;
    }
  }

  const nextAction = nextActionForDeal({
    netCashFlow,
    dscr,
    monthlyPayment,
    meetsBuyBox: buyBoxFit ? buyBoxFit.anyPass : null,
    stage: isPipelineStage(dealRow.pipeline_stage) ? dealRow.pipeline_stage : undefined,
  });

  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <Topbar
        displayName={displayName}
        email={user.email ?? ""}
        initials={initials}
        avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
        isPremium={isPremium}
        canAccessDashboard={navAccess.dashboard}
      />
      <div className="flex-1">
        <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
          <div className="min-w-0">
            <Link
              href="/dashboard/saved-analyses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              My Deals
            </Link>
            <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {heading}
            </h1>
            <p className="text-xs text-muted-foreground">
              Due-diligence checklist &amp; documents for this deal. Your analysis stays in the deal view.
            </p>
          </div>

          <div>
            <NextActionBanner action={nextAction} />
            {buyBoxPersonalLine ? (
              // The one personal line from the user's own buy box — muted,
              // directly under the advice it contextualizes (PV-5).
              <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                Your buy box · {buyBoxPersonalLine}
              </p>
            ) : null}
          </div>
          <DealAgingNudge
            dealId={dealRow.id}
            stage={isPipelineStage(dealRow.pipeline_stage) ? dealRow.pipeline_stage : DEFAULT_PIPELINE_STAGE}
            createdAt={dealRow.created_at}
            address={heading}
          />
          <DealDetailsCard savedDealId={dealRow.id} />
          <ScenariosCard savedDealId={dealRow.id} />
          <DueDiligenceCard savedDealId={dealRow.id} />
          <DealDocumentsCard savedDealId={dealRow.id} />
          <DealCommentsPanel savedDealId={dealRow.id} />
        </main>
      </div>
    </div>
  );
}
