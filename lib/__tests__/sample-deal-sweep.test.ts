import { describe, expect, it } from "vitest";

import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { buildSampleDealLedger } from "@/lib/sample-deal-ledger";
import { buildSampleDealSweep, compactSweep, SWEEP_STEP } from "@/lib/sample-deal-sweep";

/**
 * The homepage's "drag the price" sheet reads its figures from this sweep
 * (OVERHAUL.md §6.1). These cases pin the two promises the brief makes: the
 * points at asking and at the Offer Ceiling are the engine's own outcome, to
 * the cent, and "meets" flips exactly at the engine's ceiling, so the handle
 * can never claim a price the solver would refuse.
 */
describe("the sample deal price sweep", () => {
  const sweep = buildSampleDealSweep()!;
  const { analysis, maxOffer } = calculateSampleDealOutcome();
  const ledger = buildSampleDealLedger()!;

  it("exists and runs in $1,000 steps from below the ceiling to above asking", () => {
    expect(sweep).not.toBeNull();
    expect(sweep.step).toBe(SWEEP_STEP);
    expect(sweep.low).toBeLessThan(sweep.ceiling);
    expect(sweep.high).toBeGreaterThan(sweep.asking);
    expect(sweep.ceiling - sweep.low).toBeGreaterThanOrEqual(19_000);
    expect(sweep.high - sweep.asking).toBeGreaterThanOrEqual(19_000);
    for (let i = 1; i < sweep.points.length; i += 1) {
      expect(sweep.points[i].price - sweep.points[i - 1].price).toBeLessThanOrEqual(SWEEP_STEP);
      expect(sweep.points[i].price).toBeGreaterThan(sweep.points[i - 1].price);
    }
  });

  it("equals calculateSampleDealOutcome() at asking and at the ceiling", () => {
    const atAsking = sweep.points.find((p) => p.price === sweep.asking)!;
    const atCeiling = sweep.points.find((p) => p.price === sweep.ceiling)!;
    expect(atAsking).toBeDefined();
    expect(atCeiling).toBeDefined();
    expect(sweep.asking).toBe(ledger.askingPrice);
    expect(sweep.ceiling).toBe(maxOffer!.maxPrice);
    expect(atAsking.cashFlow).toBe(analysis.netCashFlow);
    expect(atAsking.dscr).toBe(analysis.dscr);
    expect(atAsking.coc).toBe(analysis.cocReturn);
    expect(atAsking.capRate).toBe(analysis.capRate);
    expect(atCeiling.cashFlow).toBe(maxOffer!.achieved.netCashFlow);
    expect(atCeiling.dscr).toBe(maxOffer!.achieved.dscr);
    expect(atCeiling.coc).toBe(maxOffer!.achieved.cocReturn);
    expect(atCeiling.capRate).toBe(maxOffer!.achieved.capRate);
    expect(atAsking.meets).toBe(ledger.meetsTargets.asking);
    expect(atCeiling.meets).toBe(ledger.meetsTargets.ceiling);
  });

  it("flips 'meets' exactly at the engine's ceiling", () => {
    const i = sweep.points.findIndex((p) => p.price === sweep.ceiling);
    expect(sweep.points[i].meets).toBe(true);
    expect(sweep.points[i + 1].meets).toBe(false);
    // Every price at or below the ceiling meets; every price above misses:
    // the Buy Box is monotone in price for this fixture.
    for (const p of sweep.points) expect(p.meets).toBe(p.price <= sweep.ceiling);
  });

  it("compacts to what the sheet prints, without losing the flip", () => {
    const compact = compactSweep(sweep);
    expect(compact).toHaveLength(sweep.points.length);
    const [price, cashFlow, dscr, coc, meets] = compact.find(([p]) => p === sweep.ceiling)!;
    expect(price).toBe(sweep.ceiling);
    expect(cashFlow).toBe(Math.round(maxOffer!.achieved.netCashFlow));
    expect(dscr).toBe(Math.round(maxOffer!.achieved.dscr * 100) / 100);
    expect(coc).toBe(Math.round(maxOffer!.achieved.cocReturn * 10) / 10);
    expect(meets).toBe(1);
    expect(JSON.stringify(compact).length).toBeLessThan(4_000);
  });
});
