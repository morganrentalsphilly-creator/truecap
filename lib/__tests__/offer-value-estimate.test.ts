import { describe, expect, it } from "vitest";
import { calculateOfferValueEstimate } from "@/lib/offer-value-estimate";

describe("offer value estimate", () => {
  it("uses only the prospect's deal volume, time, rate, and live price", () => {
    expect(
      calculateOfferValueEstimate({
        dealsPerMonth: 5,
        hourlyRate: 75,
        minutesSavedPerDeal: 60,
        monthlyPrice: 29,
      })
    ).toEqual({
      hoursSaved: 5,
      timeValue: 375,
      breakevenDeals: 29 / 75,
      valueMultiple: 375 / 29,
    });
  });

  it("fails safely for invalid or zero inputs", () => {
    const result = calculateOfferValueEstimate({
      dealsPerMonth: Number.NaN,
      hourlyRate: -1,
      minutesSavedPerDeal: 0,
      monthlyPrice: 29,
    });

    expect(result.hoursSaved).toBe(0);
    expect(result.timeValue).toBe(0);
    expect(result.breakevenDeals).toBe(Number.POSITIVE_INFINITY);
    expect(result.valueMultiple).toBe(0);
  });
});
