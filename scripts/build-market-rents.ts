/**
 * build-market-rents — fetches real HUD Fair Market Rent for every market
 * page (MARKET_CITIES and the 12 BESPOKE_MARKETS) and writes
 * lib/markets/hud-rents.ts, each row stamped with the day it was fetched.
 *
 * Mirrors the production matcher in app/actions/enrich-property.ts:
 *   GET /fmr/statedata/{STATE} -> data.counties[] + data.metroareas[], with
 *   FMR values inline on each record. Match the city's county by:
 *     1) exact county_name within counties
 *     2) partial match within metroareas (name / metro_name / county_name /
 *        counties_msa) — this is where most metro counties live
 *     3) partial county_name + town_name within counties
 *   then read "Two-Bedroom" / "Three-Bedroom" off the matched record.
 *   (No second /fmr/data call — the county/metro figure is inline and is
 *   the right grain for a market-overview page.)
 *   HUD defines New England FMR areas by TOWN: a CT, MA, ME, NH, RI or VT
 *   city matches its own town_name first. (Matching the county picked a
 *   neighbouring town's area for Worcester, Lowell and Manchester until
 *   2026-09-27.)
 *
 * A city that doesn't resolve is skipped: it gets no row, and its page stays
 * `noindex, follow` (lib/markets/indexability.ts). A response without HUD's
 * fiscal `year` is refused rather than stamped with the calendar year.
 *
 * lib/markets/hud-fmr-areas.ts (scripts/build-market-fmr-areas.ts) must carry
 * the same fiscal year and figures; lib/__tests__/markets-data-bar.test.ts
 * fails until both are refreshed.
 *
 * Usage:
 *   npm run build-market-rents:dry   # plan only, no API calls
 *   npm run build-market-rents       # fetch + write lib/markets/hud-rents.ts
 *
 * Requires HUD_API_KEY (free at huduser.gov; the token must have the Fair
 * Market Rents dataset scope). Loaded from .env.local then .env.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { BESPOKE_MARKETS, MARKET_CITIES } from "../lib/markets/cities";
import { CITY_GEO } from "../lib/markets/city-geo";

const DRY = process.argv.includes("--dry-run");
const HUD_BASE = "https://www.huduser.gov/hudapi/public/fmr";
const OUT_FILE = path.join(process.cwd(), "lib", "markets", "hud-rents.ts");

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && m[1] && !(m[1] in process.env)) {
          process.env[m[1]] = m[2]!.replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file optional */
    }
  }
}

// Same normalization as app/actions/enrich-property.ts.
const normalizeCounty = (name: string): string =>
  name.toLowerCase().replace(/\bcounty\b/g, "").replace(/[^a-z0-9 ]+/g, "").trim();

type HudArea = {
  county_name?: string;
  name?: string;
  metro_name?: string;
  counties_msa?: string;
  town_name?: string;
} & Record<string, unknown>;

type StateData = { counties: HudArea[]; metroareas: HudArea[]; year: number | null };

const NEW_ENGLAND = new Set(["CT", "MA", "ME", "NH", "RI", "VT"]);

/** "Worcester city" / "Hartford town" -> "worcester" / "hartford". */
const normalizeTown = (name: string): string =>
  name.toLowerCase().replace(/\b(?:city|town)\b/g, "").replace(/[^a-z0-9 ]+/g, "").trim();

function matchArea(
  target: string,
  counties: HudArea[],
  metros: HudArea[],
  town: string | null = null
): HudArea | undefined {
  // 0) New England: HUD's areas follow towns, so the city's own town wins.
  if (town) {
    const t = counties.find(
      (c) => c.town_name && normalizeTown(String(c.town_name)) === normalizeTown(town)
    );
    if (t) return t;
  }
  // 1) exact county
  let m = counties.find(
    (c) => c.county_name && normalizeCounty(String(c.county_name)) === target
  );
  if (m) return m;
  // 2) metro area (partial across name/metro_name/county_name/counties_msa)
  m = metros.find((x) => {
    const hay = [x.name, x.metro_name, x.county_name, x.counties_msa]
      .filter(Boolean)
      .join(" ");
    return hay && normalizeCounty(hay).includes(target);
  });
  if (m) return m;
  // 3) county partial (county_name + town_name)
  return counties.find((c) => {
    const label = `${c.county_name ?? ""} ${c.town_name ?? ""}`;
    return label.trim() && normalizeCounty(label).includes(target);
  });
}

