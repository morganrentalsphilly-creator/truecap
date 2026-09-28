/**
 * Build the market data pack PDF served at
 * /downloads/truecap-market-intelligence-pack.pdf (the former email-gated
 * lead magnet; no page links it today, but the URL stays live).
 *
 *   node scripts/build-market-intelligence-pack.ts
 *
 * Generates public/downloads/truecap-market-intelligence-pack.pdf from the
 * same sourced data the live /states and /markets pages render, and nothing
 * else:
 *   - content/seo/state-facts.json: U.S. Census Bureau American Community
 *     Survey figures per state (median home value, median real estate taxes
 *     paid, renter-occupied share), each with its data.census.gov table and
 *     retrieval day (validated by lib/seo/state-facts.ts at build time);
 *   - lib/markets/hud-rents.ts + lib/markets/hud-fmr-areas.ts: HUD Fair Market
 *     Rent (FY) for every market page, with HUD's FMR area name.
 * Re-run whenever those files change and commit the regenerated PDF.
 *
 * F8 (founder decision 2026-09-27, "state pitches become sourced facts"): the
 * hand-authored lib/states.ts tier, landlord-law lean, effective tax rate,
 * eviction timeline and state medians are unsourced, so the pack no longer
 * prints them, and the rent-to-price screen built on those medians is gone.
 * Content rules: numbers only from the sources above, each named in the PDF;
 * no forecasts, no verdicts on a market, FMR never called an average rent
 * (docs/voice.md rule 10).
 *
 * Imports carry .ts extensions and avoid the "@/" alias so Node runs this file
 * directly (type stripping); package.json is hash-pinned, so its tsx alias
 * stays as it is.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { STATES } from "../lib/states.ts";
import { BESPOKE_MARKETS, MARKET_CITIES } from "../lib/markets/cities.ts";
import { HUD_RENTS } from "../lib/markets/hud-rents.ts";
import { HUD_FMR_AREAS } from "../lib/markets/hud-fmr-areas.ts";
import { FMR_DEFINITION, HUD_FMR_OVERVIEW_URL } from "../lib/markets/data-copy.ts";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "public", "downloads", "truecap-market-intelligence-pack.pdf");
const STATE_FACTS_PATH = path.join(ROOT, "content", "seo", "state-facts.json");

const BRAND_BLUE = "#0070c4";
const INK = "#1f2937";
const MUTED = "#6b7280";

type NumberFact = { value: number; year: number; source: { url: string; title: string; publisher: string; retrievedAt: string } };
type StateFactRecord = Record<"medianHomeValue" | "medianRealEstateTaxesPaid" | "occupiedHousingUnits" | "renterOccupiedUnits", NumberFact>;

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function share(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Reads content/seo/state-facts.json; refuses a fact without a Census source (the app's loader does the full check). */
async function readStateFacts(): Promise<Record<string, StateFactRecord>> {
  const parsed = JSON.parse(await fs.readFile(STATE_FACTS_PATH, "utf8")) as { states: Record<string, StateFactRecord> };
  for (const [slug, facts] of Object.entries(parsed.states)) {
    for (const [key, fact] of Object.entries(facts)) {
      if (!Number.isInteger(fact.value) || !/^https:\/\/data\.census\.gov\//.test(fact.source.url)) {
        throw new Error(`state-facts.json ${slug}.${key} is not a sourced Census figure`);
      }
    }
  }
  return parsed.states;
}

