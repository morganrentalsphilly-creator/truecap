import { describe, expect, it } from "vitest";
import {
  EMPTY_BUY_BOX,
  boxesForPersonalAnalyzerStrategy,
  buyBoxMatchesPropertyScope,
  buyBoxHasCriteria,
  countBuyBoxFit,
  deriveStateFromAddress,
  evaluateBuyBox,
  evaluateBuyBoxes,
  selectDecidingBuyBoxResult,
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
    expect(dscr.actual).toBe("N/A — no debt service");
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

  it("requires one unique IRR and never guesses through multiple roots", () => {
    const criteria = { ...EMPTY_BUY_BOX, minIrrPct: 10 };
    const unique = evaluateBuyBox(criteria, {
      ...baseMetrics,
      irrPct: 12,
      irrStatus: "unique",
    });
    expect(unique.passes).toBe(true);

    const ambiguous = evaluateBuyBox(criteria, {
      ...baseMetrics,
      irrPct: 12,
      irrStatus: "multiple",
    });
    expect(ambiguous.passes).toBe(false);
    expect(ambiguous.checks[0]).toMatchObject({
      id: "irr",
      pass: false,
      actual: "Unsupported (multiple IRRs)",
    });
  });

  it("fails a cash-required rule closed when the modeled cash is missing", () => {
    const criteria = { ...EMPTY_BUY_BOX, maxCashRequired: 75_000 };
    expect(
      evaluateBuyBox(criteria, {
        ...baseMetrics,
        cashRequired: 70_000,
      }).passes,
    ).toBe(true);
    const unavailable = evaluateBuyBox(criteria, {
      ...baseMetrics,
      cashRequired: null,
    });
    expect(unavailable.passes).toBe(false);
    expect(unavailable.checks[0]).toMatchObject({
      id: "cashRequired",
      pass: false,
      actual: "Unavailable",
    });
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

  it("attaches a favor-aware gap to each numeric check", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, minCashFlowMonthly: 200, maxPurchasePrice: 300_000 },
      { ...baseMetrics, capRatePct: 5.2, cashFlowMonthly: 120, purchasePrice: 320_000 }
    );
    expect(r.checks.find((c) => c.id === "capRate")!.gapText).toBe("0.8pp short");
    expect(r.checks.find((c) => c.id === "cashFlow")!.gapText).toBe("$80/mo short");
    // Price is over budget by $20k (a miss on a ≤ check).
    expect(r.checks.find((c) => c.id === "price")!.gapText).toBe("$20,000 over budget");
  });

  it("shows headroom ('to spare' / 'under budget') when a numeric check passes", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, maxPurchasePrice: 300_000 },
      { ...baseMetrics, capRatePct: 7.5, purchasePrice: 250_000 }
    );
    expect(r.checks.find((c) => c.id === "capRate")!.gapText).toBe("1.5pp to spare");
    expect(r.checks.find((c) => c.id === "price")!.gapText).toBe("$50,000 under budget");
  });

  it("leaves gapText undefined for non-numeric and skipped checks", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, propertyTypes: ["single-family"] },
      { ...baseMetrics, capRatePct: null }
    );
    expect(r.checks.find((c) => c.id === "capRate")!.gapText).toBeUndefined(); // skipped (null metric)
    expect(r.checks.find((c) => c.id === "propertyType")!.gapText).toBeUndefined(); // non-numeric
  });

  it("names the biggest miss in the personal line on a fail", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, minCocPct: 8 },
      { ...baseMetrics, capRatePct: 3, cocPct: 7.5 } // cap misses by 50%, CoC by ~6%
    );
    expect(r.passes).toBe(false);
    expect(r.personalLine).toContain("Biggest gap — Cap rate");
    expect(r.personalLine).toContain("3% vs ≥ 6%");
  });

  it("names the tightest margin in the personal line on a pass", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, minCapRatePct: 6, minCocPct: 8 },
      { ...baseMetrics, capRatePct: 12, cocPct: 8.1 } // CoC is the tighter pass
    );
    expect(r.passes).toBe(true);
    expect(r.personalLine).toContain("Tightest margin — Cash-on-cash");
  });

  it("has a null personal line when only non-numeric criteria apply", () => {
    const r = evaluateBuyBox(
      { ...EMPTY_BUY_BOX, propertyTypes: ["single-family"], targetStates: ["PA"] },
      baseMetrics
    );
    expect(r.passes).toBe(true);
    expect(r.personalLine).toBeNull();
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
  meta?: Partial<
    Pick<
      NamedBuyBox,
      "name" | "strategyKind" | "isDefault" | "sortOrder" | "clientId"
    >
  >
): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    ...criteria,
    id,
    name: meta?.name ?? id,
    strategyKind: meta?.strategyKind ?? null,
    isDefault: meta?.isDefault ?? false,
    sortOrder: meta?.sortOrder ?? 0,
    clientId: meta?.clientId ?? null,
  };
}

