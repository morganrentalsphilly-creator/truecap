/**
 * The research-page registry (F2): content/seo/research.json,
 * `{ "pages": [{ "slug", "title", "status": "draft" | "published", "publishedAt" }] }`.
 *
 * The SEO loop registers a /research/<slug> page here (app/research/<slug>/
 * page.tsx is tier 2: it always waits for the owner). app/sitemap.ts lists a
 * page only once it is `published` and not on the noindex list
 * (content/seo/noindex.json). No /research route exists yet; until one does,
 * the registry stays empty.
 *
 * Validated at import: a malformed registry throws, so `next build` fails
 * instead of listing a bad URL. Pure data + validation.
 */

import raw from "@/content/seo/research.json";
import { isNoindexPath } from "@/lib/seo/noindex";
import { SLUG_RE, isIsoDate } from "@/lib/seo/site-path";

export type ResearchStatus = "draft" | "published";

export type ResearchPage = Readonly<{
  slug: string;
  title: string;
  status: ResearchStatus;
  /** YYYY-MM-DD; null only while the page is a draft. */
  publishedAt: string | null;
}>;

const PAGE_KEYS = ["publishedAt", "slug", "status", "title"];

/** Validates the registry's shape; throws naming the offending page so the build log shows it. */
export function parseResearchRegistry(
  value: unknown,
  label = "content/seo/research.json",
): readonly ResearchPage[] {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !Array.isArray((value as { pages?: unknown }).pages) ||
    Object.keys(value).some((key) => key !== "pages")
  ) {
    throw new Error(`${label} must be { "pages": [ … ] }`);
  }
  const seen = new Set<string>();
  const out: ResearchPage[] = [];
  for (const [i, page] of (value as { pages: unknown[] }).pages.entries()) {
    const where = `${label} pages[${i}]`;
    if (typeof page !== "object" || page === null || Array.isArray(page)) {
      throw new Error(`${where} must be an object`);
    }
    const record = page as Record<string, unknown>;
    if (Object.keys(record).sort().join() !== PAGE_KEYS.join()) {
      throw new Error(`${where} must have exactly slug, title, status and publishedAt`);
    }
    const { slug, title, status, publishedAt } = record;
    if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
      throw new Error(`${where}: slug ${JSON.stringify(slug)} is not a lowercase URL slug`);
    }
    if (seen.has(slug)) throw new Error(`${where}: slug ${slug} is listed twice`);
    seen.add(slug);
    if (typeof title !== "string" || !title.trim() || title.length > 200 || /[<>]/.test(title)) {
      throw new Error(`${where}: title must be 1-200 characters of plain text`);
    }
    if (status !== "draft" && status !== "published") {
      throw new Error(`${where}: status must be "draft" or "published"`);
    }
    if (publishedAt === null ? status === "published" : !isIsoDate(publishedAt)) {
      throw new Error(`${where}: publishedAt must be a YYYY-MM-DD date${status === "draft" ? " or null" : ""}`);
    }
    out.push(Object.freeze({ slug, title, status, publishedAt: publishedAt as string | null }));
  }
  return Object.freeze(out);
}

/** The validated registry (module load fails on bad data). */
export const RESEARCH_PAGES: readonly ResearchPage[] = parseResearchRegistry(raw);

/** Sitemap paths of the research pages: published ones only, never a noindex-listed one. */
export function researchSitemapPaths(
  pages: readonly ResearchPage[] = RESEARCH_PAGES,
  isListed: (path: string) => boolean = (path) => !isNoindexPath(path),
): string[] {
  return pages
    .filter((page) => page.status === "published")
    .map((page) => `/research/${page.slug}`)
    .filter(isListed);
}
