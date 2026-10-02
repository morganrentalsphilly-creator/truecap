import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRICING_PERIOD_STORAGE_KEY,
  readStoredBillingPeriod,
  storeBillingPeriod,
} from "@/components/marketing/pricing-period-storage";

/**
 * /pricing keeps the billing period the visitor pressed.
 *
 * The Monthly/Annual toggle was React state only, and the page is rendered
 * again on every return, so Back from sign-up kept the scroll position and
 * reset Monthly to Annual: the cards changed price without the visitor
 * asking (audit row P2-40, 8 of 8 runs). The pressed period is now written
 * to the tab's sessionStorage and read back on mount. The default is
 * unchanged (Annual, or Monthly for a monthly subscriber:
 * site-overhaul-pricing.test.ts), and a subscriber's page still opens on
 * their own plan's period.
 */

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("/pricing billing period, kept for the tab", () => {
  it("reads back exactly the period that was pressed", () => {
    const storage = memoryStorage();
    expect(readStoredBillingPeriod(storage)).toBeNull();
    storeBillingPeriod(storage, "monthly");
    expect(storage.data.get(PRICING_PERIOD_STORAGE_KEY)).toBe("monthly");
    expect(readStoredBillingPeriod(storage)).toBe("monthly");
    storeBillingPeriod(storage, "annual");
    expect(readStoredBillingPeriod(storage)).toBe("annual");
  });

  it("ignores anything that is not one of the two periods", () => {
    for (const junk of ["", "Monthly", "quarterly", "checkout_cancelled", "1"]) {
      expect(
        readStoredBillingPeriod(memoryStorage({ [PRICING_PERIOD_STORAGE_KEY]: junk })),
        junk,
      ).toBeNull();
    }
  });

  it("falls back to the default when storage is missing or blocked", () => {
    expect(readStoredBillingPeriod(null)).toBeNull();
    expect(readStoredBillingPeriod(undefined)).toBeNull();
    expect(readStoredBillingPeriod(throwingStorage)).toBeNull();
    expect(() => storeBillingPeriod(null, "monthly")).not.toThrow();
    expect(() => storeBillingPeriod(throwingStorage, "monthly")).not.toThrow();
  });

  it("is wired into the toggle: written on a press, read once mounted", () => {
    const toggle = readFileSync(
      join(process.cwd(), "components/marketing/pricing-toggle-plans.tsx"),
      "utf8",
    );
    // Both segments go through the handler that stores the choice; neither
    // sets the state directly.
    expect(toggle).toContain('onClick={() => choosePeriod("monthly")}');
    expect(toggle).toContain('onClick={() => choosePeriod("annual")}');
    expect(toggle).not.toMatch(/onClick=\{\(\) => setPeriod\(/);
    expect(toggle).toMatch(
      /const choosePeriod = \(next: BillingPeriod\) => \{\s*setPeriod\(next\);\s*storeBillingPeriod\(browserSessionStorage\(\), next\);\s*\};/,
    );
    // Read in an effect (after mount), never in the initial state, so the
    // server render and the first client render agree; and never for a
    // subscriber, whose page opens on their own plan's period.
    expect(toggle).toMatch(
      /useEffect\(\(\) => \{\s*if \(activePaidPlanSlug != null\) return;\s*const stored = readStoredBillingPeriod\(browserSessionStorage\(\)\);\s*if \(stored\) setPeriod\(stored\);\s*\}, \[activePaidPlanSlug\]\);/,
    );
    expect(toggle).not.toMatch(/useState<BillingPeriod>\(\s*readStoredBillingPeriod/);
    // The key holds a display preference only: it is not part of any href,
    // checkout call or analytics event in the plan components.
    const buttons = readFileSync(
      join(process.cwd(), "components/marketing/pricing-plan-buttons.tsx"),
      "utf8",
    );
    expect(buttons).not.toContain("pricing-period-storage");
  });
});
