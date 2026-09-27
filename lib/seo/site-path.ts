/**
 * Shared validation for the content/seo/*.json loaders (lastmod, noindex,
 * research). Pure and dependency-free: proxy.ts reaches it through
 * lib/seo/noindex.ts, so it must not pull in the other datasets.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A site path: "/" or lowercase slug segments, no trailing slash, query or fragment. */
export const SITE_PATH_RE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;

/** One lowercase slug segment ("rent-trends-2026"). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** YYYY-MM-DD that names a real calendar day. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
