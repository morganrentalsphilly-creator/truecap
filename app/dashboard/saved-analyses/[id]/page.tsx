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
import { ArrowLeft, Target } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { DueDiligenceCard } from "@/components/investcalc/due-diligence-card";
import { DealDocumentsCard } from "@/components/investcalc/deal-documents-card";
import { DealDetailsCard } from "@/components/investcalc/deal-details-card";
import { DealCommentsPanel } from "@/components/investcalc/deal-comments-panel";
import { DealNotesPanel } from "@/components/investcalc/deal-notes-panel";
import { ScenariosCard } from "@/components/investcalc/scenarios-card";
import { NextActionBanner } from "@/components/investcalc/next-action-banner";
import { DealAgingNudge } from "@/components/investcalc/deal-aging-nudge";
import { DealStageSelect } from "@/components/investcalc/deal-stage-select";
import { DealClientSelect } from "@/components/investcalc/deal-client-select";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import { listAgentClientsAction } from "@/app/actions/agent-clients";
import {
  OpenFullAnalysisButton,
  ReunderwriteAsScenarioButton,
} from "@/components/investcalc/open-saved-deal-in-analyzer";
import { RefreshOnReturn } from "@/components/investcalc/refresh-on-return";
import { DealWorkspaceAnchorChips } from "@/components/investcalc/deal-workspace-anchor-chips";
import { OwnedEquityCard } from "@/components/investcalc/owned-equity-card";
import { CompareWithAnotherDealLink } from "@/components/dashboard/compare-with-another-deal-link";
import { RateAlertReUnderwriteBanner } from "@/components/investcalc/rate-alert-reunderwrite-banner";
import { SavedDealWatchCard } from "@/components/investcalc/saved-deal-watch-card";
import { buildRateReUnderwrite, parseRateAlertRateParam } from "@/lib/rate-alerts";
import { nextActionForDeal } from "@/lib/next-action";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { computeDealOfferLine, type DealOfferLine } from "@/lib/deal-offer-line";
import { recordedDealOfferLine } from "@/lib/recorded-offer-ceiling";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
} from "@/lib/underwriting-model-release";
import type { OwnedEquitySummary } from "@/lib/owned-equity";
import { computeRowEquity } from "@/lib/owned-equity-series";
import type { DealRecommendation } from "@/lib/deal-score";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  boxesForDealClient,
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type BuyBoxPropertyType,
} from "@/lib/buy-box";
import { isActiveStage, isPipelineStage, DEFAULT_PIPELINE_STAGE } from "@/lib/pipeline";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import {
  isLegacySavedMethodologyVersion,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Verdict } from "@/components/investcalc/verdict";

