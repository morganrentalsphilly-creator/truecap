import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { lastmodFor } from "@/lib/seo/lastmod";
import { HISTORICAL_TOOL_PATHS } from "@/lib/historical-tool-redirects";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

const PRIVATE_PREFIXES = [
  "/api/",
  "/admin/",
  "/auth/",
  "/dashboard/",
  "/profile/",
  "/settings/",
  "/d/",
  "/s/",
  "/portal/",
  "/embed/brand/",
  "/home-authed",
] as const;

const OTHER_REDIRECT_SOURCES = [
  "/tools/Y2FwLXJhdG",
  "/guarantee",
  "/deals",
  "/dashboard/screen",
  "/compare",
  "/saved-analyses",
  "/templates",
  "/vs/dealcheck-for-brrrr",
  "/vs/dealcheck-for-fix-and-flip",
] as const;

describe("sitemap URL uniqueness", () => {
  it("emits every sitemap URL exactly once", () => {
    const urls = sitemap().map((entry) => entry.url);
    const counts = new Map<string, number>();

    for (const url of urls) {
      counts.set(url, (counts.get(url) ?? 0) + 1);
    }

    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([url, count]) => `${url} (${count})`);

    expect(
      duplicates,
      `Duplicate sitemap URLs: ${duplicates.join(", ")}`,
    ).toEqual([]);
  });

  it("emits each available blog post exactly once from the shared catalog", () => {
    const siteUrl = CANONICAL_SITE_URL;
    const urls = sitemap().map((entry) => entry.url);

    for (const post of BLOG_POSTS.filter((entry) => entry.available)) {
      const expectedUrl = `${siteUrl}/blog/${post.slug}`;
      expect(
        urls.filter((url) => url === expectedUrl),
        expectedUrl,
      ).toHaveLength(1);
    }
  });

  it("includes the canonical comparison hub", () => {
    const siteUrl = CANONICAL_SITE_URL;
    expect(
      sitemap().filter((entry) => entry.url === `${siteUrl}/vs`),
    ).toHaveLength(1);
  });

  it("emits absolute, clean URLs without ignored crawl hints", () => {
    for (const entry of sitemap()) {
      const parsed = new URL(entry.url);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.origin).toBe(CANONICAL_SITE_URL);
      expect(parsed.search).toBe("");
      expect(parsed.hash).toBe("");
      expect(entry).not.toHaveProperty("priority");
      expect(entry).not.toHaveProperty("changeFrequency");
    }
  });

  it("excludes private paths and every redirect source", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);

    for (const path of paths) {
      expect(
        PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix)),
        `Private path leaked into sitemap: ${path}`,
      ).toBe(false);
    }

    for (const path of [...HISTORICAL_TOOL_PATHS, ...OTHER_REDIRECT_SOURCES]) {
      expect(paths, `${path} is a redirect source`).not.toContain(path);
    }
  });

  it("takes every lastmod from content/seo/lastmod.json and invents none", () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      // Exactly the map's date; a path the map lacks gets no <lastmod> at all
      // (never the build date, never a hand-typed floor).
      expect(entry.lastModified, path).toBe(lastmodFor(path));
      if (entry.lastModified !== undefined) {
        expect(entry.lastModified, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
