import { describe, expect, it } from "vitest";

import { nextActionForDeal, nextActionFromVerdict } from "../next-action";

describe("nextActionForDeal", () => {
  it("flags negative cash flow as a blocker first (even if the buy box also misses)", () => {
    const a = nextActionForDeal({ netCashFlow: -120, dscr: 0.9, monthlyPayment: 1400, meetsBuyBox: false });
    expect(a.tone).toBe("blocked");
    expect(a.label).toMatch(/lower your offer|raise rent/i);
  });

  it("flags DSCR under 1.0 as a blocker when cash flow is positive", () => {
    const a = nextActionForDeal({ netCashFlow: 50, dscr: 0.95, monthlyPayment: 1400 });
    expect(a.tone).toBe("blocked");
    expect(a.label).toMatch(/financing/i);
  });

  it("flags a buy-box miss for review", () => {
    const a = nextActionForDeal({ netCashFlow: 300, dscr: 1.4, monthlyPayment: 1400, meetsBuyBox: false });
    expect(a.tone).toBe("review");
    expect(a.label).toMatch(/buy box/i);
  });

  it("flags DSCR below the 1.25 lender bar for review", () => {
    const a = nextActionForDeal({ netCashFlow: 100, dscr: 1.1, monthlyPayment: 1400, meetsBuyBox: true });
    expect(a.tone).toBe("review");
    expect(a.label).toMatch(/DSCR financing/i);
  });

  it("tells a strong deal that meets the buy box to make the offer", () => {
    const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true });
    expect(a.tone).toBe("ready");
    expect(a.label).toMatch(/make your offer/i);
  });

  it("a strong deal with no buy box set still says make the offer", () => {
    const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: null });
    expect(a.tone).toBe("ready");
    expect(a.label).toMatch(/make your offer/i);
  });

  it("handles a cash purchase — ignores DSCR, judges on cash flow", () => {
    const ready = nextActionForDeal({ netCashFlow: 600, monthlyPayment: 0, dscr: 0 });
    expect(ready.tone).toBe("ready");
    const blocked = nextActionForDeal({ netCashFlow: -50, monthlyPayment: 0 });
    expect(blocked.tone).toBe("blocked");
  });
});

describe("nextActionFromVerdict", () => {
  it("flags negative cash flow as a blocker", () => {
    expect(nextActionFromVerdict({ recommendation: "Buy", netCashFlow: -50 }).tone).toBe("blocked");
  });
  it("tells an Avoid deal to pass or restructure", () => {
    const a = nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: 100 });
    expect(a.tone).toBe("blocked");
    expect(a.label).toMatch(/pass|restructure/i);
  });
  it("flags a buy-box miss for review", () => {
    const a = nextActionFromVerdict({ recommendation: "Buy", netCashFlow: 200, meetsBuyBox: false });
    expect(a.tone).toBe("review");
    expect(a.label).toMatch(/buy box/i);
  });
  it("routes Risky and Neutral verdicts to review", () => {
    expect(nextActionFromVerdict({ recommendation: "Risky", netCashFlow: 50 }).tone).toBe("review");
    expect(nextActionFromVerdict({ recommendation: "Neutral", netCashFlow: 50 }).tone).toBe("review");
  });
  it("tells a Strong Buy with positive cash flow to make the offer", () => {
    const a = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400 });
    expect(a.tone).toBe("ready");
    expect(a.label).toMatch(/make your offer/i);
  });
});
