/**
 * Durable provenance for the exact criteria that own one Offer Ceiling.
 *
 * A numeric target plus `source: "buy-box"` is not enough provenance: when
 * several Buy Boxes exist, a later render can pick a different live box and
 * pair its verdict with the recorded number. This small, JSON-safe snapshot
 * freezes the selected box (or the user's custom target) at adoption time so
 * run, verdict, save, share, reopen, and repeat-deal flows all use one basis.
 *
 * Stored inside existing JSON snapshots/drafts. No database migration is
 * required. Invalid or legacy anonymous `buy-box` bindings fail closed to
 * copied custom criteria at their caller boundary.
 */

import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import { normalizeAnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type {
  BuyBoxCriteria,
  BuyBoxPropertyType,
  NamedBuyBox,
} from "@/lib/buy-box";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  maoTargetFingerprint,
  normalizeMaoTarget,
} from "@/lib/mao-target-editor";

export const OFFER_CEILING_DECISION_BASIS_VERSION = 1 as const;
export const OFFER_CEILING_DECISION_BASIS_FIELD =
  "offerCeilingDecisionBasis" as const;

type BuyBoxRulesSnapshot = {
  kind: "buy-box";
  boxId: string;
  boxName: string;
  strategyKind: string | null;
  criteria: BuyBoxCriteria;
};

type SelectedTargetRulesSnapshot = {
  kind: "selected-targets";
  criteria: MaoTarget;
};

type StarterCriteriaRulesSnapshot = {
  kind: "starter-criteria";
  criteria: MaoTarget;
};

export type OfferCeilingDecisionBasis = {
  version: typeof OFFER_CEILING_DECISION_BASIS_VERSION;
  capturedAt: string;
  strategyKey: AnalyzerStrategyKey;
  source: "buy-box" | "starter-criteria" | "selected-targets";
  target: MaoTarget;
  /** Deterministic fingerprint of source + strategy + immutable rule snapshot. */
  rulesFingerprint: string;
  rules:
    | BuyBoxRulesSnapshot
    | StarterCriteriaRulesSnapshot
    | SelectedTargetRulesSnapshot;
};

