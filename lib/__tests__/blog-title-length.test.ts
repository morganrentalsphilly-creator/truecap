import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * SERP title-length guard for blog posts (July 2026 SEO growth audit:
 * 61/66 post titles overflowed the ~60-char SERP window, so the year and
 * differentiator got truncated away in results). Style follows
 * pricing-copy-guards.test.ts: scan the source surfaces so a future post
 * can't silently regress.
 *
 * Contract: every app/blog/<slug>/page.tsx metadata title, after the root
 * layout's `"%s | TrueCap"` template (app/layout.tsx) is applied, must fit
 * in 60 chars — i.e. the title string itself must be ≤50 chars. Posts keep
 * their longer editorial headline in TITLE / TITLE_PLAIN (used for the
 * on-page <h1>, JSON-LD headline, and breadcrumb) and put the short
 * SERP-facing string in SERP_TITLE (used for metadata.title, og:title,
 * twitter.title).
 */

const TEMPLATE_SUFFIX = " | TrueCap"; // app/layout.tsx title.template
const MAX_SERP_TITLE_CHARS = 60;
const MAX_TITLE_CONST_CHARS = MAX_SERP_TITLE_CHARS - TEMPLATE_SUFFIX.length;

/**
 * TEMPORARY exemptions — posts being authored by a parallel workstream
 * (July 2026 SEO sprint listicle lane) whose files this sweep must not
 * edit. Their titles still overflow the SERP window; remove each slug
 * once that lane ships its own ≤50-char SERP title (the exemption is
 * harmless-but-stale if the title is already compliant).
 */
const PENDING_OTHER_LANE = new Set<string>([]);

const blogDir = fileURLToPath(new URL("../../app/blog", import.meta.url));
const sourceFirstArticle = readFileSync(
  fileURLToPath(
    new URL(
      "../../components/marketing/source-first-article.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);

function articleStringField(source: string, field: string): string | null {
  const articleBody = source.match(
    /const ARTICLE\s*=\s*\{([\s\S]*?)\}\s*as const/,
  )?.[1];
  return articleBody?.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1] ?? null;
}

function postSlugs(): string[] {
  return readdirSync(blogDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== "topics" &&
        existsSync(path.join(blogDir, entry.name, "page.tsx")),
    )
    .map((entry) => entry.name)
    .sort();
}

/**
 * Resolve the string a post's `metadata.title` renders as, before the
 * layout template is applied. Handles the two shapes posts use today:
 * `title: SOME_CONST` (string const, possibly wrapped to the next line by
 * prettier) and `title: "inline literal"`.
 */
function metadataTitle(source: string, slug: string): string {
  const metadataStart = source.indexOf("export const metadata");
  expect(
    metadataStart,
    `${slug}: page.tsx must export metadata`,
  ).toBeGreaterThan(-1);
  const afterMetadata = source.slice(metadataStart);

  if (/buildSourceFirstArticleMetadata\(ARTICLE\)/.test(afterMetadata)) {
    const title =
      articleStringField(source, "seoTitle") ??
      articleStringField(source, "title");
    expect(
      title,
      `${slug}: source-first metadata needs a plain ARTICLE title or seoTitle`,
    ).not.toBeNull();
    return title!;
  }

  const titleMatch = afterMetadata.match(
    /title:\s*("(?:[^"\\]|\\.)*"|[A-Z][A-Z0-9_]*)/,
  );
  expect(titleMatch, `${slug}: metadata must set a title`).not.toBeNull();
  const ref = titleMatch![1];

  if (ref.startsWith('"')) {
    return JSON.parse(ref) as string;
  }
  const constMatch = source.match(
    new RegExp(`const ${ref}\\s*=\\s*\\n?\\s*("(?:[^"\\\\]|\\\\.)*")`),
  );
  expect(
    constMatch,
    `${slug}: metadata title references ${ref}, which must be a plain string const`,
  ).not.toBeNull();
  return JSON.parse(constMatch![1]) as string;
}

describe("blog post SERP titles fit the ~60-char SERP window", () => {
  const slugs = postSlugs();

  it("finds the blog corpus", () => {
    expect(slugs.length).toBeGreaterThan(60);
  });

  it.each(slugs)(
    "%s: metadata title ≤ 50 chars (60 incl ' | TrueCap')",
    (slug) => {
      const source = readFileSync(path.join(blogDir, slug, "page.tsx"), "utf8");
      const title = metadataTitle(source, slug);
      if (
        PENDING_OTHER_LANE.has(slug) &&
        title.length > MAX_TITLE_CONST_CHARS
      ) {
        return; // see PENDING_OTHER_LANE — another lane owns this file
      }
      const rendered = `${title}${TEMPLATE_SUFFIX}`;
      expect(
        title.length,
        `${slug}: "${rendered}" is ${rendered.length} chars in the SERP — ` +
          `shorten the SERP_TITLE const to ≤${MAX_TITLE_CONST_CHARS} chars ` +
          `(keep the editorial TITLE/H1 as-is)`,
      ).toBeLessThanOrEqual(MAX_TITLE_CONST_CHARS);
      expect(
        title.trim().length,
        `${slug}: metadata title must not be empty`,
      ).toBeGreaterThan(0);
    },
  );

  it.each(slugs)(
    "%s: og:title matches the SERP title when both are set",
    (slug) => {
      const source = readFileSync(path.join(blogDir, slug, "page.tsx"), "utf8");
      if (/buildSourceFirstArticleMetadata\(ARTICLE\)/.test(source)) {
        expect(sourceFirstArticle).toContain("title: seoTitle");
        expect(sourceFirstArticle).toContain(
          "const seoTitle = article.seoTitle ?? article.title",
        );
        return;
      }
      // Posts route og:title through the same const as metadata.title so the
      // SERP and social card never drift; a post that reintroduces
      // `openGraph: { title: TITLE… }` would re-overflow the window.
      const ogTitle = source.match(
        /openGraph:\s*\{[^}]*?title:\s*([A-Z][A-Z0-9_]*)/,
      );
      if (ogTitle) {
        const metaTitle = source
          .slice(source.indexOf("export const metadata"))
          .match(/title:\s*([A-Z][A-Z0-9_]*)/);
        expect(
          ogTitle[1],
          `${slug}: og:title const should match metadata title const`,
        ).toBe(metaTitle?.[1]);
      }
    },
  );
});
