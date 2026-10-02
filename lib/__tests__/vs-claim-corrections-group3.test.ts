/**
 * Ten comparison pages were corrected against each vendor's own pages in
 * October 2026 (go-to-market audit rows P0-07, P0-09, P0-11, P0-12, P0-14,
 * P0-17, P1-21, P1-22, P1-24, P1-25, P1-27, P1-68, P2-144, P2-145). The
 * existing guards read matrix cells for a few terms only, so none of these
 * sentences would have failed a test. This file keeps each corrected claim
 * from coming back on those ten pages.
 *
 * The vendor facts are read from a fixed list of ten pages. Three rules (the
 * tax view, the usage claims, the scored price rows) are read from every
 * comparison page, and the usage rule from the hub as well: they could not
 * pass on the whole of app/vs until the other page groups had been corrected.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

const VS_DIR = join(process.cwd(), "app", "vs");
/** Every comparison page: each app/vs/<slug>/page.tsx, redirect stubs included. */
const ALL_SLUGS = readdirSync(VS_DIR)
  .filter((name) => existsSync(join(VS_DIR, name, "page.tsx")))
  .sort();

const source = (slug: string) => readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8");
/** A source as one line: JSX wraps sentences, and `{" "}` is a space. */
const flatten = (text: string) =>
  text
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
const flat = (slug: string) => flatten(source(slug));
const hubFlat = () => flatten(readFileSync(join(VS_DIR, "page.tsx"), "utf8"));

type MatrixRow = { feature: string; competitor: string; winner: string | null };

/**
 * The competitor cell and the winner of every row of the page's MATRIX.
 *
 * Reads the array literal itself, so it holds for every table shape on the
 * comparison pages: a row over several lines, a row on one line
 * (/vs/rentometer), a label keyed `workflow` with no winner (/vs/dealcheck,
 * /vs/biggerpockets-calculator) and a cell written as JSX (/vs/excel), which
 * is left out because it carries no string to read.
 */
function matrixRows(slug: string): MatrixRow[] {
  const text = source(slug);
  const start = text.indexOf("const MATRIX");
  const open = text.indexOf("= [", start);
  const end = text.indexOf("\n];", start);
  expect(start, `${slug}: MATRIX`).toBeGreaterThan(-1);
  expect(open, `${slug}: start of MATRIX`).toBeGreaterThan(start);
  expect(end, `${slug}: end of MATRIX`).toBeGreaterThan(open);
  const body = text.slice(open + 3, end);

  // Each top-level `{ … }` is a row. Braces inside a string do not count.
  const objects: string[] = [];
  let depth = 0;
  let from = -1;
  let inString = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) from = i + 1;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) objects.push(body.slice(from, i));
    }
  }

  return objects.map((object) => {
    const cells = new Map<string, string>();
    const cell = /\s*(\w+):\s*"((?:[^"\\]|\\.)*)"\s*,?/y;
    for (let match = cell.exec(object); match; match = cell.exec(object)) cells.set(match[1], match[2]);
    const competitor = [...cells].find(([key]) => !["feature", "workflow", "truecap", "winner"].includes(key));
    return {
      feature: cells.get("feature") ?? cells.get("workflow") ?? "",
      competitor: competitor?.[1] ?? "",
      winner: cells.get("winner") ?? null,
    };
  });
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

describe("every comparison page (all four page groups and the hub)", () => {
  it("reads every page under app/vs", () => {
    expect(ALL_SLUGS.length).toBeGreaterThanOrEqual(40);
    for (const slug of SLUGS) expect(ALL_SLUGS).toContain(slug);
    // Two slugs only redirect and carry no table; every other page has one.
    const withMatrix = ALL_SLUGS.filter((slug) => source(slug).includes("const MATRIX"));
    expect(withMatrix.length).toBeGreaterThanOrEqual(38);
    for (const slug of withMatrix) {
      const rows = matrixRows(slug);
      expect(rows.length, slug).toBeGreaterThanOrEqual(6);
      for (const row of rows) expect(row.feature, slug).not.toBe("");
    }
  });

  it("does not advertise the tax view anywhere on a page while it is unavailable", () => {
    // unshipped-feature-claims.test.ts reads matrix cells only; the bullet
    // "an illustrative tax-impact model" sat in a TL;DR list.
    if (isFeatureReleased("tax_strategy")) return;
    for (const slug of ALL_SLUGS) {
      expect(flat(slug), slug).not.toMatch(/tax[- ]impact/i);
    }
    expect(hubFlat(), "the hub").not.toMatch(/tax[- ]impact/i);
  });

  it("makes no claim about how many people use TrueCap with the competitor", () => {
    // No usage data exists. "can use both", "may use both" and "can be used
    // together" describe fit and pass. Three patterns, one from each page
    // group that wrote one; vs-shared-truth-guards.test.tsx holds a fourth
    // over the same files and the social cards.
    const QUANTIFIED = [
      /\b(?:most|many|typically|often|commonly)\b[^.?!]{0,90}\b(?:use|uses|using|run|runs)\s+(?:both|TrueCap)\b|most common combined workflow|common combination|hosts use both/i,
      /\b(?:most|many|typically|commonly|often)\b[^.?!<>{}]{0,90}\b(?:use|uses|using|run|runs|keep|keeps|pair|pairs|end up)\b[^.?!<>{}]{0,60}\b(?:both|TrueCap|together|combination|combined)\b|\b(?:most )?common (?:combination|combined workflow)\b|\bAgents use both\b/i,
      /\b(?:most|many)\s+(?:[\w-]+\s+){0,3}(?:landlords|investors|buyers|agents|hosts|managers)\b[^.]{0,80}\b(?:use|using|run|end up)\b|\b(?:typically|commonly|often)\s+(?:use|used)\b/i,
    ];
    const claim = (text: string) => QUANTIFIED.map((pattern) => text.match(pattern)?.[0]).find(Boolean) ?? null;

    for (const audited of [
      "Most serious investors use both: PropStream to source, TrueCap to underwrite.",
      "Many active off-market buyers use both.",
      "Most diversified investors keep 1-3 direct rentals AND some money in Fundrise, a common combination.",
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Often used together.",
    ]) {
      expect(claim(audited), audited).not.toBeNull();
    }
    for (const plain of [
      "A landlord may use both.",
      "The two cover different stages and can be used together.",
      "Most rows show clear specialization.",
      "How small portfolios use both",
    ]) {
      expect(claim(plain), plain).toBeNull();
    }

    for (const slug of ALL_SLUGS) {
      expect(claim(flat(slug)), slug).toBeNull();
    }
    expect(claim(hubFlat()), "the hub").toBeNull();
  });

  it("never scores a row as a TrueCap win when the competitor cell quotes a price", () => {
    let priced = 0;
    for (const slug of ALL_SLUGS) {
      if (!source(slug).includes("const MATRIX")) continue;
      for (const row of matrixRows(slug)) {
        if (/\$\d/.test(row.competitor)) {
          priced += 1;
          expect(row.winner, `${slug}: ${row.feature}`).not.toBe("truecap");
        }
      }
    }
    // The rule reads real rows: the pages quote dozens of dated prices.
    expect(priced).toBeGreaterThan(30);
  });
});
