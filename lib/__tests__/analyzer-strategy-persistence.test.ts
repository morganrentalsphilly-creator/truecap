import { describe, expect, it } from "vitest";

import {
  ANALYZER_STRATEGY_KEYS,
  DRAFT_ANALYZER_STRATEGY_FIELD,
  activeStrategyStateKey,
  isAnalyzerStrategyCompatible,
  normalizeAnalyzerStrategyKey,
  persistedAnalyzerStrategyKey,
  readDraftAnalyzerStrategyKey,
  resolveAnalyzerStrategyForPersistence,
  resolveCompatibleAnalyzerStrategyKey,
  resolveScenarioAnalyzerStrategyKey,
  scenarioAnalyzerStrategyKey,
} from "@/lib/analyzer-strategy-persistence";
import { INVESTOR_STRATEGIES } from "@/lib/investor-strategies";
import { STRATEGY_KINDS } from "@/lib/strategy-kinds";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("analyzer strategy persistence", () => {
  it("stays in lockstep with the strategy registry", () => {
    expect(INVESTOR_STRATEGIES.map((strategy) => strategy.key)).toEqual(
      ANALYZER_STRATEGY_KEYS,
    );
  });

  it.each(ANALYZER_STRATEGY_KEYS)("round-trips %s", (key) => {
    expect(normalizeAnalyzerStrategyKey(key)).toBe(key);
    expect(persistedAnalyzerStrategyKey(key)).toBe(key);
  });

  it("rejects unknown keys and never guesses an advanced strategy", () => {
    expect(normalizeAnalyzerStrategyKey("subject-to")).toBeNull();
    expect(
      persistedAnalyzerStrategyKey(undefined, { avgDailyRate: undefined }),
    ).toBe("buy-hold");
    expect(persistedAnalyzerStrategyKey(undefined, { avgDailyRate: 175 })).toBe(
      "short-term",
    );
  });

  it("maps the persisted default back to the parent's no-reapply state", () => {
    expect(activeStrategyStateKey("buy-hold")).toBeNull();
    expect(activeStrategyStateKey("brrrr")).toBe("brrrr");
  });

  it("keeps recorded strategy identity aligned with formula-bearing inputs", () => {
    const buyHold = {
      propertyType: "single-family",
      avgDailyRate: undefined,
      occupancyPct: undefined,
    };
    const shortTerm = {
      propertyType: "single-family",
      avgDailyRate: 185,
      occupancyPct: 65,
    };
    expect(isAnalyzerStrategyCompatible("buy-hold", buyHold)).toBe(true);
    expect(isAnalyzerStrategyCompatible("short-term", shortTerm)).toBe(true);
    expect(isAnalyzerStrategyCompatible("buy-hold", shortTerm)).toBe(false);
    expect(isAnalyzerStrategyCompatible("short-term", buyHold)).toBe(false);
    expect(
      isAnalyzerStrategyCompatible("house-hack", {
        propertyType: "single-family",
      }),
    ).toBe(false);
    expect(
      isAnalyzerStrategyCompatible("house-hack", {
        propertyType: "owner-occupant",
      }),
    ).toBe(true);
    expect(
      isAnalyzerStrategyCompatible("fix-flip", {
        propertyType: "multi-family",
      }),
    ).toBe(false);
  });

  it("fails stale or crafted keys closed to the formula-compatible general lens", () => {
    expect(
      resolveCompatibleAnalyzerStrategyKey("buy-hold", {
        propertyType: "single-family",
        avgDailyRate: 185,
        occupancyPct: 65,
      }),
    ).toBe("short-term");
    expect(
      resolveCompatibleAnalyzerStrategyKey("short-term", {
        propertyType: "single-family",
      }),
    ).toBe("buy-hold");
    expect(
      resolveCompatibleAnalyzerStrategyKey("house-hack", {
        propertyType: "single-family",
      }),
    ).toBe("buy-hold");
  });

  it("maps scenario labels only to a compatible analyzer lens", () => {
    expect(
      resolveScenarioAnalyzerStrategyKey({
        strategyKind: "str",
        sourceResult: null,
        values: { propertyType: "single-family" },
      }),
    ).toBe("buy-hold");
    expect(
      resolveScenarioAnalyzerStrategyKey({
        strategyKind: "str",
        sourceResult: null,
        values: {
          propertyType: "single-family",
          avgDailyRate: 185,
          occupancyPct: 65,
        },
      }),
    ).toBe("short-term");
    expect(
      resolveScenarioAnalyzerStrategyKey({
        strategyKind: "house_hack",
        sourceResult: null,
        values: { propertyType: "single-family" },
      }),
    ).toBe("buy-hold");
    expect(
      resolveScenarioAnalyzerStrategyKey({
        strategyKind: "house_hack",
        sourceResult: null,
        values: { propertyType: "owner-occupant" },
      }),
    ).toBe("house-hack");
  });

  it("maps every released scenario vocabulary entry to an explicit destination lens", () => {
    expect(
      Object.fromEntries(
        STRATEGY_KINDS.map((kind) => [
          kind,
          scenarioAnalyzerStrategyKey(kind),
        ]),
      ),
    ).toEqual({
      buy_hold: "buy-hold",
      house_hack: "house-hack",
      brrrr: "brrrr",
      flip: "fix-flip",
      section_8: "buy-hold",
      mtr: "buy-hold",
      str: "short-term",
    });
  });

  it("preserves an existing specialist identity when an older update caller omits the option", () => {
    expect(
      resolveAnalyzerStrategyForPersistence({
        requestedKey: undefined,
        requestedKeyProvided: false,
        existingResultSnapshot: { analyzerStrategyKey: "brrrr" },
        values: { avgDailyRate: undefined },
      }),
    ).toBe("brrrr");

    expect(
      resolveAnalyzerStrategyForPersistence({
        requestedKey: "buy-hold",
        requestedKeyProvided: true,
        existingResultSnapshot: { analyzerStrategyKey: "fix-flip" },
      }),
    ).toBe("buy-hold");
  });

  it("reads the version-safe draft metadata without trusting other shapes", () => {
    expect(
      readDraftAnalyzerStrategyKey({
        [DRAFT_ANALYZER_STRATEGY_FIELD]: "fix-flip",
      }),
    ).toBe("fix-flip");
    expect(readDraftAnalyzerStrategyKey(null)).toBeUndefined();
  });

  it("records the validated key in drafts and saved result snapshots", () => {
    const page = readFileSync(
      join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "app/actions/saved-analyses.ts"),
      "utf8",
    );
    expect(page).toContain("[DRAFT_ANALYZER_STRATEGY_FIELD]: strategyKey");
    expect(page).toContain(
      'analyzerStrategyKey: activeStrategyKeyRef.current ?? "buy-hold"',
    );
    expect(action).toContain("analyzerStrategyKey,");
    expect(action).toContain("normalizeAnalyzerStrategyKey");
    expect(action).toContain("resolveAnalyzerStrategyForPersistence");
  });
});
