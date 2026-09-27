/**
 * URL → page family. Families drive template-sibling comparisons (thin flag,
 * within-family similarity), holdout stratification and skill routing.
 */

import { loadConfig } from "./config.ts";

export type Family =
  | "home"
  | "blog-post"
  | "blog-topic"
  | "market-city"
  | "market-strategy"
  | "state"
  | "vs"
  | "glossary-term"
  | "tool"
  | "research"
  | "hub"
  | "persona"
  | "other";

const HUBS = new Set(["/blog", "/blog/topics", "/markets", "/states", "/vs", "/glossary", "/tools", "/embed", "/research"]);

export function familyOf(path: string): Family {
  if (path === "/") return "home";
  if (HUBS.has(path)) return "hub";
  if (/^\/blog\/topics\/[^/]+$/.test(path)) return "blog-topic";
  if (/^\/blog\/[^/]+$/.test(path)) return "blog-post";
  if (/^\/markets\/[^/]+\/[^/]+$/.test(path)) return "market-strategy";
  if (/^\/markets\/[^/]+$/.test(path)) return "market-city";
  if (/^\/states\/[^/]+$/.test(path)) return "state";
  if (/^\/vs\/[^/]+$/.test(path)) return "vs";
  if (/^\/glossary\/[^/]+$/.test(path)) return "glossary-term";
  if (/^\/tools\/[^/]+$/.test(path)) return "tool";
  if (/^\/research\/[^/]+$/.test(path)) return "research";
  if (/^\/for-/.test(path)) return "persona";
  return "other";
}

/** Families whose pages share one template on purpose (thin flag compares within these). */
export const TEMPLATE_FAMILIES: Family[] = ["market-city", "state", "glossary-term", "vs", "tool", "blog-post", "blog-topic"];

export function isExcludedFromOptimization(path: string): boolean {
  return loadConfig().excludedFromOptimization.includes(path);
}

export function isBrandQuery(query: string): boolean {
  const q = query.toLowerCase();
  return loadConfig().brandTerms.some((term) => q.includes(term));
}

/** Where the source file for a URL lives, when the loop is allowed to edit it. */
export function editableSourceFor(path: string): string | null {
  const family = familyOf(path);
  if (family === "blog-post") return `app/blog${path.slice("/blog".length)}/page.tsx`;
  if (family === "vs") return `app/vs${path.slice("/vs".length)}/page.tsx`;
  if (family === "research") return `app/research${path.slice("/research".length)}/page.tsx`;
  return null;
}

/**
 * The page a changed file renders: app/{blog,vs,research}/<slug>/page.tsx and
 * its opengraph-image.tsx, when that page is one the loop may edit. The one
 * file → URL mapping; verify-static, publish-plan (through the verdict) and
 * post-deploy all use it. Shared files (datasets, registries) name their
 * pages in the run manifest instead, and verify-static validates those.
 */
export function pageUrlForFile(file: string): string | null {
  const m = /^app\/(blog|vs|research)\/([^/]+)\/(?:page|opengraph-image)\.tsx$/.exec(file);
  if (!m) return null;
  const url = `/${m[1]}/${m[2]}`;
  return editableSourceFor(url) === `app/${m[1]}/${m[2]}/page.tsx` ? url : null;
}

/**
 * Pages a shared, loop-editable file always changes, whatever the run
 * manifest declares. lib/blog-posts.ts is /blog's content: the /blog page
 * lists every row, and `lastmod.ts seed` counts the file as a /blog source.
 * So a registry edit (a new row, a title or excerpt) re-renders /blog and must
 * move /blog's lastmod exactly as a re-seed would. /blog is excluded from
 * optimization, so a manifest may never name it; verify-static declares it
 * from here instead (render-diff, the publish plan's lastmodUrls).
 */
export function derivedPagesForFile(file: string): string[] {
  return file === "lib/blog-posts.ts" ? ["/blog"] : [];
}

/** An OG image module: it changes the share card, not the page's main content. */
export function isOgImageFile(file: string): boolean {
  return /^app\/(?:blog|vs|research)\/[^/]+\/opengraph-image\.tsx$/.test(file);
}
