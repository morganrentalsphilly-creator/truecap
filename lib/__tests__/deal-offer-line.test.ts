/**
 * Tests for computeDealOfferLine — the "your number is $X" logic that powers
 * the Deal Watchlist line on the My Deals list. It must never crash, never
 * invent a number, and always agree with the underlying MAO solver.
 */
import { describe, expect, it } from "vitest";
import { computeDealOfferLine } from "@/lib/deal-offer-line";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { buildMaoTarget } from "@/lib/mao-targets";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

function box(partial: Partial<NamedBuyBox>): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    id: "b1",
    name: "Test box",
    strategyKind: null,
    isDefault: true,
    sortOrder: 0,
    isActive: true,
    ...partial,
  };
}

const deal = SAMPLE_DEAL_VALUES as InvestmentFormValues;

describe("computeDealOfferLine", () => {
  it("with no buy boxes: falls back to the default target and returns a clears/cut line, no fit", () => {
    const r = computeDealOfferLine(deal, []);
    expect(r.fit).toBeNull();
    expect(r.personalLine).toBeNull();
    // Default target (break-even CF + DSCR 1.25) still yields an offer line.
    expect(r.offer).not.toBeNull();
    expect(["cut", "clears"]).toContain(r.offer!.kind);
  });

  it("a deal that MISSES an aggressive cap-rate box returns a 'cut' line below asking", () => {
    // Demand a cap rate the sample deal cannot hit at asking → must cut price.
    const r = computeDealOfferLine(deal, [box({ minCapRatePct: 20 })]);
    expect(r.fit?.passingCount).toBe(0); // misses the (only) box
    expect(r.offer?.kind).toBe("cut");
    if (r.offer?.kind === "cut") {
      expect(r.offer.maxPrice).toBeLessThan(deal.purchasePrice as number);
      expect(r.offer.asking).toBe(deal.purchasePrice);
      expect(r.offer.discountPct).toBeGreaterThan(0);
    }
    // personalLine names the gap.
    expect(r.personalLine).toMatch(/Cap rate/i);
  });

  it("the 'cut' maxPrice matches the MAO solver for the same target (no divergence)", () => {
    const b = box({ minCapRatePct: 20 });
    const r = computeDealOfferLine(deal, [b]);
    const target = buildMaoTarget(b, { isCashPurchase: false });
    const solved = calculateMaxAllowableOffer(deal, target);
    expect(r.offer?.kind).toBe("cut");
    if (r.offer?.kind === "cut") expect(r.offer.maxPrice).toBe(solved?.maxPrice);
  });

  it("a deal that PASSES a lenient box returns 'clears', all-pass fit", () => {
    // A box the sample deal easily clears (very low bars).
    const r = computeDealOfferLine(deal, [box({ minCapRatePct: 1, minCashFlowMonthly: -9999 })]);
    expect(r.fit?.anyPass).toBe(true);
    expect(r.offer?.kind).toBe("clears");
  });

  it("owned/closed deal (not shopping): no offer line, but fit still computes", () => {
    const r = computeDealOfferLine(deal, [box({ minCapRatePct: 20 })], { isShoppingStage: false });
    expect(r.offer).toBeNull();
    expect(r.fit).not.toBeNull(); // you still see whether it passed
  });

  it("an unparseable snapshot never throws — returns all-null", () => {
    const garbage = { propertyType: "single-family" } as unknown as InvestmentFormValues;
    const r = computeDealOfferLine(garbage, [box({ minCapRatePct: 8 })]);
    expect(r.offer).toBeNull();
    expect(r.fit).toBeNull();
  });
});
