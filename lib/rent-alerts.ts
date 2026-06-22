/**
 * Rent-change re-underwriting alerts — pure compute.
 *
 * Sibling to lib/rate-alerts.ts, on the rent axis. When a saved deal's local
 * market rent moves meaningfully, re-underwrite the deal at the new rent and
 * surface only the ones whose STORY changed (cash-flow sign, DSCR band, or
 * verdict tier). Saved deals become living watchlists on rent too — not just
 * the mortgage rate.
 *
 * This module is PURE (no IO) and unit-tested in lib/__tests__/rent-alerts.test.ts.
 * The caller sources the current market rent (HUD Fair Market Rent or RentCast)
 * and passes it in; all the network / Supabase / Resend / kill-switch wiring
 * lives in the cron route, exactly like rate-alerts.
 *
 * Re-underwriting reuses calculateAnalysis (the single source of truth) with
 * ONLY the rent substituted; every other assumption stays exactly as the user
 * saved it.
 *
 * Scope: single-family deals (one rent figure). Multi-family unit mixes need a
 * per-unit market-rent vector to be meaningful, so they're skipped for now
 * (return null) — the same "don't guess" stance rate-alerts takes on cash
 * purchases.
 */

import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { getDealTier, type DealTier } from "@/lib/verdict";
import { dscrBand, type DscrBand } from "@/lib/rate-alerts";

/**
 * Per-deal gate: the current market rent must differ from the rent the deal
 * was SAVED with by at least this fraction before we bother re-running it.
 * 0.05 = a 5% rent move. Keeps tiny revisions quiet.
 */
export const RENT_ALERTS_MIN_DEAL_DELTA_PCT = 0.05;

/** Cap deals per email — beyond this it's noise, not signal. */
export const RENT_ALERTS_MAX_DEALS_PER_EMAIL = 10;

export type RentAlertMetrics = {
  monthlyCashFlow: number;
  dscr: number;
  /** null for an all-cash deal (no debt to cover — DSCR band is N/A). */
  dscrBand: DscrBand | null;
  tier: DealTier;
};

export type RentAlertDeal = {
  id: string;
  /** Display label — title if set, else address, else "Saved deal". */
  label: string;
  savedRentMonthly: number;
  currentMarketRentMonthly: number;
  before: RentAlertMetrics;
  after: RentAlertMetrics;
  /** Human one-liners describing what changed, ready for the email. */
  changes: string[];
  /** True when the market rent rose (deal got stronger). */
  improved: boolean;
};

function metricsFor(values: InvestmentFormValues): RentAlertMetrics {
  const result = calculateAnalysis(values);
  // Rent matters to cash buyers too (income drives cash flow), so — unlike
  // rate-alerts — we DON'T skip cash purchases. We just mark DSCR band N/A
  // when there's no debt service, so a "0.00 underwater" never gets reported.
  const hasDebt = result.monthlyPayment > 0;
  return {
    monthlyCashFlow: Math.round(result.netCashFlow),
    dscr: result.dscr,
    dscrBand: hasDebt ? dscrBand(result.dscr) : null,
    tier: getDealTier(result),
  };
}

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * Re-underwrite one saved single-family deal at the current market rent.
 * Returns null when nothing email-worthy happened:
 *  - not a single-family deal (multi-family unit mix unsupported here)
 *  - the saved rent is missing / non-positive
 *  - the market rent is within RENT_ALERTS_MIN_DEAL_DELTA_PCT of the saved rent
 *  - the numbers moved but no STATE changed (tier, DSCR band, cash-flow sign
 *    all identical) — we alert on stories, not decimals.
 */
export function buildRentAlertForDeal(args: {
  id: string;
  title?: string | null;
  address?: string | null;
  values: InvestmentFormValues;
  currentMarketRentMonthly: number;
}): RentAlertDeal | null {
  const { values, currentMarketRentMonthly } = args;

  if (values.propertyType !== "single-family") return null;

  const savedRentMonthly = values.monthlyRent;
  if (typeof savedRentMonthly !== "number" || !Number.isFinite(savedRentMonthly) || savedRentMonthly <= 0) {
    return null;
  }
  if (!Number.isFinite(currentMarketRentMonthly) || currentMarketRentMonthly <= 0) return null;

  // Relative move gate — a 5% swing on $2,000 rent is $100/mo, worth a look.
  const relDelta = Math.abs(currentMarketRentMonthly - savedRentMonthly) / savedRentMonthly;
  if (relDelta < RENT_ALERTS_MIN_DEAL_DELTA_PCT) return null;

  const before = metricsFor(values);
  const after = metricsFor({ ...values, monthlyRent: currentMarketRentMonthly });

  const tierChanged = before.tier !== after.tier;
  // Only a real band change counts — and only when BOTH sides have debt
  // (financed deal), so an all-cash deal's null band never trips this.
  const bandChanged =
    before.dscrBand !== null && after.dscrBand !== null && before.dscrBand !== after.dscrBand;
  const signFlipped = (before.monthlyCashFlow >= 0) !== (after.monthlyCashFlow >= 0);
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
      `DSCR ${after.dscr.toFixed(2)} ${labels[after.dscrBand as DscrBand]} (was ${before.dscr.toFixed(2)})`
    );
  }
  if (tierChanged) {
    changes.push(`Verdict moved ${before.tier} → ${after.tier}`);
  }

  return {
    id: args.id,
    label: args.title?.trim() || args.address?.trim() || "Saved deal",
    savedRentMonthly,
    currentMarketRentMonthly,
    before,
    after,
    changes,
    improved: currentMarketRentMonthly > savedRentMonthly,
  };
}

/** Subject line for a user's rent-alert email. */
export function rentAlertSubject(dealCount: number): string {
  const deals = dealCount === 1 ? "1 of your saved deals" : `${dealCount} of your saved deals`;
  return `Market rents moved — ${deals} changed`;
}
