import type { ExitScenarioYear } from "@/lib/exit-scenarios";

/**
 * Return-transparency helpers. A headline "10-yr ROI" of, say, +992% is a
 * CUMULATIVE figure and easy to misread, so we also expose the equity
 * multiple, the annualized CAGR, and a true IRR computed from the year-by-year
 * cash-flow timeline (interim cash flow + tax benefit each year, with the sale
 * landing in the final year). All derived from the exit-scenario series the
 * engine already produces — no new inputs.
 */

export interface ReturnSummary {
  /** Initial cash in (down payment + closing costs), derived from the series. */
  cashInvested: number;
  /** Cumulative profit at the modeled exit year. */
  totalProfit: number;
  /** totalProfit / cashInvested × 100 (cumulative, not annual). */
  roiPct: number | null;
  /** Total distributions ÷ cash invested (e.g. 2.0× = doubled your money). */
  equityMultiple: number | null;
  /** Annualized total return: equityMultiple^(1/years) − 1, ×100. */
  cagrPct: number | null;
  /** True IRR over the cash-flow timeline (null when not solvable). */
  irrPct: number | null;
  /** Estimated tax owed at sale (depreciation recapture + capital gains). */
  exitTax: number;
  /** Modeled hold length (years to the exit used). */
  years: number;
}

/**
 * IRR via bisection. `cashflows[0]` is t0 (typically negative — the cash in);
 * each subsequent entry is one period. Returns the rate as a percent, or null
 * when there is no sign change (no real IRR) or it can't be bracketed.
 */
export function computeIrr(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  const npv = (rate: number): number =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);

  let lo = -0.9999; // just above -100%
  let hi = 10; // 1000% upper bound
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return null; // root not bracketed in range

  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) return mid * 100;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return ((lo + hi) / 2) * 100;
}

/**
 * Build a return summary from the exit-scenario years (uses the LAST year as
 * the exit). Cash invested is recovered from the identity
 * totalProfit = netSaleProceeds + cumCF + cumTax − cashInvested, so it always
 * matches the Total ROI card the engine renders.
 */
export function computeReturnSummaryFromExitYears(
  years: ExitScenarioYear[]
): ReturnSummary | null {
  if (!years || years.length === 0) return null;
  const sorted = [...years].sort((a, b) => a.year - b.year);
  const final = sorted[sorted.length - 1];
  const horizon = final.year;

  // Exit tax is netted into totalProfit by the engine, so it must be added
  // back here to recover cash invested from the identity (otherwise the tax
  // would inflate the apparent cash basis).
  const exitTax = final.exitTax ?? 0;
  const cashInvested =
    final.netSaleProceeds +
    final.cumulativeCashFlow +
    final.cumulativeTaxBenefit -
    exitTax -
    final.totalProfit;
  const totalProfit = final.totalProfit;

  if (!(cashInvested > 0)) {
    return {
      cashInvested: Math.max(0, cashInvested),
      totalProfit,
      roiPct: null,
      equityMultiple: null,
      cagrPct: null,
      irrPct: null,
      exitTax,
      years: horizon,
    };
  }

  const roiPct = (totalProfit / cashInvested) * 100;
  const totalDistributions = cashInvested + totalProfit; // netSale + cumCF + cumTax
  const equityMultiple = totalDistributions / cashInvested;
  const cagrPct = equityMultiple > 0 ? (Math.pow(equityMultiple, 1 / horizon) - 1) * 100 : null;

  // IRR timeline: t0 = −cashInvested; each year = operating + tax cash flow
  // (deltas of the cumulative series); the sale lands in the final year.
  const flows: number[] = [-cashInvested];
  let prevCum = 0;
  let prevTax = 0;
  for (const y of sorted) {
    const yearCf = y.cumulativeCashFlow - prevCum + (y.cumulativeTaxBenefit - prevTax);
    prevCum = y.cumulativeCashFlow;
    prevTax = y.cumulativeTaxBenefit;
    // The sale lands in the final year, net of the exit tax owed at sale.
    flows.push(yearCf + (y.year === final.year ? final.netSaleProceeds - exitTax : 0));
  }
  const irrPct = computeIrr(flows);

  return { cashInvested, totalProfit, roiPct, equityMultiple, cagrPct, irrPct, exitTax, years: horizon };
}
