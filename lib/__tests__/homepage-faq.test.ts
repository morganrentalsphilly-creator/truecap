import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HOMEPAGE_AGENT_FAQ_QUESTIONS,
  HOMEPAGE_INVESTOR_FAQ_QUESTIONS,
  homepageFaqItems,
} from "@/components/marketing/landing-sections";
import { AGENT_FAQS } from "@/lib/agent-faqs";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// DESIGN.md "Homepage structure" 7: the homepage keeps eight questions under
// one FAQPage node. The list is picked by exact question text, so a reworded
// question in lib/agent-faqs.ts would silently drop out of the homepage; this
// is the test that notices.
describe("the homepage's eight questions", () => {
  const items = homepageFaqItems("home");

  it("resolves every curated question, in order", () => {
    expect(items.map((item) => item.q)).toEqual([
      ...HOMEPAGE_AGENT_FAQ_QUESTIONS,
      ...HOMEPAGE_INVESTOR_FAQ_QUESTIONS,
    ]);
    expect(items).toHaveLength(8);
    expect(items.every((item) => item.a.length > 40)).toBe(true);
  });

  it("keeps the dropped agent questions on /for-agents", () => {
    const dropped = AGENT_FAQS.filter(
      (faq) =>
        !(HOMEPAGE_AGENT_FAQ_QUESTIONS as readonly string[]).includes(faq.q),
    );
    expect(dropped.length).toBeGreaterThan(0);
    expect(read("app/for-agents/page.tsx")).toContain("items={AGENT_FAQS}");
  });

  it("is what both homepages render", () => {
    for (const page of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      expect(read(page), page).toContain('<HomepageFaq audience="home" />');
    }
  });
});