async function main() {
  const stateFacts = await readStateFacts();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const width = pageWidth - margin * 2;

  const states = Object.values(STATES)
    .filter((s) => stateFacts[s.slug])
    .sort((a, b) => a.name.localeCompare(b.name));
  const acsYears = [...new Set(states.map((s) => stateFacts[s.slug]!.medianHomeValue.year))];
  const acsRetrieved = [...new Set(states.flatMap((s) => Object.values(stateFacts[s.slug]!).map((f) => f.source.retrievedAt)))].sort();
  const markets = [
    ...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateCode: c.stateCode })),
    ...BESPOKE_MARKETS.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })),
  ]
    .filter((m) => HUD_RENTS[m.slug])
    .sort((a, b) => (a.stateCode === b.stateCode ? a.name.localeCompare(b.name) : a.stateCode.localeCompare(b.stateCode)));
  const hudYears = [...new Set(markets.map((m) => HUD_RENTS[m.slug]!.year))];
  const hudRetrieved = [...new Set(markets.map((m) => HUD_RENTS[m.slug]!.retrievedAt))].sort();
  if (acsYears.length !== 1 || hudYears.length !== 1) throw new Error("the pack expects one ACS year and one HUD fiscal year");
  const acsYear = acsYears[0]!;
  const hudYear = hudYears[0]!;

  // ── Cover ────────────────────────────────────────────────────────
  doc.setFillColor(BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setTextColor(BRAND_BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRUECAP", margin, 72);
  doc.setTextColor(INK);
  doc.setFontSize(30);
  doc.text("Rental Market Data Pack", margin, 116);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      `U.S. Census Bureau figures for ${states.length} states and HUD Fair Market Rent (FY${hudYear}) for ${markets.length} market pages: the same sourced data behind usetruecap.com/states and /markets.`,
      width,
    ),
    margin,
    148,
  );
  doc.setFontSize(11);
  doc.setTextColor(INK);
  const bullets = [
    `1. State data - median home value, real estate taxes paid, renter share (ACS ${acsYear})`,
    `2. HUD Fair Market Rent (FY${hudYear}) - 2-bedroom and 3-bedroom, by market`,
    "3. Sources - every table and page these numbers come from",
  ];
  bullets.forEach((b, i) => doc.text(b, margin, 224 + i * 22));
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      "Reference data, not quotes or recommendations. State figures describe owner-occupied homes statewide, not a specific property's value or tax bill. HUD Fair Market Rent is an area benchmark, not what a specific unit rents for. Verify a property with current leases, the actual tax bill, condition, title, and written loan terms before you offer.",
      width,
    ),
    margin,
    320,
  );
  doc.setTextColor(BRAND_BLUE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Run any address free: usetruecap.com", margin, 396);

  // ── Section 1: Census state data ────────────────────────────────
  doc.addPage();
  doc.setTextColor(INK);
  doc.setFontSize(18);
  doc.text("State data: U.S. Census Bureau", margin, 64);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      `American Community Survey ${acsYear} 1-year estimates, statewide. Median home value: table B25077 (owner-occupied homes). Median real estate taxes paid: table B25103 (owner-occupied homes, a year). Renter share: table B25003 (renter-occupied of all occupied homes). Each state's tables on data.census.gov are listed on its usetruecap.com/states page.`,
      width,
    ),
    margin,
    82,
  );
  autoTable(doc, {
    startY: 128,
    head: [["State", "Median home value", "Median real estate taxes paid", "Renter-occupied homes"]],
    body: states.map((s) => {
      const f = stateFacts[s.slug]!;
      return [
        `${s.name} (${s.abbr})`,
        money(f.medianHomeValue.value),
        `${money(f.medianRealEstateTaxesPaid.value)} a year`,
        share(f.renterOccupiedUnits.value, f.occupiedHousingUnits.value),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: BRAND_BLUE, fontSize: 8 },
    alternateRowStyles: { fillColor: "#f3f7fb" },
    margin: { left: margin, right: margin },
  });

  // ── Section 2: HUD Fair Market Rent by market ───────────────────
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK);
  doc.text(`HUD Fair Market Rent (FY${hudYear}) by market`, margin, 64);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      `${FMR_DEFINITION} Each figure is for the HUD FMR area that contains the market; each market's usetruecap.com/markets page links HUD's documentation page for its area, and ZIP-level Small Area FMRs where HUD publishes them.`,
      width,
    ),
    margin,
    82,
  );
  autoTable(doc, {
    startY: 132,
    head: [["Market", "State", "HUD FMR area", "2BR / month", "3BR / month"]],
    body: markets.map((m) => {
      const rent = HUD_RENTS[m.slug]!;
      const area = HUD_FMR_AREAS[m.slug];
      return [m.name, m.stateCode, area?.areaName ?? "-", money(rent.rent2br), money(rent.rent3br)];
    }),
    styles: { fontSize: 7.5, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: BRAND_BLUE, fontSize: 7.5 },
    alternateRowStyles: { fillColor: "#f3f7fb" },
    margin: { left: margin, right: margin },
  });

  // ── Section 3: Sources ──────────────────────────────────────────
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK);
  doc.text("Sources", margin, 64);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  const sources = [
    `U.S. Census Bureau, American Community Survey ${acsYear} 1-year estimates, tables B25077, B25103 and B25003, one table page per state on data.census.gov (for example ${stateFacts[states[0]!.slug]!.medianHomeValue.source.url}). Retrieved ${acsRetrieved.join(" and ")}.`,
    `U.S. Department of Housing and Urban Development, FY${hudYear} Fair Market Rents, the HUD FMR API and HUD's FY${hudYear} Fair Market Rent Documentation System on huduser.gov. Figures retrieved ${hudRetrieved.join(" and ")}.`,
    `HUD, Fair Market Rents: definition and uses. ${HUD_FMR_OVERVIEW_URL}`,
  ];
  let y = 88;
  for (const line of sources) {
    const wrapped = doc.splitTextToSize(line, width);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 12 + 10;
  }

  // Footer on every page.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("TrueCap Rental Market Data Pack · Census ACS + HUD Fair Market Rent · Verify every property at usetruecap.com", margin, h - 24);
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, h - 24, { align: "right" });
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, Buffer.from(doc.output("arraybuffer")));
  console.log(`Wrote ${OUT_PATH} (${pageCount} pages, ${states.length} states, ${markets.length} markets)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
