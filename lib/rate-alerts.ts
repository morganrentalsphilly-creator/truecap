/**
 * Rate-drop re-underwriting alerts — pure compute.
 *
 * The retention engine: when the 30-year mortgage rate moves
 * meaningfully, Pro users' SAVED deals get re-underwritten at the new
 * rate, and the ones whose story changed ("now cash-flows", "now
 * clears DSCR 1.25", "tier moved Solid → Strong") are emailed as a
 * digest. Saved deals become living watchlists instead of snapshots.
 *
 * This module is pure (no IO) and unit-tested in
 * lib/__tests__/rate-alerts.test.ts. All IO — FRED fetch, Supabase
 * reads, Resend sends, kill switch — lives in
 * app/api/cron/send-rate-alerts/route.ts.
 *
 * Re-underwriting reuses calculateAnalysis (the single source of
 * truth) with ONLY the interest rate substituted; every other
 * assumption stays exactly as the user saved it.
 */

import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  resolveSavedAnalysisSnapshot,
  type SavedAnalysisResolutionMode,
} from "@/lib/saved-analysis-methodology";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
import { getDealTier, type DealTier } from "@/lib/verdict";

/**
 * Don't run the alert pass at all unless this week's FRED print moved
 * at least this much vs the previous one. Keeps flat-rate weeks silent.
 */
export const RATE_ALERTS_MIN_WEEKLY_MOVE_PP = 0.125;

/**
 * Per-deal gate: the market rate must differ from the rate the deal
 * was SAVED with by at least this much before we bother re-running it.
 */
export const RATE_ALERTS_MIN_DEAL_DELTA_PP = 0.25;

/** Cap deals per email — beyond this it's noise, not signal. */
export const RATE_ALERTS_MAX_DEALS_PER_EMAIL = 10;

export type DscrBand = "bankable" | "tight" | "underwater";

export function dscrBand(dscr: number): DscrBand {
  if (dscr >= 1.25) return "bankable";
  if (dscr >= 1.0) return "tight";
  return "underwater";
}

export type RateAlertMetrics = {
  monthlyCashFlow: number;
  dscr: number;
  dscrBand: DscrBand;
  tier: DealTier;
};

export type RateAlertDeal = {
  id: string;
  /** Display label — title if set, else address, else "Saved deal". */
  label: string;
  savedRatePct: number;
  currentRatePct: number;
  before: RateAlertMetrics;
  after: RateAlertMetrics;
  /** Human one-liners describing what changed, ready for the email. */
  changes: string[];
  /** True when the deal improved (rate fell / metrics up). */
  improved: boolean;
};

export type RateAlertEvaluation = {
  /** True only when both rate legs can be attributed to one known engine. */
  eligible: boolean;
  alert: RateAlertDeal | null;
  methodologyMode: SavedAnalysisResolutionMode;
};

/**
 * A same-version recorded row may be rate-watched only after today's engine
 * reproduces the recorded baseline closely enough to prove that changing the
 * rate—not formula drift—caused the story change.
 */
export const RATE_ALERT_RECORDED_CASH_FLOW_TOLERANCE_DOLLARS = 1;
export const RATE_ALERT_RECORDED_DSCR_TOLERANCE = 0.01;

