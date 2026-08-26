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
