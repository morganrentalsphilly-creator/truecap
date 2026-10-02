/**
 * Truth guards for the parts every /vs comparison page shares, starting with
 * the sources note in ComparisonFaq.
 *
 * Each block pins a defect the 2026-10 go-to-market audit found live:
 *
 *   - 35 of 38 pages printed "last reviewed June 2026" from one shared
 *     constant, on rows nobody had re-checked. A page now prints a review date
 *     only when it passes `reviewedDate` itself; with none, the note claims no
 *     review.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/vs/example" }));

import { ComparisonFaq } from "@/components/marketing/comparison-faq";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Source as a reader meets it: comments out, entities decoded, JSX line wraps joined. */
const visibleSource = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ");

const FAQ = "components/marketing/comparison-faq.tsx";
const ITEMS = [{ question: "Q?", answer: "A." }];

/** The sources note as rendered: the <aside> that follows the FAQ rows. */
function sourcesNote(html: string): string {
  const start = html.indexOf("<aside");
  const end = html.indexOf("</aside>", start);
  expect(start, "ComparisonFaq renders its sources note as a Note (<aside>)").toBeGreaterThan(-1);
  return html.slice(start, end).replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
}

describe("the /vs sources note prints a review date only when the page passes one", () => {
  it("has no shared default date", () => {
    const source = read(FAQ);
    expect(source).not.toContain("COMPARISON_REVIEWED");
    // The prop is destructured bare: `reviewedDate,` with no `= <default>`.
    expect(source).toMatch(/\n {2}reviewedDate,\n\}: \{/);
    expect(source).not.toMatch(/reviewedDate\s*=\s*[^=>\s{]/);
    expect(visibleSource(source)).not.toMatch(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\b/);
  });

  it("claims no review, and prints no date, on a page that passes none", () => {
    const note = sourcesNote(renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />));
    expect(note).toContain("Sources & methodology:");
    expect(note).toContain("Rows about Acme are TrueCap's summary and may be out of date.");
    expect(note).toContain("check the vendor's own site for current details");
    expect(note).not.toMatch(/review|checked on|verified on|as of/i);
    expect(note).not.toMatch(/\b20\d\d\b/);
  });

  it("prints the page's own date when it passes one", () => {
    const note = sourcesNote(
      renderToStaticMarkup(<ComparisonFaq competitorName="Acme" reviewedDate="October 2026" items={ITEMS} />),
    );
    expect(note).toContain("Feature and pricing rows reflect Acme's publicly listed information, last reviewed October 2026.");
    expect(note).toContain("verify current details on Acme's own site.");
    expect(note).not.toContain("may be out of date");
  });

  it("keeps the note a Note, never a heading", () => {
    const html = renderToStaticMarkup(<ComparisonFaq competitorName="Acme" items={ITEMS} />);
    expect(html).not.toMatch(/<h[1-6][^>]*>[^<]*Sources/);
    // The label opens the first <aside> on the block: Note's own element.
    expect(html).toMatch(/<aside class="max-w-\[68ch\][^"]*"><div[^>]*><span class="font-semibold text-foreground">Sources &amp; methodology:<\/span>/);
  });
});
