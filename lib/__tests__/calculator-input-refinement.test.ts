import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("calculator input refinement", () => {
  it("fills the active desktop preview rail with quiet guidance before numeric inputs are ready", () => {
    const preview = read("components/investcalc/live-verdict-panel.tsx");
    const emptyState = preview.slice(
      preview.indexOf("{active && !livePreview ? ("),
      preview.indexOf("{active && livePreview ? ("),
    );

    expect(emptyState).toContain('data-live-verdict-empty=""');
    expect(emptyState).toContain("Live screening preview guidance");
    expect(emptyState).toContain("hidden min-h-56");
    expect(emptyState).toContain("lg:flex");
    expect(emptyState).toContain("Your preliminary numbers will appear here");
    expect(emptyState).toContain("Enter the price and expected monthly rent");
    expect(emptyState).not.toContain("livePreview.");
  });

  it("keeps property lookup optional while making the guest action direct", () => {
    const property = read(
      "components/investcalc/property-details-section.tsx",
    );

    expect(property).toContain(': "Look up property details"');
    expect(property).not.toContain("Create a free account to autofill");
    expect(property).toContain(
      "Optional. A free account is required to look up available property facts and estimates.",
    );
    expect(property).toContain(
      "Optional. Look up available property facts and estimates.",
    );
  });
});
