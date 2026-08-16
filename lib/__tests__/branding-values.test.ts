import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brandingValuesSchema } from "@/lib/branding-values";

const ROOT = join(__dirname, "..", "..");

describe("brandingValuesSchema contact details", () => {
  it("accepts and trims the contact details rendered in branded PDFs", () => {
    const parsed = brandingValuesSchema.parse({
      company_name: "  Page Realty  ",
      contact_name: "  Morgan Page  ",
      contact_email: "  morgan@example.com  ",
      contact_phone: "  (215) 555-0100  ",
      contact_website: "  https://example.com/contact  ",
    });

    expect(parsed).toMatchObject({
      company_name: "Page Realty",
      contact_name: "Morgan Page",
      contact_email: "morgan@example.com",
      contact_phone: "(215) 555-0100",
      contact_website: "https://example.com/contact",
    });
  });

  it("normalizes blank optional contact inputs to null", () => {
    expect(
      brandingValuesSchema.parse({
        contact_name: "  ",
        contact_email: "",
        contact_phone: " ",
        contact_website: "",
      })
    ).toMatchObject({
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      contact_website: null,
    });
  });

  it("rejects malformed email, non-http website links, and oversized phone values", () => {
    expect(brandingValuesSchema.safeParse({ contact_email: "not-an-email" }).success).toBe(false);
    expect(brandingValuesSchema.safeParse({ contact_website: "javascript:alert(1)" }).success).toBe(false);
    expect(brandingValuesSchema.safeParse({ contact_phone: "1".repeat(41) }).success).toBe(false);
  });

  it("the settings form preserves editable contact values instead of clearing them", () => {
    const source = readFileSync(
      join(ROOT, "components/settings/branding-form.tsx"),
      "utf8"
    );
    for (const [field, state] of [
      ["contact_name", "contactName"],
      ["contact_email", "contactEmail"],
      ["contact_phone", "contactPhone"],
      ["contact_website", "contactWebsite"],
    ] as const) {
      expect(source).toContain(`${field}: ${state} || null`);
      expect(source).not.toContain(`${field}: null`);
    }
  });
});
