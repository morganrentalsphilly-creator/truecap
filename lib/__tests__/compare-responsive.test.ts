import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { comparisonGridColumns } from "@/lib/compare-responsive";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("responsive comparison columns", () => {
  it.each([
    [0, "grid-cols-1"],
    [1, "grid-cols-1"],
    [2, "grid-cols-2"],
    [3, "grid-cols-2 sm:grid-cols-3"],
    [4, "grid-cols-2 sm:grid-cols-4"],
    [8, "grid-cols-2 sm:grid-cols-4"],
  ])("maps %i deals to %s", (count, expected) => {
    expect(comparisonGridColumns(count)).toBe(expected);
  });

  it("keeps three- and four-deal comparisons to two columns at 390px", () => {
    expect(comparisonGridColumns(3)).toMatch(/^grid-cols-2\s/);
    expect(comparisonGridColumns(4)).toMatch(/^grid-cols-2\s/);
  });

  it("keeps add/remove/edit controls available on mobile with visible pending state", () => {
    const client = read("../../components/investcalc/compare-deals-client.tsx");
    const picker = read("../../components/investcalc/compare-deal-picker.tsx");

    expect(client).toContain("CompareMobileDealStrip");
    expect(client).toContain("onRemove={removeDeal}");
    expect(client).toContain("onEditSelection={showSelectionEditor}");
    expect(client).toContain('getElementById("compare-selection-editor")');
    expect(client).toContain("min-h-11");
    expect(client).toContain("removingId === deal.id");
    expect(picker).toContain('aria-busy={isPending}');
    expect(picker).toContain('role="alert"');
  });
});
