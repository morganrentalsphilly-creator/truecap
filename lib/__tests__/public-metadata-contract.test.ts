import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const SURFACES = [
  {
    file: "app/page.tsx",
    path: "/",
    pageTitle: "Rental Property Calculator & Max Offer | TrueCap",
    socialTitle: "Rental Property Calculator & Max Offer | TrueCap",
    description:
      "Analyze a rental property from an address, edit every assumption, and see cash flow, cap rate, DSCR, cash-on-cash return, and a target-based Offer Ceiling.",
  },
  {
    file: "app/about/page.tsx",
    path: "/about",
    pageTitle: "About TrueCap & Founder Morgan Page",
    socialTitle: "About TrueCap & Founder Morgan Page",
    description:
      "Meet TrueCap founder Morgan Page and learn why the rental property analyzer uses editable assumptions, conservative defaults, and transparent formulas.",
  },
  {
    file: "app/why-truecap/page.tsx",
    path: "/why-truecap",
    pageTitle: "Why TrueCap for Rental Property Analysis",
    socialTitle: "Why TrueCap for Rental Property Analysis",
    description:
      "Compare TrueCap with spreadsheets and rental analysis tools, including workflow, assumptions, Offer Ceiling, reports, and where each approach fits.",
  },
  {
    file: "app/tools/rental-property-spreadsheet/page.tsx",
    path: "/tools/rental-property-spreadsheet",
    pageTitle: "Free Rental Property Analysis Spreadsheet",
    socialTitle: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email needed.",
  },
  {
    file: "app/vs/page.tsx",
    path: "/vs",
    pageTitle: "Rental Property Calculator Comparisons",
    socialTitle: "Rental Property Calculator Comparisons | TrueCap",
    description:
      "Compare TrueCap with rental property calculators, underwriting tools, marketplaces, and landlord software using sourced, side-by-side workflow reviews.",
  },
  {
    file: "app/blog/page.tsx",
    path: "/blog",
    pageTitle: "Rental Property Investing Blog",
    socialTitle: "Rental Property Investing Blog | TrueCap",
    description:
      "Practical guides to rental property analysis, financing, cash flow, taxes, and underwriting, with formulas, worked examples, and editable assumptions.",
  },
  {
    file: "app/markets/page.tsx",
    path: "/markets",
    pageTitle: "Rental Property Markets by City",
    socialTitle: "Rental Property Markets by City | TrueCap",
    description:
      "Browse ${ALL.length}+ U.S. city verification guides and analyze a supported address with editable assumptions.",
  },
] as const;

function metadataSource(file: string): string {
  const source = readFileSync(join(ROOT, file), "utf8");
  const start = source.indexOf("export const metadata");
  const end = source.indexOf("\n};", start);
  expect(start, `${file} has no metadata export`).toBeGreaterThanOrEqual(0);
  expect(
    end,
    `${file} metadata object is not statically inspectable`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("priority public metadata", () => {
  it("keeps every document title unique", () => {
    expect(new Set(SURFACES.map((surface) => surface.pageTitle)).size).toBe(
      SURFACES.length,
    );
  });

  it.each(SURFACES)(
    "$path has aligned canonical and social metadata",
    (surface) => {
      const source = metadataSource(surface.file);
      expect(source).toContain(surface.pageTitle);
      expect(source).toContain(`canonical: "${surface.path}"`);
      expect(source).toContain(`url: "${surface.path}"`);
      expect(source).toContain(`title: "${surface.socialTitle}"`);
      expect(source).toContain("twitter:");
      expect(source.split(surface.description)).toHaveLength(4);
    },
  );

  it("keeps the now-indexable comparison hub free of a noindex override", () => {
    expect(metadataSource("app/vs/page.tsx")).not.toMatch(
      /robots:\s*\{[^}]*index:\s*false/,
    );
  });
});
