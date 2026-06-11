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

import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
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
export function buildRateAlertForDeal(args: {
  id: string;
  title?: string | null;
  address?: string | null;
  values: InvestmentFormValues;
  currentRatePct: number;
}): RateAlertDeal | null {
  const { values, currentRatePct } = args;

  const savedRatePct = values.interestRate;
  if (typeof savedRatePct !== "number" || !Number.isFinite(savedRatePct)) return null;
  if (Math.abs(savedRatePct - currentRatePct) < RATE_ALERTS_MIN_DEAL_DELTA_PP) return null;

  const before = metricsFor(values);
  if (!before) return null; // cash purchase
  const after = metricsFor({ ...values, interestRate: currentRatePct });
  if (!after) return null;

  const tierChanged = before.tier !== after.tier;
  const bandChanged = before.dscrBand !== after.dscrBand;
  const signFlipped =
    (before.monthlyCashFlow >= 0) !== (after.monthlyCashFlow >= 0);
  if (!tierChanged && !bandChanged && !signFlipped) return null;

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
    id: args.id,
    label: args.title?.trim() || args.address?.trim() || "Saved deal",
    savedRatePct,
    currentRatePct,
    before,
    after,
    changes,
    improved: currentRatePct < savedRatePct,
  };
}

/** Subject line for a user's alert email. */
export function rateAlertSubject(currentRatePct: number, dealCount: number, fell: boolean): string {
  const dir = fell ? "dropped" : "rose";
  const deals = dealCount === 1 ? "1 of your saved deals" : `${dealCount} of your saved deals`;
  return `Rates ${dir} to ${currentRatePct.toFixed(2)}% — ${deals} changed`;
}
