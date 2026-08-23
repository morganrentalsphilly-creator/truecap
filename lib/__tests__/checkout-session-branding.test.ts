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
      background_color: "#F7FAFC",
      button_color: "#0B3B60",
      font_family: "inter",
      border_style: "rounded",
      logo: { type: "url", url: "https://example.test/Logo-png-w.png" },
      icon: { type: "url", url: "https://example.test/apple-icon.png" },
    });
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
    for (const relative of ["app/actions/billing.ts", "app/actions/one-time-pdf.ts"]) {
      const source = readFileSync(join(root, relative), "utf8");
      expect(source, relative).toMatch(
        /stripe\.checkout\.sessions\.create\(\s*withTrueCapCheckoutBranding\(\{/
      );
    }
  });
});
