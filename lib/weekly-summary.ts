/**
 * Personalized weekly summary — pure compute.
 *
 * The between-deals retention pull: once a week, a Pro user who opted in
 * gets a compact recap of THEIR portfolio — active-pipeline totals,
 * owned-portfolio equity, the biggest rate mover, due-diligence deadlines
 * landing this week, and how the pipeline stacks up against their buy box.
 *
 * This module is pure (no IO) and unit-tested in
 * lib/__tests__/weekly-summary.test.ts. All IO — FRED fetch, Supabase
 * reads, Resend sends, kill switch — lives in
 * app/api/cron/send-weekly-summary/route.ts.
 *
 * INVARIANT: every number comes from the SAME lib the dashboard uses —
 * recomputeSavedDealVerdict (recompute-on-read with stored fallback),
 * owned-equity-series, rate-watch, due-diligence, buy-box. The email may
 * never disagree with the product.
 */

import {
  recomputeSavedDealVerdict,
  toRecomputedSavedAnalysisSnapshot,
} from "@/lib/recompute-saved-deal-verdict";
import {
  isLegacySavedMethodologyVersion,
  resolveSavedAnalysisSnapshot,
  type SavedAnalysisSnapshotResolution,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { resolveOwnedEquityBasis } from "@/lib/owned-equity-series";
import { computeOwnedEquity, monthsOwnedBetween } from "@/lib/owned-equity";
import { buildRateWatch } from "@/lib/rate-watch";
import { RATE_ALERTS_MIN_WEEKLY_MOVE_PP, type RateAlertDeal } from "@/lib/rate-alerts";
import {
  dueDiligenceItemStatus,
  normalizeDueDiligenceItems,
} from "@/lib/due-diligence";
import {
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  US_STATE_OPTIONS,
  type BuyBoxDealMetrics,
  type BuyBoxPropertyType,
  type NamedBuyBox,
} from "@/lib/buy-box";
import {
  deriveStageFromFlags,
  isActiveStage,
  isPipelineStage,
  type PipelineStage,
} from "@/lib/pipeline";
import { isReleasedUnderwritingSnapshot } from "@/lib/underwriting-model-release";

/** Cap the due-deadline list — a summary, not a report. */
export const WEEKLY_SUMMARY_MAX_DUE_ITEMS = 6;

/** The slice of a saved_analyses row the summary needs (cron-selected). */
export type WeeklySummaryDealRow = {
  id: string;
  title: string | null;
  address: string | null;
  /** Stored property type string ("single-family" | "multi-family" | "owner-occupant"). */
  property_type?: string | null;
  purchase_price?: number | null;
  /** Denormalized stored cash flow — the recompute's fallback (dashboard pattern). */
  net_cash_flow_monthly: number | null;
  pipeline_stage?: string | null;
  is_completed: boolean | null;
  is_archived: boolean | null;
  /** Owned-deal close date; ships in its own migration — may be absent. */
  close_date?: string | null;
  form_snapshot: unknown;
  methodology_version?: string | null;
  result_snapshot?: Record<string, unknown> | null;
};

export type WeeklySummaryDueDiligenceRow = {
  analysisId: string;
  items: unknown;
};

export type WeeklySummaryContext = {
  /** Latest two weekly MORTGAGE30US prints, newest first; null when FRED
   *  was unavailable — the rate section simply goes quiet. */
  ratePair: { current: number; previous: number } | null;
  /** The user's saved buy boxes (already mapped to the pure shape). */
  buyBoxes: NamedBuyBox[];
  /** Due-diligence checklists keyed by saved-deal id. */
  dueDiligence: WeeklySummaryDueDiligenceRow[];
  /** Viewer-agnostic "today" (YYYY-MM-DD, UTC) for deadline statusing. */
  todayISO: string;
  /** As-of instant for owned-equity math. */
  asOf: Date;
};

export type WeeklySummaryPipeline = {
  /** Active-funnel deals (not closed, not passed). */
  count: number;
  /** Sum of monthly cash flow — recompute-on-read, stored fallback. */
  monthlyCashFlow: number;
};

export type WeeklySummaryOwned = {
  count: number;
  monthlyCashFlow: number;
  /** Portfolio equity today; null when no owned deal has a close date. */
  totalEquity: number | null;
  /** Equity gained since close (equity − down payment), same nullability. */
  equityGain: number | null;
  /** How many owned deals had a usable close date (contributed to equity). */
  datedCount: number;
};

export type WeeklySummaryRateMover = {
  currentRatePct: number;
  previousRatePct: number;
  /** current − previous (signed, percentage points). */
  weeklyMovePp: number;
  /** How many active deals are being re-underwritten. */
  monitoredCount: number;
  /** How many changed state (tier / DSCR band / cash-flow sign) this week. */
  changedCount: number;
  /** The biggest mover by cash-flow swing, or null when nothing changed. */
  topDeal: RateAlertDeal | null;
};

export type WeeklySummaryDueItem = {
  dealId: string;
  dealLabel: string;
  itemLabel: string;
  dueDate: string;
  status: "overdue" | "due-soon";
};

export type WeeklySummaryBuyBox = {
  /** Active pipeline deals that pass at least one active box. */
  passingCount: number;
  /** Active pipeline deals evaluated. */
  evaluatedCount: number;
  /** Active boxes with criteria. */
  boxCount: number;
};

export type WeeklySummaryPayload = {
  pipeline: WeeklySummaryPipeline | null;
  owned: WeeklySummaryOwned | null;
  rateMover: WeeklySummaryRateMover | null;
  dueItems: WeeklySummaryDueItem[];
  buyBox: WeeklySummaryBuyBox | null;
  /** Visible provenance for legacy/frozen rows included in aggregate numbers. */
  methodologyNotes: string[];
};

/** Same display-label fallback the rate-alert email uses. */
function dealLabel(row: WeeklySummaryDealRow): string {
  return row.title?.trim() || row.address?.trim() || "Saved deal";
}

/** Lifecycle stage: pipeline_stage wins, else the legacy-flag bridge. */
function stageForRow(row: WeeklySummaryDealRow): PipelineStage {
  if (isPipelineStage(row.pipeline_stage)) return row.pipeline_stage;
  return deriveStageFromFlags({
    isCompleted: row.is_completed,
    isArchived: row.is_archived,
  });
}

/** Recompute-on-read cash flow with stored fallback — the dashboard's
 *  exact pattern (fresh engine number, else the denormalized column). */
function cashFlowForRow(
  row: WeeklySummaryDealRow,
  fresh: ReturnType<typeof recomputeSavedDealVerdict>,
  resolution: SavedAnalysisSnapshotResolution,
): number {
  const stored = Number(resolution.snapshot.netCashFlow);
  return fresh
    ? fresh.netCashFlowMonthly
    : Number.isFinite(stored)
      ? stored
      : (row.net_cash_flow_monthly ?? 0);
}

function isBuyBoxPropertyType(t: unknown): t is BuyBoxPropertyType {
  return t === "single-family" || t === "multi-family" || t === "owner-occupant";
}

/** Biggest mover = the changed deal with the largest cash-flow swing. */
function pickBiggestMover(changed: RateAlertDeal[]): RateAlertDeal | null {
  let best: RateAlertDeal | null = null;
  let bestSwing = -1;
  for (const deal of changed) {
    const swing = Math.abs(deal.after.monthlyCashFlow - deal.before.monthlyCashFlow);
    if (swing > bestSwing) {
      best = deal;
      bestSwing = swing;
    }
  }
  return best;
}

/**
 * Build one user's weekly summary payload from their saved deals + context.
 * Returns null when there's NOTHING to say — no deals at all, or nothing in
 * the funnel and nothing owned (only passed deals) — so the cron skips the
 * user entirely instead of sending an empty email.
 */
export function buildWeeklySummary(
  userDeals: WeeklySummaryDealRow[],
  context: WeeklySummaryContext,
): WeeklySummaryPayload | null {
  // A recorded internal v2 result is not a released email surface. Filter on
  // the raw marker before the normal recorded-result fallback can include it.
  const releasedDeals = userDeals.filter((row) =>
    isReleasedUnderwritingSnapshot(row.form_snapshot)
  );
  if (releasedDeals.length === 0) return null;

  // One recompute per row, shared by every section (pipeline totals, buy-box
  // metrics, owned cash flow) so the sections can't disagree with each other.
  const freshById = new Map<string, ReturnType<typeof recomputeSavedDealVerdict>>();
  const resolutionById = new Map<string, SavedAnalysisSnapshotResolution>();
  for (const row of releasedDeals) {
    const recomputed = recomputeSavedDealVerdict(row.form_snapshot);
    const resolution = resolveSavedAnalysisSnapshot({
      methodologyVersion: row.methodology_version,
      resultSnapshot: row.result_snapshot,
      recomputedSnapshot: recomputed
        ? toRecomputedSavedAnalysisSnapshot(recomputed)
        : undefined,
    });
    resolutionById.set(row.id, resolution);
    freshById.set(row.id, resolution.didRecompute ? recomputed : null);
  }

  const activeRows = releasedDeals.filter((r) => isActiveStage(stageForRow(r)));
  const ownedRows = releasedDeals.filter((r) => stageForRow(r) === "closed");

  // ── Active pipeline ────────────────────────────────────────────────
  let pipeline: WeeklySummaryPipeline | null = null;
  if (activeRows.length > 0) {
    let cashFlow = 0;
    for (const row of activeRows) {
      cashFlow += cashFlowForRow(
        row,
        freshById.get(row.id) ?? null,
        resolutionById.get(row.id)!
      );
    }
    pipeline = { count: activeRows.length, monthlyCashFlow: Math.round(cashFlow) };
  }

  // ── Owned portfolio (SHARED owned-equity helpers — never re-derived) ──
  let owned: WeeklySummaryOwned | null = null;
  if (ownedRows.length > 0) {
    let cashFlow = 0;
    let totalEquity = 0;
    let equityGain = 0;
    let datedCount = 0;
    for (const row of ownedRows) {
      const resolution = resolutionById.get(row.id)!;
      cashFlow += cashFlowForRow(row, freshById.get(row.id) ?? null, resolution);
      const basis = resolution.shouldFreeze ? null : resolveOwnedEquityBasis({
        is_completed: true, // owned by stage; the legacy flag may lag pipeline_stage
        close_date: row.close_date ?? null,
        form_snapshot: row.form_snapshot,
      });
      const summary = basis
        ? computeOwnedEquity(basis.input, monthsOwnedBetween(basis.closeDate, context.asOf))
        : null;
      if (summary) {
        totalEquity += summary.equity;
        equityGain += summary.totalEquityGain;
        datedCount += 1;
      }
    }
    owned = {
      count: ownedRows.length,
      monthlyCashFlow: Math.round(cashFlow),
      totalEquity: datedCount > 0 ? Math.round(totalEquity) : null,
      equityGain: datedCount > 0 ? Math.round(equityGain) : null,
      datedCount,
    };
  }

  // A user with only passed deals has nothing worth emailing about.
  if (!pipeline && !owned) return null;

  // Aggregate email totals can combine several saved rows, so surface the
  // methodology policy explicitly instead of claiming every value was
  // recomputed. This keeps legacy compatibility honest across future bumps.
  const methodologyNotes: string[] = [];
  const resolutions = [...resolutionById.values()];
  if (
    resolutions.some(
      (resolution) =>
        isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion) &&
        resolution.didRecompute
    )
  ) {
    methodologyNotes.push(
      `Legacy analysis · recomputed with current v${TRUECAP_UNDERWRITING_STANDARD_VERSION}.`
    );
  }
  if (
    resolutions.some(
      (resolution) =>
        isLegacySavedMethodologyVersion(resolution.storedMethodologyVersion) &&
        !resolution.didRecompute
    )
  ) {
    methodologyNotes.push(
      `Legacy analysis · stored snapshot where current v${TRUECAP_UNDERWRITING_STANDARD_VERSION} could not recompute.`
    );
  }
  const frozenVersions = [
    ...new Set(
      resolutions
        .filter((resolution) => resolution.shouldFreeze)
        .map((resolution) => resolution.storedMethodologyVersion)
        .filter((version): version is string => Boolean(version))
    ),
  ];
  if (frozenVersions.length > 0) {
    methodologyNotes.push(
      `Frozen analyses retain their saved Standard ${frozenVersions
        .map((version) => `v${version}`)
        .join(", ")}; they were not recomputed.`
    );
  }

  // ── Biggest rate mover (SHARED rate-watch, vs the FRED pair) ─────────
  let rateMover: WeeklySummaryRateMover | null = null;
  const pair = context.ratePair;
  if (
    pair &&
    Number.isFinite(pair.current) &&
    Number.isFinite(pair.previous) &&
    activeRows.length > 0
  ) {
    const watch = buildRateWatch(
      activeRows.filter((r) => !resolutionById.get(r.id)?.shouldFreeze).map((r) => ({
        id: r.id,
        title: r.title,
        address: r.address,
        form_snapshot: r.form_snapshot,
      })),
      pair.current,
    );
    if (watch) {
      const weeklyMovePp = pair.current - pair.previous;
      // WEEK-FRAMED mover (verifier should-fix): buildRateWatch compares
      // each deal at the CURRENT rate vs its SAVED rate, so the same
      // "changed" deal would headline every week the rate sat ≥0.25pp off
      // its save point — stale for a weekly digest. Feature a mover only
      // when the rate ACTUALLY moved this week (the rate-alerts cron's own
      // week-over-week trigger threshold); quiet weeks keep the rates line
      // with topDeal null.
      const weekMoved = Math.abs(weeklyMovePp) >= RATE_ALERTS_MIN_WEEKLY_MOVE_PP;
      rateMover = {
        currentRatePct: pair.current,
        previousRatePct: pair.previous,
        weeklyMovePp,
        monitoredCount: watch.monitoredCount,
        changedCount: weekMoved ? watch.changedDeals.length : 0,
        topDeal: weekMoved ? pickBiggestMover(watch.changedDeals) : null,
      };
    }
  }

  // ── Due this week (SHARED due-diligence status helpers) ──────────────
  const activeById = new Map(activeRows.map((r) => [r.id, r]));
  const dueItems: WeeklySummaryDueItem[] = [];
  for (const dd of context.dueDiligence) {
    const row = activeById.get(dd.analysisId);
    if (!row) continue; // closed/passed deals carry no deadline pressure
    for (const item of normalizeDueDiligenceItems(dd.items)) {
      const status = dueDiligenceItemStatus(item, context.todayISO);
      if (status !== "overdue" && status !== "due-soon") continue;
      dueItems.push({
        dealId: row.id,
        dealLabel: dealLabel(row),
        itemLabel: item.label,
        dueDate: item.dueDate!,
        status,
      });
    }
  }
  // Overdue first, then soonest due date; capped — a summary, not a report.
  dueItems.sort((a, b) =>
    a.status === b.status
      ? a.dueDate.localeCompare(b.dueDate)
      : a.status === "overdue"
        ? -1
        : 1,
  );
  const cappedDueItems = dueItems.slice(0, WEEKLY_SUMMARY_MAX_DUE_ITEMS);

  // ── Buy-box fit (SHARED buy-box primitives; dashboard's metric wiring) ──
  let buyBox: WeeklySummaryBuyBox | null = null;
  const activeBoxes = context.buyBoxes.filter((b) => b.isActive && buyBoxHasCriteria(b));
  if (activeBoxes.length > 0 && activeRows.length > 0) {
    let passingCount = 0;
    for (const row of activeRows) {
      const fresh = freshById.get(row.id) ?? null;
      const snapshot = resolutionById.get(row.id)?.snapshot ?? {};
      const storedCapRate = Number(snapshot.capRate);
      const storedCoc = Number(snapshot.cocReturn);
      const storedDscr = Number(snapshot.dscr);
      const storedPayment = Number(snapshot.monthlyPayment);
      const metrics: BuyBoxDealMetrics = {
        capRatePct: fresh ? fresh.capRatePct : Number.isFinite(storedCapRate) ? storedCapRate : null,
        cocPct: fresh ? fresh.cocReturnPct : Number.isFinite(storedCoc) ? storedCoc : null,
        dscr: fresh ? fresh.dscr : Number.isFinite(storedDscr) ? storedDscr : null,
        cashFlowMonthly: cashFlowForRow(
          row,
          fresh,
          resolutionById.get(row.id)!
        ),
        purchasePrice: row.purchase_price ?? null,
        propertyType: isBuyBoxPropertyType(row.property_type) ? row.property_type : null,
        state: deriveStateFromAddress(row.address),
        // calc-analysis canon: monthlyPayment <= 0 = cash purchase → DSCR N/A.
        isCashPurchase: fresh
          ? fresh.isCashPurchase
          : Number.isFinite(storedPayment) && storedPayment <= 0,
      };
      const results = evaluateBuyBoxes(activeBoxes, metrics).filter((r) => r.result.active);
      if (results.length === 0) continue;
      if (summarizeBuyBoxFit(results).anyPass) passingCount += 1;
    }
    buyBox = {
      passingCount,
      evaluatedCount: activeRows.length,
      boxCount: activeBoxes.length,
    };
  }

  return {
    pipeline,
    owned,
    rateMover,
    dueItems: cappedDueItems,
    buyBox,
    methodologyNotes,
  };
}

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** Subject line for a user's weekly summary email. */
export function weeklySummarySubject(payload: WeeklySummaryPayload): string {
  if (payload.pipeline) {
    const deals =
      payload.pipeline.count === 1 ? "1 active deal" : `${payload.pipeline.count} active deals`;
    return `Your week in deals — ${deals}, ${fmtMoney(payload.pipeline.monthlyCashFlow)}/mo pipeline`;
  }
  if (payload.owned) {
    const props =
      payload.owned.count === 1 ? "1 owned property" : `${payload.owned.count} owned properties`;
    return `Your week in deals — ${props}`;
  }
  return "Your TrueCap weekly summary";
}

