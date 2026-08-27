import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { decideAutofillFieldWrite } from "@/lib/autofill-field-ownership";
import { selectUnderwritingEnrichment } from "@/lib/property-enrichment/underwriting-adoption";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(
    0,
  );
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

function enrichment(
  overrides: Partial<PropertyEnrichment> = {},
): PropertyEnrichment {
  return {
    facts: null,
    valueEstimate: 425_000,
    valueRange: null,
    saleComps: [],
    rentEstimate: 2_400,
    rentRange: null,
    rentComps: [],
    listPrice: null,
    fetchedAt: "2026-08-27T12:00:00.000Z",
    ...overrides,
  };
}

describe("listing-price provenance regressions", () => {
  const analyzer = read("components/investcalc/investcalc-page.tsx");
  const propertyDetails = read(
    "components/investcalc/property-details-section.tsx",
  );
  const listingLink = read("components/investcalc/listing-link-input.tsx");

  it("adopts only an active-listing asking price and preserves a user's populated value", () => {
    expect(
      selectUnderwritingEnrichment(
        enrichment({ valueEstimate: 425_000, listPrice: null }),
      ),
    ).toMatchObject({
      purchasePrice: null,
      purchasePriceSource: null,
    });

    expect(
      selectUnderwritingEnrichment(
        enrichment({ valueEstimate: 425_000, listPrice: 399_900 }),
      ),
    ).toMatchObject({
      purchasePrice: 399_900,
      purchasePriceSource: "active-listing",
    });

    expect(
      decideAutofillFieldWrite({
        currentValue: 410_000,
        proposedValue: 399_900,
      }),
    ).toEqual({ action: "conflict", reason: "different-value" });

    const ownershipGate = section(
      analyzer,
      "const mayWrite = (field: AutofillField, proposed: number) =>",
      "const opts =",
    );
    expect(ownershipGate).toContain('decision.reason !== "same-value"');
  });

  it("describes listing-link enrichment without claiming to scrape the listing", () => {
    expect(listingLink).toContain("TrueCap extracts the address");
    expect(listingLink).toContain(
      "a signed-in lookup can also fill the active asking price",
    );
    expect(listingLink).toContain("other values remain labeled estimates");
    expect(listingLink).toContain(
      "It never imports\n        listing photos, seller claims, or the actual tax bill",
    );
    expect(listingLink).not.toContain("does not import the listing price");
  });

  it("keeps a programmatically filled price source visible and connected to the input", () => {
    expect(propertyDetails).toContain("priceSourceLabel?: string | null");
    expect(propertyDetails).toContain(
      'priceSourceLabel ? "purchase-price-source" : null',
    );
    expect(propertyDetails).toContain('id="purchase-price-source"');
    expect(propertyDetails).toContain(
      "Source: {priceSourceLabel}. Review before relying on it.",
    );
    expect(propertyDetails).toContain("onPurchasePriceEdited?.()");

    expect(analyzer).toContain(
      'setPurchasePriceSourceLabel("RentCast value estimate")',
    );
    expect(analyzer).toContain('"Active listing asking price via RentCast"');
    expect(analyzer).toContain("priceSourceLabel={purchasePriceSourceLabel}");
    expect(analyzer).toContain("onPurchasePriceEdited={() => {");
    expect(analyzer).toContain("setPurchasePriceSourceLabel(null)");
  });

  it("claims an active asking price in the autofill toast only after writing it", () => {
    const applyComps = section(
      analyzer,
      "const applyComps = useCallback(",
      "const findAutofillConflicts = useCallback(",
    );
    const listingPriceWrite = section(
      applyComps,
      "const priceIsAsking =",
      "// No listing price and the user hasn't typed one",
    );

    expect(listingPriceWrite).toContain("let wroteAskingPrice = false");
    expect(listingPriceWrite).toContain(
      'mayWrite("purchasePrice", adopted.purchasePrice)',
    );
    expect(listingPriceWrite).toContain("form.setValue(");
    expect(listingPriceWrite).toContain("wroteAskingPrice = priceIsAsking");
    expect(listingPriceWrite.indexOf("form.setValue(")).toBeLessThan(
      listingPriceWrite.indexOf("wroteAskingPrice = priceIsAsking"),
    );

    expect(applyComps).toContain("wroteAskingPrice\n              ?");
    expect(applyComps).not.toContain("priceIsAsking\n              ?");
  });
});
