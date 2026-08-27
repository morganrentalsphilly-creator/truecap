import { describe, expect, it } from "vitest";

import { normalizeExternalOfferCeilingTargetSource } from "@/lib/external-offer-ceiling-provenance";

describe("external Offer Ceiling provenance", () => {
  it("never turns an unverified browser or saved-row claim into Buy Box provenance", () => {
    expect(normalizeExternalOfferCeilingTargetSource("buy-box")).toBe(
      "selected-targets",
    );
    expect(normalizeExternalOfferCeilingTargetSource("selected-targets")).toBe(
      "selected-targets",
    );
    expect(
      normalizeExternalOfferCeilingTargetSource("screening-defaults"),
    ).toBe("screening-defaults");
    expect(
      normalizeExternalOfferCeilingTargetSource("starter-criteria"),
    ).toBe("starter-criteria");
    expect(normalizeExternalOfferCeilingTargetSource("crafted")).toBeNull();
  });
});
