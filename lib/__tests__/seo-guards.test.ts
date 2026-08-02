import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import {
  APP_DIR,
  HTML_ENTITY_RE,
  MAX_META_DESCRIPTION_CHARS,
  MAX_TITLE_CONST_CHARS,
  REPO_ROOT,
  allPages,
  blogSlugs,
  blogPage,
  indexablePages,
  linkProfile,
  resolveMetadataString,
} from "@/lib/seo/source-scan";

/**
 * Automated SEO guards — the source-scannable half of the 2026-08-02 SEO
 * baseline audit. The other half (JSON-LD types, one-h1-per-page, redirect
 * status codes, live 200s) needs rendered HTML and lives in
 * scripts/seo/healthcheck.mjs, which the weekly workflow runs against prod.
 *
 * TWO KINDS OF ASSERTION IN HERE — the distinction is deliberate:
 *
 *   HARD GATES fail immediately on any violation. Reserved for defects that
 *   were fully fixed in the same PR that added the guard, so the gate starts
 *   green and any red is a genuine new regression.
 *
 *   RATCHETS compare against docs/seo/guard-baseline.json, which records the
 *   pre-existing debt the audit found (68/69 posts under the internal-linking
 *   standard, 45 long descriptions, …). They fail only when the debt GROWS.
 *   Fixing pages is a normal PR ending in
 *   `node scripts/seo/guard-baseline.mjs --write`.
 *
 * The ratchet design is the point. A hard gate on 68 failing posts would be
 * red forever, and a permanently red test gets deleted or skipped within a
 * month — at which point it protects nothing.
 */

const BASELINE_PATH = path.join(REPO_ROOT, "docs", "seo", "guard-baseline.json");

type Baseline = {
  limits: {
    maxTitleConstChars: number;
    maxMetaDescriptionChars: number;
    internalLinkTarget: Record<string, number>;
  };
  longTitles: Record<string, number>;
  longDescriptions: Record<string, number>;
  missingFaqPage: string[];
  internalLinks: Record<string, Record<string, number>>;
};

const baseline: Baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

const REGEN = "run `node scripts/seo/guard-baseline.mjs --write` to bank it";

describe("SEO guards — corpus sanity", () => {
  /**
   * The scanner is regex-based and returns null when it can't resolve a
   * value (see lib/seo/source-scan.ts header). That failure mode is safe
   * per-page but catastrophic corpus-wide: a broken scanner silently passes
   * every other test in this file. These two assertions are the tripwire.
   */
  it("finds the app router page corpus", () => {
    expect(allPages().length).toBeGreaterThan(150);
  });

  it("finds the indexable subset and the blog corpus", () => {
    expect(indexablePages().length).toBeGreaterThan(100);
    expect(blogSlugs().length).toBeGreaterThan(60);
  });

  it("baseline file covers the current blog corpus", () => {
    const missing = blogSlugs().filter((s) => !(s in baseline.internalLinks));
    // A new post legitimately isn't in the baseline yet — but it must then
    // meet the standard outright (asserted below), so this only catches a
    // baseline that has gone badly stale.
    expect(
      missing.length,
      `${missing.length} posts absent from the baseline: ${missing.slice(0, 5).join(", ")}`,
    ).toBeLessThan(10);
  });
});

describe("HARD GATE: no HTML entities in metadata strings", () => {
  /**
   * `&apos;` inside a DESCRIPTION const is muscle memory from writing JSX,
   * but metadata strings are not JSX — Next serves the literal characters, so
   * Google's snippet reads "Here&apos;s the formula". Found on 7 money pages
   * in the audit; all 7 fixed in the PR that added this test, so this is a
   * hard gate from day one.
   */
  const pages = allPages();

  it.each(pages.map((p) => p.relFile))("%s: metadata is entity-free", (relFile) => {
    const page = pages.find((p) => p.relFile === relFile)!;
    for (const field of ["title", "description"] as const) {
      const value = resolveMetadataString(page.source, field);
      if (value === null) continue; // unresolvable — see scanner constraint 2
      const match = value.match(HTML_ENTITY_RE);
      expect(
        match,
        `${relFile}: metadata.${field} contains the literal HTML entity ` +
          `"${match?.[0]}". Metadata is not JSX — write the real character ` +
          `(' " & — “ ”) instead.`,
      ).toBeNull();
    }
  });
});

