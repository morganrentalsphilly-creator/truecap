/**
 * Audit row P0-02 (2026-10): the rent lookup has three outcomes, and the
 * public copy named two. An address with no county match gets a statewide
 * HUD figure; /methodology said rent was left for the user to enter, and
 * five pages said "ZIP-level when available, otherwise an FMR area".
 *
 * The founder chose to keep the number and label it. These guards keep the
 * copy and the code telling the same story:
 *   - every page that describes the rent source names the third outcome, in
 *     the same words;
 *   - the two-outcome sentences do not come back;
 *   - no sentence calls the figure an average, typical, median or market rent
 *     (docs/voice.md rule 10);
 *   - /methodology's description of the statewide figure matches how
 *     app/actions/enrich-property.ts computes it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Source text as a reader would see it: one line, entities decoded. */
function visible(file: string): string {
  return readFileSync(join(ROOT, file), "utf8")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
}

const THIRD_OUTCOME = "when an address has no county match, a statewide HUD figure, labeled as such";
const FULL_LADDER = `ZIP-level when available, otherwise the HUD Fair Market Rent area; ${THIRD_OUTCOME}`;

/** File, the page it renders on, and whether it states the whole ladder. */
const PAGES: Array<{ file: string; page: string; fullLadder: boolean }> = [
  { file: "app/pricing/page.tsx", page: "/pricing", fullLadder: true },
  { file: "components/marketing/landing-sections.tsx", page: "/for-investors and /why-truecap", fullLadder: true },
  { file: "app/glossary/page.tsx", page: "/glossary", fullLadder: true },
  { file: "lib/glossary.ts", page: "/glossary/fair-market-rent", fullLadder: true },
  { file: "app/vs/bricked/page.tsx", page: "/vs/bricked", fullLadder: true },
  { file: "app/methodology/page.tsx", page: "/methodology", fullLadder: true },
  { file: "app/blog/how-to-estimate-rent-rental-property/page.tsx", page: "/blog/how-to-estimate-rent-rental-property", fullLadder: false },
  // DATA_SOURCE_FACTS.rent: the homepage source table, /for-investors, /llms.txt and /llms-full.txt.
  { file: "lib/product-facts.ts", page: "/, /for-investors, /llms.txt and /llms-full.txt", fullLadder: true },
  // The agent FAQ: /for-agents, /why-truecap and the homepage FAQ.
  { file: "lib/agent-faqs.ts", page: "/for-agents, /why-truecap and the homepage FAQ", fullLadder: true },
  { file: "app/vs/zillow-rent-estimate/page.tsx", page: "/vs/zillow-rent-estimate", fullLadder: true },
  { file: "app/vs/mashvisor/page.tsx", page: "/vs/mashvisor", fullLadder: true },
  { file: "app/vs/rentometer/page.tsx", page: "/vs/rentometer", fullLadder: true },
  // STATE_PAGE_GUIDANCE.fmr: the HUD section of every /states/<slug> page.
  { file: "lib/markets/indexability.ts", page: "/states/<slug>", fullLadder: true },
];

/** The two-outcome sentences this row removed. */
const RETIRED = [
  /otherwise an FMR area\)/i,
  /otherwise (?:at the )?broader FMR area/i,
  /geographic matching can fail/i,
  /labeled statewide average where HUD has no local match/i,
  /whether the value came from an FMR area or a ZIP-level SAFMR/i,
  /HUD Fair Market Rent by county or ZIP/i,
  /Rent starts from HUD Fair Market Rent\b/i,
  /Small Area FMR where available and a broader-area fallback/i,
  /HUD Fair Market Rent \(county-level\)/i,
];

/**
 * TrueCap's rent fill named as an area figure. The statewide fallback is not
 * one, so copy that describes what TrueCap fills says "HUD rent benchmark"
 * (or the full ladder), never "HUD area rent" or "HUD area benchmark".
 * Files whose only "area" mention is about HUD's FMR itself are not listed.
 */
const AREA_FILL_FILES = [
  "app/vs/page.tsx",
  "app/vs/zillow-rent-estimate/page.tsx",
  "app/vs/zillow-rent-estimate/opengraph-image.tsx",
  "app/vs/rentometer/page.tsx",
  "app/vs/rentcast/page.tsx",
  "app/vs/mashvisor/page.tsx",
  "app/vs/biggerpockets-calculator/page.tsx",
  "app/vs/dealcheck/page.tsx",
  "app/vs/propstream/page.tsx",
  "app/vs/avail/page.tsx",
  "app/vs/dealmachine/page.tsx",
  "app/for-agents/page.tsx",
  "app/for-buy-and-hold/page.tsx",
  "app/playbook/page.tsx",
  "app/methodology/page.tsx",
  "app/tools/rental-property-spreadsheet/page.tsx",
  "app/blog/best-states-for-rental-investors-2026/page.tsx",
  "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx",
  "components/marketing/landing-sections.tsx",
  "lib/product-facts.ts",
  "lib/agent-faqs.ts",
  // The sources note every /vs page prints, and two more TrueCap cells.
  "components/marketing/comparison-faq.tsx",
  "app/vs/stessa/page.tsx",
  "app/blog/best-rental-property-calculator-2026/page.tsx",
  "app/blog/section-8-rental-property-investing/page.tsx",
  "app/vs/mashvisor-for-short-term-rentals/page.tsx",
  "app/vs/biggerpockets-for-house-hacking/page.tsx",
  "lib/markets/indexability.ts",
];
const AREA_FILL = [
  /\bHUD area (?:rent )?benchmark\b/i,
  /\bHUD area[- ]rent\b/i,
  /\beditable area benchmark\b/i,
  /\bArea rent and a national\b/,
  /HUD Fair Market Rent as an editable area benchmark/i,
  /HUD Fair\s+Market Rent area benchmark/i,
  /TrueCap(?:&apos;|')s area benchmark/i,
  // A TrueCap cell that names the fill "HUD FMR": the statewide figure is not one.
  /\btruecap: "[^"]*\bHUD FMR\b/,
];

