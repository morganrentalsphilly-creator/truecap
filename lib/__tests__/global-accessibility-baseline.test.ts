import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const glossaryTip = readFileSync(
  join(process.cwd(), "components/investcalc/glossary-tip.tsx"),
  "utf8"
);

describe("global interaction accessibility baseline", () => {
  it("keeps native button hit areas at least 44 by 44 CSS pixels", () => {
    expect(css).toContain("min-inline-size: 2.75rem");
    expect(css).toContain("min-block-size: 2.75rem");
  });

  it("provides a visible focus indicator for native and ARIA controls", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 3px solid var(--ring)");
    expect(css).toContain("outline-offset: 2px");
  });

  it("keeps the custom glossary button at the same 44px touch target", () => {
    expect(glossaryTip).toContain('role="button"');
    expect(glossaryTip).toContain("min-h-11 min-w-11");
  });
});
