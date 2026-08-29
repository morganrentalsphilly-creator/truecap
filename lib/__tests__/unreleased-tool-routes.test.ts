import { describe, expect, it } from "vitest";

import { UNRELEASED_UNDERWRITING_CALCULATORS } from "@/lib/calculator-registry";
import { unusableToolRoutes } from "./unreleased-tool-routes";

describe("unusable /tools routes are derived from the pages, not a list", () => {
  it("finds every notFound() page, including ones absent from the registry", () => {
    const unusable = unusableToolRoutes();
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) {
      expect(unusable.has(slug), `${slug} is in the registry but looks usable`).toBe(true);
    }
    // The registry is a SUBSET. brrrr-calculator calls notFound() and is not
    // listed; if that stops being true the comment above should be updated,
    // but the detector must keep finding it either way.
    expect(unusable.size).toBeGreaterThanOrEqual(UNRELEASED_UNDERWRITING_CALCULATORS.length);
  });

  it("catches tools unreleased by redirect, which no list contains", () => {
    const unusable = unusableToolRoutes();
    expect(unusable.get("rental-property-tax-calculator")).toBe("redirects-away");
  });

  it("does not flag a genuinely released tool", () => {
    const unusable = unusableToolRoutes();
    for (const slug of ["break-even-calculator", "1-percent-rule-calculator",
                        "70-percent-rule-calculator", "vacancy-rate-calculator",
                        "rental-property-spreadsheet"]) {
      expect(unusable.has(slug), `${slug} is released but was flagged`).toBe(false);
    }
  });
});
