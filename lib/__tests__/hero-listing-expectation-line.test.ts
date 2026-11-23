/**
 * The hero used to say, under its form, "A listing link fills in the address.
 * You enter the asking price and bedrooms; a paid Pro or Agent Pro plan can
 * fill them." The founder removed that line from the heroes on /,
 * /for-investors and /for-agents (2026-11 ads pass, C3): it put a plan
 * upsell and a caveat in the first screen a paid click lands on. The facts
 * it stated are unchanged and are still said where the visitor pastes a
 * link, in the analyzer's own listing-link help.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the heroes carry no listing-paste fine print", () => {
  const form = read("components/marketing/hero-address-form.tsx");

  it("is gone from the form every hero shares, and from the homepage hero", () => {
    const sources = [
      form,
      read("components/marketing/marketing-hero.tsx"),
      read("app/for-investors/page.tsx"),
      read("app/for-agents/page.tsx"),
    ];
    for (const source of sources) {
      expect(source).not.toContain("A listing link fills in the address");
      expect(source).not.toContain("HERO_LISTING_EXPECTATION");
      expect(source).not.toContain("data-hero-listing-expectation");
    }
    expect(existsSync(join(process.cwd(), "lib/hero-copy.ts"))).toBe(false);
  });

  it("is still true, and still said where a link is pasted", () => {
    // The same plans the analyzer's listing-link help and refusal name.
    const help = read("components/investcalc/listing-link-input.tsx").replace(/\s+/g, " ");
    expect(help).toContain("a signed-in lookup on Pro or Agent Pro can also fill the active asking price and property facts");
    // The gate that makes it true: the lookup is refused without a paid plan.
    expect(read("app/actions/property-comps.ts")).toContain("if (parsed.data.proOnly && freeUser)");
  });

  it("keeps the sample link after the form, and adds no field and no capture", () => {
    expect(form.indexOf('data-hero-sample-link=""')).toBeGreaterThan(form.indexOf("</form>"));
    expect(form.match(/<AddressAutocomplete\s+form=/g)).toHaveLength(1);
    expect(form).not.toMatch(/<input\b|type="email"/);
  });
});
