import { describe, expect, it } from "vitest";

import {
  buildStrategyLensOutcome,
  type StrategyLensMetricsInput,
} from "../strategy-lens-outcome";

const base: StrategyLensMetricsInput = {
  netCashFlow: 350,
  cocReturn: 9.1,
  dscr: 1.41,
  capRate: 7.2,
  monthlyPayment: 1400,
  annualizedReturnPct: 12.4,
};

describe("buildStrategyLensOutcome", () => {
  it("returns null for balanced (the default = no active lens)", () => {
    expect(buildStrategyLensOutcome("balanced", base)).toBeNull();
  });

  it("cash-flow lens leads with cash flow, CoC, and DSCR", () => {
    const o = buildStrategyLensOutcome("cash-flow", base);
    expect(o).not.toBeNull();
    expect(o!.headline).toMatch(/cash-flow investor/i);
    expect(o!.metrics.map((m) => m.label)).toEqual(["Cash flow", "CoC", "DSCR"]);
    expect(o!.metrics[0].value).toBe("+$350/mo after all expenses");
    expect(o!.metrics[0].band).toBe("solid");
    expect(o!.metrics[1].value).toBe("9.1%");
    expect(o!.metrics[1].band).toBe("strong");
    expect(o!.metrics[2].value).toBe("1.41");
    expect(o!.metrics[2].band).toBe("comfortable");
    expect(o!.metrics.every((m) => m.tone === "good")).toBe(true);
  });

  it("appreciation lens leads with 10-yr return, cap rate, and pre-tax cash flow", () => {
    const o = buildStrategyLensOutcome("appreciation", base);
    expect(o).not.toBeNull();
    expect(o!.headline).toMatch(/appreciation investor/i);
    expect(o!.metrics.map((m) => m.label)).toEqual([
      "10-yr return",
      "Cap rate",
      "Cash flow",
    ]);
    expect(o!.metrics[0].value).toBe("~12%/yr");
    expect(o!.metrics[0].band).toBe("strong");
    expect(o!.metrics[1].band).toBe("strong");
    expect(o!.metrics[2].value).toBe("+$350/mo after all expenses");
    expect(o!.metrics[2].band).toBe("solid");
    expect(o!.metrics[2].tone).toBe("good");
  });

  it("bands a weak cash-flow deal without sugarcoating", () => {
    const o = buildStrategyLensOutcome("cash-flow", {
      ...base,
      netCashFlow: -260,
      cocReturn: -1.2,
      dscr: 0.92,
    });
    expect(o!.metrics[0].value).toBe("-$260/mo after all expenses");
    expect(o!.metrics[0].band).toBe("losing money");
    expect(o!.metrics[0].tone).toBe("bad");
    expect(o!.metrics[1].band).toBe("negative");
    expect(o!.metrics[2].band).toBe("underwater");
    expect(o!.metrics[2].tone).toBe("bad");
  });

  it("keeps near-break-even cash flow neutral (mirrors the tile band)", () => {
    const o = buildStrategyLensOutcome("cash-flow", { ...base, netCashFlow: -40 });
    expect(o!.metrics[0].band).toBe("≈break-even");
    expect(o!.metrics[0].tone).toBe("neutral");
  });

  it("labels a sub-1.25 DSCR as tight, not underwater", () => {
    const o = buildStrategyLensOutcome("cash-flow", { ...base, dscr: 1.1 });
    expect(o!.metrics[2].band).toBe("tight");
    expect(o!.metrics[2].tone).toBe("neutral");
  });

  it("softens a sub-1.0 DSCR for an owner-occupant house-hack", () => {
    const o = buildStrategyLensOutcome("cash-flow", {
      ...base,
      dscr: 0.85,
      isOwnerOccupant: true,
    });
    expect(o!.metrics[2].band).toMatch(/house-hack/i);
    expect(o!.metrics[2].tone).toBe("neutral");
  });

  it("marks DSCR N/A on an all-cash purchase (no debt service)", () => {
    const o = buildStrategyLensOutcome("cash-flow", { ...base, monthlyPayment: 0 });
    expect(o!.metrics[2].value).toBe("N/A — no debt service");
    expect(o!.metrics[2].band).toBe("not applicable");
    expect(o!.metrics[2].tone).toBe("neutral");
  });

  it("handles a missing 10-yr projection without inventing a number", () => {
    const o = buildStrategyLensOutcome("appreciation", {
      ...base,
      annualizedReturnPct: null,
    });
    expect(o!.metrics[0].value).toBe("—");
    expect(o!.metrics[0].band).toBe("not available");
    expect(o!.metrics[0].tone).toBe("neutral");
  });

  it("flags negative pre-tax cash flow on the appreciation lens", () => {
    const o = buildStrategyLensOutcome("appreciation", {
      ...base,
      annualizedReturnPct: 6.5,
      capRate: 4.1,
      netCashFlow: -85,
    });
    expect(o!.metrics[0].band).toBe("modest");
    expect(o!.metrics[1].band).toBe("relies on price growth");
    expect(o!.metrics[2].value).toBe("-$85/mo after all expenses");
    expect(o!.metrics[2].band).toBe("≈break-even");
    expect(o!.metrics[2].tone).toBe("neutral");
  });
});
