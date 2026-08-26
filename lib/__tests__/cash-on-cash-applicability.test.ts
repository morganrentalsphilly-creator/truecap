import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  applicableCashOnCashValue,
  isCashOnCashNotApplicable,
} from "../cash-on-cash-applicability";

const read = (path: string) =>
  readFileSync(join(import.meta.dirname, "../..", path), "utf8");

describe("cash-on-cash applicability", () => {
  it("returns N/A for every numeric sentinel when modeled cash invested is zero", () => {
    expect(isCashOnCashNotApplicable(0)).toBe(true);
    expect(applicableCashOnCashValue(0, 0)).toBeNull();
    expect(applicableCashOnCashValue(1_000_000, 0)).toBeNull();
  });

  it("preserves finite legacy CoC when the historical denominator is unknown", () => {
    expect(isCashOnCashNotApplicable(null)).toBe(false);
    expect(applicableCashOnCashValue(7.25, null)).toBe(7.25);
    expect(applicableCashOnCashValue(7.25, undefined)).toBe(7.25);
  });

  it("fails closed for non-finite values and non-positive explicit denominators", () => {
    expect(applicableCashOnCashValue(Number.NaN, 50_000)).toBeNull();
    expect(applicableCashOnCashValue(Number.POSITIVE_INFINITY, 50_000)).toBeNull();
    expect(applicableCashOnCashValue(8, -1)).toBeNull();
  });

  it("routes every saved-deal/dashboard consumer through the shared rule", () => {
    for (const path of [
      "lib/dashboard-deal-mapping.ts",
      "app/dashboard/page.tsx",
      "components/dashboard/DashboardHome.tsx",
      "components/dashboard/portfolio-rollup-strip.tsx",
      "app/dashboard/saved-analyses/page.tsx",
      "components/investcalc/saved-analyses-page-v2.tsx",
      "app/dashboard/saved-analyses/[id]/page.tsx",
    ]) {
      expect(read(path), path).toContain("applicableCashOnCashValue");
    }
  });
});
