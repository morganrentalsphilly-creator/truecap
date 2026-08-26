import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildInputConfidence,
  type InputConfidenceFieldKey,
} from "../input-confidence";
import type { InvestmentFormValues } from "../investcalc-schema";
import {
  unitRentRollFingerprint,
  unitRentRollWasOverridden,
} from "../unit-rent-provenance";

function multifamilyValues(): InvestmentFormValues {
  return {
    propertyType: "multi-family",
    address: "100 Test St, Philadelphia, PA 19125, USA",
    purchasePrice: 400_000,
    units: [
      {
        bedrooms: 1,
        bathrooms: 1,
        sqft: 650,
        monthlyRent: 1_450,
        isOwnerOccupied: false,
      },
      {
        bedrooms: 2,
        bathrooms: 1,
        sqft: 800,
        monthlyRent: 1_750,
        isOwnerOccupied: false,
      },
    ],
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
  } as InvestmentFormValues;
}

function confidenceField(
  result: ReturnType<typeof buildInputConfidence>,
  key: InputConfidenceFieldKey,
) {
  return result.fields.find((field) => field.key === key)!;
}

describe("multi-family HUD rent provenance", () => {
  it("binds the source to the exact full rent roll", () => {
    const original = multifamilyValues();
    const capturedFingerprint = unitRentRollFingerprint(original);

    expect(
      unitRentRollWasOverridden({ capturedFingerprint, values: original }),
    ).toBe(false);

    const oneDollarEdit = {
      ...original,
      units: original.units?.map((unit, index) =>
        index === 1 ? { ...unit, monthlyRent: 1_751 } : unit,
      ),
    } as InvestmentFormValues;
    expect(
      unitRentRollWasOverridden({
        capturedFingerprint,
        values: oneDollarEdit,
      }),
    ).toBe(true);

    const occupancyEdit = {
      ...original,
      units: original.units?.map((unit, index) =>
        index === 0 ? { ...unit, isOwnerOccupied: true } : unit,
      ),
    } as InvestmentFormValues;
    expect(
      unitRentRollWasOverridden({
        capturedFingerprint,
        values: occupancyEdit,
      }),
    ).toBe(true);

    const bedroomEdit = {
      ...original,
      units: original.units?.map((unit, index) =>
        index === 1 ? { ...unit, bedrooms: 3 } : unit,
      ),
    } as InvestmentFormValues;
    expect(
      unitRentRollWasOverridden({
        capturedFingerprint,
        values: bedroomEdit,
      }),
    ).toBe(true);

    expect(
      unitRentRollWasOverridden({
        capturedFingerprint,
        values: { ...original, propertyType: "owner-occupant" },
      }),
    ).toBe(true);
  });

  it("invalidates a single-family HUD source when its bedroom lookup basis changes", () => {
    const original = {
      ...multifamilyValues(),
      propertyType: "single-family" as const,
      bedrooms: 2,
      monthlyRent: 1_800,
      units: [],
    };
    const capturedFingerprint = unitRentRollFingerprint(original);

    expect(
      unitRentRollWasOverridden({ capturedFingerprint, values: original }),
    ).toBe(false);
    expect(
      unitRentRollWasOverridden({
        capturedFingerprint,
        values: { ...original, bedrooms: 3 },
      }),
    ).toBe(true);
  });

  it("labels an unchanged per-unit HUD fill as HUD and an edited roll as user-entered", () => {
    const current = multifamilyValues();
    const hud = buildInputConfidence({
      values: current,
      provenance: {
        monthlyRent: { source: "hud-safmr", overridden: false },
      },
    });
    const edited = buildInputConfidence({
      values: current,
      provenance: {
        monthlyRent: { source: "hud-safmr", overridden: true },
      },
    });

    expect(confidenceField(hud, "rent")).toMatchObject({
      sourceClass: "market-benchmark",
      sourceLabel: "HUD Rent Benchmark (ZIP)",
    });
    expect(confidenceField(edited, "rent")).toMatchObject({
      sourceClass: "user-estimate",
      sourceLabel: "Your entered rent",
    });
  });

  it("captures the per-unit HUD fill in the analyzer source ledger", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "rentFingerprint: unitRentRollFingerprint(form.getValues())",
    );
    expect(
      source.match(
        /rentFingerprint: unitRentRollFingerprint\(form\.getValues\(\)\)/g,
      ),
    ).toHaveLength(2);
    expect(source).toContain('source: filledRentSource ?? "hud-fmr"');
    expect(source).toContain("priorUnitRentCaptureWasInvalidated");
  });
});