describe("HARD GATE: llms-full.txt covers every calculator", () => {
  /**
   * The tool list drifted to 14 of 20 because it was a hand-maintained array
   * living next to a registry that is the actual source of truth. Fixed by
   * keying the formulas off the registry; this asserts the two stay in step.
   */
  const routeSource = readFileSync(
    path.join(APP_DIR, "llms-full.txt", "route.ts"),
    "utf8",
  );

  it("declares a formula for every registry slug", () => {
    const declared = new Set(
      [...routeSource.matchAll(/^\s{2}"([a-z0-9-]+)":\s*\{$/gm)].map((m) => m[1]),
    );
    const missing = CALCULATOR_REGISTRY.map((c) => c.slug).filter(
      (slug) => !declared.has(slug),
    );
    expect(
      missing,
      `TOOL_FORMULAS in app/llms-full.txt/route.ts is missing: ${missing.join(", ")}. ` +
        `Every calculator in CALCULATOR_REGISTRY needs a formula entry, or LLMs ` +
        `ingesting the site never learn the tool exists.`,
    ).toEqual([]);
  });

  it("declares no formula for a calculator that no longer exists", () => {
    const registrySlugs = new Set(CALCULATOR_REGISTRY.map((c) => c.slug));
    const declared = [...routeSource.matchAll(/^\s{2}"([a-z0-9-]+)":\s*\{$/gm)].map(
      (m) => m[1],
    );
    const orphaned = declared.filter((slug) => !registrySlugs.has(slug));
    expect(orphaned, `stale TOOL_FORMULAS entries: ${orphaned.join(", ")}`).toEqual([]);
  });
});

describe("HARD GATE: every indexable page is reachable and self-canonical", () => {
  /**
   * Canonical hygiene here was already excellent (186/189 pages) — this is a
   * regression guard, not a cleanup. It starts green.
   */
  const pages = indexablePages();

  it.each(pages.map((p) => p.relFile))("%s: declares a canonical", (relFile) => {
    const page = pages.find((p) => p.relFile === relFile)!;
    // Redirect stubs are the documented exception: their whole body is a
    // redirect() call, so there is nothing to canonicalise.
    if (/^\s*(?:export default )?(?:async )?function \w+\(\)\s*\{\s*(?:permanent)?[Rr]edirect\(/m.test(page.source)) {
      return;
    }
    expect(
      // No `s` flag — tsconfig targets ES6 and `[^}]` already spans newlines.
      /alternates:\s*\{[^}]*canonical:/.test(page.source),
      `${relFile}: indexable page has no alternates.canonical. Either add one ` +
        `or mark the page robots:{index:false}.`,
    ).toBe(true);
  });
});

describe("HARD GATE: legacy route stubs redirect permanently", () => {
  /**
   * `redirect()` emits 307 (temporary), which tells Google to keep the old
   * URL indexed. These three moved for good, so they want 308.
   */
  const stubs = ["compare", "saved-analyses", "templates"];

  it.each(stubs)("/%s uses permanentRedirect", (stub) => {
    const file = path.join(APP_DIR, stub, "page.tsx");
    if (!existsSync(file)) return; // route removed entirely — fine
    const source = readFileSync(file, "utf8");
    if (!/\bredirect\(/.test(source)) return; // no longer a stub
    expect(
      /permanentRedirect\(/.test(source),
      `app/${stub}/page.tsx uses redirect() → HTTP 307, which asks Google to ` +
        `keep the old URL indexed. Use permanentRedirect() → 308.`,
    ).toBe(true);
  });
});

describe("RATCHET: SERP title length", () => {
  const pages = indexablePages();

  it.each(pages.map((p) => p.relFile))("%s: title fits the SERP window", (relFile) => {
    const page = pages.find((p) => p.relFile === relFile)!;
    const title = resolveMetadataString(page.source, "title");
    if (title === null) return;
    if (title.length <= MAX_TITLE_CONST_CHARS) return;

    const known = baseline.longTitles[page.route];
    expect(
      known,
      `${relFile}: title is ${title.length} chars (max ${MAX_TITLE_CONST_CHARS} ` +
        `before the " | TrueCap" template). New pages must fit. Shorten it, or ` +
        `if this is deliberate, ${REGEN}.`,
    ).toBeDefined();
    expect(
      title.length,
      `${relFile}: title grew from ${known} to ${title.length} chars — the ` +
        `ratchet only turns one way.`,
    ).toBeLessThanOrEqual(known);
  });
});

describe("RATCHET: meta description length", () => {
  const pages = indexablePages();

  it.each(pages.map((p) => p.relFile))("%s: description fits the snippet", (relFile) => {
    const page = pages.find((p) => p.relFile === relFile)!;
    const description = resolveMetadataString(page.source, "description");
    if (description === null) return;
    if (description.length <= MAX_META_DESCRIPTION_CHARS) return;

    const known = baseline.longDescriptions[page.route];
    expect(
      known,
      `${relFile}: description is ${description.length} chars (max ` +
        `${MAX_META_DESCRIPTION_CHARS}); Google truncates the rest. ` +
        `lib/utils.ts exports truncateMetaDescription() — or ${REGEN}.`,
    ).toBeDefined();
    expect(
      description.length,
      `${relFile}: description grew from ${known} to ${description.length} chars.`,
    ).toBeLessThanOrEqual(known);
  });
});

describe("RATCHET: blog internal linking (docs/SEO-ROADMAP.md §8)", () => {
  /**
   * Standard: ≥3 glossary, ≥1 market, ≥1 tool, ≥2 sibling posts. 68/69 posts
   * were short on at least one axis at baseline. A NEW post must meet the
   * standard outright; an existing post must not get worse.
   */
  const target = baseline.limits.internalLinkTarget;
  const slugs = blogSlugs();

  it.each(slugs)("%s: link profile does not regress", (slug) => {
    const page = blogPage(slug);
    const profile = linkProfile(page.source, page.route);
    const before = baseline.internalLinks[slug];

    for (const [family, min] of Object.entries(target)) {
      const now = profile[family as keyof typeof profile];

      if (!before) {
        expect(
          now,
          `new post ${slug} ships with ${now} /${family} link(s); the standard ` +
            `is ${min}. New content meets the bar — the baseline only covers ` +
            `posts that predate the guard.`,
        ).toBeGreaterThanOrEqual(min);
        continue;
      }

      const wasBelow = before[family] < min;
      if (wasBelow) {
        expect(
          now,
          `${slug}: /${family} links dropped ${before[family]} → ${now} while ` +
            `still under the ${min} standard. Removing links from an already-` +
            `thin post makes it worse. If a target page was deleted, replace ` +
            `the link rather than dropping it.`,
        ).toBeGreaterThanOrEqual(before[family]);
      }
    }
  });
});

describe("RATCHET: FAQPage coverage on blog posts", () => {
  /**
   * docs/seo-content-backlog.md makes "FAQ + FAQPage JSON-LD where natural"
   * the house standard. 62/69 posts had it at baseline.
   */
  const known = new Set(baseline.missingFaqPage);

  it.each(blogSlugs())("%s: has FAQPage JSON-LD", (slug) => {
    const page = blogPage(slug);
    const hasFaq = page.source.includes('"FAQPage"');
    if (hasFaq) return;
    expect(
      known.has(slug),
      `${slug}: no FAQPage JSON-LD. Every post gets an FAQ block + FAQPage ` +
        `schema (docs/seo-content-backlog.md). If this post genuinely has no ` +
        `natural FAQ, ${REGEN}.`,
    ).toBe(true);
  });
});

describe("HARD GATE: sitemap covers every indexable route", () => {
  /**
   * The sitemap is complete today, but 111 of its 413 entries are typed
   * literals — a new /vs or bespoke /markets folder will not auto-appear.
   * This asserts set-containment against the route tree so the drift is
   * caught the day it's introduced rather than months later in GSC.
   *
   * Reads sitemap.ts as TEXT rather than importing it: app/sitemap.ts imports
   * BLOG_POSTS from app/blog/page.tsx, which drags next/link and the whole
   * component tree into a plain-node context. (Lifting BLOG_POSTS into
   * lib/blog-posts.ts would let this import the real thing — worth doing, but
   * it is a bigger refactor than this guard should carry.)
   */
  const sitemapSource = readFileSync(path.join(APP_DIR, "sitemap.ts"), "utf8");

  it.each(indexablePages().map((p) => p.route))("%s appears in sitemap.ts", (route) => {
    if (route === "/") return; // emitted as the bare base URL
    const segment = route.replace(/^\//, "");
    // Match either a literal path string or a derived template that ends in
    // the route's own folder name (e.g. `${base}/vs/${slug}`).
    const literal = sitemapSource.includes(`"${route}"`) ||
      sitemapSource.includes(`\`\${baseUrl}${route}\``) ||
      sitemapSource.includes(`${route}\``) ||
      sitemapSource.includes(`"${segment}"`);
    const derived = new RegExp(`/${segment.split("/")[0]}/`).test(sitemapSource);
    expect(
      literal || derived,
      `${route} exists as an indexable page but nothing in app/sitemap.ts ` +
        `references it. Add it, or mark the page robots:{index:false}.`,
    ).toBe(true);
  });
});
