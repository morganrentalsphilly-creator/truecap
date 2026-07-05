import { describe, expect, it } from "vitest";
import { investmentFormSchema, previewParse, defaultValues } from "@/lib/investcalc-schema";

/**
 * previewParse (Jul 2026): the live instant-verdict preview must light up on
 * the numbers the math actually consumes (price + rent) WITHOUT a 5-char
 * address, which calculateAnalysis never reads. The full schema (Run / Save /
 * Share) must still require a real address.
 */
const base = {
  ...defaultValues,
  propertyType: "single-family" as const,
  purchasePrice: 385000,
  monthlyRent: 2800,
  bedrooms: 3,
};

describe("previewParse — address-optional preview gate", () => {
  it("parses price + rent with NO address (the magic moment)", () => {
    const { address: _a, ...noAddr } = { ...base, address: "" };
    void _a;
    const res = previewParse(noAddr);
    expect(res.success).toBe(true);
  });

  it("parses with a too-short address (< 5 chars)", () => {
    expect(previewParse({ ...base, address: "12" }).success).toBe(true);
  });

  it("still requires monthly rent (the math genuinely needs it)", () => {
    const { monthlyRent: _r, ...noRent } = base;
    void _r;
    expect(previewParse({ ...noRent, address: "" }).success).toBe(false);
  });

  it("still requires a valid purchase price", () => {
    expect(previewParse({ ...base, address: "", purchasePrice: 500 }).success).toBe(false);
  });

  it("does NOT weaken the full schema — address still required on Run/Save/Share", () => {
    const { address: _a, ...noAddr } = { ...base, address: "" };
    void _a;
    const full = investmentFormSchema.safeParse(noAddr);
    expect(full.success).toBe(false);
    if (!full.success) {
      expect(full.error.issues.some((i) => i.path.includes("address"))).toBe(true);
    }
  });

  it("preserves a real address unchanged (no placeholder injected)", () => {
    const res = previewParse({ ...base, address: "1700 W Erie Ave, Philadelphia, PA 19140" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.address).toBe("1700 W Erie Ave, Philadelphia, PA 19140");
  });
});
