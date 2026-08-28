import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatDscr,
  NO_DEBT_SERVICE_DSCR_LABEL,
  STEADY_STATE_RENOVATION_LABEL,
} from "@/lib/financial-presentation";

const CASH_DSCR_SURFACES = [
  "app/blog/cap-rate-vs-cash-on-cash-vs-dscr/page.tsx",
  "app/blog/what-is-a-good-dscr/page.tsx",
  "app/changelog/page.tsx",
  "app/dashboard/saved-analyses/[id]/page.tsx",
  "app/methodology/page.tsx",
  "app/sample-decision-memo/page.tsx",
  "components/dashboard/DashboardHome.tsx",
  "components/dashboard/RiskReturn.tsx",
  "components/investcalc/analysis-dashboard.tsx",
  "components/investcalc/analysis-error-boundary.tsx",
  "components/investcalc/answer-hero-card.tsx",
  "components/investcalc/batch-triage-client.tsx",
  "components/investcalc/compare-deals-client.tsx",
  "components/investcalc/decision-tier.tsx",
  "components/investcalc/focused-decision-summary.tsx",
  "components/investcalc/investcalc-page.tsx",
  "components/investcalc/live-verdict-panel.tsx",
  "components/investcalc/max-offer-card.tsx",
  "components/investcalc/metrics-band.tsx",
  "components/investcalc/mortgage-scenario-compare.tsx",
  "components/investcalc/pre-run-criteria-editor.tsx",
  "components/investcalc/read-only-analysis-view.tsx",
  "components/investcalc/saved-analyses-page-v2.tsx",
  "components/investcalc/sensitivity-grid.tsx",
  "components/investcalc/sticky-calculate-bar.tsx",
  "components/tools/rental-cash-flow-calculator-widget.tsx",
  "lib/buy-box.ts",
  "lib/deal-qa.ts",
  "lib/deals-csv.ts",
  "lib/decision-thresholds.ts",
  "lib/pdf-generator.ts",
  "lib/strategy-lens-outcome.ts",
  "lib/stress-survivability.ts",
  "lib/verdict.ts",
] as const;

describe("financial presentation", () => {
  it("uses the exact cash-purchase DSCR label", () => {
    expect(formatDscr(0, false)).toBe("N/A — no debt service");
    expect(NO_DEBT_SERVICE_DSCR_LABEL).toBe("N/A — no debt service");
  });

  it("preserves a financed negative DSCR", () => {
    expect(formatDscr(-0.456, true)).toBe("-0.46");
  });

  it("locks the renovation scope disclosure", () => {
    expect(STEADY_STATE_RENOVATION_LABEL).toBe(
      "Steady-state analysis after stabilization; renovation downtime and lease-up are excluded.",
    );
  });

  it.each(CASH_DSCR_SURFACES)(
    "%s uses the shared all-cash DSCR presentation",
    (path) => {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source).toMatch(/\b(?:formatDscr|NO_DEBT_SERVICE_DSCR_LABEL)\b/);
    },
  );

  it("rejects legacy all-cash DSCR labels on guarded surfaces", () => {
    const source = CASH_DSCR_SURFACES.map((path) =>
      readFileSync(join(process.cwd(), path), "utf8"),
    ).join("\n");

    for (const legacy of [
      "N/A (cash)",
      "N/A (no loan)",
      "N/A — cash",
      "N/A — all-cash purchase",
      "DSCR n/a — cash purchase",
    ]) {
      expect(source).not.toContain(legacy);
    }
  });
});
