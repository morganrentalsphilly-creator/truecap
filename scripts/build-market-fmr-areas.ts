/**
 * build-market-fmr-areas — records the HUD Fair Market Rent AREA behind every
 * market page's HUD figures and writes lib/markets/hud-fmr-areas.ts.
 *
 * Source: HUD's public FY<year> Fair Market Rent Documentation System on
 * huduser.gov (no API key). For each slug with a CITY_GEO county:
 *   1. the documentation system's state page lists every county (New England:
 *      every town) with HUD's code for it;
 *   2. the county's summary page names the FMR area it belongs to and shows
 *      that area's FY<year> and FY<year-1> FMRs by bedroom count. The URL
 *      carries HUD's `dallas_sa_override=TRUE` switch, which shows the area
 *      figures even where vouchers use ZIP-level Small Area FMRs;
 *   3. for a slug with ZIP rows in lib/markets/safmr-rents.ts, the same page
 *      without the switch shows HUD's "Small Area FMRs By Unit Bedrooms" table.
 *      Every sampled ZIP row must match it exactly before the SAFMR URL is
 *      recorded.
 *
 * HUD defines New England FMR areas by town, so CT, MA, ME, NH, RI and VT
 * cities are matched on their own town name, never on their county.
 *
 * lib/__tests__/markets-data-bar.test.ts holds this file and
 * lib/markets/hud-rents.ts (the HUD API, scripts/build-market-rents.ts) to the
 * same fiscal year and the same 2- and 3-bedroom figures, so refreshing one
 * without the other fails CI.
 *
 * Usage (package.json is hash-pinned, so there is no npm alias):
 *   node scripts/build-market-fmr-areas.ts --dry-run   # plan only, no fetches
 *   node scripts/build-market-fmr-areas.ts             # fetch + write
 *   node scripts/build-market-fmr-areas.ts --year 2027 # a newer fiscal year
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { BESPOKE_MARKETS, MARKET_CITIES } from "../lib/markets/cities.ts";
import { CITY_GEO } from "../lib/markets/city-geo.ts";
import { HUD_RENTS } from "../lib/markets/hud-rents.ts";
import { SAFMR_RENTS } from "../lib/markets/safmr-rents.ts";

const DRY = process.argv.includes("--dry-run");
const OUT_FILE = path.join(process.cwd(), "lib", "markets", "hud-fmr-areas.ts");
// HUD's firewall answers a bare or non-browser agent with an empty 202; the
// "compatible" form identifies this script honestly and is served.
const USER_AGENT = "Mozilla/5.0 (compatible; TrueCap-data-refresh/1.0; +https://usetruecap.com)";
const NEW_ENGLAND = new Set(["CT", "MA", "ME", "NH", "RI", "VT"]);
const STATE_FIPS: Record<string, number> = {
  AL: 1, AK: 2, AZ: 4, AR: 5, CA: 6, CO: 8, CT: 9, DE: 10, DC: 11, FL: 12, GA: 13, HI: 15, ID: 16,
  IL: 17, IN: 18, IA: 19, KS: 20, KY: 21, LA: 22, ME: 23, MD: 24, MA: 25, MI: 26, MN: 27, MS: 28,
  MO: 29, MT: 30, NE: 31, NV: 32, NH: 33, NJ: 34, NM: 35, NY: 36, NC: 37, ND: 38, OH: 39, OK: 40,
  OR: 41, PA: 42, RI: 44, SC: 45, SD: 46, TN: 47, TX: 48, UT: 49, VT: 50, VA: 51, WA: 53, WV: 54,
  WI: 55, WY: 56,
};

function flagValue(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

/** The one fiscal year HUD_RENTS carries, unless --year overrides it. */
function fiscalYear(): number {
  const flag = flagValue("year");
  if (flag) return Number(flag);
  const years = new Set(Object.values(HUD_RENTS).map((row) => row.year));
  if (years.size !== 1) throw new Error(`HUD_RENTS mixes fiscal years (${[...years].join(", ")}); pass --year`);
  return [...years][0]!;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url: string, body?: string): Promise<string> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
    });
    const text = res.status === 200 ? new TextDecoder("latin1").decode(await res.arrayBuffer()) : "";
    if (text.length > 1000) return text;
    await sleep(1500 * attempt);
  }
  throw new Error(`no usable answer from ${url}`);
}

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

