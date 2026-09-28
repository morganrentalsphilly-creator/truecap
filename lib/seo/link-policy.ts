/**
 * Which internal URLs a registry-driven link block may point at (F9).
 *
 * Every block that builds its links from a registry (related posts, the topic
 * hubs, a post's "Part of" hub link, the glossary tool link, the market
 * page's state guide and nearby markets, the related-content box) asks this
 * module first, so a link never lands on:
 *   · a path on the SEO loop's noindex list (content/seo/noindex.json);
 *   · an unreleased calculator (lib/calculator-registry.ts);
 *   · a post that is not published (BLOG_POSTS `available`), which is how a
 *     post merged into another one leaves the registry before its URL
 *     redirects;
 *   · a market, state or strategy page its indexability rule keeps out of the
 *     index (lib/markets/indexability.ts).
 *
 * lib/__tests__/internal-link-graph.test.tsx renders every sitemap page and
 * fails on any internal link to a redirect, a noindex path, an unreleased
 * tool or another URL the sitemap does not list, and on any sitemap URL no
 * other sitemap page links to. This module is what keeps the generated
 * blocks on the right side of that guard; a hand-written link in a page body
 * is the guard's job alone.
 *
 * Consequence for the SEO loop: listing a path in noindex.json now also drops
 * it from the blocks above on OTHER pages, so a prune re-renders the pages
 * that linked it (seo/ARCHITECTURE.md, .claude/skills/seo-prune).
 *
 * Pure: no React, no server-only; reads checked-in registries only.
 */

import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { BLOG_TOPICS, type BlogTopic } from "@/lib/blog-topics";
import { getCalculator, isCalculatorReleased, type CalculatorEntry } from "@/lib/calculator-registry";
import { getGlossaryEntryBySlug } from "@/lib/glossary";
import {
  isMarketIndexable,
  isStateIndexable,
  isStrategyIndexable,
} from "@/lib/markets/indexability";
import { isNoindexPath } from "@/lib/seo/noindex";

/** /tools pages that are not calculators (app/sitemap.ts lists them by hand). */
const TOOL_PAGES_OUTSIDE_REGISTRY: ReadonlySet<string> = new Set(["rental-property-spreadsheet"]);

/** A path's own indexability, before the noindex list. Unknown families pass (core pages). */
function familyAllows(path: string): boolean {
  let m = /^\/blog\/topics\/([^/]+)$/.exec(path);
  if (m) return BLOG_TOPICS.some((topic) => topic.slug === m![1]);
  m = /^\/blog\/([^/]+)$/.exec(path);
  if (m) return BLOG_POSTS.some((post) => post.slug === m![1] && post.available);
  m = /^\/tools\/([^/]+)$/.exec(path);
  if (m) return TOOL_PAGES_OUTSIDE_REGISTRY.has(m[1]) || isCalculatorReleased(m[1]);
  m = /^\/glossary\/([^/]+)$/.exec(path);
  if (m) return getGlossaryEntryBySlug(m[1]) !== null;
  m = /^\/markets\/([^/]+)\/([^/]+)$/.exec(path);
  if (m) return isStrategyIndexable(m[1]);
  m = /^\/markets\/([^/]+)$/.exec(path);
  if (m) return isMarketIndexable(m[1]);
  m = /^\/states\/([^/]+)$/.exec(path);
  if (m) return isStateIndexable(m[1]);
  return true;
}

/**
 * True when a registry-driven block may link `path` (a site path, no query or
 * hash). `isListed` is the noindex-list lookup, injectable for tests.
 */
export function isLinkablePath(path: string, isListed: (path: string) => boolean = isNoindexPath): boolean {
  if (isListed(path)) return false;
  return familyAllows(path);
}

/** The hub a post belongs to: the first topic whose postSlugs lists it, or null. */
export function blogTopicForPost(slug: string, topics: readonly BlogTopic[] = BLOG_TOPICS): BlogTopic | null {
  return topics.find((topic) => topic.postSlugs.includes(slug)) ?? null;
}

export type RelatedPostsOptions = {
  limit?: number;
  posts?: readonly BlogPost[];
  topics?: readonly BlogTopic[];
  isListed?: (path: string) => boolean;
};

/**
 * The posts a post's "Keep reading" block shows: posts from its own hub first,
 * in the hub's order, then the rest of the registry in its order (newest
 * first), never the post itself and never a post a block may not link.
 *
 * Why this order keeps the SEO loop's render diff small: the gap-article skill
 * appends a new post to the END of the registry and of one hub's postSlugs,
 * so a hub member's top `limit` changes only when its hub has `limit` or
 * fewer other members (seo/ARCHITECTURE.md, Blog → Links).
 */
export function relatedBlogPosts(currentSlug: string, options: RelatedPostsOptions = {}): BlogPost[] {
  const { limit = 3, posts = BLOG_POSTS, topics = BLOG_TOPICS, isListed = isNoindexPath } = options;
  const linkable = (post: BlogPost) =>
    post.available && post.slug !== currentSlug && !isListed(`/blog/${post.slug}`);
  const bySlug = new Map(posts.map((post) => [post.slug, post] as const));
  const topic = blogTopicForPost(currentSlug, topics);
  const sameHub = (topic?.postSlugs ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((post): post is BlogPost => post !== undefined && linkable(post));
  const taken = new Set(sameHub.map((post) => post.slug));
  const others = posts.filter((post) => !taken.has(post.slug) && linkable(post));
  return [...sameHub, ...others].slice(0, limit);
}

/**
 * The released calculator a `/tools/<slug>` URL names (a glossary entry's
 * toolUrl), or null when the URL is not a tool page, the calculator is
 * unreleased, or the page is on the noindex list.
 */
export function linkableToolFor(toolUrl: string | undefined, isListed: (path: string) => boolean = isNoindexPath): CalculatorEntry | null {
  const m = toolUrl ? /^\/tools\/([^/?#]+)$/.exec(toolUrl) : null;
  if (!m || !isCalculatorReleased(m[1]) || !isLinkablePath(`/tools/${m[1]}`, isListed)) return null;
  return getCalculator(m[1]);
}

// ------------------------------------------------------- list filters (hubs)
//
// The hub pages (/blog, /markets, /states, /glossary) list a whole registry.
// They filter through these helpers instead of building paths inline, so the
// filter is one audited rule and adding it changed no hub's content signature
// (seo/scripts/lib/content-signature.ts counts string literals).

/** Published posts a block may link, in registry order. */
export function linkablePosts<T extends { slug: string; available: boolean }>(posts: readonly T[]): T[] {
  return posts.filter((post) => post.available && isLinkablePath(`/blog/${post.slug}`));
}

/** Market pages (programmatic or bespoke) a block may link, in input order. */
export function linkableMarkets<T extends { slug: string }>(markets: readonly T[]): T[] {
  return markets.filter((market) => isLinkablePath(`/markets/${market.slug}`));
}

/** State guides a block may link, in input order. */
export function linkableStates<T extends { slug: string }>(states: readonly T[]): T[] {
  return states.filter((state) => isLinkablePath(`/states/${state.slug}`));
}

/** Glossary terms a block may link, in input order. */
export function linkableGlossaryTerms<T extends { slug: string }>(terms: readonly T[]): T[] {
  return terms.filter((term) => isLinkablePath(`/glossary/${term.slug}`));
}
