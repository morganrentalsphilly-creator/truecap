import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");

describe("pricing responsive hierarchy", () => {
  it("uses ruled rows on phones and a table only from the small breakpoint", () => {
    // Phones: one ruled row per feature (DESIGN.md: rules, not a stack of
    // cards), hidden from 640px. The table appears only from 640px.
    expect(page).toContain('<ul className="mt-8 border-t-2 border-foreground sm:hidden">');
    expect(page).toContain('<li key={label} className="border-b border-rule-soft py-3">');
    expect(page).toContain(
      '<ScrollX label="Table" className="mt-8 hidden border-t-2 border-foreground sm:block">',
    );
    expect(page).toContain("MobileFeatureValue");
    expect(page).not.toContain('min-w-[520px]');
    // The scroll reveal is retired on marketing pages (one motion per page).
    expect(page).not.toContain("tc-reveal");
  });

  it("keeps exhaustive comparison data in one shared list", () => {
    expect(page.match(/const FEATURE_COMPARISON/g)).toHaveLength(1);
    expect(page.match(/FEATURE_COMPARISON\.map/g)).toHaveLength(2);
  });
});
