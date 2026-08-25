import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Compare Deals",
  description: "Compare 2-4 saved rental analyses side by side in your TrueCap dashboard.",
  alternates: { canonical: "/dashboard/compare" },
  robots: { index: false, follow: false },
};
import { getCompareIdsFromCookie } from "@/app/actions/compare";
import { Button } from "@/components/ui/button";
import { CompareDealsClient, type CompareDealViewModel } from "@/components/investcalc/compare-deals-client";
import { CompareDealPicker, type ComparePickerDeal } from "@/components/investcalc/compare-deal-picker";
import { Topbar } from "@/components/dashboard/Topbar";
import { buildDealAssumptions } from "@/lib/compare-assumptions";
import {
  parseCompareSnapshotV1,
  recomputeCompareSnapshotFromForm,
  type CompareSnapshotV1,
} from "@/lib/compare-result-snapshot";
import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  parseFrozenDealScore,
  resolveSavedAnalysisSnapshot,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import {
  buildCanonicalMonthlyNoiMetrics,
  recommendationToSignal,
  type PropertyType,
  type StoredRecommendation,
  type StoredRiskLevel,
} from "@/lib/compare-metrics";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computeDealOfferLine } from "@/lib/deal-offer-line";
import { recordedDealOfferLine } from "@/lib/recorded-offer-ceiling";
import {
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormSnapshot,
} from "@/lib/underwriting-model-release";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  isAdoptedOfferCeilingTargetSource,
  normalizeOfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { buyBoxHasCriteria, type NamedBuyBox } from "@/lib/buy-box";
import { normalizeDataConfidence, type DataConfidence } from "@/lib/data-confidence";
import { DEFAULT_PIPELINE_STAGE, type PipelineStage } from "@/lib/pipeline";

const MAX_COMPARE_ITEMS = 4;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ResultSnapshot = {
  monthlyRentalIncome?: number | string | null;
  totalOperatingExpenses?: number | string | null;
  operatingExpensesAnnual?: number | string | null;
  noiAnnual?: number | string | null;
  monthlyPayment?: number | string | null;
  netCashFlow?: number | string | null;
  annualCashFlow?: number | string | null;
  cocReturn?: number | string | null;
  capRate?: number | string | null;
  dscr?: number | string | null;
  taxSavingsMonthly?: number | string | null;
  afterTaxCF?: number | string | null;
  totalCashRequired?: number | string | null;
  propertyTax?: number | string | null;
  propertyAge?: number | string | null;
  maintenancePctEffective?: number | string | null;
  capexPctEffective?: number | string | null;
  score?: number | string | null;
  recommendation?: StoredRecommendation | null;
  riskLevel?: StoredRiskLevel | null;
  snapshotVersion?: number | string | null;
  compareSnapshot?: unknown;
  maxOfferTarget?: unknown;
  maxOfferTargetSource?: unknown;
  offerCeilingExact?: unknown;
};

type SavedAnalysisRow = {
  id: string;
  created_at: string | null;
  address: string | null;
  title: string | null;
  property_type: PropertyType | null;
  purchase_price: number | string | null;
  net_cash_flow_monthly: number | string | null;
  coc_return_pct: number | string | null;
  property_tax_pct: number | string | null;
  maintenance_pct: number | string | null;
  capex_pct: number | string | null;
  vacancy_pct: number | string | null;
  year_built: number | string | null;
  result_snapshot: ResultSnapshot | null;
  methodology_version?: string | null;
  form_snapshot: unknown;
  interest_rate_pct?: number | string | null;
  loan_term_years?: number | string | null;
  down_payment_pct?: number | string | null;
  management_pct?: number | string | null;
  monthly_rent?: number | string | null;
  insurance_input_mode?: string | null;
  insurance_pct?: number | string | null;
  insurance_mo?: number | string | null;
  /** Workspace-scenario label (optional; ships with the properties/scenarios
   *  migration). Sibling scenarios share one address — this tells them apart. */
  scenario_name?: string | null;
  pipeline_stage?: PipelineStage | null;
  data_confidence?: unknown;
  client_id?: string | null;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /column .* does not exist/i.test(error.message ?? ""));
}

function isMissingNamedColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  return Boolean(
    error &&
      isMissingColumnError(error) &&
      new RegExp(`(?:column\\s+)?[^\\n]*${column}`, "i").test(error.message ?? "")
  );
}

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

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

