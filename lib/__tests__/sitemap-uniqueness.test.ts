import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/app/blog/page";
import { getSiteUrl } from "@/lib/site-url";

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
    const siteUrl = getSiteUrl();
    const urls = sitemap().map((entry) => entry.url);

    for (const post of BLOG_POSTS.filter((entry) => entry.available)) {
      const expectedUrl = `${siteUrl}/blog/${post.slug}`;
      expect(
        urls.filter((url) => url === expectedUrl),
        expectedUrl,
      ).toHaveLength(1);
    }
  });
});
