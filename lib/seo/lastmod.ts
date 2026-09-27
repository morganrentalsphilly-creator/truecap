/**
 * The one source of last-modified dates (F2): content/seo/lastmod.json.
 *
 * A flat, key-sorted `{ "<site path>": "YYYY-MM-DD" }` map. `node
 * seo/scripts/lastmod.ts seed` built it from git history (the newest commit
 * that changed each URL's own content, presentation sweeps skipped), and the
 * SEO loop's publish job bumps a URL only when its main content changed. The
 * model never writes it, and nothing else invents a date: a path with no
 * entry has NO last-modified date (the sitemap omits <lastmod>, JSON-LD omits
 * dateModified, a post falls back to its own PUBLISHED_AT).
 *
 * Consumers: app/sitemap.ts, app/feed.xml, app/blog/page.tsx, every blog
 * post's MODIFIED_AT, and the dateModified of the market, state, glossary,
 * tool, comparison and methodology templates.
 *
 * Validated at import: a malformed map throws, so `next build` fails instead
 * of publishing a bad date. (Whether a date is after the build date cannot be
 * checked statically; lib/__tests__/lastmod-contract.test.ts compares every
 * date against the newest one in the map instead.)
 *
 * Pure data + validation: no React, no server-only, safe in any module.
 */

import raw from "@/content/seo/lastmod.json";

export type LastmodMap = Readonly<Record<string, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A site path: "/" or lowercase slug segments, no trailing slash, query or fragment. */
export const SITE_PATH_RE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;

/** YYYY-MM-DD that names a real calendar day. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Validates the map's shape; throws with the offending key so the build log names it. */
export function parseLastmodMap(
  value: unknown,
  label = "content/seo/lastmod.json",
): LastmodMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object of "<site path>": "YYYY-MM-DD"`);
  }
  const out: Record<string, string> = {};
  for (const [key, date] of Object.entries(value as Record<string, unknown>)) {
    if (!key.startsWith("/") || !SITE_PATH_RE.test(key)) {
      throw new Error(`${label}: key ${JSON.stringify(key)} is not a site path (it must start with "/")`);
    }
    if (!isIsoDate(date)) {
      throw new Error(`${label}: ${key} has ${JSON.stringify(date)}, not a YYYY-MM-DD date`);
    }
    out[key] = date;
  }
  return Object.freeze(out);
}

/** The validated map (module load fails on bad data). */
export const LASTMOD: LastmodMap = parseLastmodMap(raw);

/** The last significant content change of a site path, or undefined when the map has none. */
export function lastmodFor(path: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(LASTMOD, path) ? LASTMOD[path] : undefined;
}

/**
 * A dated page's last-modified date for display: its map entry, never earlier
 * than its publication date (a page cannot change before it exists). The
 * /blog cards, the Blog JSON-LD and the feed's lastBuildDate read this.
 */
export function lastmodOrPublished(path: string, publishedAt: string): string {
  const modifiedAt = lastmodFor(path);
  return modifiedAt && modifiedAt > publishedAt ? modifiedAt : publishedAt;
}
