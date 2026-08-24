import { describe, expect, it } from "vitest";

import { nextActionForDeal, nextActionFromVerdict } from "../next-action";

describe("nextActionForDeal", () => {
  it("flags negative cash flow as a blocker first (even if the buy box also misses)", () => {
    const a = nextActionForDeal({ netCashFlow: -120, dscr: 0.9, monthlyPayment: 1400, meetsBuyBox: false });
    expect(a.tone).toBe("blocked");
    expect(a.label).toBe("Review price and rent assumptions");
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
    expect(a.label).toBe("Confirm written lender terms");
  });

  it("routes a strong deal that meets the buy box to verification", () => {
    const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true });
    expect(a.tone).toBe("ready");
    expect(a.label).toBe("Verify material assumptions");
  });

  it("routes a strong deal with no buy box to verification", () => {
    const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: null });
    expect(a.tone).toBe("ready");
    expect(a.label).toBe("Verify material assumptions");
  });

  it("handles a cash purchase — ignores DSCR, judges on cash flow", () => {
    const ready = nextActionForDeal({ netCashFlow: 600, monthlyPayment: 0, dscr: 0 });
    expect(ready.tone).toBe("ready");
    const blocked = nextActionForDeal({ netCashFlow: -50, monthlyPayment: 0 });
    expect(blocked.tone).toBe("blocked");
  });

  describe("pipeline-stage awareness", () => {
    it("no stage → byte-identical to today's output (backward compat snapshot)", () => {
      expect(nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true })).toEqual({
        label: "Verify material assumptions",
        reason: "the modeled economics meet your Buy Box; evidence is still separate",
        tone: "ready",
      });
      expect(nextActionForDeal({ netCashFlow: -120, dscr: 0.9, monthlyPayment: 1400, meetsBuyBox: false })).toEqual({
        label: "Review price and rent assumptions",
        reason: "cash flow is negative at these assumptions",
        tone: "blocked",
      });
    });

    it("shopping stages (researching / analyzing) match the no-stage output exactly", () => {
      const inputs = [
        { netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true },
        { netCashFlow: -120, dscr: 0.9, monthlyPayment: 1400, meetsBuyBox: false },
        { netCashFlow: 100, dscr: 1.1, monthlyPayment: 1400, meetsBuyBox: true },
        { netCashFlow: 300, dscr: 1.4, monthlyPayment: 1400, meetsBuyBox: false },
      ] as const;
      for (const input of inputs) {
        const base = nextActionForDeal(input);
        expect(nextActionForDeal({ ...input, stage: "researching" })).toEqual(base);
        expect(nextActionForDeal({ ...input, stage: "analyzing" })).toEqual(base);
        expect(nextActionForDeal({ ...input, stage: undefined })).toEqual(base);
      }
    });

    it("closed → track your equity, regardless of the underwrite", () => {
      const good = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, stage: "closed" });
      const bad = nextActionForDeal({ netCashFlow: -200, dscr: 0.8, monthlyPayment: 1400, stage: "closed" });
      for (const a of [good, bad]) {
        expect(a.tone).toBe("ready");
        expect(a.label).toBe("Track your equity");
        expect(a.reason).toMatch(/closed/i);
      }
    });

    it("closed WITHOUT a close date → instructs adding one; WITH one → never does", () => {
      const without = nextActionForDeal({ netCashFlow: 400, stage: "closed", hasCloseDate: false });
      expect(without.reason).toMatch(/add a close date/i);
      // With the date recorded, the banner must not instruct adding what's
      // already added (it renders directly above the equity card showing it).
      const withDate = nextActionForDeal({ netCashFlow: 400, stage: "closed", hasCloseDate: true });
      expect(withDate.label).toBe("Track your equity");
      expect(withDate.reason).not.toMatch(/add a close date/i);
      expect(withDate.reason).toMatch(/equity/i);
    });

    it("passed → revisit if the price drops, regardless of the underwrite", () => {
      const good = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, stage: "passed" });
      const bad = nextActionForDeal({ netCashFlow: -200, dscr: 0.8, monthlyPayment: 1400, stage: "passed" });
      for (const a of [good, bad]) {
        expect(a.tone).toBe("review");
        expect(a.label).toBe("Revisit if the price drops");
        expect(a.reason).toMatch(/passed/i);
      }
    });

    it("offer stage rephrases a blocker as renegotiate/withdraw, keeping the numeric reason", () => {
      const a = nextActionForDeal({ netCashFlow: -120, dscr: 0.9, monthlyPayment: 1400, stage: "offer" });
      expect(a.tone).toBe("blocked");
      expect(a.label).toBe("Renegotiate or withdraw your offer");
      expect(a.reason).toBe("cash flow is negative at these assumptions");
    });

    it("offer stage tells a ready deal to follow up, not to make the offer again", () => {
      const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true, stage: "offer" });
      expect(a.tone).toBe("ready");
      expect(a.label).toBe("Follow up on your offer");
    });

    it("negotiating stage keeps the advice aligned with the live terms", () => {
      const blocked = nextActionForDeal({ netCashFlow: -120, stage: "negotiating" });
      expect(blocked).toEqual({
        label: "Verify the Offer Ceiling before renegotiating",
        reason: "cash flow is negative at these assumptions",
        tone: "blocked",
      });
      const ready = nextActionForDeal({
        netCashFlow: 400,
        dscr: 1.5,
        monthlyPayment: 1400,
        meetsBuyBox: true,
        stage: "negotiating",
      });
      expect(ready.label).toBe("Finalize the negotiated terms");
      expect(ready.tone).toBe("ready");
    });

    it("under contract rephrases a blocker around the contingency window", () => {
      const a = nextActionForDeal({ netCashFlow: 50, dscr: 0.95, monthlyPayment: 1400, stage: "under_contract" });
      expect(a.tone).toBe("blocked");
      expect(a.label).toBe("Renegotiate before your contingencies expire");
      expect(a.reason).toBe("DSCR is under 1.0 — rent doesn't cover the debt");
    });

    it("under contract routes a ready deal to the due-diligence checklist", () => {
      const a = nextActionForDeal({ netCashFlow: 400, dscr: 1.5, monthlyPayment: 1400, meetsBuyBox: true, stage: "under_contract" });
      expect(a.tone).toBe("ready");
      expect(a.label).toBe("Work your due-diligence checklist");
    });

    it("review-tone advice (buy box, lender bar) passes through unchanged at offer/under contract", () => {
      const buyBoxMiss = { netCashFlow: 300, dscr: 1.4, monthlyPayment: 1400, meetsBuyBox: false } as const;
      const belowBar = { netCashFlow: 100, dscr: 1.1, monthlyPayment: 1400, meetsBuyBox: true } as const;
      expect(nextActionForDeal({ ...buyBoxMiss, stage: "offer" })).toEqual(nextActionForDeal(buyBoxMiss));
      expect(nextActionForDeal({ ...belowBar, stage: "under_contract" })).toEqual(nextActionForDeal(belowBar));
    });
  });
});

