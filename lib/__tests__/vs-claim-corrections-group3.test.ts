/**
 * Ten comparison pages were corrected against each vendor's own pages in
 * October 2026 (go-to-market audit rows P0-07, P0-09, P0-11, P0-12, P0-14,
 * P0-17, P1-21, P1-22, P1-24, P1-25, P1-27, P1-68, P2-144, P2-145). The
 * existing guards read matrix cells for a few terms only, so none of these
 * sentences would have failed a test. This file keeps each corrected claim
 * from coming back on those ten pages.
 *
 * It reads a fixed list of pages on purpose: the other /vs pages are corrected
 * in their own changes, and three of the rules below (the tax view, the usage
 * claims, the scored price rows) are worth widening to every app/vs page once
 * those land.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isFeatureReleased } from "@/lib/entitlements-catalog";

const SLUGS = [
  "hostaway",
  "hostfully",
  "landlord-studio",
  "lodgify",
  "mashvisor",
  "mashvisor-for-short-term-rentals",
  "privy",
  "propstream",
  "quickbooks-rental",
  "rentcast",
] as const;
type Slug = (typeof SLUGS)[number];

const source = (slug: Slug) => readFileSync(join(process.cwd(), "app", "vs", slug, "page.tsx"), "utf8");
/** The page as one line: JSX wraps sentences, and `{" "}` is a space. */
const flat = (slug: Slug) =>
  source(slug)
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");

/** The competitor cell and the winner of every literal row of the page's MATRIX. */
function matrixRows(slug: Slug): Array<{ feature: string; competitor: string; winner: string | null }> {
  const text = source(slug);
  const start = text.indexOf("const MATRIX");
  const end = text.indexOf("\n];", start);
  expect(start, `${slug}: MATRIX`).toBeGreaterThan(-1);
  expect(end, `${slug}: end of MATRIX`).toBeGreaterThan(start);
  const body = text.slice(start, end);
  const rows: Array<{ feature: string; competitor: string; winner: string | null }> = [];
  for (const block of body.split(/\n {2}\{\n/).slice(1)) {
    const feature = /feature:\s*"([^"]*)"/.exec(block)?.[1] ?? "";
    // The cell that is neither `feature` nor `truecap`: the competitor's.
    const cells = [...block.matchAll(/\n\s{4}(\w+):\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/g)].filter(
      (cell) => !["feature", "truecap", "winner"].includes(cell[1]),
    );
    const winner = /winner:\s*"(\w+)"/.exec(block)?.[1] ?? null;
    rows.push({ feature, competitor: cells[0]?.[2] ?? "", winner });
  }
  return rows;
}

