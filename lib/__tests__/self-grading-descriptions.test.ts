import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A page description may say what the page compares. It may not grade the
 * comparison ("Honest comparison", "Honest side-by-side", "A fair ...
 * comparison", "Honest 3-way comparison"): the 2026-10 go-to-market audit
 * found those words on pages whose competitor cells were wrong, and a search
 * result or link preview prints the description before the reader has seen
 * the page.
 *
 * vs-social-card-guards.test.ts holds the Open Graph and Twitter
 * descriptions of the /vs pages. This file holds the rest: the meta
 * description and the WebPage JSON-LD description of a /vs page, and the
 * DESCRIPTION const of a blog post (its meta description, its og:description
 * and, on several posts, the lede under the H1).
 */

const ROOT = process.cwd();
const VS_DIR = join(ROOT, "app/vs");
const BLOG_DIR = join(ROOT, "app/blog");

const STRING = String.raw`"((?:[^"\\]|\\.)*)"`;
const SELF_GRADE = /\bhonest(?:ly)?\b|\bfair\b|\bunbiased\b/i;

/**
 * /vs pages whose descriptions still carried the words when this guard was
 * written and whose files belong to other packages of the same fix wave
 * (x-vs-money, y2-vs-data, y3-vs-str). Each of those packages removes the
 * words from its own pages; once a held page is clean, the test below turns
 * red until its slug comes off this list.
 */
const HELD_BY_ANOTHER_PACKAGE = new Set([
  "arrived",
  "baselane",
  "hostaway",
  "hostfully",
  "lodgify",
  "mashvisor-for-short-term-rentals",
  "privy",
  "propstream",
  "rentcast",
]);

const VS_SLUGS = readdirSync(VS_DIR)
  .filter((slug) => existsSync(join(VS_DIR, slug, "page.tsx")))
  .sort();

const BLOG_SLUGS = readdirSync(BLOG_DIR)
  .filter((slug) => existsSync(join(BLOG_DIR, slug, "page.tsx")))
  .sort();

const vsPage = (slug: string) => readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8");

/** A retired comparison is a redirect stub with no metadata of its own. */
const isRedirectStub = (slug: string) => vsPage(slug).includes("permanentRedirect(");

/** Every `description: "..."` literal in a /vs page: metadata, social blocks and JSON-LD. */
function vsDescriptions(slug: string): string[] {
  const page = vsPage(slug);
  return [...page.matchAll(new RegExp(String.raw`\bdescription:\s*${STRING}`, "g"))].map((m) =>
    // HUD's Fair Market Rent is a proper name, not a grade.
    m[1].replace(/Fair Market Rents?/g, ""),
  );
}

describe("a page description does not grade its own comparison", () => {
  it("finds the pages", () => {
    expect(VS_SLUGS.length).toBeGreaterThan(35);
    expect(BLOG_SLUGS.length).toBeGreaterThanOrEqual(73);
  });

  it("keeps honest, fair and unbiased out of every /vs description", () => {
    const graded: string[] = [];
    for (const slug of VS_SLUGS) {
      if (HELD_BY_ANOTHER_PACKAGE.has(slug) || isRedirectStub(slug)) continue;
      const descriptions = vsDescriptions(slug);
      expect(descriptions.length, slug).toBeGreaterThan(0);
      for (const description of descriptions) {
        if (SELF_GRADE.test(description)) graded.push(`${slug}: ${description}`);
      }
    }
    expect(graded).toEqual([]);
  });

  it("holds only pages that exist and still carry the words", () => {
    for (const slug of HELD_BY_ANOTHER_PACKAGE) {
      expect(VS_SLUGS, slug).toContain(slug);
      expect(
        vsDescriptions(slug).some((d) => SELF_GRADE.test(d)),
        `${slug} is clean: take it off HELD_BY_ANOTHER_PACKAGE`,
      ).toBe(true);
    }
  });

  it("keeps a self-graded comparison, ranking or review out of every blog DESCRIPTION", () => {
    // "The honest math on housing cost" describes the subject, not the post,
    // so the rule is the grade next to the thing graded.
    const graded: string[] = [];
    const selfGradedPost =
      /\b(?:honest|fair|unbiased)\s+(?:\d+-way\s+|20\d\d\s+)?(?:comparison|side-by-side|ranking|review|roundup|look|take|verdict)\b/i;
    for (const slug of BLOG_SLUGS) {
      const page = readFileSync(join(BLOG_DIR, slug, "page.tsx"), "utf8");
      const description = new RegExp(String.raw`const DESCRIPTION\s*=\s*${STRING}`).exec(page)?.[1];
      if (description === undefined) continue;
      if (selfGradedPost.test(description)) graded.push(`${slug}: ${description}`);
    }
    expect(graded).toEqual([]);
  });
});
