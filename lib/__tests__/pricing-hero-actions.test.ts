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

describe("pricing hero actions", () => {
  it("offers a primary free analysis and a secondary in-page plan jump", () => {
    expect(pricingSource).toContain('href="/#main"');
    expect(pricingSource).toContain("Analyze a deal free");
    expect(pricingSource).toContain('href="#plans"');
    expect(pricingSource).toContain("See Pro plans");
    expect(pricingSource).toContain('<section id="plans"');
  });

  it("never gates the Free-card analyzer behind account creation", () => {
    expect(pricingButtonsSource).toContain('href="/#main"');
    expect(pricingButtonsSource).toContain("Analyze a deal free");
    expect(pricingButtonsSource).not.toContain('href="/auth/sign-up"');
  });
});
