import { describe, expect, it } from "vitest";
import {
  EMPTY_BUY_BOX,
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBox,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxCriteria,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";

const baseMetrics: BuyBoxDealMetrics = {
  capRatePct: 7,
  cocPct: 9,
  dscr: 1.4,
  cashFlowMonthly: 350,
  purchasePrice: 250_000,
  propertyType: "single-family",
  state: "PA",
  isCashPurchase: false,
};

const fullCriteria: BuyBoxCriteria = {
  minCapRatePct: 6,
  minCocPct: 8,
  minDscr: 1.25,
  minCashFlowMonthly: 200,
  maxPurchasePrice: 300_000,
  propertyTypes: ["single-family", "multi-family"],
  targetStates: ["PA", "OH"],
  isActive: true,
};

describe("buyBoxHasCriteria", () => {
  it("is false for the empty box", () => {
    expect(buyBoxHasCriteria(EMPTY_BUY_BOX)).toBe(false);
  });
  it("is true when any single dimension is set", () => {
    expect(buyBoxHasCriteria({ ...EMPTY_BUY_BOX, minDscr: 1.2 })).toBe(true);
    expect(buyBoxHasCriteria({ ...EMPTY_BUY_BOX, targetStates: ["TX"] })).toBe(true);
  });
});

describe("evaluateBuyBox", () => {
  it("passes when every applicable check is met", () => {
    const r = evaluateBuyBox(fullCriteria, baseMetrics);
    expect(r.active).toBe(true);
    expect(r.passes).toBe(true);
    expect(r.failedCount).toBe(0);
    expect(r.passedCount).toBe(7);
    expect(r.failedLabels).toEqual([]);
  });

  it("fails and reports the missed dimensions", () => {
    const r = evaluateBuyBox(fullCriteria, {
      ...baseMetrics,
      capRatePct: 4, // below 6
      dscr: 1.1, // below 1.25
    });
    expect(r.passes).toBe(false);
    expect(r.failedCount).toBe(2);
    expect(r.failedLabels).toContain("Cap rate");
    expect(r.failedLabels).toContain("DSCR");
  });

  it("only produces checks for criteria that are set", () => {
    const r = evaluateBuyBox({ ...EMPTY_BUY_BOX, minCapRatePct: 6 }, baseMetrics);
    expect(r.checks).toHaveLength(1);
    expect(r.checks[0]!.id).toBe("capRate");
    expect(r.passes).toBe(true);
  });

  it("treats DSCR as N/A (not a fail) for cash purchases", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minDscr: 1.25 },
      { ...baseMetrics, isCashPurchase: true, dscr: null }
    );
    const dscr = r.checks.find((c) => c.id === "dscr")!;
    expect(dscr.pass).toBeNull();
    expect(dscr.actual).toBe("N/A (cash)");
    // No applicable checks → not a pass.
    expect(r.passes).toBe(false);
    expect(r.failedCount).toBe(0);
  });

  it("treats an unreadable metric as N/A (skipped), not a fail", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, minCocPct: 8 },
      { ...baseMetrics, capRatePct: null }
    );
    const cap = r.checks.find((c) => c.id === "capRate")!;
    expect(cap.pass).toBeNull();
    // CoC still applies and passes.
    expect(r.passes).toBe(true);
    expect(r.passedCount).toBe(1);
  });

  it("fails a deal in the wrong market / wrong type", () => {
    const r = evaluateBuyBox(fullCriteria, {
      ...baseMetrics,
      state: "TX",
      propertyType: "owner-occupant",
    });
    expect(r.passes).toBe(false);
    expect(r.failedLabels).toContain("Market");
    expect(r.failedLabels).toContain("Property type");
  });

  it("is inactive when isActive is false", () => {
    const r = evaluateBuyBox({ ...fullCriteria, isActive: false }, baseMetrics);
    expect(r.active).toBe(false);
  });
});

describe("deriveStateFromAddress", () => {
  it("reads the postal code before a ZIP", () => {
    expect(deriveStateFromAddress("123 Main St, Philadelphia, PA 19103, USA")).toBe("PA");
    expect(deriveStateFromAddress("100 Market St, Indianapolis, IN 46204")).toBe("IN");
  });

  it("prefers the ZIP-anchored code over a state name elsewhere in the string", () => {
    // "Oregon Trail" must not win over the real ID ZIP anchor.
    expect(deriveStateFromAddress("123 Oregon Trail, Boise, ID 83702")).toBe("ID");
  });

  it("reads a comma-anchored code with no ZIP", () => {
    expect(deriveStateFromAddress("742 Evergreen Terrace, Austin, TX")).toBe("TX");
  });

  it("falls back to a full state name", () => {
    expect(deriveStateFromAddress("Downtown Portland, Oregon")).toBe("OR");
  });

  it("returns null when no state can be determined", () => {
    expect(deriveStateFromAddress("123 Main Street")).toBeNull();
    expect(deriveStateFromAddress("")).toBeNull();
    expect(deriveStateFromAddress(null)).toBeNull();
  });
});

function namedBox(
  id: string,
  criteria: Partial<BuyBoxCriteria>,
  meta?: Partial<Pick<NamedBuyBox, "name" | "strategyKind" | "isDefault" | "sortOrder">>
): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    ...criteria,
    id,
    name: meta?.name ?? id,
    strategyKind: meta?.strategyKind ?? null,
    isDefault: meta?.isDefault ?? false,
    sortOrder: meta?.sortOrder ?? 0,
  };
}

describe("evaluateBuyBoxes (multiple boxes)", () => {
  it("evaluates every box, ordered default-first then by sort order", () => {
    const a = namedBox("a", { minCapRatePct: 6 }, { sortOrder: 2 });
    const def = namedBox("def", { minCapRatePct: 6 }, { isDefault: true, sortOrder: 5 });
    const results = evaluateBuyBoxes([a, def], baseMetrics);
    expect(results.map((r) => r.box.id)).toEqual(["def", "a"]);
    expect(results.every((r) => r.result.passes)).toBe(true);
  });

  it("summarizes pass count + best fit across active boxes", () => {
    const pass = namedBox("pa", { minCapRatePct: 6, targetStates: ["PA"] });
    const failTx = namedBox("tx", { targetStates: ["TX"] });
    const sum = summarizeBuyBoxFit(evaluateBuyBoxes([pass, failTx], baseMetrics));
    expect(sum.activeCount).toBe(2);
    expect(sum.passingCount).toBe(1);
    expect(sum.anyPass).toBe(true);
    expect(sum.bestFit?.id).toBe("pa");
  });

  it("ignores inactive boxes in the summary", () => {
    const inactive = namedBox("off", { minCapRatePct: 6, isActive: false });
    const sum = summarizeBuyBoxFit(evaluateBuyBoxes([inactive], baseMetrics));
    expect(sum.activeCount).toBe(0);
    expect(sum.anyPass).toBe(false);
    expect(sum.bestFit).toBeNull();
  });

  it("bestFit prefers the default box when several pass", () => {
    const def = namedBox("def", { minCapRatePct: 6, targetStates: ["PA"] }, { isDefault: true });
    const other = namedBox("other", { minCocPct: 8 }, { sortOrder: 1 });
    const sum = summarizeBuyBoxFit(evaluateBuyBoxes([other, def], baseMetrics));
    expect(sum.bestFit?.id).toBe("def");
  });
});
