import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { BLOG_TOPICS, type BlogTopic } from "@/lib/blog-topics";
import { getRelatedContent } from "@/lib/related-content";
import { getCombosForCity } from "@/lib/city-strategy-combos";
import { STRATEGY_PAGES_INDEXABLE } from "@/lib/markets/indexability";
import { nearbyMarkets, stateGuideSlugFor } from "@/lib/markets/nearby";
import {
  blogTopicForPost,
  isLinkablePath,
  linkableToolFor,
  linkablePosts,
  relatedBlogPosts,
} from "@/lib/seo/link-policy";

/**
 * F9 — the rules every registry-driven link block follows
 * (lib/seo/link-policy.ts, lib/markets/nearby.ts). The noindex list is
 * injected, so each case proves a listed path drops out without editing
 * content/seo/noindex.json.
 */

const listed = (...paths: string[]) => (path: string) => paths.includes(path);
const none = () => false;

const post = (slug: string, available = true): BlogPost => ({
  slug,
  title: slug,
  excerpt: "",
  readingTimeMinutes: 1,
  publishedAt: "2026-01-01",
  available,
});
const topic = (slug: string, postSlugs: string[]): BlogTopic => ({
  slug,
  title: slug,
  description: "",
  intro: "",
  postSlugs,
  calculatorSlugs: [],
});

describe("relatedBlogPosts: same hub first, then the registry", () => {
  const posts = ["n1", "n2", "n3", "a", "b", "c", "d", "gone"].map((slug) => post(slug, slug !== "gone"));
  const topics = [topic("hub", ["d", "gone", "a", "b", "c"])];

  it("takes hub-mates in hub order, never the post itself or an unpublished post", () => {
    expect(relatedBlogPosts("a", { posts, topics, isListed: none }).map((p) => p.slug)).toEqual(["d", "b", "c"]);
  });

  it("fills from the registry (newest first) when the hub runs out", () => {
    expect(relatedBlogPosts("c", { posts, topics, isListed: none, limit: 5 }).map((p) => p.slug)).toEqual(["d", "a", "b", "n1", "n2"]);
    expect(relatedBlogPosts("n2", { posts, topics, isListed: none }).map((p) => p.slug)).toEqual(["n1", "n3", "a"]);
  });

  it("drops a post on the noindex list", () => {
    expect(relatedBlogPosts("a", { posts, topics, isListed: listed("/blog/b") }).map((p) => p.slug)).toEqual(["d", "c", "n1"]);
  });

  it("appending a post to a hub of four or more does not change the hub-mates' picks", () => {
    const grown = [...posts, post("new")];
    const grownTopics = [topic("hub", ["d", "gone", "a", "b", "c", "new"])];
    for (const slug of ["d", "a", "b", "c"]) {
      expect(relatedBlogPosts(slug, { posts: grown, topics: grownTopics, isListed: none }), slug).toEqual(
        relatedBlogPosts(slug, { posts, topics, isListed: none }),
      );
    }
  });

  it("gives real posts their hub's posts first", () => {
    const hub = blogTopicForPost("piti-explained-rental-property");
    expect(hub?.slug).toBe("financing");
    const picks = relatedBlogPosts("piti-explained-rental-property").map((p) => p.slug);
    expect(picks).toEqual(hub!.postSlugs.filter((slug) => slug !== "piti-explained-rental-property").slice(0, 3));
  });
});

describe("isLinkablePath", () => {
  it("refuses a listed path in every family", () => {
    for (const path of ["/blog/piti-explained-rental-property", "/glossary/grm", "/markets/columbus", "/states/ohio", "/tools/1-percent-rule-calculator", "/about"]) {
      expect(isLinkablePath(path, none), path).toBe(true);
      expect(isLinkablePath(path, listed(path)), path).toBe(false);
    }
  });

  it("refuses unreleased tools, unpublished or unknown posts, and noindexed strategy pages", () => {
    expect(isLinkablePath("/tools/cap-rate-calculator", none)).toBe(false);
    expect(isLinkablePath("/tools/rental-property-spreadsheet", none)).toBe(true);
    expect(isLinkablePath("/blog/not-a-post", none)).toBe(false);
    expect(isLinkablePath("/glossary/not-a-term", none)).toBe(false);
    expect(STRATEGY_PAGES_INDEXABLE).toBe(false);
    expect(isLinkablePath("/markets/cleveland/cash-flow", none)).toBe(false);
  });

  it("filters hub lists through the same rule", () => {
    expect(linkablePosts([post("piti-explained-rental-property"), post("piti-explained-rental-property", false)])).toHaveLength(1);
  });
});

