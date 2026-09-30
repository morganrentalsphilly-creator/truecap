import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pricingSource = readFileSync(
  join(__dirname, "..", "..", "app/pricing/page.tsx"),
  "utf8"
);
const pricingButtonsSource = readFileSync(
  join(__dirname, "..", "..", "components/marketing/pricing-plan-buttons.tsx"),
  "utf8"
);
const pricingPlansSource = readFileSync(
  join(__dirname, "..", "..", "components/marketing/pricing-toggle-plans.tsx"),
  "utf8"
);

describe("pricing hero actions", () => {
  it("offers a primary free analysis and a secondary in-page plan jump", () => {
    expect(pricingSource).toContain('href="/analyze"');
    expect(pricingSource).toContain("Analyze a property free");
    expect(pricingSource).toContain('href="#pro"');
    expect(pricingSource).toContain("See Pro plans");
    expect(pricingPlansSource).toContain('id="pro"');
  });

  it("lands the #pro jump with the billing toggle in view", () => {
    // The Monthly/Annual toggle sets the Pro price. When it sits above the
    // card row rather than inside the Pro card, the html scroll padding
    // alone parks it under the sticky header, so the card needs its own
    // scroll margin (sized in the component's comment).
    const toggleAt = pricingPlansSource.indexOf('aria-label="Billing period"');
    const proCardAt = pricingPlansSource.indexOf('id="pro"');
    expect(toggleAt).toBeGreaterThan(-1);
    expect(proCardAt).toBeGreaterThan(-1);
    if (toggleAt < proCardAt) {
      expect(pricingPlansSource).toMatch(/<PlanCard\s+id="pro"\s+className="[^"]*\bscroll-mt-28\b/);
    }
  });

  it("never gates the Free-card analyzer behind account creation", () => {
    expect(pricingButtonsSource).toContain('href="/analyze"');
    expect(pricingButtonsSource).toContain("Analyze a property free");
    expect(pricingButtonsSource).not.toContain('href="/auth/sign-up"');
  });
});