describe("boxesForPersonalAnalyzerStrategy", () => {
  const boxes = [
    namedBox("unscoped", { minDscr: 1.2 }),
    namedBox("buy-hold", { minDscr: 1.25 }, { strategyKind: "buy_hold" }),
    namedBox("house-hack", { minDscr: 1.1 }, { strategyKind: "house_hack" }),
    namedBox("brrrr", { minDscr: 1.15 }, { strategyKind: "brrrr" }),
    namedBox("flip", { minDscr: 1.05 }, { strategyKind: "flip" }),
    namedBox("str", { minDscr: 1.3 }, { strategyKind: "str" }),
    namedBox("unknown", { minDscr: 1.4 }, { strategyKind: "future_model" }),
    namedBox(
      "client-unscoped",
      { minDscr: 1.5 },
      { clientId: "client-1" },
    ),
    namedBox(
      "client-buy-hold",
      { minDscr: 1.6 },
      { strategyKind: "buy_hold", clientId: "client-1" },
    ),
  ];

  it.each([
    ["buy-hold", ["unscoped", "buy-hold"]],
    ["house-hack", ["unscoped", "house-hack"]],
    ["brrrr", ["unscoped", "brrrr"]],
    ["fix-flip", ["unscoped", "flip"]],
    ["short-term", ["unscoped", "str"]],
    ["wholesale-mao", ["unscoped"]],
  ] as const)("keeps only personal %s and unscoped boxes", (strategy, ids) => {
    expect(
      boxesForPersonalAnalyzerStrategy(boxes, strategy).map((box) => box.id),
    ).toEqual(ids);
  });

  it("treats a missing analyzer strategy as the default Buy & Hold lens", () => {
    expect(
      boxesForPersonalAnalyzerStrategy(boxes, null).map((box) => box.id),
    ).toEqual(["unscoped", "buy-hold"]);
    expect(
      boxesForPersonalAnalyzerStrategy(boxes, undefined).map((box) => box.id),
    ).toEqual(["unscoped", "buy-hold"]);
  });
});

describe("buyBoxMatchesPropertyScope", () => {
  const scoped = namedBox(
    "philly-sfr",
    { minDscr: 1.25 },
    {
      strategyKind: "buy_hold",
    },
  );
  scoped.propertyTypes = ["single-family"];
  scoped.targetStates = ["PA"];

  it("matches a known property type and market", () => {
    expect(
      buyBoxMatchesPropertyScope(scoped, {
        propertyType: "single-family",
        state: "pa",
      }),
    ).toBe(true);
  });

  it("rejects the wrong property type or market", () => {
    expect(
      buyBoxMatchesPropertyScope(scoped, {
        propertyType: "multi-family",
        state: "PA",
      }),
    ).toBe(false);
    expect(
      buyBoxMatchesPropertyScope(scoped, {
        propertyType: "single-family",
        state: "NJ",
      }),
    ).toBe(false);
  });

  it("fails closed when a market-scoped box has no resolved state", () => {
    expect(
      buyBoxMatchesPropertyScope(scoped, {
        propertyType: "single-family",
        state: null,
      }),
    ).toBe(false);
  });

  it("allows unscoped criteria before an address is resolved", () => {
    const unscoped = namedBox("general", { minDscr: 1.25 });
    expect(
      buyBoxMatchesPropertyScope(unscoped, {
        propertyType: "single-family",
        state: null,
      }),
    ).toBe(true);
  });
});

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

  it("uses the first passing box as the single decision basis", () => {
    const defaultMiss = namedBox(
      "strict-pa",
      { minCapRatePct: 8, targetStates: ["PA"] },
      { isDefault: true }
    );
    const passing = namedBox("working-pa", { minCapRatePct: 6, targetStates: ["PA"] });
    const results = evaluateBuyBoxes([defaultMiss, passing], baseMetrics);

    expect(summarizeBuyBoxFit(results).anyPass).toBe(true);
    expect(selectDecidingBuyBoxResult(results)?.box.id).toBe("working-pa");
    expect(selectDecidingBuyBoxResult(results)?.result.passes).toBe(true);
  });

  it("uses the highest-priority box when none pass", () => {
    const defaultMiss = namedBox(
      "strict-pa",
      { minCapRatePct: 9 },
      { isDefault: true }
    );
    const otherMiss = namedBox("strict-coc", { minCocPct: 12 });
    const results = evaluateBuyBoxes([otherMiss, defaultMiss], baseMetrics);

    expect(selectDecidingBuyBoxResult(results)?.box.id).toBe("strict-pa");
    expect(selectDecidingBuyBoxResult(results)?.result.passes).toBe(false);
  });
});

describe("countBuyBoxFit (one box across many deals — save feedback)", () => {
  const capOnly: BuyBoxCriteria = { ...EMPTY_BUY_BOX, minCapRatePct: 6 };

  it("counts passing deals over the evaluated set", () => {
    const fails = { ...baseMetrics, capRatePct: 5 };
    expect(countBuyBoxFit(capOnly, [baseMetrics, fails, baseMetrics])).toEqual({
      passing: 2,
      evaluated: 3,
    });
  });

  it("a deal with no applicable check never passes (matches evaluateBuyBox)", () => {
    const unknownCap = { ...baseMetrics, capRatePct: null };
    expect(countBuyBoxFit(capOnly, [unknownCap])).toEqual({ passing: 0, evaluated: 1 });
  });

  it("skips DSCR on cash purchases instead of failing them", () => {
    const cashDeal = { ...baseMetrics, dscr: 0, isCashPurchase: true };
    const dscrBox: BuyBoxCriteria = { ...EMPTY_BUY_BOX, minDscr: 1.25, minCapRatePct: 6 };
    expect(countBuyBoxFit(dscrBox, [cashDeal])).toEqual({ passing: 1, evaluated: 1 });
  });

  it("an inactive box passes nothing", () => {
    expect(countBuyBoxFit({ ...capOnly, isActive: false }, [baseMetrics])).toEqual({
      passing: 0,
      evaluated: 1,
    });
  });

  it("handles an empty deal set", () => {
    expect(countBuyBoxFit(capOnly, [])).toEqual({ passing: 0, evaluated: 0 });
  });
});
