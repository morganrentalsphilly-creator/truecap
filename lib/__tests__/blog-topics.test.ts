import { describe, it, expect } from "vitest";
import { BLOG_TOPICS, getBlogTopic } from "@/lib/blog-topics";
import { getCalculator } from "@/lib/calculator-registry";

describe("blog-topics", () => {
  it("topic slugs are unique", () => {
    const slugs = BLOG_TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every topic has copy and posts; released calculator links are explicit", () => {
    for (const t of BLOG_TOPICS) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.intro.trim().length).toBeGreaterThan(0);
      expect(t.postSlugs.length).toBeGreaterThan(0);
      // No dupes within a topic.
      expect(new Set(t.postSlugs).size).toBe(t.postSlugs.length);
      if (t.slug === "tax") {
        expect(t.calculatorSlugs).toEqual([]);
      } else {
        expect(t.calculatorSlugs.length).toBeGreaterThan(0);
      }
    }
  });

  it("every calculatorSlug resolves in the registry", () => {
    for (const t of BLOG_TOPICS) {
      for (const slug of t.calculatorSlugs) {
        expect(getCalculator(slug), `${t.slug} → ${slug}`).not.toBeNull();
      }
    }
  });

  it("getBlogTopic resolves known + returns null for unknown", () => {
    expect(getBlogTopic("underwriting")?.title).toBeTruthy();
    expect(getBlogTopic("nope")).toBeNull();
  });
});
