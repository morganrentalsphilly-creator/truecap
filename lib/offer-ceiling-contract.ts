export type OfferCeilingTargetSource =
  | "buy-box"
  | "screening-defaults"
  | "starter-criteria"
  | "selected-targets";

/**
 * A modeled price threshold is eligible only after the investor adopts a
 * rule set. `starter-criteria` preserves that the investor accepted TrueCap's
 * visible starter rules unchanged; untouched background screening defaults
 * remain examples and are not adopted.
 */
export function isAdoptedOfferCeilingTargetSource(
  source: OfferCeilingTargetSource
): boolean {
  return (
    source === "buy-box" ||
    source === "starter-criteria" ||
    source === "selected-targets"
  );
}

export function normalizeOfferCeilingTargetSource(
  value: unknown
): OfferCeilingTargetSource | null {
  return value === "buy-box" ||
    value === "screening-defaults" ||
    value === "starter-criteria" ||
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
  /** Null means the downside scenario cannot meet the selected targets anywhere
   * inside the supported purchase-price domain. Never replace it with $0. */
  lower: number | null;
  upper: number;
  increment: 25_000;
  downsideFeasible: boolean;
  upsideFeasible: boolean;
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