function methodologyLabel(resolution: ReturnType<typeof resolveSavedAnalysisSnapshot>): string {
  if (resolution.shouldFreeze) {
    return `Frozen Standard v${resolution.storedMethodologyVersion}`;
  }
  if (isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion)) {
    return resolution.didRecompute
      ? `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}`
      : `Legacy analysis · stored snapshot (current v${TRUECAP_UNDERWRITING_STANDARD_VERSION} recompute unavailable)`;
  }
  if (resolution.usesRecordedSnapshot) {
    return `Recorded Standard v${resolution.storedMethodologyVersion}`;
  }
  return `Standard v${resolution.storedMethodologyVersion}`;
}

function mapDeal(
  row: SavedAnalysisRow,
  activeBuyBoxes: NamedBuyBox[] = [],
  canShowMao = false,
  buyBoxesResolved = true
): CompareDealViewModel {
  const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
  const resolution = resolveSavedAnalysisSnapshot({
    methodologyVersion: row.methodology_version,
    resultSnapshot: row.result_snapshot,
    recomputedSnapshot: recomputed
      ? toRecomputedSavedAnalysisSnapshot(recomputed)
      : undefined,
  });
  const snapshot = resolution.snapshot as ResultSnapshot;
  const purchasePrice = toNumber(row.purchase_price);
  // A saved result is recorded history. The resolver uses its exact financial
  // outputs and score; only explicitly unpinned legacy rows retain the clearly
  // labeled compatibility recompute.
  const resolvedCurrent = resolution.didRecompute ? recomputed : null;
  const frozenScore = resolution.usesRecordedSnapshot
    ? parseFrozenDealScore(snapshot)
    : null;
  const netCashFlow = resolvedCurrent
    ? resolvedCurrent.netCashFlowMonthly
    : (toNumber(snapshot.netCashFlow) ?? toNumber(row.net_cash_flow_monthly));
  const cocReturn = resolvedCurrent
    ? resolvedCurrent.cocReturnPct
    : (toNumber(snapshot.cocReturn) ?? toNumber(row.coc_return_pct));
  const capRate = resolvedCurrent ? resolvedCurrent.capRatePct : toNumber(snapshot.capRate);
  const score = resolvedCurrent ? resolvedCurrent.score : toNumber(snapshot.score);
  const recommendation: StoredRecommendation | null = resolvedCurrent
    ? resolvedCurrent.recommendation
    : (snapshot.recommendation ?? null);
  const riskLevel: StoredRiskLevel | null = resolvedCurrent
    ? resolvedCurrent.riskLevel
    : (snapshot.riskLevel ?? null);
  const scoringComplete = score != null && !!recommendation && !!riskLevel;
  const signal = scoringComplete && recommendation ? recommendationToSignal(recommendation) : null;
  let maxOffer: number | null = null;
  let offerGap: number | null = null;
  let maxOfferBasisLabel: string | null = null;
  const persistedTargetSource = normalizeOfferCeilingTargetSource(
    row.result_snapshot?.maxOfferTargetSource
  );
  const persistedMaoTarget =
    persistedTargetSource == null ||
    isAdoptedOfferCeilingTargetSource(persistedTargetSource)
      ? normalizeMaoTarget(row.result_snapshot?.maxOfferTarget)
      : null;
  if (canShowMao && resolution.usesRecordedSnapshot) {
    const recorded = recordedDealOfferLine({
      snapshot: row.result_snapshot,
      isShoppingStage: true,
    });
    if (recorded?.offer && recorded.offer.kind !== "blocked") {
      maxOffer = recorded.offer.maxPrice ?? null;
      offerGap =
        maxOffer != null && purchasePrice != null
          ? purchasePrice - maxOffer
          : null;
      maxOfferBasisLabel = maxOffer != null ? recorded.basisLabel : null;
    }
  } else if (
    canShowMao &&
    (persistedMaoTarget != null || buyBoxesResolved)
  ) {
    const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
    if (values) {
      try {
        const { offer, basisLabel } = computeDealOfferLine(values, activeBuyBoxes, {
          isShoppingStage: true,
          dealClientId: row.client_id ?? null,
          persistedMaoTarget,
        });
        maxOffer = offer && offer.kind !== "blocked" ? offer.maxPrice ?? null : null;
        offerGap =
          maxOffer != null && purchasePrice != null ? purchasePrice - maxOffer : null;
        maxOfferBasisLabel = maxOffer != null && basisLabel ? basisLabel : null;
      } catch {
        // A legacy/unsolvable deal keeps these cells empty; Compare still opens.
      }
    }
  }

  const canonicalNoiMetrics = buildCanonicalMonthlyNoiMetrics({
    noiAnnual: resolvedCurrent
      ? resolvedCurrent.analysisResult.noiAnnual
      : toNumber(snapshot.noiAnnual),
    operatingExpensesAnnual: resolvedCurrent
      ? resolvedCurrent.analysisResult.operatingExpensesAnnual
      : toNumber(snapshot.operatingExpensesAnnual),
  });
  const metrics = {
    netCashFlow,
    cocReturn,
    capRate,
    // After-tax figures from the SAME recompute as netCashFlow so the grid
    // reconciles (afterTaxCF = netCashFlow + taxSavingsMonthly) — the stored
    // snapshot predates the PMI/CapEx-taxable corrections for older deals and
    // could crown the wrong deal on the after-tax winner highlight. Falls back
    // to the stored values for legacy/unparseable forms.
    afterTaxCF: resolvedCurrent ? resolvedCurrent.afterTaxCF : toNumber(snapshot.afterTaxCF),
    annualCashFlow: resolvedCurrent ? resolvedCurrent.netCashFlowMonthly * 12 : toNumber(snapshot.annualCashFlow),
    dscr: resolvedCurrent ? resolvedCurrent.dscr : toNumber(snapshot.dscr),
    // Full cash-outflow bridge components from the SAME recompute as
    // netCashFlow so the tooltip reconciles (rent − vacancy/operating
    // costs/CapEx reserve − P&I − PMI = NCF); fall back to the stored snapshot.
    monthlyRentalIncome: resolvedCurrent ? resolvedCurrent.monthlyRentalIncome : toNumber(snapshot.monthlyRentalIncome),
    ...canonicalNoiMetrics,
    totalOperatingExpenses: resolvedCurrent ? resolvedCurrent.totalOperatingExpenses : toNumber(snapshot.totalOperatingExpenses),
    purchasePrice,
    // Offer Ceiling + gap use the exact persisted target resolved just above.
    // "blocked" carries no price by design (no dollar figure fixes a
    // wrong-market miss).
    maxOffer,
    offerGap,
    totalCashRequired: resolvedCurrent ? resolvedCurrent.cashToClose : toNumber(snapshot.totalCashRequired),
    monthlyPayment: resolvedCurrent ? resolvedCurrent.monthlyPayment : toNumber(snapshot.monthlyPayment),
    pmiMonthly: resolvedCurrent
      ? resolvedCurrent.pmiMonthly
      : toNumber((snapshot as Record<string, number | null | undefined>).pmiMonthly),
    taxSavingsMonthly: resolvedCurrent ? resolvedCurrent.taxSavingsMonthly : toNumber(snapshot.taxSavingsMonthly),
  };

  const assumptions = buildDealAssumptions(row.form_snapshot, row);
  const compareSnapshotVersion = toNumber(snapshot.snapshotVersion ?? null);
  // Long-term tables are part of the same recorded result. Never mix a saved
  // base case with exit/tax rows silently regenerated by today's deployment.
  // Legacy unpinned rows retain their labeled compatibility recompute.
  const compareSnapshot: CompareSnapshotV1 | null =
    resolution.usesRecordedSnapshot
      ? parseCompareSnapshotV1(snapshot.compareSnapshot)
      : recomputeCompareSnapshotFromForm(row.form_snapshot) ??
        parseCompareSnapshotV1(snapshot.compareSnapshot);

  return {
    id: row.id,
    // Prefer a differing title ("<address> — Scenario 2") so scenario rows
    // are tellable apart in the picker; otherwise title derives from address.
    address:
      row.address?.trim() && row.title?.trim() && row.title.trim() !== row.address.trim()
        ? row.title.trim()
        : row.address?.trim() || row.title?.trim() || "Untitled Property",
    // Workspace scenarios clone the title verbatim, so the differing-title
    // trick above can't tell them apart — the scenario name rides separately.
    scenarioName:
      typeof row.scenario_name === "string" && row.scenario_name.trim() ? row.scenario_name.trim() : null,
    pipelineStage: row.pipeline_stage ?? DEFAULT_PIPELINE_STAGE,
    dataConfidence: normalizeDataConfidence(row.data_confidence) as DataConfidence | null,
    createdAt: row.created_at,
    propertyType: row.property_type,
    purchasePrice,
    score,
    recommendation,
    riskLevel,
    scoringComplete,
    breakdown: resolvedCurrent?.breakdown ?? frozenScore?.breakdown ?? null,
    metrics,
    maxOfferBasisLabel,
    signal,
    assumptions,
    compareSnapshotVersion,
    compareSnapshot,
    methodologyLabel: methodologyLabel(resolution),
  };
}

