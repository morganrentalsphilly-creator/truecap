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
import { OpenFullAnalysisButton } from "@/components/investcalc/open-saved-deal-in-analyzer";
import { DealWorkspaceAnchorChips } from "@/components/investcalc/deal-workspace-anchor-chips";
import { OwnedEquityCard } from "@/components/investcalc/owned-equity-card";
import { nextActionForDeal } from "@/lib/next-action";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { calculateMaxAllowableOffer, meetsTarget } from "@/lib/max-allowable-offer";
import {
  buildMaoTarget,
  buyBoxContributesToMaoTarget,
  buyBoxHasReturnTargets,
  describeMaoTarget,
} from "@/lib/mao-targets";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import type { OwnedEquitySummary } from "@/lib/owned-equity";
import { computeRowEquity } from "@/lib/owned-equity-series";
import type { DealRecommendation } from "@/lib/deal-score";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type BuyBoxPropertyType,
  type NamedBuyBox,
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

/** Same tone mapping My Deals' verdict badge uses (getSignalClasses). */
function verdictBadgeClasses(rec: DealRecommendation): string {
  if (rec === "Strong Buy") return "bg-success/10 text-success border-success/30";
  if (rec === "Buy") return "bg-primary/10 text-primary border-primary/30";
  if (rec === "Neutral" || rec === "Risky") return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

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
  "id, address, title, property_type, purchase_price, form_snapshot, result_snapshot, net_cash_flow_monthly, pipeline_stage, created_at";

/**
 * Load the deal with the owned-deal close_date, tolerating the column not
 * existing yet (it ships in its own migration): a 42703 retries without it
 * and flags the owned-equity surfaces off — same tiered-select pattern as
 * the My Deals list. RLS + the user_id filter scope the read to the owner.
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

  const withClose = await run(`${DEAL_SELECT}, close_date`);
  const missingColumn =
    !!withClose.error &&
    (withClose.error.code === "42703" ||
      /column .* does not exist/i.test(withClose.error.message ?? ""));
  if (!missingColumn) return { data: withClose.data, ownedEquityEnabled: true };
  const base = await run(DEAL_SELECT);
  return { data: base.data, ownedEquityEnabled: false };
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

  const [{ data: profile }, isPremium, { data: deal, ownedEquityEnabled }, buyBoxesResult] =
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
    /** Owned-deal close date — absent until its migration is applied. */
    close_date?: string | null;
  };
  const heading = dealRow.address?.trim() || dealRow.title?.trim() || "Untitled property";
  const stage = isPipelineStage(dealRow.pipeline_stage) ? dealRow.pipeline_stage : null;
  const canUsePipeline = hasPlanFeature(entitlements, "pipeline");

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
  // calc-analysis canon: monthlyPayment <= 0 means a cash purchase (DSCR is
  // N/A, never failed). One derivation, shared by the buy-box metrics and the
  // MAO target below.
  const isCashPurchase = fresh ? fresh.isCashPurchase : monthlyPayment <= 0;
  // Current-engine form values — reused by the max-offer solver and the
  // owned-equity estimate. Null for legacy snapshots that don't validate.
  const formValues = normalizeInvestmentFormSnapshot(dealRow.form_snapshot);

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
  // Mirrors the My Deals DSCR column: <= 0 means a cash purchase (N/A, shown
  // as "Cash"); null (legacy snapshot without dscr) omits the tile.
  const dscrDisplay = dscr == null ? null : dscr <= 0 ? "Cash" : dscr.toFixed(2);

  // Owned equity (M3-2/WOW-4) — closed deals only. ONE definition of owned
  // equity everywhere: the shared computeRowEquity (lib/owned-equity-series)
  // that My Deals and the dashboard home use. The workspace's closed-stage
  // gate stands in for is_completed (this page keys on pipeline_stage, and
  // the old inline derivation never checked the flag either). Null when the
  // legacy snapshot doesn't validate or the date is malformed — the card
  // still renders the close date, just without an equity figure.
  const closeDate =
    ownedEquityEnabled && typeof dealRow.close_date === "string" ? dealRow.close_date : null;
  const ownedEquity: OwnedEquitySummary | null =
    stage === "closed" && closeDate
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
      ? buyBoxesResult.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b))
      : [];
  let buyBoxFit: BuyBoxFitSummary | null = null;
  // The fit's one personal, number-carrying line ("Biggest gap — Cap rate:
  // 5.2% vs ≥ 6.0% (0.8pp short)") from the box that decides the verdict:
  // the first passing box on a pass, else the highest-priority active box
  // (evaluateBuyBoxes returns default-first). Null when no numeric
  // criterion applied.
  let buyBoxPersonalLine: string | null = null;
  // Highest-priority active box that sets numeric RETURN thresholds — those
  // become the MAO target basis (CONFLICT #6: their criteria beat defaults,
  // and the basis is labeled inline either way).
  let maoBasisBox: NamedBuyBox | null = null;
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
      maoBasisBox = boxResults.map((r) => r.box).find(buyBoxHasReturnTargets) ?? null;
    }
  }

  // Max allowable offer (DEC-2): the verdict → offer-number path. Solve the
  // highest price that still clears the user's targets (buy-box thresholds
  // when set, else break-even cash flow + DSCR 1.25 — see lib/mao-targets)
  // from the SAME current-engine form snapshot everything above recomputes
  // from. Server-side and pure; solver failure or a legacy snapshot simply
  // hides the line. Shopping stages only — a closed or passed deal has no
  // offer left to make.
  type MaoLine =
    | { kind: "cut"; maxPrice: number; asking: number | null; discountPct: number | null }
    | { kind: "clears"; maxPrice: number | null };
  let maoLine: MaoLine | null = null;
  let maoBasisLabel = "";
  if (formValues && (stage == null || isActiveStage(stage))) {
    const maoTarget = buildMaoTarget(maoBasisBox, { isCashPurchase });
    // Credit the buy box only when it actually shaped the target — a
    // DSCR-only box on a cash deal falls back to the default floor, and
    // attributing that default to "your buy box" would be false.
    maoBasisLabel = buyBoxContributesToMaoTarget(maoBasisBox, { isCashPurchase })
      ? `your “${maoBasisBox!.name}” buy box — ${describeMaoTarget(maoTarget)}`
      : describeMaoTarget(maoTarget);
    let clearsAtAsking = false;
    try {
      clearsAtAsking = meetsTarget(calculateAnalysis(formValues), maoTarget);
    } catch {
      // Unparseable math at asking → fall through to the solver alone.
    }
    const mao = calculateMaxAllowableOffer(formValues, maoTarget);
    if (clearsAtAsking) {
      maoLine = { kind: "clears", maxPrice: mao?.maxPrice ?? null };
    } else if (mao) {
      const asking =
        typeof formValues.purchasePrice === "number" && formValues.purchasePrice > 0
          ? formValues.purchasePrice
          : null;
      const discountPct =
        asking != null && asking > mao.maxPrice
          ? Math.round(((asking - mao.maxPrice) / asking) * 100)
          : null;
      maoLine = { kind: "cut", maxPrice: mao.maxPrice, asking, discountPct };
    }
  }

  const nextAction = nextActionForDeal({
    netCashFlow,
    dscr,
    monthlyPayment,
    meetsBuyBox: buyBoxFit ? buyBoxFit.anyPass : null,
    stage: stage ?? undefined,
    // With a close date recorded the banner stops instructing the user to
    // add one directly above the equity card that already shows it.
    hasCloseDate: closeDate != null,
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
                <p className="text-xs text-muted-foreground">
                  Everything for this deal — checklist, documents, notes &amp; scenarios.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {/* Stage changes happen while the user is IN the workspace
                    (WS-2) — same write path + entitlement gate as My Deals. */}
                {canUsePipeline ? (
                  <DealStageSelect
                    savedDealId={dealRow.id}
                    stage={stage ?? DEFAULT_PIPELINE_STAGE}
                  />
                ) : null}
                <OpenFullAnalysisButton savedDealId={dealRow.id} />
              </div>
            </div>
            {/* Compact underwrite strip (DEC-1/WS-1): the numbers the dashboard
                deep-linked about, from the same recompute the banner uses.
                Tiles a legacy snapshot doesn't carry are omitted entirely. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {recommendation ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictBadgeClasses(recommendation)}`}
                >
                  {recommendation}
                </span>
              ) : null}
              <Metric
                label="Cash flow"
                value={fmtCashFlow(netCashFlow)}
                tone={netCashFlow >= 0 ? "positive" : "negative"}
              />
              {cocPct != null ? <Metric label="CoC" value={`${cocPct.toFixed(1)}%`} /> : null}
              {dscrDisplay ? <Metric label="DSCR" value={dscrDisplay} /> : null}
              {dealScore != null ? (
                <Metric label="Deal Score" value={`${Math.round(dealScore)}`} />
              ) : null}
            </div>
            {/* Contents scent (WS-3): the cards below start under the fold with
                no hint they exist — one compact chip row jumps to each. */}
            <DealWorkspaceAnchorChips />
          </div>

          <div>
            <NextActionBanner
              action={nextAction}
              // The closed-stage instruction ("add a close date") is doable in
              // place: jump to the owned-equity card below (M3-2/WOW-4). Only
              // offered while there's still a date to add and the close_date
              // migration is live.
              cta={
                stage === "closed" && ownedEquityEnabled && !closeDate
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
            {/* Max offer line (DEC-2): "lower your offer" becomes an
                executable number, right beside the advice. The basis is
                labeled inline (CONFLICT #6) so this never reads as a second,
                unexplained "your max" vs the analyzer's MAO surfaces. */}
            {maoLine ? (
              <div className="mt-2 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <Target aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Your max offer
                  </div>
                  {maoLine.kind === "clears" ? (
                    <>
                      <div className="text-sm font-bold text-foreground">
                        Asking price works at your targets
                      </div>
                      {maoLine.maxPrice != null ? (
                        <div className="text-xs text-muted-foreground">
                          You could pay up to{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {fmtMoney(maoLine.maxPrice)}
                          </span>{" "}
                          and still hit them.
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm font-bold text-foreground">
                      Works at ≤{" "}
                      <span className="tabular-nums">{fmtMoney(maoLine.maxPrice)}</span> — your max
                      offer
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
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Targets: {maoBasisLabel}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {/* Owned equity (M3-2/WOW-4): closed deals capture their close date
              and see the equity estimate on the page that told them to.
              Hidden until the close_date migration is applied. */}
          {stage === "closed" && ownedEquityEnabled ? (
            <OwnedEquityCard savedDealId={dealRow.id} closeDate={closeDate} equity={ownedEquity} />
          ) : null}
          <DealAgingNudge
            dealId={dealRow.id}
            stage={stage ?? DEFAULT_PIPELINE_STAGE}
            createdAt={dealRow.created_at}
            address={heading}
          />
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