export const metadata: Metadata = {
  title: "Deal workspace",
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

const RECOMMENDATION_TIERS: readonly DealRecommendation[] = [
  "Strong Buy",
  "Buy",
  "Neutral",
  "Risky",
  "Avoid",
];

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCashFlow(n: number): string {
  const cur = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${cur}/mo`;
}

/** One label+value pair in the compact underwrite strip. */
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-[var(--metric-negative)]"
        : "text-foreground";
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </span>
  );
}

const DEAL_SELECT =
  "id, address, title, property_type, purchase_price, form_snapshot, result_snapshot, methodology_version, net_cash_flow_monthly, pipeline_stage, is_completed, created_at";

/**
 * Load the deal with the optional investor nickname (labels migration) and the
 * owned-deal close_date (its own migration), tolerating either column not
 * existing yet: a 42703 retries with fewer columns and flags the owned-equity
 * surfaces off — same tiered-select pattern (most → least columns) as the My
 * Deals list. RLS + the user_id filter scope the read to the owner.
 */
async function fetchDeal(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  id: string,
  userId: string
): Promise<{ data: unknown; ownedEquityEnabled: boolean }> {
  const run = (select: string) =>
    supabase
      .from("saved_analyses")
      .select(select)
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
  const isMissingColumn = (error: { code?: string; message?: string } | null) =>
    !!error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""));

  const WITH_LABELS_SELECT = `${DEAL_SELECT}, nickname`;
  // client_id ships in the NEWEST migration (20260811120000, Agent Pro), so it
  // is the first column dropped. It must never live in DEAL_SELECT: that is
  // this ladder's floor, and a deployment without the Agent Pro migration would
  // fail EVERY rung — 500ing the deal workspace for every user, not just agents.
  const full = await run(`${WITH_LABELS_SELECT}, close_date, client_id`);
  if (!isMissingColumn(full.error)) return { data: full.data, ownedEquityEnabled: true };
  // client_id missing → retry the same columns without it. agentClients is
  // already empty on such a deployment, so the picker stays hidden anyway.
  const fullNoClient = await run(`${WITH_LABELS_SELECT}, close_date`);
  if (!isMissingColumn(fullNoClient.error)) return { data: fullNoClient.data, ownedEquityEnabled: true };
  // T2 succeeding pins T1's 42703 on close_date (equity stays off). T2
  // failing means NICKNAME is the missing one — close_date may still exist
  // (migrations applied out of order), so probe it alone before giving up
  // on equity: the workspace tracked equity before nickname joined this
  // select and must keep doing so.
  const withLabels = await run(WITH_LABELS_SELECT);
  if (!isMissingColumn(withLabels.error)) return { data: withLabels.data, ownedEquityEnabled: false };
  const withCloseOnly = await run(`${DEAL_SELECT}, close_date`);
  if (!isMissingColumn(withCloseOnly.error)) {
    return { data: withCloseOnly.data, ownedEquityEnabled: true };
  }
  const base = await run(DEAL_SELECT);
  return { data: base.data, ownedEquityEnabled: false };
}

export default async function DealWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  // Rate-alert deep link (?rate= on each email deal card): validated here,
  // consumed below to render the re-underwrite banner. Invalid or
  // out-of-bounds values are ignored silently — the page renders as normal.
  const alertRatePct = parseRateAlertRateParam((await searchParams).rate);
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    // Preserve the destination — rate-alert email links land here logged
    // out, and without ?next the validated ?rate= param (the whole point
    // of the click) would be dropped at the login wall. login-form.tsx
    // already honors same-origin ?next.
    const dest = `/dashboard/saved-analyses/${id}${
      alertRatePct != null ? `?rate=${alertRatePct}&src=rate-alert` : ""
    }`;
    redirect(`/auth/login?next=${encodeURIComponent(dest)}`);
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "save_deal")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, isPremium, { data: deal, ownedEquityEnabled }, buyBoxesResult, activeDealsCountResult] =
    await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
    fetchDeal(supabase, id, user.id),
    // Buy-box fit (PV-5): the same RLS-scoped user_buy_boxes read My Deals
    // uses (listBuyBoxesAction — canUse gate + MIGRATION_PENDING tolerance
    // built in). Any failure, missing table, or entitlement miss degrades to
    // "no boxes" → the banner behaves exactly as before. Never crash.
    listBuyBoxesAction().catch(() => null),
    // Active-deal HEAD count for the "Compare with another deal" header link —
    // same active scope as compare itself (startCompareAction validates
    // against it). Below 2 active deals the link renders nothing (invisible
    // until useful); an error degrades the count to 0 → link hidden.
    supabase
      .from("saved_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false),
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
    methodology_version: string | null;
    net_cash_flow_monthly: number | null;
    pipeline_stage: string | null;
    client_id?: string | null;
    is_completed: boolean | null;
    created_at: string | null;
    /** Investor nickname — absent until the labels migration is applied. */
    nickname?: string | null;
    /** Owned-deal close date — absent until its migration is applied. */
    close_date?: string | null;
  };
  // A crafted/preexisting internal model snapshot is not a released deal
  // workspace. Block before any recorded-result fallback or action controls.
  if (!isReleasedUnderwritingSnapshot(dealRow.form_snapshot)) {
    redirect("/dashboard/saved-analyses");
  }
  // Nickname leads (same convention as My Deals rows); the address drops to a
  // secondary line under the h1 so the property is still identifiable.
  const nickname = typeof dealRow.nickname === "string" && dealRow.nickname.trim() ? dealRow.nickname.trim() : null;
  const addressLabel = dealRow.address?.trim() || dealRow.title?.trim() || "Untitled property";
  const heading = nickname ?? addressLabel;
  const stage = isPipelineStage(dealRow.pipeline_stage) ? dealRow.pipeline_stage : null;
  // Lifecycle has two dimensions: pipeline_stage (Pro pipeline plans) and
  // is_completed (the plain Status select syncs only this flag, never stage).
  // Treat a status-completed deal exactly like stage === "closed" so this
  // page agrees with the My Deals row for the same deal.
  const isClosedDeal = stage === "closed" || dealRow.is_completed === true;
  const canUsePipeline = hasPlanFeature(entitlements, "pipeline");
  const canUseClientWorkflow = hasPlanFeature(entitlements, "client_buy_box");
  // Agent Pro roster for the "For client" control. Skipped (and failure-safe)
  // for every other tier, which leaves the control hidden.
  const agentClients = canUseClientWorkflow
    ? await listAgentClientsAction()
        .then((r) => (r.ok ? r.clients.filter((c) => !c.isArchived).map((c) => ({ id: c.id, name: c.name })) : []))
        .catch(() => [])
    : [];
  // Workspace → Compare cross-link: only when comparing can actually work —
  // compare entitlement, ≥2 active deals to line up, and THIS deal still
  // active (startCompareAction validates active-only, so a closed/passed
  // deal would just error). Count errors degrade to null → link hidden.
  const activeDealsCount = activeDealsCountResult.error ? null : activeDealsCountResult.count;
  const showCompareLink =
    hasPlanFeature(entitlements, "compare_deals") &&
    !isClosedDeal &&
    isActiveStage(stage ?? DEFAULT_PIPELINE_STAGE) &&
    (activeDealsCount ?? 0) >= 2;

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
  const recomputed = recomputeSavedDealVerdict(dealRow.form_snapshot);
  const methodologyResolution = resolveSavedAnalysisSnapshot({
    methodologyVersion: dealRow.methodology_version,
    resultSnapshot: dealRow.result_snapshot,
    recomputedSnapshot: recomputed
      ? toRecomputedSavedAnalysisSnapshot(recomputed)
      : undefined,
  });
  const snap = methodologyResolution.snapshot;
  const storedMethodologyVersion = methodologyResolution.storedMethodologyVersion;
  const isFrozenMethodologySnapshot = methodologyResolution.shouldFreeze;
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  // null (criterion skipped) — NOT 0 (criterion failed) — for metrics the
  // legacy snapshot may simply not carry.
  const numOrNull = (v: unknown): number | null => (v == null ? null : num(v));
  // A saved analysis is recorded history even when its public methodology
  // version matches the running app. Only explicitly unpinned legacy rows use
  // the clearly labeled compatibility recompute.
  const fresh = methodologyResolution.didRecompute ? recomputed : null;
  const netCashFlow = fresh
    ? fresh.netCashFlowMonthly
    : num(snap["netCashFlow"] ?? dealRow.net_cash_flow_monthly);
  const dscr = fresh ? fresh.dscr : snap["dscr"] != null ? num(snap["dscr"]) : null;
  const monthlyPayment = fresh ? fresh.monthlyPayment : num(snap["monthlyPayment"]);
  // calc-analysis canon: monthlyPayment <= 0 means a cash purchase (DSCR is
  // N/A, never failed). One derivation, shared by the buy-box metrics and the
  // Offer Ceiling target below.
  const isCashPurchase = fresh ? fresh.isCashPurchase : monthlyPayment <= 0;
  // Current-engine form values — reused by the max-offer solver and the
  // owned-equity estimate. Null for legacy snapshots that don't validate.
  const formValues = isFrozenMethodologySnapshot
    ? null
    : normalizeReleasedInvestmentFormSnapshot(dealRow.form_snapshot);

  // Rate-alert deep link: re-underwrite at the alert's rate (pure preview —
  // the saved deal is NOT mutated by opening the link; the banner's one
  // action applies it through the existing saveDealAction update path).
  // Null — and the banner absent — for cash purchases, legacy snapshots, or
  // when the saved rate already matches the alert's.
  const rateReUnderwrite =
    alertRatePct != null && formValues ? buildRateReUnderwrite(formValues, alertRatePct) : null;

  // Compact underwrite header (DEC-1/WS-1) — same recompute-with-stored-
  // fallback numbers the banner uses. Metrics a legacy snapshot doesn't carry
  // stay null and their tile is OMITTED (never rendered as $0/0.00).
  const cocPct = fresh ? fresh.cocReturnPct : numOrNull(snap["cocReturn"]);
  const dealScore = fresh ? fresh.score : numOrNull(snap["score"]);
  const recommendation: DealRecommendation | null = fresh
    ? fresh.recommendation
    : typeof snap["recommendation"] === "string" &&
        (RECOMMENDATION_TIERS as readonly string[]).includes(snap["recommendation"])
      ? (snap["recommendation"] as DealRecommendation)
      : null;
  // Mirrors the My Deals DSCR column: "Cash" keys off the explicit cash flag
  // (a financed deal with negative NOI has a real DSCR ≤ 0 to show); null
  // (legacy snapshot without dscr) still omits the tile rather than trusting
  // a derived cash flag from an incomplete snapshot.
  const dscrDisplay = dscr == null ? null : isCashPurchase ? "Cash" : dscr.toFixed(2);

  // Owned equity (M3-2/WOW-4) — closed/completed deals only. ONE definition of
  // owned equity everywhere: the shared computeRowEquity (lib/owned-equity-
  // series) that My Deals and the dashboard home use. isClosedDeal covers both
  // lifecycle dimensions (stage === "closed" OR is_completed) so a deal marked
  // Completed via the Status select gets the same card the list row shows.
  // Null when the legacy snapshot doesn't validate or the date is malformed —
  // the card still renders the close date, just without an equity figure.
  const closeDate =
    ownedEquityEnabled && typeof dealRow.close_date === "string" ? dealRow.close_date : null;
  const ownedEquity: OwnedEquitySummary | null =
    isClosedDeal && closeDate && !isFrozenMethodologySnapshot
      ? computeRowEquity({
          is_completed: true,
          close_date: closeDate,
          form_snapshot: dealRow.form_snapshot,
        })
      : null;

  // Buy-box fit (PV-5): evaluate the user's active boxes against the SAME
  // recomputed-with-stored-fallback numbers the banner uses, server-side
  // (pure, no IO). null when the user has no usable box — the banner and the
  // personal line then behave exactly as before.
  const activeBuyBoxes =
    buyBoxesResult && buyBoxesResult.ok && buyBoxesResult.canUse
      ? boxesForDealClient(
          buyBoxesResult.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b)),
          // Scope to THIS deal's client — a box belonging to another buyer must
          // not drive this deal's fit, personal line, or Offer Ceiling basis.
          dealRow.client_id ?? null
        )
      : [];
  const buyBoxesResolved = Boolean(buyBoxesResult?.ok);
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
      cocPct,
      dscr,
      cashFlowMonthly: netCashFlow,
      purchasePrice: dealRow.purchase_price != null ? num(dealRow.purchase_price) : numOrNull(snap["purchasePrice"]),
      propertyType,
      state: deriveStateFromAddress(dealRow.address),
      // calc-analysis canon: monthlyPayment <= 0 means a cash purchase, so
      // the DSCR criterion is skipped (N/A), never failed.
      isCashPurchase,
    };
    const boxResults = evaluateBuyBoxes(activeBuyBoxes, metrics).filter((r) => r.result.active);
    if (boxResults.length > 0) {
      buyBoxFit = summarizeBuyBoxFit(boxResults);
      const leadResult = boxResults.find((r) => r.result.passes) ?? boxResults[0];
      buyBoxPersonalLine = leadResult?.result.personalLine ?? null;
    }
  }

  // Offer Ceiling (DEC-2): the verdict → offer-number path. Solve the
  // highest price that still clears the user's targets (buy-box thresholds
  // when set, else break-even cash flow + DSCR 1.25 — see lib/mao-targets)
  // from the SAME current-engine form snapshot everything above recomputes
  // from. Server-side and pure; solver failure or a legacy snapshot simply
  // hides the line. Shopping stages only — a closed, completed, or passed
  // deal has no offer left to make (a status-completed deal keeps stage null,
  // so the stage check alone would show shopping advice on an owned deal).
  let maoLine: DealOfferLine | null = null;
  let maoBasisLabel = "";
  const rawStoredMaoTarget = normalizeMaoTarget(dealRow.result_snapshot?.maxOfferTarget);
  const storedMaoTargetSource =
    normalizeOfferCeilingTargetSource(
      dealRow.result_snapshot?.maxOfferTargetSource
    ) ?? "selected-targets";
  const financingSafeStoredMaoTarget =
    rawStoredMaoTarget && isCashPurchase
      ? normalizeMaoTarget({ ...rawStoredMaoTarget, dscr: undefined })
      : rawStoredMaoTarget;
  const storedMaoTarget = isAdoptedOfferCeilingTargetSource(
    storedMaoTargetSource
  )
    ? financingSafeStoredMaoTarget
    : null;
  let shareMaoTarget = storedMaoTarget;
  let shareMaoTargetSource: OfferCeilingTargetSource | undefined =
    storedMaoTarget ? storedMaoTargetSource : undefined;
  const isShoppingStage =
    !isClosedDeal && (stage == null || isActiveStage(stage));
  if (isPremium && methodologyResolution.usesRecordedSnapshot) {
    const recorded = recordedDealOfferLine({
      snapshot: dealRow.result_snapshot,
      isShoppingStage,
    });
    if (recorded) {
      maoLine = recorded.offer;
      maoBasisLabel = recorded.basisLabel;
    }
  } else if (
    isPremium &&
    formValues &&
    isShoppingStage &&
    (storedMaoTarget != null || buyBoxesResolved)
  ) {
    const offerResolution = computeDealOfferLine(formValues, activeBuyBoxes, {
      isShoppingStage: true,
      dealClientId: dealRow.client_id ?? null,
      persistedMaoTarget: storedMaoTarget,
    });
    maoLine = offerResolution.offer;
    maoBasisLabel = offerResolution.basisLabel;
    shareMaoTarget = storedMaoTarget ?? offerResolution.resolvedMaoTarget;
    if (!storedMaoTarget && offerResolution.resolvedMaoTarget) {
      shareMaoTargetSource =
        offerResolution.offer &&
        "basis" in offerResolution.offer &&
        offerResolution.offer.basis === "buy-box"
          ? "buy-box"
          : "screening-defaults";
    }
  }

  const nextAction = nextActionForDeal({
    netCashFlow,
    dscr,
    monthlyPayment,
    meetsBuyBox: buyBoxFit ? buyBoxFit.anyPass : null,
    // Status-completed deals get the closed-stage advice (track equity), not
    // shopping-stage advice — same lifecycle merge as the equity card below.
    stage: isClosedDeal ? "closed" : (stage ?? undefined),
    // With a close date recorded the banner stops instructing the user to
    // add one directly above the equity card that already shows it.
    hasCloseDate: closeDate != null,
  });

  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* "Open full analysis" edits happen in another tab — re-fetch the
          workspace header when the user tabs back so it shows the just-saved
          underwrite. */}
      <RefreshOnReturn />
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
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
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
                {nickname ? (
                  <p className="truncate text-xs text-muted-foreground">{addressLabel}</p>
                ) : null}
                {canUseClientWorkflow ? (
                  <p className="text-xs text-muted-foreground">
                    Analysis → Client Report → Follow-Up → Offer: assign the buyer, share the report,
                    capture follow-up in Notes, then move the stage when the offer is submitted.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Everything for this deal — checklist, documents, notes &amp; scenarios.
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {!isLegacySavedMethodologyVersion(storedMethodologyVersion) ? (
                    <>
                      TrueCap Underwriting Standard v{storedMethodologyVersion}
                      {storedMethodologyVersion !== TRUECAP_UNDERWRITING_STANDARD_VERSION
                        ? ` · frozen snapshot; current standard is v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
                        : methodologyResolution.usesRecordedSnapshot
                          ? " · recorded result"
                          : ""}
                    </>
                  ) : (
                    <>
                      {methodologyResolution.didRecompute
                        ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
                        : `Legacy analysis · stored snapshot (current v${TRUECAP_UNDERWRITING_STANDARD_VERSION} recompute unavailable)`}
                    </>
                  )}{" "}
                  ·{" "}
                  <Link href="/methodology" className="font-semibold text-primary hover:underline">
                    methodology
                  </Link>
                </p>
              </div>
              {/* WRAPS, and its children may shrink.
                  This row was `shrink-0` around two fixed-width selects
                  (w-[150px] + w-[170px]) plus two buttons — ~554px of
                  un-shrinkable content for an Agent Pro user. The page shell is
                  overflow-x-clip (dashboard-shell.tsx) and globals.css clips
                  html/body too, so the excess was not scrollable, it was simply
                  CUT: on every phone width the primary "Open full analysis"
                  action sat off-screen with no scrollbar and no error.
                  flex-wrap on the PARENT could not help — wrapping moves a
                  shrink-0 item to its own line, it never narrows it. */}
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 pt-0.5">
                {/* Stage changes happen while the user is IN the workspace
                    (WS-2) — same write path + entitlement gate as My Deals. */}
                {canUsePipeline ? (
                  <DealStageSelect
                    savedDealId={dealRow.id}
                    stage={stage ?? DEFAULT_PIPELINE_STAGE}
                  />
                ) : null}
                {/* Agent Pro: assign this deal to a buyer right here — the
                    screen where the agent decides it fits. Self-hides when the
                    roster is empty (i.e. every non-Agent-Pro user). */}
                <DealClientSelect
                  savedDealId={dealRow.id}
                  clients={agentClients}
                  clientId={dealRow.client_id ?? null}
                />
                {formValues ? (
                  <ShareLinkButton
                    values={formValues}
                    isAuthenticated={true}
                    savedDealId={dealRow.id}
                    maoTarget={shareMaoTarget}
                    maoTargetSource={shareMaoTargetSource}
                    context={
                      canUseClientWorkflow && dealRow.client_id
                        ? "client-report"
                        : "analysis"
                    }
                  />
                ) : null}
                <OpenFullAnalysisButton savedDealId={dealRow.id} />
                {methodologyResolution.usesRecordedSnapshot ? (
                  <ReunderwriteAsScenarioButton savedDealId={dealRow.id} />
                ) : null}
              </div>
            </div>
            {/* Compact underwrite strip (DEC-1/WS-1): the numbers the dashboard
                deep-linked about, from the same recompute the banner uses.
                Tiles a legacy snapshot doesn't carry are omitted entirely. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* Was `{recommendation}` raw — the same deal read "Avoid" here
                  and "Pass" in the My Deals list one click away. */}
              {recommendation ? <Verdict recommendation={recommendation} /> : null}
              <Metric
                label="Cash flow"
                value={fmtCashFlow(netCashFlow)}
                tone={netCashFlow >= 0 ? "positive" : "negative"}
              />
              {cocPct != null ? <Metric label="CoC" value={`${cocPct.toFixed(1)}%`} /> : null}
              {dscrDisplay ? <Metric label="DSCR" value={dscrDisplay} /> : null}
              {dealScore != null ? (
                <Metric label="Screening Index" value={`${Math.round(dealScore)}/100`} />
              ) : null}
            </div>
            {/* Cross-deal compare, at the "is this one better than my
                others?" moment. Seeds the compare cookie with this deal and
                lands on /dashboard/compare; hidden below 2 active deals /
                without the entitlement / on closed-passed deals. */}
            {showCompareLink ? (
              <div className="mt-2">
                <CompareWithAnotherDealLink savedDealId={dealRow.id} />
              </div>
            ) : null}
            {/* Contents scent (WS-3): the cards below start under the fold with
                no hint they exist — one compact chip row jumps to each. */}
            <DealWorkspaceAnchorChips />
          </div>

          {/* Rate-alert deep link (?rate=): the deal re-underwritten at the
              alert's rate, above the fold — this is what the email promised.
              Shows only while the param is present (implicit dismiss). */}
          {rateReUnderwrite && formValues ? (
            <RateAlertReUnderwriteBanner
              savedDealId={dealRow.id}
              values={formValues}
              savedRatePct={rateReUnderwrite.savedRatePct}
              alertRatePct={rateReUnderwrite.alertRatePct}
              before={rateReUnderwrite.before}
              after={rateReUnderwrite.after}
            />
          ) : null}

          <div>
            <NextActionBanner
              action={nextAction}
              // The closed-stage instruction ("add a close date") is doable in
              // place: jump to the owned-equity card below (M3-2/WOW-4). Only
              // offered while there's still a date to add and the close_date
              // migration is live.
              cta={
                isClosedDeal && ownedEquityEnabled && !closeDate
                  ? { label: "Add close date", href: "#owned-equity" }
                  : undefined
              }
            />
            {buyBoxPersonalLine ? (
              // The one personal line from the user's own buy box — muted,
              // directly under the advice it contextualizes (PV-5).
              <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                Your buy box · {buyBoxPersonalLine}
              </p>
            ) : null}
            {/* Offer Ceiling line (DEC-2): "lower your offer" becomes an
                executable number, right beside the advice. The basis is
                labeled inline (CONFLICT #6) so this never reads as a second,
                unexplained "your max" vs the analyzer's Offer Ceiling surfaces. */}
            {maoLine ? (
              <div className="mt-2 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <Target aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Offer Ceiling
                  </div>
                  {maoLine.kind === "blocked" ? (
                    <div className="text-sm font-bold text-foreground">
                      Price cannot fix this
                      {maoLine.reasons.length > 0 ? (
                        <span className="font-medium text-muted-foreground">
                          {" "}— misses on {maoLine.reasons.join(" and ")}
                        </span>
                      ) : null}
                    </div>
                  ) : maoLine.kind === "clears" ? (
                    <>
                      <div className="text-sm font-bold text-foreground">
                        Asking is at or below the Offer Ceiling
                      </div>
                      {maoLine.maxPrice != null ? (
                        <div className="text-xs text-muted-foreground">
                          Highest modeled price that meets the captured targets:{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {fmtMoney(maoLine.maxPrice)}
                          </span>{" "}
                          under the assumptions shown.
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm font-bold text-foreground">
                      Ceiling ≤{" "}
                      <span className="tabular-nums">{fmtMoney(maoLine.maxPrice)}</span>
                      {maoLine.asking != null ? (
                        <span className="font-medium text-muted-foreground">
                          {" "}
                          (asking {fmtMoney(maoLine.asking)}
                          {maoLine.discountPct != null && maoLine.discountPct > 0
                            ? `, −${maoLine.discountPct}%`
                            : ""}
                          )
                        </span>
                      ) : null}
                    </div>
                  )}
                  {maoLine.kind !== "blocked" ? (
                    <>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Targets: {maoBasisLabel}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Highest modeled price that still meets {maoBasisLabel} under the assumptions shown. This is not a recommended offer or appraisal.
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {/* Owned equity (M3-2/WOW-4): closed/completed deals capture their
              close date and see the equity estimate on the page that told them
              to. Hidden until the close_date migration is applied. */}
          {isClosedDeal && ownedEquityEnabled ? (
            <OwnedEquityCard savedDealId={dealRow.id} closeDate={closeDate} equity={ownedEquity} />
          ) : null}
          <DealAgingNudge
            dealId={dealRow.id}
            stage={stage ?? DEFAULT_PIPELINE_STAGE}
            createdAt={dealRow.created_at}
            address={heading}
          />
          {/* Dormant Saved Deal Watch setup. Both this server render and all
              actions fail closed behind the flag. The card persists explicit
              opt-in while truthfully stating that no provider, polling, or
              delivery is active. */}
          {isFeatureEnabled("saved_deal_watch") && isPremium ? (
            <SavedDealWatchCard savedDealId={dealRow.id} />
          ) : null}
          <DealDetailsCard savedDealId={dealRow.id} />
          {/* Anchor targets for the header's contents chips. scroll-mt clears
              the fixed/sticky Topbar (h-16), same as the analyzer's drill rows. */}
          <div id="deal-scenarios" className="scroll-mt-24">
            <ScenariosCard savedDealId={dealRow.id} />
          </div>
          <div id="deal-due-diligence" className="scroll-mt-24">
            <DueDiligenceCard savedDealId={dealRow.id} />
          </div>
          <div id="deal-documents" className="scroll-mt-24">
            <DealDocumentsCard savedDealId={dealRow.id} />
          </div>
          {/* Notes + comments side by side (WS-4): the free-text deal file no
              longer lives only in the analyzer view. Same blob, saves on blur,
              last-write-wins with the analyzer copy. */}
          <div id="deal-notes" className="scroll-mt-24">
            <DealNotesPanel savedDealId={dealRow.id} />
          </div>
          <div id="deal-comments" className="scroll-mt-24">
            <DealCommentsPanel savedDealId={dealRow.id} />
          </div>
        </main>
      </div>
    </div>
  );
}
