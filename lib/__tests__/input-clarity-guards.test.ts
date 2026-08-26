import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canChoosePropertyTypeForStrategy } from "@/lib/investor-strategies";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("calculator input clarity guards", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const propertyTypes = read("components/investcalc/property-type-section.tsx");
  const units = read("components/investcalc/multi-family-units-section.tsx");

  it("surfaces and focus-links the current property model beside income", () => {
    expect(canChoosePropertyTypeForStrategy(null)).toBe(true);
    expect(canChoosePropertyTypeForStrategy("buy-hold")).toBe(true);
    expect(canChoosePropertyTypeForStrategy("house-hack")).toBe(false);
    expect(canChoosePropertyTypeForStrategy("brrrr")).toBe(false);
    expect(calculator).toContain("Property type:");
    expect(calculator).toContain("{propertyTypeLabel}");
    expect(calculator).toContain("{canChoosePropertyType ? (");
    expect(calculator).toContain("{canChoosePropertyType && (");
    expect(calculator).toContain("`property-type-${propertyType}`");
    expect(calculator).toContain('aria-controls="advanced-options"');
    expect(calculator).toContain("min-h-11");
    expect(propertyTypes).toContain("id={`property-type-${type.value}`}");
  });

  it("makes owner-unit $0 income read-only and explains the model", () => {
    expect(units).toContain('{isOwner ? "Owner unit rent" : "Monthly Rent"}');
    expect(units).toContain("readOnly");
    expect(units).toContain('aria-readonly="true"');
    expect(units).toContain("Fixed at $0 and not counted as rental income.");
    expect(units).toContain("applyHouseHackOwnerUnitSelection");
  });

  it("lets only the identity-aware enrichment flow clear provenance", () => {
    const handlerStart = calculator.indexOf(
      "const handleAddressSelected = useCallback(",
    );
    const handlerEnd = calculator.indexOf(
      "/**\n   * After an address has been picked",
      handlerStart,
    );
    const handler = calculator.slice(handlerStart, handlerEnd);
    expect(handler).not.toContain("enrichmentCaptureRef.current = {};");

    const identityStart = calculator.indexOf(
      "if (lastEnrichedAddressRef.current !== placeKey)",
    );
    const identityEnd = calculator.indexOf(
      "const currentPropertyType = form.getValues",
      identityStart,
    );
    const identityBlock = calculator.slice(identityStart, identityEnd);
    expect(identityBlock).toContain("if (!sameProperty)");
    expect(identityBlock).toContain("enrichmentCaptureRef.current = {};");
    expect(identityBlock).toContain("isSameAutofillProperty(prevGeo, place)");
  });
});
