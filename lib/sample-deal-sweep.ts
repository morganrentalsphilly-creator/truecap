/**
 * The sample deal at every price the homepage's "drag the price" sheet can
 * show (OVERHAUL.md §6.1): from about $20,000 below the Offer Ceiling to about
 * $20,000 above asking, in $1,000 steps. Each point runs the same
 * `calculateAnalysis()` the ledger and the app use, with the sample fixture at
 * that price, so the hero never interpolates and never types a number. It is
 * computed on the server at build time and handed to the client island as a
 * compact array; no engine code reaches the browser.
 *
 * lib/__tests__/sample-deal-sweep.test.ts pins that the points at asking and
 * at the ceiling equal `calculateSampleDealOutcome()` exactly, and that
 * "meets" flips exactly at the engine's ceiling.
 */

import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";

export const SWEEP_STEP = 1_000;
const MARGIN = 20_000;

export type SweepPoint = {
  /** Purchase price, a multiple of SWEEP_STEP. */
  price: number;
  /** Cash flow after reserves, per month (engine `netCashFlow`). */
  cashFlow: number;
  dscr: number;
  /** Cash-on-cash return, percent. */
  coc: number;
  /** Cap rate, percent. */
  capRate: number;
  /** Whether the price clears every target in the sample Buy Box. */
  meets: boolean;
  /** The mortgage out, per month: principal and interest plus any mortgage insurance. */
  mortgage: number;
  /**
   * Everything else out, per month: vacancy, property tax, insurance,
   * maintenance, management, the capex reserve and any other operating cost,
   * so that rent − mortgage − operating = cash flow after reserves.
   */
  operating: number;
};

export type SampleDealSweep = {
  points: SweepPoint[];
  low: number;
  high: number;
  step: number;
  asking: number;
  ceiling: number;
  target: { monthlyCashFlow: number | null; dscr: number | null };
};

/** The sample Buy Box's pass check, the same test sample-deal-ledger.ts applies. */
export function meetsSampleTargets(result: AnalysisResult): boolean {
  const target = SAMPLE_DEAL_FIXTURE.maoTarget;
  if (target.monthlyCashFlow != null && result.netCashFlow < target.monthlyCashFlow) return false;
  if (target.dscr != null && result.dscr < target.dscr) return false;
  return true;
}

function point(price: number): SweepPoint {
  const r = calculateAnalysis({ ...SAMPLE_DEAL_FIXTURE.values, purchasePrice: price });
  const mortgage = r.monthlyPayment + r.pmiMonthly;
  return {
    price,
    cashFlow: r.netCashFlow,
    dscr: r.dscr,
    coc: r.cocReturn,
    capRate: r.capRate,
    meets: meetsSampleTargets(r),
    mortgage,
    // The engine's own identity, so the schematic's three flows foot to its
    // cash flow at every price (lib/__tests__/sample-deal-sweep.test.ts).
    operating: r.monthlyRentalIncome - mortgage - r.netCashFlow,
  };
}

export function buildSampleDealSweep(): SampleDealSweep | null {
  const { maxOffer } = calculateSampleDealOutcome();
  if (!maxOffer) return null;
  const asking = SAMPLE_DEAL_FIXTURE.values.purchasePrice;
  const ceiling = maxOffer.maxPrice;
  const low = Math.floor((ceiling - MARGIN) / SWEEP_STEP) * SWEEP_STEP;
  const high = Math.ceil((asking + MARGIN) / SWEEP_STEP) * SWEEP_STEP;
  const points: SweepPoint[] = [];
  for (let price = low; price <= high; price += SWEEP_STEP) points.push(point(price));
  // Asking and the ceiling are always exact points, whatever the step: the
  // engine's ceiling is a whole-thousand price, and asking is too, but a
  // future fixture may not be, so insert them when the grid misses them.
  for (const exact of [asking, ceiling]) {
    if (!points.some((p) => p.price === exact)) {
      points.push(point(exact));
    }
  }
  points.sort((a, b) => a.price - b.price);
  const target = SAMPLE_DEAL_FIXTURE.maoTarget;
  return {
    points,
    low: points[0].price,
    high: points[points.length - 1].price,
    step: SWEEP_STEP,
    asking,
    ceiling,
    target: { monthlyCashFlow: target.monthlyCashFlow ?? null, dscr: target.dscr ?? null },
  };
}

/**
 * The compact form the client island receives: a tuple per point, rounded to
 * what the sheet prints (whole dollars, two decimals of DSCR, one of CoC), so
 * the payload stays a few hundred bytes. The two out-flows (mortgage,
 * operating) were added for the schematic's live figures; they sit at the
 * end and are optional on the type, so a payload without them (an older
 * build's HTML hydrating against a newer island) still decodes and the
 * schematic simply shows no figure on those flows.
 */
export type CompactSweepPoint = [
  price: number,
  cashFlow: number,
  dscr: number,
  coc: number,
  meets: 0 | 1,
  mortgage?: number,
  operating?: number,
];

export function compactSweep(sweep: SampleDealSweep): CompactSweepPoint[] {
  return sweep.points.map((p) => [
    p.price,
    Math.round(p.cashFlow),
    Math.round(p.dscr * 100) / 100,
    Math.round(p.coc * 10) / 10,
    p.meets ? 1 : 0,
    Math.round(p.mortgage),
    Math.round(p.operating),
  ]);
}
