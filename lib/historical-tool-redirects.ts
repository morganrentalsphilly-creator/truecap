/**
 * Permanent destinations for retired or currently unreleased calculator URLs.
 *
 * The authored calculator pages remain in place behind their existing release
 * gates. When a calculator is not released, its historical URL transfers to
 * the closest live canonical resource instead of returning a soft-dead 404.
 * Keep this map in sync with the live redirect assertions in
 * scripts/seo/healthcheck.mjs.
 */
export const HISTORICAL_TOOL_REDIRECTS = {
  "rental-cash-flow-calculator": "/",
  "cap-rate-calculator": "/blog/how-to-calculate-cap-rate",
  "cash-on-cash-calculator": "/blog/how-to-calculate-cash-on-cash-return",
  "dscr-calculator": "/blog/how-to-calculate-dscr",
  "noi-calculator": "/blog/how-to-calculate-noi-rental-property",
  "roi-calculator": "/",
  "brrrr-calculator": "/blog/brrrr-method-explained",
  "house-hacking-calculator": "/for-house-hackers",
  "rental-property-tax-calculator": "/blog/rental-property-tax-deductions",
  "50-percent-rule-calculator": "/blog/50-percent-rule-rentals",
} as const;

export type HistoricalToolSlug = keyof typeof HISTORICAL_TOOL_REDIRECTS;

export const HISTORICAL_TOOL_PATHS = Object.freeze(
  (Object.keys(HISTORICAL_TOOL_REDIRECTS) as HistoricalToolSlug[]).map(
    (slug) => `/tools/${slug}` as const,
  ),
);
