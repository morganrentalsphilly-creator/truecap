import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { homepageFaqItems } from "@/components/marketing/landing-sections";

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
    // One FAQ block. structuredData stays false: "/" claims this set's
    // FAQPage node (structured-data-f4.test.tsx).
    expect(source.match(/<HomepageFaq\b/g)).toHaveLength(1);
  });

  // Since the 2026-11 ads pass (C2) the homepage shows this same set, so the
  // two pages cannot drift: this page renders the full investor set, and the
  // homepage's is equal to it.
  it("renders the full investor set, the one the homepage shows", () => {
    const investorSet = homepageFaqItems("investors").map((item) => item.q);
    const homepage = homepageFaqItems("home").map((item) => item.q);

    expect(investorSet).toContain("Is TrueCap really free?");
    expect(investorSet.length).toBeGreaterThanOrEqual(5);
    expect(homepage).toEqual(investorSet);
  });

  it("leaves the one Disclaimer to SiteFooter", () => {
    expect(source).not.toContain("<Disclaimer");
    expect(source).not.toContain("disclaimer={false}");
  });
});
