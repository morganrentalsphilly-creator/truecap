import { describe, expect, it } from "vitest";
import {
  buildAssumptionChips,
  computeExpensesEdited,
  resolveTemplateName,
  type AssumptionChipValues,
} from "@/lib/assumption-chips";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";
import { defaultValues } from "@/lib/investcalc-schema";

const NO_OPTS = { expensesEdited: false, templateName: null, hasActiveStrategy: false };

const fredAndState: EnrichmentProvenanceInput = {
  interestRate: { source: "fred", overridden: false },
  propertyTaxPct: { source: "state-static", detail: "PA", overridden: false },
};

const byId = (chips: ReturnType<typeof buildAssumptionChips>, id: string) => {
  const chip = chips.find((c) => c.id === id);
  if (!chip) throw new Error(`missing chip ${id}`);
  return chip;
};

describe("buildAssumptionChips (input-side assumptions strip)", () => {
  it("renders fully-populated chips from the factory form defaults (chips-from-defaults)", () => {
    // The data-derived-state invariant's baseline: a brand-new form with NO
    // enrichment, NO template, NO user edits still yields settled facts.
    const chips = buildAssumptionChips(defaultValues as AssumptionChipValues, {}, NO_OPTS);
    expect(byId(chips, "financing").label).toBe("20% down @ 6.75%");
    expect(byId(chips, "financing").badge).toBeNull();
    // Fallbacks mirror calc-analysis: propertyTaxPct ?? 1.1, insurancePct ?? 0.5.
    expect(byId(chips, "taxes").label).toBe("Taxes 1.1%");
    expect(byId(chips, "insurance").label).toBe("Insurance 0.5%");
    expect(byId(chips, "vacancy").label).toBe("Vacancy 5%");
    expect(byId(chips, "extras").label).toBe("Property extras: —");
    expect(byId(chips, "extras").target).toBe("extras");
    // No template linked → no template chip.
    expect(chips.find((c) => c.id === "template")).toBeUndefined();
    // Nothing auto-filled → nothing arms a pulse.
    expect(chips.every((c) => c.pulseKey === null)).toBe(true);
  });

  it("renders identically for identical values regardless of arrival path", () => {
    // Draft restore / Duplicate / saved-deal load / hand-typed all present as
    // "values, no capture" — the builder cannot tell them apart by design.
    const values: AssumptionChipValues = {
      ...defaultValues,
      interestRate: 6.9,
      propertyTaxPct: 1.31,
      yearBuilt: 1925,
      bathrooms: 2,
      sqft: 1400,
    };
    const a = buildAssumptionChips(values, {}, NO_OPTS);
    const b = buildAssumptionChips({ ...values }, {}, NO_OPTS);
    expect(a).toEqual(b);
    expect(byId(a, "financing").label).toBe("20% down @ 6.9%");
    expect(byId(a, "extras").label).toBe("Property extras: Built 1925 · 2 ba · 1,400 sq ft");
  });

  it("badges FRED-filled financing as live and state-filled taxes with the state code", () => {
    const chips = buildAssumptionChips(
      { ...defaultValues, interestRate: 6.9, propertyTaxPct: 1.31 } as AssumptionChipValues,
      fredAndState,
      NO_OPTS
    );
    const financing = byId(chips, "financing");
    expect(financing.label).toBe("20% down @ 6.9%");
    expect(financing.badge).toEqual({ kind: "live", text: "live rate" });
    expect(financing.pulseKey).toBe("rate:fred");
    const taxes = byId(chips, "taxes");
    expect(taxes.label).toBe("Taxes 1.31%");
    expect(taxes.badge).toEqual({ kind: "state", text: "PA" });
    expect(taxes.pulseKey).toBe("tax:state");
  });

  it("flips auto-filled badges to 'yours' once the user overrides the value", () => {
    const overridden: EnrichmentProvenanceInput = {
      interestRate: { source: "fred", overridden: true },
      propertyTaxPct: { source: "state-static", detail: "PA", overridden: true },
    };
    const chips = buildAssumptionChips(
      { ...defaultValues, interestRate: 7.5, propertyTaxPct: 2 } as AssumptionChipValues,
      overridden,
      NO_OPTS
    );
    expect(byId(chips, "financing").badge).toEqual({ kind: "yours", text: "yours" });
    expect(byId(chips, "financing").pulseKey).toBeNull();
    expect(byId(chips, "taxes").badge).toEqual({ kind: "yours", text: "yours" });
  });

  it("marks insurance + vacancy 'yours' when expenses were edited", () => {
    const chips = buildAssumptionChips(defaultValues as AssumptionChipValues, {}, {
      ...NO_OPTS,
      expensesEdited: true,
    });
    expect(byId(chips, "insurance").badge).toEqual({ kind: "yours", text: "yours" });
    expect(byId(chips, "vacancy").badge).toEqual({ kind: "yours", text: "yours" });
  });

  it("shows the annual tax bill when that input mode is active", () => {
    const chips = buildAssumptionChips(
      {
        ...defaultValues,
        propertyTaxInputMode: "annual",
        propertyTaxAnnual: 3204,
      } as AssumptionChipValues,
      {},
      NO_OPTS
    );
    expect(byId(chips, "taxes").label).toBe("Taxes $3,204/yr");
  });

  it("shows the monthly insurance override when that input mode is active", () => {
    const chips = buildAssumptionChips(
      {
        ...defaultValues,
        insuranceInputMode: "monthly",
        insuranceMonthly: 92,
      } as AssumptionChipValues,
      {},
      NO_OPTS
    );
    expect(byId(chips, "insurance").label).toBe("Insurance $92/mo");
  });

  it("renders the template chip with the resolved name and a template pulse key", () => {
    const chips = buildAssumptionChips(
      { ...defaultValues, templateId: "tpl-1" } as AssumptionChipValues,
      {},
      { ...NO_OPTS, templateName: "My SFH defaults" }
    );
    const template = byId(chips, "template");
    expect(template.label).toBe("Template: My SFH defaults");
    expect(template.applied).toBe(true);
    expect(template.target).toBe("property");
    expect(template.pulseKey).toBe("tpl:tpl-1");
  });

  it("falls back to 'Template: applied' when the id can't be resolved to a name", () => {
    const chips = buildAssumptionChips(
      { ...defaultValues, templateId: "tpl-unknown" } as AssumptionChipValues,
      {},
      NO_OPTS
    );
    expect(byId(chips, "template").label).toBe("Template: applied");
  });

  it("drops the template chip while a strategy is active (its card is unmounted)", () => {
    const chips = buildAssumptionChips(
      { ...defaultValues, templateId: "tpl-1" } as AssumptionChipValues,
      {},
      { ...NO_OPTS, templateName: "My SFH defaults", hasActiveStrategy: true }
    );
    expect(chips.find((c) => c.id === "template")).toBeUndefined();
  });

  it("points multi-family extras at the property card (year built lives there)", () => {
    const chips = buildAssumptionChips(
      { ...defaultValues, propertyType: "multi-family", yearBuilt: 1950 } as AssumptionChipValues,
      {},
      NO_OPTS
    );
    const extras = byId(chips, "extras");
    expect(extras.target).toBe("property");
    expect(extras.label).toBe("Property extras: Built 1950");
    // With a strategy active the year-built field is hidden for non-SF, so
    // the chip has nowhere to land and drops out.
    const strategic = buildAssumptionChips(
      { ...defaultValues, propertyType: "multi-family" } as AssumptionChipValues,
      {},
      { ...NO_OPTS, hasActiveStrategy: true }
    );
    expect(strategic.find((c) => c.id === "extras")).toBeUndefined();
  });

  it("tolerates RHF's transient NaN / string values without crashing", () => {
    const chips = buildAssumptionChips(
      {
        ...defaultValues,
        interestRate: Number.NaN,
        downPaymentPct: "" as unknown as number,
        sqft: "1400",
      } as AssumptionChipValues,
      {},
      NO_OPTS
    );
    expect(byId(chips, "financing").label).toBe("Financing —");
    expect(byId(chips, "extras").label).toBe("Property extras: 1,400 sq ft");
  });
});

