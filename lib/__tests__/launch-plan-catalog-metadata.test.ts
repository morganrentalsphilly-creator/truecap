import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PLAN_CATALOG } from "@/lib/public-pricing";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260830120000_reconcile_launch_plan_catalog_metadata.sql",
  ),
  "utf8",
);
const executableMigration = migration.replace(/--.*$/gm, "");

function updateFor(slug: string): string {
  const marker = `where slug = '${slug}';`;
  const end = executableMigration.indexOf(marker);
  expect(end).toBeGreaterThan(-1);
  const start = executableMigration.lastIndexOf("update public.plans", end);
  expect(start).toBeGreaterThan(-1);
  return executableMigration.slice(start, end + marker.length);
}

describe("launch plan catalog metadata reconciliation", () => {
  it.each([
    ["pro_monthly", PLAN_CATALOG.pro_monthly.unitAmountUsd, "month", 0],
    ["pro_annual", PLAN_CATALOG.pro_annual.unitAmountUsd, "year", 17],
    [
      "agent_pro_monthly",
      PLAN_CATALOG.agent_pro_monthly.unitAmountUsd,
      "month",
      0,
    ],
    [
      "agent_pro_annual",
      PLAN_CATALOG.agent_pro_annual.unitAmountUsd,
      "year",
      18,
    ],
  ] as const)(
    "keeps %s metadata aligned with the executable catalog",
    (slug, amountUsd, interval, discountPct) => {
      const statement = updateFor(slug);
      expect(statement).toContain(
        `price_cents = ${Math.round(amountUsd * 100)}`,
      );
      expect(statement).toContain(`billing_interval = '${interval}'`);
      expect(statement).toContain("currency = 'usd'");
      expect(statement).toContain(`discount_pct = ${discountPct}`);
    },
  );

  it("is a forward display-only correction that preserves billing authorities", () => {
    const updates = [
      ...executableMigration.matchAll(
        /update public\.plans\s+set[\s\S]*?where slug = '([^']+)';/gi,
      ),
    ];
    const allowedColumns = [
      "billing_interval",
      "currency",
      "description",
      "discount_pct",
      "display_name",
      "price_cents",
      "sort_order",
    ];

    expect(executableMigration).toContain("begin;");
    expect(executableMigration).toContain("commit;");
    expect(updates).toHaveLength(4);
    expect(updates.map((match) => match[1]).sort()).toEqual(
      [
        "pro_monthly",
        "pro_annual",
        "agent_pro_monthly",
        "agent_pro_annual",
      ].sort(),
    );
    for (const update of updates) {
      const assignedColumns = [
        ...update[0].matchAll(/^\s*([a-z_]+)\s*=/gim),
      ].map((match) => match[1]);
      expect(assignedColumns.sort()).toEqual([...allowedColumns].sort());
    }

    expect(executableMigration).not.toMatch(
      /\b(?:stripe_price_id|entitlements|is_active)\s*=/i,
    );
    expect(executableMigration).not.toMatch(/update public\.subscriptions/i);
    expect(executableMigration).not.toMatch(/update stripe\./i);
    expect(executableMigration).not.toMatch(/delete from/i);
    expect(executableMigration).not.toMatch(
      /drop (?:table|column|constraint)/i,
    );
  });
});
