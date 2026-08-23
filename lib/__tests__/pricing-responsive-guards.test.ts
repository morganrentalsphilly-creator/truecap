import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");

describe("pricing responsive hierarchy", () => {
  it("uses cards on phones and a table only from the small breakpoint", () => {
    expect(page).toContain('className="tc-reveal mt-8 space-y-2 sm:hidden"');
    expect(page).toContain("MobileFeatureValue");
    expect(page).toContain("sm:block");
    expect(page).not.toContain('min-w-[520px]');
  });

  it("keeps exhaustive comparison data in one shared list", () => {
    expect(page.match(/const FEATURE_COMPARISON/g)).toHaveLength(1);
    expect(page.match(/FEATURE_COMPARISON\.map/g)).toHaveLength(2);
  });
});
