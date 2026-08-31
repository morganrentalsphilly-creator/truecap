import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("scenario lifecycle comparison consistency", () => {
  const action = read("app/actions/scenarios.ts");
  const card = read("components/investcalc/scenarios-card.tsx");
  const compare = read("app/actions/compare.ts");

  it("keeps terminal siblings visible with explicit lifecycle metadata", () => {
    expect(action).toContain(
      '"id, scenario_name, strategy_kind, title, is_completed, is_archived"',
    );
    expect(action).toContain(
      'lifecycleState: "active" | "completed" | "archived"',
    );
    expect(action).toContain('isComparable: lifecycleState === "active"');
    expect(card).toContain('s.lifecycleState === "completed"');
    expect(card).toContain('s.lifecycleState === "archived"');
    expect(card).toContain('restore it to an active stage before comparing');
  });

  it("offers comparison only for the same active set the server selects", () => {
    expect(card).toContain(
      "const comparableScenarioCount = rows.filter(",
    );
    expect(card).toContain("{comparableScenarioCount >= 2 ? (");
    expect(card).not.toContain("{scenarios.length >= 2 ? (");
    expect(card).toContain("Compare active scenarios");
    expect(compare).toContain('.eq("is_completed", false)');
    expect(compare).toContain('.eq("is_archived", false)');
    expect(compare).toContain(
      "Add or restore another active scenario before comparing.",
    );
  });
});
