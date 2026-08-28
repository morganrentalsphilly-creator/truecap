/**
 * Advocacy-first decision contract (P0, presentation-only).
 *
 * This module deliberately adapts the current calculation, target, and input-
 * confidence models. It does not change formulas, solver thresholds, stored
 * snapshots, or legacy readiness values. Keeping the adapter pure makes the
 * rollout reversible and lets every surface share the same vocabulary.
 */

import type { AnalysisResult } from "@/lib/calc-analysis";
import type {
  InputConfidenceField,
  InputConfidenceFieldKey,
  InputConfidenceResult,
  InputSourceClass,
  InputVerificationEvidence,
} from "@/lib/input-confidence";
import {
  MAX_PURCHASE_PRICE,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import { maoTargetFingerprint } from "@/lib/mao-target-editor";
import { describeMaoTarget } from "@/lib/mao-targets";
import type {
  OfferCeilingPresentation,
  OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";

export const DECISION_CONTRACT_VERSION = "advocacy-p0-v1" as const;

export type RuleFit =
  | "meets_selected_rules"
  | "does_not_meet_selected_rules"
  | "cannot_determine";

export type UserDecision = "pursue" | "negotiate" | "pass" | "undecided";

export type EvidenceReadiness = "screening" | "verify" | "evidence-complete";

export type AssumptionSourceClass =
  | "direct-property-evidence"
  | "third-party-property-estimate"
  | "geographic-benchmark"
  | "scenario-assumption"
  | "interpretation"
  | "unknown";

export type AssumptionConfirmationType =
  | "unreviewed"
  | "user-confirmed"
  | "evidence-attached-cited"
  | "third-party-verified";

export type AssumptionHardFlag =
  | "missing-provenance"
  | "stale"
  | "geography-mismatch"
  | "unit-property-mismatch"
  | "conflicting-evidence"
  | "redisplay-restricted"
  | "provider-failure";

export type TargetProfileOrigin =
  | "user-selected"
  | "inherited"
  | "truecap-starter-criteria"
  | "truecap-screening-defaults";

export type DecisionTargetContext = {
  contractVersion: typeof DECISION_CONTRACT_VERSION;
  profileId: string | null;
  profileName: string;
  /** Null when the repository did not persist a real profile revision. */
  profileVersion: string | null;
  /** Content-addressed identity of the exact active numeric rule snapshot. */
  rulesSnapshotVersion: string;
  identityStatus:
    | "identified-profile-versioned"
    | "identified-profile-unversioned"
    | "captured-rules-only"
    | "screening-defaults";
  source: OfferCeilingTargetSource;
  origin: TargetProfileOrigin;
  rules: MaoTarget;
  rulesLabel: string;
};

export type AssumptionLedgerItem = {
  key: InputConfidenceFieldKey;
  label: string;
  sourceClass: AssumptionSourceClass;
  confirmationType: AssumptionConfirmationType;
  hardFlags: AssumptionHardFlag[];
  material: boolean;
  materialityBasis: string;
  materialityScore: number | null;
  verifyAction: string | null;
  reason: string;
  weight: number;
  evidenceVerified: boolean;
};

export type AssumptionLedger = {
  contractVersion: typeof DECISION_CONTRACT_VERSION;
  legacyMethodVersion: InputConfidenceResult["methodVersion"];
  readiness: EvidenceReadiness;
  readinessLabel: "Screening" | "Verify" | "Evidence complete";
  materialInputCount: number;
  evidenceVerifiedCount: number;
  userConfirmedCount: number;
  highestImpactUnresolved: AssumptionLedgerItem | null;
  items: AssumptionLedgerItem[];
};

export type TrustedEvidenceResolution = {
  /**
   * This marker may only be created from server-resolved, owner-scoped
   * evidence records. Browser verification payloads are not an authority.
   */
  authority: "server-owner-scoped-evidence-v1";
  confirmations: Partial<
    Record<
      InputConfidenceFieldKey,
      "evidence-attached-cited" | "third-party-verified"
    >
  >;
};

export type AssumptionSensitivity = {
  cashFlowSwing: number;
  dscrSwing: number;
  deltaLabel: string;
};

export type SafeNextAction = {
  label: string;
  reason: string;
  kind: "resolve-target" | "verify-input" | "record-decision" | "share-review";
};

export type OfferCeilingSemanticStatus =
  | "calculated"
  | "not-reachable"
  | "no-finite-ceiling-in-supported-range";

const EVIDENCE_CONFIRMATION_TYPES = new Set<AssumptionConfirmationType>([
  "evidence-attached-cited",
  "third-party-verified",
]);

export function buildDecisionTargetContext(args: {
  target: MaoTarget;
  source: OfferCeilingTargetSource;
  profileId?: string | null;
  profileName?: string | null;
  profileVersion?: string | null;
  inherited?: boolean;
}): DecisionTargetContext {
  const isDefaults = args.source === "screening-defaults";
  const isStarter = args.source === "starter-criteria";
  const profileId = isDefaults
    ? "truecap-screening-defaults"
    : isStarter
      ? "truecap-starter-criteria"
      : args.profileId?.trim() || null;
  const profileVersion = isDefaults
    ? "screening-defaults-v1"
    : isStarter
      ? "starter-criteria-v1"
      : args.profileVersion?.trim() || null;
  const profileName = isDefaults
    ? "TrueCap screening defaults"
    : isStarter
      ? "TrueCap starter criteria"
      : args.profileName?.trim() ||
        (args.source === "buy-box" ? "Captured selected targets" : "Selected targets");
  const targetFingerprint = maoTargetFingerprint(args.target);

  return {
    contractVersion: DECISION_CONTRACT_VERSION,
    profileId,
    profileName,
    profileVersion,
    // Keep the snapshot identity injective. A short, non-cryptographic hash can
    // silently collide and make two different target sets look identical.
    rulesSnapshotVersion: `rules-v1:${encodeURIComponent(targetFingerprint)}`,
    identityStatus: isDefaults
      ? "screening-defaults"
      : profileId && profileVersion
        ? "identified-profile-versioned"
        : profileId
          ? "identified-profile-unversioned"
        : "captured-rules-only",
    source: args.source,
    origin: isDefaults
      ? "truecap-screening-defaults"
      : isStarter
        ? "truecap-starter-criteria"
      : args.inherited
        ? "inherited"
        : "user-selected",
    rules: { ...args.target },
    rulesLabel: describeMaoTarget(args.target),
  };
}

function mapSourceClass(sourceClass: InputSourceClass): AssumptionSourceClass {
  switch (sourceClass) {
    case "property-specific":
      // Property-specific values are not automatically documentary evidence.
      return "third-party-property-estimate";
    case "local-estimate":
    case "market-benchmark":
      return "geographic-benchmark";
    case "user-estimate":
    case "generic-default":
      return "scenario-assumption";
    case "verified":
      // Input Confidence v1 replaces the original source when a user clicks
      // Verify. The adapter must not invent the source that was overwritten.
      return "unknown";
    case "missing":
    case "not-applicable":
      return "unknown";
  }
}

function evidenceFor(
  evidence: InputVerificationEvidence,
  key: InputConfidenceFieldKey
): Exclude<InputVerificationEvidence[InputConfidenceFieldKey], boolean> | null {
  const value = evidence[key];
  return value && typeof value === "object" ? value : null;
}

export function confirmationTypeForEvidence(
  value: InputVerificationEvidence[InputConfidenceFieldKey] | null
): AssumptionConfirmationType {
  if (!value || typeof value !== "object") return "unreviewed";
  switch (value.evidenceType) {
    case "user-confirmed":
    case "recent-verified-financing-profile":
      return "user-confirmed";
    case "evidence-attached":
    case "evidence-cited":
    case "third-party-verified":
      // Legacy verification evidence is supplied by the browser and uses a
      // client-computable value fingerprint. Treat even impressive labels as
      // self-attestation until an owner-scoped server record resolves them.
      return "user-confirmed";
    default:
      // Unknown/legacy labels fail closed. A string is not proof by itself.
      return "unreviewed";
  }
}

function defaultHardFlags(field: InputConfidenceField): AssumptionHardFlag[] {
  return field.sourceClass === "missing" || field.sourceClass === "generic-default"
    ? ["missing-provenance"]
    : [];
}

export function buildAssumptionLedger(
  confidence: InputConfidenceResult,
  options: {
    hardFlags?: Partial<Record<InputConfidenceFieldKey, readonly AssumptionHardFlag[]>>;
    sensitivity?: Partial<Record<InputConfidenceFieldKey, AssumptionSensitivity>>;
    trustedEvidence?: TrustedEvidenceResolution;
  } = {}
): AssumptionLedger {
  const items = confidence.fields.map<AssumptionLedgerItem>((field) => {
    const evidence = evidenceFor(confidence.verificationEvidence, field.key);
    const confirmationType =
      options.trustedEvidence?.authority === "server-owner-scoped-evidence-v1" &&
      options.trustedEvidence.confirmations[field.key]
        ? options.trustedEvidence.confirmations[field.key]!
        : confirmationTypeForEvidence(evidence);
    const hardFlags = Array.from(
      new Set([
        ...defaultHardFlags(field),
        ...(options.hardFlags?.[field.key] ?? []),
      ])
    );
    const evidenceVerified =
      EVIDENCE_CONFIRMATION_TYPES.has(confirmationType) && hardFlags.length === 0;
    const sensitivity = options.sensitivity?.[field.key];
    return {
      key: field.key,
      label: field.label,
      sourceClass: mapSourceClass(field.sourceClass),
      confirmationType,
      hardFlags,
      material: field.offerReadyRequired,
      materialityBasis: sensitivity
        ? `${sensitivity.deltaLabel} scenario moves monthly cash flow by about $${Math.round(
            sensitivity.cashFlowSwing
          ).toLocaleString("en-US")} across the tested range${
            sensitivity.dscrSwing > 0
              ? ` and DSCR by ${sensitivity.dscrSwing.toFixed(2)}`
              : ""
          }.`
        : "Required-field evidence policy; modeled sensitivity is not available for this field.",
      materialityScore: sensitivity
        ? Math.abs(sensitivity.cashFlowSwing) + Math.abs(sensitivity.dscrSwing) * 1_000
        : null,
      verifyAction:
        confirmationType === "user-confirmed" && !evidenceVerified
          ? `Add evidence for ${field.label.toLowerCase()}`
          : field.verifyAction,
      reason:
        confirmationType === "user-confirmed" && !evidenceVerified
          ? "User confirmed this value, but no owner-scoped evidence record supports it."
          : field.reason,
      weight: field.weight,
      evidenceVerified,
    };
  });

  const material = items.filter((item) => item.material);
  const unresolved = material
    .filter((item) => !item.evidenceVerified)
    .sort(
      (a, b) =>
        (b.materialityScore ?? -1) - (a.materialityScore ?? -1) ||
        b.weight - a.weight ||
        a.label.localeCompare(b.label)
    );
  const evidenceVerifiedCount = material.filter((item) => item.evidenceVerified).length;
  const userConfirmedCount = material.filter(
    (item) => item.confirmationType === "user-confirmed"
  ).length;
  const hasMissingMaterialInput = confidence.fields.some(
    (field) => field.offerReadyRequired && field.sourceClass === "missing"
  );
  const readiness: EvidenceReadiness =
    material.length > 0 && evidenceVerifiedCount === material.length
      ? "evidence-complete"
      : hasMissingMaterialInput
        ? "screening"
        : "verify";

  return {
    contractVersion: DECISION_CONTRACT_VERSION,
    legacyMethodVersion: confidence.methodVersion,
    readiness,
    readinessLabel:
      readiness === "evidence-complete"
        ? "Evidence complete"
        : readiness === "verify"
          ? "Verify"
          : "Screening",
    materialInputCount: material.length,
    evidenceVerifiedCount,
    userConfirmedCount,
    highestImpactUnresolved: unresolved[0] ?? null,
    items,
  };
}

export function deriveRuleFit(args: {
  result: AnalysisResult | null;
  /** Accepted inputs are required to evaluate a contribution-aware IRR rule. */
  values?: InvestmentFormValues | null;
  target: MaoTarget | null;
  targetResolutionState?: "loading" | "ready" | "error";
  targetSource?: OfferCeilingTargetSource;
  buyBoxFit?: boolean | null;
  hasUnevaluableSelectedRules?: boolean;
}): RuleFit {
  if (
    args.targetResolutionState !== undefined &&
    args.targetResolutionState !== "ready"
  ) {
    return "cannot_determine";
  }
  if (
    !args.result ||
    !args.target ||
    !Object.values(args.target).some((value) => value !== undefined)
  ) {
    return "cannot_determine";
  }
  const usesBuyBox = args.targetSource === "buy-box";
  if (
    usesBuyBox &&
    (args.hasUnevaluableSelectedRules || typeof args.buyBoxFit !== "boolean")
  ) {
    return "cannot_determine";
  }
  if (
    (usesBuyBox && args.buyBoxFit === false) ||
    !meetsMaoTarget(args.result, args.target, args.values ?? undefined)
  ) {
    return "does_not_meet_selected_rules";
  }
  return "meets_selected_rules";
}

export function ruleFitLabel(ruleFit: RuleFit): string {
  if (ruleFit === "meets_selected_rules") {
    return "Meets selected rules at asking";
  }
  if (ruleFit === "does_not_meet_selected_rules") {
    return "Does not meet selected rules at asking";
  }
  return "Cannot determine rule fit yet";
}

export function userDecisionFromPipelineStage(stage: string | null | undefined): UserDecision {
  switch (stage) {
    case "passed":
      return "pass";
    case "negotiating":
      return "negotiate";
    case "offer":
    case "under_contract":
    case "closed":
      return "pursue";
    default:
      return "undecided";
  }
}

export function userDecisionLabel(decision: UserDecision): string {
  if (decision === "pursue") return "Pursue";
  if (decision === "negotiate") return "Negotiate";
  if (decision === "pass") return "Pass";
  return "Not recorded";
}

export function offerCeilingHelperCopy(target: DecisionTargetContext): string {
  return `Highest modeled price that still meets ${target.profileName} under the assumptions shown.`;
}

export function offerCeilingSemanticStatus(args: {
  presentation: OfferCeilingPresentation | null;
  target: MaoTarget;
}): OfferCeilingSemanticStatus {
  if (!args.presentation) return "not-reachable";
  const isExplicitSupportedLimit =
    args.target.maxPurchasePrice === MAX_PURCHASE_PRICE;
  if (
    args.presentation.ceiling >= MAX_PURCHASE_PRICE &&
    !isExplicitSupportedLimit
  ) {
    return "no-finite-ceiling-in-supported-range";
  }
  return "calculated";
}

export function buildSafeNextAction(args: {
  ruleFit: RuleFit;
  evidence: AssumptionLedger | null;
  userDecision?: UserDecision;
}): SafeNextAction {
  const userDecision = args.userDecision ?? "undecided";
  if (args.ruleFit === "cannot_determine") {
    return {
      kind: "resolve-target",
      label: "Review the active target rules",
      reason: "Rule fit cannot be determined until the target context is available.",
    };
  }

  if (!args.evidence) {
    return {
      kind: "verify-input",
      label: "Verify the material assumptions",
      reason: "Evidence readiness is unavailable for this analysis.",
    };
  }

  if (args.evidence.readiness !== "evidence-complete") {
    const unresolved = args.evidence.highestImpactUnresolved;
    return {
      kind: "verify-input",
      label: unresolved?.verifyAction ??
        (unresolved ? `Verify ${unresolved.label}` : "Verify the material assumptions"),
      reason: unresolved
        ? unresolved.materialityScore != null
          ? `${unresolved.label} is the highest-impact unresolved material input in the modeled sensitivity check.`
          : `${unresolved.label} is the next unresolved material input under the disclosed policy; modeled sensitivity is unavailable for this field.`
        : "Material evidence remains unresolved.",
    };
  }

  if (userDecision !== "undecided") {
    return {
      kind: "share-review",
      label: "Share for review",
      reason: "The decision is recorded; share the frozen assumptions and rules for review.",
    };
  }

  return {
    kind: "record-decision",
    label: "Record your decision",
    reason:
      args.ruleFit === "meets_selected_rules"
        ? "The model meets the selected rules; the investment decision is still yours."
        : "The model does not meet the selected rules; record how you want to proceed.",
  };
}
