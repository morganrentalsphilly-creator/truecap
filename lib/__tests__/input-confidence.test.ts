import { describe, expect, it } from "vitest";

import type { InvestmentFormValues } from "../investcalc-schema";
import {
  buildInputConfidence,
  inputVerificationFingerprint,
  INPUT_CONFIDENCE_FIELD_KEYS,
  INPUT_CONFIDENCE_METHOD_VERSION,
  LEGACY_INPUT_CONFIDENCE_METHOD_VERSIONS,
  mergeInputConfidenceSourceContext,
  normalizeInputVerificationEvidence,
  restoreInputConfidenceSourceContext,
  type InputConfidenceFieldKey,
} from "../input-confidence";

function values(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "123 Test St, Philadelphia, PA 19103, USA",
    purchasePrice: 300_000,
    yearBuilt: 1990,
    monthlyRent: 2_700,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    maintenancePct: 10,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 85,
    depreciationYears: 27.5,
    expenseGrowthPct: 2.5,
    rentGrowthPct: 2.5,
    insuranceInputMode: "percent",
    ...overrides,
  } as InvestmentFormValues;
}

function byKey(
  result: ReturnType<typeof buildInputConfidence>,
  key: InputConfidenceFieldKey
) {
  return result.fields.find((item) => item.key === key)!;
}

