/**
 * PRICING TRUTH GUARD — the rendered pricing surfaces must agree with
 * lib/entitlements-catalog, which is the single source of truth for what each
 * tier includes.
 *
 * Why this file exists: tier truth used to be hand-typed independently on the
 * homepage ladder, the /pricing table, and the plan cards. They drifted, and
 * the drift landed on the two screens where someone decides to pay — the
 * homepage claimed Free couldn't save deals (it can: five) and that the $5 PDF
 * omitted 10-year projections (it doesn't). Both contradicted /pricing.
 *
 * The homepage ladder now DERIVES its cells from the catalog, so it cannot
 * drift by construction. The /pricing table still hand-types its rows (it
 * carries rows that aren't entitlement flags at all), so this guard asserts
 * the ones that DO map to a catalog feature still agree with it.
 *
 * If this test fails, fix whichever side is factually wrong — do not "sync"
 * the catalog to match a marketing claim without verifying the product really
 * behaves that way.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_CATALOG, tierHas, type FeatureKey } from "@/lib/entitlements-catalog";

const ROOT = join(__dirname, "..", "..");
const pricingSource = readFileSync(join(ROOT, "app/pricing/page.tsx"), "utf8");
const landingSource = readFileSync(join(ROOT, "components/marketing/landing-sections.tsx"), "utf8");

/**
 * /pricing rows mapped to the catalog feature they describe. Rows with no
 * entitlement flag (priority support, due-diligence checklist, alerts) are
 * deliberately absent — there is nothing in the catalog to check them against.
 */
const PRICING_ROW_TO_FEATURE: { row: string; key: FeatureKey }[] = [
  { row: "Sale + rent comps from the address", key: "comps" },
  { row: "Shareable read-only deal links", key: "share_links" },
  { row: "10-year cash flow projection", key: "projections" },
  { row: "Tax strategy + depreciation", key: "tax_strategy" },
  { row: "Exit scenarios (best year to sell)", key: "exit_scenarios" },
  { row: "Buy Box auto-screening", key: "buy_box" },
  { row: "Deal pipeline + tags (CRM)", key: "pipeline" },
  { row: "Save deals", key: "save_deal" },
  { row: "Compare deals side-by-side", key: "compare_deals" },
];

/** Pull the [label, free, pro] tuple for a row out of the page source. */
function pricingCells(row: string): { free: string; pro: string } | null {
  const escaped = row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = pricingSource.match(new RegExp(`\\["${escaped}",\\s*([^,]+),\\s*([^\\]]+)\\]`));
  if (!m) return null;
  return { free: m[1]!.trim(), pro: m[2]!.trim() };
}

/** A cell is "included" unless it is the literal false. */
const included = (cell: string) => cell !== "false";

describe("/pricing table agrees with the entitlement catalog", () => {
  it.each(PRICING_ROW_TO_FEATURE)("$row", ({ row, key }) => {
    const cells = pricingCells(row);
    // A renamed row must be re-mapped here, not silently skipped — otherwise
    // the guard quietly stops guarding.
    expect(cells, `row "${row}" not found in app/pricing/page.tsx — update this map`).not.toBeNull();
    expect(included(cells!.free), `Free column for "${row}"`).toBe(tierHas("free", key));
    expect(included(cells!.pro), `Pro column for "${row}"`).toBe(tierHas("pro", key));
  });
});

describe("homepage ladder is derived, not hand-typed", () => {
  it("builds its cells from the catalog", () => {
    expect(landingSource).toMatch(/ladderCellsForFeature/);
  });

  it("no ladder row hand-types a three-cell tier tuple", () => {
    // The one allowed literal is the "Analyze unlimited deals" policy row.
    const literalTuples = landingSource.match(/cells: \[(true|false|")/g) ?? [];
    expect(literalTuples.length).toBeLessThanOrEqual(1);
  });
});

describe("catalog matches what the product actually does", () => {
  it("the $5 PDF tier includes the sections the generator really writes", () => {
    // lib/pdf-generator.ts renders projection10y / taxStrategy / exitScenarios
    // into the export, so the one-time tier must not be marked as excluding
    // them — claiming otherwise under-sells a paid product and contradicts the
    // homepage FAQ.
    const pdf = readFileSync(join(ROOT, "lib/pdf-generator.ts"), "utf8");
    for (const key of ["projections", "tax_strategy", "exit_scenarios"] as const) {
      expect(tierHas("one_time_pdf", key), `${key} in the $5 PDF`).toBe(true);
    }
    expect(pdf).toMatch(/projection10y/);
    expect(pdf).toMatch(/taxStrategy/);
    expect(pdf).toMatch(/exitScenarios/);
  });

  it("free-tier saving stays freemium (5 deals), matching lib/entitlements", () => {
    expect(tierHas("free", "save_deal")).toBe(true);
    expect(FEATURE_CATALOG.save_deal.freeLimit).toMatch(/5/);
  });
});
