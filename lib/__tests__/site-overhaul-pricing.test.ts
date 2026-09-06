/**
 * Phase 9 (docs/site-overhaul.md) structural guards for /pricing:
 * amounts come from one config file, the page leads with the outcome line,
 * the toggle opens on annual, and the DealCheck comparison links to /vs/dealcheck.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEALCHECK_COMPARISON,
  formatUsdWhole,
  PRICING_OUTCOME_EXAMPLE,
} from "@/lib/public-pricing";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Drop block and line comments so a documented example does not count as JSX. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

const PRICING_SURFACES = [
  "app/pricing/page.tsx",
  "components/marketing/pricing-toggle-plans.tsx",
  "components/marketing/pricing-plan-buttons.tsx",
  "components/marketing/pricing-value-stack.tsx",
];

describe("Phase 9 — pricing page", () => {
  it("hard-codes no dollar amounts in pricing JSX (only the free tier's $0)", () => {
    for (const rel of PRICING_SURFACES) {
      const amounts = [...stripComments(read(rel)).matchAll(/\$\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0]);
      expect(amounts.filter((a) => a !== "$0"), rel).toEqual([]);
    }
  });

  it("leads with the outcome line computed from the pricing config", () => {
    const page = read("app/pricing/page.tsx");
    expect(page).toContain("PRICING_OUTCOME_EXAMPLE");
    expect(page).toContain("before you collect a dollar of rent");
    expect(PRICING_OUTCOME_EXAMPLE.overpayPct).toBe(3);
    expect(formatUsdWhole(PRICING_OUTCOME_EXAMPLE.purchasePriceUsd)).toBe("$250,000");
    expect(formatUsdWhole(PRICING_OUTCOME_EXAMPLE.overpayUsd)).toBe("$7,500");
    // The outcome h1 comes before the plans section.
    expect(page.indexOf("data-pricing-outcome")).toBeLessThan(page.indexOf('id="plans"'));
  });

  it("opens on annual with the effective monthly figure and the real annual charge", () => {
    const toggle = read("components/marketing/pricing-toggle-plans.tsx");
    expect(toggle).toContain('activePaidPlanSlug?.endsWith("_monthly") ? "monthly" : "annual"');
    expect(toggle).toContain("annualMonthlyEquivalent");
    expect(toggle).toContain("billed annually");
  });

  it("carries one honest DealCheck comparison that links to /vs/dealcheck", () => {
    const page = read("app/pricing/page.tsx");
    expect(page).toContain("data-pricing-comparison");
    expect(page).toContain("DEALCHECK_COMPARISON.plusMonthlyUsd");
    expect(page).toContain("DEALCHECK_COMPARISON.proMonthlyUsd");
    expect(page).toContain("If you only need metrics");
    expect(DEALCHECK_COMPARISON.href).toBe("/vs/dealcheck");
    expect(DEALCHECK_COMPARISON.plusMonthlyUsd).toBe(10);
    expect(DEALCHECK_COMPARISON.proMonthlyUsd).toBe(20);
  });

  it("keeps the trust row, the tier shots, the testimonials, and the FAQ on the page", () => {
    const page = read("app/pricing/page.tsx");
    expect(page).toContain("data-pricing-trust-row");
    expect(page).toContain('href="/methodology"');
    expect(page).toContain("Cancel anytime");
    expect(page).toContain("Stripe");
    expect(page).toContain("<Testimonials");
    expect(page).toContain("<ProductShot");
    expect(page).toContain('"@type": "FAQPage"');
  });
});
