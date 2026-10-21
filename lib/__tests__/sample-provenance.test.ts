import { describe, expect, it } from "vitest";
import { buildInputConfidence } from "@/lib/input-confidence";
import { SAMPLE_DEAL_FIXTURE, SAMPLE_DEAL_PROVENANCE } from "@/lib/sample-deal";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

// Audit A1 (2026-10-21): the sample's receipts must read the same on every
// surface, and the analyzer must not call the sample's rent "Your entered rent".
describe("the sample's provenance in the analyzer's input tags", () => {
  const sample = SAMPLE_DEAL_FIXTURE.values;
  const touched = { monthlyRent: true, interestRate: true, propertyTaxPct: true };

  it("labels the untouched sample's rent and rate from the provenance map", () => {
    const result = buildInputConfidence({ values: sample, touchedFields: touched });
    const rent = result.fields.find((f) => f.key === "rent");
    const rate = result.fields.find((f) => f.key === "interestRate");
    expect(rent?.sourceLabel).toBe(SAMPLE_DEAL_PROVENANCE.fields.rent.tag);
    expect(rate?.sourceLabel).toBe(SAMPLE_DEAL_PROVENANCE.fields.interestRate.tag);
    expect(rate?.reason).toContain("6.65%");
    const labels = result.fields.map((f) => f.sourceLabel);
    expect(labels).not.toContain("Your entered rent");
    expect(labels).not.toContain("Your rate estimate");
  });

  it("is display only: the score, stage and classes do not move", () => {
    const relabelled = buildInputConfidence({ values: sample, touchedFields: touched });
    const realDeal = buildInputConfidence({
      values: { ...sample, address: "100 Example Ave, Philadelphia, PA 19140" },
      touchedFields: touched,
    });
    expect(relabelled.score).toBe(realDeal.score);
    expect(relabelled.stage).toBe(realDeal.stage);
    expect(relabelled.fields.map((f) => f.sourceClass)).toEqual(
      realDeal.fields.map((f) => f.sourceClass),
    );
  });

  it("keeps a real deal's labels and a changed sample input's labels", () => {
    const realDeal = buildInputConfidence({
      values: { ...sample, address: "100 Example Ave, Philadelphia, PA 19140" },
      touchedFields: touched,
    });
    expect(realDeal.fields.find((f) => f.key === "rent")?.sourceLabel).toBe("Your entered rent");

    const edited = buildInputConfidence({
      values: { ...sample, monthlyRent: 2_400 } as InvestmentFormValues,
      touchedFields: touched,
    });
    expect(edited.fields.find((f) => f.key === "rent")?.sourceLabel).toBe("Your entered rent");
    expect(edited.fields.find((f) => f.key === "interestRate")?.sourceLabel).toBe(
      SAMPLE_DEAL_PROVENANCE.fields.interestRate.tag,
    );
  });

  it("keeps an explicit verification", () => {
    const result = buildInputConfidence({
      values: sample,
      touchedFields: touched,
      verified: ["rent"],
    });
    expect(result.fields.find((f) => f.key === "rent")?.sourceLabel).toBe("You confirmed this input");
  });
});
