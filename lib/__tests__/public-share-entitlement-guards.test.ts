import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

describe("public share entitlement guards", () => {
  it("derives Pro visibility from verified owner attribution on both routes", () => {
    const opaque = source("../../app/s/[token]/page.tsx");
    const legacy = source("../../app/d/[encoded]/page.tsx");
    expect(opaque).toContain("canShowSharedProAnalysis(ownerId)");
    expect(legacy).toContain("canShowSharedProAnalysis(verifiedOwnerId)");
  });

  it("fails closed and gates every subscription-only public component", () => {
    const access = source("../public-share-access.ts");
    const view = source("../../components/investcalc/read-only-analysis-view.tsx");
    expect(access).toContain("if (!ownerId) return false");
    expect(access).toContain("return false");
    expect(view).toContain("showProAnalysis ?");
    expect(view).toContain("<MaxOfferCard values={values}");
    expect(view).toContain("<SensitivityGrid values={values}");
    expect(view).toContain("<StrategiesPanel values={values}");
  });
});
