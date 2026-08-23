import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("focused decision safety", () => {
  it("never reveals the price-ceiling number without entitlement or sample preview", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8"
    );
    const dashboard = readFileSync(
      join(root, "components/investcalc/analysis-dashboard.tsx"),
      "utf8"
    );
    const calculator = readFileSync(
      join(root, "components/investcalc/investcalc-page.tsx"),
      "utf8"
    );
    const saveAction = readFileSync(
      join(root, "app/actions/saved-analyses.ts"),
      "utf8"
    );
    expect(summary).toContain("canShowPriceCeiling");
    expect(summary).toContain("rangePreview");
    expect(summary).toContain('"Coarse range preview"');
    expect(summary).toContain("meetsMaoTarget(result, target)");
    expect(summary).toContain("Price ceiling targets");
    expect(summary).toContain("aria-expanded={tuneOpen}");
    expect(summary).toContain("aria-live=\"polite\"");
    expect(summary).toContain("canTunePriceCeiling ? (");
    expect(summary).toContain("applyMaoTargetInput(target, field, rawValue)");
    expect(summary).toContain("if (rawValue.trim())");
    expect(dashboard).toContain('currentOfferCeilingPayload?.access === "exact"');
    expect(dashboard).toContain("canTunePriceCeiling={canUseMaxOffer}");
    expect(dashboard).toContain("onTargetChange={handleMaoTargetChange}");
    expect(dashboard).toContain("reduceMaoTargetState");
    expect(dashboard).not.toContain('onTuneTargets={() =>');
    expect(calculator).toContain("normalizeMaoTarget(options.maxOfferTargetOverride)");
    expect(calculator).toContain("readPendingMaoTargetBinding(analysisFingerprint)");
    expect(calculator).toContain("maxOfferTarget: maxOfferTargetSnapshot");
    expect(calculator).toContain("normalizeMaoTarget(savedResultRecord?.maxOfferTarget)");
    expect(calculator).toContain("writeCalcDraftWithMaoTarget(");
    expect(calculator).toContain("writePendingMaoTarget(target, { analysisFingerprint, source })");
    expect(calculator).toContain("lastPersistedMaoTargetJsonRef");
    expect(calculator).toContain("isMaoTargetDirty(");
    expect(calculator).toContain("analysisMaoTargetRef.current = target");
    expect(calculator).toContain("maoTargetFingerprint(maxOfferTargetSnapshot)");
    expect(saveAction).toContain("resultSnapshotWithScore.maxOfferTarget = maxOfferTarget");
    expect(saveAction).toContain("if (!maxOfferTargetOptionProvided)");
  });

  it("keeps the marketing tail hidden while assumptions are edited post-analysis", () => {
    const calculator = readFileSync(
      join(root, "components/investcalc/investcalc-page.tsx"),
      "utf8"
    );
    expect(calculator).toContain(
      "const postAnalysisMode = Boolean(analysisResult) && showResults && !isCalculating"
    );
    expect(calculator).toContain("setAdvancedOpen(true)");
  });

  it("uses one Buy Box evaluator as the only owner of readiness and QA state", () => {
    const dashboard = readFileSync(
      join(root, "components/investcalc/analysis-dashboard.tsx"),
      "utf8"
    );
    expect(dashboard.match(/<BuyBoxVerdictCard/g)).toHaveLength(1);
    expect(dashboard).toContain("onLoadStateChange={setBuyBoxTargetResolutionState}");
  });

  it("keeps invalid Max Offer drafts out of solver and persistence state", () => {
    const card = readFileSync(
      join(root, "components/investcalc/max-offer-card.tsx"),
      "utf8"
    );
    const invalidBranch = card.indexOf("if (!update.ok)");
    const committedUpdate = card.indexOf("setTarget(update.target)");

    expect(card).toContain("applyMaoTargetInput(target, field, rawValue)");
    expect(invalidBranch).toBeGreaterThan(-1);
    expect(committedUpdate).toBeGreaterThan(invalidBranch);
    expect(card.slice(invalidBranch, committedUpdate)).toContain("return;");
    expect(card).toContain("aria-invalid={Boolean(targetErrors.maxPurchasePrice)}");
    expect(card).toContain("role=\"alert\"");
  });
});
