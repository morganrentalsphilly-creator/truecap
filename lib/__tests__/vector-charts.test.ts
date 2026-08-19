import { describe, expect, it } from "vitest";
import { niceScale, formatAxisMoney } from "@/lib/pdf/vector-charts";

/**
 * The chart engine's only non-obvious logic is the axis scale. Everything else
 * is drawing calls, which are covered by the visual smoke check in
 * scripts/pdf-visual-check.ts. These tests pin the behaviour that makes a
 * hand-rolled chart look machine-made rather than hand-rolled.
 */
describe("niceScale", () => {
  it("produces round steps that bracket the data", () => {
    const s = niceScale(-6900, 85200);
    expect(s.min).toBeLessThanOrEqual(-6900);
    expect(s.max).toBeGreaterThanOrEqual(85200);
    expect(s.step).toBe(20000);
    expect(s.ticks).toEqual([-20000, 0, 20000, 40000, 60000, 80000, 100000]);
  });

  it("always includes the zero baseline for all-positive data", () => {
    const s = niceScale(1200, 9800);
    expect(s.min).toBe(0);
    expect(s.ticks).toContain(0);
  });

  it("always includes the zero baseline for all-negative data", () => {
    const s = niceScale(-9800, -1200);
    expect(s.max).toBe(0);
    expect(s.ticks).toContain(0);
  });

  it("survives a degenerate range without dividing by zero", () => {
    const s = niceScale(0, 0);
    expect(Number.isFinite(s.min)).toBe(true);
    expect(Number.isFinite(s.max)).toBe(true);
    expect(s.max).toBeGreaterThan(s.min);
    expect(s.ticks.length).toBeGreaterThan(1);
  });

  it("survives all-equal non-zero values", () => {
    const s = niceScale(5000, 5000);
    expect(s.max).toBeGreaterThan(s.min);
    expect(s.ticks).toContain(0);
  });

  it("survives non-finite input rather than emitting NaN ticks", () => {
    const s = niceScale(Number.NaN, Number.NaN);
    expect(s.ticks.every((t) => Number.isFinite(t))).toBe(true);
  });

  it("does not accumulate float drift across ticks", () => {
    // 0.1-style steps are where naive `t += step` produces 0.30000000000000004.
    const s = niceScale(0, 1);
    for (const t of s.ticks) {
      expect(Math.abs(t - Number(t.toFixed(6)))).toBeLessThan(1e-9);
    }
  });

  it("keeps tick count in a readable range for typical money spans", () => {
    for (const [lo, hi] of [
      [0, 1200],
      [-5000, 5000],
      [0, 2_500_000],
      [-120, 340],
    ] as const) {
      const s = niceScale(lo, hi);
      expect(s.ticks.length).toBeGreaterThanOrEqual(2);
      expect(s.ticks.length).toBeLessThanOrEqual(12);
    }
  });
});

describe("formatAxisMoney", () => {
  it("formats magnitudes compactly", () => {
    expect(formatAxisMoney(0)).toBe("$0");
    expect(formatAxisMoney(950)).toBe("$950");
    expect(formatAxisMoney(4200)).toBe("$4.2K");
    expect(formatAxisMoney(42000)).toBe("$42K");
    expect(formatAxisMoney(1_250_000)).toBe("$1.3M");
    expect(formatAxisMoney(12_500_000)).toBe("$13M");
  });

  it("puts the sign outside the dollar mark", () => {
    expect(formatAxisMoney(-4200)).toBe("-$4.2K");
    expect(formatAxisMoney(-950)).toBe("-$950");
  });
});
