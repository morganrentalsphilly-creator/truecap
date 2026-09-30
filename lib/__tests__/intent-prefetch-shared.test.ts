import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Intent-only prefetch on the shared content components and the content
 * pages (the rule in components/marketing/intent-prefetch-link.tsx).
 *
 * A default next/link prefetches its route as soon as it scrolls into view.
 * Before this sweep a 390px phone scrolling /blog fetched 194 RSC payloads
 * (5.2 MB) and /tools 70, almost none of them opened. Internal links now go
 * through IntentPrefetchLink, which prefetches on hover or keyboard focus
 * only. A plain next/link is kept for two things: a page's first-screen
 * primary action, and /analyze links, which carry prefetch={false} (never
 * prefetched, so the analyzer bundle stays off marketing pages) and stay
 * <Link> so analyzer-link-destinations and passive-conversion-cta still read
 * them.
 *
 * The source checks read each file with its comments removed, from the end
 * of its first screen (PAGES) or from the top when the page's first screen
 * holds no primary action that may prefetch. A page the SEO loop edits
 * (LOOP_EDITED) pins the links this sweep converted instead of banning every
 * plain <Link>: the loop's skills add internal links as plain <Link>.
 */

const rendered = vi.hoisted(() => [] as Array<{ href: string; prefetch?: false }>);

vi.mock("@/components/marketing/intent-prefetch-link", async (importActual) => ({
  ...(await importActual<typeof import("@/components/marketing/intent-prefetch-link")>()),
  IntentPrefetchLink: ({ href, prefetch, children }: { href: string; prefetch?: false; children?: ReactNode }) => {
    rendered.push({ href, prefetch });
    return createElement("a", { href }, children);
  },
}));

import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogHubLink } from "@/components/marketing/blog-hub-link";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/**
 * Shared components with no primary action of their own: blocks after an
 * article (related links, reading list, bio, hub line) and the header meta
 * lines (byline, the source-first post's date line). No next/link at all.
 */
const COMPONENTS = [
  "components/marketing/related-content.tsx",
  "components/marketing/related-blog-posts.tsx",
  "components/marketing/author-bio.tsx",
  "components/marketing/blog-byline.tsx",
  "components/marketing/blog-hub-link.tsx",
  "components/marketing/source-first-article.tsx",
];

/**
 * A first screen that holds a primary action allowed to prefetch: the source
 * text that ends it, and the hrefs of its default-prefetch <Link>s, exactly.
 */
type FirstScreen = { end: string; prefetches: string[] };

/**
 * Content pages and their first screen (null: it holds no primary action
 * that may prefetch, so the rule holds from the top of the file). The other
 * heroes hold only /analyze (never prefetched), a calculator widget, or
 * nothing clickable but links.
 *
 * /sample-decision-memo: its hero's actions are `memoActions`, declared above
 * the return and so above </PageHero>, and rendered a second time where the
 * reading ends. The source position covers both, so the plain <Link>s before
 * the marker are pinned to exactly its /pricing button (plus the /analyze
 * one, which never prefetches): the repeat at the end reaches a route the
 * hero already prefetched, and any link added to the row fails here.
 */
const PAGES: Record<string, FirstScreen | null> = {
  "app/blog/page.tsx": null,
  "app/tools/page.tsx": null,
  "app/tools/1-percent-rule-calculator/page.tsx": null,
  "app/blog/1-percent-rule-rental-property/page.tsx": null,
  "app/embed/page.tsx": null,
  "app/about/page.tsx": null,
  "app/reviews/page.tsx": null,
  "app/sample-decision-memo/page.tsx": { end: "</PageHero>", prefetches: ["/pricing"] },
};

/**
 * Pages the SEO loop edits, with the hrefs this sweep moved to
 * IntentPrefetchLink. The loop's skills add an internal link as a plain
 * `<Link href className>` (seo-internal-links, whose tier 0 in
 * seo/scripts/verify-static.ts counts only <Link> and <a>;
 * seo-striking-distance; seo-gap-article), and verify-build runs `npm test`,
 * so banning every plain <Link> here would fail a weekly run that picks this
 * post. Instead none of the converted hrefs may come back as a plain <Link>.
 * The loop never adds a second link to a path the page already links ("one
 * link per target per page"), so a link it adds never lands on this list.
 */
const LOOP_EDITED: Record<string, string[]> = {
  "app/blog/1-percent-rule-rental-property/page.tsx": [
    "/blog",
    "/tools/1-percent-rule-calculator",
    "/blog/how-to-underwrite-a-rental-property-in-60-seconds",
    "/blog/gross-rent-multiplier-explained",
    "/tools/gross-rent-multiplier-calculator",
    "/blog/what-is-a-good-cap-rate",
    "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
    "/blog/brrrr-method-explained",
  ],
};

