import { describe, expect, it } from "vitest";

import { investmentFormSchema } from "@/lib/investcalc-schema";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { buildScenarioStrategyTransition } from "@/lib/scenario-strategy-transition";
import { STRATEGY_KINDS } from "@/lib/strategy-kinds";

const buyHold = investmentFormSchema.parse(SAMPLE_DEAL_VALUES);

const houseHack = investmentFormSchema.parse({
  ...SAMPLE_DEAL_VALUES,
  propertyType: "owner-occupant",
  monthlyRent: undefined,
  units: [
    {
      bedrooms: 2,
      bathrooms: 1,
      sqft: 800,
      monthlyRent: 0,
      isOwnerOccupied: true,
    },
    {
      bedrooms: 2,
      bathrooms: 1,
      sqft: 800,
      monthlyRent: 1_650,
      isOwnerOccupied: false,
    },
  ],
});

const shortTerm = investmentFormSchema.parse({
  ...SAMPLE_DEAL_VALUES,
  monthlyRent: undefined,
  avgDailyRate: 185,
  occupancyPct: 65,
  strFurnishingCost: 12_000,
});

describe("scenario strategy transitions", () => {
  it.each(STRATEGY_KINDS)(
    "keeps every %s transition from a normal Buy & Hold base schema-valid",
    (strategyKind) => {
      const transition = buildScenarioStrategyTransition({
        baseValues: buyHold,
        strategyKind,
        sourceResult: { analyzerStrategyKey: "buy-hold" },
      });

      expect(investmentFormSchema.safeParse(transition.values).success).toBe(
        true,
      );
      // A server-side scenario preset must not invent a different property or
      // market income merely to satisfy a destination strategy.
      expect(transition.values.propertyType).toBe("single-family");
      expect(transition.values.monthlyRent).toBe(buyHold.monthlyRent);
      expect(transition.values.avgDailyRate).toBeUndefined();
      expect(transition.values.occupancyPct).toBeUndefined();
    },
  );

  it("creates House Hack and STR setup copies from Buy & Hold instead of rejecting them", () => {
    const houseHackSetup = buildScenarioStrategyTransition({
      baseValues: buyHold,
      strategyKind: "house_hack",
      sourceResult: { analyzerStrategyKey: "buy-hold" },
    });
    expect(houseHackSetup.values.downPaymentPct).toBe(3.5);
    expect(houseHackSetup.values.propertyType).toBe("single-family");
    expect(houseHackSetup.analyzerStrategyKey).toBe("buy-hold");
    expect(houseHackSetup.intendedAnalyzerStrategyKey).toBe("house-hack");
    expect(houseHackSetup.setupRequired).toBe(true);

    const strSetup = buildScenarioStrategyTransition({
      baseValues: buyHold,
      strategyKind: "str",
      sourceResult: { analyzerStrategyKey: "buy-hold" },
    });
    expect(strSetup.values.mgmtPct).toBe(22);
    expect(strSetup.values.vacancyPct).toBe(28);
    expect(strSetup.values.avgDailyRate).toBeUndefined();
    expect(strSetup.values.occupancyPct).toBeUndefined();
    expect(strSetup.analyzerStrategyKey).toBe("buy-hold");
    expect(strSetup.intendedAnalyzerStrategyKey).toBe("short-term");
    expect(strSetup.setupRequired).toBe(true);
  });

  it("activates House Hack when the cloned assumptions already support it", () => {
    const transition = buildScenarioStrategyTransition({
      baseValues: houseHack,
      strategyKind: "house_hack",
      sourceResult: { analyzerStrategyKey: "house-hack" },
    });

    expect(transition.analyzerStrategyKey).toBe("house-hack");
    expect(transition.setupRequired).toBe(false);
    expect(transition.values.units).toEqual(houseHack.units);
  });

  it("opens BRRRR and Fix & Flip directly from a compatible single-family base", () => {
    const brrrr = buildScenarioStrategyTransition({
      baseValues: buyHold,
      strategyKind: "brrrr",
      sourceResult: { analyzerStrategyKey: "buy-hold" },
    });
    expect(brrrr.values.downPaymentPct).toBe(25);
    expect(brrrr.analyzerStrategyKey).toBe("brrrr");
    expect(brrrr.setupRequired).toBe(false);

    const flip = buildScenarioStrategyTransition({
      baseValues: buyHold,
      strategyKind: "flip",
      sourceResult: { analyzerStrategyKey: "buy-hold" },
    });
    expect(flip.values).toBe(buyHold);
    expect(flip.analyzerStrategyKey).toBe("fix-flip");
    expect(flip.setupRequired).toBe(false);
  });

  it.each(STRATEGY_KINDS.filter((kind) => kind !== "str"))(
    "defers unsafe STR -> %s preset changes without deleting the only income model",
    (strategyKind) => {
      const transition = buildScenarioStrategyTransition({
        baseValues: shortTerm,
        strategyKind,
        sourceResult: { analyzerStrategyKey: "short-term" },
      });

      expect(transition.presetDeferred).toBe(true);
      expect(transition.values).toBe(shortTerm);
      expect(transition.values.monthlyRent).toBeUndefined();
      expect(transition.values.avgDailyRate).toBe(185);
      expect(transition.values.occupancyPct).toBe(65);
      expect(transition.analyzerStrategyKey).toBe("short-term");
      expect(transition.setupRequired).toBe(true);
      expect(investmentFormSchema.safeParse(transition.values).success).toBe(
        true,
      );
    },
  );
});
