import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { savedDealsListCountLabel } from "@/lib/saved-deals-list-copy";

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("dashboard list clarity", () => {
  it("keeps every shared dropdown action at least 44px tall", () => {
    const source = read("../../components/ui/dropdown-menu.tsx");
    for (const slot of [
      "dropdown-menu-item",
      "dropdown-menu-checkbox-item",
      "dropdown-menu-radio-item",
      "dropdown-menu-sub-trigger",
    ]) {
      const slotAt = source.indexOf(`data-slot="${slot}"`);
      expect(slotAt, `${slot} exists`).toBeGreaterThan(-1);
      const classAt = source.indexOf("className={cn(", slotAt);
      const classEnd = source.indexOf("className,", classAt);
      expect(
        source.slice(classAt, classEnd),
        `${slot} has a 44px minimum height`,
      ).toContain("min-h-11");
    }
  });

  it("names the current lifecycle scope instead of the full portfolio", () => {
    expect(
      savedDealsListCountLabel({
        visibleCount: 7,
        scopedCount: 7,
        scope: "active",
      }),
    ).toBe("7 active deals");
    expect(
      savedDealsListCountLabel({
        visibleCount: 1,
        scopedCount: 1,
        scope: "completed",
      }),
    ).toBe("1 completed deal");
  });

  it("separates filtered results from the server-scoped count", () => {
    expect(
      savedDealsListCountLabel({
        visibleCount: 2,
        scopedCount: 9,
        scope: "active",
      }),
    ).toBe("2 shown · 9 active deals");
    expect(
      savedDealsListCountLabel({
        visibleCount: 0,
        scopedCount: 3,
        scope: "all",
        clientName: "Morgan's buyers",
      }),
    ).toBe("0 shown · 3 deals assigned to Morgan's buyers");
  });

  it("does not point a zero-row client scope at nonexistent rows", () => {
    const source = read(
      "../../components/investcalc/saved-analyses-page-v2.tsx",
    );
    expect(source).not.toContain("deals in your portfolio");
    expect(source).not.toContain("Open any deal below");
    expect(source).toContain("Show all deals, open the one you want");
  });
});
