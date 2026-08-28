import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\n")
    .filter((file) => Boolean(file) && existsSync(join(ROOT, file)));

const comparisonPages = tracked(["app/vs/page.tsx", "app/vs/*/page.tsx"]);
const comparisonSurfaces = tracked(["app/vs/**/*.tsx"]);
const comparisonCopy = comparisonSurfaces.map(read).join("\n");
const comparisonBlogs = [
  "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx",
  "app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx",
  "app/blog/best-free-rental-property-calculator-2026/page.tsx",
];
const comparisonBlogCopy = comparisonBlogs.map(read).join("\n");

describe("comparison claim truth", () => {
  it("keeps TrueCap pricing dynamic across competitor pages", () => {
    expect(comparisonPages.length).toBeGreaterThan(40);
    expect(comparisonSurfaces.length).toBeGreaterThan(75);
    for (const file of comparisonSurfaces) {
      expect(read(file), file).not.toMatch(
        /\$29\.99|\$300\/(?:yr|year)|\$25\/mo|\$5 one-time/i
      );
    }
    expect(comparisonCopy).toContain("see live pricing");
  });

  it("does not restore unsupported data, outcome, or Roofstock claims", () => {
    expect(comparisonCopy).not.toMatch(
      /Within ~5%|often 10[-–]25% off|Pulls actual county appraisal|holds up under lender scrutiny|almost certainly pencil|pays for itself|Airbnb(?:'|&apos;)s 15[-–]20%/i
    );
    expect(comparisonCopy).not.toMatch(
      /Pro saves history of saved deals|everything unlimited/i
    );
    expect(comparisonCopy).not.toMatch(
      /0\.5% buyer marketplace fee|optimized for (?:the )?listing.*appeal|filter (?:the )?real deals from marketing/i
    );
  });

  it("retains source-backed competitor corrections", () => {
    const zillow = read("app/vs/zillow-rent-estimate/page.tsx");
    expect(zillow).toContain("https://www.zillow.com/rent/what-is-a-rent-zestimate/");
    expect(zillow).toContain("https://www.huduser.gov/portal/datasets/fmr.html");
    expect(zillow).toContain("not a property-specific rent opinion");
    expect(zillow).toContain("state effective-rate estimate");

    const guesty = read("app/vs/guesty/page.tsx");
    expect(guesty).toContain("Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+");
    expect(guesty).toContain("https://www.guesty.com/pricing/");

    const appfolio = read("app/vs/appfolio/page.tsx");
    expect(appfolio).toContain("50-unit minimum and minimum spend");
    expect(appfolio).toContain("https://www.appfolio.com/pricing");

    const buildium = read("app/vs/buildium/page.tsx");
    expect(buildium).toContain("Essential, Growth, and Premium");
    expect(buildium).toContain("https://www.buildium.com/pricing/");

    const stessa = read("app/vs/stessa/page.tsx");
    expect(stessa).toContain("free Essentials tier plus paid Manage and Pro tiers");
    expect(stessa).toContain("https://www.stessa.com/pricing/");

    const rentredi = read("app/vs/rentredi/page.tsx");
    expect(rentredi).toContain("unlimited properties and units");
    expect(rentredi).toContain("money-back guarantee rather than a free trial");
    expect(rentredi).toContain("https://rentredi.com/pricing");

    const lodgify = read("app/vs/lodgify/page.tsx");
    expect(lodgify).toContain("https://www.lodgify.com/pricing/");
    expect(lodgify).toContain("https://www.airbnb.com/help/article/1857");
    expect(lodgify).not.toMatch(/~?\$13/i);
  });

  it("keeps DealCheck and TrueCap capabilities on their actual gates", () => {
    expect(read("app/vs/dealcheck-for-brrrr/page.tsx")).toContain(
      'permanentRedirect("/blog/brrrr-method-explained")'
    );
    expect(read("app/vs/dealcheck-for-fix-and-flip/page.tsx")).toContain(
      'permanentRedirect("/blog/70-percent-rule-house-flipping")'
    );
    const strComparison = read("app/vs/dealcheck-for-short-term-rentals/page.tsx");
    expect(strComparison).toContain("included on Starter");
    expect(strComparison).toContain("professional reports");
    expect(strComparison).toContain("https://dealcheck.io/pricing/");

    expect(read("app/vs/excel/page.tsx")).toContain("No per-deal revision history");
    expect(read("app/vs/biggerpockets-for-house-hacking/page.tsx")).toContain(
      "no move-out-year switch"
    );
    expect(read("app/vs/roofstock/page.tsx")).toContain(
      "not a buy, decline, appraisal, or investment"
    );
    for (const file of ["app/vs/mashvisor/page.tsx", "app/vs/privy/page.tsx"]) {
      expect(read(file), file).toContain(
        "One free lookup; Pro includes 50 per month; no AVM"
      );
    }
  });

  it("keeps comparison articles live-priced and appropriately qualified", () => {
    expect(comparisonBlogCopy).not.toMatch(
      /\$29\.99|\$300\/(?:yr|year)|\$25\/mo|\$5 one-time/i
    );
    expect(comparisonBlogCopy).not.toMatch(
      /\bonly one\b|\bdeepest\b|hands down|identical math|overpaying/i
    );
    expect(comparisonBlogCopy).toContain("https://dealcheck.io/pricing/");
    expect(comparisonBlogCopy).toContain("https://www.stessa.com/pricing/");
    expect(comparisonBlogCopy).toContain(
      "https://www.biggerpockets.com/rental-property-calculator"
    );
  });
});
