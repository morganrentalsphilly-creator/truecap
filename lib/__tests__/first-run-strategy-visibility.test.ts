import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("first-run strategy selection", () => {
  it("renders the strategy chooser before a strategy has been selected", () => {
    const page = readFileSync(
      join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );
    expect(page).toContain("{!focusedResultsMode ? (\n          <div className=\"mt-4\">\n            <StrategyChips");
    expect(page).not.toContain("!focusedResultsMode && activeStrategyKey ?");
  });
});
