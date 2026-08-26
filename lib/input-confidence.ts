/**
 * Input Confidence v1.1
 *
 * A deterministic assessment of how decision-ready the INPUTS are. This is
 * intentionally separate from Deal Score / Buy Box fit, which assess the
 * economics. The percentage is a weighted completeness/provenance score, not
 * a probability, prediction, or measure of investment quality.
 */

import type { EnrichmentProvenanceInput } from "./data-confidence";
import type { InvestmentFormValues } from "./investcalc-schema";

/**
 * v1.1 adds Year Built as a weighted readiness input. Versioning the method
 * keeps persisted v1.0 assessments historically legible instead of silently
 * presenting their scores as if they used today's denominator.
 */
export const INPUT_CONFIDENCE_METHOD_VERSION = "1.1" as const;
export const LEGACY_INPUT_CONFIDENCE_METHOD_VERSIONS = ["1.0"] as const;

export const INPUT_CONFIDENCE_FIELD_KEYS = [
  "purchasePrice",
  "yearBuilt",
  "rent",
  "propertyTax",
  "insurance",
  "interestRate",
  "downPayment",
  "closingCosts",
  "maintenance",
  "capex",
  "vacancy",
  "management",
  "utilities",
  "hoa",
  "rehabBudget",
] as const;

export type InputConfidenceFieldKey = (typeof INPUT_CONFIDENCE_FIELD_KEYS)[number];

export type InputSourceClass =
  | "verified"
  | "property-specific"
  | "local-estimate"
  | "market-benchmark"
  | "user-estimate"
  | "generic-default"
  | "missing"
  | "not-applicable";

export type InputConfidenceStage = "screened" | "verified" | "offer-ready";
export type SensitivityRisk = "low" | "moderate" | "high";

export type InputVerificationEvidence = Partial<
  Record<
    InputConfidenceFieldKey,
    boolean | { verifiedAt?: string; evidenceType?: string; fingerprint?: string }
  >
>;

export type InputConfidenceField = {
  key: InputConfidenceFieldKey;
  label: string;
  sourceClass: InputSourceClass;
  sourceLabel: string;
  reason: string;
  verifyAction: string | null;
  editTarget: "property" | "financing" | "expenses" | null;
  weight: number;
  earnedPoints: number;
  maxPoints: number;
  offerReadyRequired: boolean;
};

export type InputConfidenceResult = {
  methodVersion: typeof INPUT_CONFIDENCE_METHOD_VERSION;
  score: number;
  /** Explicit reminder for downstream UI/analytics: this is not probability. */
  scoreMeaning: "weighted-input-readiness-not-probability";
  stage: InputConfidenceStage;
  stageLabel: "Screened" | "Verified" | "Offer Ready";
  sensitivityRisk: SensitivityRisk;
  fields: InputConfidenceField[];
  verificationQueue: InputConfidenceField[];
  offerReadyRemaining: InputConfidenceField[];
  verifiedFields: InputConfidenceFieldKey[];
  verificationEvidence: InputVerificationEvidence;
  /** Persistable, value-bound source context. This lets a reopened deal keep
   * honest HUD/FRED/user-estimate classifications without allowing that
   * provenance to follow an edited value. */
  sourceContext: InputConfidenceSourceContext;
  computedAt: string;
};

export type InputConfidenceSourceContext = {
  methodVersion: typeof INPUT_CONFIDENCE_METHOD_VERSION;
  provenance: EnrichmentProvenanceInput;
  touchedInputFields: string[];
  /** Field-scoped value fingerprints bind both benchmark attribution and
   * edit provenance to the exact assumption that earned it. */
  fieldFingerprints: Partial<Record<InputConfidenceFieldKey, string>>;
};

export type RestoredInputConfidenceContext = {
  provenance: EnrichmentProvenanceInput;
  touchedInputFields: string[];
};

export type MergeInputConfidenceSourceContextArgs = {
  persistedSourceContext?: unknown;
  values: InvestmentFormValues;
  liveProvenance?: EnrichmentProvenanceInput | null;
  liveTouchedFields?: Record<string, unknown> | ReadonlySet<string> | null;
};

