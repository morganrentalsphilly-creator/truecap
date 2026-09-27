/**
 * F8 owner loaders for content/seo/market-facts.json and
 * content/seo/state-facts.json. Each validates at import and throws on a
 * malformed or unsourced fact, so a bad dataset fails `next build` instead of
 * publishing. The seo-market-enrich skill writes market-facts.json later, so
 * the committed file is held to its contract, never to its current contents.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketLocalData } from "@/components/marketing/safe-market-page";
import { buildMarketFaq } from "@/lib/markets/market-page-data";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { isMarketDataThin, marketDataSignals, marketDataStatus } from "@/lib/markets/thin";
import { MARKET_FACTS, marketFactsFor, parseMarketFacts } from "@/lib/seo/market-facts";
import { STATE_FACTS, STATE_FACT_KEYS, parseStateFacts, stateFactsFor } from "@/lib/seo/state-facts";
import { STATES } from "@/lib/states";

const SOURCE = {
  url: "https://www.huduser.gov/portal/datasets/fmr.html",
  title: "Fair Market Rents",
  publisher: "HUD",
  retrievedAt: "2026-09-27",
};
const REF = { url: SOURCE.url, title: SOURCE.title, retrievedAt: SOURCE.retrievedAt };

const goodEntry = () => ({
  countyEffectiveTaxRate: { value: 1.23, unit: "percent", county: "Franklin County", year: 2025, source: { ...SOURCE, url: "https://www.census.gov/programs-surveys/acs" } },
  rentalLicensing: { required: true, summary: "The city requires a rental registration for every rental unit.", source: { ...SOURCE } },
  faq: [{ q: "What is the FY2026 Fair Market Rent here?", a: "HUD's FY2026 Fair Market Rent is $1,430 for a 2-bedroom unit.", sources: [{ ...REF }] }],
});
const market = (entry: unknown, slug = "columbus") => ({ markets: { [slug]: entry } });

describe("lib/seo/market-facts: parseMarketFacts", () => {
  it("accepts the committed file and a well-formed entry", () => {
    expect(typeof MARKET_FACTS).toBe("object");
    const parsed = parseMarketFacts(market(goodEntry()));
    expect(parsed.columbus?.countyEffectiveTaxRate?.value).toBe(1.23);
    expect(parsed.columbus?.faq).toHaveLength(1);
    expect(Object.isFrozen(parsed)).toBe(true);
    // An entry with one fact and no FAQ, or an FAQ and no facts, is fine.
    expect(() => parseMarketFacts(market({ ...goodEntry(), countyEffectiveTaxRate: null, rentalLicensing: null }))).not.toThrow();
    expect(() => parseMarketFacts(market({ ...goodEntry(), faq: [] }))).not.toThrow();
    // Bespoke metros render market facts too.
    expect(() => parseMarketFacts(market(goodEntry(), "philadelphia"))).not.toThrow();
    // "Fair Market Rent" itself is the right name.
    expect(() => parseMarketFacts(market({ ...goodEntry(), faq: [{ q: "What is HUD's Small Area Fair Market Rent?", a: "HUD's FY2026 Small Area Fair Market Rents run $1,070 to $2,150.", sources: [{ ...REF }] }] }))).not.toThrow();
  });

  const bad: Array<[string, unknown, RegExp]> = [
    ["a root without markets", {}, /exactly markets/],
    ["an extra root key", { markets: {}, _readme: "x" }, /exactly markets/],
    ["an unknown slug", market(goodEntry(), "not-a-city"), /no \/markets\/not-a-city page/],
    ["a slug that is not a slug", market(goodEntry(), "Columbus OH"), /not a market slug/],
    ["an entry with no fact at all", market({ countyEffectiveTaxRate: null, rentalLicensing: null, faq: [] }), /has no fact/],
    ["a missing field", market({ countyEffectiveTaxRate: null, faq: [] }), /exactly/],
    ["a fact with no source", market({ ...goodEntry(), countyEffectiveTaxRate: { value: 1.2, unit: "percent", county: "X County", year: 2025 } }), /exactly/],
    ["an http source", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, source: { ...SOURCE, url: "http://www.huduser.gov/x" } } }), /not https/],
    ["a non-primary source (Tax Foundation)", market({ ...goodEntry(), countyEffectiveTaxRate: { ...goodEntry().countyEffectiveTaxRate, source: { ...SOURCE, url: "https://taxfoundation.org/data/all/state/property-taxes-by-state-county/" } } }), /not a primary-source domain/],
    ["a blog or news source", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, sources: [{ ...REF, url: "https://www.zillow.com/research/" }] }] }), /not a primary-source domain/],
    ["a tracking parameter", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, source: { ...SOURCE, url: "https://www.huduser.gov/x?utm_source=bot" } } }), /tracking parameter/],
    ["a userinfo URL", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, source: { ...SOURCE, url: "https://evil@www.huduser.gov/x" } } }), /userinfo/],
    ["a bad retrieval date", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, source: { ...SOURCE, retrievedAt: "2026-9-1" } } }), /YYYY-MM-DD/],
    ["an impossible retrieval date", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, sources: [{ ...REF, retrievedAt: "2026-02-30" }] }] }), /YYYY-MM-DD/],
    ["a tax rate out of range", market({ ...goodEntry(), countyEffectiveTaxRate: { ...goodEntry().countyEffectiveTaxRate, value: 12 } }), /percent between 0 and 10/],
    ["a missing value", market({ ...goodEntry(), countyEffectiveTaxRate: { ...goodEntry().countyEffectiveTaxRate, value: "1.2" } }), /percent between 0 and 10/],
    ["a non-boolean licensing flag", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, required: "yes" } }), /true or false/],
    ["markup in a summary", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, summary: "Registration is <b>required</b>." } }), /markup/],
    ["FMR called average rent", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, a: "The average rent is $1,430 per HUD." }] }), /forbidden phrase/],
    ["FMR called market rent", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, a: "HUD's market rent is $1,430." }] }), /forbidden phrase/],
    ["an investment verdict", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, a: "Columbus is a good investment at $1,430." }] }), /forbidden phrase/],
    ["landlord-friendly marketing", market({ ...goodEntry(), rentalLicensing: { ...goodEntry().rentalLicensing, summary: "A landlord-friendly city with no registration." } }), /forbidden phrase/],
    ["a guarantee", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, a: "Rent of $1,430 is guaranteed." }] }), /forbidden phrase/],
    ["a publisher key on a sources[] item", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, sources: [{ ...REF, publisher: "HUD" }] }] }), /exactly retrievedAt, title, url/],
    ["an FAQ item without sources", market({ ...goodEntry(), faq: [{ ...goodEntry().faq[0]!, sources: [] }] }), /at least one source/],
    ["more than four FAQ items", market({ ...goodEntry(), faq: [1, 2, 3, 4, 5].map((n) => ({ ...goodEntry().faq[0]!, q: `Question ${n}?` })) }), /at most 4/],
    ["a repeated question", market({ ...goodEntry(), faq: [goodEntry().faq[0]!, goodEntry().faq[0]!] }), /repeats/],
  ];

  it.each(bad)("rejects %s", (_label, value, message) => {
    expect(() => parseMarketFacts(value)).toThrow(message);
  });
});

const censusFact = (value: number, table = "B25077") => ({
  value,
  year: 2024,
  source: { url: `https://data.census.gov/table/ACSDT1Y2024.${table}?g=040XX00US39`, title: `table ${table}`, publisher: "U.S. Census Bureau", retrievedAt: "2026-09-27" },
});
const goodState = () => ({
  medianHomeValue: censusFact(239800),
  medianRealEstateTaxesPaid: censusFact(2937, "B25103"),
  occupiedHousingUnits: censusFact(4929322, "B25003"),
  renterOccupiedUnits: censusFact(1577508, "B25003"),
});

describe("lib/seo/state-facts: parseStateFacts", () => {
  it("sources every fact of every state page in the committed file", () => {
    expect(Object.keys(STATE_FACTS).sort()).toEqual(Object.keys(STATES).sort());
    for (const [slug, facts] of Object.entries(STATE_FACTS)) {
      for (const key of STATE_FACT_KEYS) {
        const fact = facts[key];
        expect(fact.value, `${slug}.${key}`).toBeGreaterThan(0);
        expect(new URL(fact.source.url).hostname, `${slug}.${key}`).toBe("data.census.gov");
        expect(fact.source.publisher).toBe("U.S. Census Bureau");
        expect(fact.source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(facts.renterOccupiedUnits.value).toBeLessThanOrEqual(facts.occupiedHousingUnits.value);
    }
    expect(stateFactsFor("ohio")?.medianHomeValue.value).toBe(239800);
    expect(stateFactsFor("not-a-state")).toBeNull();
  });

  it("accepts a well-formed state", () => {
    expect(parseStateFacts({ states: { ohio: goodState() } }).ohio?.medianRealEstateTaxesPaid.value).toBe(2937);
  });

  const bad: Array<[string, unknown, RegExp]> = [
    ["a root without states", { ohio: goodState() }, /exactly states/],
    ["an unknown state", { states: { atlantis: goodState() } }, /no \/states\/atlantis page/],
    ["a missing fact", { states: { ohio: (({ medianHomeValue: _dropped, ...rest }) => rest)(goodState()) } }, /exactly/],
    ["a fact that is not an object", { states: { ohio: { ...goodState(), medianHomeValue: 239800 } } }, /must be an object/],
    ["an unsourced fact", { states: { ohio: { ...goodState(), medianHomeValue: { value: 1, year: 2024 } } } }, /exactly/],
    ["a non-integer value", { states: { ohio: { ...goodState(), medianHomeValue: censusFact(1.5) } } }, /positive integer/],
    ["more renters than homes", { states: { ohio: { ...goodState(), renterOccupiedUnits: censusFact(9_999_999, "B25003") } } }, /exceeds/],
    ["a Tax Foundation source", { states: { ohio: { ...goodState(), medianRealEstateTaxesPaid: { ...censusFact(2937), source: { ...censusFact(2937).source, url: "https://taxfoundation.org/x" } } } } }, /not a primary-source domain/],
    ["an unlisted state host", { states: { ohio: { ...goodState(), medianRealEstateTaxesPaid: { ...censusFact(2937), source: { ...censusFact(2937).source, url: "https://tax.ohio.gov/x" } } } } }, /not a primary-source domain/],
    ["a verdict in a source title", { states: { ohio: { ...goodState(), medianHomeValue: { ...censusFact(239800), source: { ...censusFact(239800).source, title: "Why Ohio is a strong market" } } } } }, /forbidden phrase/],
  ];

  it.each(bad)("rejects %s", (_label, value, message) => {
    expect(() => parseStateFacts(value)).toThrow(message);
  });
});

describe("lib/markets/thin: the market-data thin flag", () => {
  it("is thin only with no SAFMR rows and no market facts", () => {
    expect(isMarketDataThin({ safmrRows: 0, hasMarketFacts: false })).toBe(true);
    expect(isMarketDataThin({ safmrRows: 12, hasMarketFacts: false })).toBe(false);
    expect(isMarketDataThin({ safmrRows: 0, hasMarketFacts: true })).toBe(false);
    expect(marketDataSignals("columbus").safmrRows).toBeGreaterThan(0);
    expect(marketDataStatus("columbus")).toBe(marketFactsFor("columbus") || marketDataSignals("columbus").safmrRows ? "enriched" : "thin");
    expect(marketDataStatus("worcester")).toBe(marketFactsFor("worcester") ? "enriched" : "thin");
  });
});

describe("market facts render only when they exist, and their FAQ joins the page FAQ", () => {
  const facts = parseMarketFacts(market(goodEntry())).columbus!;

  it("renders nothing without facts", () => {
    expect(renderToStaticMarkup(<MarketLocalData city="Columbus" facts={null} />)).toBe("");
    expect(renderToStaticMarkup(<MarketLocalData city="Columbus" facts={{ countyEffectiveTaxRate: null, rentalLicensing: null, faq: facts.faq }} />)).toBe("");
  });

  it("renders each fact with its value, year and linked source", () => {
    const html = renderToStaticMarkup(<MarketLocalData city="Columbus" facts={facts} />);
    expect(html).toContain('data-market-local-data=""');
    expect(html).toContain("Franklin County effective property tax rate");
    expect(html).toContain("1.23% (tax year 2025)");
    expect(html).toContain('href="https://www.census.gov/programs-surveys/acs"');
    expect(html).toContain("Required.");
    expect(html).toContain("retrieved September 27, 2026");
  });

  it("appends the sourced FAQ items after the HUD answers", () => {
    const hud = HUD_RENTS.columbus!;
    const items = buildMarketFaq({ slug: "columbus", city: "Columbus", stateCode: "OH" }, hud, null, null, facts);
    expect(items.at(-1)).toEqual({
      question: facts.faq[0]!.q,
      answer: facts.faq[0]!.a,
      sources: [{ label: REF.title, href: REF.url, retrievedAt: REF.retrievedAt }],
    });
  });
});
