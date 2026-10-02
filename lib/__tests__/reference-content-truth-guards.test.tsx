/**
 * Reference content says only what is true (go-to-market audit, 2026-10).
 *
 * Each block pins one statement the audit found false on the reference
 * surfaces (/methodology, /tools and its calculators, /glossary,
 * /states, the spreadsheet page, /llms.txt, /llms-full.txt, /feed.xml) against the thing it describes:
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
import GlossaryTermPage from "@/app/glossary/[slug]/page";
import { GET as getLlmsFull } from "@/app/llms-full.txt/route";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import MethodologyPage from "@/app/methodology/page";
import ToolsLandingPage from "@/app/tools/page";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import { EMPTY_BUY_BOX } from "@/lib/buy-box";
import { FEATURE_CATALOG, isFeatureReleased } from "@/lib/entitlements-catalog";
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
    // Anchor on the two h2 elements, not on the phrase: the lead box above
    // also says "The core formulas are published and versioned."
    const start = methodologyHtml.indexOf(">The core formulas</h2>");
    const end = methodologyHtml.indexOf(">Decision thresholds and Offer Ceiling</h2>");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const core = methodologyHtml.slice(start, end);
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
    // No data says what "most listing brochures" quote. The lede instead sets
    // a 5% assumption beside the sourced rate, which holds only while that
    // rate is above 5%.
    expect(page).not.toMatch(/most listing brochures/i);
    expect(outside).toContain("A pro forma that assumes 5% sits below that.");
    expect(Number.parseFloat(fields.match(/rate: "(\d+(?:\.\d+)?)%"/)![1]!)).toBeGreaterThan(5);
  });

  it("the vacancy page names no unsourced band or default, and the bands it names are the widget's", () => {
    const page = read("app/tools/vacancy-rate-calculator/page.tsx").replace(/\s+/g, " ");
    // Nothing on file says what sellers quote, what a property class or a
    // kind of town runs, or that 8% is the default to use (the analyzer's
    // own default is 5%).
    for (const claim of [
      /under-quote/i,
      /\bhonest/i,
      /8% as a default/i,
      /model 7-9%/i,
      /Class [ABC]\b/,
      /urban[- ]core/i,
      /tertiary markets/i,
      /always beats/i,
      /most brochures/i,
    ]) {
      expect(page, String(claim)).not.toMatch(claim);
    }
    // The analyzer's default is read from the schema, never typed here.
    expect(page).toContain(
      "TrueCap's analyzer starts at ${CURRENT_DEFAULT_FACTS.vacancy} vacancy as an editable default",
    );
    // The bands the FAQ names are the ones the widget grades with.
    const widget = read("components/tools/vacancy-rate-calculator-widget.tsx").replace(/\s+/g, " ");
    expect(widget).toContain(
      'result.vacancyPct < 5 ? "Aggressive (low)" : result.vacancyPct < 8 ? "Realistic" : result.vacancyPct < 12 ? "Conservative" : "Distressed"',
    );
    expect(page).toContain(
      'under 5% reads "Aggressive (low)", 5% to under 8% "Realistic", 8% to under 12% "Conservative", and 12% or more "Distressed"',
    );
  });

  it("the closing cost page does not promise every line item, and counts its own list", () => {
    const page = read("app/tools/closing-cost-calculator/page.tsx");
    // The widget totals eight cost fields; the page's own list names charges
    // it has no field for (points, settlement fee, prepaid interest).
    expect(page).not.toMatch(/every line item/i);
    const list = page.slice(page.indexOf("Closing costs fall into"), page.indexOf("</ul>", page.indexOf("Closing costs fall into")));
    const stated = list.match(/fall into (\w+) buckets/)![1]!;
    const buckets = list.match(/<li><strong>/g) ?? [];
    expect(["zero", "one", "two", "three", "four", "five", "six", "seven"][buckets.length]).toBe(stated);
  });

  it("llms-full.txt describes the vacancy calculator as the page does: graded bands, no denial of a benchmark", async () => {
    const full = await (await getLlmsFull()).text();
    const start = full.indexOf("/tools/vacancy-rate-calculator");
    expect(start).toBeGreaterThan(-1);
    const entry = full.slice(start, full.indexOf("###", start));
    // The page opens with a sourced national figure and its structured data
    // says the result is graded against fixed bands; this entry must not say
    // the opposite.
    expect(entry).not.toMatch(/does not supply/i);
    expect(entry).toContain("graded against fixed rule-of-thumb bands");
    expect(read("app/tools/vacancy-rate-calculator/page.tsx")).toContain(
      "Result graded against fixed rule-of-thumb vacancy bands",
    );
  });
});

describe("glossary: 'Where it shows up in TrueCap' says only what the analyzer does", () => {
  // The metric sentence is one string for 13 entries. It used to say the
  // analyzer computes the metric on every run, uses your targets for it in
  // Buy Box fit and the Offer Ceiling, and prints it in the memo and the PDF.
  // That was false for four entries and too broad for three more.
  const mainText = async (slug: string) =>
    text(mainOf(renderToStaticMarkup(await GlossaryTermPage({ params: Promise.resolve({ slug }) }))));
  const metricSlugs = Object.values(GLOSSARY)
    .filter((entry) => entry.category === "metric")
    .map((entry) => entry.slug);
  const termOf = (slug: string) => Object.values(GLOSSARY).find((entry) => entry.slug === slug)!.term;
  // IRR is shown only as a Buy Box rule once a minimum IRR target is set, and
  // the exact Offer Ceiling is paid after the first complete decision, so
  // neither is "shown in the results view on every run".
  const OWN_SENTENCE = ["irr", "max-allowable-offer"];

  it("reads all the metric entries", () => {
    expect(metricSlugs.length).toBeGreaterThanOrEqual(13);
    for (const slug of ["tax-savings", "after-tax-cash-flow", "operating-expense-ratio", "equity-multiple", "grm"]) {
      expect(metricSlugs).toContain(slug);
    }
  });

  it("renders no in-product block and no 'run the math' call on the tax entries while the tax view is unavailable", async () => {
    if (isFeatureReleased("tax_strategy")) return;
    for (const slug of ["tax-savings", "after-tax-cash-flow"]) {
      const page = await mainText(slug);
      // The entry itself says the module is not offered.
      expect(page, slug).toMatch(/does not currently expose/);
      expect(page, slug).not.toContain("shows up in TrueCap");
      expect(page, slug).not.toMatch(/computes this metric/i);
      expect(page, slug).not.toContain(`Ready to run the ${termOf(slug)} math`);
      expect(page, slug).toContain("Ready to run a real deal?");
    }
  });

  it("renders no in-product block for a metric the results view does not show", async () => {
    // Nothing computes an operating expense ratio; the equity multiple is
    // computed for Compare only.
    for (const slug of ["operating-expense-ratio", "equity-multiple"]) {
      const page = await mainText(slug);
      expect(page, slug).not.toContain("shows up in TrueCap");
      expect(page, slug).not.toMatch(/computes this metric/i);
      expect(page, slug).not.toContain(`Ready to run the ${termOf(slug)} math`);
    }
    const analyzerSource = ["lib/calc-analysis.ts", "components/investcalc/analysis-dashboard.tsx"].map(read).join("\n");
    expect(analyzerSource).not.toMatch(/operating[- ]expense[- ]ratio|\bOER\b|equityMultiple/i);
  });

  it("claims no target, memo or PDF use on any metric entry", { timeout: 30_000 }, async () => {
    let withBlock = 0;
    for (const slug of metricSlugs) {
      const page = await mainText(slug);
      const at = page.indexOf(`Where ${termOf(slug)} shows up in TrueCap`);
      if (at === -1) continue;
      withBlock += 1;
      const block = page.slice(at, at + 400);
      if (!OWN_SENTENCE.includes(slug)) expect(block, slug).toContain("computes this metric on every run");
      expect(block, slug).not.toMatch(/uses your targets for it|decision memo and the PDF/i);
    }
    expect(withBlock).toBe(metricSlugs.length - 4);
  });

  it("gives IRR and the Offer Ceiling their own sentence, not 'on every run ... in the results view'", async () => {
    for (const slug of OWN_SENTENCE) {
      const page = await mainText(slug);
      expect(page, slug).toContain(`Where ${termOf(slug)} shows up in TrueCap`);
      expect(page, slug).not.toMatch(/on every run/i);
      expect(page, slug).not.toMatch(/shows it in the results view/i);
    }
    expect(await mainText("irr")).toContain(
      "computes a 10-year pre-tax IRR from the assumptions you see and can edit, and checks it against your Buy Box when you set a minimum IRR target.",
    );
    expect(await mainText("max-allowable-offer")).toContain(
      "The Offer Ceiling is part of your first complete decision; after that the exact figure comes with Pro.",
    );
  });

  it("keeps the two sentences true to the code: IRR is a Buy Box rule only with a target, the Offer Ceiling is paid after the first decision", () => {
    expect(EMPTY_BUY_BOX.minIrrPct).toBeNull();
    expect(read("lib/buy-box.ts")).toMatch(/if \(criteria\.minIrrPct != null\) \{[\s\S]{0,400}label: "10-year pre-tax IRR"/);
    expect(FEATURE_CATALOG.mao.tiers).not.toContain("free");
    expect(FEATURE_CATALOG.mao.anonymousLimit).toBe("one exact deal");
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

  it("tells the reader to enter a tax rate, because the workbook's property tax input is a percent of price", () => {
    const label = sheet1.match(/<x:c r="A12"[^>]*><x:v>([^<]*)<\/x:v>/)![1]!;
    expect(label).toMatch(/Property tax \(% of price/);
    expect(page).toContain("replace with the rate from the parcel&apos;s actual bill (annual bill ÷ price, as a percent)");
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
    // Every calculator page mounts the shared CTA; its default supporting
    // text is held to the same rule in the next block, so a page may pass
    // its own text or take the default.
    expect(source).toMatch(/<ToolsConversionCta\b/);
  });
});

describe("voice: the retired calculator pages keep the same words out of their source", () => {
  // Ten /tools URLs only redirect today, but their page source is kept and
  // would render again if a calculator came back. The source is held to the
  // rules the live pages follow, so the old wording cannot return with it.
  const listed = new Set(CALCULATOR_REGISTRY.map((tool) => tool.slug));
  const retired = readdirSync(join(ROOT, "app/tools"))
    .filter((slug) => !listed.has(slug))
    .map((slug) => `app/tools/${slug}/page.tsx`)
    .filter((path) => {
      try {
        return statSync(join(ROOT, path)).isFile();
      } catch {
        return false;
      }
    });

  it("finds the retired pages", () => {
    expect(retired).toContain("app/tools/rental-cash-flow-calculator/page.tsx");
    expect(retired).toContain("app/tools/noi-calculator/page.tsx");
    expect(retired.length).toBeGreaterThanOrEqual(10);
  });

  it.each(retired)("%s", (path) => {
    const source = withoutComments(read(path));
    expect(source).not.toMatch(/\b(?:un)?released\b/i);
    // The Strong-to-Negative bands are screening bands, not the Buy Box.
    expect(source).not.toMatch(/Buy Box classifier/i);
  });
});

describe("voice: 'released' is not customer copy in the shared calculator blocks", () => {
  // The calculator pages mount these: the shared analyzer CTA (its default
  // supporting text) and the calculator widgets, whose link labels show on
  // /tools/arv-calculator, /tools/70-percent-rule-calculator and their embeds.
  const shared = ["components/marketing/tools-conversion-cta.tsx", ...filesUnder("components/tools")];

  it("reads the shared CTA and every calculator widget", () => {
    expect(shared).toContain("components/tools/arv-calculator-widget.tsx");
    expect(shared).toContain("components/tools/seventy-percent-rule-widget.tsx");
    expect(shared.length).toBeGreaterThan(10);
  });

  it.each(shared)("%s", (path) => {
    expect(withoutComments(read(path))).not.toMatch(/\b(?:un)?released\b/i);
  });
});

describe("P2-121: the page's one Disclaimer is not restated beside an element", () => {
  // docs/voice.md rule 3: SiteFooter renders the Disclaimer once per page
  // ("not tax, legal or investment advice"), and nothing else repeats it.
  it.each([
    "app/methodology/page.tsx",
    "app/vs/stessa/page.tsx",
    "components/marketing/lead-magnet-capture.tsx",
  ])("%s", (path) => {
    const source = withoutComments(read(path)).replace(/\s+/g, " ");
    expect(source).not.toMatch(/not (?:tax|legal|investment|financial|lending)[a-z, ]{0,40}advice/i);
    expect(source).not.toMatch(/does not replace property-level verification/i);
  });

  it("each of the three still renders the footer's Disclaimer, or sits on pages that do", () => {
    for (const page of ["app/methodology/page.tsx", "app/vs/stessa/page.tsx", "app/playbook/page.tsx"]) {
      expect(read(page), page).toContain("<SiteFooter");
    }
    expect(read("components/marketing/site-footer.tsx")).toContain("<Disclaimer");
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
