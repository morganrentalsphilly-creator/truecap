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

  it("never gates the Free-card analyzer behind account creation", () => {
    expect(pricingButtonsSource).toContain('href="/analyze"');
    expect(pricingButtonsSource).toContain("Analyze a property free");
    expect(pricingButtonsSource).not.toContain('href="/auth/sign-up"');
  });
});
