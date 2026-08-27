import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  addToBulkDealSelection,
  MAX_BULK_DEAL_SELECTION,
  MAX_COMPARE_DEAL_SELECTION,
  reconcileSavedDealSelection,
} from "@/lib/saved-deal-selection";

describe("saved-deal selection lifecycle", () => {
  it("prunes rows that disappear or change lifecycle state on refresh", () => {
    expect(
      reconcileSavedDealSelection(
        ["kept", "removed", "changed"],
        [
          { id: "kept", status: "active" },
          { id: "removed", status: "active" },
          { id: "changed", status: "active" },
        ],
        [
          { id: "kept", status: "active" },
          { id: "changed", status: "archived" },
        ],
      ),
    ).toEqual(["kept"]);
  });

  it("allows bulk management beyond Compare's four-deal limit, up to 100", () => {
    const candidates = Array.from({ length: 101 }, (_, index) => `deal-${index}`);
    const result = addToBulkDealSelection([], candidates);

    expect(MAX_COMPARE_DEAL_SELECTION).toBe(4);
    expect(result.selectedIds).toHaveLength(MAX_BULK_DEAL_SELECTION);
    expect(result.limitReached).toBe(true);
  });
});

describe("dashboard workflow guards", () => {
  const savedDeals = readFileSync(
    join(process.cwd(), "components/investcalc/saved-analyses-page-v2.tsx"),
    "utf8",
  );
  const picker = readFileSync(
    join(process.cwd(), "components/investcalc/compare-deal-picker.tsx"),
    "utf8",
  );
  const compareLink = readFileSync(
    join(process.cwd(), "components/dashboard/compare-with-another-deal-link.tsx"),
    "utf8",
  );
  const dashboard = readFileSync(
    join(process.cwd(), "components/dashboard/DashboardHome.tsx"),
    "utf8",
  );
  const analyzer = readFileSync(
    join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
    "utf8",
  );

  it("uses synchronous compare request guards on every start surface", () => {
    for (const source of [savedDeals, picker, compareLink]) {
      expect(source).toContain("compareRequestInFlightRef.current");
      expect(source).toContain("compareRequestInFlightRef.current = true");
      expect(source).toContain("compareRequestInFlightRef.current = false");
    }
  });

  it("keeps title and primary Open actions on the durable workspace", () => {
    expect(savedDeals.match(/href=\{`\/dashboard\/saved-analyses\/\$\{item\.id\}`\}/g)).toHaveLength(4);
    expect(savedDeals).toContain("Edit assumptions");
  });

  it("makes decision-center highlights operable and clears failed reopen URLs", () => {
    expect(dashboard).toContain("Open highest-screening deal");
    expect(dashboard).toContain("Review deal →");
    expect(dashboard).toContain("Open highest modeled-upside deal");

    const failedReopen = analyzer.slice(
      analyzer.indexOf("if (initialSavedDeal && !initialSavedDeal.ok)"),
      analyzer.indexOf("const reopenPayloadRaw"),
    );
    expect(failedReopen).toContain("replaceSavedDealUrl(null)");
  });
});
