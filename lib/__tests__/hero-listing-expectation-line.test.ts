/**
 * The hero leads with a listing paste, and only the address is read from a
 * link; the asking price and bedrooms are typed unless a signed-in Pro or
 * Agent Pro subscriber's lookup fills them. One line under the hero form says
 * so. It sits AFTER the form in the markup, so it can never push the field or
 * the button toward the cookie bar on a short phone.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HERO_LISTING_EXPECTATION } from "@/components/marketing/hero-address-form";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("listing-paste expectation line under the hero form", () => {
  const form = read("components/marketing/hero-address-form.tsx");

  it("says a link gives the address, and who gets the price and bedrooms filled", () => {
    expect(HERO_LISTING_EXPECTATION).toBe(
      "A listing link fills in the address. You enter the asking price and bedrooms; a paid Pro or Agent Pro plan can fill them.",
    );
    // The same plans the analyzer's listing-link help and refusal name.
    const help = read("components/investcalc/listing-link-input.tsx").replace(/\s+/g, " ");
    expect(help).toContain("a signed-in lookup on Pro or Agent Pro can also fill the active asking price and property facts");
    // The gate that makes it true: the lookup is refused without a paid plan.
    expect(read("app/actions/property-comps.ts")).toContain("if (parsed.data.proOnly && freeUser)");
  });

  it("renders once, in the hero placement only, after the form's closing tag", () => {
    expect(form.match(/\{HERO_LISTING_EXPECTATION\}/g)).toHaveLength(1);
    const formEnd = form.indexOf("</form>");
    const line = form.indexOf('data-hero-listing-expectation=""');
    const sample = form.indexOf('data-hero-sample-link=""');
    expect(formEnd).toBeGreaterThan(0);
    expect(line).toBeGreaterThan(formEnd);
    expect(sample).toBeGreaterThan(line);
    expect(form.slice(formEnd, line)).toMatch(/\{isHero \? \(\s*<p\s*$/);
  });

  it("adds no field and no capture", () => {
    expect(form.match(/<AddressAutocomplete\s+form=/g)).toHaveLength(1);
    expect(form).not.toMatch(/<input\b|type="email"/);
  });
});
