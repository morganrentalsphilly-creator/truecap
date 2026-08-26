import { describe, expect, it } from "vitest";
import { enrichmentRentSourceLabel } from "@/components/investcalc/enrichment-receipt";

describe("autofill source receipt", () => {
  it("distinguishes RentCast estimates from HUD benchmarks", () => {
    expect(enrichmentRentSourceLabel("rentcast-estimate")).toBe("RentCast estimate");
    expect(enrichmentRentSourceLabel("hud-fmr")).toBe("HUD FMR");
    expect(enrichmentRentSourceLabel("hud-safmr")).toBe("HUD SAFMR");
  });
});
