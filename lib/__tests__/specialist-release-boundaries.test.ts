import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import {
  getCityStrategyCombo,
  getReleasedCityStrategyCombos,
} from "@/lib/city-strategy-combos";
import {
  isScenarioStrategyEnabled,
  resolveFeatureFlags,
} from "@/lib/feature-flags";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("specialist release boundaries", () => {
  it("filters city-strategy discovery from the same independent model flags", () => {
    const dark = resolveFeatureFlags();
    const brrrrOnly = resolveFeatureFlags({ brrrr_strategy_model: true });

    expect(
      getReleasedCityStrategyCombos(dark).some(
        (combo) => combo.strategy === "brrrr" || combo.strategy === "fix-flip",
      ),
    ).toBe(false);
    expect(
      getReleasedCityStrategyCombos(brrrrOnly).some(
        (combo) => combo.strategy === "brrrr",
      ),
    ).toBe(true);
    expect(getCityStrategyCombo("philadelphia", "brrrr")).toBeNull();

    expect(isScenarioStrategyEnabled("brrrr", dark)).toBe(false);
    expect(isScenarioStrategyEnabled("flip", dark)).toBe(false);
    expect(isScenarioStrategyEnabled("buy_hold", dark)).toBe(true);
    expect(isScenarioStrategyEnabled("brrrr", brrrrOnly)).toBe(true);
    expect(isScenarioStrategyEnabled("flip", brrrrOnly)).toBe(false);
  });

  it("uses only the release-filtered city registry on crawl surfaces", () => {
    const registry = source("lib/city-strategy-combos.ts");
    expect(registry).toContain("const ALL_CITY_STRATEGY_COMBOS");
    expect(registry).not.toContain("export const ALL_CITY_STRATEGY_COMBOS");
    expect(registry).toContain("getReleasedCityStrategyCombos()");

    const route = source("app/markets/[city]/[strategy]/page.tsx");
    expect(route).toContain("export const dynamicParams = false");
    expect(route).toContain("robots: { index: false, follow: false }");
    // Released combos only; Phase 8 filters them by city indexability first.
    expect(source("app/sitemap.ts")).toMatch(/CITY_STRATEGY_COMBOS\.(filter|map)\(/);
    expect(source("app/sitemap.ts")).not.toContain("ALL_CITY_STRATEGY_COMBOS");
    expect(source("app/llms.txt/route.ts")).toContain(
      "CITY_STRATEGY_COMBOS.map",
    );
    expect(source("components/marketing/city-strategy-guides.tsx")).toContain(
      "getCombosForCity(citySlug)",
    );
  });

  it("emits no dark specialist city URL in sitemap or llms.txt", async () => {
    const specialistCityUrl = /\/markets\/[^/\s)]+\/(?:brrrr|fix-flip)(?:$|\s|\))/;
    expect(sitemap().map((entry) => entry.url).join("\n")).not.toMatch(
      specialistCityUrl,
    );

    const llmsText = await (await getLlmsTxt()).text();
    expect(llmsText).not.toMatch(specialistCityUrl);
  });

  it("gates state materialization and every specialist persistence path", () => {
    const analyzer = source("components/investcalc/investcalc-page.tsx");
    expect(analyzer).toContain(
      "if (key && !isSpecialistStrategyEnabled(key)) return",
    );
    expect(analyzer).toContain(
      "if (!isReleasedHandoffStrategy(detail.strategy)) return",
    );

    const saves = source("app/actions/saved-analyses.ts");
    expect(saves).toContain(
      "if (!isSpecialistStrategyEnabled(input.strategyKey))",
    );
    expect(saves).toContain("releaseSafeAnalyzerStrategyKey(");
    expect(saves).toContain("This analysis type is not available yet");

    const scenarios = source("app/actions/scenarios.ts");
    expect(scenarios).toContain(
      "if (strategyKind && !isScenarioStrategyEnabled(strategyKind))",
    );
    expect(scenarios).toContain("releaseGateScenarioResultSnapshot(");
    expect(scenarios).toContain("Last-write invariant across every branch");

    const picker = source("components/investcalc/scenarios-card.tsx");
    expect(picker).toContain("RELEASED_STRATEGY_KINDS.map");
    expect(picker).toContain("isScenarioStrategyEnabled(kind)");
  });
});
