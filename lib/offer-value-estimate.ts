export type OfferValueEstimateInput = {
  dealsPerMonth: number;
  hourlyRate: number;
  minutesSavedPerDeal: number;
  monthlyPrice: number;
};

export type OfferValueEstimate = {
  hoursSaved: number;
  timeValue: number;
  breakevenDeals: number;
  valueMultiple: number;
};

/**
 * Estimate the time value of TrueCap from numbers the prospect controls.
 * This intentionally models time only; it assigns no speculative value to
 * avoided losses, negotiated discounts, financing, or investment returns.
 */
export function calculateOfferValueEstimate({
  dealsPerMonth,
  hourlyRate,
  minutesSavedPerDeal,
  monthlyPrice,
}: OfferValueEstimateInput): OfferValueEstimate {
  const safeDeals = finiteNonNegative(dealsPerMonth);
  const safeRate = finiteNonNegative(hourlyRate);
  const safeMinutes = finiteNonNegative(minutesSavedPerDeal);
  const safePrice = finiteNonNegative(monthlyPrice);
  const hoursPerDeal = safeMinutes / 60;
  const hoursSaved = safeDeals * hoursPerDeal;
  const timeValue = hoursSaved * safeRate;
  const valuePerDeal = hoursPerDeal * safeRate;

  return {
    hoursSaved,
    timeValue,
    breakevenDeals: valuePerDeal > 0 ? safePrice / valuePerDeal : Number.POSITIVE_INFINITY,
    valueMultiple: safePrice > 0 ? timeValue / safePrice : 0,
  };
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