type CountyOption = { code: string; label: string };

function countyOptions(stateHtml: string): CountyOption[] {
  const start = stateHtml.indexOf('id="countyselect"');
  if (start < 0) return [];
  const block = stateHtml.slice(start, stateHtml.indexOf("</SELECT>", start));
  return [...block.matchAll(/<OPTION value="(\d+)">([^<]*)<\/OPTION>/g)].map((m) => ({
    code: m[1]!,
    label: textOf(m[2]!),
  }));
}

function pickOption(options: CountyOption[], city: string, stateCode: string, county: string): CountyOption | null {
  const bare = (label: string) => label.replace(/,\s*[A-Z]{2}$/, "").toLowerCase();
  if (NEW_ENGLAND.has(stateCode)) {
    const town = options.filter((o) => new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:town|city) \\(`, "i").test(o.label));
    if (town.length === 1) return town[0]!;
  }
  const c = county.toLowerCase();
  const wanted = new Set([`${c} county`, `${c} parish`, `${c} borough`, `${c} municipality`, c]);
  const hits = options.filter((o) => wanted.has(bare(o.label)));
  return hits.length === 1 ? hits[0]! : null;
}

type Fmr = { rent2br: number; rent3br: number };

function fmrRow(text: string, year: number): Fmr | null {
  const m = new RegExp(`FY ${year} FMR \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+)`).exec(text);
  if (!m) return null;
  const num = (s: string) => Number(s.replace(/,/g, ""));
  return { rent2br: num(m[3]!), rent3br: num(m[4]!) };
}

type AreaRecord = {
  areaName: string;
  countyName: string;
  sourceUrl: string;
  year: number;
  rent2br: number;
  rent3br: number;
  prior: { year: number; rent2br: number; rent3br: number } | null;
  safmrSourceUrl: string | null;
};

async function main() {
  const year = fiscalYear();
  const base = `https://www.huduser.gov/portal/datasets/fmr/fmrs/FY${year}_code/`;
  const planned = [
    ...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateCode: c.stateCode })),
    ...BESPOKE_MARKETS.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })),
  ].filter((c) => CITY_GEO[c.slug]);
  console.log(`FMR areas · FY${year} · ${DRY ? "DRY RUN" : "LIVE"} · ${planned.length} market pages with a county`);
  if (DRY) return;

  const states = new Map<string, CountyOption[]>();
  const areas: Record<string, AreaRecord> = {};
  const missed: string[] = [];

  for (const c of planned) {
    try {
      if (!states.has(c.stateCode)) {
        const fips = STATE_FIPS[c.stateCode];
        if (!fips) throw new Error(`no FIPS code for ${c.stateCode}`);
        const form = `STATES=${fips}.0&data=${year}&fmrtype=Final&statelist=${fips}.0&year=${year}&selection_type=county`;
        states.set(c.stateCode, countyOptions(await fetchText(`${base}select_Geography.odn`, form)));
        await sleep(400);
      }
      const county = CITY_GEO[c.slug]!.county;
      const option = pickOption(states.get(c.stateCode) ?? [], c.name, c.stateCode, county);
      if (!option) throw new Error(`"${county}" (${c.name}) not found in HUD's ${c.stateCode} list`);
      const sourceUrl = `${base}${year}summary.odn?fips=${option.code}&year=${year}&fmrtype=Final&selection_type=county&dallas_sa_override=TRUE`;
      const html = await fetchText(sourceUrl);
      await sleep(400);
      const text = textOf(html);
      const title = /<TITLE>([\s\S]*?)<\/TITLE>/i.exec(html)?.[1] ?? "";
      const areaName = /Calculation for (.+)$/.exec(textOf(title))?.[1]?.trim();
      const current = fmrRow(text, year);
      if (!areaName || !current) throw new Error("page has no area name or FY row");
      const priorRow = fmrRow(text, year - 1);
      let safmrSourceUrl: string | null = null;
      const safmr = SAFMR_RENTS[c.slug];
      if (safmr && safmr.year === year) {
        const zipUrl = sourceUrl.replace("&dallas_sa_override=TRUE", "");
        const zipText = textOf(await fetchText(zipUrl));
        await sleep(400);
        const matches = safmr.rows.every((row) => {
          const m = new RegExp(`\\b${row.zip} \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+) \\$([\\d,]+)`).exec(zipText);
          return m !== null && Number(m[3]!.replace(/,/g, "")) === row.rent2br && Number(m[4]!.replace(/,/g, "")) === row.rent3br;
        });
        if (matches && zipText.includes("Small Area FMRs By Unit Bedrooms")) safmrSourceUrl = zipUrl;
        else console.warn(`  ! ${c.slug}: HUD's ZIP table does not match safmr-rents.ts; no SAFMR URL recorded`);
      }
      areas[c.slug] = {
        areaName,
        countyName: option.label,
        sourceUrl,
        year,
        rent2br: current.rent2br,
        rent3br: current.rent3br,
        prior: priorRow ? { year: year - 1, ...priorRow } : null,
        safmrSourceUrl,
      };
      console.log(`  + ${c.slug.padEnd(18)} ${areaName} · 2BR $${current.rent2br} 3BR $${current.rent3br}`);
    } catch (err) {
      console.warn(`  - ${c.slug}: ${(err as Error).message}`);
      missed.push(c.slug);
    }
  }

  const retrievedAt = new Date().toISOString().slice(0, 10);
  const body =
    `/**\n` +
    ` * GENERATED by scripts/build-market-fmr-areas.ts — do not edit by hand.\n` +
    ` * The HUD Fair Market Rent area behind each market page's HUD figures, read\n` +
    ` * from HUD's FY${year} Fair Market Rent Documentation System (huduser.gov).\n` +
    ` * Each record's sourceUrl opens HUD's page for the county (New England: the\n` +
    ` * town), which names the area and shows its FMRs; safmrSourceUrl shows HUD's\n` +
    ` * ZIP-level Small Area FMRs where lib/markets/safmr-rents.ts has rows.\n` +
    ` */\n\n` +
    `export type HudFmrArea = {\n` +
    `  /** HUD's name for the FMR area, e.g. "Columbus, OH HUD Metro FMR Area". */\n` +
    `  areaName: string;\n` +
    `  /** The county (New England: town) whose HUD page was read, as HUD labels it. */\n` +
    `  countyName: string;\n` +
    `  /** HUD's documentation page for that county: the area's FMRs by bedroom count. */\n` +
    `  sourceUrl: string;\n` +
    `  /** HUD fiscal year of rent2br / rent3br. */\n` +
    `  year: number;\n` +
    `  rent2br: number;\n` +
    `  rent3br: number;\n` +
    `  /** The prior fiscal year's FMRs, from the same HUD page. */\n` +
    `  prior: { year: number; rent2br: number; rent3br: number } | null;\n` +
    `  /** HUD's Small Area FMR (ZIP) table for the area, when safmr-rents.ts has rows that match it. */\n` +
    `  safmrSourceUrl: string | null;\n` +
    `};\n\n` +
    `/** The day this file's pages were read from huduser.gov. */\n` +
    `export const HUD_FMR_AREAS_RETRIEVED_AT = ${JSON.stringify(retrievedAt)};\n\n` +
    `export const HUD_FMR_AREAS: Record<string, HudFmrArea> = ${JSON.stringify(areas, null, 2)};\n`;
  await fs.writeFile(OUT_FILE, body, "utf8");
  console.log(`\nWrote ${Object.keys(areas).length}/${planned.length} areas -> lib/markets/hud-fmr-areas.ts`);
  if (missed.length) {
    console.log(`Unmatched (${missed.length}): ${missed.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
