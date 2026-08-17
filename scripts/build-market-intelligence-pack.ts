/**
 * Build the Market Intelligence Pack PDF (the email-gated lead magnet).
 *
 *   npx tsx scripts/build-market-intelligence-pack.ts
 *
 * Generates public/downloads/truecap-market-intelligence-pack.pdf from the
 * SAME data files that power the live /states and /markets pages
 * (lib/states.ts, lib/markets/cities.ts, lib/markets/hud-rents.ts), so the
 * PDF can never disagree with the site. Re-run whenever those files change
 * and commit the regenerated PDF.
 *
 * Content rules (trust language): every number is a benchmark from the
 * repo's sourced data — no forecasts, no invented "hot market" claims. The
 * rent-to-price screen is arithmetic on the state medians, labeled as such.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { STATES } from "../lib/states";
import { MARKET_CITIES } from "../lib/markets/cities";
import { HUD_RENTS } from "../lib/markets/hud-rents";

const OUT_PATH = path.join(process.cwd(), "public", "downloads", "truecap-market-intelligence-pack.pdf");

const BRAND_BLUE = "#0070c4";
const INK = "#1f2937";
const MUTED = "#6b7280";

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

async function main() {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  // ── Cover ────────────────────────────────────────────────────────
  doc.setFillColor(BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setTextColor(BRAND_BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRUECAP", margin, 72);
  doc.setTextColor(INK);
  doc.setFontSize(30);
  doc.text("Market Intelligence Pack", margin, 116);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      "State-by-state investing benchmarks, the rent-to-price screen, and HUD rent benchmarks for the markets TrueCap tracks — the same sourced data that pre-fills every TrueCap analysis.",
      pageWidth - margin * 2
    ),
    margin,
    148
  );
  doc.setFontSize(11);
  doc.setTextColor(INK);
  const bullets = [
    "1. Every state, one table — tax, landlord law, eviction timeline, medians",
    "2. The rent-to-price screen — where state medians still clear 0.7%+",
    "3. HUD rent benchmarks — 2BR/3BR Fair Market Rents by tracked market",
  ];
  bullets.forEach((b, i) => doc.text(b, margin, 224 + i * 22));
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      "Benchmarks, not quotes. Rents are HUD area Fair Market Rents, taxes are state effective-rate estimates, and medians are metro-level — always verify a specific property with local comps, the actual tax bill, and written loan terms before you offer. Generated from the public data behind usetruecap.com/states and /markets.",
      pageWidth - margin * 2
    ),
    margin,
    320
  );
  doc.setTextColor(BRAND_BLUE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Run any address free: usetruecap.com", margin, 396);

  // ── Section 1: State table ───────────────────────────────────────
  doc.addPage();
  doc.setTextColor(INK);
  doc.setFontSize(18);
  doc.text("Every state on one page", margin, 64);
  const states = Object.values(STATES).sort((a, b) => a.name.localeCompare(b.name));
  autoTable(doc, {
    startY: 84,
    head: [["State", "Tier", "Landlord law", "Prop tax", "Eviction (days)", "Median price", "Median rent"]],
    body: states.map((s) => [
      `${s.name} (${s.abbr})`,
      s.tier,
      s.landlord,
      `${s.propertyTaxRatePct.toFixed(2)}%`,
      s.evictionTimelineDays,
      money(s.medianHomePrice),
      money(s.medianRent),
    ]),
    styles: { fontSize: 7.5, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: BRAND_BLUE, fontSize: 7.5 },
    alternateRowStyles: { fillColor: "#f3f7fb" },
    margin: { left: margin, right: margin },
  });

  // ── Section 2: rent-to-price screen ─────────────────────────────
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(INK);
  doc.text("The rent-to-price screen (state medians)", margin, 64);
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      "Monthly median rent ÷ median home price, straight from the table above. The classic \"1% rule\" is rare at state level in 2026 — treat 0.7%+ as \"worth screening\", then let the full underwrite (not this ratio) make the decision.",
      pageWidth - margin * 2
    ),
    margin,
    82
  );
  const ranked = states
    .map((s) => ({
      name: `${s.name} (${s.abbr})`,
      ratio: (s.medianRent / s.medianHomePrice) * 100,
      strategies: s.bestStrategies.slice(0, 2).join(", "),
      tier: s.tier,
    }))
    .sort((a, b) => b.ratio - a.ratio);
  autoTable(doc, {
    startY: 128,
    head: [["Rank", "State", "Rent ÷ price", "Tier", "Fits strategies"]],
    body: ranked.map((r, i) => [String(i + 1), r.name, `${r.ratio.toFixed(2)}%`, r.tier, r.strategies]),
    styles: { fontSize: 8, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: BRAND_BLUE, fontSize: 8 },
    alternateRowStyles: { fillColor: "#f3f7fb" },
    margin: { left: margin, right: margin },
  });

  // ── Section 3: HUD rent benchmarks for tracked markets ──────────
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(INK);
  doc.text("HUD rent benchmarks by tracked market", margin, 64);
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(
    doc.splitTextToSize(
      "HUD area Fair Market Rents for the markets TrueCap tracks (ZIP-level detail where available on each market page). These are the same benchmarks TrueCap pre-fills — every one editable.",
      pageWidth - margin * 2
    ),
    margin,
    82
  );
  const marketRows = MARKET_CITIES.filter((c) => HUD_RENTS[c.slug])
    .map((c) => {
      const rent = HUD_RENTS[c.slug];
      return [c.name, c.stateCode, money(rent.rent2br), money(rent.rent3br), String(rent.year)];
    })
    .sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1].localeCompare(b[1])));
  autoTable(doc, {
    startY: 120,
    head: [["Market", "State", "HUD 2BR rent", "HUD 3BR rent", "FMR year"]],
    body: marketRows,
    styles: { fontSize: 8, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: BRAND_BLUE, fontSize: 8 },
    alternateRowStyles: { fillColor: "#f3f7fb" },
    margin: { left: margin, right: margin },
  });

  // Footer on every page.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      "TrueCap Market Intelligence Pack · Sourced from HUD FMR + state data · Every assumption editable at usetruecap.com",
      margin,
      h - 24
    );
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, h - 24, { align: "right" });
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, Buffer.from(doc.output("arraybuffer")));
  console.log(
    `Wrote ${OUT_PATH} (${pageCount} pages, ${states.length} states, ${marketRows.length} markets)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
