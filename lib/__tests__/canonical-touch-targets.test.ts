import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("canonical touch targets", () => {
  it("keeps every homepage entry action at least 44 CSS pixels tall", () => {
    const hero = read("components/marketing/hero-address-form.tsx");
    const sampleAction = hero.slice(
      hero.indexOf('data-hero-sample-link=""'),
      hero.indexOf("</Link>", hero.indexOf('data-hero-sample-link=""'))
    );

    expect(sampleAction).toContain("min-h-11");
  });

  it("keeps auth password toggles and resend actions at least 44 CSS pixels", () => {
    const login = read("components/auth/login-form.tsx");
    const signup = read("components/auth/sign-up-form.tsx");
    const update = read("components/auth/update-password-form.tsx");

    expect(login).not.toContain("flex size-9");
    expect(signup).not.toContain("flex size-9");
    expect(login).toContain("min-h-11");
    expect(signup.match(/flex size-11/g)).toHaveLength(2);
    expect(update.match(/flex size-11/g)).toHaveLength(2);
    expect(login).toContain('aria-label={showPassword ? "Hide password" : "Show password"}');
    expect(signup).toMatch(
      /showConfirmPassword\s*\?\s*"Hide confirmation password"\s*:\s*"Show confirmation password"/,
    );
    expect(update).toMatch(
      /showConfirmPassword\s*\?\s*"Hide confirmation password"\s*:\s*"Show confirmation password"/,
    );
  });

  it("keeps adjacent analysis, dashboard, and conversion controls at 44 pixels", () => {
    const expected = [
      ["components/marketing/sticky-conversion-bar.tsx", "min-h-11"],
      ["components/marketing/checkout-cancelled-banner.tsx", "size-11"],
      ["components/marketing/testimonial-prompt.tsx", "size-11"],
      ["components/marketing/lead-magnet-capture.tsx", "size-11"],
      ["components/marketing/onboarding-tour.tsx", "size-11"],
      ["components/investcalc/assumptions-source-strip.tsx", "min-h-11"],
      ["components/investcalc/deal-summary-card.tsx", "min-h-11"],
      ["components/investcalc/decision-tier.tsx", "min-h-11"],
      ["components/investcalc/deal-qa-panel.tsx", "size-11"],
      ["components/investcalc/buy-box-verdict-card.tsx", "min-h-11"],
      ["components/investcalc/saved-analyses-page-v2.tsx", "size-11"],
    ] as const;

    for (const [path, token] of expected) {
      expect(read(path), path).toContain(token);
    }

    const calculator = read("components/investcalc/investcalc-page.tsx");
    for (const [label, marker] of [
      ["Go to field", "onClick={handleJumpToFirstInvalidField}"],
      ["Enter price", "onClick={handleEditPrice}"],
    ] as const) {
      const markerIndex = calculator.indexOf(marker);
      const start = calculator.lastIndexOf("<button", markerIndex);
      const end = calculator.indexOf("</button>", markerIndex);
      expect(calculator.slice(start, end), label).toContain("min-h-11");
    }
  });
});
