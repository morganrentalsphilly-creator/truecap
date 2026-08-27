export function getAnalyzerCta(input: {
  hasProperty: boolean;
  canCalculateMaxOffer: boolean;
  strategyRunCta?: string;
  canUseStrategyPrimaryOutput?: boolean;
}): string {
  if (!input.hasProperty) return "Try a sample deal";
  // A specialist label may promise a Pro-only model (BRRRR, flip, or
  // wholesale). Use it only when this customer can actually receive that
  // headline output; everyone else gets the truthful free-screen label.
  if (input.strategyRunCta && input.canUseStrategyPrimaryOutput) {
    return input.strategyRunCta;
  }
  if (input.strategyRunCta && input.canUseStrategyPrimaryOutput === false) {
    return "Screen rental baseline free";
  }
  if (input.canCalculateMaxOffer) return "Calculate my Offer Ceiling";
  return "Analyze this property free";
}

/**
 * Only the default/Buy & Hold and Wholesale workflows promise an Offer
 * Ceiling as the primary run outcome. Specialist workflows have their own
 * inputs and outputs and must never be blocked by a rental-target gate.
 */
export function analysisRunPromisesOfferCeiling(input: {
  canCalculateMaxOffer: boolean;
  strategyKey: string | null | undefined;
}): boolean {
  return (
    input.canCalculateMaxOffer &&
    (input.strategyKey == null ||
      input.strategyKey === "buy-hold" ||
      input.strategyKey === "wholesale-mao")
  );
}
