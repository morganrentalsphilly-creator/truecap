import { describe, expect, it } from "vitest";

import { normalizeExternalOfferCeilingTargetSource } from "@/lib/external-offer-ceiling-provenance";
import { DEFAULT_MAO_TARGET } from "@/lib/mao-targets";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

describe("external Offer Ceiling provenance", () => {
  it("never turns an unverified browser or saved-row claim into privileged provenance", () => {
    expect(normalizeExternalOfferCeilingTargetSource("buy-box")).toBe("selected-targets");
    expect(normalizeExternalOfferCeilingTargetSource("starter-criteria")).toBe(
      "selected-targets",
    );
    expect(normalizeExternalOfferCeilingTargetSource("selected-targets")).toBe(
      "selected-targets",
    );
    expect(normalizeExternalOfferCeilingTargetSource("screening-defaults")).toBe(
      "selected-targets",
    );
    expect(normalizeExternalOfferCeilingTargetSource("crafted")).toBeNull();
  });

  it("preserves the TrueCap starter label only for the canonical server-derived target", () => {
    expect(
      normalizeExternalOfferCeilingTargetSource("starter-criteria", {
        target: DEFAULT_MAO_TARGET,
        values: SAMPLE_DEAL_VALUES,
      }),
    ).toBe("starter-criteria");
    expect(
      normalizeExternalOfferCeilingTargetSource("starter-criteria", {
        target: { ...DEFAULT_MAO_TARGET, monthlyCashFlow: 875 },
        values: SAMPLE_DEAL_VALUES,
      }),
    ).toBe("selected-targets");
  });

  it("preserves screening-default provenance only for the same canonical target", () => {
    expect(
      normalizeExternalOfferCeilingTargetSource("screening-defaults", {
        target: DEFAULT_MAO_TARGET,
        values: SAMPLE_DEAL_VALUES,
      }),
    ).toBe("screening-defaults");
    expect(
      normalizeExternalOfferCeilingTargetSource("screening-defaults", {
        target: { ...DEFAULT_MAO_TARGET, dscr: 1.8 },
        values: SAMPLE_DEAL_VALUES,
      }),
    ).toBe("selected-targets");
  });

  it("still refuses Buy Box provenance when canonical starter numbers happen to match", () => {
    expect(
      normalizeExternalOfferCeilingTargetSource("buy-box", {
        target: DEFAULT_MAO_TARGET,
        values: SAMPLE_DEAL_VALUES,
      }),
    ).toBe("selected-targets");
  });

  it("derives the debt-free starter target before verifying provenance", () => {
    expect(
      normalizeExternalOfferCeilingTargetSource("starter-criteria", {
        target: { monthlyCashFlow: 0, dscr: 1.25 },
        values: { ...SAMPLE_DEAL_VALUES, downPaymentPct: 100 },
      }),
    ).toBe("starter-criteria");
  });
});