function metricsFor(values: InvestmentFormValues): RateAlertMetrics | null {
  const result = calculateAnalysis(values);
  // Cash purchases have no debt service — rate moves don't touch them.
  if (result.monthlyPayment <= 0) return null;
  return {
    monthlyCashFlow: Math.round(result.netCashFlow),
    dscr: result.dscr,
    dscrBand: dscrBand(result.dscr),
    tier: getDealTier(result),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteSnapshotNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordedMetrics(snapshotInput: unknown): RateAlertMetrics | null {
  const snapshot = asRecord(snapshotInput);
  if (!snapshot) return null;
  const netCashFlow = finiteSnapshotNumber(snapshot.netCashFlow);
  const dscr = finiteSnapshotNumber(snapshot.dscr);
  const capRate = finiteSnapshotNumber(snapshot.capRate);
  const cocReturn = finiteSnapshotNumber(snapshot.cocReturn);
  const totalCashRequired = finiteSnapshotNumber(snapshot.totalCashRequired);
  const monthlyPayment = finiteSnapshotNumber(snapshot.monthlyPayment);
  if (
    netCashFlow == null ||
    dscr == null ||
    capRate == null ||
    cocReturn == null ||
    totalCashRequired == null ||
    monthlyPayment == null
  ) {
    return null;
  }
  const resultForTier = {
    netCashFlow,
    dscr,
    capRate,
    cocReturn,
    totalCashRequired,
    monthlyPayment,
  } as AnalysisResult;
  return {
    monthlyCashFlow: Math.round(netCashFlow),
    dscr,
    dscrBand: dscrBand(dscr),
    tier: getDealTier(resultForTier),
  };
}

function recordedBaselineMatchesCurrentEngine(
  recorded: RateAlertMetrics,
  current: RateAlertMetrics,
): boolean {
  const sameCashFlowSign =
    (recorded.monthlyCashFlow >= 0) === (current.monthlyCashFlow >= 0);
  return (
    sameCashFlowSign &&
    Math.abs(recorded.monthlyCashFlow - current.monthlyCashFlow) <=
      RATE_ALERT_RECORDED_CASH_FLOW_TOLERANCE_DOLLARS &&
    recorded.dscrBand === current.dscrBand &&
    Math.abs(recorded.dscr - current.dscr) <=
      RATE_ALERT_RECORDED_DSCR_TOLERANCE &&
    recorded.tier === current.tier
  );
}

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * Re-underwrite one saved deal at the current market rate.
 * Returns null when nothing email-worthy happened:
 *  - cash purchase (no debt service)
 *  - saved rate is already within RATE_ALERTS_MIN_DEAL_DELTA_PP
 *  - the numbers moved but no STATE changed (tier, DSCR band,
 *    cash-flow sign all identical) — we alert on stories, not decimals.
 */
export type BuildRateAlertArgs = {
  id: string;
  title?: string | null;
  address?: string | null;
  values: InvestmentFormValues;
  currentRatePct: number;
  /** Authoritative saved_analyses.methodology_version column. */
  methodologyVersion: unknown;
  /** Immutable saved result used only to attest a recorded baseline. */
  recordedSnapshot: unknown;
};

/**
 * Shared dashboard/email eligibility boundary. It returns eligibility
 * separately from the optional alert so Rate Watch can count only deals it is
 * truthfully monitoring even when today's rate does not change their state.
 */
export function evaluateRateAlertForDeal(
  args: BuildRateAlertArgs,
): RateAlertEvaluation {
  const { values, currentRatePct } = args;

  const before = metricsFor(values);
  const methodology = resolveSavedAnalysisSnapshot({
    methodologyVersion: args.methodologyVersion,
    resultSnapshot: args.recordedSnapshot,
    // A valid released form produced `before`, so current computation is
    // available. The resolver needs only a non-empty marker to route legacy
    // rows into its explicit compatibility-recompute cohort.
    recomputedSnapshot: before ? { netCashFlow: before.monthlyCashFlow } : undefined,
    currentMethodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
  });

  if (!before) {
    return { eligible: false, alert: null, methodologyMode: methodology.mode };
  }

  let eligible = false;
  if (
    methodology.mode === "current-computation" ||
    methodology.mode === "legacy-recomputed"
  ) {
    eligible = true;
  } else if (methodology.mode === "same-version-recorded-snapshot") {
    const recorded = recordedMetrics(args.recordedSnapshot);
    eligible = Boolean(
      recorded && recordedBaselineMatchesCurrentEngine(recorded, before),
    );
  }

  // Frozen versions and every stored/unavailable fallback have no executable
  // engine contract here. A same-version recording that no longer reproduces
  // also fails closed: never call formula drift a rate-driven change.
  if (!eligible) {
    return { eligible: false, alert: null, methodologyMode: methodology.mode };
  }

  const savedRatePct = values.interestRate;
  if (typeof savedRatePct !== "number" || !Number.isFinite(savedRatePct)) {
    return { eligible: false, alert: null, methodologyMode: methodology.mode };
  }
  if (Math.abs(savedRatePct - currentRatePct) < RATE_ALERTS_MIN_DEAL_DELTA_PP) {
    return { eligible: true, alert: null, methodologyMode: methodology.mode };
  }

  const after = metricsFor({ ...values, interestRate: currentRatePct });
  if (!after) {
    return { eligible: false, alert: null, methodologyMode: methodology.mode };
  }

  const tierChanged = before.tier !== after.tier;
  const bandChanged = before.dscrBand !== after.dscrBand;
  const signFlipped =
    (before.monthlyCashFlow >= 0) !== (after.monthlyCashFlow >= 0);
  if (!tierChanged && !bandChanged && !signFlipped) {
    return { eligible: true, alert: null, methodologyMode: methodology.mode };
  }

  const changes: string[] = [];
  if (signFlipped) {
    changes.push(
      after.monthlyCashFlow >= 0
        ? `Now cash-flows ${fmtMoney(after.monthlyCashFlow)}/mo (was ${fmtMoney(before.monthlyCashFlow)}/mo)`
        : `Now NEGATIVE ${fmtMoney(after.monthlyCashFlow)}/mo (was ${fmtMoney(before.monthlyCashFlow)}/mo)`
    );
  }
  if (bandChanged) {
    const labels: Record<DscrBand, string> = {
      bankable: "clears the typical ≥1.25 lender threshold",
      tight: "is above breakeven but below the ≥1.25 lenders want",
      underwater: "no longer covers debt service",
    };
    changes.push(
      `DSCR ${after.dscr.toFixed(2)} ${labels[after.dscrBand]} (was ${before.dscr.toFixed(2)})`
    );
  }
  if (tierChanged) {
    changes.push(`Verdict moved ${before.tier} → ${after.tier}`);
  }

  return {
    eligible: true,
    methodologyMode: methodology.mode,
    alert: {
      id: args.id,
      label: args.title?.trim() || args.address?.trim() || "Saved deal",
      savedRatePct,
      currentRatePct,
      before,
      after,
      changes,
      improved: currentRatePct < savedRatePct,
    },
  };
}

export function buildRateAlertForDeal(
  args: BuildRateAlertArgs,
): RateAlertDeal | null {
  return evaluateRateAlertForDeal(args).alert;
}

/** Subject line for a user's alert email. */
export function rateAlertSubject(currentRatePct: number, dealCount: number, fell: boolean): string {
  const dir = fell ? "dropped" : "rose";
  const deals = dealCount === 1 ? "1 of your saved deals" : `${dealCount} of your saved deals`;
  return `Rates ${dir} to ${currentRatePct.toFixed(2)}% — ${deals} changed`;
}

/**
 * Plausibility bounds for the `?rate=` deep-link param the alert email puts
 * on each deal card. Anything outside is ignored silently — a tampered or
 * mangled link must never re-underwrite at a nonsense rate.
 */
export const RATE_ALERT_PARAM_MIN_PCT = 0.5;
export const RATE_ALERT_PARAM_MAX_PCT = 15;

/**
 * Validate the `?rate=` search param from a rate-alert deep link.
 * Accepts the raw Next.js searchParams value (string | string[] | undefined);
 * returns the rate in percent, or null for anything non-finite or outside
 * the plausible mortgage-rate bounds. Never throws.
 */
export function parseRateAlertRateParam(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.trim() === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate)) return null;
  if (rate < RATE_ALERT_PARAM_MIN_PCT || rate > RATE_ALERT_PARAM_MAX_PCT) return null;
  return rate;
}

