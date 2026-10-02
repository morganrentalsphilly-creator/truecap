/**
 * F8 — data-first market and state pages (founder decision 2026-09-27:
 * "Reframe to data, e.g. '{City} Rental Market Data (2026)'. FMR is never
 * called 'average rent'. FAQ answers are data-only. State pitches become
 * sourced facts.").
 *
 * What this file pins, on the RENDERED pages (not the source):
 *   - title and H1 are "{City}, {ST} Rental Market Data ({HUD FY})", with the
 *     year taken from the page's HUD row;
 *   - no page, JSON-LD block, meta tag or llms.txt line calls HUD's FMR an
 *     average, typical, median or market rent;
 *   - the FAQPage JSON-LD is exactly the visible Q&A, and the loop's own
 *     validator (seo/scripts/jsonld-validate.ts) finds no invisible question;
 *   - a market FAQ is the HUD template first, then the page's
 *     content/seo/market-facts.json items verbatim, none quoting a HUD figure
 *     from another fiscal year, and the thin flag is its rule. The
 *     seo-market-enrich skill writes that file, so these hold for whatever it
 *     holds, and a synthetic dataset (vi.doMock) proves the fact-item and
 *     thin branches, never today's file contents. No test requires a fact
 *     answer to carry a number: the loader's forbidden-phrase list and critic
 *     rubric 14 hold fact answers to facts;
 *   - the 12 bespoke metros are indexable on HUD rows, listed in the sitemap
 *     and llms.txt, with the same framing, FAQ and sources block;
 *   - every state fact is sourced, and nothing unsourced renders;
 *   - a byline sits under every H1, and the sources box dates the data by its
 *     HUD vintage and retrieval day, never the build.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import MarketCityPage, { generateMetadata as generateMarketMetadata } from "@/app/markets/[city]/page";
import StatePage, { generateMetadata as generateStateMetadata } from "@/app/states/[slug]/page";
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import AtlantaPage, { metadata as atlantaMeta } from "@/app/markets/atlanta/page";
import CharlottePage, { metadata as charlotteMeta } from "@/app/markets/charlotte/page";
import ClevelandPage, { metadata as clevelandMeta } from "@/app/markets/cleveland/page";
import DallasPage, { metadata as dallasMeta } from "@/app/markets/dallas/page";
import DetroitPage, { metadata as detroitMeta } from "@/app/markets/detroit/page";
import HoustonPage, { metadata as houstonMeta } from "@/app/markets/houston/page";
import IndianapolisPage, { metadata as indianapolisMeta } from "@/app/markets/indianapolis/page";
import KansasCityPage, { metadata as kansasCityMeta } from "@/app/markets/kansas-city/page";
import MemphisPage, { metadata as memphisMeta } from "@/app/markets/memphis/page";
import PhiladelphiaPage, { metadata as philadelphiaMeta } from "@/app/markets/philadelphia/page";
import PhoenixPage, { metadata as phoenixMeta } from "@/app/markets/phoenix/page";
import TampaPage, { metadata as tampaMeta } from "@/app/markets/tampa/page";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { FMR_DEFINITION_CLAUSE, HUD_FMR_OVERVIEW_URL } from "@/lib/markets/data-copy";
import { HUD_FMR_AREAS } from "@/lib/markets/hud-fmr-areas";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { getStateHudCities } from "@/lib/markets/indexability";
import { buildMarketFaq, buildMarketPageData } from "@/lib/markets/market-page-data";
import { MARKET_FACTS_MAX_FAQ, marketFactsFor, parseMarketFacts, type MarketFaqFact } from "@/lib/seo/market-facts";
import { sourceUrlProblem } from "@/lib/seo/fact-source";
import { SAFMR_RENTS } from "@/lib/markets/safmr-rents";
import { STATES } from "@/lib/states";
import { lastmodFor } from "@/lib/seo/lastmod";
import { decodeEntities } from "../../seo/scripts/lib/html.ts";
import { validateHtml } from "../../seo/scripts/jsonld-validate.ts";

const ROOT = process.cwd();

const BESPOKE: Record<string, { page: () => ReactElement; metadata: { title?: unknown; robots?: unknown; alternates?: { canonical?: unknown } | null } }> = {
  atlanta: { page: () => <AtlantaPage />, metadata: atlantaMeta },
  charlotte: { page: () => <CharlottePage />, metadata: charlotteMeta },
  cleveland: { page: () => <ClevelandPage />, metadata: clevelandMeta },
  dallas: { page: () => <DallasPage />, metadata: dallasMeta },
  detroit: { page: () => <DetroitPage />, metadata: detroitMeta },
  houston: { page: () => <HoustonPage />, metadata: houstonMeta },
  indianapolis: { page: () => <IndianapolisPage />, metadata: indianapolisMeta },
  "kansas-city": { page: () => <KansasCityPage />, metadata: kansasCityMeta },
  memphis: { page: () => <MemphisPage />, metadata: memphisMeta },
  philadelphia: { page: () => <PhiladelphiaPage />, metadata: philadelphiaMeta },
  phoenix: { page: () => <PhoenixPage />, metadata: phoenixMeta },
  tampa: { page: () => <TampaPage />, metadata: tampaMeta },
};

async function renderCity(slug: string): Promise<string> {
  const bespoke = BESPOKE[slug];
  if (bespoke) return renderToStaticMarkup(bespoke.page());
  return renderToStaticMarkup(await MarketCityPage({ params: Promise.resolve({ city: slug }) }));
}

async function renderState(slug: string): Promise<string> {
  return renderToStaticMarkup(await StatePage({ params: Promise.resolve({ slug }) }));
}

const text = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

function h1Of(html: string): string {
  const all = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  expect(all).toHaveLength(1);
  return text(all[0]![1]!);
}

function ldBlocks(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as Record<string, unknown>,
  );
}

type QA = { q: string; a: string };

function faqLd(html: string): QA[] {
  const faqs = ldBlocks(html).filter((block) => block["@type"] === "FAQPage");
  expect(faqs).toHaveLength(1);
  return (faqs[0]!.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).map((q) => ({
    q: q.name,
    a: q.acceptedAnswer.text,
  }));
}

function visibleFaq(html: string): QA[] {
  return [...html.matchAll(/<div data-faq-item=""[^>]*><h3\b[^>]*>([\s\S]*?)<\/h3><p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({
    q: text(m[1]!),
    a: text(m[2]!),
  }));
}

/** HUD's Fair Market Rent called something it is not (docs/voice.md, FMR vocabulary). */
const FMR_MISNAMES = [/\b(?:average|typical|median)\s+(?:monthly\s+)?rents?\b/i, /(?<!\bfair\s)\bmarket\s+rents?\b/i];

