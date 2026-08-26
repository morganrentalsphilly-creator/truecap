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