/**
 * Per-deal deep link for the alert email: the deal's workspace page with the
 * NEW rate carried as a query param, so opening it shows the deal
 * re-underwritten at the alert's rate (banner in
 * app/dashboard/saved-analyses/[id]) without mutating the saved deal.
 */
export function rateAlertDealUrl(
  siteUrl: string,
  deal: Pick<RateAlertDeal, "id" | "currentRatePct">
): string {
  const rate = encodeURIComponent(String(deal.currentRatePct));
  return `${siteUrl}/dashboard/saved-analyses/${deal.id}?rate=${rate}&src=rate-alert`;
}

export type RateReUnderwrite = {
  savedRatePct: number;
  alertRatePct: number;
  before: RateAlertMetrics;
  after: RateAlertMetrics;
};

/**
 * Re-underwrite a deal at the alert's rate for the deep-link banner. Unlike
 * buildRateAlertForDeal there is NO minimum-delta or state-change gate — the
 * user clicked a link that promised this preview, so tiny moves still render.
 * Null when there's nothing meaningful to show: cash purchase (no debt
 * service), a snapshot without a finite saved rate, or the saved rate already
 * matching the alert rate at display precision.
 */
export function buildRateReUnderwrite(
  values: InvestmentFormValues,
  alertRatePct: number
): RateReUnderwrite | null {
  const savedRatePct = values.interestRate;
  if (typeof savedRatePct !== "number" || !Number.isFinite(savedRatePct)) return null;
  // Same rate to 2-decimal display precision — the banner would show a no-op.
  if (Math.abs(savedRatePct - alertRatePct) < 0.005) return null;

  const before = metricsFor(values);
  if (!before) return null; // cash purchase
  const after = metricsFor({ ...values, interestRate: alertRatePct });
  if (!after) return null;

  return { savedRatePct, alertRatePct, before, after };
}
