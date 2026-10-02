import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tierHas } from "@/lib/entitlements-catalog";

/**
 * The two screens a new account sees before it has saved a deal. Both used to
 * promise things a Free account does not get: My Deals said "compare, edit,
 * and revisit" (updating a saved deal and comparing are paid), and the
 * dashboard promised "portfolio totals, top performers, and risk/return
 * analysis" (the focused dashboard is one table of active deals, and its
 * Offer Ceiling and Gap columns are solved for paid subscribers only).
 *
 * /dashboard needs dashboard_insights, so a Free or trial account is sent to
 * My Deals and never reads the dashboard line: its non-premium wording is a
 * fail-safe for an account that passes the route gate without a paid plan.
 *
 * Each copy assertion is paired with the gate it describes, so a change to
 * the gate fails here and sends the editor back to the sentence.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("My Deals first-run empty state", () => {
  const page = read("components/investcalc/saved-analyses-page-v2.tsx");

  it("names editing and comparison as Pro, not as something every account can do", () => {
    expect(page).not.toMatch(/compare,\s+edit,\s+and\s+revisit/);
    expect(page).toMatch(
      /so you can revisit any deal you&apos;re considering\. Pro\s+adds editing and comparison\./,
    );
  });

  it("matches the gates: updating a saved deal is paid, comparing is not on Free", () => {
    const action = read("app/actions/saved-analyses.ts");
    expect(action).toMatch(
      /const canUpdateSavedDeal = await hasPaidPlanSubscription\(supabase, user\.id\);/,
    );
    expect(action).toContain("Upgrade required to update deals in My Deals.");
    expect(tierHas("free", "compare_deals")).toBe(false);
    expect(tierHas("pro", "compare_deals")).toBe(true);
    expect(tierHas("free", "save_deal")).toBe(true);
  });
});

describe("dashboard first-run empty state", () => {
  const home = read("components/dashboard/DashboardHome.tsx");
  const FREE_LINE =
    "Active deals you save appear here in one table with asking price, screening result and Deal score. Pro adds the Offer Ceiling and the gap to asking.";
  const PAID_LINE =
    "Active deals you save appear here in one table with the Offer Ceiling and the gap to asking.";
  const OLD_LINE =
    "You'll see portfolio totals, top performers, and risk/return analysis here.";

  it("describes the deals table, and promises the Offer Ceiling to paid plans only", () => {
    expect(home).toContain(FREE_LINE);
    expect(home).toContain(PAID_LINE);
    // The pre-rebuild sentence survives for the kill-switch layout alone.
    // Anchored on a pattern, not on the block's indentation.
    const start = home.search(/\{!focusedDashboard\s+\? "You'll see portfolio totals/);
    expect(start).toBeGreaterThan(-1);
    const ternary = home.slice(
      start,
      home.indexOf(FREE_LINE) + FREE_LINE.length + 1,
    );
    expect(ternary).toContain(OLD_LINE);
    expect(ternary).toMatch(
      /!focusedDashboard\s+\? "You'll see portfolio totals[^"]+"\s+: data\.user\.isPremium\s+\? "Active deals you save[^"]+"\s+: "Active deals you save[^"]+Pro adds the Offer Ceiling and the gap to asking\."/,
    );
    expect(home.split(OLD_LINE).length - 1).toBe(1);
  });

  it("does not say every saved deal is listed: the table holds active deals only", () => {
    // This empty state is also shown to an account whose saved deals are all
    // archived, so "Every saved deal appears here" was false for its reader.
    expect(home).not.toMatch(/Every saved deal appears here/);
    const route = read("app/dashboard/page.tsx");
    expect(route).toMatch(
      /\.eq\("is_completed", false\)\s+\.eq\("is_archived", false\)\s+\.order\("created_at", \{ ascending: false \}\)\s+\.limit\(DASHBOARD_ACTIVE_DEALS_LIMIT\)/,
    );
  });

  it("matches the gate: the dashboard solves an Offer Ceiling for paid subscribers only", () => {
    const route = read("app/dashboard/page.tsx");
    expect(route).toContain("const canShowMao = isPremium;");
    // The screen itself is insights-gated: Free and trial accounts land on
    // My Deals, so the catalog's free "Dashboard access" is the area, not
    // this screen.
    expect(route).toMatch(
      /if \(!canViewDashboardInsights\) \{\s+redirect\("\/dashboard\/saved-analyses"\);/,
    );
    expect(tierHas("free", "mao")).toBe(false);
    expect(tierHas("free", "dashboard_access")).toBe(true);
  });

  it("names columns the deals table has", () => {
    const table = read("components/dashboard/your-deals-table.tsx");
    for (const column of ["Offer Ceiling", "Price", "Gap", "Screening result", "Deal score"]) {
      expect(table, column).toContain(column);
    }
  });
});
