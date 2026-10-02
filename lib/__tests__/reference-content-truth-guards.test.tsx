/**
 * Reference content says only what is true (go-to-market audit, 2026-10).
 *
 * Each block pins one statement the audit found false on the reference
 * surfaces (/methodology, /tools and its calculators, /glossary,
 * /states, the spreadsheet page, /llms.txt, /feed.xml) against the thing it describes:
 * a recomputed number, a workbook cell, the rendered page. Where a number is
 * asserted it is recomputed here, so a wrong figure fails even if someone
 * types a different wrong figure.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET as getFeed } from "@/app/feed.xml/route";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import MethodologyPage from "@/app/methodology/page";
import ToolsLandingPage from "@/app/tools/page";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import { GLOSSARY } from "@/lib/glossary";
import { decodeEntities } from "../../seo/scripts/lib/html.ts";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const text = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const mainOf = (html: string) => html.slice(html.indexOf("<main"), html.indexOf("</main>"));

/** Source with block, JSX and line comments removed: what is left can reach a reader. */
function withoutComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) filesUnder(rel, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("P1-73: no content opacity follows scroll", () => {
  it("the scroll-driven reveal classes are gone from the stylesheet and from every page and component", () => {
    const css = read("app/globals.css");
    // Rules and keyframes, not the comment that records why they were removed.
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).not.toMatch(/tc-reveal/);
    expect(rules).not.toMatch(/animation-timeline\s*:\s*view\(/);
    const users = [...filesUnder("app"), ...filesUnder("components")]
      .filter((file) => file !== "app/globals.css")
      .filter((file) => /tc-reveal/.test(read(file)));
    expect(users).toEqual([]);
  });
});

describe("P1-12: the formula claims match what /methodology publishes", () => {
  const tools = text(mainOf(renderToStaticMarkup(ToolsLandingPage())));
  const methodologyHtml = renderToStaticMarkup(MethodologyPage());
  const methodology = text(mainOf(methodologyHtml));

  it("/tools names the analyzer's core formulas and makes no every-formula claim", () => {
    expect(tools).not.toMatch(/every formula/i);
    expect(tools).not.toMatch(/one question with one formula/i);
    expect(tools).not.toMatch(/nothing you typed here is typed twice/i);
    expect(tools).toContain(
      "The analyzer's core formulas (cap rate, cash-on-cash return, DSCR and the mortgage payment) are published on the methodology page.",
    );
  });

  it("every core formula /tools names has its own heading under 'The core formulas' on /methodology", () => {
    const core = methodologyHtml.slice(
      methodologyHtml.indexOf("The core formulas"),
      methodologyHtml.indexOf("Decision thresholds and Offer Ceiling"),
    );
    const headings = [...core.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]!));
    expect(headings).toEqual([
      "Cap rate",
      "Cash-on-cash return",
      "DSCR (Debt Service Coverage Ratio)",
      "Mortgage payment",
    ]);
  });

  it("/methodology does not claim the score arithmetic is fully published", () => {
    expect(methodology).not.toMatch(/no hidden score arithmetic/i);
    expect(methodology).toContain("The core formulas are published and versioned.");
  });

  it("llms.txt describes /methodology by the core formulas it publishes, not as the exact math", async () => {
    const llms = await (await getLlmsTxt()).text();
    expect(llms).not.toMatch(/exact math/i);
    expect(llms).toContain(
      "/methodology): The analyzer's core formulas (cap rate, cash-on-cash, DSCR, the mortgage payment), the Offer Ceiling procedure, and the 10-year projection method.",
    );
  });

  it("/methodology prints the standard's version with a space before the next word", () => {
    expect(methodology).toMatch(/TrueCap Underwriting Standard v\d+(?:\.\d+)* financial formulas/);
    expect(methodology).not.toMatch(/v\d+(?:\.\d+)*financial/);
  });
});

