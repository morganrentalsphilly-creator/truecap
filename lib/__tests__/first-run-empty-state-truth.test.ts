import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tierHas } from "@/lib/entitlements-catalog";

/**
 * The two screens a new account sees before it has saved a deal. Both used to
 * promise things a Free account does not get: My Deals said "compare, edit,
 * and revisit" (updating a saved deal and comparing are paid), and the
 * dashboard promised "portfolio totals, top performers, and risk/return
 * analysis" (the focused dashboard is one deals table, and its Offer Ceiling
 * and Gap columns are solved for paid subscribers only).
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
    "Every saved deal appears here in one table with its asking price, screening result and Deal score. Pro adds the Offer Ceiling and the gap to asking.";
  const PAID_LINE =
    "Every saved deal appears here in one table with its Offer Ceiling and the gap to asking.";
  const OLD_LINE =
    "You'll see portfolio totals, top performers, and risk/return analysis here.";

  it("describes the deals table, and promises the Offer Ceiling to paid plans only", () => {
    expect(home).toContain(FREE_LINE);
    expect(home).toContain(PAID_LINE);
    // The pre-rebuild sentence survives for the kill-switch layout alone.
    const ternary = home.slice(
      home.indexOf("{!focusedDashboard\n                ? \"You'll see portfolio totals"),
      home.indexOf(FREE_LINE) + FREE_LINE.length + 1,
    );
    expect(ternary).toContain(OLD_LINE);
    expect(ternary).toMatch(
      /!focusedDashboard\s+\? "You'll see portfolio totals[^"]+"\s+: data\.user\.isPremium\s+\? "Every saved deal[^"]+"\s+: "Every saved deal[^"]+Pro adds the Offer Ceiling and the gap to asking\."/,
    );
    expect(home.split(OLD_LINE).length - 1).toBe(1);
  });

  it("matches the gate: the dashboard solves an Offer Ceiling for paid subscribers only", () => {
    const route = read("app/dashboard/page.tsx");
    expect(route).toContain("const canShowMao = isPremium;");
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
