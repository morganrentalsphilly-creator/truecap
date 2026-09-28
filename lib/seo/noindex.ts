/**
 * The SEO loop's noindex list (F2): content/seo/noindex.json,
 * `{ "paths": ["/glossary/x", …] }` — sorted, unique site paths.
 *
 * The seo-prune skill adds a path (capped by seo/config.json
 * caps.noindexShareOfIndexedPerRun and gated by verify-static); re-indexing is
 * an owner edit. A listed path:
 *   · leaves app/sitemap.ts and app/llms.txt;
 *   · is served with `X-Robots-Tag: noindex` by proxy.ts (exact path match);
 *   · drops out of every registry-driven link block on other pages
 *     (lib/seo/link-policy.ts, F9), so a prune re-renders the pages that
 *     linked it, which is why seo-prune files every prune as a tier-2
 *     proposal.
 *
 * Validated at import: a malformed list throws, so `next build` fails instead
 * of deindexing the wrong page. Pure data + validation: no React, no
 * server-only (proxy.ts imports it).
 */

import raw from "@/content/seo/noindex.json";
import { SITE_PATH_RE } from "@/lib/seo/site-path";

/**
 * Hard ceiling on the whole list, whatever path the edit took: about a tenth
 * of the 381-URL sitemap. The per-run cap (seo/config.json
 * caps.noindexShareOfIndexedPerRun) is enforced only by the loop's own
 * verify-static run; CI's structural re-check of other PRs skips the caps, so
 * without this a single PR could deindex most of the site. Raising it is an
 * owner edit, made on purpose.
 */
export const NOINDEX_MAX_PATHS = 38;

/** Validates the list's shape; throws with the offending entry so the build log names it. */
export function parseNoindexList(
  value: unknown,
  label = "content/seo/noindex.json",
  max = NOINDEX_MAX_PATHS,
): readonly string[] {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !Array.isArray((value as { paths?: unknown }).paths) ||
    Object.keys(value).some((key) => key !== "paths")
  ) {
    throw new Error(`${label} must be { "paths": [<site path>, …] }`);
  }
  const paths = (value as { paths: unknown[] }).paths;
  if (paths.length > max) {
    throw new Error(`${label} lists ${paths.length} paths; at most ${max} may be noindexed (NOINDEX_MAX_PATHS in lib/seo/noindex.ts)`);
  }
  const out: string[] = [];
  for (const entry of paths) {
    if (typeof entry !== "string" || !SITE_PATH_RE.test(entry) || entry === "/") {
      throw new Error(`${label}: ${JSON.stringify(entry)} is not a noindexable site path`);
    }
    if (out.includes(entry)) throw new Error(`${label}: ${entry} is listed twice`);
    out.push(entry);
  }
  return Object.freeze(out);
}

/** The validated list (module load fails on bad data). */
export const NOINDEX_PATHS: readonly string[] = parseNoindexList(raw);

const NOINDEX_SET: ReadonlySet<string> = new Set(NOINDEX_PATHS);

/** True when `path` is exactly a listed path (no prefix or trailing-slash matching). */
export function isNoindexPath(path: string): boolean {
  return NOINDEX_SET.has(path);
}

/**
 * The `X-Robots-Tag` value proxy.ts adds for `pathname`, or null. Never
 * weakens a header already set (the host guard's `noindex, nofollow`).
 */
export function noindexRobotsHeader(
  pathname: string,
  existing: string | null,
  isListed: (path: string) => boolean = isNoindexPath,
): string | null {
  if (existing !== null || !isListed(pathname)) return null;
  return "noindex";
}
