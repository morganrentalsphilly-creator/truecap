/**
 * build-market-rents — fetches real HUD Fair Market Rent for every market
 * city and writes lib/markets/hud-rents.ts.
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
 *
 * A city that doesn't resolve is skipped; its page keeps the estimate range.
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
import { MARKET_CITIES } from "../lib/markets/cities";
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

type StateData = { counties: HudArea[]; metroareas: HudArea[]; year: number };

function matchArea(
  target: string,
  counties: HudArea[],
  metros: HudArea[]
): HudArea | undefined {
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
  return {
    counties: json?.data?.counties ?? [],
    metroareas: json?.data?.metroareas ?? [],
    year: Number(json?.data?.year ?? new Date().getFullYear()),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await loadEnv();

  const planned = MARKET_CITIES.filter((c) => CITY_GEO[c.slug]);
  console.log(
    `Market rents · ${DRY ? "DRY RUN" : "LIVE"} · ${planned.length}/${MARKET_CITIES.length} cities have a county mapping`
  );

  if (DRY) {
    const missing = MARKET_CITIES.filter((c) => !CITY_GEO[c.slug]).map((c) => c.slug);
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
  const rents: Record<string, { rent2br: number; rent3br: number; year: number }> = {};
  const missed: string[] = [];

  for (const c of planned) {
    try {
      if (!stateCache.has(c.stateCode)) {
        stateCache.set(c.stateCode, await fetchState(key, c.stateCode));
        await sleep(200);
      }
      const sd = stateCache.get(c.stateCode);
      if (!sd) {
        missed.push(c.slug);
        continue;
      }
      const target = normalizeCounty(CITY_GEO[c.slug]!.county);
      const m = matchArea(target, sd.counties, sd.metroareas);
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
    ` * Real HUD Fair Market Rent per market city. Refresh annually.\n` +
    ` */\n\n` +
    `export type HudRent = {\n  rent2br: number;\n  rent3br: number;\n  year: number;\n};\n\n` +
    `export const HUD_RENTS: Record<string, HudRent> = ${JSON.stringify(rents, null, 2)};\n`;

  await fs.writeFile(OUT_FILE, body, "utf8");
  console.log(
    `\nWrote ${Object.keys(rents).length}/${planned.length} cities -> lib/markets/hud-rents.ts`
  );
  if (missed.length) console.log(`Unmatched (${missed.length}, kept estimates): ${missed.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
