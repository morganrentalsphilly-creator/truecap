/**
 * build-market-safmr — fetches HUD Small Area FMR (ZIP-level rents) for
 * every market city whose HUD entity is a SAFMR region, and writes
 * lib/markets/safmr-rents.ts.
 *
 * Sibling of build-market-rents.ts (same statedata matcher, mirrored from
 * app/actions/enrich-property.ts). Flow per city:
 *   1. GET /fmr/statedata/{STATE}  -> counties[] + metroareas[]
 *   2. match the city's CITY_GEO county (exact county -> metro partial ->
 *      county partial), same as the FMR script
 *   3. if the matched entity is flagged smallarea_status === "1", GET
 *      /fmr/data/{entityid} — for SAFMR entities `data.basicdata` is an
 *      ARRAY of per-ZIP rows (see lib/property-enrichment/hud-safmr.ts)
 *   4. keep valid 5-digit-ZIP rows, sort by 2BR rent (desc), and store an
 *      even sample of up to MAX_ROWS rows (always incl. the highest and
 *      lowest ZIP) plus the total ZIP count, so the generated file stays
 *      bounded while every number in it is a real HUD figure.
 *
 * Cities whose entity is NOT a SAFMR region (or whose ZIP data doesn't
 * resolve) are simply absent from the output — the city page renders no
 * ZIP table for them (invisible until useful).
 *
 * Usage:
 *   npm run build-market-safmr:dry   # plan only, no API calls
 *   npm run build-market-safmr       # fetch + write lib/markets/safmr-rents.ts
 *
 * Requires HUD_API_KEY (free at huduser.gov; Fair Market Rents dataset
 * scope). Loaded from .env.local then .env.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { MARKET_CITIES } from "../lib/markets/cities";
import { CITY_GEO } from "../lib/markets/city-geo";
import { isSmallAreaEntity } from "../lib/property-enrichment/hud-safmr";

const DRY = process.argv.includes("--dry-run");
const HUD_BASE = "https://www.huduser.gov/hudapi/public/fmr";
const OUT_FILE = path.join(process.cwd(), "lib", "markets", "safmr-rents.ts");
/** Max ZIP rows stored (and rendered) per city — keeps the file bounded. */
const MAX_ROWS = 12;

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

// Same normalization as app/actions/enrich-property.ts + build-market-rents.ts.
const normalizeCounty = (name: string): string =>
  name.toLowerCase().replace(/\bcounty\b/g, "").replace(/[^a-z0-9 ]+/g, "").trim();

