/**
 * Owned-equity row + series helpers.
 *
 * Two jobs, both pure (no IO, client-safe, unit-tested):
 *
 * 1. `computeRowEquity` / `resolveOwnedEquityBasis` — derive an owned deal's
 *    equity inputs from a saved_analyses row (close_date + its own saved
 *    financing/appreciation assumptions). Extracted from
 *    app/dashboard/saved-analyses/page.tsx so the dashboard home, My Deals,
 *    and any future surface share ONE definition of "this deal's equity" —
 *    behavior identical to the original.
 *
 * 2. `buildOwnedEquitySeries` — the month-by-month equity growth curve since
 *    the EARLIEST close date, portfolio-summed and decomposed into
 *    down payment + principal paid + appreciation. Derived entirely from
 *    computeOwnedEquity (the same amortization/appreciation math every other
 *    equity readout uses) — no new financial assumptions.
 */

import { calculateAnalysis } from "@/lib/calc-analysis";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import {
  computeOwnedEquity,
  monthsOwnedBetween,
  type OwnedEquityInput,
  type OwnedEquitySummary,
} from "@/lib/owned-equity";

/** The minimal slice of a saved_analyses row the equity math needs. */
export type OwnedEquityRowLike = {
  is_completed: boolean | null;
  /** Owned-deal close date (optional; ships in a later migration). */
  close_date?: string | null;
  form_snapshot?: unknown;
};

/** A deal's equity inputs + when the clock started. Feed to the series builder. */
export type OwnedDealEquityBasis = {
  input: OwnedEquityInput;
  closeDate: Date;
};

/**
 * Parse an owned deal's equity basis from its row. Returns null unless the
 * deal is completed, has a parseable close date, and its snapshot validates —
 * so equity UI stays hidden until there's a real number to show.
 */
export function resolveOwnedEquityBasis(row: OwnedEquityRowLike): OwnedDealEquityBasis | null {
  if (!row.is_completed || !row.close_date) return null;
  const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
  if (!values) return null;
  const closed = new Date(row.close_date);
  if (Number.isNaN(closed.getTime())) return null;
  const result = calculateAnalysis(values);
  return {
    closeDate: closed,
    input: {
      purchasePrice: values.purchasePrice ?? 0,
      loanAmount: result.loanAmount ?? 0,
      annualRatePct: values.interestRate ?? 0,
      termYears: values.loanTermYears ?? 30,
      appreciationRatePct: values.appreciationRatePct ?? 0,
    },
  };
}

/**
 * Estimate today's equity for an OWNED deal from its close date + its own saved
 * financing/appreciation assumptions. Returns null unless the deal is completed,
 * has a close date, and its snapshot validates — so the equity UI stays hidden
 * until there's a real number to show. (Moved verbatim from the My Deals page.)
 */
export function computeRowEquity(
  row: OwnedEquityRowLike,
  asOf: Date = new Date(),
): OwnedEquitySummary | null {
  const basis = resolveOwnedEquityBasis(row);
  if (!basis) return null;
  return computeOwnedEquity(basis.input, monthsOwnedBetween(basis.closeDate, asOf));
}

export type OwnedEquitySeriesPoint = {
  /** ISO yyyy-mm-01 month marker for the point (chart x-axis). */
  month: string;
  /** Sum of down payments across deals owned by this point. */
  downPayment: number;
  /** Sum of principal paid down across deals owned by this point. */
  principalPaid: number;
  /** Sum of appreciation gains across deals owned by this point. */
  appreciationGain: number;
  /** downPayment + principalPaid + appreciationGain (engine identity). */
  equity: number;
  /** How many deals had closed (i.e. contribute) by this point. */
  dealCount: number;
};

/**
 * Cap the point count so a decades-old close date can't emit an unbounded
 * series — beyond this we stride-sample months (always keeping the endpoint).
 */
const MAX_SERIES_POINTS = 240;

/**
 * Portfolio equity growth, one point per month from the EARLIEST close date to
 * `asOf`. Each deal joins the sum at its own close month (a visible step-up of
 * its down payment — new property, new equity). The final point evaluates every
 * deal at `asOf` exactly, so the curve's endpoint always agrees with the
 * "today" equity readouts (computeRowEquity / the rollup tiles).
 */
export function buildOwnedEquitySeries(
  deals: OwnedDealEquityBasis[],
  asOf: Date = new Date(),
): OwnedEquitySeriesPoint[] {
  const usable = deals.filter(
    (d) => d.input.purchasePrice > 0 && !Number.isNaN(d.closeDate.getTime()),
  );
  if (usable.length === 0) return [];

  const earliest = usable.reduce((a, b) => (a.closeDate <= b.closeDate ? a : b)).closeDate;
  const totalMonths = monthsOwnedBetween(earliest, asOf);
  // Month offset of each deal's close relative to the earliest close — whole
  // months (same flooring as every other monthsOwned figure), so a deal joins
  // the curve at the monthly point nearest its close.
  const offsets = usable.map((d) => monthsOwnedBetween(earliest, d.closeDate));

  const stride = Math.max(1, Math.ceil((totalMonths + 1) / MAX_SERIES_POINTS));
  const indices: number[] = [];
  for (let i = 0; i <= totalMonths; i += stride) indices.push(i);
  if (indices[indices.length - 1] !== totalMonths) indices.push(totalMonths);

  const y0 = earliest.getUTCFullYear();
  const m0 = earliest.getUTCMonth();

  return indices.map((i) => {
    let downPayment = 0;
    let principalPaid = 0;
    let appreciationGain = 0;
    let equity = 0;
    let dealCount = 0;
    usable.forEach((deal, idx) => {
      const offset = offsets[idx]!;
      if (i < offset) return; // not owned yet at this point in time
      // Endpoint uses the true as-of months so the last point matches the
      // "today" equity tiles exactly (interior points step in whole months).
      const months = i === totalMonths ? monthsOwnedBetween(deal.closeDate, asOf) : i - offset;
      const summary = computeOwnedEquity(deal.input, months);
      if (!summary) return;
      downPayment += summary.downPayment;
      principalPaid += summary.principalPaid;
      appreciationGain += summary.appreciationGain;
      equity += summary.equity;
      dealCount += 1;
    });
    // Day pinned to the 1st: this is a month marker for the x-axis, and day-31
    // close dates would otherwise roll over into the wrong month.
    const month = new Date(Date.UTC(y0, m0 + i, 1)).toISOString().slice(0, 10);
    return { month, downPayment, principalPaid, appreciationGain, equity, dealCount };
  });
}