export type InputConfidenceContext = {
  values: InvestmentFormValues;
  provenance?: EnrichmentProvenanceInput | null;
  /** RHF dirty-fields record or a set of field names. A typed value is still
   * an estimate until the user explicitly verifies it. */
  touchedFields?: Record<string, unknown> | ReadonlySet<string> | null;
  verified?: InputVerificationEvidence | readonly InputConfidenceFieldKey[] | null;
  now?: Date;
};

const SOURCE_MULTIPLIER: Record<InputSourceClass, number> = {
  verified: 1,
  "property-specific": 0.8,
  "local-estimate": 0.65,
  "user-estimate": 0.5,
  "market-benchmark": 0.45,
  "generic-default": 0.2,
  missing: 0,
  "not-applicable": 0,
};

const FIELD_META: Record<
  InputConfidenceFieldKey,
  Pick<InputConfidenceField, "label" | "weight" | "editTarget">
> = {
  purchasePrice: { label: "Purchase price", weight: 12, editTarget: "property" },
  yearBuilt: { label: "Year built", weight: 4, editTarget: "property" },
  rent: { label: "Rent", weight: 16, editTarget: "property" },
  propertyTax: { label: "Property taxes", weight: 8, editTarget: "expenses" },
  insurance: { label: "Insurance", weight: 8, editTarget: "expenses" },
  interestRate: { label: "Mortgage rate", weight: 10, editTarget: "financing" },
  downPayment: { label: "Down payment / LTV", weight: 6, editTarget: "financing" },
  closingCosts: { label: "Closing costs", weight: 4, editTarget: "financing" },
  maintenance: { label: "Maintenance", weight: 6, editTarget: "expenses" },
  capex: { label: "CapEx reserve", weight: 6, editTarget: "expenses" },
  vacancy: { label: "Vacancy", weight: 5, editTarget: "expenses" },
  management: { label: "Management", weight: 5, editTarget: "expenses" },
  utilities: { label: "Owner-paid utilities", weight: 3, editTarget: "expenses" },
  hoa: { label: "HOA", weight: 3, editTarget: "expenses" },
  rehabBudget: { label: "Rehab budget", weight: 4, editTarget: "expenses" },
};

const INPUT_CONFIDENCE_TOUCHED_FIELD_MAP: Readonly<
  Record<string, InputConfidenceFieldKey>
> = Object.freeze({
  purchasePrice: "purchasePrice",
  yearBuilt: "yearBuilt",
  monthlyRent: "rent",
  units: "rent",
  avgDailyRate: "rent",
  occupancyPct: "rent",
  propertyTaxInputMode: "propertyTax",
  propertyTaxPct: "propertyTax",
  propertyTaxAnnual: "propertyTax",
  insuranceInputMode: "insurance",
  insurancePct: "insurance",
  insuranceMonthly: "insurance",
  interestRate: "interestRate",
  loanTermYears: "interestRate",
  pmiAnnualRatePct: "interestRate",
  pmiNoCancel: "interestRate",
  downPaymentPct: "downPayment",
  closingCostsPct: "closingCosts",
  maintenancePct: "maintenance",
  capexPct: "capex",
  vacancyPct: "vacancy",
  mgmtPct: "management",
  utilitiesMonthly: "utilities",
  hoaMonthly: "hoa",
  rehabBudget: "rehabBudget",
});

const PROVENANCE_CONFIDENCE_FIELD_MAP = Object.freeze({
  monthlyRent: "rent",
  interestRate: "interestRate",
  propertyTaxPct: "propertyTax",
} as const satisfies Record<keyof EnrichmentProvenanceInput, InputConfidenceFieldKey>);

