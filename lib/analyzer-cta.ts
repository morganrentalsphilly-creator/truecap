export function getAnalyzerCta(input: {
  hasProperty: boolean;
  canCalculateMaxOffer: boolean;
}): string {
  if (!input.hasProperty) return "Try a sample deal";
  if (input.canCalculateMaxOffer) return "Calculate my Max Offer";
  return "Analyze this property free";
}
