import { describe, expect, it } from "vitest";

import { UNRELEASED_UNDERWRITING_CALCULATORS } from "@/lib/calculator-registry";
import { unusableToolRoutes } from "./unreleased-tool-routes";

describe("unusable /tools routes are derived from the pages, not a list", () => {
  it("finds every gated historical page, including ones absent from the registry", () => {
    const unusable = unusableToolRoutes();
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) {
      expect(
        unusable.has(slug),
        `${slug} is in the registry but looks usable`,
      ).toBe(true);
    }
    // The registry is a subset. BRRRR is feature-gated outside the static
    // unreleased list, and property tax is intentionally retired outright.
    expect(unusable.size).toBeGreaterThanOrEqual(
      UNRELEASED_UNDERWRITING_CALCULATORS.length,
    );
  });

  it("classifies every historical calculator fallback as a redirect", () => {
    const unusable = unusableToolRoutes();
    for (const slug of [
      ...UNRELEASED_UNDERWRITING_CALCULATORS,
      "brrrr-calculator",
      "rental-property-tax-calculator",
    ]) {
      expect(unusable.get(slug), slug).toBe("redirects-away");
    }
  });

  it("does not flag a genuinely released tool", () => {
    const unusable = unusableToolRoutes();
    for (const slug of [
      "break-even-calculator",
      "1-percent-rule-calculator",
      "70-percent-rule-calculator",
      "vacancy-rate-calculator",
      "rental-property-spreadsheet",
    ]) {
      expect(unusable.has(slug), `${slug} is released but was flagged`).toBe(
        false,
      );
    }
  });
});
