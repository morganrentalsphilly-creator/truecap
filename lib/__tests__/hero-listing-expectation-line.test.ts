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
import { HERO_LISTING_EXPECTATION } from "@/lib/hero-copy";

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

  it("renders once in the hero, after the form, and below the sheet on phones", () => {
    // Re-anchored 2026-10-21 (audit A8): the homepage hero renders the line
    // itself, after <HeroAddressForm /> (so it still cannot move the field or
    // the button), and below 1024px orders it after the sheet. The form keeps
    // its own copy, off in the hero, for any other placement.
    const hero = read("components/marketing/marketing-hero.tsx");
    expect(hero.match(/\{HERO_LISTING_EXPECTATION\}/g)).toHaveLength(1);
    const formAt = hero.indexOf("<HeroAddressForm");
    const line = hero.indexOf('data-hero-listing-expectation=""');
    expect(formAt).toBeGreaterThan(0);
    expect(line).toBeGreaterThan(formAt);
    expect(hero).toContain("<HeroAddressForm className=\"mt-3\" listingExpectation={false} />");
    expect(hero.slice(line, hero.indexOf("</p>", line))).toContain("max-lg:order-2");
    expect(form.match(/\{HERO_LISTING_EXPECTATION\}/g)).toHaveLength(1);
    expect(form.indexOf('data-hero-listing-expectation=""')).toBeGreaterThan(form.indexOf("</form>"));
    expect(form).toContain("isHero && listingExpectation ? (");
    // The sample link stays a real link after the form, now the secondary button.
    expect(form.indexOf('data-hero-sample-link=""')).toBeGreaterThan(form.indexOf("</form>"));
  });

  it("adds no field and no capture", () => {
    expect(form.match(/<AddressAutocomplete\s+form=/g)).toHaveLength(1);
    expect(form).not.toMatch(/<input\b|type="email"/);
  });
});
