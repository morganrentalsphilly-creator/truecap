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
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_CATALOG, tierHas, type FeatureKey } from "@/lib/entitlements-catalog";
import {
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";

const ROOT = join(__dirname, "..", "..");
const pricingSource = readFileSync(join(ROOT, "app/pricing/page.tsx"), "utf8");
const landingSource = readFileSync(join(ROOT, "components/marketing/landing-sections.tsx"), "utf8");
const roiCalculatorSource = readFileSync(
  join(ROOT, "components/marketing/roi-calculator-widget.tsx"),
  "utf8"
);

/**
 * /pricing rows mapped to the catalog feature they describe. Rows with no
 * entitlement flag (priority support, due-diligence checklist, alerts) are
 * deliberately absent — there is nothing in the catalog to check them against.
 */
const PRICING_ROW_TO_FEATURE: { row: string; key: FeatureKey }[] = [
  { row: "Sale + rent comps from the address", key: "comps" },
  { row: "Shareable read-only deal links", key: "share_links" },
  { row: "10-year cash flow projection", key: "projections" },
  { row: "Illustrative tax impact + depreciation", key: "tax_strategy" },
  { row: "Modeled exit-year comparison", key: "exit_scenarios" },
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
  it("keeps one documented public fallback while Stripe remains billing authority", () => {
    expect(PUBLIC_PRO_MONTHLY_USD).toBe(29.99);
    expect(PUBLIC_PRO_ANNUAL_USD).toBe(300);
    expect(roiCalculatorSource).toContain("PUBLIC_PRO_MONTHLY_USD");
    expect(roiCalculatorSource).not.toMatch(/const PRO_MONTHLY_PRICE\s*=/);
  });

  it("the $5 PDF tier includes the sections the generator really writes", () => {
    // lib/pdf-generator.ts renders projection10y / taxStrategy / exitScenarios
    // into the export, so the one-time tier must not be marked as excluding
    // them — claiming otherwise under-sells a paid product and contradicts the
    // homepage FAQ.
    const pdf = readFileSync(join(ROOT, "lib/pdf-generator.ts"), "utf8");
    for (const key of ["projections", "tax_strategy", "exit_scenarios", "mao"] as const) {
      expect(tierHas("one_time_pdf", key), `${key} in the $5 PDF`).toBe(true);
    }
    expect(pdf).toMatch(/projection10y/);
    expect(pdf).toMatch(/taxStrategy/);
    expect(pdf).toMatch(/exitScenarios/);
    expect(pdf).toMatch(/maxOffer/);
  });

  it("free-tier saving stays freemium (5 deals), matching lib/entitlements", () => {
    expect(tierHas("free", "save_deal")).toBe(true);
    expect(FEATURE_CATALOG.save_deal.freeLimit).toMatch(/5/);
  });
});

describe("unshipped entitlements never reach a marketing surface", () => {
  // Runtime entitlement strings can exist before a feature is marketable.
  // `shipped: false` is the fail-closed contract for implementation, legal, or
  // operational readiness; catalog-derived pricing must filter those entries.
  const unshipped = (Object.values(FEATURE_CATALOG) as { key: string; shipped?: boolean; label: string }[])
    .filter((f) => f.shipped === false);

  it("flipping one to shipped requires a real runtime consumer", () => {
    // The contract: an agent feature may only be advertised once something
    // actually gates on it. If a future change flips shipped:true (or removes
    // the flag) without wiring hasPlanFeature("<key>") anywhere, this fails.
    // Walk the filesystem (not `git ls-files`) so a brand-new, not-yet-tracked
    // consumer still counts — the whole point of this guard is to run BEFORE a
    // commit that ships the feature.
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === "node_modules" || ent.name === ".next" || ent.name.startsWith(".")) continue;
        const full = join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
      }
      return out;
    };
    const sources = ["app", "components", "lib"]
      .flatMap((d) => walk(join(ROOT, d)))
      .filter((f) => !f.includes("__tests__"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    for (const key of ["agent_portal", "embed_whitelabel"] as const) {
      const flaggedUnshipped = FEATURE_CATALOG[key].shipped === false;
      const hasConsumer = sources.includes(`hasPlanFeature(entitlements, "${key}")`) ||
        sources.includes(`hasPlanFeature(ent, "${key}")`);
      expect(
        flaggedUnshipped || hasConsumer,
        `${key} is marked shipped but nothing consumes it — build the feature before advertising it`
      ).toBe(true);
    }
  });

  it("pricing card + profile switcher render no unshipped feature label", () => {
    const toggleSrc = readFileSync(join(ROOT, "components/marketing/pricing-toggle-plans.tsx"), "utf8");
    const profileSrc = readFileSync(join(ROOT, "app/profile/page.tsx"), "utf8");
    expect(toggleSrc).toMatch(/f\.shipped !== false/);
    expect(profileSrc).toMatch(/feature\.shipped !== false/);
    for (const f of unshipped) {
      // The literal label must not be hand-typed on either surface (comments
      // mentioning the concept are fine — we match the exact marketing label).
      expect(profileSrc).not.toContain(f.label);
    }
  });

  it("keeps unsafe public-link features out of the offer until their controls are ready", () => {
    expect(FEATURE_CATALOG.agent_portal.shipped).toBe(false);
    expect(FEATURE_CATALOG.embed_whitelabel.shipped).toBe(false);
    const marketedAgentKeys = Object.values(FEATURE_CATALOG)
      .filter((feature) => feature.tiers.includes("agent_pro") && feature.shipped !== false)
      .map((feature) => feature.key);
    expect(marketedAgentKeys).not.toContain("agent_portal");
    expect(marketedAgentKeys).not.toContain("embed_whitelabel");
  });

  it("also enforces unshipped status at every public runtime entry point", () => {
    const releaseGatedSources = [
      "app/settings/page.tsx",
      "app/actions/whitelabel-embed.ts",
      "lib/whitelabel-embed.ts",
      "app/dashboard/clients/page.tsx",
      "app/actions/agent-clients.ts",
      "lib/client-portal.ts",
    ];
    for (const path of releaseGatedSources) {
      expect(readFileSync(join(ROOT, path), "utf8"), path).toContain("isFeatureReleased");
    }

    const agentsPage = readFileSync(join(ROOT, "app/for-agents/page.tsx"), "utf8");
    expect(agentsPage).not.toMatch(/client portal|white-label embed/i);
  });
});
