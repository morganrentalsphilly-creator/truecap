/**
 * Route seeds for the audit crawl. The public seed is the live sitemap
 * (fetched at run time); everything below is what the sitemap deliberately
 * omits: auth pages, private app routes, redirects, token viewers, embeds,
 * deliberately-404 destinations and non-HTML endpoints.
 */

/** Public pages that are not in the sitemap. */
export const PUBLIC_EXTRAS: string[] = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/update-password",
  "/search",
  "/search?q=cap%20rate",
  "/changelog",
  "/for-brrrr",
  "/for-flippers",
  "/for-agents",
  "/guarantee",
  "/blog/topics",
  "/embed",
  "/embed/1-percent-rule-calculator",
  "/embed/2-percent-rule-calculator",
  "/embed/gross-rent-multiplier-calculator",
  "/embed/break-even-calculator",
  "/embed/mortgage-payment-calculator",
  "/embed/closing-cost-calculator",
  "/embed/vacancy-rate-calculator",
  "/embed/brrrr-calculator",
  "/embed/arv-calculator",
  "/embed/70-percent-rule-calculator",
  "/tools/rental-property-spreadsheet",
  "/home-authed",
  // legacy redirects
  "/compare",
  "/templates",
  "/saved-analyses",
  "/deals",
  "/dashboard/screen",
  "/tools/Y2FwLXJhdG",
  // deliberately 404
  "/this-page-does-not-exist",
  "/blog/not-a-real-post",
  "/glossary/not-a-real-term",
  "/tools/not-a-real-tool",
  "/tools/cap-rate-calculator",
  "/markets/not-a-real-city",
  "/states/not-a-real-state",
  "/vs/not-a-real-competitor",
  "/s/not-a-real-token",
  "/d/not-a-real-payload",
  "/portal/not-a-real-token",
  "/embed/brand/not-a-real-token",
  "/embed/not-a-real-widget",
  // signed-out visits to private routes must bounce to /auth/login
  "/dashboard",
  "/dashboard/new",
  "/dashboard/saved-analyses",
  "/dashboard/compare",
  "/dashboard/triage",
  "/dashboard/templates",
  "/dashboard/clients",
  "/profile",
  "/settings",
  "/settings/branding",
  "/feedback/testimonial",
  "/admin/email-preview",
  "/admin/seo",
  "/admin/testimonials",
];

/** Private routes crawled with a signed-in storage state. */
export const PRIVATE_ROUTES: string[] = [
  "/",
  "/analyze",
  "/dashboard",
  "/dashboard/new",
  "/dashboard/new?sample=1",
  "/dashboard/saved-analyses",
  "/dashboard/compare",
  "/dashboard/triage",
  "/dashboard/templates",
  "/dashboard/clients",
  "/profile",
  "/settings",
  "/settings/branding",
  "/feedback/testimonial",
  "/pricing",
  "/auth/login",
  "/auth/sign-up",
];

/** Non-HTML endpoints: fetched, not rendered. */
export const ASSET_ROUTES: string[] = [
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/feed.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/home.jpg",
  "/opengraph-image",
];

/** Paths never crawled (API surface, PDF generators). */
export const SKIP_PATTERNS: RegExp[] = [/^\/api\//, /^\/monitoring/];