/**
 * Source without comments, so a comment can neither satisfy nor trip a rule.
 * A JSX comment leaves an empty {} behind, which no link tag holds.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

type Tag = { name: "Link" | "IntentPrefetchLink"; attrs: string; at: number };

/**
 * Every <Link …> and <IntentPrefetchLink …> opening tag. Attributes may span
 * lines and hold braces, strings and template literals (a ">" inside them
 * does not end the tag).
 */
function linkTags(source: string): Tag[] {
  const out: Tag[] = [];
  for (const match of source.matchAll(/<(Link|IntentPrefetchLink)(?=[\s/>])/g)) {
    const start = (match.index ?? 0) + match[0].length;
    let depth = 0;
    let quote: string | null = null;
    let i = start;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ name: match[1] as Tag["name"], attrs: source.slice(start, i), at: match.index ?? 0 });
  }
  return out;
}

/** The literal href of a tag, or null when it is computed. */
function literalHref(attrs: string): string | null {
  const match = /\bhref=(?:"([^"]*)"|\{\s*(["'`])([^"'`$]*)\2\s*\})/.exec(attrs);
  return match ? (match[1] ?? match[3]) : null;
}

const isAnalyzer = (href: string | null) => href !== null && /^\/analyze(?:[?#]|$)/.test(href);
const neverPrefetches = (attrs: string) => /\bprefetch=\{false\}/.test(attrs);
const describeTag = (file: string, tag: Tag) => `${file}: <${tag.name} ${tag.attrs.replace(/\s+/g, " ").trim()}>`;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const rel = join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (rel.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("intent-only prefetch: shared content components", () => {
  it.each(COMPONENTS)("%s uses IntentPrefetchLink and no next/link", (file) => {
    const source = code(read(file));
    expect(source, `${file}: import IntentPrefetchLink, not next/link`).not.toMatch(/from ["']next\/link["']/);
    const tags = linkTags(source);
    expect(tags.filter((tag) => tag.name === "Link").map((tag) => describeTag(file, tag))).toEqual([]);
    expect(tags.some((tag) => tag.name === "IntentPrefetchLink"), file).toBe(true);
  });

  it("renders every internal link of the blocks through IntentPrefetchLink, and never prefetches /analyze", () => {
    const blocks: Array<[string, ReturnType<typeof createElement>]> = [
      ["BlogByline", createElement(BlogByline)],
      ["AuthorBio", createElement(AuthorBio)],
      ["BlogHubLink", createElement(BlogHubLink, { postSlug: "1-percent-rule-rental-property" })],
      ["RelatedBlogPosts", createElement(RelatedBlogPosts, { currentSlug: "1-percent-rule-rental-property" })],
      // A tool's related links and a /vs page's both end on the analyzer
      // (lib/related-content.ts); the hrefs are data, so only a render sees them.
      ["RelatedContent tool", createElement(RelatedContent, { kind: "tool", slug: "1-percent-rule-calculator", title: "1% Rule Calculator" })],
      ["RelatedContent vs", createElement(RelatedContent, { kind: "vs", slug: "dealcheck" })],
    ];
    const analyzer: Array<{ href: string; prefetch?: false }> = [];
    for (const [label, element] of blocks) {
      rendered.length = 0;
      const html = renderToStaticMarkup(element);
      const internal = [...html.matchAll(/<a\b[^>]*\shref="(\/[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      expect(internal.length, `${label} renders internal links`).toBeGreaterThan(0);
      expect(rendered.map((link) => link.href).sort(), label).toEqual(internal.sort());
      analyzer.push(...rendered.filter((link) => isAnalyzer(link.href)));
    }
    // Non-vacuous: RelatedContent links /analyze and /analyze?sample=1.
    expect(analyzer.map((link) => link.href)).toEqual(expect.arrayContaining(["/analyze", "/analyze?sample=1"]));
    for (const link of analyzer) expect(link.prefetch, link.href).toBe(false);
  });
});

describe("intent-only prefetch: content pages", () => {
  // A plain next/link that may prefetch: anything but /analyze with
  // prefetch={false}.
  const mayPrefetch = (tag: Tag) =>
    tag.name === "Link" && !(isAnalyzer(literalHref(tag.attrs)) && neverPrefetches(tag.attrs));

  it.each(Object.entries(PAGES))("%s: no default-prefetch <Link> after its first screen", (file, firstScreen) => {
    const source = code(read(file));
    let from = 0;
    if (firstScreen !== null) {
      from = source.indexOf(firstScreen.end);
      expect(from, `${file}: the first-screen marker ${firstScreen.end}`).toBeGreaterThan(-1);
      expect(source.indexOf(firstScreen.end, from + 1), `${file}: one ${firstScreen.end}`).toBe(-1);
      // The first screen's own prefetching links are its primary actions,
      // exactly: one more (or a second copy) fails.
      const primary = linkTags(source)
        .filter((tag) => tag.at < from && mayPrefetch(tag))
        .map((tag) => literalHref(tag.attrs) ?? describeTag(file, tag));
      expect(primary.sort(), `${file}: the default-prefetch <Link>s before ${firstScreen.end}`).toEqual(
        [...firstScreen.prefetches].sort(),
      );
    }
    const tags = linkTags(source).filter((tag) => tag.at >= from);
    const pinned = LOOP_EDITED[file];
    // After the first screen the only plain next/link allowed is /analyze
    // with prefetch={false}; every other internal link is IntentPrefetchLink.
    // On a page the SEO loop edits, the converted hrefs must stay converted
    // and a plain <Link> the loop adds to a new path passes (LOOP_EDITED).
    const offenders = tags
      .filter(mayPrefetch)
      .filter((tag) => {
        if (!pinned) return true;
        const href = literalHref(tag.attrs);
        return href === null || pinned.includes(href);
      })
      .map((tag) => describeTag(file, tag));
    expect(offenders, `plain next/link after the first screen:\n${offenders.join("\n")}`).toEqual([]);
    expect(tags.some((tag) => tag.name === "IntentPrefetchLink"), `${file}: its links go through IntentPrefetchLink`).toBe(true);
  });

  it.each(Object.entries(LOOP_EDITED))("%s: the pinned hrefs are links through IntentPrefetchLink", (file, pinned) => {
    expect(Object.keys(PAGES), `${file} is one of the content pages`).toContain(file);
    // A pinned href may leave the page (seo-refresh repoints a broken link
    // and keeps its tag), so the list is not required in full; it must not
    // go stale as a whole, and a pinned href is never a plain <Link>
    // (the rule above).
    const converted = linkTags(code(read(file)))
      .filter((tag) => tag.name === "IntentPrefetchLink")
      .map((tag) => literalHref(tag.attrs));
    expect(pinned.filter((href) => converted.includes(href)).length, file).toBeGreaterThan(0);
  });

  // /analyze links on these pages stay plain <Link prefetch={false}>: the
  // analyzer guards (analyzer-link-destinations, passive-conversion-cta,
  // calculator-link-honesty) match only <Link>, so an IntentPrefetchLink to
  // /analyze would leave their view.
  it.each(Object.keys(PAGES))("%s: every /analyze link is <Link prefetch={false}>", (file) => {
    const tags = linkTags(code(read(file))).filter((tag) => isAnalyzer(literalHref(tag.attrs)));
    expect(tags.length, `${file} links the analyzer`).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag.name, describeTag(file, tag)).toBe("Link");
      expect(neverPrefetches(tag.attrs), describeTag(file, tag)).toBe(true);
    }
  });
});

describe("intent-only prefetch: /analyze everywhere", () => {
  // analyzer-link-destinations.test.ts checks /analyze <Link>s; this is its
  // counterpart for IntentPrefetchLink, which prefetches /analyze on hover
  // unless told not to.
  it("never hands /analyze to IntentPrefetchLink without prefetch={false}", () => {
    const offenders: string[] = [];
    for (const file of [...walk("app"), ...walk("components")]) {
      for (const tag of linkTags(code(read(file)))) {
        if (tag.name !== "IntentPrefetchLink") continue;
        if (isAnalyzer(literalHref(tag.attrs)) && !neverPrefetches(tag.attrs)) offenders.push(describeTag(file, tag));
      }
    }
    expect(offenders, `/analyze IntentPrefetchLinks without prefetch={false}:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("reads tags the way the rules above assume", () => {
    const [tag] = linkTags(`<Link\n  href="/analyze?sample=1"\n  className={buttonVariants({ size: "cta" })}\n  prefetch={false}\n>`);
    expect(tag.name).toBe("Link");
    expect(literalHref(tag.attrs)).toBe("/analyze?sample=1");
    expect(neverPrefetches(tag.attrs)).toBe(true);
    const [computed] = linkTags("<IntentPrefetchLink href={`/blog/${post.slug}`} onClick={() => a > b}>");
    expect(computed.name).toBe("IntentPrefetchLink");
    expect(literalHref(computed.attrs)).toBeNull();
    expect(computed.attrs).toContain("a > b");
    expect(linkTags(code("{/* <Link href=\"/pricing\"> */}\n// <Link href=\"/x\">"))).toEqual([]);
  });
});