/** FMR offered as the reader's rent rather than a labeled placeholder (docs/voice.md rule 10). */
const FMR_AS_THE_RENT = [/\bstarting rent\b/i, /\bFMR as rent\b/i];

const CITY_SAMPLE = ["columbus", "worcester", "anchorage", "fort-myers", "philadelphia", "houston"];
const STATE_SAMPLE = ["texas", "ohio", "iowa", "new-jersey"];
const ALL_MARKETS = [...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateCode: c.stateCode })), ...BESPOKE_MARKETS];

/**
 * How many HUD template items open /markets/<slug>'s FAQ (buildMarketFaq): the
 * FMR answer and the 12-month total always, the prior-year change when HUD's
 * area page has a prior year, and the ZIP spread when the page has SAFMR rows
 * and HUD's ZIP table. Read from the page's HUD inputs, never from its FAQ.
 */
function hudTemplateItems(slug: string): number {
  const market = ALL_MARKETS.find((m) => m.slug === slug)!;
  const { area, safmr } = buildMarketPageData({ slug, city: market.name, stateCode: market.stateCode });
  return 2 + (area?.prior ? 1 : 0) + (safmr && area?.safmrSourceUrl ? 1 : 0);
}

/** A fact item that names HUD's Fair Market Rent (FMR, FMRs, SAFMR, "Small Area Fair Market Rents"). */
const NAMES_FMR = /Fair Market Rents?\b|\b(?:SA)?FMRs?\b/i;
/** Every fiscal-year token in a string: FY2026, FY 2026, fiscal year 2026. */
const fiscalYears = (value: string) => [...value.matchAll(/\b(?:FY|fiscal\s+year)\s?(\d{4})\b/gi)].map((m) => Number(m[1]));

/**
 * The HUD vintage rule for content/seo/market-facts.json FAQ items
 * (seo-market-enrich step 5: a HUD figure only when it matches
 * HUD_RENTS[slug] for FY HUD_RENTS[slug].year, named with its vintage). An
 * item whose question or answer names HUD's Fair Market Rent names
 * FY{HUD_RENTS[slug].year} in its answer; an item that names FMR or HUD names
 * no other fiscal year, so a prior-year HUD figure cannot sit beside the
 * page's own. Items that name neither (a tax rate, a licensing rule, a Census
 * share) are not held to it. Returns one message per breach.
 */
function hudVintageProblems(slug: string, facts: readonly Pick<MarketFaqFact, "q" | "a">[]): string[] {
  const year = HUD_RENTS[slug]?.year;
  const problems: string[] = [];
  facts.forEach(({ q, a }, index) => {
    const at = `markets.${slug}.faq[${index}]`;
    const item = `${q} ${a}`;
    const namesFmr = NAMES_FMR.test(item);
    if (!namesFmr && !/\bHUD\b/.test(item)) return;
    if (year === undefined) {
      if (namesFmr) problems.push(`${at} names HUD's Fair Market Rent, but /markets/${slug} has no HUD_RENTS row`);
      return;
    }
    if (namesFmr && !fiscalYears(a).includes(year)) problems.push(`${at}.a names HUD's Fair Market Rent without FY${year}`);
    for (const other of new Set(fiscalYears(item).filter((fy) => fy !== year))) {
      problems.push(`${at} names FY${other} beside HUD; the page's HUD data is FY${year}`);
    }
  });
  return problems;
}

/**
 * The market FAQ contract for any legal content/seo/market-facts.json: the HUD
 * template first (every answer with a dollar figure and the HUD fiscal year,
 * the first with this page's own 2BR and 3BR FMR, the ZIP question on a SAFMR
 * page), then `facts` verbatim and in order and held to the HUD vintage rule
 * (hudVintageProblems); the visible FAQ equals the FAQPage JSON-LD, and
 * jsonld-validate finds nothing. A sourced tax-rate or licensing answer needs
 * no dollar figure and no FY, so only the template items are held to them.
 * No test requires a fact answer to carry a number: a licensing rule is a
 * fact without one (seo-market-enrich step 5). The loader's forbidden-phrase
 * list and critic rubric 14 keep fact answers to facts.
 */
