/**
 * The result's price track domain: where asking and the Offer Ceiling sit on
 * the line. Shared by the live what-if track (components/investcalc/
 * result-price-scrubber.tsx) and the sample's server-rendered card
 * (components/investcalc/sample-decision-prerender.tsx), so the two draw the
 * same line and the swap between them moves nothing (audit A2).
 */
export function priceTrackDomain(asking: number, ceiling: number) {
  const lo = Math.min(asking, ceiling);
  const hi = Math.max(asking, ceiling);
  const margin = Math.max(5_000, Math.round((hi - lo) * 0.25));
  const low = Math.max(1_000, Math.floor((lo - margin) / 1_000) * 1_000);
  const high = Math.ceil((hi + margin) / 1_000) * 1_000;
  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  return { low, high, pct };
}
