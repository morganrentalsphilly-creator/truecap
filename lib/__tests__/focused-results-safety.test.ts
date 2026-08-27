import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("focused decision safety", () => {
  it("never reveals the price-ceiling number without entitlement or sample preview", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(
      join(root, "components/investcalc/analysis-dashboard.tsx"),
      "utf8",
    );
    const calculator = readFileSync(
      join(root, "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );
    const saveAction = readFileSync(
      join(root, "app/actions/saved-analyses.ts"),
      "utf8",
    );
    expect(summary).toContain("canShowPriceCeiling");
    expect(summary).toContain("rangePreview");
    expect(summary).toContain('"Coarse range preview"');
    expect(summary).toContain("meetsMaoTarget(result, target)");
    expect(summary).toContain("Offer criteria");
    expect(summary).toContain("aria-expanded={tuneOpen}");
    expect(summary).toContain('aria-live="polite"');
    expect(summary).toContain("canTunePriceCeiling ? (");
    expect(summary).toContain("validateTargetDraft(targetInputs");
    expect(summary).toContain("const applyTargetDraft = () =>");
    expect(summary).toContain("onTargetChange(nextTarget)");
    expect(summary).toContain("targetDraftBlocksActions");
    expect(summary).toContain(
      'isSaving ? "Saving…" : isSaved ? "Saved" : "Save"',
    );
    expect(summary).toContain(
      "Apply or cancel the criteria edits before saving, sharing, or exporting.",
    );
    expect(summary).not.toContain("Apply the example targets");
    expect(summary).not.toContain("Set targets first");
    expect(summary).toContain("!clearsTargets");
    expect(summary).not.toContain(
      "Negotiate to ${money(offerCeiling.ceiling)} or less — or pass",
    );
    expect(summary).toContain(
      "above the Offer Ceiling under the selected rules",
    );
    expect(summary).toContain("Record the investment decision yourself");
    expect(dashboard).toContain(
      'currentOfferCeilingPayload?.access === "exact"',
    );
    expect(dashboard).toContain("canTunePriceCeiling={canUseMaxOffer}");
    expect(dashboard).toContain("onTargetChange={handleMaoTargetChange}");
    expect(dashboard).toContain("reduceMaoTargetState");
    expect(dashboard).not.toContain("onTuneTargets={() =>");
    expect(calculator).toContain(
      "normalizeMaoTarget(options.maxOfferTargetOverride)",
    );
    expect(calculator).toContain(
      "readPendingMaoTargetBinding(analysisFingerprint)",
    );
    expect(calculator).toContain("maxOfferTarget: maxOfferTargetSnapshot");
    expect(normalizeSource(calculator)).toContain(
      normalizeSource("normalizeMaoTarget(savedResultRecord?.maxOfferTarget)"),
    );
    expect(calculator).toContain("writeCalcDraftWithMaoTarget(");
    expect(calculator).toContain(
      "writePendingMaoTarget(target, { analysisFingerprint, source })",
    );
    expect(calculator).toContain("lastPersistedMaoTargetJsonRef");
    expect(calculator).toContain("isMaoTargetDirty(");
    expect(calculator).toContain("analysisMaoTargetRef.current = target");
    expect(normalizeSource(calculator)).toContain(
      normalizeSource("maoTargetFingerprint(maxOfferTargetSnapshot)"),
    );
    expect(saveAction).toContain(
      "resultSnapshotWithScore.maxOfferTarget = maxOfferTarget",
    );
    expect(saveAction).toContain("if (!maxOfferTargetOptionProvided)");
  });

  it("keeps target typing local until one validated Apply or Update", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8",
    );
    const editorStart = summary.indexOf(
      'legend className="text-sm font-bold text-foreground">\n              Offer criteria',
    );
    const editor = summary.slice(editorStart);
    const changeHandler = editor.indexOf("onChange={(event) =>");
    const explicitApply = editor.indexOf("onClick={applyTargetDraft}");

    expect(editorStart).toBeGreaterThanOrEqual(0);
    expect(changeHandler).toBeGreaterThanOrEqual(0);
    expect(explicitApply).toBeGreaterThan(changeHandler);
    expect(editor.slice(changeHandler, explicitApply)).toContain(
      "setTargetInputs",
    );
    expect(editor.slice(changeHandler, explicitApply)).not.toContain(
      "onTargetChange(",
    );
    expect(editor).toContain('targetAdopted ? "Update criteria" : "Apply criteria"');
    expect(editor).toContain("targetDraftInvalid ||");
    expect(editor).toContain("targetAdopted && !targetDraftDirty");
  });

  it("leads a targetless result with operating facts and keeps setup secondary", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8",
    );
    const targetlessSnapshot = summary.indexOf(
      "!targetAdopted ? (\n          <FirstYearSnapshot",
    );
    const optionalCriteria = summary.indexOf("Optional decision criteria");

    expect(targetlessSnapshot).toBeGreaterThanOrEqual(0);
    expect(optionalCriteria).toBeGreaterThan(targetlessSnapshot);
    expect(summary).toContain(
      "Positive operating screen at entered assumptions",
    );
    expect(summary).toContain(
      "Negative operating screen at entered assumptions",
    );
    expect(summary).toContain("The operating economics above are available now.");
  });

  it("labels the prior-target delta as session-only", () => {
    const summary = readFileSync(
      join(root, "components/investcalc/focused-decision-summary.tsx"),
      "utf8",
    );
    expect(summary).toContain("This comparison is session-only;");
    expect(normalizeSource(summary)).toContain(
      normalizeSource(
      "Save to record the current criteria with the analysis."),
    );
    expect(summary).not.toContain(
      "prior target criteria remain preserved in the previous snapshot",
    );
  });

  it("keeps the marketing tail hidden while assumptions are edited post-analysis", () => {
    const calculator = readFileSync(
      join(root, "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );
    expect(normalizeSource(calculator)).toContain(
      normalizeSource(
        "const postAnalysisMode = Boolean(analysisResult) && showResults && !isCalculating",
      ),
    );
    expect(calculator).toContain("setAdvancedOpen(true)");
  });

  it("uses one Buy Box evaluator as the only owner of readiness and QA state", () => {
    const dashboard = readFileSync(
      join(root, "components/investcalc/analysis-dashboard.tsx"),
      "utf8",
    );
    expect(dashboard.match(/<BuyBoxVerdictCard/g)).toHaveLength(1);
    expect(dashboard).toContain(
      "onLoadStateChange={handleBuyBoxTargetResolutionChange}",
    );
  });

  it("keeps invalid Max Offer drafts out of solver and persistence state", () => {
    const card = readFileSync(
      join(root, "components/investcalc/max-offer-card.tsx"),
      "utf8",
    );
    const invalidBranch = card.indexOf("if (!update.ok)");
    const committedUpdate = card.indexOf("setTarget(update.target)");

    expect(card).toContain("applyMaoTargetInput(target, field, rawValue)");
    expect(invalidBranch).toBeGreaterThan(-1);
    expect(committedUpdate).toBeGreaterThan(invalidBranch);
    expect(card.slice(invalidBranch, committedUpdate)).toContain("return;");
    expect(card).toContain(
      "aria-invalid={Boolean(targetErrors.maxPurchasePrice)}",
    );
    expect(card).toContain('role="alert"');
  });
});
