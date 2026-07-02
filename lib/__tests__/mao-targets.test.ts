import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAO_TARGET,
  buildMaoTarget,
  buyBoxContributesToMaoTarget,
  buyBoxHasReturnTargets,
  describeMaoTarget,
} from "@/lib/mao-targets";
import { EMPTY_BUY_BOX, type BuyBoxCriteria } from "@/lib/buy-box";

const box = (overrides: Partial<BuyBoxCriteria>): BuyBoxCriteria => ({
  ...EMPTY_BUY_BOX,
  ...overrides,
});

describe("buildMaoTarget", () => {
  it("uses the canonical default basis when no buy box is given", () => {
    expect(buildMaoTarget(null, { isCashPurchase: false })).toEqual({
      monthlyCashFlow: 0,
      dscr: 1.25,
    });
    expect(buildMaoTarget(undefined, { isCashPurchase: false })).toEqual(DEFAULT_MAO_TARGET);
  });

  it("omits the DSCR target for cash purchases (dscr would unfailably fail at 0)", () => {
    expect(buildMaoTarget(null, { isCashPurchase: true })).toEqual({ monthlyCashFlow: 0 });
  });

  it("does not mutate the shared DEFAULT_MAO_TARGET when omitting dscr", () => {
    buildMaoTarget(null, { isCashPurchase: true });
    expect(DEFAULT_MAO_TARGET).toEqual({ monthlyCashFlow: 0, dscr: 1.25 });
  });

  it("prefers the user's buy-box return thresholds when set", () => {
    const target = buildMaoTarget(
      box({ minCapRatePct: 6, minCocPct: 7.5, minDscr: 1.2, minCashFlowMonthly: 150 }),
      { isCashPurchase: false }
    );
    expect(target).toEqual({ capRate: 6, cocReturn: 7.5, dscr: 1.2, monthlyCashFlow: 150 });
  });

  it("only maps the thresholds the box actually sets", () => {
    const target = buildMaoTarget(box({ minCashFlowMonthly: 200 }), { isCashPurchase: false });
    expect(target).toEqual({ monthlyCashFlow: 200 });
  });

  it("falls back to the default basis for a box with only price/type/market rules", () => {
    const target = buildMaoTarget(
      box({ maxPurchasePrice: 300_000, propertyTypes: ["single-family"], targetStates: ["PA"] }),
      { isCashPurchase: false }
    );
    expect(target).toEqual(DEFAULT_MAO_TARGET);
  });

  it("falls back to break-even cash flow for a DSCR-only box on a cash deal", () => {
    const target = buildMaoTarget(box({ minDscr: 1.3 }), { isCashPurchase: true });
    expect(target).toEqual({ monthlyCashFlow: 0 });
  });
});

describe("buyBoxHasReturnTargets", () => {
  it("is false when only non-return criteria are set", () => {
    expect(buyBoxHasReturnTargets(box({ maxPurchasePrice: 250_000 }))).toBe(false);
    expect(buyBoxHasReturnTargets(EMPTY_BUY_BOX)).toBe(false);
  });

  it("is true for any numeric return threshold", () => {
    expect(buyBoxHasReturnTargets(box({ minCapRatePct: 6 }))).toBe(true);
    expect(buyBoxHasReturnTargets(box({ minCashFlowMonthly: 0 }))).toBe(true);
  });

  it("treats an explicit $0 cash-flow floor as a set threshold", () => {
    const target = buildMaoTarget(box({ minCashFlowMonthly: 0 }), { isCashPurchase: false });
    expect(target).toEqual({ monthlyCashFlow: 0 });
  });
});

describe("describeMaoTarget", () => {
  it("labels the canonical default basis", () => {
    expect(describeMaoTarget(DEFAULT_MAO_TARGET)).toBe("break-even cash flow · DSCR ≥ 1.25");
  });

  it("labels the cash-purchase default basis", () => {
    expect(describeMaoTarget(buildMaoTarget(null, { isCashPurchase: true }))).toBe(
      "break-even cash flow"
    );
  });

  it("labels buy-box thresholds with signed money and units", () => {
    expect(
      describeMaoTarget({ monthlyCashFlow: 150, dscr: 1.2, capRate: 6, cocReturn: 7.5 })
    ).toBe("cash flow ≥ $150/mo · DSCR ≥ 1.2 · cap rate ≥ 6% · cash-on-cash ≥ 7.5%");
  });

  it("handles a negative cash-flow floor", () => {
    expect(describeMaoTarget({ monthlyCashFlow: -100 })).toBe("cash flow ≥ -$100/mo");
  });
});

describe("buyBoxContributesToMaoTarget (basis attribution)", () => {
  it("credits the box when it shapes the target", () => {
    expect(
      buyBoxContributesToMaoTarget({ minCocPct: 8 } as never, { isCashPurchase: false })
    ).toBe(true);
    expect(
      buyBoxContributesToMaoTarget({ minDscr: 1.3 } as never, { isCashPurchase: false })
    ).toBe(true);
  });

  it("does NOT credit a DSCR-only box on a cash purchase (its sole threshold is dropped)", () => {
    expect(
      buyBoxContributesToMaoTarget({ minDscr: 1.3 } as never, { isCashPurchase: true })
    ).toBe(false);
  });

  it("still credits a mixed box on a cash purchase (non-DSCR thresholds survive)", () => {
    expect(
      buyBoxContributesToMaoTarget({ minDscr: 1.3, minCocPct: 8 } as never, { isCashPurchase: true })
    ).toBe(true);
  });

  it("never credits a null/threshold-less box", () => {
    expect(buyBoxContributesToMaoTarget(null, { isCashPurchase: false })).toBe(false);
    expect(buyBoxContributesToMaoTarget({} as never, { isCashPurchase: false })).toBe(false);
  });
});