type HudArea = {
  county_name?: string;
  name?: string;
  metro_name?: string;
  counties_msa?: string;
  town_name?: string;
  fips_code?: string | number;
  code?: string | number;
  smallarea_status?: string | number;
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

type ZipRow = { zip: string; rent2br: number; rent3br: number };
type EntityData = { rows: ZipRow[]; year: number; areaName: string | null } | null;

/**
 * HUD's own entity name is the ONLY honest label for a ZIP table: the
 * matched county row's name is NOT — a county inside a metro maps to the
 * WHOLE metro FMR area (multi-county, often multi-state), so labeling
 * Wilmington's table "New Castle County" while it contains NJ/PA ZIPs is
 * a factual misattribution (review blocker). Normalize HUD's verbose
 * suffixes for readable copy.
 */
function normalizeAreaName(raw: string): string {
  return raw
    .replace(/\s+HUD (Small Area|Metro) FMR Area$/i, " metro area")
    .replace(/\s+MSA$/i, " metro area")
    .trim();
}

/** Fetch + parse ZIP rows for one SAFMR entity. Null when not SAFMR-shaped. */
async function fetchEntityZips(key: string, entityId: string): Promise<EntityData> {
  const res = await fetch(`${HUD_BASE}/data/${encodeURIComponent(entityId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) {
    console.warn(`  ! HUD ${res.status} for data/${entityId}`);
    return null;
  }
  const json = (await res.json().catch(() => null)) as {
    data?: { year?: string | number; area_name?: unknown; basicdata?: unknown };
  } | null;
  const basic = json?.data?.basicdata;
  // SAFMR entities return an array of per-ZIP rows; non-SAFMR entities
  // return a single object — treat those as "no ZIP data".
  if (!Array.isArray(basic)) return null;

  const rows: ZipRow[] = [];
  for (const raw of basic as ({ zip_code?: unknown } & Record<string, unknown>)[]) {
    if (!raw || typeof raw !== "object" || typeof raw.zip_code !== "string") continue;
    const zip = raw.zip_code.trim();
    if (!/^\d{5}$/.test(zip)) continue; // skips the synthetic "MSA level" row
    const r2 = Math.round(Number(raw["Two-Bedroom"]));
    if (!Number.isFinite(r2) || r2 <= 0) continue;
    const r3raw = Math.round(Number(raw["Three-Bedroom"]));
    const r3 = Number.isFinite(r3raw) && r3raw > 0 ? r3raw : r2;
    rows.push({ zip, rent2br: r2, rent3br: r3 });
  }
  if (rows.length === 0) return null;
  const rawAreaName = json?.data?.area_name;
  return {
    rows,
    year: Number(json?.data?.year ?? new Date().getFullYear()),
    areaName: typeof rawAreaName === "string" && rawAreaName.trim() ? normalizeAreaName(rawAreaName) : null,
  };
}

/**
 * Even sample of up to `max` rows from a rent-sorted list — always keeps
 * the first (highest) and last (lowest) so the table shows the true range.
 */
function sampleRows(sorted: ZipRow[], max: number): ZipRow[] {
  if (sorted.length <= max) return sorted;
  const out: ZipRow[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (sorted.length - 1)) / (max - 1));
    out.push(sorted[idx]!);
  }
  // Dedupe in case rounding collides (only possible near max ≈ length).
  return out.filter((r, i) => out.findIndex((x) => x.zip === r.zip) === i);
}

async function main() {
  await loadEnv();

  const planned = MARKET_CITIES.filter((c) => CITY_GEO[c.slug]);
  console.log(
    `Market SAFMR · ${DRY ? "DRY RUN" : "LIVE"} · ${planned.length}/${MARKET_CITIES.length} cities have a county mapping`
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const stateCache = new Map<string, StateData | null>();
  const entityCache = new Map<string, EntityData>();

  type CitySafmrOut = {
    areaName: string;
    year: number;
    zipCount: number;
    rows: ZipRow[];
  };
  const out: Record<string, CitySafmrOut> = {};
  let skippedNonSafmr = 0;
  const skippedOther: string[] = [];

  for (const c of planned) {
    try {
      if (!stateCache.has(c.stateCode)) {
        stateCache.set(c.stateCode, await fetchState(key, c.stateCode));
        await sleep(200);
      }
      const sd = stateCache.get(c.stateCode);
      if (!sd) {
        skippedOther.push(c.slug);
        continue;
      }
      const target = normalizeCounty(CITY_GEO[c.slug]!.county);
      const m = matchArea(target, sd.counties, sd.metroareas);
      if (!m) {
        skippedOther.push(c.slug);
        continue;
      }
      if (!isSmallAreaEntity(m)) {
        skippedNonSafmr++;
        continue; // county/metro isn't a SAFMR region — no ZIP data published
      }
      // Counties carry `fips_code`, metros carry `code` (same convention
      // as app/actions/enrich-property.ts). Coerce to string.
      const entityIdRaw = m.fips_code ?? m.code;
      const entityId = entityIdRaw != null ? String(entityIdRaw) : null;
      if (!entityId) {
        skippedOther.push(c.slug);
        continue;
      }
      if (!entityCache.has(entityId)) {
        entityCache.set(entityId, await fetchEntityZips(key, entityId));
        await sleep(200);
      }
      const entity = entityCache.get(entityId) ?? null;
      if (!entity) {
        skippedNonSafmr++; // flagged SAFMR but basicdata wasn't ZIP-shaped
        continue;
      }
      const sorted = [...entity.rows].sort(
        (a, b) => b.rent2br - a.rent2br || a.zip.localeCompare(b.zip)
      );
      // HUD's own entity name, never the matched county's (see
      // normalizeAreaName doc — the county label misattributes metro ZIPs).
      const areaName = entity.areaName ?? String(m.county_name ?? m.name ?? CITY_GEO[c.slug]!.county);
      out[c.slug] = {
        areaName,
        year: entity.year,
        zipCount: sorted.length,
        rows: sampleRows(sorted, MAX_ROWS),
      };
      console.log(
        `  + ${c.slug.padEnd(18)} ${String(sorted.length).padStart(3)} ZIPs  2BR $${sorted[sorted.length - 1]!.rent2br}–$${sorted[0]!.rent2br}  (${entity.year}) · ${areaName}`
      );
    } catch (err) {
      console.warn(`  ! ${c.slug}: ${(err as Error).message}`);
      skippedOther.push(c.slug);
    }
  }

  const body =
    `/**\n` +
    ` * GENERATED by scripts/build-market-safmr.ts — do not edit by hand.\n` +
    ` * HUD Small Area Fair Market Rent (ZIP-level) per market city, for the\n` +
    ` * cities whose HUD county/metro entity publishes SAFMRs. Rows are an\n` +
    ` * even sample (max ${MAX_ROWS}) across the rent-sorted ZIP list — every\n` +
    ` * figure is a real HUD number; zipCount is the entity's full ZIP count.\n` +
    ` * Refresh annually alongside hud-rents.ts.\n` +
    ` */\n\n` +
    `export type SafmrZipRent = {\n  zip: string;\n  rent2br: number;\n  rent3br: number;\n};\n\n` +
    `export type CitySafmr = {\n  /** HUD entity name (county or metro FMR area). */\n  areaName: string;\n  /** SAFMR data year. */\n  year: number;\n  /** Total ZIPs in the entity (rows is a sample when larger). */\n  zipCount: number;\n  /** Sampled ZIP rows, sorted by 2BR rent descending. */\n  rows: SafmrZipRent[];\n};\n\n` +
    `export const SAFMR_RENTS: Record<string, CitySafmr> = ${JSON.stringify(out, null, 2)};\n`;

  await fs.writeFile(OUT_FILE, body, "utf8");
  console.log(
    `\nWrote ${Object.keys(out).length}/${planned.length} cities -> lib/markets/safmr-rents.ts`
  );
  console.log(
    `Skipped: ${skippedNonSafmr} non-SAFMR entities, ${skippedOther.length} unmatched/error${skippedOther.length ? ` (${skippedOther.join(", ")})` : ""}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
