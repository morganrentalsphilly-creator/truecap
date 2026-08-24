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
const primaryLinkSurfaces = [
  "components/marketing/pricing-plan-buttons.tsx",
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
    expect(primaryLinkSurfaces[4]).toContain("min-w-11");
  });

  it("keeps shared footer links at least 44px and the retired pricing banner inert", () => {
    expect(siteFooter.match(/min-h-11/g)).toHaveLength(6);
    expect(siteFooter.match(/min-w-11/g)).toHaveLength(6);
    expect(foundingPricingBanner).toContain("return null");
    expect(foundingPricingBanner).not.toContain("<button");
    expect(foundingPricingBanner).not.toContain("<a");
  });
});
