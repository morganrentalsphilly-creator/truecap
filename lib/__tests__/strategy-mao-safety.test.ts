import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Max Offer entitlement and Wholesale target safety", () => {
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");
  const strategyCard = read("components/investcalc/strategy-outcome-card.tsx");

  it("fails closed before building a deal-specific MAO context for Free", () => {
    const context = sourceSection(
      dashboard,
      "const maoQaContext = exactOfferCeiling",
      "const decisionViewedKey ="
    );
    expect(context).toContain("exactOfferCeiling && activeMaoTarget");
    expect(context).not.toContain("calculateMaxAllowableOffer");
    expect(dashboard).toContain(
      'currentOfferCeilingPayload?.access === "exact"'
    );
  });

  it("stops the free Wholesale path before mounting the solver or target editor", () => {
    const wholesaleBranch = sourceSection(
      strategyCard,
      'if (strategy.key === "wholesale-mao") {',
      "// ---- BRRRR / Fix & Flip"
    );
    const gate = wholesaleBranch.indexOf("if (!canUseMaxOffer ||");
    const paidOutcome = wholesaleBranch.indexOf("<WholesaleOutcome");

    expect(gate).toBeGreaterThanOrEqual(0);
    expect(paidOutcome).toBeGreaterThan(gate);
    expect(wholesaleBranch).not.toContain("calculateMaxAllowableOffer");
    expect(wholesaleBranch).toContain("The deal-specific ceiling stays locked");
  });

  it("uses and edits the dashboard's active target instead of a second default", () => {
    const paidOutcome = sourceSection(
      strategyCard,
      "function WholesaleOutcome({",
      "function targetInput("
    );
    const editor = sourceSection(
      strategyCard,
      "function WholesaleTargetEditor({",
      "function OutcomeShell("
    );

    expect(dashboard).toContain("activeMaoTarget={activeMaoTarget}");
    expect(dashboard).toContain("onMaoTargetChange={handleMaoTargetChange}");
    expect(dashboard).toContain('placement: "wholesale_outcome"');
    expect(paidOutcome).toContain("const target = { ...activeMaoTarget }");
    expect(paidOutcome).toContain(
      "const maxPrice = offerCeiling.presentation.ceiling"
    );
    expect(strategyCard).not.toContain("calculateMaxAllowableOffer");
    expect(strategyCard).not.toContain("buildMaoTarget");
    expect(editor).toContain("applyMaoTargetInput(target, field, rawValue)");
    expect(editor).toContain("onTargetChange(update.target)");
    expect(editor).toContain("aria-expanded={open}");
    expect(editor).toContain("aria-invalid={Boolean(errors[field])}");
    expect(editor).toContain("min={bounds.min}");
    expect(editor).toContain("max={bounds.max}");
    expect(editor).toContain("step={bounds.step}");
    expect(strategyCard).not.toContain("Adjust targets in Stress Test");
    expect(strategyCard).not.toContain("onJumpToTab");
  });

  it("keeps the one-time Pack export on the same active target", () => {
    expect(dashboard).toContain("activeMaoTarget ?? undefined,");
    expect(dashboard).toContain("offerCeilingTargetSource\n    );");
    expect(dashboard).toContain("onExportPdf={() => handleExportPdf()}");
  });

  it("keeps the legacy target action on the actual Max Offer editor", () => {
    expect(dashboard).toContain('document.getElementById("max-offer-result")?.scrollIntoView');
    expect(dashboard).toContain('placement: "legacy_max_offer_summary"');
    expect(dashboard).not.toContain('onClick={() => setActiveTab("stress-test")}');
  });

  it("re-keys and synchronously normalizes the target when financing becomes cash", () => {
    expect(dashboard).toContain('isCashPurchase ? "cash" : "debt"');
    expect(dashboard).toContain(
      "normalizeMaoTargetForFinancing(synchronousMaoTarget, { isCashPurchase })"
    );
    expect(dashboard).toContain(
      "normalizeMaoTargetForFinancing(maoTargetOverride, { isCashPurchase })"
    );
  });
});

describe("moment-of-value Max Offer copy", () => {
  const upsell = read("components/marketing/moment-of-value-upsell.tsx");

  it("does not claim the free result already contains a fixed ceiling", () => {
    expect(upsell).not.toContain("Your result includes a fixed price ceiling");
    expect(upsell).toContain("Pro unlocks an interactive solver");
    expect(upsell).toContain("a criterion-based ceiling, not");
    expect(upsell).toContain("a recommended offer");
  });
});
