import { describe, expect, it } from "vitest";
import { INVESTOR_STRATEGIES, getStrategyByKey } from "@/lib/investor-strategies";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";

describe("investor strategy registry", () => {
  it("every strategy maps to an existing starter template", () => {
    const starterKeys = new Set(STARTER_TEMPLATES.map((s) => s.key));
    for (const s of INVESTOR_STRATEGIES) {
      expect(starterKeys.has(s.starterKey)).toBe(true);
    }
  });

  it("strategy keys are unique", () => {
    const keys = INVESTOR_STRATEGIES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("primaryTab is one of the real dashboard tab ids", () => {
    const valid = new Set(["cash-flow", "strategies", "stress-test"]);
    for (const s of INVESTOR_STRATEGIES) {
      expect(valid.has(s.primaryTab)).toBe(true);
    }
  });

  it("Pro-output plays are flagged so gating/analytics can react", () => {
    // MAO + BRRRR/Flip are Pro today; cash-flow plays are free.
    expect(getStrategyByKey("wholesale-mao")?.primaryOutputIsPro).toBe(true);
    expect(getStrategyByKey("brrrr")?.primaryOutputIsPro).toBe(true);
    expect(getStrategyByKey("buy-hold")?.primaryOutputIsPro).toBe(false);
  });

  it("getStrategyByKey resolves known keys and rejects unknown/empty", () => {
    expect(getStrategyByKey("wholesale-mao")?.starterKey).toBe("wholesaler-mao");
    expect(getStrategyByKey(null)).toBeNull();
    expect(getStrategyByKey(undefined)).toBeNull();
    expect(getStrategyByKey("not-a-strategy")).toBeNull();
  });
});
