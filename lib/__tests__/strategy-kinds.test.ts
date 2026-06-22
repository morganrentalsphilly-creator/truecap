import { describe, it, expect } from "vitest";
import {
  STRATEGY_KINDS,
  STRATEGY_LABEL,
  STRATEGY_BLURB,
  isStrategyKind,
  strategyLabel,
  defaultScenarioName,
} from "@/lib/strategy-kinds";

describe("strategy-kinds", () => {
  it("every kind has a non-empty label and blurb", () => {
    for (const k of STRATEGY_KINDS) {
      expect(STRATEGY_LABEL[k].trim().length).toBeGreaterThan(0);
      expect(STRATEGY_BLURB[k].trim().length).toBeGreaterThan(0);
    }
  });

  it("isStrategyKind guards correctly", () => {
    expect(isStrategyKind("brrrr")).toBe(true);
    expect(isStrategyKind("str")).toBe(true);
    expect(isStrategyKind("nope")).toBe(false);
    expect(isStrategyKind(null)).toBe(false);
    expect(isStrategyKind(undefined)).toBe(false);
  });

  it("strategyLabel resolves known kinds, defaults to Buy & hold", () => {
    expect(strategyLabel("section_8")).toBe("Section 8");
    expect(strategyLabel("mtr")).toBe("Mid-term rental");
    expect(strategyLabel("garbage")).toBe("Buy & hold");
    expect(strategyLabel(null)).toBe("Buy & hold");
  });

  it("defaultScenarioName names the strategy or falls back to Base case", () => {
    expect(defaultScenarioName("brrrr")).toBe("BRRRR scenario");
    expect(defaultScenarioName("flip")).toBe("Fix & flip scenario");
    expect(defaultScenarioName(null)).toBe("Base case");
    expect(defaultScenarioName("nope")).toBe("Base case");
  });
});
