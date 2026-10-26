import { describe, expect, it } from "vitest";
import { rentEvidenceInputSchema } from "@/lib/manual-rent-evidence";
const valid = { savedDealId: "11111111-1111-4111-8111-111111111111", address: "Fixture comparable", sourceLabel: "Lease reviewed by agent", sourceUrl: "https://example.com/listing", observedOn: "2026-01-01", monthlyRent: 1800, bedrooms: 2, bathrooms: 1, sqft: 1000, monthlyAdjustment: 100, adjustmentNotes: "Subject includes utilities; comparable does not." };
describe("manual rental evidence", () => {
  it("accepts an explicit sourced adjustment without making an automated-rent claim", () => { expect(rentEvidenceInputSchema.parse(valid)).toEqual(valid); });
  it.each(["javascript:alert(1)", "file:///etc/passwd", "data:text/html,test"])("rejects unsafe source URL %s", sourceUrl => { expect(rentEvidenceInputSchema.safeParse({ ...valid, sourceUrl }).success).toBe(false); });
  it("requires an adjustment explanation and positive adjusted rent", () => {
    expect(rentEvidenceInputSchema.safeParse({ ...valid, adjustmentNotes: "" }).success).toBe(false);
    expect(rentEvidenceInputSchema.safeParse({ ...valid, monthlyAdjustment: -1800 }).success).toBe(false);
  });
  it("rejects invalid dates, future observations, and client-supplied account fields", () => {
    expect(rentEvidenceInputSchema.safeParse({ ...valid, observedOn: "2026-02-30" }).success).toBe(false);
    expect(rentEvidenceInputSchema.safeParse({ ...valid, observedOn: "2999-01-01" }).success).toBe(false);
    expect(rentEvidenceInputSchema.safeParse({ ...valid, userId: "another" }).success).toBe(false);
  });
});
