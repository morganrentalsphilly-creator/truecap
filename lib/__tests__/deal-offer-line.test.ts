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

describe("the offer line never contradicts the buy-box verdict (audit regressions)", () => {
  // These are the cases the first version of this module got WRONG: it solved
  // against return thresholds only, so a deal that missed on market, property
  // type or budget could still be reported as clearing "your buy box".

  it("a deal in the WRONG STATE is never reported as clearing the box", () => {
    // Lenient returns (easily met) but the box only buys in Ohio; the sample
    // deal is not in Ohio.
    const b = box({ minCapRatePct: 1, minCashFlowMonthly: -9999, targetStates: ["OH"] });
    const r = computeDealOfferLine(deal, [b]);
    expect(r.fit?.anyPass).toBe(false);
    expect(r.offer?.kind).not.toBe("clears");
    // …and price can't fix a market miss, so no dollar figure is quoted.
    expect(r.offer?.kind).toBe("blocked");
    if (r.offer?.kind === "blocked") expect(r.offer.reasons.join()).toMatch(/market/i);
  });

  it("a deal of the WRONG PROPERTY TYPE reports blocked, not a price", () => {
    const b = box({
      minCapRatePct: 1,
      minCashFlowMonthly: -9999,
      propertyTypes: ["multi-family"],
    });
    const r = computeDealOfferLine(deal, [b]);
    expect(r.fit?.anyPass).toBe(false);
    expect(r.offer?.kind).toBe("blocked");
    if (r.offer?.kind === "blocked") expect(r.offer.reasons.join()).toMatch(/property type/i);
  });

  it("a box with NO return thresholds is never attributed as 'your buy box' math", () => {
    // Budget-only box the deal blows past. The number must be the box's own
    // cap, and it must NOT be silently solved from TrueCap's default target.
    const budget = (deal.purchasePrice as number) - 50_000;
    const b = box({ maxPurchasePrice: budget });
    const r = computeDealOfferLine(deal, [b]);
    expect(r.offer?.kind).toBe("cut");
    if (r.offer?.kind === "cut") {
      expect(r.offer.basis).toBe("buy-box");
      expect(r.offer.maxPrice).toBe(budget); // the user's cap, not a DSCR-1.25 solve
    }
  });

  it("the quoted number never exceeds the box's own budget cap", () => {
    // Returns are trivially satisfiable, so an uncapped solve would land far
    // above the budget. The budget must bind.
    const budget = 100_000;
    const b = box({ minCapRatePct: 1, maxPurchasePrice: budget });
    const r = computeDealOfferLine(deal, [b]);
    if (r.offer?.kind === "cut") expect(r.offer.maxPrice).toBeLessThanOrEqual(budget);
    if (r.offer?.kind === "clears" && r.offer.maxPrice != null) {
      expect(r.offer.maxPrice).toBeLessThanOrEqual(budget);
    }
  });

  it("whenever it says 'clears', the fit really does pass", () => {
    const boxes: NamedBuyBox[] = [
      box({ minCapRatePct: 1, minCashFlowMonthly: -9999 }),
      box({ minCapRatePct: 20 }),
      box({ maxPurchasePrice: 10_000 }),
      box({ minCapRatePct: 1, targetStates: ["OH"] }),
      box({ minCapRatePct: 1, propertyTypes: ["multi-family"] }),
    ];
    for (const b of boxes) {
      const r = computeDealOfferLine(deal, [b]);
      if (r.offer?.kind === "clears" && r.offer.basis === "buy-box") {
        expect(r.fit?.anyPass).toBe(true);
      }
    }
  });
});