describe("nextActionFromVerdict", () => {
  it("flags negative cash flow as a blocker", () => {
    expect(nextActionFromVerdict({ recommendation: "Buy", netCashFlow: -50 }).tone).toBe("blocked");
  });
  it("routes an Avoid result to review of the failed economics", () => {
    const a = nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: 100 });
    expect(a.tone).toBe("blocked");
    expect(a.label).toBe("Review the failed economics");
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
  it("routes a Strong Buy with positive cash flow to verification", () => {
    const a = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400 });
    expect(a.tone).toBe("ready");
    expect(a.label).toBe("Verify material assumptions");
  });

  describe("pipeline-stage awareness", () => {
    it("no stage → byte-identical to today's output (backward compat snapshot)", () => {
      expect(nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400 })).toEqual({
        label: "Verify material assumptions",
        reason: "the Screening Index is positive, but it does not record a decision",
        tone: "ready",
      });
      expect(nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: 100 })).toEqual({
        label: "Review the failed economics",
        reason: "the numbers don't support it as entered",
        tone: "blocked",
      });
    });

    it("shopping stages (researching / analyzing) match the no-stage output exactly", () => {
      const inputs = [
        { recommendation: "Strong Buy", netCashFlow: 400 },
        { recommendation: "Avoid", netCashFlow: 100 },
        { recommendation: "Risky", netCashFlow: 50 },
        { recommendation: "Buy", netCashFlow: 200, meetsBuyBox: false },
      ] as const;
      for (const input of inputs) {
        const base = nextActionFromVerdict(input);
        expect(nextActionFromVerdict({ ...input, stage: "researching" })).toEqual(base);
        expect(nextActionFromVerdict({ ...input, stage: "analyzing" })).toEqual(base);
        expect(nextActionFromVerdict({ ...input, stage: undefined })).toEqual(base);
      }
    });

    it("closed → track your equity, matching nextActionForDeal's copy", () => {
      const a = nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: -200, stage: "closed" });
      expect(a).toEqual(nextActionForDeal({ netCashFlow: -200, stage: "closed" }));
      expect(a.label).toBe("Track your equity");
      expect(a.tone).toBe("ready");
    });

    it("passed → revisit if the price drops, matching nextActionForDeal's copy", () => {
      const a = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400, stage: "passed" });
      expect(a).toEqual(nextActionForDeal({ netCashFlow: 400, stage: "passed" }));
      expect(a.label).toBe("Revisit if the price drops");
      expect(a.tone).toBe("review");
    });

    it("offer stage rephrases blockers and the ready path", () => {
      const blocked = nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: 100, stage: "offer" });
      expect(blocked.tone).toBe("blocked");
      expect(blocked.label).toBe("Renegotiate or withdraw your offer");
      expect(blocked.reason).toBe("the numbers don't support it as entered");
      const ready = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400, stage: "offer" });
      expect(ready.tone).toBe("ready");
      expect(ready.label).toBe("Follow up on your offer");
    });

    it("negotiating stage rephrases blockers and the ready path", () => {
      const blocked = nextActionFromVerdict({ recommendation: "Avoid", netCashFlow: 100, stage: "negotiating" });
      expect(blocked.label).toBe("Verify the Offer Ceiling before renegotiating");
      const ready = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400, stage: "negotiating" });
      expect(ready.label).toBe("Finalize the negotiated terms");
    });

    it("under contract rephrases blockers and routes ready deals to due diligence", () => {
      const blocked = nextActionFromVerdict({ recommendation: "Buy", netCashFlow: -50, stage: "under_contract" });
      expect(blocked.tone).toBe("blocked");
      expect(blocked.label).toBe("Renegotiate before your contingencies expire");
      expect(blocked.reason).toBe("cash flow is negative");
      const ready = nextActionFromVerdict({ recommendation: "Strong Buy", netCashFlow: 400, stage: "under_contract" });
      expect(ready.tone).toBe("ready");
      expect(ready.label).toBe("Work your due-diligence checklist");
    });

    it("review-tone advice (Risky / Neutral / buy-box miss) passes through unchanged at offer/under contract", () => {
      const risky = { recommendation: "Risky", netCashFlow: 50 } as const;
      const neutral = { recommendation: "Neutral", netCashFlow: 50 } as const;
      const buyBoxMiss = { recommendation: "Buy", netCashFlow: 200, meetsBuyBox: false } as const;
      expect(nextActionFromVerdict({ ...risky, stage: "offer" })).toEqual(nextActionFromVerdict(risky));
      expect(nextActionFromVerdict({ ...neutral, stage: "under_contract" })).toEqual(nextActionFromVerdict(neutral));
      expect(nextActionFromVerdict({ ...buyBoxMiss, stage: "offer" })).toEqual(nextActionFromVerdict(buyBoxMiss));
    });
  });
});
