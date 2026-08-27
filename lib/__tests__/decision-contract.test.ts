import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  type AssumptionHardFlag,
  buildAssumptionLedger,
  buildDecisionTargetContext,
  buildSafeNextAction,
  confirmationTypeForEvidence,
  deriveRuleFit,
  offerCeilingHelperCopy,
  offerCeilingSemanticStatus,
  ruleFitLabel,
  userDecisionFromPipelineStage,
} from "@/lib/decision-contract";
import {
  buildInputConfidence,
  inputVerificationFingerprint,
  type InputConfidenceFieldKey,
  type InputVerificationEvidence,
} from "@/lib/input-confidence";
import { MAX_PURCHASE_PRICE } from "@/lib/investcalc-schema";
import type { OfferCeilingPresentation } from "@/lib/offer-ceiling-contract";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

const values = SAMPLE_DEAL_FIXTURE.values;
const result = calculateAnalysis(values);

function evidenceFor(
  keys: readonly InputConfidenceFieldKey[],
  evidenceType: string
): InputVerificationEvidence {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        evidenceType,
        verifiedAt: "2026-08-24T12:00:00.000Z",
        fingerprint: inputVerificationFingerprint(values, key),
      },
    ])
  );
}

describe("advocacy-first decision contract", () => {
  it("content-addresses the exact target and never calls defaults a Buy Box", () => {
    const first = buildDecisionTargetContext({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "screening-defaults",
    });
    const same = buildDecisionTargetContext({
      target: { ...SAMPLE_DEAL_FIXTURE.maoTarget },
      source: "screening-defaults",
    });
    const changed = buildDecisionTargetContext({
      target: { ...SAMPLE_DEAL_FIXTURE.maoTarget, monthlyCashFlow: 751 },
      source: "screening-defaults",
    });

    expect(first.profileId).toBe("truecap-screening-defaults");
    expect(first.profileName).toBe("TrueCap screening defaults");
    expect(first.origin).toBe("truecap-screening-defaults");
    expect(first.profileVersion).toBe("screening-defaults-v1");
    expect(first.rulesSnapshotVersion).toBe(same.rulesSnapshotVersion);
    expect(first.rulesSnapshotVersion).not.toBe(changed.rulesSnapshotVersion);
    expect(offerCeilingHelperCopy(first)).toBe(
      "Highest modeled price that still meets TrueCap screening defaults under the assumptions shown."
    );
  });

  it("does not collapse distinct valid target sets into the same rules snapshot", () => {
    const first = buildDecisionTargetContext({
      target: { monthlyCashFlow: 1275, maxPurchasePrice: 728000 },
      source: "selected-targets",
    });
    const second = buildDecisionTargetContext({
      target: { monthlyCashFlow: 1425, maxPurchasePrice: 576000 },
      source: "selected-targets",
    });

    expect(first.rulesSnapshotVersion).not.toBe(second.rulesSnapshotVersion);
  });

  it("keeps adopted starter criteria distinct from user-selected targets", () => {
    const context = buildDecisionTargetContext({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "starter-criteria",
    });

    expect(context.profileId).toBe("truecap-starter-criteria");
    expect(context.profileName).toBe("TrueCap starter criteria");
    expect(context.profileVersion).toBe("starter-criteria-v1");
    expect(context.origin).toBe("truecap-starter-criteria");
    expect(context.source).toBe("starter-criteria");
  });

  it("uses a real supplied profile version and never synthesizes one for an unversioned Buy Box", () => {
    const versioned = buildDecisionTargetContext({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: SAMPLE_DEAL_FIXTURE.targetProfile.source,
      profileId: SAMPLE_DEAL_FIXTURE.targetProfile.id,
      profileName: SAMPLE_DEAL_FIXTURE.targetProfile.name,
      profileVersion: SAMPLE_DEAL_FIXTURE.targetProfile.version,
    });
    const unversioned = buildDecisionTargetContext({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "buy-box",
      profileId: "box-123",
      profileName: "Acquisition box",
    });

    expect(versioned.profileVersion).toBe("1.0");
    expect(versioned.identityStatus).toBe("identified-profile-versioned");
    expect(unversioned.profileVersion).toBeNull();
    expect(unversioned.identityStatus).toBe("identified-profile-unversioned");
  });

  it("reports rule fit without inferring the user's investment decision", () => {
    expect(
      deriveRuleFit({
        result,
        target: SAMPLE_DEAL_FIXTURE.maoTarget,
        targetResolutionState: "ready",
      })
    ).toBe("does_not_meet_selected_rules");
    expect(ruleFitLabel("does_not_meet_selected_rules")).toBe(
      "Does not meet selected rules at asking"
    );
    expect(
      deriveRuleFit({
        result,
        target: { monthlyCashFlow: 0, dscr: 1.25 },
        targetResolutionState: "ready",
      })
    ).toBe("meets_selected_rules");
    expect(ruleFitLabel("meets_selected_rules")).toBe(
      "Meets selected rules at asking"
    );
    expect(
      deriveRuleFit({
        result,
        target: SAMPLE_DEAL_FIXTURE.maoTarget,
        targetResolutionState: "loading",
      })
    ).toBe("cannot_determine");
    expect(
      deriveRuleFit({
        result,
        target: { monthlyCashFlow: 0 },
        targetResolutionState: "ready",
        targetSource: "buy-box",
        buyBoxFit: null,
      })
    ).toBe("cannot_determine");
    expect(
      deriveRuleFit({
        result,
        target: { monthlyCashFlow: 0 },
        targetResolutionState: "ready",
        targetSource: "buy-box",
        buyBoxFit: true,
        hasUnevaluableSelectedRules: true,
      })
    ).toBe("cannot_determine");
    expect(
      deriveRuleFit({
        result,
        target: { monthlyCashFlow: 0, dscr: 1.25 },
        targetResolutionState: "ready",
        targetSource: "selected-targets",
        buyBoxFit: false,
        hasUnevaluableSelectedRules: true,
      })
    ).toBe("meets_selected_rules");
  });

  it("maps only explicit workflow stages to a recorded user decision", () => {
    expect(userDecisionFromPipelineStage(null)).toBe("undecided");
    expect(userDecisionFromPipelineStage("analyzing")).toBe("undecided");
    expect(userDecisionFromPipelineStage("negotiating")).toBe("negotiate");
    expect(userDecisionFromPipelineStage("passed")).toBe("pass");
    expect(userDecisionFromPipelineStage("offer")).toBe("pursue");
    expect(userDecisionFromPipelineStage("under_contract")).toBe("pursue");
  });

  it("never upgrades user confirmation into evidence verification", () => {
    const baseline = buildInputConfidence({ values });
    const materialKeys = baseline.fields
      .filter((field) => field.offerReadyRequired)
      .map((field) => field.key);
    const confidence = buildInputConfidence({
      values,
      verified: evidenceFor(materialKeys, "user-confirmed"),
      now: new Date("2026-08-24T12:01:00.000Z"),
    });
    const ledger = buildAssumptionLedger(confidence);

    expect(confidence.stage).toBe("offer-ready");
    expect(ledger.readiness).toBe("verify");
    expect(ledger.userConfirmedCount).toBe(materialKeys.length);
    expect(ledger.evidenceVerifiedCount).toBe(0);
    expect(ledger.highestImpactUnresolved).not.toBeNull();
    expect(confirmationTypeForEvidence(true)).toBe("unreviewed");
    expect(
      confirmationTypeForEvidence({ evidenceType: "recent-verified-financing-profile" })
    ).toBe("user-confirmed");
    expect(
      confirmationTypeForEvidence({ evidenceType: "third-party-verified" })
    ).toBe("user-confirmed");
  });

  it("requires server-resolved evidence for every material input and fails closed on hard flags", () => {
    const baseline = buildInputConfidence({ values });
    const materialKeys = baseline.fields
      .filter((field) => field.offerReadyRequired)
      .map((field) => field.key);
    const confidence = buildInputConfidence({
      values,
      verified: evidenceFor(materialKeys, "evidence-attached"),
      now: new Date("2026-08-24T12:01:00.000Z"),
    });

    const forgedBrowserEvidence = buildAssumptionLedger(confidence);
    expect(forgedBrowserEvidence.readiness).toBe("verify");
    expect(forgedBrowserEvidence.evidenceVerifiedCount).toBe(0);

    const trustedConfirmations = Object.fromEntries(
      materialKeys.map((key) => [key, "evidence-attached-cited" as const])
    );
    const trustedEvidence = {
      authority: "server-owner-scoped-evidence-v1" as const,
      confirmations: trustedConfirmations,
    };
    const complete = buildAssumptionLedger(confidence, { trustedEvidence });
    expect(complete.readiness).toBe("evidence-complete");
    expect(complete.evidenceVerifiedCount).toBe(complete.materialInputCount);

    const failedProvider = buildAssumptionLedger(confidence, {
      hardFlags: { rent: ["provider-failure"] },
      trustedEvidence,
    });
    expect(failedProvider.readiness).toBe("verify");
    expect(failedProvider.evidenceVerifiedCount).toBe(
      failedProvider.materialInputCount - 1
    );
    expect(failedProvider.highestImpactUnresolved?.key).toBe("rent");
  });

  it.each([
    "missing-provenance",
    "stale",
    "geography-mismatch",
    "unit-property-mismatch",
    "conflicting-evidence",
    "redisplay-restricted",
    "provider-failure",
  ] satisfies AssumptionHardFlag[])(
    "does not count trusted evidence carrying the %s hard flag",
    (hardFlag) => {
      const baseline = buildInputConfidence({ values });
      const materialKeys = baseline.fields
        .filter((field) => field.offerReadyRequired)
        .map((field) => field.key);
      const ledger = buildAssumptionLedger(baseline, {
        hardFlags: { rent: [hardFlag] },
        trustedEvidence: {
          authority: "server-owner-scoped-evidence-v1",
          confirmations: Object.fromEntries(
            materialKeys.map((key) => [key, "third-party-verified" as const])
          ),
        },
      });

      expect(ledger.readiness).toBe("verify");
      expect(ledger.items.find((item) => item.key === "rent")?.evidenceVerified).toBe(false);
      expect(ledger.items.find((item) => item.key === "rent")?.hardFlags).toContain(hardFlag);
    }
  );

  it("keeps missing required inputs in Screening", () => {
    const confidence = buildInputConfidence({
      values: { ...values, monthlyRent: 0 },
    });
    const ledger = buildAssumptionLedger(confidence);
    expect(ledger.readiness).toBe("screening");
    expect(ledger.highestImpactUnresolved?.key).toBe("rent");
  });

  it("never produces offer-oriented next actions before or after evidence completion", () => {
    const confidence = buildInputConfidence({ values });
    const materialKeys = confidence.fields
      .filter((field) => field.offerReadyRequired)
      .map((field) => field.key);
    const completedConfidence = buildInputConfidence({
        values,
        verified: evidenceFor(materialKeys, "evidence-attached"),
      });
    const completedEvidence = buildAssumptionLedger(completedConfidence, {
      trustedEvidence: {
        authority: "server-owner-scoped-evidence-v1",
        confirmations: Object.fromEntries(
          materialKeys.map((key) => [key, "evidence-attached-cited" as const])
        ),
      },
    });
    const verifyAction = buildSafeNextAction({
      ruleFit: "meets_selected_rules",
      evidence: buildAssumptionLedger(confidence),
    });
    const recordAction = buildSafeNextAction({
      ruleFit: "does_not_meet_selected_rules",
      evidence: completedEvidence,
    });
    const shareAction = buildSafeNextAction({
      ruleFit: "meets_selected_rules",
      evidence: completedEvidence,
      userDecision: "negotiate",
    });

    expect(verifyAction.kind).toBe("verify-input");
    expect(verifyAction.reason).toMatch(
      /modeled sensitivity check|modeled sensitivity is unavailable/
    );
    expect(recordAction.label).toBe("Record your decision");
    expect(shareAction.label).toBe("Share for review");
    for (const action of [verifyAction, recordAction, shareAction]) {
      expect(`${action.label} ${action.reason}`).not.toMatch(
        /make (?:an |the |your )?offer|submit (?:an |the )?offer|good investment|safely pay/i
      );
    }
  });

  it("does not present the solver's supported boundary as a finite economic ceiling", () => {
    const presentation = {
      source: "selected-targets",
      sourceLabel: "Under selected targets",
      ceiling: MAX_PURCHASE_PRICE,
      askingPrice: 200_000,
      listPriceGap: 200_000 - MAX_PURCHASE_PRICE,
      listPriceGapPct: null,
      marginOfSafetyPct: null,
      bindingConstraints: [],
      nextConstraint: null,
      range: {
        lower: MAX_PURCHASE_PRICE,
        base: MAX_PURCHASE_PRICE,
        upper: MAX_PURCHASE_PRICE,
        label: "rent ±5%, rate ±0.5 points, vacancy ±2 points",
      },
    } satisfies OfferCeilingPresentation;

    expect(
      offerCeilingSemanticStatus({
        presentation,
        target: { monthlyCashFlow: -1_000_000 },
      })
    ).toBe("no-finite-ceiling-in-supported-range");
    expect(
      offerCeilingSemanticStatus({
        presentation,
        target: { maxPurchasePrice: MAX_PURCHASE_PRICE },
      })
    ).toBe("calculated");
  });
});
