import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildDashboardSavedSearchHref,
  DASHBOARD_SAVED_SEARCH_PARAM,
  normalizeDashboardSavedSearchQuery,
  removeDashboardSavedSearchParam,
} from "@/lib/dashboard-saved-search-bridge";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("durable My Deals search intent", () => {
  it("builds a refresh-safe search URL across every saved-deal lifecycle", () => {
    const href = buildDashboardSavedSearchHref("  2560 Collins St #2 & Rear  ");

    expect(href).not.toBeNull();
    const url = new URL(href!, "https://usetruecap.com");
    expect(url.pathname).toBe("/dashboard/saved-analyses");
    expect(url.searchParams.get(DASHBOARD_SAVED_SEARCH_PARAM)).toBe(
      "2560 Collins St #2 & Rear",
    );
    expect(url.searchParams.get("state")).toBe("all");
  });

  it("rejects blank intent and bounds URL-controlled search text", () => {
    expect(buildDashboardSavedSearchHref("   ")).toBeNull();
    expect(normalizeDashboardSavedSearchQuery("x".repeat(150))).toHaveLength(
      100,
    );
  });

  it("removes only q after local edits while preserving the rest of the view", () => {
    expect(
      removeDashboardSavedSearchParam(
        "https://usetruecap.com/dashboard/saved-analyses?q=Collins&state=all&sort=price&dir=asc&client=abc#deals",
      ),
    ).toBe(
      "/dashboard/saved-analyses?state=all&sort=price&dir=asc&client=abc#deals",
    );
  });

  it("reacts to URL search changes and clears conflicting list state", () => {
    const topbar = read("components/dashboard/Topbar.tsx");
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");

    expect(topbar).toContain("buildDashboardSavedSearchHref(value)");
    expect(topbar).toContain("window.location.assign(href)");
    expect(topbar).toContain('fetch("/api/dashboard/search-suggestions"');
    expect(topbar).toContain('method: "POST"');
    expect(topbar).not.toContain("search-suggestions?q=");
    expect(topbar).toContain("DASHBOARD_SAVED_SEARCH_RELEASE_EVENT");
    expect(topbar).toContain(
      'router.push("/dashboard/saved-analyses?state=all")',
    );
    expect(topbar).toContain("reportDashboardSavedSearchReleased();");
    expect(topbar).not.toContain("setPendingSavedListSearch");

    expect(list).toContain("searchParams.get(DASHBOARD_SAVED_SEARCH_PARAM)");
    expect(list).toContain("[explicitSearchQuery, viewHydrated]");
    for (const reset of [
      'setSelectedSignal("all")',
      'setSelectedType("all")',
      "setBuyBoxOnly(false)",
      "setShowcompare(false)",
      "setSelectedIds([])",
      "setCurrentPage(1)",
    ]) {
      expect(list).toContain(reset);
    }
    expect(list).not.toContain("consumePendingSavedListSearch");
    expect(list).toContain("handleSearchQueryChange(event.target.value)");
    expect(list).toContain("releaseUrlBackedSearch();");
    expect(list).toContain(
      'window.history.replaceState(window.history.state, "", nextHref)',
    );
    expect(list).toContain("reportDashboardSavedSearchReleased();");
    expect(list).toContain("DASHBOARD_SAVED_SEARCH_RELEASE_EVENT");
    expect(list).toContain('setSearchQuery("")');
  });
});

describe("comparison and bulk-selection separation", () => {
  it("does not seed destructive row selection from the comparison cookie", () => {
    const route = read("app/dashboard/saved-analyses/page.tsx");
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const compareRoute = read("app/dashboard/compare/page.tsx");

    expect(route).not.toContain("getCompareIdsFromCookie");
    expect(route).not.toContain("initialSelectedIds={compareIds}");
    expect(list).not.toContain("initialSelectedIds");
    expect(list).toContain(
      "const [selectedIds, setSelectedIds] = useState<string[]>([])",
    );

    // Compare still owns and restores its cookie-backed membership; only My
    // Deals' destructive checkbox state is reset.
    expect(compareRoute).toContain("getCompareIdsFromCookie()");
  });

  it("keeps Compare and Clear visible while destructive actions live under Manage", () => {
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const selectedBar = list.slice(
      list.indexOf('aria-label="Selected deal actions"'),
      list.indexOf("{/* Listener for the proof moment"),
    );

    expect(selectedBar).toContain("handleCompareSelected");
    expect(selectedBar).toContain("Compare");
    expect(selectedBar).toContain("setSelectedIds([])");
    expect(selectedBar).toContain("Clear");
    expect(selectedBar).toContain('className="h-11');
    expect(selectedBar).toContain('aria-label="Manage selected deals"');
    expect(selectedBar).toContain("Archive selected");
    expect(selectedBar).toContain("Delete selected");
    expect(selectedBar.indexOf("DropdownMenuContent")).toBeLessThan(
      selectedBar.indexOf("Archive selected"),
    );
    expect(selectedBar.indexOf("DropdownMenuContent")).toBeLessThan(
      selectedBar.indexOf("Delete selected"),
    );
  });
});