async function fetchState(key: string, state: string): Promise<StateData | null> {
  const res = await fetch(`${HUD_BASE}/statedata/${encodeURIComponent(state)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) {
    console.warn(`  ! HUD ${res.status} for statedata/${state}`);
    return null;
  }
  const json = (await res.json().catch(() => null)) as {
    data?: { year?: string | number; counties?: HudArea[]; metroareas?: HudArea[] };
  } | null;
  const year = Number(json?.data?.year);
  return {
    counties: json?.data?.counties ?? [],
    metroareas: json?.data?.metroareas ?? [],
    // Never the calendar year: a missing vintage must not be stamped as current.
    year: Number.isInteger(year) && year > 2000 ? year : null,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await loadEnv();

  const pages = [
    ...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateCode: c.stateCode })),
    ...BESPOKE_MARKETS.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })),
  ];
  const planned = pages.filter((c) => CITY_GEO[c.slug]);
  console.log(
    `Market rents · ${DRY ? "DRY RUN" : "LIVE"} · ${planned.length}/${pages.length} market pages have a county mapping`
  );

  if (DRY) {
    const missing = pages.filter((c) => !CITY_GEO[c.slug]).map((c) => c.slug);
    if (missing.length) console.log(`  No county mapping: ${missing.join(", ")}`);
    console.log("Dry run — no API calls, no file written.");
    return;
  }

  const key = process.env.HUD_API_KEY;
  if (!key) {
    console.error("HUD_API_KEY is not set (.env.local / .env). Aborting.");
    process.exit(1);
  }

  const stateCache = new Map<string, StateData | null>();
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const rents: Record<string, { rent2br: number; rent3br: number; year: number; retrievedAt: string }> = {};
  const missed: string[] = [];

  for (const c of planned) {
    try {
      if (!stateCache.has(c.stateCode)) {
        stateCache.set(c.stateCode, await fetchState(key, c.stateCode));
        await sleep(200);
      }
      const sd = stateCache.get(c.stateCode);
      if (!sd || sd.year === null) {
        if (sd) console.warn(`  - ${c.slug}: HUD statedata/${c.stateCode} has no fiscal year`);
        missed.push(c.slug);
        continue;
      }
      const target = normalizeCounty(CITY_GEO[c.slug]!.county);
      const m = matchArea(target, sd.counties, sd.metroareas, NEW_ENGLAND.has(c.stateCode) ? c.name : null);
      if (!m) {
        console.warn(`  - ${c.slug}: county "${CITY_GEO[c.slug]!.county}" not matched in ${c.stateCode}`);
        missed.push(c.slug);
        continue;
      }
      const r2 = Math.round(Number(m["Two-Bedroom"]));
      const r3 = Math.round(Number(m["Three-Bedroom"]));
      if (!Number.isFinite(r2) || r2 <= 0) {
        console.warn(`  - ${c.slug}: no usable FMR value on matched record`);
        missed.push(c.slug);
        continue;
      }
      rents[c.slug] = {
        rent2br: r2,
        rent3br: Number.isFinite(r3) && r3 > 0 ? r3 : r2,
        year: sd.year,
        retrievedAt,
      };
      console.log(`  + ${c.slug.padEnd(18)} 2BR $${r2}  3BR $${rents[c.slug]!.rent3br}  (${sd.year})`);
    } catch (err) {
      console.warn(`  ! ${c.slug}: ${(err as Error).message}`);
      missed.push(c.slug);
    }
  }

  const body =
    `/**\n` +
    ` * GENERATED by scripts/build-market-rents.ts — do not edit by hand.\n` +
    ` * Real HUD Fair Market Rent per market page (MARKET_CITIES and the bespoke\n` +
    ` * metros). Refresh annually, together with lib/markets/hud-fmr-areas.ts.\n` +
    ` */\n\n` +
    `export type HudRent = {\n  rent2br: number;\n  rent3br: number;\n  /** HUD fiscal year (FY) of the figures. */\n  year: number;\n  /** YYYY-MM-DD the row was fetched from HUD. */\n  retrievedAt: string;\n};\n\n` +
    `export const HUD_RENTS: Record<string, HudRent> = ${JSON.stringify(rents, null, 2)};\n`;

  await fs.writeFile(OUT_FILE, body, "utf8");
  console.log(
    `\nWrote ${Object.keys(rents).length}/${planned.length} market pages -> lib/markets/hud-rents.ts`
  );
  if (missed.length) console.log(`Unmatched (${missed.length}, no row, page stays noindex): ${missed.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
