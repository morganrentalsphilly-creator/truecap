import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/app/blog/page";
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
  "/analyze",
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

  it("uses only valid, reviewed last-modified dates", () => {
    const availablePosts = new Map(
      BLOG_POSTS.filter((post) => post.available).map((post) => [
        `/blog/${post.slug}`,
        new Date(post.modifiedAt ?? post.publishedAt).toISOString(),
      ]),
    );

    for (const entry of sitemap()) {
      if (!entry.lastModified) continue;
      const path = new URL(entry.url).pathname;
      const actual = new Date(entry.lastModified).toISOString();
      if (availablePosts.has(path)) {
        expect(actual, path).toBe(availablePosts.get(path));
      } else if (path === "/tools/rental-property-spreadsheet") {
        expect(actual).toBe(new Date("2026-07-14").toISOString());
      } else {
        expect(path.startsWith("/vs/"), `Unreviewed lastmod on ${path}`).toBe(
          true,
        );
        expect(actual).toBe(new Date("2026-06-07").toISOString());
      }
    }
  });
});