function expectMarketFaq(html: string, slug: string, facts: readonly MarketFaqFact[]): void {
  const ld = faqLd(html);
  const template = hudTemplateItems(slug);
  expect(template, slug).toBeGreaterThanOrEqual(3);
  expect(facts.length, slug).toBeLessThanOrEqual(MARKET_FACTS_MAX_FAQ);
  expect(ld, slug).toHaveLength(template + facts.length);
  expect(visibleFaq(html)).toEqual(ld);
  expect(validateHtml(html, `/markets/${slug}`).filter((f) => f.type === "FAQPage")).toEqual([]);
  const hud = HUD_RENTS[slug]!;
  for (const { a } of ld.slice(0, template)) {
    expect(a).toMatch(/\$\d/);
    expect(a).toMatch(new RegExp(`FY${hud.year}`));
  }
  // The first answer is this page's own HUD figures.
  expect(ld[0]!.a).toContain(`$${hud.rent2br.toLocaleString("en-US")}`);
  expect(ld[0]!.a).toContain(`$${hud.rent3br.toLocaleString("en-US")}`);
  if (SAFMR_RENTS[slug]) expect(ld.slice(0, template).map((x) => x.q).join(" ")).toMatch(/vary by ZIP code/);
  // Then the page's sourced facts, worded exactly as the dataset words them,
  // with no HUD figure from another vintage.
  expect(ld.slice(template)).toEqual(facts.map(({ q, a }) => ({ q, a })));
  expect(hudVintageProblems(slug, ld.slice(template))).toEqual([]);
}

/**
 * Each visible FAQ item's source links, entity-decoded and in order. Every
 * item shows "Source:" with at least one link, and every link is one the fact
 * loaders accept (https, a primary-source host, no userinfo, port or tracking
 * parameter: lib/seo/fact-source.ts).
 */
function faqSourceHrefs(html: string): string[][] {
  const items = [...html.matchAll(/<div data-faq-item=""[\s\S]*?<\/div>/g)].map((m) => m[0]);
  expect(items.length).toBeGreaterThan(0);
  return items.map((item) => {
    expect(item).toMatch(/Source: /);
    const hrefs = [...item.matchAll(/href="([^"]+)"/g)].map((m) => decodeEntities(m[1]!));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(sourceUrlProblem(href), href).toBeNull();
    return hrefs;
  });
}

const HUDUSER = /^https:\/\/www\.huduser\.gov\//;

/**
 * Synthetic content/seo/market-facts.json entries for Worcester (a template
 * page with no SAFMR rows, so 3 HUD items), shaped as seo-market-enrich writes
 * them and valid for the loader. The answers carry a percent, no dollar
 * figure and no HUD fiscal year, sourced from a city .gov site and
 * www.census.gov. Test data only: none of it is a published fact.
 */
const FIXTURE_DAY = "2026-09-27";
const WORCESTER_CITY_GOV = "https://www.worcesterma.gov/finance/assessing";
const WORCESTER_HOUSING_GOV = "https://www.worcesterma.gov/inspectional-services/housing";
const WORCESTER_CENSUS = "https://www.census.gov/quickfacts/fact/table/worcestercitymassachusetts";
const WORCESTER_FULL_ENTRY = {
  countyEffectiveTaxRate: null,
  rentalLicensing: null,
  faq: [
    {
      q: "What is Worcester's residential property tax rate?",
      a: "Test fixture: the city's residential rate is 1.1% of assessed value.",
      sources: [{ url: WORCESTER_CITY_GOV, title: "Assessing", retrievedAt: FIXTURE_DAY }],
    },
    {
      q: "Does Worcester inspect rental units?",
      a: "Test fixture: the city inspects 100% of registered rental units.",
      sources: [{ url: WORCESTER_HOUSING_GOV, title: "Housing inspections", retrievedAt: FIXTURE_DAY }],
    },
    {
      q: "What share of Worcester homes are owner-occupied?",
      a: "Test fixture: 43.9% of housing units are owner-occupied.",
      sources: [{ url: WORCESTER_CENSUS, title: "QuickFacts: Worcester city, Massachusetts", retrievedAt: FIXTURE_DAY }],
    },
    {
      q: "What share of Worcester households rent?",
      a: "Test fixture: 56.1% of occupied units are renter-occupied.",
      sources: [
        { url: WORCESTER_CENSUS, title: "QuickFacts: Worcester city, Massachusetts", retrievedAt: FIXTURE_DAY },
        { url: WORCESTER_CITY_GOV, title: "Assessing", retrievedAt: FIXTURE_DAY },
      ],
    },
  ],
};
const WORCESTER_ONE_FACT_ENTRY = {
  countyEffectiveTaxRate: null,
  rentalLicensing: {
    required: true,
    summary: "Test fixture: the city registers every rental unit.",
    source: { url: WORCESTER_HOUSING_GOV, title: "Housing inspections", publisher: "City of Worcester", retrievedAt: FIXTURE_DAY },
  },
  faq: [],
};

/**
 * Both market templates, loaded fresh with `markets` in place of
 * content/seo/market-facts.json. Each describe that calls it unmocks and
 * resets the registry in afterEach (the pattern dscr-guide-consolidation
 * uses for lib/blog-posts).
 */
async function loadMarketPagesWith(markets: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("@/content/seo/market-facts.json", () => ({ default: { markets } }));
  const cityPage = await import("@/app/markets/[city]/page");
  const philadelphiaPage = await import("@/app/markets/philadelphia/page");
  return {
    renderCity: async (slug: string) => renderToStaticMarkup(await cityPage.default({ params: Promise.resolve({ city: slug }) })),
    renderPhiladelphia: () => renderToStaticMarkup(<philadelphiaPage.default />),
    cityMetadata: (slug: string) => cityPage.generateMetadata({ params: Promise.resolve({ city: slug }) }),
  };
}

