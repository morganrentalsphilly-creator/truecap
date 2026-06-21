/**
 * build-market-rents — one-shot script that fetches real HUD Fair Market
 * Rent for every market city and writes lib/markets/hud-rents.ts.
 *
 * Flow per city (mirrors app/actions/enrich-property.ts):
 *   1. GET /fmr/statedata/{STATE}  -> list of counties + metros
 *   2. match the county from lib/markets/city-geo.ts by name
 *   3. GET /fmr/data/{fips}        -> basicdata with 2BR/3BR FMR
 *
 * A city that doesn't resolve is skipped (its page keeps the estimate
 * range) — never fatal. Idempotent: re-running just rewrites the file.
 *
 * Usage:
 *   npm run build-market-rents:dry   # plan only, no API calls
 *   npm run build-market-rents       # fetch + write lib/markets/hud-rents.ts
 *
 * Requires HUD_API_KEY (free at huduser.gov). Loaded from .env.local then
 * .env, same as the other scripts.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { MARKET_CITIES } from "../lib/markets/cities";
import { CITY_GEO } from "../lib/markets/city-geo";

const DRY = process.argv.includes("--dry-run");
const HUD_BASE = "https://www.huduser.gov/hudapi/public/fmr";
const OUT_FILE = path.join(process.cwd(), "lib", "markets", "hud-rents.ts");

// -- tiny .env loader (same approach as schedule-all-broadcasts.ts) --
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

const normCounty = (s: string) =>
  s.toLowerCase().replace(/\s+(county|parish)$/i, "").trim();

type Basic = Record<string, unknown>;
function pickFmr(basicdata: unknown, field: string): number {
  if (Array.isArray(basicdata)) {
    const msa = (basicdata as Basic[]).find((r) =>
      String(r.zip_code ?? "").toLowerCase().includes("msa")
    );
    const row = msa ?? (basicdata as Basic[])[0];
    return Number(row?.[field]);
  }
  if (basicdata && typeof basicdata === "object") {
    return Number((basicdata as Basic)[field]);
  }
  return NaN;
}

async function hudGet(url: string, key: string): Promise<any | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.warn(`  ! HUD ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

async function main() {
  await loadEnv();

  const planned = MARKET_CITIES.filter((c) => CITY_GEO[c.slug]);
  console.log(
    `Market rents · ${DRY ? "DRY RUN" : "LIVE"} · ${planned.length}/${MARKET_CITIES.length} cities have a county mapping`
  );

  if (DRY) {
    for (const c of planned) {
      console.log(`  ${c.slug.padEnd(18)} ${c.stateCode}  ${CITY_GEO[c.slug]!.county}`);
    }
    const missing = MARKET_CITIES.filter((c) => !CITY_GEO[c.slug]).map((c) => c.slug);
    if (missing.length) console.log(`\n  No county mapping (will keep estimates): ${missing.join(", ")}`);
    console.log("\nDry run — no API calls, no file written.");
    return;
  }

  const key = process.env.HUD_API_KEY;
  if (!key) {
    console.error("HUD_API_KEY is not set (.env.local / .env). Aborting.");
    process.exit(1);
  }

  // Cache statedata per state — one metro's response covers the state.
  const stateCache = new Map<string, any>();
  const rents: Record<string, { rent2br: number; rent3br: number; year: number }> = {};

  for (const c of planned) {
    const geo = CITY_GEO[c.slug]!;
    try {
      let state = stateCache.get(c.stateCode);
      if (!state) {
        state = await hudGet(`${HUD_BASE}/statedata/${encodeURIComponent(c.stateCode)}`, key);
        stateCache.set(c.stateCode, state);
        await new Promise((r) => setTimeout(r, 250));
      }
      const counties: Basic[] = state?.data?.counties ?? [];
      const target = normCounty(geo.county);
      const match = counties.find(
        (x) => x.county_name && normCounty(String(x.county_name)) === target
      );
      const fips = match?.fips_code ?? match?.FIPS_code;
      if (!fips) {
        console.warn(`  - ${c.slug}: county "${geo.county}" not found in ${c.stateCode}`);
        continue;
      }
      const data = await hudGet(`${HUD_BASE}/data/${encodeURIComponent(String(fips))}`, key);
      await new Promise((r) => setTimeout(r, 250));
      const basic = data?.data?.basicdata;
      const year = Number(data?.data?.year) || new Date().getFullYear();
      const rent2br = pickFmr(basic, "Two-Bedroom");
      const rent3br = pickFmr(basic, "Three-Bedroom");
      if (!Number.isFinite(rent2br) || !Number.isFinite(rent3br) || rent2br <= 0) {
        console.warn(`  - ${c.slug}: no usable FMR in HUD response`);
        continue;
      }
      rents[c.slug] = { rent2br: Math.round(rent2br), rent3br: Math.round(rent3br), year };
      console.log(`  + ${c.slug.padEnd(18)} 2BR $${Math.round(rent2br)}  3BR $${Math.round(rent3br)}  (${year})`);
    } catch (err) {
      console.warn(`  ! ${c.slug}: ${(err as Error).message}`);
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
  console.log(`\nWrote ${Object.keys(rents).length} cities -> lib/markets/hud-rents.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
