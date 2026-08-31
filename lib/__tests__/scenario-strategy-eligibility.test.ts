import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  requiredAnalyzerStrategyKeyForScenario,
  scenarioStrategyDisabledReason,
} from "@/lib/scenario-strategy-eligibility";
import { STRATEGY_KINDS } from "@/lib/strategy-kinds";

/**
 * The Add Scenario dialog used to list every strategy, let the user fill the
 * form, and only reject on submit — with a five-step errand — even though the
 * dialog's own description text already stated the precondition. Reproduced
 * live: "House hack" on a Single-Family deal.
 *
 * Eligibility is now decided pre-submit, with the SAME functions the server
 * runs (applyStrategyPreset -> isAnalyzerStrategyCompatible), and the server
 * action imports the kind->lens mapping from the same module — so the gate
 * and the rejection cannot drift apart.
 */

const SFR = { propertyType: "single-family" };
const OO = { propertyType: "owner-occupant" };
const SFR_STR = { propertyType: "single-family", avgDailyRate: 180, occupancyPct: 62 };

describe("scenarioStrategyDisabledReason", () => {
  it("blocks house_hack on a single-family source, with the reason", () => {
    expect(scenarioStrategyDisabledReason("house_hack", SFR)).toMatch(/Owner-Occupant/);
  });

  it("allows house_hack on an owner-occupant source", () => {
    expect(scenarioStrategyDisabledReason("house_hack", OO)).toBeNull();
  });

  it("allows brrrr and flip on single-family, blocks them on owner-occupant", () => {
    expect(scenarioStrategyDisabledReason("brrrr", SFR)).toBeNull();
    expect(scenarioStrategyDisabledReason("flip", SFR)).toBeNull();
    expect(scenarioStrategyDisabledReason("brrrr", OO)).toMatch(/Single-Family/);
    expect(scenarioStrategyDisabledReason("flip", OO)).toMatch(/Single-Family/);
  });

  it("evaluates POST-preset values: an STR-configured SFR is still a valid BRRRR source", () => {
    // Presets for non-STR strategies CLEAR avgDailyRate/occupancyPct, and the
    // server checks compatibility AFTER that. A naive check on the raw source
    // would see short-term income and wrongly block brrrr/flip here.
    expect(scenarioStrategyDisabledReason("brrrr", SFR_STR)).toBeNull();
    expect(scenarioStrategyDisabledReason("flip", SFR_STR)).toBeNull();
  });

  it("blocks str without nightly-rate/occupancy, allows it with them", () => {
    expect(scenarioStrategyDisabledReason("str", SFR)).toMatch(/nightly rate/);
    expect(scenarioStrategyDisabledReason("str", SFR_STR)).toBeNull();
  });

  it("never blocks the unconditional kinds", () => {
    for (const kind of ["buy_hold", "section_8", "mtr"]) {
      expect(scenarioStrategyDisabledReason(kind, SFR), kind).toBeNull();
      expect(scenarioStrategyDisabledReason(kind, OO), kind).toBeNull();
    }
  });

  it("does not guess when the source facts are missing", () => {
    // Legacy snapshots that fail validation pass null: leave every option
    // enabled and let the server answer, rather than block on a guess.
    for (const kind of STRATEGY_KINDS) {
      expect(scenarioStrategyDisabledReason(kind, null), kind).toBeNull();
      expect(scenarioStrategyDisabledReason(kind, {}), kind).toBeNull();
    }
  });
});

describe("client and server share one mapping", () => {
  it("the server action imports the shared function and keeps no inline copy", () => {
    const action = readFileSync(join(process.cwd(), "app/actions/scenarios.ts"), "utf8");
    expect(action).toContain(
      'import { requiredAnalyzerStrategyKeyForScenario } from "@/lib/scenario-strategy-eligibility"',
    );
    expect(action).toContain("requiredAnalyzerStrategyKeyForScenario(strategyKind)");
    // The drift shape this replaces: an inline kind->lens ternary.
    expect(action).not.toMatch(/strategyKind === "house_hack"\s*\?\s*"house-hack"/);
  });

  it("every gated kind maps to a lens; ungated kinds map to null", () => {
    expect(requiredAnalyzerStrategyKeyForScenario("house_hack")).toBe("house-hack");
    expect(requiredAnalyzerStrategyKeyForScenario("brrrr")).toBe("brrrr");
    expect(requiredAnalyzerStrategyKeyForScenario("flip")).toBe("fix-flip");
    expect(requiredAnalyzerStrategyKeyForScenario("str")).toBe("short-term");
    expect(requiredAnalyzerStrategyKeyForScenario("buy_hold")).toBeNull();
    expect(requiredAnalyzerStrategyKeyForScenario("section_8")).toBeNull();
    expect(requiredAnalyzerStrategyKeyForScenario("mtr")).toBeNull();
  });
});

describe("the dialog actually consumes the gate", () => {
  const card = readFileSync(
    join(process.cwd(), "components/investcalc/scenarios-card.tsx"),
    "utf8",
  );

  it("disables ineligible options and puts the reason on the option itself", () => {
    expect(card).toContain("scenarioStrategyDisabledReason(");
    expect(card).toContain("disabled={reason != null}");
    expect(card).toMatch(/\$\{strategyLabel\(k\)\} — \$\{reason\}/);
  });

  it("receives the source deal's facts from the deal page", () => {
    const page = readFileSync(
      join(process.cwd(), "app/dashboard/saved-analyses/[id]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("sourceStrategyValues={");
    expect(page).toContain("propertyType: evaluationResourceValues.propertyType");
  });
});