const resetMarketFacts = () => {
  vi.doUnmock("@/content/seo/market-facts.json");
  vi.resetModules();
};

describe("F8 titles and H1s come from the HUD vintage", () => {
  it.each(CITY_SAMPLE)("/markets/%s: title and H1 are '{City}, {ST} Rental Market Data ({HUD FY})'", async (slug) => {
    const market = ALL_MARKETS.find((m) => m.slug === slug)!;
    const expected = `${market.name}, ${market.stateCode} Rental Market Data (${HUD_RENTS[slug]!.year})`;
    const metadata = BESPOKE[slug]
      ? BESPOKE[slug]!.metadata
      : await generateMarketMetadata({ params: Promise.resolve({ city: slug }) });
    expect(metadata.title).toBe(expected);
    const html = await renderCity(slug);
    expect(h1Of(html)).toBe(expected);
    expect(html).not.toMatch(/good place to buy|Good for Rental|a good state for rental/i);
  });

  it("types no year into the title builders and reads no clock", () => {
    for (const file of ["lib/markets/market-city-seo.ts", "lib/markets/market-page-data.ts"]) {
      const source = readFileSync(join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(source, file).not.toMatch(/\bnew Date\(|getFullYear|Date\.now|\b20\d\d\b/);
    }
  });
});

describe("F8 FMR vocabulary: never an average, typical, median or market rent", () => {
  it("holds on every market and state page, their metadata, and llms.txt", { timeout: 30_000 }, async () => {
    const offenders: string[] = [];
    const check = (where: string, value: string) => {
      for (const pattern of FMR_MISNAMES) {
        const hit = value.match(pattern);
        if (hit) offenders.push(`${where}: "${hit[0]}"`);
      }
    };
    for (const market of ALL_MARKETS) {
      check(`/markets/${market.slug}`, decodeEntities(await renderCity(market.slug)));
      const metadata = BESPOKE[market.slug]
        ? BESPOKE[market.slug]!.metadata
        : await generateMarketMetadata({ params: Promise.resolve({ city: market.slug }) });
      check(`/markets/${market.slug} metadata`, JSON.stringify(metadata));
    }
    for (const slug of Object.keys(STATES)) {
      check(`/states/${slug}`, decodeEntities(await renderState(slug)));
      check(`/states/${slug} metadata`, JSON.stringify(await generateStateMetadata({ params: Promise.resolve({ slug }) })));
    }
    // llms.txt's market and state sections (blog excerpts may say "below-market rent" about leases, not FMR).
    const llms = await (await getLlmsTxt()).text();
    const sections = llms.split(/^## /m).filter((part) => /^(?:State rental data guides|City rental market data)\n/.test(part));
    expect(sections).toHaveLength(2);
    check("llms.txt", sections.join("\n"));
    for (const file of ["content/seo/market-facts.json", "content/seo/state-facts.json"]) {
      check(file, readFileSync(join(ROOT, file), "utf8"));
    }
    expect(offenders).toEqual([]);
  });

  it("never offers FMR as the reader's rent, only as a labeled placeholder", { timeout: 30_000 }, async () => {
    const offenders: string[] = [];
    const pages = [
      ...ALL_MARKETS.map(async (market) => [`/markets/${market.slug}`, text(await renderCity(market.slug))] as const),
      ...Object.keys(STATES).map(async (slug) => [`/states/${slug}`, text(await renderState(slug))] as const),
    ];
    for (const [where, value] of await Promise.all(pages)) {
      for (const pattern of FMR_AS_THE_RENT) {
        const hit = value.match(pattern);
        if (hit) offenders.push(`${where}: "${hit[0]}"`);
      }
    }
    expect(offenders).toEqual([]);
    const columbus = text(await renderCity("columbus"));
    expect(columbus).toContain("3-bedroom FMR as a placeholder rent");
    expect(columbus).toContain("not what a specific unit rents for");
  });

  it("holds in the analyzer's customer-facing strings too (the pages' CTA lands there)", () => {
    // String literals only (comments stripped): any string that names HUD's
    // FMR must not call it an average, typical, median or market rent.
    const source = readFileSync(join(ROOT, "components/investcalc/investcalc-page.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    const literals = [...source.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
    const fmrStrings = literals.filter((literal) => /\bFMR\b|Fair Market Rent/.test(literal));
    expect(fmrStrings.length).toBeGreaterThan(0);
    const offenders = fmrStrings.filter((literal) => /\b(?:area|an?)\s+average\b|\b(?:average|typical|median)\s+rents?\b|(?<!\bfair\s)\bmarket\s+rents?\b/i.test(literal));
    expect(offenders).toEqual([]);
  });

  it("names it 'HUD Fair Market Rent (FY{YEAR})' and says what it is, citing HUD", async () => {
    const html = await renderCity("columbus");
    const year = HUD_RENTS.columbus!.year;
    expect(html).toContain(`HUD Fair Market Rent (FY${year})`);
    expect(decodeEntities(html)).toContain("40th-percentile gross rent for standard-quality rental units");
    expect(html).toContain('href="https://www.huduser.gov/portal/datasets/fmr.html"');
  });

  it("words FMR's voucher role as HUD does: used to determine payment standards, not set by HUD", async () => {
    // HUD's overview: FMRs "are used to determine payment standard amounts for
    // the Housing Choice Voucher program"; the housing agency adopts the
    // standards (24 CFR 982.503(a)(2)).
    expect(FMR_DEFINITION_CLAUSE).toContain("used to determine payment standard amounts for the Housing Choice Voucher program");
    expect(FMR_DEFINITION_CLAUSE).not.toMatch(/HUD uses|uses to set/i);
    expect(text(await renderState("ohio"))).toContain("used to determine payment standard amounts for the Housing Choice Voucher program");
  });
});

describe("F8 Small Area FMR areas: the page says when vouchers use ZIP-level figures instead", () => {
  const smallAreaUrl = (slug: string) => HUD_FMR_AREAS[slug]!.sourceUrl.replace("&dallas_sa_override=TRUE", "");

  it("records HUD's own statement for every area, from HUD's page without the override switch", () => {
    const required: string[] = [];
    for (const [slug, area] of Object.entries(HUD_FMR_AREAS)) {
      expect(["required", "majority-opted", null], slug).toContain(area.voucherSmallAreaFmr);
      expect(area.voucherSmallAreaFmrUrl, slug).toBe(area.voucherSmallAreaFmr ? smallAreaUrl(slug) : null);
      if (area.voucherSmallAreaFmr === "required") required.push(slug);
    }
    // HUD designates these areas (24 CFR 982.503(a)(1)(i)); the reviewer's
    // re-fetch of 2026-09-27 found the statement on these pages.
    for (const slug of ["columbus", "chicago", "fort-worth", "norfolk", "atlanta", "philadelphia", "dallas", "tampa", "st-louis"]) {
      expect(HUD_FMR_AREAS[slug]!.voucherSmallAreaFmr, slug).toBe("required");
    }
    expect(HUD_FMR_AREAS.houston!.voucherSmallAreaFmr).toBe("majority-opted");
    expect(required.length).toBeGreaterThanOrEqual(50);
  });

  it("builds the note for exactly the areas HUD's page names, on both render paths", () => {
    for (const market of ALL_MARKETS) {
      const data = buildMarketPageData({ slug: market.slug, city: market.name, stateCode: market.stateCode });
      const statement = data.area?.voucherSmallAreaFmr ?? null;
      expect(Boolean(data.voucherNote), market.slug).toBe(statement !== null);
      if (data.voucherNote) {
        expect(data.voucherNote.href, market.slug).toBe(smallAreaUrl(market.slug));
        expect(data.sources.map((source) => source.href), market.slug).toContain(smallAreaUrl(market.slug));
      }
    }
  });

  it.each([
    ["columbus", "all Housing Choice Voucher programs operated there will use ZIP-level Small Area FMRs instead of this area figure"],
    ["atlanta", "all Housing Choice Voucher programs operated there will use ZIP-level Small Area FMRs instead of this area figure"],
    ["houston", "a housing agency or agencies representing a majority of its Housing Choice Vouchers opted to use ZIP-level Small Area FMRs"],
  ])("/markets/%s renders HUD's statement with a link to HUD's page", async (slug, sentence) => {
    const html = await renderCity(slug);
    expect(text(html)).toContain(`HUD's page for the ${HUD_FMR_AREAS[slug]!.areaName} says ${sentence}`);
    expect(html).toContain(`data-market-voucher-note=""`);
    expect(html).toContain(`href="${smallAreaUrl(slug).replace(/&/g, "&amp;")}"`);
  });

  it("renders no voucher note where HUD's page makes no Small Area FMR statement", async () => {
    const slug = Object.keys(HUD_FMR_AREAS).find((key) => HUD_FMR_AREAS[key]!.voucherSmallAreaFmr === null && !BESPOKE[key])!;
    expect(slug).toBeDefined();
    expect(await renderCity(slug)).not.toContain("data-market-voucher-note");
  });
});

describe("F8 FAQ: visible, sourced, and mirrored exactly by FAQPage JSON-LD", () => {
  afterEach(resetMarketFacts);

  // Whatever content/seo/market-facts.json holds for the slug today.
  it.each(CITY_SAMPLE)("/markets/%s", async (slug) => {
    expectMarketFaq(await renderCity(slug), slug, marketFactsFor(slug)?.faq ?? []);
  });

  it("holds every market-facts FAQ item, sampled or not, to its page's HUD vintage", () => {
    // Every slug the loop has enriched, not only CITY_SAMPLE.
    for (const market of ALL_MARKETS) expect(hudVintageProblems(market.slug, marketFactsFor(market.slug)?.faq ?? []), market.slug).toEqual([]);
  });

  it("the HUD vintage rule fails a stale or unnamed HUD year and passes items that name no HUD figure", () => {
    const year = HUD_RENTS.worcester!.year;
    const stale = year - 1;
    const fmr = (a: string, q = "What is HUD's Fair Market Rent for a 1-bedroom unit in Worcester?") => [{ q, a }];
    // A prior-year HUD figure, in the answer or the question.
    expect(hudVintageProblems("worcester", fmr(`HUD's FY${stale} Fair Market Rent for a 1-bedroom unit was $1,234 a month.`))).toEqual([
      `markets.worcester.faq[0].a names HUD's Fair Market Rent without FY${year}`,
      `markets.worcester.faq[0] names FY${stale} beside HUD; the page's HUD data is FY${year}`,
    ]);
    expect(hudVintageProblems("worcester", fmr(`HUD's FY${year} FMR for a 1-bedroom unit is $1,234; in FY${stale} it was $1,190.`))).toEqual([
      `markets.worcester.faq[0] names FY${stale} beside HUD; the page's HUD data is FY${year}`,
    ]);
    expect(hudVintageProblems("worcester", fmr(`HUD's FY${year} figure is $1,234.`, `What was HUD's FY${stale} Fair Market Rent?`))).toHaveLength(1);
    expect(hudVintageProblems("worcester", [{ q: "What did HUD publish for a 1-bedroom unit?", a: `HUD's fiscal year ${stale} figure was $1,234.` }])).toHaveLength(1);
    // A Fair Market Rent with no vintage at all.
    expect(hudVintageProblems("worcester", fmr("HUD's Fair Market Rent for a 1-bedroom unit is $1,234 a month."))).toHaveLength(1);
    // The page's own vintage passes, and so do items that name no HUD figure
    // (the synthetic entry below, and a city fiscal-year tax rate).
    expect(hudVintageProblems("worcester", fmr(`HUD's FY${year} Fair Market Rent for a 1-bedroom unit is $1,234 a month.`))).toEqual([]);
    expect(hudVintageProblems("worcester", WORCESTER_FULL_ENTRY.faq)).toEqual([]);
    expect(hudVintageProblems("worcester", [{ q: "What is Worcester's residential tax rate?", a: `Test fixture: the FY${stale} residential rate is $14.87 per $1,000.` }])).toEqual([]);
  });

  it("/markets/worcester with a full synthetic entry: 3 HUD items, then 4 facts verbatim, each linking its own sources", { timeout: 30_000 }, async () => {
    const pages = await loadMarketPagesWith({ worcester: WORCESTER_FULL_ENTRY });
    const html = await pages.renderCity("worcester");
    const facts = parseMarketFacts({ markets: { worcester: WORCESTER_FULL_ENTRY } }).worcester!.faq;
    expect(facts).toHaveLength(MARKET_FACTS_MAX_FAQ);
    expect(hudTemplateItems("worcester")).toBe(3);
    expectMarketFaq(html, "worcester", facts);
    expect(faqLd(html)).toHaveLength(7);
    // The template cites HUD; each fact item cites exactly its entry's
    // sources, in order, on a city .gov host or census.gov.
    const hrefs = faqSourceHrefs(html);
    for (const item of hrefs.slice(0, 3)) for (const href of item) expect(href).toMatch(HUDUSER);
    expect(hrefs.slice(3)).toEqual(WORCESTER_FULL_ENTRY.faq.map((item) => item.sources.map((source) => source.url)));
  });

  it.each(STATE_SAMPLE)("/states/%s", async (slug) => {
    const html = await renderState(slug);
    const ld = faqLd(html);
    expect(ld).toHaveLength(4);
    expect(visibleFaq(html)).toEqual(ld);
    expect(validateHtml(html, `/states/${slug}`).filter((f) => f.type === "FAQPage")).toEqual([]);
    for (const { q, a } of ld) {
      expect(q).not.toMatch(/good (?:state|place|market)/i);
      expect(a).toMatch(/\$\d|\d%/);
    }
  });

  it.each(["connecticut", "texas", "ohio"])(
    "/states/%s: the HUD FAQ answer cites each city's own HUD area page, which shows its figures",
    async (slug) => {
      const html = await renderState(slug);
      const items = [...html.matchAll(/<div data-faq-item=""[\s\S]*?<\/div>/g)].map((m) => m[0]);
      const hudItem = items.find((item) => /What is HUD&#x27;s Fair Market Rent in/.test(item));
      expect(hudItem, slug).toBeDefined();
      const hrefs = [...hudItem!.matchAll(/href="([^"]+)"/g)].map((m) => decodeEntities(m[1]!));
      const cities = getStateHudCities(STATES[slug]!.name);
      expect(cities.length).toBeGreaterThan(0);
      for (const city of cities) expect(hrefs, city.slug).toContain(HUD_FMR_AREAS[city.slug]!.sourceUrl);
      // The overview page defines FMR but shows no area figure.
      expect(hrefs).not.toContain(HUD_FMR_OVERVIEW_URL);
    },
  );

  it("links a source under every visible answer", async () => {
    // City: each item links its own sources, in order. The HUD template items
    // cite huduser.gov; a market-facts item cites whatever primary source its
    // entry names (a county or city .gov site, census.gov).
    const columbus = ALL_MARKETS.find((m) => m.slug === "columbus")!;
    const city = faqSourceHrefs(await renderCity("columbus"));
    const { faq } = buildMarketPageData({ slug: columbus.slug, city: columbus.name, stateCode: columbus.stateCode });
    expect(city).toEqual(faq.map((item) => item.sources.map((source) => source.href)));
    for (const item of city.slice(0, hudTemplateItems("columbus"))) for (const href of item) expect(href).toMatch(HUDUSER);
    // State: facts come only from the owner's Census data, the HUD answer from HUD's area pages.
    for (const item of faqSourceHrefs(await renderState("ohio"))) {
      for (const href of item) expect(href).toMatch(/^https:\/\/(?:www\.huduser\.gov|data\.census\.gov)\//);
    }
  });
});

describe("F8 FAQ questions stay unique when market facts join the template", () => {
  const REF = { url: "https://www.huduser.gov/portal/datasets/fmr.html", title: "Fair Market Rents", retrievedAt: "2026-09-27" };

  it("refuses a market-facts question that repeats one of the page's HUD questions", () => {
    const facts = parseMarketFacts({
      markets: {
        columbus: {
          countyEffectiveTaxRate: null,
          rentalLicensing: null,
          // Lower case and no question mark: still a repeat. (Edge and doubled
          // spaces never reach the builder: the loader refuses them, naming the field.)
          faq: [{ q: "what is HUD's Fair Market Rent for Columbus, OH in FY2026", a: "HUD says $1,430.", sources: [REF] }],
        },
      },
    }).columbus!;
    const identity = { slug: "columbus", city: "Columbus", stateCode: "OH" };
    expect(() => buildMarketFaq(identity, HUD_RENTS.columbus!, HUD_FMR_AREAS.columbus!, null, facts)).toThrow(
      /markets\.columbus\.faq\[0\]\.q repeats a question/,
    );
    // A new question is fine.
    const fresh = parseMarketFacts({
      markets: { columbus: { countyEffectiveTaxRate: null, rentalLicensing: null, faq: [{ q: "What is Franklin County's tax rate?", a: "It is 1.2%.", sources: [REF] }] } },
    }).columbus!;
    expect(buildMarketFaq(identity, HUD_RENTS.columbus!, HUD_FMR_AREAS.columbus!, null, fresh).at(-1)?.question).toBe("What is Franklin County's tax rate?");
  });

  it("gives every market page a FAQ with no repeated question", () => {
    for (const market of ALL_MARKETS) {
      const { faq } = buildMarketPageData({ slug: market.slug, city: market.name, stateCode: market.stateCode });
      const questions = faq.map((item) => item.question.toLowerCase());
      expect(new Set(questions).size, market.slug).toBe(questions.length);
    }
  });
});

describe("F8 bespoke metros: indexable on HUD rows with the same framing", () => {
  it("lists all 162 market pages and 33 state pages in the sitemap, and no strategy page", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(paths.filter((p) => /^\/markets\/[^/]+$/.test(p))).toHaveLength(162);
    expect(paths.filter((p) => /^\/markets\/[^/]+\/[^/]+$/.test(p))).toHaveLength(0);
    expect(paths.filter((p) => /^\/states\/[^/]+$/.test(p))).toHaveLength(33);
  });

  it.each(Object.keys(BESPOKE))("/markets/%s", async (slug) => {
    const { metadata } = BESPOKE[slug]!;
    expect(HUD_RENTS[slug], slug).toBeDefined();
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(`/markets/${slug}`);
    expect(sitemap().map((entry) => entry.url)).toContain(`https://usetruecap.com/markets/${slug}`);
    expect(lastmodFor(`/markets/${slug}`)).toBeDefined();
    const llms = await (await getLlmsTxt()).text();
    expect(llms).toContain(`/markets/${slug})`);
    const html = await renderCity(slug);
    expect(html).toContain('data-faq=""');
    expect(html).toContain('data-sources-box=""');
    expect(html).toContain('data-market-fmr=""');
    expect(html).toMatch(/<a[^>]*href="\/about"/);
    // The analyzer link hands over the city as a hint, not as the address:
    // the field arrives empty with the placeholder "Street address in
    // <City, ST>", and a city alone is refused. The sentence beside the link
    // used to say "Start with <City, ST> in the address field."
    expect(html).not.toContain("in the address field");
    expect(html).toMatch(/Start with a street address in [A-Z][A-Za-z .]+, [A-Z]{2}\./);
  });
});

describe("F8 state facts: every fact sourced, nothing unsourced rendered", () => {
  it.each(Object.keys(STATES))("/states/%s", async (slug) => {
    const html = await renderState(slug);
    const facts = JSON.parse(readFileSync(join(ROOT, "content/seo/state-facts.json"), "utf8")).states[slug] as Record<
      string,
      { value: number; source: { url: string; retrievedAt: string } }
    >;
    expect(facts, slug).toBeDefined();
    for (const [key, fact] of Object.entries(facts)) {
      expect(new URL(fact.source.url).hostname, `${slug}.${key}`).toMatch(/(^|\.)census\.gov$/);
      expect(html, `${slug}.${key} source link`).toContain(`href="${fact.source.url.replace(/&/g, "&amp;")}"`);
    }
    expect(html).toContain(`$${facts.medianHomeValue!.value.toLocaleString("en-US")}`);
    expect(html).toContain(`$${facts.medianRealEstateTaxesPaid!.value.toLocaleString("en-US")}`);
    const state = STATES[slug]!;
    expect(html).not.toContain(state.pitch);
    expect(html).not.toContain(`${state.propertyTaxRatePct}% of value`);
    expect(html).not.toMatch(/landlord[- ]friendly|Landlord-leaning|Market tier/i);
  });
});

describe("F8 byline, sources box and dating line", () => {
  it("renders the byline right under the H1 on city, bespoke and state pages", async () => {
    for (const html of [await renderCity("columbus"), await renderCity("philadelphia"), await renderState("texas")]) {
      const afterH1 = html.slice(html.indexOf("</h1>"));
      expect(afterH1.slice(0, 600)).toMatch(/By\s*<a[^>]*href="\/about"[^>]*>TrueCap<\/a>/);
    }
  });

  it("dates the data by its HUD vintage and retrieval day, never the build", async () => {
    // HUD_RENTS rows fetched by the API on 2026-07-13 (git 543ea34); bespoke
    // rows copied from HUD's FY2026 documentation pages on 2026-09-27.
    expect(decodeEntities(await renderCity("columbus"))).toContain("Data as of HUD FY2026 (retrieved July 13, 2026).");
    expect(decodeEntities(await renderCity("philadelphia"))).toContain("Data as of HUD FY2026 (retrieved September 27, 2026).");
    expect(decodeEntities(await renderState("ohio"))).toMatch(/Data as of HUD FY2026 \(retrieved [^)]+\)\. Census figures: American Community Survey 2024 1-year estimates \(retrieved September 27, 2026\)\./);
  });

  it("links the page's own HUD area page in the sources box", async () => {
    const html = await renderCity("worcester");
    const box = html.slice(html.indexOf('data-sources-box=""'));
    expect(box).toContain("Worcester, MA HUD Metro FMR Area");
    expect(box).toMatch(/href="https:\/\/www\.huduser\.gov\/portal\/datasets\/fmr\/fmrs\/FY2026_code\/2026summary\.odn\?fips=2502782000/);
  });

  it("closes the box on what it shows (sources and retrieval dates), never on a reviewer or a team", { timeout: 60_000 }, async () => {
    // The box used to end "Reviewed by the TrueCap team." on all 195 data
    // pages: no reviewer, review or date stood behind it, and the site says
    // elsewhere that one person builds TrueCap. The closing line now claims
    // only that a sourced figure can be checked against a listed page. It does
    // not say the figures were retrieved from those pages on the listed dates:
    // 147 market pages' HUD rents came from the HUD FMR API on the day the
    // dating line gives, and the listed HUD page was read later
    // (markets-data-bar.test.ts holds the two to the same figures). Every
    // listed source still carries the day it was read.
    const pages: Array<[string, string]> = [];
    for (const market of ALL_MARKETS) pages.push([`/markets/${market.slug}`, await renderCity(market.slug)]);
    for (const slug of Object.keys(STATES)) pages.push([`/states/${slug}`, await renderState(slug)]);
    expect(pages).toHaveLength(195);
    for (const [path, html] of pages) {
      const start = html.indexOf('data-sources-box=""');
      expect(start, path).toBeGreaterThan(-1);
      const box = html.slice(html.indexOf(">", start) + 1, html.indexOf("</section>", start));
      const boxText = text(box);
      expect(boxText, path).not.toMatch(/reviewed by|\bteam\b/i);
      expect(boxText, path).not.toMatch(/retrieved on the dates shown/i);
      expect(boxText, path).toContain(
        "Figures with a source can be checked against the pages listed here. See our full methodology.",
      );
      expect(box, path).toMatch(/<a[^>]*href="\/methodology"/);
      const items = [...box.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]!));
      expect(items.length, path).toBeGreaterThan(0);
      for (const item of items) {
        expect(item, `${path}: a listed source without its retrieval date`).toMatch(/, retrieved [A-Z][a-z]+ \d{1,2}, \d{4}$/);
      }
    }
    // The whole page, not only the box: no data page credits a team.
    for (const [path, html] of pages) {
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
      expect(text(main), path).not.toMatch(/reviewed by the truecap team|the team behind truecap/i);
    }
  });
});

describe("F8 verify-locally copy: instructions, not unsourced claims", () => {
  it("asserts nothing about other cities, premiums or deals that no source on the page supports", async () => {
    for (const html of [await renderCity("columbus"), await renderCity("philadelphia"), await renderState("texas")]) {
      const body = text(html);
      expect(body).not.toMatch(/Many cities require|Premiums vary|decide whether a thin deal|assessment resets/i);
      expect(body).toMatch(/Check whether .* requires a rental license, registration, inspection, or certificate of occupancy/);
    }
  });
});

describe("F8 thin flag: a signal on <main>, never an index rule", () => {
  afterEach(resetMarketFacts);

  const flagOf = (html: string) => html.match(/<main id="main" data-market-data="([a-z]+)"/)?.[1];
  /** The rule from its raw inputs (lib/markets/thin.ts is what is under test): no SAFMR ZIP rows and no market-facts entry. */
  const expectedFlag = (slug: string, hasMarketFacts: boolean) =>
    (SAFMR_RENTS[slug]?.rows.length ?? 0) === 0 && !hasMarketFacts ? "thin" : "enriched";

  it("marks pages with no SAFMR rows and no market facts thin, on both render paths", async () => {
    // seo-market-enrich takes thin pages first, so whether a sampled page is
    // thin today is the dataset's business; the flag must follow the rule.
    for (const slug of CITY_SAMPLE) expect(flagOf(await renderCity(slug)), slug).toBe(expectedFlag(slug, marketFactsFor(slug) !== null));
    // Columbus has SAFMR rows (generated from HUD, not loop-writable), so no dataset makes it thin.
    expect(await renderCity("columbus")).toMatch(/<main id="main" data-market-data="enriched"/);
  });

  it("renders the thin branch from an empty dataset and flips it with one fact, never adding robots", { timeout: 30_000 }, async () => {
    // Worcester (the [city] template) and Philadelphia (a bespoke page) have no SAFMR rows.
    expect(expectedFlag("worcester", false)).toBe("thin");
    expect(expectedFlag("philadelphia", false)).toBe("thin");
    const empty = await loadMarketPagesWith({});
    expect(flagOf(await empty.renderCity("worcester"))).toBe("thin");
    expect(flagOf(empty.renderPhiladelphia())).toBe("thin");
    // Thin is never an index rule: every template page with a HUD row stays
    // indexable, thin or not (bespoke robots: the bespoke metros test above).
    let thin = 0;
    for (const market of MARKET_CITIES.filter((c) => HUD_RENTS[c.slug])) {
      if (expectedFlag(market.slug, false) === "thin") thin += 1;
      expect((await empty.cityMetadata(market.slug)).robots, market.slug).toBeUndefined();
    }
    expect(thin).toBeGreaterThan(0);

    const oneFact = await loadMarketPagesWith({ worcester: WORCESTER_ONE_FACT_ENTRY });
    expect(flagOf(await oneFact.renderCity("worcester"))).toBe("enriched");
    expect((await oneFact.cityMetadata("worcester")).robots).toBeUndefined();
  });
});
