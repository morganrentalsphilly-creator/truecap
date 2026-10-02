import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { enrichmentRentSourceLabel } from "@/components/investcalc/enrichment-receipt";

describe("autofill source receipt", () => {
  it("distinguishes RentCast estimates from HUD benchmarks", () => {
    expect(enrichmentRentSourceLabel("rentcast-estimate")).toBe(
      "RentCast estimate",
    );
    expect(enrichmentRentSourceLabel("hud-fmr")).toBe("HUD FMR");
    expect(enrichmentRentSourceLabel("hud-safmr")).toBe("HUD SAFMR");
  });

  // Audit row P0-02: the receipt called the statewide fallback "HUD FMR".
  it("names the statewide HUD fallback with the toast's own words", () => {
    expect(enrichmentRentSourceLabel("hud-fmr", true)).toBe(
      "HUD statewide average",
    );
    // No flag (an older capture, or an area figure): the area label stands.
    expect(enrichmentRentSourceLabel("hud-fmr", false)).toBe("HUD FMR");
    expect(enrichmentRentSourceLabel("hud-fmr", undefined)).toBe("HUD FMR");
    // The flag belongs to HUD fills only.
    expect(enrichmentRentSourceLabel("rentcast-estimate", true)).toBe(
      "RentCast estimate",
    );
  });

  it("passes the capture's statewide flag to both receipt lines", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/enrichment-receipt.tsx"),
      "utf8",
    );
    expect(
      source.match(
        /enrichmentRentSourceLabel\(capture\.monthlyRent\.source, capture\.monthlyRent\.stateAverage\)/g,
      ),
    ).toHaveLength(2);
  });

  it("does not duplicate or overclaim template provenance", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/enrichment-receipt.tsx"),
      "utf8",
    );
    expect(source).not.toContain("resolveTemplateName");
    expect(source).not.toContain('Template "');
    expect(source).toContain("if (parts.length === 0) return null");
  });
});
