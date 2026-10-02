/**
 * Truth guards for the comparison pages the 2026-10 go-to-market audit held
 * for a founder decision, and for their lines on the /vs hub.
 *
 * /vs/cozy (report row P1-18). The page dated Cozy's end to 2022 in nine
 * places (meta, Open Graph and WebPage descriptions, lede, table, FAQ and its
 * JSON-LD, the hub line, the social card), named the wrong screening
 * provider, scored TrueCap against a product nobody can buy, sent readers to
 * cozy.co "for their current state", and carried opinions about ex-Cozy users
 * that had no source. Cozy's own site, as the Internet Archive saved it, said
 * in June 2021 that accounts would move to Apartments.com "by mid-2021" and
 * on 2021-08-11 that Cozy had moved; its 2020 tenant screening page named
 * Experian for credit reports and Checkr for background checks. The page is
 * kept as an explainer of what replaced Cozy, with every row a tie.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Source as a reader meets it: entities decoded, JSX line wraps joined. */
const flat = (source: string) => source.replace(/&apos;|&rsquo;/g, "'").replace(/\s+/g, " ");

/** Every `winner: "…"` value in a page's MATRIX, in order. */
const winners = (source: string) => [...source.matchAll(/\bwinner:\s*"([a-z-]+)"/g)].map((m) => m[1]);

describe("/vs/cozy says when and where Cozy went", () => {
  const page = read("app/vs/cozy/page.tsx");
  const card = read("app/vs/cozy/opengraph-image.tsx");
  const text = flat(page);

  it("never dates the move to 2022, on the page or its card", () => {
    expect(page).not.toContain("2022");
    expect(card).not.toContain("2022");
  });

  it("says mid-2021 on every surface that used to carry the year", () => {
    // The meta description and the WebPage JSON-LD description share one
    // sentence; the Open Graph description opens the same way.
    expect(text.match(/"Cozy\.co moved to Apartments\.com in mid-2021\. /g)).toHaveLength(3);
    // The table's status cell.
    expect(page).toContain('cozy: "Moved to Apartments.com in mid-2021"');
    // The lede and the FAQ answer (the FAQPage JSON-LD is built from the same item).
    expect(text).toContain("and Cozy moved to Apartments.com in mid-2021.");
    expect(text).toContain("Cozy moved to Apartments.com in mid-2021: by August 2021 its homepage said");
    // The social card.
    expect(card).toContain("In mid-2021 Cozy moved to Apartments.com.");
  });

  it("names the screening providers Cozy's own page named", () => {
    expect(page).toContain('cozy: "Credit reports from Experian; background checks via Checkr"');
    // TransUnion's ResidentScore is Apartments.com's screening, not Cozy's.
    expect(page).not.toMatch(/TransUnion/i);
  });

  it("scores no row: every winner is a tie", () => {
    const marks = winners(page);
    expect(marks.length).toBeGreaterThanOrEqual(10);
    expect(new Set(marks)).toEqual(new Set(["tie"]));
  });

  it("does not send readers to cozy.co or head a list of other vendors \"Use Cozy when\"", () => {
    expect(page).not.toMatch(/href="https?:\/\/(?:www\.)?cozy\.co\/?"/);
    expect(text).not.toContain("for their current state");
    expect(text).not.toContain("Use Cozy when");
  });

  it("does not restore the unsourced lines about ex-Cozy users or Apartments.com", () => {
    expect(text).not.toMatch(/ex-Cozy users/i);
    expect(text).not.toMatch(/migration painful|rebrand was awkward|UX worse|more limited than Cozy|typically the next stops/i);
    // "no single tool replaced it" contradicted Cozy's own "Cozy has moved to Apartments.com".
    expect(text).not.toMatch(/no single tool replaced it/i);
    expect(text).not.toMatch(/most Cozy-like/i);
  });

  it("claims no review date: Apartments.com's live pages could not be read on 2026-10-02", () => {
    // The dated note would also tell readers to verify details "on Cozy's own
    // site", which is gone. Pass a date only after Apartments.com's current
    // pages were read as rendered and the note fits a retired product.
    expect(page).toMatch(/<ComparisonFaq competitorName="Cozy" items=\{COZY_FAQ\} \/>/);
  });
});
