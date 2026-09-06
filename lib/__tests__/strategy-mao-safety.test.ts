import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

function sourceSection(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(
    0,
  );
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Max Offer entitlement and Wholesale target safety", () => {
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");
  const strategyCard = read("components/investcalc/strategy-outcome-card.tsx");

  it("fails closed before building a deal-specific MAO context for Free", () => {
    const context = sourceSection(
      dashboard,
      "const maoQaContext =",
      "const decisionViewedKey =",
    );
    expect(normalizeSource(context)).toContain(
      normalizeSource("exactOfferCeiling && activeMaoTarget"),
    );
    expect(context).not.toContain("calculateMaxAllowableOffer");
    expect(dashboard).toContain(
      'currentOfferCeilingPayload?.access === "exact"',
    );
  });

  it("stops the free Wholesale path before mounting the solver or target editor", () => {
    const wholesaleBranch = sourceSection(
      strategyCard,
      'if (strategy.key === "wholesale-mao") {',
      "// ---- BRRRR / Fix & Flip",
    );
    const normalizedWholesaleBranch = normalizeSource(wholesaleBranch);
    const gate = normalizedWholesaleBranch.indexOf(
      normalizeSource("if (!canUseMaxOffer)"),
    );
    const paidOutcome = normalizedWholesaleBranch.indexOf("<WholesaleOutcome");

    expect(gate).toBeGreaterThanOrEqual(0);
    expect(paidOutcome).toBeGreaterThan(gate);
    expect(wholesaleBranch).not.toContain("calculateMaxAllowableOffer");
    expect(normalizedWholesaleBranch).toContain(
      normalizeSource("The deal-specific ceiling stays locked"),
    );
  });

  it("uses the dashboard target and sends edits to the single Decision editor", () => {
    const paidOutcome = sourceSection(
      strategyCard,
      "function WholesaleOutcome({",
      "function ReviewTargetCriteriaButton(",
    );

    expect(dashboard).toContain("activeMaoTarget={activeMaoTarget}");
    expect(dashboard).toContain("onMaoTargetChange={handleMaoTargetChange}");
    expect(dashboard).toContain('placement: "wholesale_outcome"');
    expect(paidOutcome).toContain("const target = { ...activeMaoTarget }");
    expect(paidOutcome).toContain(
      "const maxPrice = offerCeiling.presentation.ceiling",
    );
    expect(strategyCard).not.toContain("calculateMaxAllowableOffer");
    expect(strategyCard).not.toContain("buildMaoTarget");
    expect(strategyCard).not.toContain("WholesaleTargetEditor");
    expect(strategyCard).toContain("ReviewTargetCriteriaButton");
    expect(strategyCard).toContain('"offer-ceiling-criteria-trigger"');
    expect(strategyCard).toContain("trigger?.click()");
    expect(strategyCard).not.toContain("Adjust targets in Stress Test");
    expect(strategyCard).not.toContain("onJumpToTab");
  });

  it("never upsells an entitled Wholesale user merely because criteria are missing", () => {
    const wholesaleBranch = sourceSection(
      strategyCard,
      'if (strategy.key === "wholesale-mao") {',
      "// ---- BRRRR / Fix & Flip",
    );
    const paidMissingTarget = sourceSection(
      wholesaleBranch,
      "if (!activeMaoTarget) {",
      "if (isOfferCeilingLoading)",
    );

    expect(wholesaleBranch).toContain("if (!canUseMaxOffer)");
    expect(wholesaleBranch).not.toContain(
      "!canUseMaxOffer ||\n      (!isOfferCeilingLoading && !hasExactOfferCeilingAccess)",
    );
    expect(paidMissingTarget).toContain("Your Pro access is active");
    expect(paidMissingTarget).toContain("Choose your Offer Ceiling criteria");
    expect(paidMissingTarget).not.toContain("Compare Pro plans");
  });

  it("keeps every supported PDF export on the same explicitly adopted target", () => {
    expect(dashboard).toContain("const adoptedMaoTarget = targetAdopted");
    expect(dashboard).toContain("const adoptedMaoTargetSource = targetAdopted");
    expect(dashboard).toContain(
      "adoptedMaoTarget,\n      adoptedMaoTargetSource",
    );
    expect(dashboard).not.toContain("activeMaoTarget ?? undefined,");
    expect(dashboard).toContain("onClick={() => handleExportPdf()}");
    expect(dashboard).toContain('handleExportPdf("personal")');
    expect(dashboard).not.toContain("createOneTimePdfCheckoutAction");
  });

  it("keeps the legacy target action on the actual Max Offer editor", () => {
    expect(dashboard).toContain(
      'document.getElementById("max-offer-result")?.scrollIntoView',
    );
    expect(dashboard).toContain('placement: "legacy_max_offer_summary"');
    expect(dashboard).not.toContain(
      'onClick={() => setActiveTab("stress-test")}',
    );
  });

  it("re-keys and synchronously normalizes the target when financing becomes cash", () => {
    expect(dashboard).toContain('isCashPurchase ? "cash" : "debt"');
    expect(dashboard).toContain(
      "normalizeMaoTargetForFinancing(synchronousMaoTarget, { isCashPurchase })",
    );
    expect(dashboard).toContain(
      "normalizeMaoTargetForFinancing(maoTargetOverride, { isCashPurchase })",
    );
  });
});

describe("moment-of-value Max Offer copy", () => {
  const upsell = read("components/marketing/moment-of-value-upsell.tsx");

  it("does not claim the free result already contains a fixed ceiling", () => {
    expect(upsell).not.toContain("Your result includes a fixed price ceiling");
    expect(upsell).toContain("Pro unlocks an interactive solver");
    expect(upsell).toMatch(/calculates the\s+highest price that clears all of them/);
    expect(upsell).not.toContain("a recommended offer");
  });
});
