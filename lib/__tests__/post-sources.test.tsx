import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostSources } from "@/components/blog/post-sources";
import { SourceFirstArticle } from "@/components/marketing/source-first-article";
import { Disclaimer, DISCLAIMER_TEXT } from "@/components/marketing/disclaimer";

/**
 * F3 — the end-of-article Sources list (components/blog/post-sources.tsx)
 * and the sitewide disclaimer's general-information sentence.
 */

const P527 = {
  title: "IRS Publication 527 (2025), Residential Rental Property",
  url: "https://www.irs.gov/publications/p527",
};
const P946 = {
  title: "IRS Publication 946 (2025), How To Depreciate Property",
  url: "https://www.irs.gov/publications/p946",
};

describe("PostSources", () => {
  it("renders nothing for an empty list", () => {
    expect(renderToStaticMarkup(<PostSources sources={[]} />)).toBe("");
  });

  it("renders a Sources heading and an ordered list of same-tab links, in order", () => {
    const html = renderToStaticMarkup(<PostSources sources={[P527, P946]} />);
    expect(html).toContain('<h2 id="post-sources-heading"');
    expect(html).toContain(">Sources</h2>");
    expect(html).toContain("<ol");
    expect(html.indexOf(P527.url)).toBeGreaterThan(-1);
    expect(html.indexOf(P527.url)).toBeLessThan(html.indexOf(P946.url));
    expect(html).toContain(`href="${P527.url}"`);
    expect(html).toContain("irs.gov");
    expect(html).not.toContain("target=");
    expect(html).not.toContain("rel=");
  });

  it("lists a URL once even when it is passed twice", () => {
    const html = renderToStaticMarkup(<PostSources sources={[P527, P946, P527]} />);
    expect(html.split(`href="${P527.url}"`).length - 1).toBe(1);
    expect(html.split("<li").length - 1).toBe(2);
  });

  it("renders after a SourceFirstArticle's FAQ and before its author bio", () => {
    const article = {
      slug: "what-is-a-good-cap-rate",
      title: "Test article",
      description: "Test description.",
      publishedAt: "2026-05-24",
      modifiedAt: "2026-05-24",
      faqs: [{ question: "A question?", answer: "An answer." }],
    };
    const html = renderToStaticMarkup(
      <SourceFirstArticle article={article} sources={[P527]}>
        <p>Body.</p>
      </SourceFirstArticle>,
    );
    const faq = html.indexOf("Frequently asked questions");
    const sources = html.indexOf("data-post-sources");
    const bio = html.indexOf("data-author-bio");
    expect(faq).toBeGreaterThan(-1);
    expect(sources).toBeGreaterThan(faq);
    expect(bio).toBeGreaterThan(sources);

    const without = renderToStaticMarkup(
      <SourceFirstArticle article={article}>
        <p>Body.</p>
      </SourceFirstArticle>,
    );
    expect(without).not.toContain("data-post-sources");
  });
});

describe("sitewide disclaimer", () => {
  it("says the articles are general information, not tax, legal or investment advice", () => {
    expect(DISCLAIMER_TEXT).toContain(
      "Our articles and guides are general information, not tax, legal or investment advice; confirm the specifics with a qualified professional.",
    );
    expect(DISCLAIMER_TEXT).toContain("It is not an appraisal, a lender decision, or investment advice.");
    expect(DISCLAIMER_TEXT.endsWith("The math is published in our Methodology.")).toBe(true);
  });

  it("renders the same text it exports", () => {
    const html = renderToStaticMarkup(<Disclaimer />);
    const text = html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
    expect(text).toBe(DISCLAIMER_TEXT);
  });
});
