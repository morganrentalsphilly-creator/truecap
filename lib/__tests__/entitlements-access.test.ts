import { describe, it, expect } from "vitest";
import {
  hasPlanFeature,
  hasSavedDealCapacity,
  hasDashboardAccess,
  hasDashboardInsightsAccess,
  getDashboardNavAccess,
} from "@/lib/entitlements";

/**
 * Access-decision guards for the entitlement helpers (issue #3 — gating
 * consistency). These lock the free / pro / logged-out matrix so the routes
 * and the nav can share ONE source of truth and never drift apart again:
 *
 *  - logged-out / fail-closed free  → cash_flow only
 *  - free (seeded, freemium)        → cash_flow, save_deal (≤5), dashboard_access, deal_score
 *  - pro                            → everything
 *
 * The load-bearing distinction the UI dead-end bug turned on: a free user HAS
 * `dashboard_access` (the area / My Deals) but NOT `dashboard_insights` (the
 * Overview home). `overview` in the nav map must follow insights, `dashboard`
 * must follow access — see getDashboardNavAccess.
 */

// Fail-closed fallback (lib/entitlements.ts defaultFree) — also the effective
// entitlement set for a logged-out visitor who has no plan row.
const CASH_FLOW_ONLY = { features: ["cash_flow"], max_saved_deals: 0 };

// Current seeded FREE plan (freemium): save up to 5 + My Deals + Deal Score.
const FREE = {
  features: ["cash_flow", "save_deal", "dashboard_access", "deal_score"],
  max_saved_deals: 5,
};

// Seeded PRO (monthly == annual).
const PRO = {
  features: [
    "cash_flow",
    "save_deal",
    "dashboard_access",
    "dashboard_insights",
    "compare_deals",
    "deal_score",
    "tax_strategy",
    "projections",
    "exit_scenarios",
    "template_manage",
    "pdf_export",
    "custom_branding",
    "buy_box",
    "pipeline",
  ],
  max_saved_deals: null as number | null,
};

describe("dashboard access (area) — free & pro in, cash-flow-only out", () => {
  it("free and pro can enter the dashboard area; a cash-flow-only user cannot", () => {
    expect(hasDashboardAccess(FREE)).toBe(true);
    expect(hasDashboardAccess(PRO)).toBe(true);
    expect(hasDashboardAccess(CASH_FLOW_ONLY)).toBe(false);
  });

  it("requires BOTH dashboard_access and save_deal (neither alone is enough)", () => {
    expect(hasDashboardAccess({ features: ["dashboard_access"] })).toBe(false);
    expect(hasDashboardAccess({ features: ["save_deal"] })).toBe(false);
  });
});

describe("dashboard INSIGHTS (Overview home) — pro only", () => {
  it("only pro sees insights; free (has area access, not insights) does not", () => {
    expect(hasDashboardInsightsAccess(PRO)).toBe(true);
    expect(hasDashboardInsightsAccess(FREE)).toBe(false);
    expect(hasDashboardInsightsAccess(CASH_FLOW_ONLY)).toBe(false);
  });
});

describe("Pro-only routes — compare & templates gated, free blocked", () => {
  it("compare_deals is pro-only", () => {
    expect(hasPlanFeature(PRO, "compare_deals")).toBe(true);
    expect(hasPlanFeature(FREE, "compare_deals")).toBe(false);
    expect(hasPlanFeature(CASH_FLOW_ONLY, "compare_deals")).toBe(false);
  });

  it("template_manage is pro-only", () => {
    expect(hasPlanFeature(PRO, "template_manage")).toBe(true);
    expect(hasPlanFeature(FREE, "template_manage")).toBe(false);
  });
});

describe("save_deal — a free feature (create AND update share this one gate)", () => {
  it("free and pro both hold save_deal; logged-out/cash-flow-only do not", () => {
    expect(hasPlanFeature(FREE, "save_deal")).toBe(true);
    expect(hasPlanFeature(PRO, "save_deal")).toBe(true);
    expect(hasPlanFeature(CASH_FLOW_ONLY, "save_deal")).toBe(false);
  });

  it("free is capped at 5 saved deals; pro is unlimited", () => {
    expect(hasSavedDealCapacity(FREE, 4)).toBe(true);
    expect(hasSavedDealCapacity(FREE, 5)).toBe(false);
    expect(hasSavedDealCapacity(PRO, 5000)).toBe(true);
  });
});

describe("getDashboardNavAccess — nav presence agrees with route landing", () => {
  it("free: area yes, overview NO, my deals yes, compare/templates NO", () => {
    const nav = getDashboardNavAccess(FREE);
    expect(nav).toEqual({
      dashboard: true,
      overview: false,
      myDeals: true,
      compareDeals: false,
      templates: false,
      clients: false,
    });
  });

  it("pro: everything on EXCEPT the Agent-Pro-only Clients nav", () => {
    const nav = getDashboardNavAccess(PRO);
    expect(nav).toEqual({
      dashboard: true,
      overview: true,
      myDeals: true,
      compareDeals: true,
      templates: true,
      // Clients is agent_pro's client_buy_box — a $29.99 Pro user must never
      // see a nav item for a tier they aren't on.
      clients: false,
    });
  });

  it("agent pro: the Clients nav lights up", () => {
    const nav = getDashboardNavAccess({ features: [...PRO.features, "client_buy_box"] });
    expect(nav.clients).toBe(true);
    // …and every Pro item still holds (agent_pro is a superset of pro).
    expect(nav.myDeals).toBe(true);
    expect(nav.compareDeals).toBe(true);
    expect(nav.templates).toBe(true);
  });

  it("logged-out / cash-flow-only: nothing on", () => {
    const nav = getDashboardNavAccess(CASH_FLOW_ONLY);
    expect(nav).toEqual({
      dashboard: false,
      overview: false,
      myDeals: false,
      compareDeals: false,
      templates: false,
      clients: false,
    });
  });

  it("overview never outruns dashboard access (insights ⊆ access)", () => {
    // A malformed plan that granted insights without access must not light the
    // Overview link — hasDashboardInsightsAccess requires access as a floor.
    const nav = getDashboardNavAccess({ features: ["dashboard_insights"] });
    expect(nav.dashboard).toBe(false);
    expect(nav.overview).toBe(false);
  });
});
