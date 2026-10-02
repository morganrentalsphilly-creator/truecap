import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCityOnlyAddress,
  STREET_ADDRESS_REQUIRED_MESSAGE,
  streetAddressPlaceholder,
} from "@/components/investcalc/address-shape";
import {
  extractListingLink,
  SUPPORTED_LISTING_SITES,
  SUPPORTED_LISTING_SITES_TEXT,
} from "@/components/investcalc/supported-listing-sites";
import {
  HERO_EMPTY_HELPER,
  HERO_LISTING_ERROR,
  looksLikeListingLink,
  readPreHydrationAddress,
} from "@/components/marketing/hero-address-form";
import { parseListingUrl } from "@/lib/listing-url";

/**
 * Guards for the first-visit analyzer defects found by the 2026-09-30
 * go-to-market audit. Each block names the report row it keeps closed.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("inline error text uses the text-safe red (P1-72, P1-46)", () => {
  // --destructive is the fill red: 4.37:1 at 12px on the form card (#f6f5f2),
  // under the 4.5:1 AA minimum. --destructive-text is 5.85:1 on the card.
  const bareDestructive = /text-destructive(?![-\w/])/;

  it("FieldError, the analyzer's one field-error primitive, uses it", () => {
    const helpers = read("components/investcalc/form-field-helpers.tsx");
    expect(helpers).toContain(
      'role="alert" className="mt-1 text-xs text-destructive-text"',
    );
    expect(helpers).not.toMatch(bareDestructive);
  });

  it("the shared form primitive uses it for the label and the message", () => {
    const form = read("components/ui/form.tsx");
    expect(form).toContain("'data-[error=true]:text-destructive-text'");
    expect(form).toContain("cn('text-destructive-text text-sm', className)");
    expect(form).not.toMatch(bareDestructive);
  });

  it("no 12px validation message in the analyzer goes back to the fill red", () => {
    const dir = join(root, "components/investcalc");
    const offenders: string[] = [];
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".tsx")) continue;
      const lines = readFileSync(join(dir, name), "utf8").split("\n");
      lines.forEach((line, index) => {
        // Small error copy only: a class list that sets text-xs and the red
        // on the same element, with no tinted error surface behind it.
        if (
          /text-xs(?: font-medium)? text-destructive(?![-\w/])/.test(line) &&
          !line.includes("bg-destructive/")
        ) {
          offenders.push(`${name}:${index + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("the cookie banner's height is set by its buttons (P2-74, P2-46)", () => {
  const banner = read("components/marketing/cookie-consent-banner.tsx");

  it("the Privacy link keeps a 44px hit area without growing its line", () => {
    const links = banner.split('data-cookie-privacy-link=""').slice(1);
    expect(links).toHaveLength(2);
    for (const link of links) {
      const tag = link.slice(0, link.indexOf(">"));
      // 44px box, 28px handed back: the margin box (16px) fits inside one
      // 19.25px line, so the line it sits on is not 44px tall.
      expect(tag).toContain("-my-3.5 inline-flex min-h-11 min-w-11");
    }
  });

  it("the choices stay 44px tall", () => {
    expect(banner.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(5);
  });
});

describe("the phone run bar is never hidden behind the cookie banner (P2-75, P2-46)", () => {
  const bar = read("components/investcalc/sticky-calculate-bar.tsx");

  it("reads the banner's state and sits on top of it while it is open", () => {
    expect(bar).toContain(
      'import { useCookieBannerOpen } from "@/lib/use-cookie-banner";',
    );
    expect(bar).toContain("const cookieBannerOpen = useCookieBannerOpen();");
    expect(bar).toContain('"[data-cookie-consent-banner]"');
    expect(bar).toContain(
      "style={aboveCookieBanner ? { bottom: cookieBannerHeight } : undefined}",
    );
    // It must stay a bar that shows, not one that hides while the banner is up.
    expect(bar).not.toMatch(/!\s*cookieBannerOpen\s*&&/);
    expect(bar).not.toMatch(/&&\s*!\s*cookieBannerOpen/);
  });

  it("the banner it measures still carries the attribute it looks for", () => {
    expect(read("components/marketing/cookie-consent-banner.tsx")).toContain(
      'data-cookie-consent-banner=""',
    );
  });
});

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  expect(from, `missing source marker: ${start}`).toBeGreaterThanOrEqual(0);
  const to = source.indexOf(end, from + start.length);
  expect(to, `missing source marker after ${start}: ${end}`).toBeGreaterThan(
    from,
  );
  return source.slice(from, to);
}

describe("one list of supported listing sites, and share-sheet text (P2-37)", () => {
  const hero = read("components/marketing/hero-address-form.tsx");
  const help = read("components/investcalc/listing-link-input.tsx");

  it("names the same five sites in the helper, the error and the analyzer help", () => {
    expect(SUPPORTED_LISTING_SITES_TEXT).toBe(
      "Zillow, Redfin, Realtor.com, Homes.com, or Trulia",
    );
    expect(HERO_EMPTY_HELPER).toBe(
      "Paste an address or a Zillow, Redfin, Realtor.com, Homes.com, or Trulia link",
    );
    expect(HERO_LISTING_ERROR).toBe(
      "Paste a supported Zillow, Redfin, Realtor.com, Homes.com, or Trulia property link",
    );
    expect(help).toContain("{SUPPORTED_LISTING_SITES_TEXT}: TrueCap extracts");
    // No site list typed by hand anywhere else in the two surfaces.
    for (const source of [hero, help]) {
      expect(source).not.toMatch(/Zillow\/Redfin|Zillow, Redfin/);
    }
  });

  it("neither hero message ends in a full stop before \"or try the sample deal\"", () => {
    for (const message of [HERO_EMPTY_HELPER, HERO_LISTING_ERROR]) {
      expect(message).not.toMatch(/[.!]$/);
    }
    expect(hero).toContain("try the sample deal");
  });

  it("the parser reads a link from every site the list names", () => {
    const links: Record<(typeof SUPPORTED_LISTING_SITES)[number], string> = {
      Zillow:
        "https://www.zillow.com/homedetails/100-Test-St-Springfield-IL-62701/12345_zpid/",
      Redfin:
        "https://www.redfin.com/IL/Springfield/100-Test-St-62701/home/178901234",
      "Realtor.com":
        "https://www.realtor.com/realestateandhomes-detail/100-Test-St_Springfield_IL_62701_M12345-67890",
      "Homes.com":
        "https://www.homes.com/property/100-Test-St-Springfield-IL-62701/id-987/",
      Trulia:
        "https://www.trulia.com/homedetails/100-Test-St-Springfield-IL-62701/12345",
    };
    expect(Object.keys(links)).toEqual([...SUPPORTED_LISTING_SITES]);
    for (const [site, link] of Object.entries(links)) {
      const parsed = parseListingUrl(link);
      expect(parsed?.address, site).toMatch(/100 Test St/i);
      expect(parsed?.state, site).toBe("IL");
      expect(parsed?.zip, site).toBe("62701");
    }
  });

  it("finds the link inside share-sheet text, so the sentence is not the address", () => {
    const zillow =
      "https://www.zillow.com/homedetails/100-Test-St-Springfield-IL-62701/12345_zpid/";
    const shared = `Check out this home ${zillow}`;
    expect(looksLikeListingLink(shared)).toBe(true);
    expect(extractListingLink(shared)).toBe(zillow);
    expect(parseListingUrl(extractListingLink(shared) ?? shared)?.address).toBe(
      "100 Test St Springfield IL 62701",
    );
    // Sentence punctuation after the link is not part of it.
    expect(extractListingLink(`See ${zillow}.`)).toBe(zillow);
    expect(extractListingLink(`(${zillow})`)).toBe(zillow);
    // A bare listing host still counts, as before, and gets a scheme.
    expect(extractListingLink("zillow.com/homedetails/1-A-St-Reno-NV-89503/1_zpid/")).toBe(
      "https://zillow.com/homedetails/1-A-St-Reno-NV-89503/1_zpid/",
    );
    // A street address is not a link.
    for (const address of ["123 Main St, Columbus, OH 43215", "", "   "]) {
      expect(looksLikeListingLink(address)).toBe(false);
      expect(extractListingLink(address)).toBeNull();
    }
    // Both entry points read the extracted link, not the raw text.
    expect(hero).toContain("parseListingUrl(extractListingLink(raw) ?? raw)");
    expect(read("components/investcalc/investcalc-page.tsx")).toContain(
      "parseListingUrl(extractListingLink(listingUrl) ?? listingUrl)",
    );
  });
});

describe("the hero keeps text typed before hydration (P2-34)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the server-rendered field for its own placement", () => {
    const querySelector = vi.fn((selector: string) =>
      selector === 'form[data-hero-address-form] input[name="address"]'
        ? { value: "12 Example St, Reno, NV" }
        : null,
    );
    vi.stubGlobal("document", { querySelector });
    expect(readPreHydrationAddress("hero")).toBe("12 Example St, Reno, NV");
    expect(readPreHydrationAddress("close")).toBe("");
    expect(querySelector).toHaveBeenCalledWith(
      'form[data-close-address-form] input[name="address"]',
    );
  });

  it("returns an empty default on the server", () => {
    vi.stubGlobal("document", undefined);
    expect(readPreHydrationAddress("hero")).toBe("");
  });

  it("seeds the form's default from that read, once", () => {
    const hero = read("components/marketing/hero-address-form.tsx");
    expect(hero).toContain("readPreHydrationAddress(placement),");
    expect(hero).toContain("address: preHydrationAddress,");
    expect(hero).not.toContain('defaultValues: { address: "" }');
  });

  it("reads only on the first mount of a page load, never on a client navigation", () => {
    const hero = read("components/marketing/hero-address-form.tsx");
    // A later mount can find the page being left still in the document.
    expect(hero).toContain(
      'if (typeof document === "undefined" || firstHydrationDone) return "";',
    );
    const effect = hero.indexOf("firstHydrationDone = true;");
    expect(effect).toBeGreaterThan(hero.indexOf("useEffect(() => {"));
    expect(hero.match(/firstHydrationDone = true;/g)).toHaveLength(1);
  });
});

describe("a city is context, not a property (P2-45)", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("recognises a bare city and state, and nothing with a street or a number", () => {
    for (const area of [
      "Columbus, OH",
      "Columbus OH",
      "Austin, Texas",
      "Charleston, West Virginia",
      "New York, NY, USA",
      "Winston-Salem, NC",
      "St. Louis, MO",
      "Washington, DC",
    ]) {
      expect(isCityOnlyAddress(area), area).toBe(true);
    }
    for (const property of [
      "123 Main St, Columbus, OH",
      "123 Main St, Columbus, OH 43215",
      "Columbus, OH 43215",
      "Main Street, Columbus OH",
      "Main Street, Columbus Ohio",
      "One Lincoln Plaza, New York, NY",
      "Main St Columbus OH",
      "Duplex on Elm",
      "TrueCap Synthetic Sample, Philadelphia, PA 19140, USA",
      "",
    ]) {
      expect(isCityOnlyAddress(property), property).toBe(false);
    }
    expect(isCityOnlyAddress(undefined)).toBe(false);
    expect(isCityOnlyAddress(null)).toBe(false);
  });

  it("a handed-off city becomes the field's hint, never its value", () => {
    const handoff = section(
      calculator,
      "const handoff = analyzerHandoff;",
      "// No edit-handoff payload.",
    );
    // Only a handoff that is nothing but a city: one that also carries
    // numbers keeps its label in the field.
    expect(handoff).toContain(
      "handoffCarriesOnlyAddress && isCityOnlyAddress(handoffAddress);",
    );
    expect(handoff).toContain(
      "if (handoffAddressIsArea) setAddressAreaHint(handoffAddress);",
    );
    expect(handoff).toContain('else form.setValue("address", handoffAddress);');
    expect(handoff).not.toContain('form.setValue("address", handoff.address)');
    expect(streetAddressPlaceholder("Columbus, OH")).toBe(
      "Street address in Columbus, OH",
    );
    expect(calculator).toContain("streetAddressPlaceholder(addressAreaHint)");
    expect(read("components/investcalc/property-details-section.tsx")).toContain(
      "placeholder={addressPlaceholder}",
    );
  });

  it("a bare city cannot run, or claim the no-signup decision, without an account", () => {
    expect(calculator).toContain(
      "!isAuthenticated && isCityOnlyAddress(watchedAddress);",
    );
    expect(calculator).toContain(
      "Boolean(watchedAddress?.trim()) && !addressIsAreaOnly;",
    );
    // Enter submits the form directly, so the run itself checks too, before
    // anything else in onSubmit (the decision claim sits further down).
    const submit = section(
      calculator,
      "const onSubmit = async (validated: InvestmentFormValues) => {",
      "const onError = ",
    );
    const guard = submit.indexOf("isCityOnlyAddress(validated.address)");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(submit.indexOf("claimAnonymousDecisionAction("));
    expect(guard).toBeLessThan(
      submit.indexOf("addressEnrichmentPromiseRef.current"),
    );
    expect(submit.slice(guard, guard + 400)).toContain(
      "message: STREET_ADDRESS_REQUIRED_MESSAGE",
    );
    expect(STREET_ADDRESS_REQUIRED_MESSAGE).toBe(
      "Add the street address. A city and state are not enough to analyze a property.",
    );
  });
});

describe("the GET fallback and a failed lookup behave like the scripted hero path (P2-34)", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("an address-only handoff goes through the hero handler, which runs the lookup", () => {
    const handoff = section(
      calculator,
      "const handoff = analyzerHandoff;",
      "// No edit-handoff payload.",
    );
    expect(handoff).toContain("const handoffCarriesOnlyAddress =");
    for (const field of [
      "purchasePrice",
      "monthlyRent",
      "bedrooms",
      "interestRate",
      "propertyTaxPct",
      "propertyType",
      "strategy",
    ]) {
      expect(handoff).toContain(`handoff.${field} === undefined`);
    }
    expect(handoff).toContain(
      "handoffCarriesOnlyAddress && !handoffAddressIsArea;",
    );
    const call = handoff.indexOf("heroAnalyzeHandlerRef.current?.({");
    expect(call).toBeGreaterThan(-1);
    // After the programmatic-reset flag drops, as a user action would be.
    expect(call).toBeGreaterThan(
      handoff.indexOf("isProgrammaticResetRef.current = false;"),
    );
    expect(handoff.slice(call, call + 200)).toContain("address: handoffAddress");
  });

  it("says the lookup failed in the one toast the visitor keeps", () => {
    const enrichment = section(
      calculator,
      "const runPropertyEnrichment = useCallback(",
      "const runTrackedPropertyEnrichment = useCallback(",
    );
    expect(enrichment).toContain("failedEnrichmentPlaceRef.current = null;");
    expect(enrichment).toContain("failedEnrichmentPlaceRef.current = place;");

    const heroHandler = section(
      calculator,
      "heroAnalyzeHandlerRef.current = async (detail: HeroAnalyzeDetail) => {",
      "Live provenance + raw capture getters",
    );
    expect(heroHandler).toContain(
      "landOnPrice(false, failedEnrichmentPlaceRef.current === place);",
    );
    const failed = section(heroHandler, "} else if (lookupFailed) {", "} else {");
    expect(failed).toContain('title: "Property lookup unavailable"');
    expect(failed).toContain(
      "The current rate and area rent could not be fetched, so neither was filled in.",
    );
    // The ordinary guidance must not be what a failed lookup shows.
    expect(failed).not.toContain("Two fields to your first screen");
  });
});

describe("leaving the sample does not carry its rate into the visitor's deal (P2-35)", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const nextDeal = section(
    calculator,
    "const handleAnalyzeAnotherLikeThis = async () =>",
    "useEffect(() => {\n    if (!autoExportPdfRef.current)",
  );

  it("resets financing to the starting values only from the untouched sample", () => {
    expect(nextDeal).toContain(
      'isTrueCapSyntheticSampleAddress(form.getValues("address")) &&',
    );
    for (const field of ["interestRate", "downPaymentPct", "loanTermYears"]) {
      expect(nextDeal).toContain(
        `Number(form.getValues("${field}")) ===\n        SAMPLE_DEAL_FIXTURE.values.${field}`,
      );
      expect(nextDeal).toContain(
        `forkedValues.${field} = startingValues.${field};`,
      );
    }
    const reset = nextDeal.indexOf("if (leavingSample) {");
    expect(reset).toBeGreaterThan(nextDeal.indexOf("buildRepeatDealDraft("));
    // Before the value-bound source context is rebuilt and the form is reset.
    expect(reset).toBeLessThan(
      nextDeal.indexOf("restoreInputConfidenceSourceContext("),
    );
    expect(reset).toBeLessThan(nextDeal.indexOf("form.reset(forkedValues)"));
  });

  it("leaves the session eligible for the live rate, and a real deal ineligible", () => {
    expect(nextDeal).toContain("autoApplyEligibleRef.current = leavingSample;");
    expect(nextDeal).not.toContain("autoApplyEligibleRef.current = true;");
  });

  it("does not tell a visitor leaving the sample that its financing carried over", () => {
    expect(nextDeal).toContain(
      "Financing returns to the starting values, so the sample's rate is not carried into your deal.",
    );
    expect(nextDeal).toContain(
      "financing is back to the starting values;",
    );
    // The real-deal wording is unchanged.
    expect(nextDeal).toContain(
      "Reusable financing and general operating assumptions will remain.",
    );
    expect(nextDeal).toContain(
      "Financing and general operating assumptions carried over;",
    );
  });
});

describe("Export PDF on the sample does not talk about a purchase shutdown (P2-36)", () => {
  const dialog = read("components/investcalc/pdf-purchase-dialog.tsx");

  it("has a sample variant without the one-time-purchase and payment copy", () => {
    expect(dialog).toContain("sample = false,");
    expect(dialog).toContain(
      "The sample's full report is on this page. A PDF of it comes with a Pro plan.",
    );
    const shutdown = dialog.indexOf("Already purchased a one-time report?");
    const payments = dialog.indexOf("Payments are processed by Stripe.");
    for (const index of [shutdown, payments]) {
      expect(index).toBeGreaterThan(-1);
      expect(dialog.lastIndexOf("{sample ? null : (", index)).toBeGreaterThan(
        dialog.indexOf("<DialogHeader>"),
      );
    }
    // Buyers of a past one-time report still get the recovery note.
    expect(dialog).toContain("Existing paid claims and recovery remain supported");
  });

  it("the analyzer tells the dialog when the result on screen is the sample", () => {
    expect(read("components/investcalc/investcalc-page.tsx")).toContain(
      "sample={isTrueCapSyntheticSampleAddress(analysisValues?.address)}",
    );
  });
});