const PROPERTY_TYPES = new Set<BuyBoxPropertyType>([
  "single-family",
  "multi-family",
  "owner-occupant",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableFinite(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeCriteria(value: unknown): BuyBoxCriteria | null {
  const record = asRecord(value);
  if (!record) return null;
  const minCapRatePct = nullableFinite(record.minCapRatePct);
  const minCocPct = nullableFinite(record.minCocPct);
  const minDscr = nullableFinite(record.minDscr);
  const minCashFlowMonthly = nullableFinite(record.minCashFlowMonthly);
  const maxPurchasePrice = nullableFinite(record.maxPurchasePrice);
  const hasMinIrrPct = Object.prototype.hasOwnProperty.call(record, "minIrrPct");
  const hasMaxCashRequired = Object.prototype.hasOwnProperty.call(
    record,
    "maxCashRequired",
  );
  const minIrrPct = hasMinIrrPct
    ? nullableFinite(record.minIrrPct)
    : undefined;
  const maxCashRequired = hasMaxCashRequired
    ? nullableFinite(record.maxCashRequired)
    : undefined;
  if (
    minCapRatePct === undefined ||
    minCocPct === undefined ||
    minDscr === undefined ||
    minCashFlowMonthly === undefined ||
    maxPurchasePrice === undefined ||
    (hasMinIrrPct && minIrrPct === undefined) ||
    (hasMaxCashRequired && maxCashRequired === undefined) ||
    !Array.isArray(record.propertyTypes) ||
    !Array.isArray(record.targetStates) ||
    typeof record.isActive !== "boolean"
  ) {
    return null;
  }
  const propertyTypes = record.propertyTypes.filter(
    (entry): entry is BuyBoxPropertyType =>
      typeof entry === "string" && PROPERTY_TYPES.has(entry as BuyBoxPropertyType),
  );
  if (propertyTypes.length !== record.propertyTypes.length) return null;
  const targetStates = record.targetStates.filter(
    (entry): entry is string =>
      typeof entry === "string" && /^[A-Z]{2}$/.test(entry),
  );
  if (targetStates.length !== record.targetStates.length) return null;
  return {
    minCapRatePct,
    minCocPct,
    minDscr,
    minCashFlowMonthly,
    maxPurchasePrice,
    ...(hasMinIrrPct ? { minIrrPct: minIrrPct! } : {}),
    ...(hasMaxCashRequired ? { maxCashRequired: maxCashRequired! } : {}),
    propertyTypes: [...propertyTypes],
    targetStates: [...targetStates],
    isActive: record.isActive,
  };
}

function canonicalRulesPayload(
  input: Pick<
    OfferCeilingDecisionBasis,
    "source" | "strategyKey" | "target" | "rules"
  >,
): string {
  return JSON.stringify({
    version: OFFER_CEILING_DECISION_BASIS_VERSION,
    source: input.source,
    strategyKey: input.strategyKey,
    target: input.target,
    rules: input.rules,
  });
}

/** Small deterministic client/server-safe hash. Integrity comes from strict
 * re-normalization and expected-target matching; this value is an identity
 * fingerprint, not a security signature. */
function fingerprint(payload: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `criteria-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function rulesFingerprint(
  input: Pick<
    OfferCeilingDecisionBasis,
    "source" | "strategyKey" | "target" | "rules"
  >,
): string {
  return fingerprint(canonicalRulesPayload(input));
}

function normalizedCapturedAt(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function captureTime(capturedAt?: string): string {
  return normalizedCapturedAt(capturedAt) ?? new Date().toISOString();
}

export function captureBuyBoxDecisionBasis(input: {
  box: NamedBuyBox;
  target: MaoTarget;
  strategyKey: AnalyzerStrategyKey;
  capturedAt?: string;
}): OfferCeilingDecisionBasis {
  const target = normalizeMaoTarget(input.target);
  if (!target) throw new Error("A Buy Box decision basis requires a valid target");
  const criteria: BuyBoxCriteria = {
    minCapRatePct: input.box.minCapRatePct,
    minCocPct: input.box.minCocPct,
    minDscr: input.box.minDscr,
    minCashFlowMonthly: input.box.minCashFlowMonthly,
    maxPurchasePrice: input.box.maxPurchasePrice,
    ...(input.box.minIrrPct !== undefined
      ? { minIrrPct: input.box.minIrrPct }
      : {}),
    ...(input.box.maxCashRequired !== undefined
      ? { maxCashRequired: input.box.maxCashRequired }
      : {}),
    propertyTypes: [...input.box.propertyTypes],
    targetStates: [...input.box.targetStates],
    isActive: input.box.isActive,
  };
  const rules: BuyBoxRulesSnapshot = {
    kind: "buy-box",
    boxId: input.box.id,
    boxName: input.box.name.trim().slice(0, 80) || "Buy Box",
    strategyKind: input.box.strategyKind?.slice(0, 64) ?? null,
    criteria,
  };
  const seed = {
    source: "buy-box" as const,
    strategyKey: input.strategyKey,
    target,
    rules,
  };
  return {
    version: OFFER_CEILING_DECISION_BASIS_VERSION,
    capturedAt: captureTime(input.capturedAt),
    ...seed,
    rulesFingerprint: rulesFingerprint(seed),
  };
}

export function captureSelectedTargetsDecisionBasis(input: {
  target: MaoTarget;
  strategyKey: AnalyzerStrategyKey;
  capturedAt?: string;
}): OfferCeilingDecisionBasis {
  const target = normalizeMaoTarget(input.target);
  if (!target) throw new Error("A selected-target basis requires a valid target");
  const rules: SelectedTargetRulesSnapshot = {
    kind: "selected-targets",
    criteria: target,
  };
  const seed = {
    source: "selected-targets" as const,
    strategyKey: input.strategyKey,
    target,
    rules,
  };
  return {
    version: OFFER_CEILING_DECISION_BASIS_VERSION,
    capturedAt: captureTime(input.capturedAt),
    ...seed,
    rulesFingerprint: rulesFingerprint(seed),
  };
}

/** Capture explicit acceptance of the visible TrueCap starter criteria
 * without relabeling those unchanged product defaults as user-authored. */
export function captureStarterCriteriaDecisionBasis(input: {
  target: MaoTarget;
  strategyKey: AnalyzerStrategyKey;
  capturedAt?: string;
}): OfferCeilingDecisionBasis {
  const target = normalizeMaoTarget(input.target);
  if (!target) throw new Error("A starter-criteria basis requires a valid target");
  const rules: StarterCriteriaRulesSnapshot = {
    kind: "starter-criteria",
    criteria: target,
  };
  const seed = {
    source: "starter-criteria" as const,
    strategyKey: input.strategyKey,
    target,
    rules,
  };
  return {
    version: OFFER_CEILING_DECISION_BASIS_VERSION,
    capturedAt: captureTime(input.capturedAt),
    ...seed,
    rulesFingerprint: rulesFingerprint(seed),
  };
}

export function normalizeOfferCeilingDecisionBasis(
  value: unknown,
  expected?: {
    target?: unknown;
    source?: unknown;
    strategyKey?: unknown;
  },
): OfferCeilingDecisionBasis | null {
  const record = asRecord(value);
  if (!record || record.version !== OFFER_CEILING_DECISION_BASIS_VERSION) {
    return null;
  }
  const capturedAt = normalizedCapturedAt(record.capturedAt);
  const strategyKey = normalizeAnalyzerStrategyKey(record.strategyKey);
  const source =
    record.source === "buy-box" ||
    record.source === "starter-criteria" ||
    record.source === "selected-targets"
      ? record.source
      : null;
  const target = normalizeMaoTarget(record.target);
  const rawRules = asRecord(record.rules);
  if (!capturedAt || !strategyKey || !source || !target || !rawRules) return null;

  let rules:
    | BuyBoxRulesSnapshot
    | StarterCriteriaRulesSnapshot
    | SelectedTargetRulesSnapshot;
  if (source === "buy-box") {
    const criteria = normalizeCriteria(rawRules.criteria);
    if (
      rawRules.kind !== "buy-box" ||
      typeof rawRules.boxId !== "string" ||
      !rawRules.boxId.trim() ||
      rawRules.boxId.length > 128 ||
      typeof rawRules.boxName !== "string" ||
      !rawRules.boxName.trim() ||
      rawRules.boxName.length > 80 ||
      !(
        rawRules.strategyKind === null ||
        (typeof rawRules.strategyKind === "string" &&
          rawRules.strategyKind.length <= 64)
      ) ||
      !criteria
    ) {
      return null;
    }
    rules = {
      kind: "buy-box",
      boxId: rawRules.boxId,
      boxName: rawRules.boxName.trim(),
      strategyKind: rawRules.strategyKind,
      criteria,
    };
  } else {
    const criteria = normalizeMaoTarget(rawRules.criteria);
    const expectedKind =
      source === "starter-criteria" ? "starter-criteria" : "selected-targets";
    if (rawRules.kind !== expectedKind || !criteria) return null;
    rules = { kind: expectedKind, criteria };
    if (maoTargetFingerprint(criteria) !== maoTargetFingerprint(target)) {
      return null;
    }
  }

  const normalized: OfferCeilingDecisionBasis = {
    version: OFFER_CEILING_DECISION_BASIS_VERSION,
    capturedAt,
    strategyKey,
    source,
    target,
    rulesFingerprint: "",
    rules,
  };
  const expectedFingerprint = rulesFingerprint(normalized);
  if (record.rulesFingerprint !== expectedFingerprint) return null;
  normalized.rulesFingerprint = expectedFingerprint;

  if (expected?.target !== undefined) {
    const expectedTarget = normalizeMaoTarget(expected.target);
    if (
      !expectedTarget ||
      maoTargetFingerprint(expectedTarget) !== maoTargetFingerprint(target)
    ) {
      return null;
    }
  }
  if (expected?.source !== undefined && expected.source !== source) return null;
  if (expected?.strategyKey !== undefined) {
    const expectedStrategy = normalizeAnalyzerStrategyKey(expected.strategyKey);
    if (!expectedStrategy || expectedStrategy !== strategyKey) return null;
  }
  return normalized;
}

/** Rehydrate the immutable rule snapshot for evaluation. Never consults the
 * user's current Buy Box rows. */
export function namedBuyBoxFromDecisionBasis(
  basisInput: unknown,
): NamedBuyBox | null {
  const basis = normalizeOfferCeilingDecisionBasis(basisInput);
  if (!basis || basis.source !== "buy-box" || basis.rules.kind !== "buy-box") {
    return null;
  }
  return {
    id: basis.rules.boxId,
    name: basis.rules.boxName,
    strategyKind: basis.rules.strategyKind,
    isDefault: true,
    sortOrder: 0,
    clientId: null,
    ...basis.rules.criteria,
  };
}

/** Safe user-facing label. A missing/invalid basis is deliberately not a live
 * Buy Box claim. */
export function decisionBasisBuyBoxName(basisInput: unknown): string | null {
  const basis = normalizeOfferCeilingDecisionBasis(basisInput);
  return basis?.source === "buy-box" && basis.rules.kind === "buy-box"
    ? basis.rules.boxName
    : null;
}
