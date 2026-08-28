import { describe, expect, it } from "vitest";

import {
  anonymousDecisionPresentationGrantMatches,
  bindAnonymousDecisionPresentationGrant,
} from "@/lib/anonymous-decision-presentation";

describe("anonymous decision presentation binding", () => {
  const claimedSnapshot = JSON.stringify({
    address: "100 Grant Test Ave, Columbus, OH 43215",
    purchasePrice: 250_000,
    monthlyRent: 2_400,
  });

  it("binds only a successful claim whose current form is still exact", () => {
    expect(
      bindAnonymousDecisionPresentationGrant(
        true,
        claimedSnapshot,
        claimedSnapshot,
      ),
    ).toBe(claimedSnapshot);
    expect(
      bindAnonymousDecisionPresentationGrant(
        false,
        claimedSnapshot,
        claimedSnapshot,
      ),
    ).toBeNull();
    expect(
      bindAnonymousDecisionPresentationGrant(
        true,
        claimedSnapshot,
        JSON.stringify({
          address: "200 Changed Deal St, Columbus, OH 43215",
          purchasePrice: 275_000,
          monthlyRent: 2_450,
        }),
      ),
    ).toBeNull();
  });

  it("fails closed for divergent or temporarily invalid edit-in-place forms", () => {
    expect(
      anonymousDecisionPresentationGrantMatches(
        claimedSnapshot,
        claimedSnapshot,
      ),
    ).toBe(true);
    expect(
      anonymousDecisionPresentationGrantMatches(
        claimedSnapshot,
        `${claimedSnapshot} `,
      ),
    ).toBe(false);
    expect(
      anonymousDecisionPresentationGrantMatches(claimedSnapshot, null),
    ).toBe(false);
    expect(
      anonymousDecisionPresentationGrantMatches(null, claimedSnapshot),
    ).toBe(false);
  });
});