describe("Input Confidence v1.1", () => {
  it("is a separate versioned readiness score, not a probability", () => {
    const result = buildInputConfidence({
      values: values(),
      now: new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(result.methodVersion).toBe(INPUT_CONFIDENCE_METHOD_VERSION);
    expect(result.methodVersion).toBe("1.1");
    expect(result.scoreMeaning).toBe("weighted-input-readiness-not-probability");
    expect(result.computedAt).toBe("2026-08-15T12:00:00.000Z");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("classifies every supported underwriting input", () => {
    const result = buildInputConfidence({ values: values() });
    expect(result.fields.map((item) => item.key)).toEqual(INPUT_CONFIDENCE_FIELD_KEYS);
  });

  it("labels HUD rent and FRED rates as benchmarks, never verified facts", () => {
    const result = buildInputConfidence({
      values: values(),
      provenance: {
        monthlyRent: { source: "hud-safmr", fetchedAt: "2026", overridden: false },
        interestRate: { source: "fred", fetchedAt: "2026-08-13", overridden: false },
        propertyTaxPct: { source: "state-static", overridden: false },
      },
    });

    expect(byKey(result, "rent").sourceClass).toBe("market-benchmark");
    expect(byKey(result, "rent").sourceLabel).toContain("HUD Rent Benchmark");
    expect(byKey(result, "interestRate").sourceClass).toBe("market-benchmark");
    expect(byKey(result, "interestRate").sourceLabel).toBe("TrueCap estimated market rate");
    expect(byKey(result, "interestRate").reason).toContain("as of 2026-08-13");
    expect(byKey(result, "interestRate").reason).toContain("methodology");
    expect(byKey(result, "propertyTax").sourceClass).toBe("market-benchmark");
    expect(result.stage).not.toBe("offer-ready");
  });

  it("treats an overridden benchmark as a user estimate, not automatic verification", () => {
    const result = buildInputConfidence({
      values: values({ monthlyRent: 2_950, interestRate: 7.4 }),
      provenance: {
        monthlyRent: { source: "hud-fmr", overridden: true },
        interestRate: { source: "fred", overridden: true },
      },
      touchedFields: { monthlyRent: true, interestRate: true },
    });

    expect(byKey(result, "rent").sourceClass).toBe("user-estimate");
    expect(byKey(result, "interestRate").sourceClass).toBe("user-estimate");
    expect(result.verifiedFields).toEqual([]);
  });

  it("recognizes an annual parcel amount as property-specific but still asks for confirmation", () => {
    const result = buildInputConfidence({
      values: values({
        propertyTaxInputMode: "annual",
        propertyTaxAnnual: 6_400,
      }),
    });

    expect(byKey(result, "propertyTax").sourceClass).toBe("property-specific");
    expect(byKey(result, "propertyTax").verifyAction).toContain("parcel tax bill");
  });

  it("marks an omitted Year Built as missing and discloses its score effect", () => {
    const missing = buildInputConfidence({ values: values({ yearBuilt: undefined }) });
    const provided = buildInputConfidence({ values: values({ yearBuilt: 1942 }) });

    expect(byKey(missing, "yearBuilt")).toMatchObject({
      sourceClass: "missing",
      sourceLabel: "Not provided",
      earnedPoints: 0,
    });
    expect(byKey(missing, "yearBuilt").reason).toContain(
      "conservative Screening Index uncertainty modifier"
    );
    expect(byKey(provided, "yearBuilt").sourceClass).toBe("property-specific");
    expect(missing.score).toBeLessThan(provided.score);
  });

  it("excludes mortgage rate from the denominator for a cash purchase", () => {
    const financed = buildInputConfidence({ values: values({ downPaymentPct: 20 }) });
    const cash = buildInputConfidence({ values: values({ downPaymentPct: 100 }) });

    expect(byKey(cash, "interestRate").sourceClass).toBe("not-applicable");
    expect(byKey(cash, "interestRate").maxPoints).toBe(0);
    expect(financed.fields.reduce((sum, item) => sum + item.maxPoints, 0)).toBeGreaterThan(
      cash.fields.reduce((sum, item) => sum + item.maxPoints, 0)
    );
  });

  it("requires explicit confirmation before reaching Offer Ready", () => {
    const result = buildInputConfidence({
      values: values({ rehabBudget: 25_000 }),
      verified: INPUT_CONFIDENCE_FIELD_KEYS,
    });

    expect(result.score).toBe(100);
    expect(result.stage).toBe("offer-ready");
    expect(result.stageLabel).toBe("Offer Ready");
    expect(result.offerReadyRemaining).toEqual([]);
  });

  it("does not call a high-scoring underwrite Verified without two confirmed core assumptions", () => {
    const result = buildInputConfidence({
      values: values(),
      touchedFields: new Set([
        "monthlyRent",
        "interestRate",
        "downPaymentPct",
        "closingCostsPct",
        "maintenancePct",
        "capexPct",
        "vacancyPct",
        "mgmtPct",
        "propertyTaxPct",
        "insurancePct",
      ]),
      // These confirmations raise the weighted score above the Verified
      // threshold, but neither is one of the core rent/tax/insurance/rate/LTV
      // assumptions required to progress the workflow.
      verified: ["purchasePrice", "closingCosts"],
    });

    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.verifiedFields).toEqual(["purchasePrice", "closingCosts"]);
    expect(result.stage).toBe("screened");
  });

  it("reaches Verified only after core assumptions are explicitly confirmed", () => {
    const result = buildInputConfidence({
      values: values(),
      touchedFields: new Set([
        "monthlyRent",
        "interestRate",
        "downPaymentPct",
        "closingCostsPct",
        "maintenancePct",
        "capexPct",
        "vacancyPct",
        "mgmtPct",
        "propertyTaxPct",
        "insurancePct",
      ]),
      verified: ["rent", "propertyTax"],
    });

    expect(result.stage).toBe("verified");
  });

  it("expires time-sensitive financing-profile verification after 30 days", () => {
    const current = values();
    const fingerprint = inputVerificationFingerprint(current, "interestRate");
    const evidence = {
      evidenceType: "recent-verified-financing-profile",
      fingerprint,
    };
    const recent = buildInputConfidence({
      values: current,
      now: new Date("2026-08-15T12:00:00.000Z"),
      verified: {
        interestRate: { ...evidence, verifiedAt: "2026-07-28T12:00:00.000Z" },
      },
    });
    const stale = buildInputConfidence({
      values: current,
      now: new Date("2026-08-15T12:00:00.000Z"),
      verified: {
        interestRate: { ...evidence, verifiedAt: "2026-06-01T12:00:00.000Z" },
      },
    });

    expect(byKey(recent, "interestRate").sourceClass).toBe("verified");
    expect(byKey(stale, "interestRate").sourceClass).not.toBe("verified");
  });

  it("fails closed for legacy booleans and value-mismatched persisted verification", () => {
    const original = values();
    const normalized = normalizeInputVerificationEvidence({
      rent: true,
      interestRate: {
        verifiedAt: "2026-08-15T12:00:00.000Z",
        evidenceType: "user-confirmed",
        fingerprint: inputVerificationFingerprint(original, "interestRate"),
      },
    });

    expect(normalized.rent).toBeUndefined();
    expect(
      byKey(
        buildInputConfidence({ values: original, verified: normalized }),
        "interestRate"
      ).sourceClass
    ).toBe("verified");
    expect(
      byKey(
        buildInputConfidence({
          values: values({ interestRate: 8.25 }),
          verified: normalized,
        }),
        "interestRate"
      ).sourceClass
    ).not.toBe("verified");
  });

  it("shows missing price/rent as a high-risk Screened analysis", () => {
    const result = buildInputConfidence({
      values: values({ purchasePrice: 0, monthlyRent: 0 }),
    });

    expect(byKey(result, "purchasePrice").sourceClass).toBe("missing");
    expect(byKey(result, "rent").sourceClass).toBe("missing");
    expect(result.stage).toBe("screened");
    expect(result.sensitivityRisk).toBe("high");
  });

  it("prioritizes verification by missing weighted points", () => {
    const result = buildInputConfidence({
      values: values(),
      provenance: { monthlyRent: { source: "hud-fmr", overridden: false } },
    });

    expect(result.verificationQueue[0]?.key).toBe("rent");
    expect(result.verificationQueue[0]!.weight).toBe(16);
  });

  it("persists source context for the exact saved assumptions", () => {
    const current = values();
    const confidence = buildInputConfidence({
      values: current,
      provenance: {
        monthlyRent: {
          source: "hud-safmr",
          fetchedAt: "2026-08-15",
          detail: "ZIP benchmark",
          overridden: false,
        },
        interestRate: {
          source: "fred",
          fetchedAt: "2026-08-14",
          overridden: false,
        },
      },
      touchedFields: new Set(["insurancePct", "maintenancePct"]),
    });

    const restored = restoreInputConfidenceSourceContext(
      confidence.sourceContext,
      current
    );
    expect(restored.provenance).toMatchObject({
      monthlyRent: { source: "hud-safmr", detail: "ZIP benchmark" },
      interestRate: { source: "fred" },
    });
    expect(restored.touchedInputFields).toEqual([
      "insurancePct",
      "maintenancePct",
    ]);
    const reopened = buildInputConfidence({
      values: current,
      provenance: restored.provenance,
      touchedFields: new Set(restored.touchedInputFields),
    });
    expect(byKey(reopened, "rent").sourceClass).toBe("market-benchmark");
    expect(byKey(reopened, "insurance").sourceClass).toBe("user-estimate");
  });

  it("drops only the persisted provenance whose value changed", () => {
    const original = values();
    const confidence = buildInputConfidence({
      values: original,
      provenance: {
        monthlyRent: { source: "hud-fmr", overridden: false },
        interestRate: { source: "fred", overridden: false },
      },
      touchedFields: new Set(["monthlyRent", "insurancePct"]),
    });
    const changed = values({ monthlyRent: 3_100 });
    const restored = restoreInputConfidenceSourceContext(
      confidence.sourceContext,
      changed
    );

    expect(restored.provenance.monthlyRent).toBeUndefined();
    expect(restored.provenance.interestRate?.source).toBe("fred");
    expect(restored.touchedInputFields).not.toContain("monthlyRent");
    expect(restored.touchedInputFields).toContain("insurancePct");
  });

  it("merges still-valid reopened context with fresh enrichment and live edits", () => {
    const original = values();
    const persisted = buildInputConfidence({
      values: original,
      provenance: {
        monthlyRent: { source: "hud-fmr", fetchedAt: "2026", overridden: false },
        interestRate: { source: "fred", fetchedAt: "2026-08-14", overridden: false },
      },
      touchedFields: new Set(["insurancePct"]),
    }).sourceContext;

    const merged = mergeInputConfidenceSourceContext({
      persistedSourceContext: persisted,
      values: original,
      liveProvenance: {
        propertyTaxPct: { source: "state-static", detail: "PA", overridden: false },
      },
      liveTouchedFields: { vacancyPct: true },
    });

    expect(merged.provenance).toMatchObject({
      monthlyRent: { source: "hud-fmr" },
      interestRate: { source: "fred" },
      propertyTaxPct: { source: "state-static", detail: "PA" },
    });
    expect(merged.touchedInputFields).toEqual(["insurancePct", "vacancyPct"]);
  });

  it("keeps unaffected reopened sources while a changed value loses only its old source", () => {
    const original = values();
    const persisted = buildInputConfidence({
      values: original,
      provenance: {
        monthlyRent: { source: "hud-safmr", overridden: false },
        interestRate: { source: "fred", overridden: false },
        propertyTaxPct: { source: "state-static", overridden: false },
      },
    }).sourceContext;

    const merged = mergeInputConfidenceSourceContext({
      persistedSourceContext: persisted,
      values: values({ monthlyRent: 3_100 }),
      liveTouchedFields: new Set(["monthlyRent"]),
    });

    expect(merged.provenance.monthlyRent).toBeUndefined();
    expect(merged.provenance.interestRate?.source).toBe("fred");
    expect(merged.provenance.propertyTaxPct?.source).toBe("state-static");
    expect(merged.touchedInputFields).toContain("monthlyRent");
  });

  it("fails closed for legacy or malformed persisted source context", () => {
    const current = buildInputConfidence({ values: values() }).sourceContext;
    const legacy = { ...current, methodVersion: "1.0" };

    expect(LEGACY_INPUT_CONFIDENCE_METHOD_VERSIONS).toContain("1.0");
    expect(legacy.methodVersion).not.toBe(INPUT_CONFIDENCE_METHOD_VERSION);
    expect(restoreInputConfidenceSourceContext(legacy, values())).toEqual({
      provenance: {},
      touchedInputFields: [],
    });
    expect(
      restoreInputConfidenceSourceContext(
        { methodVersion: "future", provenance: { monthlyRent: { source: "hud-fmr" } } },
        values()
      )
    ).toEqual({ provenance: {}, touchedInputFields: [] });
  });
});
