import { describe, it, expect } from "vitest";
import {
  applyStrategyPreset,
  describeStrategyPreset,
} from "@/lib/scenario-presets";
import { STRATEGY_KINDS } from "@/lib/strategy-kinds";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

const base = {
  monthlyRent: 1850,
  downPaymentPct: 20,
  mgmtPct: 8,
  vacancyPct: 5,
  maintenancePct: 10,
} as unknown as InvestmentFormValues;

describe("applyStrategyPreset", () => {
  it("returns values unchanged for null / buy_hold / flip", () => {
    expect(applyStrategyPreset(base, null)).toBe(base);
    expect(applyStrategyPreset(base, "buy_hold").downPaymentPct).toBe(20);
    expect(applyStrategyPreset(base, "flip").downPaymentPct).toBe(20);
  });

  it("house_hack drops down payment to 3.5%", () => {
    expect(applyStrategyPreset(base, "house_hack").downPaymentPct).toBe(3.5);
  });

  it("brrrr sets 25% down", () => {
    expect(applyStrategyPreset(base, "brrrr").downPaymentPct).toBe(25);
  });

  it("str raises ops (mgmt/vacancy/maintenance), leaves rent + down payment", () => {
    const r = applyStrategyPreset(base, "str");
    expect(r.mgmtPct).toBe(22);
    expect(r.vacancyPct).toBe(28);
    expect(r.maintenancePct).toBe(12);
    expect(r.downPaymentPct).toBe(20);
    expect(r.monthlyRent).toBe(1850); // never touches rent
  });

  it("never changes rent for ANY strategy, and never mutates the input", () => {
    for (const k of STRATEGY_KINDS) {
      const r = applyStrategyPreset(base, k);
      expect(r.monthlyRent).toBe(1850);
    }
    // Input untouched.
    expect(base.downPaymentPct).toBe(20);
    expect(base.mgmtPct).toBe(8);
  });

  it("clears the STR income model when cloning into a non-STR strategy", () => {
    const shortTerm = {
      ...base,
      propertyType: "single-family" as const,
      avgDailyRate: 185,
      occupancyPct: 65,
      strFurnishingCost: 12_000,
    } as InvestmentFormValues;
    for (const kind of [
      "buy_hold",
      "section_8",
      "mtr",
      "brrrr",
      "flip",
    ] as const) {
      const result = applyStrategyPreset(shortTerm, kind);
      expect(result.avgDailyRate).toBeUndefined();
      expect(result.occupancyPct).toBeUndefined();
      expect(result.strFurnishingCost).toBeUndefined();
    }
    expect(shortTerm.avgDailyRate).toBe(185);
  });
});

describe("describeStrategyPreset", () => {
  it("describes the strategies that change something; null otherwise", () => {
    expect(describeStrategyPreset("house_hack")).toContain("3.5%");
    expect(describeStrategyPreset("str")).toContain("28%");
    expect(describeStrategyPreset("buy_hold")).toBeNull();
    expect(describeStrategyPreset(null)).toBeNull();
  });

  it("has an entry (string or null) for every strategy kind", () => {
    for (const k of STRATEGY_KINDS) {
      expect(describeStrategyPreset(k)).not.toBe(undefined);
    }
  });
});
