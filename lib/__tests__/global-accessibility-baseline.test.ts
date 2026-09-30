import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const glossaryTip = readFileSync(
  join(process.cwd(), "components/investcalc/glossary-tip.tsx"),
  "utf8"
);
const siteFooter = readFileSync(
  join(process.cwd(), "components/marketing/site-footer.tsx"),
  "utf8"
);
const foundingPricingBanner = readFileSync(
  join(process.cwd(), "components/marketing/founding-pricing-banner.tsx"),
  "utf8"
);
// The pricing card actions (components/marketing/pricing-plan-buttons.tsx)
// take the shared 48px marketing button; their own test is below.
const primaryLinkSurfaces = [
  "components/marketing/hero-address-form.tsx",
  "components/auth/login-form.tsx",
  "components/auth/sign-up-form.tsx",
  "components/marketing/marketing-nav.tsx",
  "components/dashboard/DashboardHome.tsx",
  "components/dashboard/RateWatchStrip.tsx",
].map((path) => readFileSync(join(process.cwd(), path), "utf8"));

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

  it("keeps meaningful primary-flow links at least 44px tall", () => {
    for (const source of primaryLinkSurfaces) {
      expect(source).toContain("min-h-11");
    }
    // components/marketing/marketing-nav.tsx
    expect(primaryLinkSurfaces[3]).toContain("min-w-11");
  });

  it("keeps every pricing card action on the 48px marketing button", () => {
    const buttons = readFileSync(
      join(process.cwd(), "components/marketing/pricing-plan-buttons.tsx"),
      "utf8"
    );
    const primitive = readFileSync(join(process.cwd(), "components/ui/button.tsx"), "utf8");
    // The primitive: a 44px floor on every size, 48px for the cta size.
    expect(primitive).toMatch(/cva\(\s*"[^"]*\bmin-h-11\b/);
    expect(primitive).toMatch(/cta: '[^']*\bmin-h-12\b/);
    // The pricing actions build one class from the cta size...
    expect(buttons).toMatch(/const actionClass = buttonVariants\(\{\s*size: "cta"/);
    // ...and every link and button they render takes it, so none can fall
    // back to a hand-rolled class below 44px. The visitor's sign-up is a
    // plain <a> (a full-document navigation), so anchors count too.
    const actions = buttons.match(/<(?:Link|button|a)\b/g) ?? [];
    expect(actions.length).toBeGreaterThanOrEqual(4);
    expect(buttons.match(/className=\{actionClass\}/g) ?? []).toHaveLength(actions.length);
  });

  it("keeps shared footer links at least 44px and the retired pricing banner inert", () => {
    expect(siteFooter.match(/min-h-11/g)).toHaveLength(6);
    expect(siteFooter.match(/min-w-11/g)).toHaveLength(6);
    expect(foundingPricingBanner).toContain("return null");
    expect(foundingPricingBanner).not.toContain("<button");
    expect(foundingPricingBanner).not.toContain("<a");
  });
});
