import { describe, expect, it } from "vitest";
import { reportMatchesClaimedDeal } from "@/lib/one-time-pdf-claims";

/**
 * REGRESSION SUITE for a paid-gate bypass.
 *
 * generateReportPdfAction accepts two independent client-supplied objects: the
 * `report` it renders, and a `claim` proving payment. The claim's fingerprint
 * is computed over `claim.values` — so for a while nothing tied the paid claim
 * to the DOCUMENT. One $5 purchase could render unlimited paid PDFs for
 * arbitrary properties, signed out, for the life of the claim.
 *
 * These tests pin the binding. If one starts failing, do not loosen the
 * comparison to make it pass.
 */

const claimed = {
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  purchasePrice: 265_000,
  units: [{ monthlyRent: 1_300 }, { monthlyRent: 1_275 }],
};
const report = {
  property: { address: "1700 W Erie Ave, Philadelphia, PA 19140", purchasePrice: 265_000 },
  units: [{ rent: 1_300 }, { rent: 1_275 }],
};

describe("reportMatchesClaimedDeal", () => {
  it("accepts the deal that was actually paid for", () => {
    expect(reportMatchesClaimedDeal(report, claimed)).toBe(true);
  });

  it("REJECTS a different property rendered against a valid claim", () => {
    const other = { ...report, property: { address: "9 Other Rd, Philadelphia, PA 19104", purchasePrice: 265_000 } };
    expect(reportMatchesClaimedDeal(other, claimed)).toBe(false);
  });

  it("REJECTS a different purchase price", () => {
    const repriced = { ...report, property: { ...report.property, purchasePrice: 550_000 } };
    expect(reportMatchesClaimedDeal(repriced, claimed)).toBe(false);
  });

  it("REJECTS a materially different rent roll", () => {
    const inflated = { ...report, units: [{ rent: 4_000 }, { rent: 4_000 }] };
    expect(reportMatchesClaimedDeal(inflated, claimed)).toBe(false);
  });

  it("tolerates address whitespace and casing differences", () => {
    const messy = { ...report, property: { ...report.property, address: "  1700 w   ERIE Ave, Philadelphia, PA 19140 " } };
    expect(reportMatchesClaimedDeal(messy, claimed)).toBe(true);
  });

  it("tolerates unit re-ordering, since it compares the rent TOTAL", () => {
    const reordered = { ...report, units: [{ rent: 1_275 }, { rent: 1_300 }] };
    expect(reportMatchesClaimedDeal(reordered, claimed)).toBe(true);
  });

  it("does not reject single-family claims that carry no unit rent roll", () => {
    const sfClaim = { ...claimed, units: [] };
    const sfReport = { ...report, units: [{ rent: 2_500 }] };
    expect(reportMatchesClaimedDeal(sfReport, sfClaim)).toBe(true);
  });

  it("rounds rather than demanding float equality", () => {
    const rounded = { ...report, property: { ...report.property, purchasePrice: 265_000.4 } };
    expect(reportMatchesClaimedDeal(rounded, claimed)).toBe(true);
  });

  it("treats a missing address on either side as a mismatch, not a pass", () => {
    expect(reportMatchesClaimedDeal(report, { ...claimed, address: undefined })).toBe(false);
  });
});
