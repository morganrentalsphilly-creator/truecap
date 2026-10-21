import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { YourDealsTable } from "@/components/dashboard/your-deals-table";
import {
  offerCeilingGap,
  type DashboardDeal,
} from "@/lib/dashboard-deal-mapping";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

function deal(
  id: string,
  purchasePrice: number | null,
  maxOffer: number | null,
): DashboardDeal {
  return {
    id,
    address: `${id} Test St, Philadelphia, PA 19140`,
    propertyType: "single-family",
    propertyTypeLabel: "Single-family",
    purchasePrice,
    cashFlowMonthly: 120,
    annualCashFlow: 1440,
    cocReturnPct: 5,
    capRatePct: 6,
    dscr: 1.3,
    monthlyPayment: 1400,
    roiPct: null,
    score: 70,
    recommendation: "Buy",
    riskLevel: null,
    riskScore: null,
    tags: [],
    maxOffer,
    maxOfferBasisLabel: maxOffer == null ? null : "Cash flow ≥ $0/mo",
    offerGap: offerCeilingGap(purchasePrice, maxOffer),
  };
}

describe("the gap between the price and the Offer Ceiling", () => {
  it("is the price minus the ceiling, Compare's sign convention", () => {
    expect(offerCeilingGap(265_000, 236_000)).toBe(29_000);
    expect(offerCeilingGap(230_000, 238_000)).toBe(-8_000);
    expect(offerCeilingGap(250_000, 250_000)).toBe(0);
  });

  it("is null without both numbers, never the full price", () => {
    expect(offerCeilingGap(265_000, null)).toBeNull();
    expect(offerCeilingGap(null, 236_000)).toBeNull();
    expect(offerCeilingGap(265_000, Number.NaN)).toBeNull();
  });
});

describe("the dashboard home's deal list (2026-10 audit, Q1)", () => {
  const html = renderToStaticMarkup(
    createElement(YourDealsTable, {
      deals: [
        deal("over", 265_000, 236_000),
        deal("under", 230_000, 238_000),
        deal("at", 250_000, 250_000),
        deal("none", 240_000, null),
      ],
    }),
  );

  it("shows the gap as a signed figure, green or red by the Sign rule", () => {
    // A price above the ceiling misses the targets: plus, red. One under it
    // passes: a true minus sign, green. At the ceiling it passes too.
    expect(html).toMatch(
      /<span class="[^"]*font-figure[^"]*text-negative[^"]*"><span aria-hidden="true">\+\$29,000<\/span>/,
    );
    expect(html).toMatch(
      /<span class="[^"]*font-figure[^"]*text-positive[^"]*"><span aria-hidden="true">−\$8,000<\/span>/,
    );
    expect(html).toMatch(
      /<span class="[^"]*font-figure[^"]*text-positive[^"]*"><span aria-hidden="true">\$0<\/span>/,
    );
    // The direction is spoken in words, not left to the sign or the colour.
    expect(html).toContain("$29,000 above the Offer Ceiling");
    expect(html).toContain("$8,000 below the Offer Ceiling");
    expect(html).toContain("Equal to the Offer Ceiling");
    expect(html).toContain("No Offer Ceiling, so no gap");
  });

  it("opens with the most room under the ceiling first", () => {
    const under = html.indexOf("under Test St");
    const at = html.indexOf("at Test St");
    const over = html.indexOf("over Test St");
    const none = html.indexOf("none Test St");
    expect(under).toBeGreaterThan(-1);
    expect(under).toBeLessThan(at);
    expect(at).toBeLessThan(over);
    expect(over).toBeLessThan(none);
  });

  it("heads a model-version group only when the book mixes versions", () => {
    // One version: nothing to separate, so no header band tops the list.
    expect(html).not.toContain("Sorted only within this model version");
    const recorded = (d: DashboardDeal, key: string, label: string) => ({
      ...d,
      methodologyComparisonKey: key,
      methodologyGroupLabel: label,
      methodologyIsCurrent: key.startsWith("current"),
    });
    const mixed = renderToStaticMarkup(
      createElement(YourDealsTable, {
        deals: [
          recorded(deal("a", 265_000, 236_000), "current:1.3", "Current v1.3"),
          recorded(deal("b", 230_000, 238_000), "recorded:1.2", "Recorded v1.2"),
        ],
      }),
    );
    expect(mixed).toContain("Sorted only within this model version");
    expect(mixed).toContain("Recorded v1.2");
  });

  it("puts each row on a line, with no card per deal", () => {
    expect(html).not.toContain("<article");
    expect(html).not.toMatch(/rounded-lg border border-border bg-card/);
    expect(html).toContain('<ul class="border-t border-foreground">');
  });

  it("formats the gap and never computes it", () => {
    const table = read("components/dashboard/your-deals-table.tsx");
    expect(table).toContain("deal.offerGap");
    expect(table).not.toMatch(/purchasePrice\s*-\s*/);
    expect(table).not.toMatch(/-\s*deal\.maxOffer/);
    // The page sets it beside the solved ceiling, inside the paid gate.
    const page = read("app/dashboard/page.tsx");
    const gate = page.indexOf("if (canShowMao) {");
    const gap = page.indexOf(
      "offerGap: offerCeilingGap(deal.purchasePrice, maxOffer)",
    );
    expect(gate).toBeGreaterThan(-1);
    expect(gap).toBeGreaterThan(gate);
  });

  it("leads the focused home, with the Decision center under it", () => {
    const home = read("components/dashboard/DashboardHome.tsx");
    const focused = home.slice(
      home.indexOf("{focusedDashboard ? ("),
      home.indexOf("{/* ── Replaced modules."),
    );
    const list = focused.indexOf("<YourDealsTable");
    const highlights = focused.indexOf("{decisionCenterSection}");
    const record = focused.indexOf("<ScreeningRecord");
    expect(list).toBeGreaterThan(-1);
    expect(highlights).toBeGreaterThan(list);
    expect(record).toBeGreaterThan(list);
    // Above the list, the Decision center renders only for the kill-switch
    // layout; no KPI tile renders before the list on the focused home.
    expect(home).toContain(
      "{!focusedDashboard ? decisionCenterSection : null}",
    );
    const beforeList = home.slice(
      home.indexOf('<main\n        id="main"'),
      home.indexOf("{focusedDashboard ? ("),
    );
    expect(beforeList).not.toContain("<StatCard");
  });
});
