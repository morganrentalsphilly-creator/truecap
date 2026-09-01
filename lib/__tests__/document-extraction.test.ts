import { describe, expect, it } from "vitest";

import { extractDealDocumentCandidates } from "@/lib/document-extraction";

/**
 * The matcher battery for deal-document extraction (v1: rent, property tax,
 * insurance premium). Extraction proposes and the user confirms, so the
 * contract under test is: real signatures found with the right value and
 * unit, junk NOT found, and at most one candidate per field.
 */

const byField = (text: string) =>
  Object.fromEntries(
    extractDealDocumentCandidates(text).map((c) => [c.field, c]),
  );

describe("lease rent", () => {
  it("reads the canonical lease sentence", () => {
    const c = byField(
      "Tenant shall pay Landlord monthly rent of $2,450.00, due on the first.",
    );
    expect(c.monthlyRent?.value).toBe(2450);
    expect(c.monthlyRent?.confidence).toBe("strong");
    expect(c.monthlyRent?.snippet).toContain("monthly rent of $2,450.00");
  });

  it("reads '$X per month' and 'Base rent:' shapes", () => {
    expect(byField("Rent: $1,895 per month, utilities excluded.").monthlyRent?.value).toBe(1895);
    expect(byField("Base rent: $3,200").monthlyRent?.value).toBe(3200);
  });

  it("does not mistake a purchase price for rent", () => {
    // "rent" appears, but the only nearby number is far outside rent range.
    const c = byField("The current rent roll supports a sale price of $450,000.");
    expect(c.monthlyRent).toBeUndefined();
  });
});

describe("property tax", () => {
  it("reads a tax bill total", () => {
    const c = byField("2026 Real Estate Tax Total tax due: $4,812.55");
    expect(c.propertyTaxAnnual?.value).toBe(4812.55);
  });

  it("reads 'annual property taxes of'", () => {
    expect(
      byField("Annual property taxes of $6,240 are paid in arrears.")
        .propertyTaxAnnual?.value,
    ).toBe(6240);
  });
});

describe("insurance premium normalizes to MONTHLY", () => {
  it("divides an explicitly annual premium by 12", () => {
    const c = byField("Annual premium: $1,860.00 for the policy period.");
    expect(c.insuranceMonthly?.value).toBe(155);
  });

  it("treats a large unlabeled premium as annual", () => {
    // Dec pages rarely say "annual" but always quote the year: $2,400 is not
    // a monthly landlord premium.
    const c = byField("Total premium: $2,400");
    expect(c.insuranceMonthly?.value).toBe(200);
  });

  it("keeps a plausibly-monthly premium as-is", () => {
    const c = byField("Premium of $148 charged monthly to the account on file.");
    expect(c.insuranceMonthly?.value).toBe(148);
  });
});

describe("honesty properties", () => {
  it("returns nothing for text with no signatures (image-PDF placeholder)", () => {
    expect(extractDealDocumentCandidates("")).toEqual([]);
    expect(
      extractDealDocumentCandidates("Property inspection photographs, 24 pages."),
    ).toEqual([]);
  });

  it("emits at most one candidate per field", () => {
    const text =
      "Monthly rent of $2,000. Later amended: monthly rent of $2,100. Rent again $2,200 per month.";
    const all = extractDealDocumentCandidates(text);
    expect(all.filter((c) => c.field === "monthlyRent")).toHaveLength(1);
  });

  it("weak matches are labeled weak, not passed off as strong", () => {
    const c = byField("Rent and other charges described in Exhibit B total $1,500");
    if (c.monthlyRent) expect(c.monthlyRent.confidence).toBe("weak");
  });

  it("every candidate carries the snippet the number came from", () => {
    for (const c of extractDealDocumentCandidates(
      "Monthly rent of $2,450. Total tax due: $4,800. Annual premium: $1,200.",
    )) {
      expect(c.snippet.length).toBeGreaterThan(10);
      expect(c.snippet).toMatch(/\$/);
    }
  });
});
