import { describe, expect, it } from "vitest";

import {
  buildInputConfidence,
  inputVerificationFingerprint,
  type InputConfidenceFieldKey,
} from "@/lib/input-confidence";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { selectUnderwritingEnrichment } from "@/lib/property-enrichment/underwriting-adoption";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

function values(
  overrides: Partial<InvestmentFormValues> = {},
): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "123 Test St, Philadelphia, PA 19103",
    purchasePrice: 399_900,
    monthlyRent: 2_450,
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

function enrichment(
  overrides: Partial<PropertyEnrichment> = {},
): PropertyEnrichment {
  return {
    facts: null,
    valueEstimate: 425_000,
    valueRange: null,
    saleComps: [],
    rentEstimate: 2_450,
    rentRange: null,
    rentComps: [],
    listPrice: null,
    listingStatus: null,
    listingChecked: true,
    fetchedAt: "2026-08-27T12:00:00.000Z",
    ...overrides,
  };
}

function field(
  result: ReturnType<typeof buildInputConfidence>,
  key: InputConfidenceFieldKey,
) {
  return result.fields.find((item) => item.key === key)!;
}

describe("property-ingestion truth states", () => {
  it("allows a provider-reported active asking price without calling it verified", () => {
    const adopted = selectUnderwritingEnrichment(
      enrichment({ listPrice: 399_900, listingStatus: "Active" }),
    );
    expect(adopted).toMatchObject({
      purchasePrice: 399_900,
      purchasePriceSource: "active-listing",
    });

    const readiness = buildInputConfidence({
      values: values({ purchasePrice: adopted.purchasePrice! }),
      purchasePriceSource: {
        kind: "active-listing",
        provider: "rentcast",
        fetchedAt: "2026-08-27T12:00:00.000Z",
      },
    });
    expect(field(readiness, "purchasePrice")).toMatchObject({
      sourceClass: "property-specific",
      sourceLabel:
        "RentCast active listing asking price · source date 2026-08-27",
      verifyAction: "Confirm asking or contract price",
    });
    expect(readiness.verifiedFields).not.toContain("purchasePrice");
  });

  it("keeps AVM price and rent values in estimated/benchmark classes", () => {
    const adopted = selectUnderwritingEnrichment(enrichment());
    expect(adopted).toEqual({
      purchasePrice: null,
      purchasePriceSource: null,
      monthlyRent: 2_450,
      monthlyRentSource: "rentcast-estimate",
    });

    const readiness = buildInputConfidence({
      values: values({ purchasePrice: 425_000 }),
      purchasePriceSource: {
        kind: "avm-estimate",
        provider: "rentcast",
        fetchedAt: "2026-08-27T12:00:00.000Z",
      },
      provenance: {
        monthlyRent: {
          source: "rentcast-estimate",
          fetchedAt: "2026-08-27T12:00:00.000Z",
          overridden: false,
        },
      },
    });
    expect(field(readiness, "purchasePrice")).toMatchObject({
      sourceClass: "local-estimate",
      sourceLabel: "RentCast AVM estimate · source date 2026-08-27",
    });
    expect(field(readiness, "rent")).toMatchObject({
      sourceClass: "market-benchmark",
      sourceLabel: "RentCast market-rent estimate",
    });
    expect(readiness.stage).not.toBe("offer-ready");
  });

  it("requires value-bound evidence for verified and invalidates it after an edit", () => {
    const original = values();
    const evidence = {
      purchasePrice: {
        evidenceType: "source-document",
        verifiedAt: "2026-08-27T12:00:00.000Z",
        fingerprint: inputVerificationFingerprint(original, "purchasePrice"),
      },
    };

    const verified = buildInputConfidence({ values: original, verified: evidence });
    expect(field(verified, "purchasePrice").sourceClass).toBe("verified");

    const edited = buildInputConfidence({
      values: values({ purchasePrice: 405_000 }),
      verified: evidence,
    });
    expect(field(edited, "purchasePrice").sourceClass).toBe(
      "property-specific",
    );
    expect(edited.verifiedFields).not.toContain("purchasePrice");
  });
});