/** docs/voice.md rule 10, applied to the sentence that carries the ladder. */
const FMR_MISNAMES = [/\b(?:average|typical|median)\s+(?:monthly\s+)?rents?\b/i, /(?<!\bfair\s)\bmarket\s+rents?\b/i];

describe("rent source copy names the statewide fallback (audit row P0-02)", () => {
  it.each(PAGES)("$page names the third outcome in the shared words", ({ file, fullLadder }) => {
    const source = visible(file);
    expect(source).toContain(THIRD_OUTCOME);
    if (fullLadder) expect(source).toContain(FULL_LADDER);
  });

  it.each(PAGES)("$page no longer carries a two-outcome sentence", ({ file }) => {
    const source = visible(file);
    for (const pattern of RETIRED) expect(source).not.toMatch(pattern);
  });

  it.each(PAGES)("$page does not call the figure an average, typical, median or market rent", ({ file }) => {
    const source = visible(file);
    const at = source.indexOf(THIRD_OUTCOME);
    // The sentence around the clause: 200 characters either side is the
    // whole FAQ answer line or table cell on every one of these pages.
    const around = source.slice(Math.max(0, at - 200), at + THIRD_OUTCOME.length + 200);
    for (const pattern of FMR_MISNAMES) expect(around).not.toMatch(pattern);
  });

  it.each(AREA_FILL_FILES)("%s does not call TrueCap's rent fill an area figure", (file) => {
    const source = visible(file);
    for (const pattern of AREA_FILL) expect(source).not.toMatch(pattern);
  });

  it("/methodology describes the statewide figure the way the lookup computes it", () => {
    const methodology = visible("app/methodology/page.tsx");
    expect(methodology).toContain(
      "The statewide figure is the unweighted average of HUD's county and metro-area figures for the state and bedroom count",
    );
    expect(methodology).toContain("It is not a Fair Market Rent for any one area");
    // What still leaves rent blank: no HUD response, or no figures for the state.
    expect(methodology).toContain(
      "If HUD's service is unavailable or returns no figures for the state, TrueCap leaves rent for the user to enter.",
    );

    // The code those sentences describe. If the fallback changes (a weighted
    // mean, a median, a different set of rows), the copy has to change with it.
    const action = visible("app/actions/enrich-property.ts");
    expect(action).toContain("const haystack = [...counties, ...metroareas];");
    expect(action).toContain(".map((c) => Number(c[fmrField] ?? 0)) .filter((v) => v > 0);");
    expect(action).toContain("values.reduce((a, b) => a + b, 0) / values.length");
    expect(action).toContain("stateAverage: true,");
  });

  it("/vs/bricked does not score the rent row as a TrueCap win or characterize Bricked's rent data", () => {
    const bricked = visible("app/vs/bricked/page.tsx");
    const row = bricked.slice(bricked.indexOf('feature: "Rent data"'), bricked.indexOf('feature: "Try without signup"'));
    // Bricked's own homepage shows a rental offer calculator with a monthly
    // rent line (bricked.ai, rendered 2026-10-02); it says nothing about where
    // that rent comes from, so the cell says only what the page shows.
    expect(row).toContain('bricked: "A rental offer calculator with a monthly rent line"');
    expect(row).toContain('winner: "tie"');
    expect(row).not.toMatch(/Not the focus/i);
  });

  it("the analyzer's four source labels use the statewide wording the copy promises", () => {
    expect(visible("lib/data-confidence.ts")).toContain(
      'export const HUD_STATEWIDE_RENT_LABEL = "HUD rent benchmark (statewide average)";',
    );
    expect(visible("lib/input-confidence.ts")).toContain('"HUD rent benchmark (statewide average)"');
    expect(visible("components/investcalc/enrichment-receipt.tsx")).toContain('return "HUD statewide average";');
    const strip = visible("components/investcalc/assumptions-source-strip.tsx");
    expect(strip).toContain("isStatewideHudRent(rent) ? HUD_STATEWIDE_RENT_LABEL");
    expect(strip).toContain('isStatewideHudRent(rent) ? "HUD statewide"');
  });
});
