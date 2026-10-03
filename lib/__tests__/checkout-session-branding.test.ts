import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTrueCapCheckoutBranding,
  withTrueCapCheckoutBranding,
} from "@/lib/stripe/checkout-branding";

describe("TrueCap Stripe Checkout branding", () => {
  it("builds the exact supported hosted Checkout brand settings", () => {
    expect(buildTrueCapCheckoutBranding("https://example.test/")).toEqual({
      display_name: "TrueCap",
      // The site palette (DESIGN.md): Paper and Signal Blue.
      background_color: "#EFECE8",
      button_color: "#0066BA",
      font_family: "inter",
      border_style: "rounded",
      logo: { type: "url", url: "https://example.test/Logo-png-w.png" },
      icon: { type: "url", url: "https://example.test/apple-icon.png" },
    });
  });

  it("sends the site palette as valid hex, with a readable button and page", () => {
    const { background_color, button_color } = buildTrueCapCheckoutBranding();
    for (const value of [background_color, button_color]) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
    // The hex DESIGN.md gives for Paper and Signal Blue, and the same values
    // the site's tokens resolve to.
    const design = readFileSync(join(__dirname, "..", "..", "DESIGN.md"), "utf8").toLowerCase();
    expect(design).toContain(String(background_color).toLowerCase());
    expect(design).toContain(String(button_color).toLowerCase());
    // The navy and cool grey from before the redesign are gone.
    expect([background_color, button_color]).not.toContain("#0B3B60");
    expect([background_color, button_color]).not.toContain("#F7FAFC");

    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    // Stripe sets white text on a dark button and dark text on a light page.
    expect(contrast("#FFFFFF", String(button_color))).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#1B1B1B", String(background_color))).toBeGreaterThanOrEqual(7);
    // The button stands out from the page it sits on.
    expect(contrast(String(button_color), String(background_color))).toBeGreaterThanOrEqual(3);
  });

  it.each(["subscription", "payment"] as const)(
    "adds branding to a %s-mode Session payload without creating a live Session",
    (mode) => {
      const payload = withTrueCapCheckoutBranding({
        mode,
        line_items: [{ price: "price_test_only", quantity: 1 }],
        success_url: "https://example.test/success",
        cancel_url: "https://example.test/cancel",
      });

      expect(payload.mode).toBe(mode);
      expect(payload.line_items).toEqual([{ price: "price_test_only", quantity: 1 }]);
      expect(payload.branding_settings).toEqual(buildTrueCapCheckoutBranding());
    }
  );

  it("is applied to both repository Checkout Session construction paths", () => {
    const root = join(__dirname, "..", "..");
    const billing = readFileSync(join(root, "app/actions/billing.ts"), "utf8");
    expect(billing).toMatch(
      /function buildSubscriptionCheckoutSessionParams[\s\S]*return withTrueCapCheckoutBranding\(\{/
    );
    expect(billing).toMatch(
      /stripe\.checkout\.sessions\.create\(\s*buildSubscriptionCheckoutSessionParams\(\{/
    );

    const oneTimePdf = readFileSync(join(root, "app/actions/one-time-pdf.ts"), "utf8");
    expect(oneTimePdf).toMatch(
      /stripe\.checkout\.sessions\.create\(\s*withTrueCapCheckoutBranding\(\{/
    );
  });
});