function num(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTouched(
  touched: InputConfidenceContext["touchedFields"],
  ...keys: string[]
): boolean {
  if (!touched) return false;
  if (touched instanceof Set) return keys.some((key) => touched.has(key));
  return keys.some((key) => Boolean((touched as Record<string, unknown>)[key]));
}

function touchedInputFieldNames(
  touched: InputConfidenceContext["touchedFields"]
): string[] {
  if (!touched) return [];
  const candidates =
    touched instanceof Set
      ? Array.from(touched)
      : Object.entries(touched as Record<string, unknown>)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
  return candidates
    .filter(
      (key): key is string =>
        typeof key === "string" &&
        Object.prototype.hasOwnProperty.call(INPUT_CONFIDENCE_TOUCHED_FIELD_MAP, key)
    )
    .slice(0, 64);
}

function normalizedProvenance(
  provenance: EnrichmentProvenanceInput | null | undefined
): EnrichmentProvenanceInput {
  if (!provenance) return {};
  const output: EnrichmentProvenanceInput = {};
  for (const key of Object.keys(PROVENANCE_CONFIDENCE_FIELD_MAP) as Array<
    keyof EnrichmentProvenanceInput
  >) {
    const item = provenance[key];
    if (!item) continue;
    if (
      item.source !== "hud-fmr" &&
      item.source !== "hud-safmr" &&
      item.source !== "rentcast-estimate" &&
      item.source !== "fred" &&
      item.source !== "state-static" &&
      item.source !== "manual"
    ) {
      continue;
    }
    output[key] = {
      source: item.source,
      ...(typeof item.fetchedAt === "string"
        ? { fetchedAt: item.fetchedAt.slice(0, 40) }
        : {}),
      ...(typeof item.detail === "string"
        ? { detail: item.detail.slice(0, 160) }
        : {}),
      ...(typeof item.overridden === "boolean"
        ? { overridden: item.overridden }
        : {}),
    };
  }
  return output;
}

function buildInputConfidenceSourceContext(
  values: InvestmentFormValues,
  provenance: EnrichmentProvenanceInput | null | undefined,
  touchedFields: InputConfidenceContext["touchedFields"]
): InputConfidenceSourceContext {
  return {
    methodVersion: INPUT_CONFIDENCE_METHOD_VERSION,
    provenance: normalizedProvenance(provenance),
    touchedInputFields: touchedInputFieldNames(touchedFields),
    fieldFingerprints: Object.fromEntries(
      INPUT_CONFIDENCE_FIELD_KEYS.map((key) => [
        key,
        inputVerificationFingerprint(values, key),
      ])
    ) as Record<InputConfidenceFieldKey, string>,
  };
}

function verifiedSet(
  input: InputConfidenceContext["verified"],
  values: InvestmentFormValues,
  now: Date
): Set<InputConfidenceFieldKey> {
  if (!input) return new Set();
  if (Array.isArray(input)) return new Set(input);
  const output = new Set<InputConfidenceFieldKey>();
  for (const key of INPUT_CONFIDENCE_FIELD_KEYS) {
    const evidence = (input as InputVerificationEvidence)[key];
    // Persisted/object evidence is trusted only when bound to the exact
    // current value. Legacy `true` booleans and malformed objects fail closed;
    // arrays remain an explicit ephemeral convenience for pure callers/tests.
    if (
      !evidence ||
      typeof evidence !== "object" ||
      typeof evidence.fingerprint !== "string" ||
      evidence.fingerprint !== inputVerificationFingerprint(values, key)
    ) continue;
    // Lender quotes are unusually time-sensitive. A profile verified more
    // than 30 days ago stays visible as provenance, but it no longer earns
    // Verified input points until the user reconfirms it. Other evidence
    // types retain their existing value-specific expiration behavior.
    if (
      evidence.evidenceType === "recent-verified-financing-profile"
    ) {
      const verifiedAt = Date.parse(evidence.verifiedAt ?? "");
      const ageMs = now.getTime() - verifiedAt;
      if (
        !Number.isFinite(verifiedAt) ||
        ageMs < -86_400_000 ||
        ageMs > 30 * 86_400_000
      ) {
        continue;
      }
    }
    output.add(key);
  }
  return output;
}

type FieldAssessment = Pick<
  InputConfidenceField,
  "sourceClass" | "sourceLabel" | "reason" | "verifyAction" | "offerReadyRequired"
>;

function field(
  key: InputConfidenceFieldKey,
  assessment: FieldAssessment
): InputConfidenceField {
  const meta = FIELD_META[key];
  const maxPoints = meta.weight;
  return {
    key,
    ...meta,
    ...assessment,
    earnedPoints:
      assessment.sourceClass === "not-applicable"
        ? 0
        : maxPoints * SOURCE_MULTIPLIER[assessment.sourceClass],
    maxPoints: assessment.sourceClass === "not-applicable" ? 0 : maxPoints,
  };
}

function explicitVerification(
  key: InputConfidenceFieldKey,
  isVerified: boolean,
  fallback: FieldAssessment
): FieldAssessment {
  return isVerified
    ? {
        sourceClass: "verified",
        sourceLabel: "You confirmed this input",
        reason: "Explicitly marked verified for this underwrite.",
        verifyAction: null,
        offerReadyRequired: fallback.offerReadyRequired,
      }
    : fallback;
}

function hasRent(values: InvestmentFormValues): boolean {
  if ((num(values.avgDailyRate) ?? 0) > 0 && (num(values.occupancyPct) ?? 0) > 0) return true;
  if (values.propertyType === "single-family") return (num(values.monthlyRent) ?? 0) > 0;
  return (values.units ?? []).some(
    (unit) => !unit.isOwnerOccupied && (num(unit.monthlyRent) ?? 0) > 0
  );
}

export function buildInputConfidence(context: InputConfidenceContext): InputConfidenceResult {
  const { values, provenance, touchedFields } = context;
  const now = context.now ?? new Date();
  const verified = verifiedSet(context.verified, values, now);
  const financed = (num(values.downPaymentPct) ?? 100) < 100;
  const pricePresent = (num(values.purchasePrice) ?? 0) > 0;
  const yearBuiltPresent = (num(values.yearBuilt) ?? 0) > 0;
  const rentPresent = hasRent(values);
  const rentProvenance = provenance?.monthlyRent;
  const rateProvenance = provenance?.interestRate;
  const taxProvenance = provenance?.propertyTaxPct;

  const fields: InputConfidenceField[] = [
    field(
      "purchasePrice",
      explicitVerification("purchasePrice", verified.has("purchasePrice"),
        pricePresent
          ? {
              sourceClass: "property-specific",
              sourceLabel: "Property asking/contract price",
              reason: "Specific to this property, but not explicitly confirmed.",
              verifyAction: "Confirm asking or contract price",
              offerReadyRequired: true,
            }
          : {
              sourceClass: "missing",
              sourceLabel: "Missing",
              reason: "A purchase price is required to underwrite the deal.",
              verifyAction: "Enter purchase price",
              offerReadyRequired: true,
            })
    ),
    field(
      "yearBuilt",
      yearBuiltPresent
        ? explicitVerification("yearBuilt", verified.has("yearBuilt"), {
            sourceClass: "property-specific",
            sourceLabel: "Entered year built",
            reason: "Used in the Screening Index age-risk check, but not yet confirmed against property records.",
            verifyAction: "Confirm year built from property records",
            offerReadyRequired: false,
          })
        : {
            sourceClass: "missing",
            sourceLabel: "Not provided",
            reason: "Unknown age receives a conservative Screening Index uncertainty modifier.",
            verifyAction: "Confirm year built from property records",
            offerReadyRequired: false,
          }
    ),
    field(
      "rent",
      explicitVerification("rent", verified.has("rent"),
        !rentPresent
          ? {
              sourceClass: "missing",
              sourceLabel: "Missing",
              reason: "Rent is required to evaluate income.",
              verifyAction: "Enter rent",
              offerReadyRequired: true,
            }
          : rentProvenance && !rentProvenance.overridden
            ? {
                sourceClass: "market-benchmark",
                sourceLabel:
                  rentProvenance.source === "rentcast-estimate"
                    ? "RentCast market-rent estimate"
                    : rentProvenance.source === "hud-safmr"
                      ? "HUD Rent Benchmark (ZIP)"
                      : "HUD Rent Benchmark (county)",
                reason:
                  rentProvenance.source === "rentcast-estimate"
                    ? "Automated market estimate, not verified in-place rent or a signed lease."
                    : "Geographic benchmark, not a property-specific rent comp.",
                verifyAction: "Verify with local rent comps",
                offerReadyRequired: true,
              }
            : {
                sourceClass: "user-estimate",
                sourceLabel: "Your entered rent",
                reason: "Entered value has no attached comp evidence yet.",
                verifyAction: "Confirm with recent rent comps",
                offerReadyRequired: true,
              })
    ),
    field(
      "propertyTax",
      explicitVerification("propertyTax", verified.has("propertyTax"),
        values.propertyTaxInputMode === "annual" && (num(values.propertyTaxAnnual) ?? 0) > 0
          ? {
              sourceClass: "property-specific",
              sourceLabel: "Annual property tax entered",
              reason: "Property-specific annual amount, not yet explicitly confirmed as the parcel bill.",
              verifyAction: "Confirm against parcel tax bill",
              offerReadyRequired: true,
            }
          : taxProvenance && !taxProvenance.overridden
            ? {
                sourceClass: "market-benchmark",
                sourceLabel: "State tax benchmark",
                reason: "Statewide effective rate can differ materially by parcel.",
                verifyAction: "Enter parcel tax bill",
                offerReadyRequired: true,
              }
            : isTouched(touchedFields, "propertyTaxPct", "propertyTaxAnnual")
              ? {
                  sourceClass: "user-estimate",
                  sourceLabel: "Your tax estimate",
                  reason: "Entered rate is not linked to a parcel bill.",
                  verifyAction: "Confirm against parcel tax bill",
                  offerReadyRequired: true,
                }
              : {
                  sourceClass: "generic-default",
                  sourceLabel: "TrueCap tax default",
                  reason: "Generic fallback until a parcel bill or local rate is entered.",
                  verifyAction: "Enter parcel tax bill",
                  offerReadyRequired: true,
                })
    ),
    field(
      "insurance",
      explicitVerification("insurance", verified.has("insurance"),
        isTouched(touchedFields, "insuranceMonthly", "insurancePct")
          ? {
              sourceClass: "user-estimate",
              sourceLabel: "Your insurance estimate",
              reason: "Entered value is not yet confirmed as a carrier quote.",
              verifyAction: "Add or confirm an insurance quote",
              offerReadyRequired: true,
            }
          : {
              sourceClass: "generic-default",
              sourceLabel: "TrueCap insurance default",
              reason: "Premiums vary by property, coverage, carrier, and borrower.",
              verifyAction: "Add an insurance quote",
              offerReadyRequired: true,
            })
    ),
    field(
      "interestRate",
      financed
        ? explicitVerification("interestRate", verified.has("interestRate"),
            rateProvenance && !rateProvenance.overridden
              ? {
                  sourceClass: "market-benchmark",
                  sourceLabel: "TrueCap estimated market rate",
                  reason: `TrueCap estimate based on FRED's national owner-occupied mortgage series${
                    rateProvenance.fetchedAt ? ` as of ${rateProvenance.fetchedAt}` : ""
                  }; see methodology. This is not an investor-property quote or rate lock.`,
                  verifyAction: "Add lender quote",
                  offerReadyRequired: true,
                }
              : {
                  sourceClass: isTouched(touchedFields, "interestRate") ? "user-estimate" : "generic-default",
                  sourceLabel: isTouched(touchedFields, "interestRate") ? "Your rate estimate" : "TrueCap rate default",
                  reason: "No current lender quote is attached.",
                  verifyAction: "Add lender quote",
                  offerReadyRequired: true,
                })
        : {
            sourceClass: "not-applicable",
            sourceLabel: "Cash purchase",
            reason: "No mortgage rate is used.",
            verifyAction: null,
            offerReadyRequired: false,
          }
    ),
    field(
      "downPayment",
      financed
        ? explicitVerification("downPayment", verified.has("downPayment"), {
            sourceClass: isTouched(touchedFields, "downPaymentPct") ? "user-estimate" : "generic-default",
            sourceLabel: isTouched(touchedFields, "downPaymentPct") ? "Your financing assumption" : "TrueCap financing default",
            reason: "Confirm LTV/down payment with the selected loan terms.",
            verifyAction: "Confirm down payment / LTV",
            offerReadyRequired: true,
          })
        : explicitVerification("downPayment", verified.has("downPayment"), {
            sourceClass: "property-specific",
            sourceLabel: "100% cash assumption",
            reason: "Analysis is modeled without debt.",
            verifyAction: "Confirm cash purchase",
            offerReadyRequired: true,
          })
    ),
    field(
      "closingCosts",
      explicitVerification("closingCosts", verified.has("closingCosts"), {
        sourceClass: isTouched(touchedFields, "closingCostsPct") ? "user-estimate" : "generic-default",
        sourceLabel: isTouched(touchedFields, "closingCostsPct") ? "Your closing-cost estimate" : "TrueCap 3% default",
        reason: "Actual lender, title, transfer, and escrow costs can differ.",
        verifyAction: "Confirm closing-cost estimate",
        offerReadyRequired: true,
      })
    ),
    ...([
      ["maintenance", "maintenancePct", "Maintenance reserve", "Confirm maintenance reserve"],
      ["capex", "capexPct", "CapEx reserve", "Confirm CapEx reserve"],
      ["vacancy", "vacancyPct", "Vacancy allowance", "Confirm local vacancy allowance"],
      ["management", "mgmtPct", "Management assumption", "Confirm management plan or quote"],
    ] as const).map(([key, formKey, label, action]) =>
      field(
        key,
        explicitVerification(key, verified.has(key), {
          sourceClass: isTouched(touchedFields, formKey) ? "user-estimate" : "generic-default",
          sourceLabel: isTouched(touchedFields, formKey) ? `Your ${label.toLowerCase()}` : `TrueCap ${label.toLowerCase()} default`,
          reason: "Planning assumption without attached property-specific evidence.",
          verifyAction: action,
          offerReadyRequired: true,
        })
      )
    ),
    ...([
      ["utilities", "utilitiesMonthly", "Owner-paid utilities", "Confirm owner-paid utilities"],
      ["hoa", "hoaMonthly", "HOA", "Confirm HOA amount or no HOA"],
    ] as const).map(([key, formKey, label, action]) =>
      field(
        key,
        explicitVerification(key, verified.has(key), {
          sourceClass: isTouched(touchedFields, formKey) ? "user-estimate" : "generic-default",
          sourceLabel: isTouched(touchedFields, formKey) ? `Your ${label.toLowerCase()} assumption` : `Unconfirmed $0/default`,
          reason: "Zero may be correct, but it has not been explicitly confirmed.",
          verifyAction: action,
          offerReadyRequired: false,
        })
      )
    ),
    field(
      "rehabBudget",
      (num(values.rehabBudget) ?? 0) > 0
        ? explicitVerification("rehabBudget", verified.has("rehabBudget"), {
            sourceClass: "user-estimate",
            sourceLabel: "Your rehab estimate",
            reason: "Entered budget is not yet confirmed by scope or bids.",
            verifyAction: "Confirm rehab scope and budget",
            offerReadyRequired: true,
          })
        : {
            sourceClass: "not-applicable",
            sourceLabel: "No rehab budget modeled",
            reason: "Excluded from scoring unless a rehab budget is entered.",
            verifyAction: null,
            offerReadyRequired: false,
          }
    ),
  ];

  const earned = fields.reduce((sum, item) => sum + item.earnedPoints, 0);
  const available = fields.reduce((sum, item) => sum + item.maxPoints, 0);
  const score = available > 0 ? Math.round((earned / available) * 100) : 0;
  const offerReadyRemaining = fields.filter(
    (item) => item.offerReadyRequired && item.sourceClass !== "verified"
  );
  const criticalMissing = fields.some(
    (item) => item.offerReadyRequired && item.sourceClass === "missing"
  );
  const verifiedCoreCount = fields.filter(
    (item) =>
      (["rent", "propertyTax", "insurance", "interestRate", "downPayment"] as InputConfidenceFieldKey[]).includes(item.key) &&
      item.sourceClass === "verified"
  ).length;
  const stage: InputConfidenceStage =
    !criticalMissing && score >= 80 && offerReadyRemaining.length === 0
      ? "offer-ready"
      : !criticalMissing && score >= 55 && verifiedCoreCount >= 2
        ? "verified"
        : "screened";
  const stageLabel =
    stage === "offer-ready" ? "Offer Ready" : stage === "verified" ? "Verified" : "Screened";
  const rent = fields.find((item) => item.key === "rent");
  const rate = fields.find((item) => item.key === "interestRate");
  const sensitivityRisk: SensitivityRisk =
    score < 45 || rent?.sourceClass === "missing"
      ? "high"
      : score < 80 ||
          rent?.sourceClass === "market-benchmark" ||
          (financed && rate?.sourceClass !== "verified")
        ? "moderate"
        : "low";
  const verificationQueue = fields
    .filter((item) => item.verifyAction != null && item.sourceClass !== "verified")
    .sort((a, b) => {
      const lostA = a.maxPoints - a.earnedPoints;
      const lostB = b.maxPoints - b.earnedPoints;
      return lostB - lostA || b.weight - a.weight;
    });

  return {
    methodVersion: INPUT_CONFIDENCE_METHOD_VERSION,
    score,
    scoreMeaning: "weighted-input-readiness-not-probability",
    stage,
    stageLabel,
    sensitivityRisk,
    fields,
    verificationQueue,
    offerReadyRemaining,
    verifiedFields: [...verified],
    verificationEvidence: Object.fromEntries(
      [...verified].map((key) => {
        const existing = Array.isArray(context.verified)
          ? true
          : (context.verified as InputVerificationEvidence | null | undefined)?.[key];
        return [key, existing ?? true];
      })
    ) as InputVerificationEvidence,
    sourceContext: buildInputConfidenceSourceContext(
      values,
      provenance,
      touchedFields
    ),
    computedAt: now.toISOString(),
  };
}

/**
 * Stable, field-scoped value fingerprint. Verification is automatically
 * invalidated when the assumption it attested to changes, without retaining
 * the property address or sending raw values to analytics.
 */
export function inputVerificationFingerprint(
  values: InvestmentFormValues,
  key: InputConfidenceFieldKey
): string {
  const payload: unknown = (() => {
    switch (key) {
      case "purchasePrice":
        return values.purchasePrice ?? null;
      case "yearBuilt":
        return values.yearBuilt ?? null;
      case "rent":
        return values.propertyType === "single-family"
          ? [values.monthlyRent ?? null, values.avgDailyRate ?? null, values.occupancyPct ?? null]
          : (values.units ?? []).map((unit) => [unit.monthlyRent ?? null, Boolean(unit.isOwnerOccupied)]);
      case "propertyTax":
        return [values.propertyTaxInputMode ?? "percent", values.propertyTaxPct ?? null, values.propertyTaxAnnual ?? null];
      case "insurance":
        return [values.insuranceInputMode, values.insurancePct ?? null, values.insuranceMonthly ?? null];
      case "interestRate":
        return [values.interestRate, values.loanTermYears, values.pmiAnnualRatePct ?? null, values.pmiNoCancel ?? null];
      case "downPayment":
        return values.downPaymentPct;
      case "closingCosts":
        return values.closingCostsPct ?? 3;
      case "maintenance":
        return values.maintenancePct;
      case "capex":
        return values.capexPct;
      case "vacancy":
        return values.vacancyPct;
      case "management":
        return values.mgmtPct;
      case "utilities":
        return values.utilitiesMonthly ?? 0;
      case "hoa":
        return values.hoaMonthly ?? 0;
      case "rehabBudget":
        return values.rehabBudget ?? 0;
    }
  })();
  const serialized = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

/**
 * Recover persisted benchmark/edit provenance only while it is still bound to
 * the same value. Invalid, legacy, or changed fields fail closed to no source
 * context; explicit verification is restored separately and has its own
 * fingerprint/expiry checks.
 */
export function restoreInputConfidenceSourceContext(
  raw: unknown,
  values: InvestmentFormValues
): RestoredInputConfidenceContext {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { provenance: {}, touchedInputFields: [] };
  }
  const record = raw as Record<string, unknown>;
  if (record.methodVersion !== INPUT_CONFIDENCE_METHOD_VERSION) {
    return { provenance: {}, touchedInputFields: [] };
  }
  const fingerprints =
    record.fieldFingerprints &&
    typeof record.fieldFingerprints === "object" &&
    !Array.isArray(record.fieldFingerprints)
      ? (record.fieldFingerprints as Record<string, unknown>)
      : {};
  const fingerprintMatches = (key: InputConfidenceFieldKey) =>
    typeof fingerprints[key] === "string" &&
    fingerprints[key] === inputVerificationFingerprint(values, key);

  const provenanceRaw =
    record.provenance &&
    typeof record.provenance === "object" &&
    !Array.isArray(record.provenance)
      ? (record.provenance as EnrichmentProvenanceInput)
      : {};
  const candidateProvenance = normalizedProvenance(provenanceRaw);
  const provenance: EnrichmentProvenanceInput = {};
  for (const key of Object.keys(PROVENANCE_CONFIDENCE_FIELD_MAP) as Array<
    keyof EnrichmentProvenanceInput
  >) {
    const confidenceKey = PROVENANCE_CONFIDENCE_FIELD_MAP[key];
    const item = candidateProvenance[key];
    if (item && fingerprintMatches(confidenceKey)) provenance[key] = item;
  }

  const touchedInputFields = Array.isArray(record.touchedInputFields)
    ? record.touchedInputFields
        .filter(
          (key): key is string =>
            typeof key === "string" &&
            Object.prototype.hasOwnProperty.call(
              INPUT_CONFIDENCE_TOUCHED_FIELD_MAP,
              key
            ) &&
            fingerprintMatches(INPUT_CONFIDENCE_TOUCHED_FIELD_MAP[key])
        )
        .slice(0, 64)
    : [];

  return { provenance, touchedInputFields };
}

/**
 * Reconcile a saved, value-bound source context with what happened in the
 * current analyzer session. Persisted fields survive a reopen only while
 * their fingerprints still match; fresh enrichment wins for its own fields,
 * and current edits are unioned with still-valid historical edit context.
 *
 * Property identity is deliberately not stored in Input Confidence. Callers
 * must therefore pass `persistedSourceContext: null` after an address change.
 */
export function mergeInputConfidenceSourceContext(
  args: MergeInputConfidenceSourceContextArgs
): RestoredInputConfidenceContext {
  const restored = restoreInputConfidenceSourceContext(
    args.persistedSourceContext,
    args.values
  );
  const liveProvenance = normalizedProvenance(args.liveProvenance);
  const liveTouchedInputFields = touchedInputFieldNames(args.liveTouchedFields);

  return {
    provenance: {
      ...restored.provenance,
      ...liveProvenance,
    },
    touchedInputFields: Array.from(
      new Set([
        ...restored.touchedInputFields,
        ...liveTouchedInputFields,
      ])
    ).slice(0, 64),
  };
}

export function inputSourceClassLabel(sourceClass: InputSourceClass): string {
  const labels: Record<InputSourceClass, string> = {
    verified: "Verified",
    "property-specific": "Property-specific",
    "local-estimate": "Local estimate",
    "market-benchmark": "Market benchmark",
    "user-estimate": "User estimate",
    "generic-default": "Generic default",
    missing: "Missing",
    "not-applicable": "Not applicable",
  };
  return labels[sourceClass];
}

/** Tolerant parser for saved result snapshots. Invalid/stale keys are ignored. */
export function normalizeInputVerificationEvidence(raw: unknown): InputVerificationEvidence {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const output: InputVerificationEvidence = {};
  for (const key of INPUT_CONFIDENCE_FIELD_KEYS) {
    const value = source[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    // Boolean legacy evidence and objects without a value fingerprint cannot
    // be safely revalidated after reopen/edit, so they are intentionally
    // dropped instead of being upgraded to an unbounded attestation.
    if (typeof item.fingerprint !== "string" || item.fingerprint.length === 0) continue;
    output[key] = {
      ...(typeof item.verifiedAt === "string" ? { verifiedAt: item.verifiedAt.slice(0, 40) } : {}),
      ...(typeof item.evidenceType === "string" ? { evidenceType: item.evidenceType.slice(0, 80) } : {}),
      fingerprint: item.fingerprint.slice(0, 80),
    };
  }
  return output;
}
