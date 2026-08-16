import { z } from "zod";

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function optionalText(max: number) {
  return z.preprocess(emptyStringToNull, z.string().trim().max(max).nullish());
}

function optionalHttpUrl(
  max: number,
  invalidMessage: string,
  protocolMessage: string
) {
  return z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .url(invalidMessage)
      .max(max)
      .refine((value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      }, protocolMessage)
      .nullish()
  );
}

/**
 * Canonical validation for branding saved by Pro users.
 *
 * This lives outside the server-action module so the contact-field contract can
 * be unit-tested without importing Next's `use server` boundary. Empty optional
 * inputs normalize to null, and public contact links are limited to http(s).
 */
export const brandingValuesSchema = z.object({
  company_name: optionalText(120),
  tagline: optionalText(160),
  primary_color_hex: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .regex(HEX_COLOR_RE, "Must be a 6-digit hex color like #1A4FBA")
      .nullish()
  ),
  contact_name: optionalText(120),
  contact_email: z.preprocess(
    emptyStringToNull,
    z.string().trim().email("Invalid email").max(180).nullish()
  ),
  contact_phone: optionalText(40),
  contact_website: optionalHttpUrl(
    240,
    "Invalid URL",
    "Website must start with http:// or https://"
  ),
  logo_url: optionalHttpUrl(
    2048,
    "Invalid URL",
    "Logo URL must start with http:// or https://"
  ),
});

export type BrandingValues = z.infer<typeof brandingValuesSchema>;
