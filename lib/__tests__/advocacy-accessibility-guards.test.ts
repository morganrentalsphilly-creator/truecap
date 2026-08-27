import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

const summary = read("../../components/investcalc/focused-decision-summary.tsx");
const ledger = read("../../components/investcalc/input-confidence-card.tsx");
const dashboard = read("../../components/investcalc/analysis-dashboard.tsx");
const calculator = read("../../components/investcalc/investcalc-page.tsx");
const sourceCoverage = read(
  "../../components/investcalc/data-confidence-badge.tsx",
);

describe("advocacy decision accessibility and reflow guards", () => {
  it("keeps the decision hierarchy semantic and announces changing results", () => {
    expect(summary).toContain('aria-labelledby="decision-summary-title"');
    expect(normalizeSource(summary)).toContain(
      normalizeSource('<h2 id="decision-summary-title"'),
    );
    expect(summary).toContain('aria-live="polite"');
    expect(summary).toContain('aria-atomic="true"');
    expect(dashboard).toContain('id="analysis-decision-title"');
  });

  it("keeps target controls labeled, constrained, and tied to inline errors", () => {
    expect(summary).toContain("<Label htmlFor={inputId}");
    expect(summary).toContain("min={bounds.min}");
    expect(summary).toContain("max={bounds.max}");
    expect(summary).toContain("step={bounds.step}");
    expect(summary).toContain(
      "aria-invalid={Boolean(\n                        targetDraftValidation.errors[field]",
    );
    expect(normalizeSource(summary)).toContain(
      normalizeSource(
        "aria-describedby={targetDraftValidation.errors[field] ? errorId : undefined}",
      ),
    );
    expect(normalizeSource(summary)).toContain(
      normalizeSource('id={errorId} role="alert"'),
    );
  });

  it("preserves 44px controls and visible keyboard focus", () => {
    expect(summary).toContain("h-11 w-full gap-2 rounded-xl");
    expect(summary).toContain('className="h-11 rounded-xl px-4"');
    expect(ledger).toContain("min-h-11");
    expect(ledger).toContain("focus-visible:ring-2 focus-visible:ring-ring");
  });

  it("uses mobile ledger cards before enabling the wide table", () => {
    expect(ledger).toContain('<ul className="divide-y divide-border sm:hidden">');
    expect(ledger).toContain('<div className="hidden overflow-x-auto sm:block">');
    expect(ledger).toContain("data-assumption-ledger-value={item.key}");
    expect(ledger).toContain(">Value</th>");
    expect(dashboard).toContain("values={values}");
    expect(summary).toContain("break-all");
  });

  it("turns the unreachable evidence state into a compact offer check", () => {
    const advocacyStart = ledger.indexOf("if (advocacyContractEnabled)");
    const advocacyEnd = ledger.indexOf("\n  }\n\n  return (", advocacyStart);
    const advocacyView = ledger.slice(advocacyStart, advocacyEnd);

    expect(advocacyStart).toBeGreaterThan(-1);
    expect(advocacyEnd).toBeGreaterThan(advocacyStart);
    expect(ledger).toContain('data-verification-plan=""');
    expect(ledger).toContain("Before you offer");
    expect(ledger).toContain(
      "Double-check the biggest cash-flow drivers. Edit anything that",
    );
    expect(ledger).toContain("computeAssumptionImpact(values)");
    expect(ledger).toContain("EDIT_ACTION_LABEL[field.key]");
    expect(ledger).toContain("onReviewInput(field.key)");
    expect(ledger).toContain(
      "aria-label={`${actionLabel}: ${label}`}",
    );
    expect(ledger).toContain("Nightly rate and occupancy");
    expect(ledger).toContain("Rental-unit rents");
    expect(ledger).toContain("Unit rents");
    expect(ledger).not.toContain("Start here");
    expect(ledger).not.toContain("Add evidence for");
    expect(advocacyView).not.toContain("Save to use checklist");
    expect(advocacyView).not.toContain("Open deal checklist");
    expect(advocacyView).not.toContain("See every material assumption");
    expect(advocacyView).not.toContain("evidence complete");
    expect(advocacyView).not.toContain("<details");
    expect(dashboard).toContain("onReviewInput={onReviewVerificationInput}");
    expect(summary).toContain(
      "onTargetDraftBlockingChange?.(targetDraftBlocksActions)",
    );
    expect(dashboard).toContain(
      "onTargetDraftBlockingChange={setTargetDraftActionsBlocked}",
    );
    expect(dashboard).toContain(
      "actionsBlocked={verificationActionsBlocked}",
    );
    expect(ledger).toContain("disabled={actionsBlocked}");
    expect(calculator).toContain("handleReviewVerificationInput");
    expect(calculator).toContain("INPUT_CONFIDENCE_FORM_FIELD[key]");
    expect(calculator).toContain('strategyKey === "short-term"');
    expect(calculator).toContain('getElementById("avgDailyRate")');
    expect(calculator).toContain('getElementById("step-income")');
    expect(calculator).toContain('id="step-income"');
    for (const id of [
      "step-property",
      "step-income",
      "step-financing",
      "step-expenses",
      "step-extras",
    ]) {
      expect(normalizeSource(calculator)).toContain(
        normalizeSource(`id="${id}" tabIndex={-1}`),
      );
    }
    expect(calculator).toContain("setPendingVerificationFocusKey(key)");
    expect(calculator).toContain("target.getClientRects().length > 0");
    expect(calculator).toContain("attempts < 20");
    expect(calculator).toContain(
      "onReviewVerificationInput={handleReviewVerificationInput}",
    );
    expect(advocacyView).not.toContain("onToggleVerified");
    expect(advocacyView).not.toContain("I reviewed this");
    expect(advocacyView).not.toContain("verifyAction");
    expect(summary).not.toContain('advocacyContractEnabled\n                  ? "Verification"');
    expect(summary).not.toContain("evidenceLedger");
    expect(summary).toContain("!advocacyContractEnabled &&");
    expect(summary).toContain('"Screening only"');
    expect(summary).toContain('result.monthlyPayment <= 0 ? "N/A"');
    expect(summary).not.toContain("Screening Index");
    expect(summary).not.toContain("dealScoreResult");
    expect(summary).toContain(
      "!advocacyContractEnabled && sensitivityLabels.length > 0",
    );
    expect(dashboard).toContain(
      "(!isSampleProPreview && !deferredWhatIfState?.isAdjusted)",
    );
    expect(dashboard).toContain("!strategyLeadsOutput &&");
  });

  it("presents input provenance without an unreachable confidence grade", () => {
    expect(sourceCoverage).toContain("Input sources");
    expect(sourceCoverage).toContain(
      "This is not property-specific evidence",
    );
    expect(sourceCoverage).toContain("Confirmed by you");
    expect(sourceCoverage).not.toContain("confidenceLabel");
    expect(sourceCoverage).not.toContain("describeConfidenceGap");
    expect(sourceCoverage).not.toContain("Input review:");
    expect(sourceCoverage).not.toContain("Input check:");
    expect(sourceCoverage).not.toContain("Data confidence:");
    expect(sourceCoverage).not.toContain("You verified");
    expect(sourceCoverage).not.toContain("Starting-data coverage");
    expect(sourceCoverage).not.toContain("Sources:");
  });
});