export default async function DashboardComparePage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "compare_deals")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, ids, isPremium] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getCompareIdsFromCookie(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);
  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");
  // Offer Ceiling uses the catalog's paid-status gate. Requiring a nonexistent `mao`
  // plan-feature string would incorrectly hide it from valid Pro customers.
  const canShowMao = isPremium;

  if (ids.length < 1) {
    // Inline picker: load the user's saved deals so they can choose 2-4 to
    // compare right here, instead of being bounced to Saved Analyses and back.
    // scenario_name ships in its own migration — retry without it on 42703.
    const PICKER_SELECT = "id, address, title, net_cash_flow_monthly, methodology_version, result_snapshot, form_snapshot";
    const runPickerQuery = (select: string) =>
      supabase
        .from("saved_analyses")
        .select(select)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("is_completed", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
    let { data: pickerRows, error: pickerError } = await runPickerQuery(`${PICKER_SELECT}, scenario_name`);
    if (isMissingColumnError(pickerError)) {
      ({ data: pickerRows, error: pickerError } = await runPickerQuery(PICKER_SELECT));
    }

    const pickerDeals: ComparePickerDeal[] = ((pickerRows ?? []) as unknown[]).map((row) => {
      const r = row as SavedAnalysisRow;
      const recomputed = recomputeSavedDealVerdict(r.form_snapshot);
      const resolution = resolveSavedAnalysisSnapshot({
        methodologyVersion: r.methodology_version,
        resultSnapshot: r.result_snapshot,
        recomputedSnapshot: recomputed
          ? toRecomputedSavedAnalysisSnapshot(recomputed)
          : undefined,
      });
      const snap = resolution.snapshot as ResultSnapshot;
      // Recompute with the current engine so the picker score matches the
      // Compare results + Dashboard (not the stale stored snapshot).
      const resolvedCurrent = resolution.didRecompute ? recomputed : null;
      const score = resolvedCurrent ? resolvedCurrent.score : toNumber(snap.score);
      const rec: StoredRecommendation | null = resolvedCurrent
        ? resolvedCurrent.recommendation
        : (snap.recommendation ?? null);
      const baseLabel = r.address?.trim() || r.title?.trim() || "Untitled Property";
      const scenario =
        typeof r.scenario_name === "string" && r.scenario_name.trim() ? r.scenario_name.trim() : null;
      return {
        id: r.id,
        // Sibling scenarios share one address — suffix the scenario name so
        // picker rows stay tellable apart (matches the My Deals row suffix).
        label: scenario ? `${baseLabel} — ${scenario}` : baseLabel,
        score,
        signal: score != null && rec ? recommendationToSignal(rec) : null,
        netCashFlow: resolvedCurrent
          ? resolvedCurrent.netCashFlowMonthly
          : (toNumber(snap.netCashFlow) ?? toNumber(r.net_cash_flow_monthly)),
        capRate: resolvedCurrent ? resolvedCurrent.capRatePct : toNumber(snap.capRate),
        methodologyLabel: methodologyLabel(resolution),
      };
    });

    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={initials}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <main id="main" className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="size-5" />
                </div>
                <h1 className="text-2xl font-extrabold text-foreground">Compare Deals</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {pickerDeals.length >= 2
                    ? "Pick 2-4 of your saved deals to line them up side by side."
                    : "You need at least 2 saved deals to compare."}
                </p>
              </div>
              {pickerDeals.length >= 2 ? (
                <CompareDealPicker deals={pickerDeals} />
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    {pickerDeals.length === 1
                      ? "Save one more deal to start comparing."
                      : "Save a couple of deals first, then come back to compare them."}
                  </p>
                  <Button className="mt-4 rounded-full" asChild>
                    <Link href="/dashboard/new">Analyze a property</Link>
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </>
    );
  }

  // scenario_name ships in its own migration — retry without it on 42703.
  const COMPARE_SELECT =
    "id, created_at, address, title, property_type, purchase_price, net_cash_flow_monthly, coc_return_pct, property_tax_pct, maintenance_pct, capex_pct, vacancy_pct, year_built, methodology_version, result_snapshot, form_snapshot, interest_rate_pct, loan_term_years, down_payment_pct, management_pct, monthly_rent, insurance_input_mode, insurance_pct, insurance_mo";
  const runCompareQuery = (select: string) =>
    supabase
      .from("saved_analyses")
      .select(select)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .in("id", ids);
  const runCompareQueryWithClient = async (select: string) => {
    const withClient = await runCompareQuery(`${select}, client_id`);
    return isMissingNamedColumnError(withClient.error, "client_id")
      ? runCompareQuery(select)
      : withClient;
  };
  // Confidence + prior stage power trust badges and a genuine Undo. Both
  // columns are additive migrations, so an older environment falls back to
  // the stable core select instead of breaking comparison entirely.
  let { data: rows, error } = await runCompareQueryWithClient(
    `${COMPARE_SELECT}, scenario_name, pipeline_stage, data_confidence`
  );
  if (isMissingColumnError(error)) {
    ({ data: rows, error } = await runCompareQueryWithClient(`${COMPARE_SELECT}, scenario_name, pipeline_stage`));
  }
  if (isMissingColumnError(error)) {
    ({ data: rows, error } = await runCompareQueryWithClient(`${COMPARE_SELECT}, scenario_name`));
  }
  if (isMissingColumnError(error)) {
    ({ data: rows, error } = await runCompareQueryWithClient(COMPARE_SELECT));
  }

  if (error) {
    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={initials}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <main id="main" className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
              <h1 className="text-xl font-bold text-foreground">Could not load comparison</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please try again in a few moments.</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Dynamic string selects defeat Supabase's row-type inference, so the rows
  // come back loosely typed — cast through unknown (same as the My Deals list).
  const rowById = new Map(
    ((rows ?? []) as unknown[])
      .filter((row) =>
        isReleasedUnderwritingSnapshot((row as SavedAnalysisRow).form_snapshot)
      )
      .map((row) => {
      const r = row as SavedAnalysisRow;
      return [r.id, r] as const;
      })
  );
  const buyBoxesResult = await listBuyBoxesAction().catch(() => null);
  const activeCompareBuyBoxes =
    buyBoxesResult && buyBoxesResult.ok && buyBoxesResult.canUse
      ? buyBoxesResult.boxes.filter((box) => box.isActive && buyBoxHasCriteria(box))
      : [];
  const compareBuyBoxesResolved = Boolean(buyBoxesResult?.ok);
  const deals = ids.map((id) => rowById.get(id)).filter((row): row is SavedAnalysisRow => Boolean(row))
    // Buy boxes resolve on the same canUse gate the dashboard and My Deals
    // use, so a Compare row's Offer Ceiling matches those screens exactly.
    .map((row) =>
      mapDeal(row, activeCompareBuyBoxes, canShowMao, compareBuyBoxesResolved)
    );

  // Stale-cookie recovery: cookie has IDs but none match a current
  // active deal (deleted, archived, or marked completed since the
  // user picked them). Send them back to saved-analyses where the
  // selection UI can be rebuilt — otherwise they land on a confusing
  // half-empty compare grid with no clear next action.
  if (ids.length > 0 && deals.length === 0) {
    redirect("/dashboard/saved-analyses");
  }

  // Touch last_activity_at on the compared deals — fire-and-forget so
  // a slow Supabase round-trip never blocks the page render. Awaiting
  // this caused intermittent compare-page hangs ("system locks up" per
  // user report). The activity timestamp is a nice-to-have signal for
  // the stale-archive job, not load-bearing for the comparison UI.
  if (deals.length > 0) {
    const dealIdsToTouch = deals.map((deal) => deal.id);
    void supabase
      .from("saved_analyses")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("id", dealIdsToTouch)
      .then(({ error: touchError }) => {
        if (touchError) {
          // Silent — failing to bump activity_at is non-critical.
          console.warn("[compare] failed to bump last_activity_at:", touchError.message);
        }
      });
  }

  return (
    <>
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
          <CompareDealsClient
            deals={deals.slice(0, MAX_COMPARE_ITEMS)}
            // Gates the winner card's "Mark the others as Passed" bulk stage
            // write the same way My Deals gates stage changes; the server
            // action re-enforces the entitlement regardless.
          />
        </div>
      </div>
    </>
  );
}
