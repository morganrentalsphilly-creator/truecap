/**
 * Everything a /markets/<slug> page states, built once from data, for both
 * render paths: the programmatic app/markets/[city] template and the bespoke
 * SafeMarketPage. Keeping it in one pure builder is what keeps the two paths
 * from drifting (title, H1, lead, FAQ, sources, dating line, thin flag).
 *
 * Every number comes from HUD (hud-rents.ts, hud-fmr-areas.ts, safmr-rents.ts),
 * content/seo/market-facts.json, or TrueCap's sample underwrite. FAQ answers
 * are data only: this page's HUD and SAFMR figures, their area and vintage.
 */

import {
  HUD_FMR_OVERVIEW_RETRIEVED_AT,
  HUD_FMR_OVERVIEW_URL,
  buildHudDataAsOfLine,
  fmrLabel,
  signedPct,
  signedUsd,
  usd,
  type DataFaqItem,
  type SourceLink,
} from "@/lib/markets/data-copy";
import { HUD_FMR_AREAS, HUD_FMR_AREAS_RETRIEVED_AT, type HudFmrArea } from "@/lib/markets/hud-fmr-areas";
import type { HudRent } from "@/lib/markets/hud-rents";
import { getMarketHudRent } from "@/lib/markets/indexability";
import {
  buildMarketCityDescription,
  buildMarketCityH1,
  buildMarketCityTitle,
} from "@/lib/markets/market-city-seo";
import { SAFMR_RENTS, SAFMR_RENTS_RETRIEVED_AT, type CitySafmr } from "@/lib/markets/safmr-rents";
import { marketDataStatus, type MarketDataStatus } from "@/lib/markets/thin";
import { marketFactsFor, type MarketFacts } from "@/lib/seo/market-facts";

export type MarketPageIdentity = Readonly<{
  slug: string;
  /** Display city name, e.g. "Columbus". */
  city: string;
  stateCode: string;
}>;

export type MarketPageData = Readonly<{
  hud: HudRent | null;
  area: HudFmrArea | null;
  safmr: CitySafmr | null;
  facts: MarketFacts | null;
  /** HUD fiscal year of the page's figures, or null without a HUD row. */
  year: number | null;
  title: string;
  h1: string;
  description: string;
  /** The HUD sentence that opens the page, or null without a HUD row. */
  lead: string | null;
  /** "the Columbus, OH HUD Metro FMR Area, the HUD area that includes Franklin County, OH" */
  areaPhrase: string;
  faq: readonly DataFaqItem[];
  sources: readonly SourceLink[];
  /** "Data as of HUD FY2026 (retrieved July 13, 2026).", or null without a HUD row. */
  dataAsOf: string | null;
  status: MarketDataStatus;
}>;

function areaFor(slug: string, hud: HudRent | null): HudFmrArea | null {
  if (!hud || !Object.prototype.hasOwnProperty.call(HUD_FMR_AREAS, slug)) return null;
  const area = HUD_FMR_AREAS[slug]!;
  // Only an area record that shows this page's own figures may name them.
  return area.year === hud.year && area.rent2br === hud.rent2br && area.rent3br === hud.rent3br ? area : null;
}

function safmrFor(slug: string, hud: HudRent | null): CitySafmr | null {
  if (!hud || !Object.prototype.hasOwnProperty.call(SAFMR_RENTS, slug)) return null;
  const safmr = SAFMR_RENTS[slug]!;
  return safmr.rows.length > 0 ? safmr : null;
}

function changeClause(label: string, from: number, to: number, fromYear: number, toYear: number): string {
  const delta = to - from;
  if (delta === 0) return `the ${label} figure stayed at ${usd(to)} from FY${fromYear} to FY${toYear}`;
  return `the ${label} figure went from ${usd(from)} in FY${fromYear} to ${usd(to)} in FY${toYear} (${signedUsd(delta)}, ${signedPct(delta, from)})`;
}

