export type OfferCeilingTargetSource =
  | "buy-box"
  | "screening-defaults"
  | "selected-targets";

/**
 * A modeled price threshold is eligible only after the investor adopts a
 * rule set. Product screening defaults are examples, not the user's targets.
 */
export function isAdoptedOfferCeilingTargetSource(
  source: OfferCeilingTargetSource
): boolean {
  return source === "buy-box" || source === "selected-targets";
}

export function normalizeOfferCeilingTargetSource(
  value: unknown
): OfferCeilingTargetSource | null {
  return value === "buy-box" ||
    value === "screening-defaults" ||
    value === "selected-targets"
    ? value
    : null;
}

export type OfferCeilingConstraintKey =
  | "cap-rate"
  | "cash-on-cash"
  | "cash-flow"
  | "dscr"
  | "purchase-price";

export type OfferCeilingConstraint = {
  key: OfferCeilingConstraintKey;
  criterion: string;
  normalizedSlack: number;
};

export type OfferCeilingRange = {
  lower: number | null;
  base: number;
  upper: number | null;
  label: "rent ±5%, rate ±0.5 points, vacancy ±2 points";
};

export type OfferCeilingRangePreview = {
  lower: number;
  upper: number;
  increment: 25_000;
};

export type OfferCeilingPresentation = {
  source: OfferCeilingTargetSource;
  sourceLabel: string;
  ceiling: number;
  askingPrice: number;
  listPriceGap: number;
  listPriceGapPct: number | null;
  marginOfSafetyPct: number | null;
  bindingConstraints: OfferCeilingConstraint[];
  nextConstraint: OfferCeilingConstraint | null;
  range: OfferCeilingRange;
};
