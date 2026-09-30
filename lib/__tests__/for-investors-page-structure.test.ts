import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HOMEPAGE_INVESTOR_FAQ_QUESTIONS,
  homepageFaqItems,
} from "@/components/marketing/landing-sections";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// /for-investors after the 2026-09 design pass. No e2e spec visits the route.
// This test pins the page's structure, the way the /why-truecap check in
// marketing-accessibility-guards.test.ts pins that page.
describe("/for-investors page structure", () => {
  const source = read("app/for-investors/page.tsx");
  const mainStart = source.indexOf('<main id="main"');
  const mainEnd = source.indexOf("</main>", mainStart);

  it("has exactly one main landmark", () => {
    expect(mainStart).toBeGreaterThan(-1);
    expect(mainEnd).toBeGreaterThan(mainStart);
    expect(source.match(/<main[\s>]/g)).toHaveLength(1);
    expect(source.match(/<\/main>/g)).toHaveLength(1);
  });

  it("keeps the investor FAQ set and the close inside main, and the footer after it", () => {
    const faq = source.indexOf('<HomepageFaq structuredData={false} audience="investors" />');
    const close = source.indexOf("<CloseSection");
    const footer = source.indexOf("<SiteFooter />");

    expect(faq).toBeGreaterThan(mainStart);
    expect(faq).toBeLessThan(mainEnd);
    expect(close).toBeGreaterThan(mainStart);
    expect(close).toBeLessThan(mainEnd);
    expect(footer).toBeGreaterThan(mainEnd);
    // One FAQ block. structuredData stays false: "/" already claims the
    // question the two sets share (structured-data-f4.test.tsx).
    expect(source.match(/<HomepageFaq\b/g)).toHaveLength(1);
  });

  // DESIGN.md "Homepage structure" 7: the homepage keeps a curated few of the
  // investor questions. The rest live here, so this page has to render the
  // full investor set and not a trimmed list.
  it("renders the investor questions the homepage dropped", () => {
    const investorSet = homepageFaqItems("investors").map((item) => item.q);
    const homepage = homepageFaqItems("home").map((item) => item.q);

    for (const q of HOMEPAGE_INVESTOR_FAQ_QUESTIONS) expect(investorSet).toContain(q);
    expect(investorSet.filter((q) => !homepage.includes(q)).length).toBeGreaterThan(0);
  });

  it("leaves the one Disclaimer to SiteFooter", () => {
    expect(source).not.toContain("<Disclaimer");
    expect(source).not.toContain("disclaimer={false}");
  });
});