describe("P1-35: worked numbers are the numbers the stated inputs give", () => {
  it("the IRR example states the IRR of its own cash flows", () => {
    const example = GLOSSARY.irr!.example!;
    // "Invest $80k. Collect $7k/yr cash flow for 10 years. Sell for $480k
    // (paying off $260k mortgage = $220k proceeds). IRR ≈ N%."
    const k = (label: RegExp) => Number(example.match(label)![1]) * 1000;
    const invested = k(/Invest \$(\d+)k/);
    const annual = k(/Collect \$(\d+)k\/yr/);
    const years = Number(example.match(/for (\d+) years/)![1]);
    const proceeds = k(/= \$(\d+)k proceeds/);
    const flows = [-invested, ...Array.from({ length: years }, (_, i) => annual + (i === years - 1 ? proceeds : 0))];
    const npv = (rate: number) => flows.reduce((sum, flow, year) => sum + flow / (1 + rate) ** year, 0);
    let low = 0;
    let high = 1;
    for (let i = 0; i < 80; i += 1) {
      const mid = (low + high) / 2;
      if (npv(mid) > 0) low = mid;
      else high = mid;
    }
    const stated = Number(example.match(/IRR ≈ ([\d.]+)%/)![1]);
    expect(stated).toBe(Math.round(low * 1000) / 10);
    expect(stated).toBe(16.7);
  });

  it("the building-value definition states no default percentage (the input is not shown today)", () => {
    expect(GLOSSARY.buildingValue!.definition).not.toMatch(/defaults? to \d/i);
  });

  it("the mortgage page names the year principal first exceeds interest on its own example loan", () => {
    const page = read("app/tools/mortgage-payment-calculator/page.tsx").replace(/\s+/g, " ");
    const example = page.match(/On a (\d+)-year mortgage at (\d+(?:\.\d+)?)%, you don&apos;t cross the 50\/50 principal-to-interest line until about year (\d+)\./);
    expect(example, "the worked sentence changed shape: update this test with it").not.toBeNull();
    const [, termYears, ratePct, statedYear] = example!.map(Number);
    const r = ratePct! / 100 / 12;
    const n = termYears! * 12;
    const payment = (r * (1 + r) ** n) / ((1 + r) ** n - 1);
    let balance = 1;
    let crossover = 0;
    for (let month = 1; month <= n; month += 1) {
      const interest = balance * r;
      const principal = payment - interest;
      if (principal > interest) {
        crossover = month;
        break;
      }
      balance -= principal;
    }
    expect(crossover).toBe(242);
    expect(statedYear).toBe(Math.round(crossover / 12));
  });

  it("no calculator's structured data names a function the calculator does not have", () => {
    for (const tool of CALCULATOR_REGISTRY) {
      const page = read(`app/tools/${tool.slug}/page.tsx`);
      for (const claim of [
        /on any address/i,
        /across strategies/i,
        /Light, medium, heavy/i,
        /market averages/i,
        /market vacancy data/i,
        /amortization breakdown/i,
      ]) {
        expect(page, `${tool.slug}: ${claim}`).not.toMatch(claim);
      }
    }
  });

  it("the vacancy page cites its national figure, typed once, and states no unsourced national average", () => {
    const page = read("app/tools/vacancy-rate-calculator/page.tsx").replace(/\s+/g, " ");
    expect(page).not.toMatch(/National average[^.]*7-9%/i);
    // The rule, not the release: the figure, its quarter and its source live
    // in one constant, so the next Housing Vacancy Survey release is a change
    // in one place and the lede and the FAQ answer cannot drift apart.
    const constant = page.match(/const HVS_RENTAL_VACANCY = \{([^}]*)\} as const;/);
    expect(constant, "the sourced figure moved out of HVS_RENTAL_VACANCY: update this test with it").not.toBeNull();
    const fields = constant![1]!;
    expect(fields.match(/\d+(?:\.\d+)?%/g)).toHaveLength(1);
    expect(fields).toMatch(/rate: "\d+(?:\.\d+)?%"/);
    expect(fields).toMatch(/period: "the (?:first|second|third|fourth) quarter of \d{4}"/);
    expect(fields).toContain('href: "https://www.census.gov/housing/hvs/index.html"');
    // Outside the constant the sentence appears twice (FAQ answer, lede) and
    // both times reads the rate and the period from it; the link reads the href.
    const outside = page.replace(constant![0], "");
    expect(outside.match(/national rental vacancy rate at/g)).toHaveLength(2);
    expect(outside).toContain(
      "national rental vacancy rate at ${HVS_RENTAL_VACANCY.rate} in ${HVS_RENTAL_VACANCY.period}.",
    );
    // In JSX the space between the two expressions may be literal or {" "}.
    expect(outside).toMatch(
      /national rental vacancy rate at \{HVS_RENTAL_VACANCY\.rate\} in(?: |\{" "\} ?)\{HVS_RENTAL_VACANCY\.period\}\./,
    );
    expect(outside).toContain("href={HVS_RENTAL_VACANCY.href}");
    expect(outside).not.toContain("census.gov");
  });
});

describe("P1-36: the spreadsheet page describes the workbook it links", () => {
  const page = read("app/tools/rental-property-spreadsheet/page.tsx").replace(/\s+/g, " ");
  const sheet1 = strFromU8(
    unzipSync(new Uint8Array(readFileSync(join(ROOT, "public/downloads/truecap-rental-property-analyzer.xlsx"))))[
      "xl/worksheets/sheet1.xml"
    ]!,
  );
  const cell = (ref: string) => Number(sheet1.match(new RegExp(`<x:c r="${ref}"[^>]*>(?:(?!</x:c>)[\\s\\S])*?<x:v>([^<]*)</x:v>`))![1]);

  it("does not call the workbook's deal the analyzer's sample, and quotes the workbook's own inputs", () => {
    expect(page).not.toMatch(/same example deal/i);
    expect(page).toContain("ships with a worked example deal");
    expect(page).toContain(`$${cell("B6").toLocaleString("en-US")} single-family rental`);
    expect(page).toContain(`$${cell("B11").toLocaleString("en-US")}/mo rent`);
    expect(page).toContain(`${cell("B7")}% down at ${cell("B8")}%`);
    expect(page).toContain(`Property tax starts at ${cell("B12")}% of the price`);
  });

  it("does not present the Strong-to-Negative screening bands as Buy Box fit", () => {
    expect(page).not.toMatch(/Buy Box classifier/i);
    expect(page).not.toMatch(/bands TrueCap uses for Buy Box fit/i);
    expect(page).toContain("not your Buy Box fit");
  });
});

describe("voice: 'released' is not customer copy on the calculator pages", () => {
  it.each(CALCULATOR_REGISTRY.map((tool) => `app/tools/${tool.slug}/page.tsx`))("%s", (path) => {
    const source = withoutComments(read(path));
    expect(source).not.toMatch(/\b(?:un)?released\b/i);
    // The shared CTA's default supporting text still carries the word, so a
    // calculator page passes its own.
    expect(source).toMatch(/<ToolsConversionCta\b[^>]*\bhook=/);
  });
});

describe("P1-37: the feed credits TrueCap, not a team", () => {
  it("the channel description names no team", async () => {
    const xml = await (await getFeed()).text();
    const description = xml.match(/<channel>[\s\S]*?<description>([\s\S]*?)<\/description>/)![1]!;
    expect(description).not.toMatch(/\bteam\b/i);
    expect(description).toMatch(/from TrueCap\.$/);
  });
});