/** The page's visible FAQ (the FAQPage JSON-LD mirrors it exactly). */
export function buildMarketFaq(
  identity: MarketPageIdentity,
  hud: HudRent | null,
  area: HudFmrArea | null,
  safmr: CitySafmr | null,
  facts: MarketFacts | null,
): DataFaqItem[] {
  const { city, stateCode } = identity;
  const items: DataFaqItem[] = [];
  if (hud) {
    const where = area ? `the ${area.areaName}` : `the county or metro area that contains ${city}`;
    const hudSource: SourceLink = area
      ? { label: `HUD FY${area.year} Fair Market Rent documentation: ${area.areaName}`, href: area.sourceUrl, retrievedAt: HUD_FMR_AREAS_RETRIEVED_AT }
      : { label: "HUD Fair Market Rents (huduser.gov)", href: HUD_FMR_OVERVIEW_URL, retrievedAt: HUD_FMR_OVERVIEW_RETRIEVED_AT };
    items.push({
      question: `What is HUD's Fair Market Rent for ${city}, ${stateCode} in FY${hud.year}?`,
      answer: `HUD's FY${hud.year} Fair Market Rent for ${where}${area ? `, the HUD area that includes ${area.countyName},` : ""} is ${usd(hud.rent2br)} a month for a 2-bedroom unit and ${usd(hud.rent3br)} for a 3-bedroom unit.`,
      sources: [hudSource],
    });
    if (area?.prior) {
      const p = area.prior;
      items.push({
        question: `How did ${city}'s HUD Fair Market Rent change from FY${p.year} to FY${hud.year}?`,
        answer: `For ${where}, ${changeClause("2-bedroom", p.rent2br, hud.rent2br, p.year, hud.year)}, and ${changeClause("3-bedroom", p.rent3br, hud.rent3br, p.year, hud.year)}.`,
        sources: [hudSource],
      });
    }
    if (safmr && area?.safmrSourceUrl) {
      const high = safmr.rows[0]!;
      const low = safmr.rows[safmr.rows.length - 1]!;
      items.push({
        question: `How much does HUD's Fair Market Rent vary by ZIP code around ${city}?`,
        answer: `HUD's FY${safmr.year} Small Area Fair Market Rents for the ${safmr.areaName} put a 2-bedroom unit between ${usd(low.rent2br)} a month (ZIP ${low.zip}) and ${usd(high.rent2br)} (ZIP ${high.zip}) across the area's ${safmr.zipCount} ZIP codes.`,
        sources: [
          {
            label: `HUD FY${safmr.year} Small Area Fair Market Rents by ZIP code: ${area.areaName}`,
            href: area.safmrSourceUrl,
            retrievedAt: SAFMR_RENTS_RETRIEVED_AT,
          },
        ],
      });
    }
    items.push({
      question: `What do 12 months of HUD Fair Market Rent come to in ${city}?`,
      answer: `At HUD's FY${hud.year} Fair Market Rent for ${where}, 12 months come to ${usd(hud.rent2br * 12)} for a 2-bedroom unit and ${usd(hud.rent3br * 12)} for a 3-bedroom unit.`,
      sources: [hudSource],
    });
  }
  for (const item of facts?.faq ?? []) {
    items.push({
      question: item.q,
      answer: item.a,
      sources: item.sources.map((source) => ({ label: source.title, href: source.url, retrievedAt: source.retrievedAt })),
    });
  }
  return items;
}

/** Every source the page cites, deduplicated by URL, in the order the page uses them. */
function buildMarketSources(area: HudFmrArea | null, safmr: CitySafmr | null, facts: MarketFacts | null, faq: readonly DataFaqItem[]): SourceLink[] {
  const list: SourceLink[] = [];
  if (area) {
    list.push({ label: `HUD FY${area.year} Fair Market Rent documentation: ${area.areaName}`, href: area.sourceUrl, retrievedAt: HUD_FMR_AREAS_RETRIEVED_AT });
    if (safmr && area.safmrSourceUrl) {
      list.push({ label: `HUD FY${safmr.year} Small Area Fair Market Rents by ZIP code: ${area.areaName}`, href: area.safmrSourceUrl, retrievedAt: SAFMR_RENTS_RETRIEVED_AT });
    }
  }
  list.push({ label: "HUD Fair Market Rents: definition and uses (huduser.gov)", href: HUD_FMR_OVERVIEW_URL, retrievedAt: HUD_FMR_OVERVIEW_RETRIEVED_AT });
  if (facts?.countyEffectiveTaxRate) {
    const s = facts.countyEffectiveTaxRate.source;
    list.push({ label: `${s.title} (${s.publisher})`, href: s.url, retrievedAt: s.retrievedAt });
  }
  if (facts?.rentalLicensing) {
    const s = facts.rentalLicensing.source;
    list.push({ label: `${s.title} (${s.publisher})`, href: s.url, retrievedAt: s.retrievedAt });
  }
  for (const item of faq) list.push(...item.sources);
  const seen = new Set<string>();
  return list.filter((source) => (seen.has(source.href) ? false : (seen.add(source.href), true)));
}

/** The whole data model of one market page. */
export function buildMarketPageData(identity: MarketPageIdentity): MarketPageData {
  const { slug, city, stateCode } = identity;
  const hud = getMarketHudRent(slug);
  const area = areaFor(slug, hud);
  const safmr = safmrFor(slug, hud);
  const facts = marketFactsFor(slug);
  const year = hud?.year ?? null;
  const areaPhrase = area
    ? `the ${area.areaName}, the HUD area that includes ${area.countyName}`
    : `the county or metro area that contains ${city}`;
  const faq = buildMarketFaq(identity, hud, area, safmr, facts);
  return Object.freeze({
    hud,
    area,
    safmr,
    facts,
    year,
    title: buildMarketCityTitle(city, stateCode, year),
    h1: buildMarketCityH1(city, stateCode, year),
    description: buildMarketCityDescription(city, stateCode, hud),
    lead: hud
      ? `${fmrLabel(hud.year)} for ${areaPhrase}: ${usd(hud.rent2br)} a month for a 2-bedroom unit and ${usd(hud.rent3br)} for a 3-bedroom unit.`
      : null,
    areaPhrase,
    faq,
    sources: buildMarketSources(area, safmr, facts, faq),
    dataAsOf: hud ? buildHudDataAsOfLine(hud.year, [hud.retrievedAt]) : null,
    status: marketDataStatus(slug),
  });
}

