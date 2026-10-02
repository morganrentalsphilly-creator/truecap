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
 *
 * /vs/roofstock (report row P1-31). The page called Roofstock a "turnkey
 * rental marketplace" and offered to "Underwrite a Roofstock listing", while
 * roofstock.com's own "Explore Properties" link opens Stessa's marketplace
 * ("Investment Properties Powered by Roofstock") and the site presents three
 * brands: Mynd, Stessa and RentPrep. Eight rows put a check beside TrueCap
 * and a cross beside Roofstock over cells that said only "Confirm …" or
 * "Depends …", and FAQ 1 held a broken sentence that also shipped in the
 * FAQPage JSON-LD. The page is rewritten around what roofstock.com and
 * stessa.com rendered on 2026-10-02, and agrees with
 * /blog/roofstock-vs-mashvisor-vs-propstream.
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

describe("/vs/roofstock describes what Roofstock offers an individual buyer today", () => {
  const page = read("app/vs/roofstock/page.tsx");
  const card = read("app/vs/roofstock/opengraph-image.tsx");
  const text = flat(page);

  it("drops the stale marketplace premise from the H1, the hero button, the close and the JSON-LD", () => {
    expect(text).not.toMatch(/turnkey rental marketplace/i);
    expect(text).not.toMatch(/marketplace vs independent underwrite/i);
    expect(text).not.toContain("Underwrite a Roofstock listing");
    expect(text).not.toMatch(/Pressure-test your next Roofstock deal/i);
    // The hero button is the site's plain analyzer call.
    expect(text).toMatch(/analyticsSource="vs_hero"[^>]*>\s*Analyze a deal free\s*<\/AnalyzeCtaLink>/);
  });

  it("says where the listings are, and names the three brands", () => {
    expect(text).toContain("Explore Properties link now opens Stessa's investment-property marketplace");
    expect(page).toContain('href="https://www.stessa.com/investment-properties"');
    for (const brand of ["Mynd", "Stessa", "RentPrep"]) expect(text).toContain(brand);
  });

  it("marks a row for one side only over a cell that states a fact", () => {
    const rows = [...page.matchAll(/roofstock:\s*"((?:[^"\\]|\\.)*)",\s*winner:\s*"([a-z]+)"/g)].map((m) => ({
      cell: m[1],
      winner: m[2],
    }));
    expect(rows.length).toBeGreaterThanOrEqual(12);
    for (const row of rows) {
      // The hedges the audit found under a TrueCap check and a Roofstock cross.
      expect(row.cell, row.cell).not.toMatch(/^(?:Confirm|Depends|Review the)\b|dependent\b|^Not modeled$/i);
      // A cell that only points at the vendor scores nothing.
      if (/^See /.test(row.cell)) expect(row.winner, row.cell).toBe("tie");
    }
    // Stessa's Roofstock-powered listings show cap rate and cash on cash, so
    // that row cannot favor TrueCap.
    const capRate = /feature: "Cap rate \/ CoC \/ DSCR",[\s\S]*?winner: "([a-z]+)"/.exec(page);
    expect(capRate?.[1]).toBe("tie");
  });

  it("does not restore the broken FAQ sentence", () => {
    expect(text).not.toContain("Roofstock is a current individual-investor services vary by offering");
    expect(text).toContain(
      "Roofstock offers services for residential investors: property listings through Stessa's marketplace, property management through Mynd and tenant screening through RentPrep.",
    );
  });

  it("carries the same line on its card and in its Open Graph description", () => {
    const line =
      "Roofstock's property listings now open on Stessa's marketplace. TrueCap models the purchase from assumptions you can inspect and replace.";
    expect(card).toContain(`"${line}"`);
    expect(page).toContain(`"${line}"`);
  });

  it("agrees with the sourced blog post about where Roofstock sends buyers", () => {
    const post = flat(read("app/blog/roofstock-vs-mashvisor-vs-propstream/page.tsx"));
    expect(post).toContain("https://www.stessa.com/investment-properties");
    expect(post).toMatch(/where Roofstock now sends buyers/);
    expect(text).toMatch(/where Roofstock now sends buyers/);
  });
});
