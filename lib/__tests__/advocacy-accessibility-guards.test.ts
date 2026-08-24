import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const summary = read("../../components/investcalc/focused-decision-summary.tsx");
const ledger = read("../../components/investcalc/input-confidence-card.tsx");
const dashboard = read("../../components/investcalc/analysis-dashboard.tsx");

describe("advocacy decision accessibility and reflow guards", () => {
  it("keeps the decision hierarchy semantic and announces changing results", () => {
    expect(summary).toContain('aria-labelledby="decision-summary-title"');
    expect(summary).toContain('<h2 id="decision-summary-title"');
    expect(summary).toContain('aria-live="polite"');
    expect(summary).toContain('aria-atomic="true"');
    expect(dashboard).toContain('id="analysis-decision-title"');
  });

  it("keeps target controls labeled, constrained, and tied to inline errors", () => {
    expect(summary).toContain("<Label htmlFor={inputId}");
    expect(summary).toContain("min={bounds.min}");
    expect(summary).toContain("max={bounds.max}");
    expect(summary).toContain("step={bounds.step}");
    expect(summary).toContain("aria-invalid={Boolean(targetErrors[field])}");
    expect(summary).toContain("aria-describedby={targetErrors[field] ? errorId : undefined}");
    expect(summary).toContain('id={errorId} role="alert"');
  });

  it("preserves 44px controls and visible keyboard focus", () => {
    expect(summary).toContain('className="h-11 gap-2 rounded-xl"');
    expect(summary).toContain('className="h-11 rounded-xl px-4"');
    expect(ledger).toContain("min-h-11");
    expect(ledger).toContain("focus-visible:ring-2 focus-visible:ring-ring");
  });

  it("uses mobile ledger cards before enabling the wide table", () => {
    expect(ledger).toContain('<ul className="divide-y divide-border sm:hidden">');
    expect(ledger).toContain('<div className="hidden overflow-x-auto sm:block">');
    expect(summary).toContain("break-all");
  });

  it("exposes categorical evidence semantics and cash DSCR without a numerical-confidence claim", () => {
    expect(ledger).toContain('advocacyContractEnabled ? "Evidence readiness"');
    expect(ledger).toContain('label="Readiness state"');
    expect(ledger).toContain('help="Not investment advice"');
    expect(summary).toContain('result.monthlyPayment <= 0 ? "N/A"');
    expect(summary).toContain("Screening Index is withheld in this decision view");
  });
});