describe("linkableToolFor (the glossary calculator line)", () => {
  it("names released calculators only", () => {
    expect(linkableToolFor("/tools/gross-rent-multiplier-calculator", none)?.slug).toBe("gross-rent-multiplier-calculator");
    expect(linkableToolFor("/tools/cap-rate-calculator", none)).toBeNull();
    expect(linkableToolFor("/tools/gross-rent-multiplier-calculator", listed("/tools/gross-rent-multiplier-calculator"))).toBeNull();
    expect(linkableToolFor(undefined, none)).toBeNull();
    expect(linkableToolFor("/blog/how-to-calculate-arv", none)).toBeNull();
  });
});

describe("getRelatedContent follows the policy", () => {
  it("never offers an unreleased tool and falls back to the post's hub calculator", () => {
    const released = (href: string) => !href.startsWith("/tools/") || isLinkablePath(href, none);
    for (const p of BLOG_POSTS) {
      for (const link of getRelatedContent({ kind: "blog", slug: p.slug, title: p.title })) expect(released(link.href), `${p.slug} → ${link.href}`).toBe(true);
    }
    // No tool shares a word with this post's slug and title: its hub (financing) supplies one.
    const links = getRelatedContent({ kind: "blog", slug: "seller-financing-subject-to", title: "Seller financing and subject-to deals" });
    const tools = links.filter((l) => l.kind === "tool").map((l) => l.href);
    expect(tools).toHaveLength(1);
  });
});

describe("market cross-links", () => {
  it("links a state guide only when it is indexable", () => {
    expect(stateGuideSlugFor("Ohio", none)).toBe("ohio");
    expect(stateGuideSlugFor("Ohio", listed("/states/ohio"))).toBeNull();
    expect(stateGuideSlugFor("Alaska", none)).toBeNull(); // no Alaska guide exists
  });

  it("lists at most five nearby markets: same state (county or HUD area first), then a metro across the state line", () => {
    // Mesa shares Phoenix's county and HUD FMR area, so it leads.
    expect(nearbyMarkets("phoenix", { isListed: none })[0]?.slug).toBe("mesa");
    // Vancouver, WA reaches Portland, OR through their shared HUD FMR area, after Washington's own markets.
    const vancouver = nearbyMarkets("vancouver", { isListed: none });
    expect(vancouver.at(-1)?.slug).toBe("portland");
    expect(vancouver.slice(0, -1).every((m) => m.stateCode === "WA")).toBe(true);
    for (const slug of ["houston", "columbus", "fort-wayne", "anchorage"]) {
      const picks = nearbyMarkets(slug, { isListed: none });
      expect(picks.length, slug).toBeLessThanOrEqual(5);
      expect(picks.map((m) => m.slug), slug).not.toContain(slug);
    }
    // Hamilton County, OH and Hamilton County, TN are not neighbours.
    expect(nearbyMarkets("cincinnati", { isListed: none }).map((m) => m.slug)).not.toContain("chattanooga");
  });

  it("drops a noindexed neighbour", () => {
    const before = nearbyMarkets("fort-worth", { isListed: none }).map((m) => m.slug);
    expect(before).toContain("houston");
    expect(nearbyMarkets("fort-worth", { isListed: listed("/markets/houston") }).map((m) => m.slug)).not.toContain("houston");
  });

  it("links no strategy page while strategy pages are noindexed", () => {
    expect(getCombosForCity("cleveland").length).toBeGreaterThan(0);
    expect(renderToStaticMarkup(createElement(CityStrategyGuides, { citySlug: "cleveland", cityName: "Cleveland" }))).toBe("");
  });
});

describe("hub registry", () => {
  it("files the four formerly unfiled posts in their hubs", () => {
    expect(blogTopicForPost("2-percent-rule-vs-1-percent-rule")?.slug).toBe("underwriting");
    expect(blogTopicForPost("cap-rate-vs-gross-yield")?.slug).toBe("underwriting");
    expect(blogTopicForPost("what-is-a-good-rental-yield")?.slug).toBe("underwriting");
    expect(blogTopicForPost("how-to-calculate-rental-property-depreciation")?.slug).toBe("tax");
  });

  it("names only real glossary terms in a hub's terms line", async () => {
    const { getGlossaryEntryBySlug } = await import("@/lib/glossary");
    for (const t of BLOG_TOPICS) for (const slug of t.glossarySlugs ?? []) expect(getGlossaryEntryBySlug(slug), `${t.slug} → ${slug}`).not.toBeNull();
  });
});