/**
 * ISO-8601 week key (UTC), e.g. "2026-W28" — the idempotency key for
 * weekly_summary_log so live mode sends at most one summary per user per
 * ISO week, no matter how often the cron fires or retries.
 */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Shift to the Thursday of this ISO week — its year is the ISO year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Tolerant user_buy_boxes row → pure NamedBuyBox mapping for the cron.
 * (The Settings action keeps its own mapper; "use server" files can only
 * export async functions, so it can't be shared from there.) Numeric
 * columns may arrive as strings (numeric type over PostgREST).
 */
export function normalizeWeeklyBuyBoxRow(raw: unknown): NamedBuyBox | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  return {
    id: r.id,
    name: typeof r.name === "string" && r.name.trim() ? r.name : "My Buy Box",
    strategyKind: typeof r.strategy_kind === "string" ? r.strategy_kind : null,
    isDefault: Boolean(r.is_default),
    sortOrder: num(r.sort_order) ?? 0,
    minCapRatePct: num(r.min_cap_rate_pct),
    minCocPct: num(r.min_coc_pct),
    minDscr: num(r.min_dscr),
    minCashFlowMonthly: num(r.min_cash_flow_monthly),
    maxPurchasePrice: num(r.max_purchase_price),
    propertyTypes: strArray(r.property_types).filter(isBuyBoxPropertyType),
    // Filter through the canonical state list (verifier nit: the dashboard
    // mapper drops unknown entries; a looser email mapper could FAIL the
    // Market criterion the dashboard would skip — email must never be
    // stricter than the product).
    targetStates: strArray(r.target_states)
      .map((s) => s.toUpperCase())
      .filter((s) => KNOWN_STATE_ABBRS.has(s)),
    isActive: r.is_active == null ? true : Boolean(r.is_active),
  };
}

const KNOWN_STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));
