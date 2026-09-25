import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getUnderwritingHeading,
  INVESTOR_STRATEGIES,
} from "@/lib/investor-strategies";

describe("strategy-aware underwriting heading", () => {
  it("keeps the default heading and names every active strategy truthfully", () => {
    expect(getUnderwritingHeading(null)).toBe("Underwrite a Buy & Hold Rental");
    expect(getUnderwritingHeading("unknown-strategy")).toBe(
      "Underwrite a Buy & Hold Rental",
    );

    for (const strategy of INVESTOR_STRATEGIES) {
      expect(getUnderwritingHeading(strategy.key)).toBe(
        `${strategy.label} Underwriting`,
      );
    }
  });

  it("uses the shared heading as the one page H1 without replacing the role-aware CTA", () => {
    const page = readFileSync(
      resolve(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );

    // One heading for both auth states (2026-09 audit): /analyze no longer
    // stacks a page intro above the form, so the form heading is the H1.
    expect(page.match(/\{underwritingHeading\}/g)).toHaveLength(1);
    expect(page).toMatch(/<h1[^>]*>\s*\{underwritingHeading\}\s*<\/h1>/);
    expect(page).toContain("const analyzerCta = getAnalyzerCta({");
    expect(page).toContain("strategyRunCta: activeStrategy?.runCta");
    expect(page).toContain(
      "canUseStrategyPrimaryOutput: canUseActiveStrategyPrimaryOutput",
    );
    expect(page).toContain(": analyzerCta;");
    expect(page).toContain("{primaryActionLabel}");
  });
});
