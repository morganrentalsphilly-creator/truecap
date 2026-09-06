/**
 * AggregateRating — GUARDED, NOT WIRED (docs/site-overhaul.md Phase 8.3).
 *
 * Rating markup over zero or invented reviews is a fabricated-claim risk and
 * a Google penalty risk, so no page emits it. If TrueCap ever collects
 * numeric ratings through the consented testimonial flow, this helper turns
 * them into schema only once there are at least five PUBLISHED ratings.
 *
 *   // in a page, next to the Product/Organization node:
 *   // const rating = buildAggregateRating(publishedRatings);
 *   // if (rating) graph.push({ "@type": "Product", name: "TrueCap", aggregateRating: rating });
 *
 * `testimonials` has no rating column today, so `publishedRatings` is always
 * empty and this returns null.
 */
export const MIN_PUBLISHED_RATINGS = 5;

export function buildAggregateRating(
  publishedRatings: ReadonlyArray<{ rating: number }>,
): { "@type": "AggregateRating"; ratingValue: number; reviewCount: number; bestRating: 5; worstRating: 1 } | null {
  const valid = publishedRatings.filter((r) => Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5);
  if (valid.length < MIN_PUBLISHED_RATINGS) return null;
  const mean = valid.reduce((sum, r) => sum + r.rating, 0) / valid.length;
  return {
    "@type": "AggregateRating",
    ratingValue: Math.round(mean * 10) / 10,
    reviewCount: valid.length,
    bestRating: 5,
    worstRating: 1,
  };
}