describe("corrected comparison pages (group 3)", () => {
  it("reads a matrix on every page", () => {
    for (const slug of SLUGS) {
      const rows = matrixRows(slug);
      expect(rows.length, slug).toBeGreaterThanOrEqual(9);
      for (const row of rows) {
        expect(row.feature, slug).not.toBe("");
        expect(row.competitor, `${slug}: ${row.feature}`).not.toBe("");
      }
    }
  });

  it("does not advertise the tax view anywhere on the page while it is unavailable", () => {
    // unshipped-feature-claims.test.ts reads matrix cells only; the bullet
    // "an illustrative tax-impact model" sat in a TL;DR list.
    if (isFeatureReleased("tax_strategy")) return;
    for (const slug of SLUGS) {
      expect(flat(slug), slug).not.toMatch(/tax[- ]impact/i);
    }
  });

  it("makes no claim about how many people use TrueCap with the competitor", () => {
    // No usage data exists. "can use both" and "may use both" describe fit and pass.
    const quantified =
      /\b(?:most|many|typically|often|commonly)\b[^.?!]{0,90}\b(?:use|uses|using|run|runs)\s+(?:both|TrueCap)\b|most common combined workflow|common combination|hosts use both/i;
    for (const slug of SLUGS) {
      expect(flat(slug).match(quantified)?.[0] ?? null, slug).toBeNull();
    }
  });

  it("never scores a row as a TrueCap win when the competitor cell quotes a price", () => {
    for (const slug of SLUGS) {
      for (const row of matrixRows(slug)) {
        if (/\$\d/.test(row.competitor)) {
          expect(row.winner, `${slug}: ${row.feature}`).not.toBe("truecap");
        }
      }
    }
  });

  it("keeps the retired competitor claims out", () => {
    const RETIRED: Array<[Slug, RegExp]> = [
      ["landlord-studio", /no ACH collection|log rent payments but don|Starter ~\$12|Premium ~\$30/i],
      ["hostfully", /\$109|trial only|they offer a trial/i],
      ["hostaway", /\$10-15|Per-listing pricing|often overkill|One with HUD FMR/i],
      ["lodgify", /1-10 (?:unit )?STR/i],
      ["mashvisor", /\$\$\$|expensive to license|Account-gated views/i],
      ["mashvisor-for-short-term-rentals", /\$70-300|\$20-40|gold standard|Investibility|Limited free dashboard/i],
      ["privy", /setup fees|optimistic rent|Trial only|~\$99/i],
      // PropStream's plan table marks direct mail an add-on on all three plans.
      [
        "propstream",
        /150M\+|Not the use case|no underwriting|similar volume to PropStream|heavyweight|direct mail included/i,
      ],
      ["quickbooks-rental", /Trial only|\$15-90|Self-Employed|connect any US bank/i],
      ["rentcast", /Limited free lookups|PDF reports available on paid|limits property lookups and excludes its API/i],
    ];
    for (const [slug, pattern] of RETIRED) {
      expect(flat(slug).match(pattern)?.[0] ?? null, slug).toBeNull();
    }
  });

  it("states the corrected facts and links the page they were checked against", () => {
    const landlord = flat("landlord-studio");
    expect(landlord).toContain("online by card or ACH on every plan, including the free Go plan");
    expect(landlord).toContain("https://www.landlordstudio.com/pricing");
    expect(matrixRows("landlord-studio").find((row) => row.feature === "Rent collection")?.winner).toBe(
      "landlordstudio",
    );

    const hostfully = flat("hostfully");
    expect(hostfully).toContain("does not offer free trials");
    expect(hostfully).toContain("https://www.hostfully.com/pricing/");

    const hostaway = flat("hostaway");
    expect(hostaway).toContain("does not publish prices");
    expect(hostaway).toContain("https://www.hostaway.com/pricing/");

    for (const slug of ["mashvisor", "mashvisor-for-short-term-rentals"] as const) {
      expect(flat(slug), slug).toContain("https://www.mashvisor.com/pricing");
    }
    // A rule, not a snapshot of Mashvisor's prices: the weekly SEO loop
    // refreshes competitor figures on /vs pages and cannot edit this file. The
    // false "$70-300" stays out through RETIRED above.
    const strPrice =
      matrixRows("mashvisor-for-short-term-rentals").find((row) => row.feature === "Pricing (paid tier)")
        ?.competitor ?? "";
    expect(strPrice).toMatch(/\$\d/);
    expect(strPrice).toMatch(/as of [A-Z][a-z]+ 20\d\d/);

    const propstream = matrixRows("propstream");
    expect(propstream.find((row) => row.feature === "Cap rate / CoC / DSCR analysis")?.winner).toBe("tie");
    expect(propstream.find((row) => row.feature === "PDF deal report")?.winner).toBe("tie");
    expect(flat("propstream")).toContain("https://www.propstream.com/pricing");

    const rentcast = matrixRows("rentcast");
    expect(rentcast.find((row) => row.feature === "Free tier")?.winner).toBe("tie");
    expect(rentcast.find((row) => row.feature === "PDF deal report")?.winner).toBe("tie");

    expect(flat("quickbooks-rental")).toContain("https://quickbooks.intuit.com/pricing/");
    expect(flat("privy")).toContain("30-day money-back guarantee");
  });
});
