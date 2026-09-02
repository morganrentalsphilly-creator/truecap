import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("accessibility audit follow-up guards", () => {
  it("keeps capture and testimonial fields persistently named", () => {
    const emailPrompt = read(
      "../../components/marketing/post-analysis-email-prompt.tsx",
    );
    expect(emailPrompt).toContain('htmlFor="post-analysis-email"');
    expect(emailPrompt).toContain('id="post-analysis-email"');
    expect(emailPrompt).toContain('name="email"');
    expect(emailPrompt).toContain(
      'aria-invalid={status === "error" || undefined}',
    );
    expect(emailPrompt).toContain('id="post-analysis-email-error"');
    expect(emailPrompt).toContain('role="alert"');

    const testimonial = read(
      "../../components/marketing/testimonial-prompt.tsx",
    );
    for (const [id, name] of [
      ["testimonial-quote", "quote"],
      ["testimonial-display-format", "preferredDisplayNameFormat"],
      ["testimonial-display-name", "displayName"],
      ["testimonial-role", "roleSegment"],
    ] as const) {
      expect(testimonial).toContain(`htmlFor="${id}"`);
      expect(testimonial).toContain(`id="${id}"`);
      expect(testimonial).toContain(`name="${name}"`);
    }
    expect(testimonial).toContain('name="consentToPublish"');
  });

  it("connects the listing-link input to its live error", () => {
    const source = read("../../components/investcalc/listing-link-input.tsx");
    expect(source).toContain("aria-invalid={hasError || undefined}");
    expect(normalizeSource(source)).toContain(
      normalizeSource(
        'aria-describedby={hasError ? "listing-url-help listing-url-error" : "listing-url-help"}',
      ),
    );
    expect(source).toContain('id="listing-url-help"');
    expect(source).toContain('id="listing-url-error"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="assertive"');
  });

  it("keeps the primary property inputs plainly named and safe at narrow effective widths", () => {
    const property = read(
      "../../components/investcalc/property-details-section.tsx",
    );
    expect(normalizeSource(property)).toContain(
      normalizeSource(">1. Property</legend>"),
    );
    expect(normalizeSource(property)).toContain(
      normalizeSource(">2. Purchase price</legend>"),
    );
    expect(property).toContain('bare ? "Price to analyze" : "Purchase Price"');
    expect(property).toContain('aria-describedby="property-lookup-help"');
    expect(property).toContain('id="property-lookup-help"');
    expect(property).toContain("max-w-full gap-1.5 whitespace-normal");
    expect(property).toContain('"Look up property details"');

    const unit = read(
      "../../components/investcalc/single-family-unit-section.tsx",
    );
    expect(unit).not.toContain("GlossaryTip");
    expect(unit).toContain('{rentLabel ?? "Expected gross monthly rent"}');
    expect(unit).toContain("aria-describedby={monthlyRentDescribedBy}");
    expect(unit).toContain('id="monthlyRent-help"');
    expect(unit).toContain('"grid-cols-1 sm:grid-cols-2"');
    expect(unit).toContain(
      "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
    );
  });

  it("keeps listing-link actions touch-sized and wrap-safe", () => {
    const source = read("../../components/investcalc/listing-link-input.tsx");
    expect(source).toContain("Use a listing link to fill the address");
    expect(source).toContain("Use address from link");
    expect(source).toContain("Use the address instead");
    expect(source).toContain("mt-2 flex flex-wrap gap-2");
    expect(source.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("forwards explicit template changes and supports a controlled expense disclosure", () => {
    const propertyType = read(
      "../../components/investcalc/property-type-section.tsx",
    );
    expect(propertyType).toContain(
      "onExplicitTemplateChange={onExplicitTemplateChange}",
    );

    const expenses = read(
      "../../components/investcalc/operating-expenses-section.tsx",
    );
    expect(expenses).toContain("detailsOpen?: boolean");
    expect(expenses).toContain("onDetailsOpenChange?: (open: boolean) => void");
    expect(expenses).toContain(
      "const showAdvanced = detailsOpen ?? internalDetailsOpen",
    );
    expect(expenses).toContain("aria-controls={OPERATING_EXPENSES_DETAILS_ID}");
    expect(expenses).toContain("id={OPERATING_EXPENSES_DETAILS_ID}");
    expect(expenses).not.toContain("setShowAdvanced");
  });

  it("keeps guidance controls separate from financing and expense field labels", () => {
    const financing = read("../../components/investcalc/financing-section.tsx");
    // Container-query grid (the card renders in a ~670px pane beside the
    // live preview, so viewport variants packed 4 columns into half the
    // screen and char-wrapped the headers).
    expect(financing).toContain("grid grid-cols-1 @xl:grid-cols-2");
    expect(financing).toContain("@container");
    expect(financing).not.toMatch(/<Label[^>]*>\s*<GlossaryTip/);
    expect(financing).toContain('htmlFor="downPaymentPct"');
    expect(financing).toContain("Down Payment %");

    const expenses = read(
      "../../components/investcalc/operating-expenses-section.tsx",
    );
    expect(expenses).toContain("function FieldHelpTooltip");
    expect(expenses).not.toContain("FieldLabelWithTooltip");
    expect(expenses).toContain("<Label");
    expect(expenses).toContain("<FieldHelpTooltip label={label}");
  });

  it("uses listbox options without a nested focusable button", () => {
    const source = read("../../components/investcalc/address-autocomplete.tsx");
    const options = source.slice(source.indexOf("{predictions.map"));
    expect(options).toContain('role="option"');
    expect(options).toContain("onClick={() => handleSelect(p)}");
    expect(options).not.toContain("<button");
  });

  it("keeps the audited checkbox and navigation targets at least 44px", () => {
    const financing = read("../../components/investcalc/financing-section.tsx");
    const pmiLabel = financing.slice(
      financing.indexOf('htmlFor="pmiNoCancel"'),
    );
    expect(pmiLabel.slice(0, pmiLabel.indexOf("</label>"))).toContain(
      "min-h-11",
    );

    const anchors = read(
      "../../components/investcalc/deal-workspace-anchor-chips.tsx",
    );
    expect(anchors).toContain("inline-flex min-h-11 min-w-11");

    const tour = read("../../components/marketing/onboarding-tour.tsx");
    const tourLink = tour.slice(tour.indexOf("<Link"), tour.indexOf("</Link>"));
    expect(tourLink).toContain("min-h-11 min-w-11");
  });

  it("keeps switches, mode groups, and specialist layouts usable at extreme zoom", () => {
    const switchSource = read("../../components/ui/switch.tsx");
    expect(switchSource).toContain("inline-flex size-11");

    const expenses = read(
      "../../components/investcalc/operating-expenses-section.tsx",
    );
    expect(expenses).toContain('aria-label="Property tax input mode"');
    expect(expenses).toContain('aria-label="Insurance input mode"');
    expect(expenses).toContain("clearInvalidAlternateValue");
    expect(
      expenses.match(/min-\[240px\]:grid-cols-2/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(expenses).toContain("focus-visible:ring-ring");
    expect(expenses).toContain("min-[240px]:flex-row");
    expect(expenses).not.toContain("text-[var(--brand-orange)]/70");
    expect(expenses).not.toContain("border-[var(--brand-orange)]/15");
    expect(expenses).not.toContain(
      "focus-visible:ring-[var(--brand-orange)]/25",
    );

    const financing = read("../../components/investcalc/financing-section.tsx");
    expect(financing).toContain("flex min-w-0 flex-wrap items-center");
    expect(financing).toContain("border-input bg-background");
    expect(financing).toContain("focus-visible:ring-ring");
    expect(financing).not.toContain("border-[var(--brand-green)]/30");
    expect(financing).not.toContain(
      "focus-visible:ring-[var(--brand-green)]/30",
    );

    const propertyType = read(
      "../../components/investcalc/property-type-section.tsx",
    );
    expect(propertyType).toContain(
      "grid grid-cols-1 gap-2 min-[320px]:grid-cols-3",
    );

    const units = read(
      "../../components/investcalc/multi-family-units-section.tsx",
    );
    expect(units).toContain(
      "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
    );
    expect(units).toContain("<fieldset");
    expect(units).toContain('<legend className="sr-only">');
    expect(units).toContain('", owner occupied"');

    const stickyBar = read(
      "../../components/investcalc/sticky-calculate-bar.tsx",
    );
    expect(stickyBar).toContain(
      "flex flex-col items-stretch gap-2 min-[280px]:flex-row",
    );
    expect(stickyBar).toContain("min-[280px]:w-auto");

    const preview = read("../../components/investcalc/live-verdict-panel.tsx");
    expect(preview).toContain("grid grid-cols-1 gap-2 min-[320px]:grid-cols-3");
  });

  it("gates server-rendered calculator controls until bootstrap reconciliation finishes", () => {
    const calculator = read("../../components/investcalc/investcalc-page.tsx");
    expect(calculator).toContain(
      'data-calculator-ready={isCalculatorReady ? "true" : "false"}',
    );
    expect(calculator).toContain("aria-busy={!isCalculatorReady}");
    expect(calculator).toContain(
      "inert={isCalculatorReady ? undefined : true}",
    );
  });

  it("exposes the advanced template disclosure state and controlled region", () => {
    const source = read("../../components/investcalc/template-form-dialog.tsx");
    expect(source).toContain("aria-expanded={showAdvanced}");
    expect(source).toContain(
      "aria-controls={`${formId}-advanced-assumptions`}",
    );
    expect(source).toContain("id={`${formId}-advanced-assumptions`}");
  });

  it("avoids narrow-screen horizontal scrolling on audited surfaces", () => {
    const rail = read("../../components/investcalc/analyzer-step-rail.tsx");
    expect(rail).toContain('ol className="flex flex-wrap');
    expect(rail).not.toContain("overflow-x-auto");

    const calculator = read("../../components/investcalc/investcalc-page.tsx");
    const restoredDraftNotice = calculator.slice(
      calculator.indexOf("{/* Restored-draft notice"),
      calculator.indexOf(
        "{/* Input tabs",
        calculator.indexOf("{/* Restored-draft notice"),
      ),
    );
    expect(restoredDraftNotice).toContain("flex min-w-0");
    expect(restoredDraftNotice).toContain("[overflow-wrap:anywhere]");

    const landing = read("../../components/marketing/landing-sections.tsx");
    const comparison = landing.slice(
      landing.indexOf('aria-label="Free and Pro comparison"'),
      landing.indexOf(
        "</table>",
        landing.indexOf('aria-label="Free and Pro comparison"'),
      ),
    );
    expect(comparison).toContain("table-fixed");
    expect(comparison).not.toContain("overflow-x-auto");
    expect(comparison).not.toContain("min-w-[560px]");
    expect(landing).not.toContain("Swipe to compare all three");
  });
});