describe("resolveTemplateName", () => {
  const options = [
    { id: "tpl-1", templateName: "My SFH defaults" },
    { id: "tpl-2", templateName: "Duplex conservative" },
  ];

  it("resolves from the loaded template list first", () => {
    expect(resolveTemplateName("tpl-2", options, null)).toBe("Duplex conservative");
  });

  it("falls back to the saved-deal template row", () => {
    expect(
      resolveTemplateName("tpl-9", options, { id: "tpl-9", templateName: "Archived template" })
    ).toBe("Archived template");
  });

  it("returns null when unresolvable or unset", () => {
    expect(resolveTemplateName("tpl-9", options, { id: "tpl-8", templateName: "Other" })).toBeNull();
    expect(resolveTemplateName(null, options, null)).toBeNull();
    expect(resolveTemplateName(undefined, [], null)).toBeNull();
  });
});

describe("computeExpensesEdited", () => {
  it("matches the exact dirty-field list the result strip uses", () => {
    expect(computeExpensesEdited({})).toBe(false);
    expect(computeExpensesEdited({ interestRate: true })).toBe(false);
    expect(computeExpensesEdited({ vacancyPct: true })).toBe(true);
    expect(computeExpensesEdited({ hoaMonthly: true })).toBe(true);
  });
});
