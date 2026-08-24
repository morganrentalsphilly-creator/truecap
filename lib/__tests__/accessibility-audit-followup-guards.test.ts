import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("accessibility audit follow-up guards", () => {
  it("keeps capture and testimonial fields persistently named", () => {
    const emailPrompt = read("../../components/marketing/post-analysis-email-prompt.tsx");
    expect(emailPrompt).toContain('htmlFor="post-analysis-email"');
    expect(emailPrompt).toContain('id="post-analysis-email"');
    expect(emailPrompt).toContain('name="email"');
    expect(emailPrompt).toContain('aria-invalid={status === "error" || undefined}');
    expect(emailPrompt).toContain('id="post-analysis-email-error"');
    expect(emailPrompt).toContain('role="alert"');

    const testimonial = read("../../components/marketing/testimonial-prompt.tsx");
    for (const [id, name] of [
      ["testimonial-quote", "quote"],
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
    expect(source).toContain('aria-describedby={hasError ? "listing-url-error" : undefined}');
    expect(source).toContain('id="listing-url-error"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="assertive"');
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
    const pmiLabel = financing.slice(financing.indexOf('htmlFor="pmiNoCancel"'));
    expect(pmiLabel.slice(0, pmiLabel.indexOf("</label>"))).toContain("min-h-11");

    const anchors = read("../../components/investcalc/deal-workspace-anchor-chips.tsx");
    expect(anchors).toContain("inline-flex min-h-11 min-w-11");

    const tour = read("../../components/marketing/onboarding-tour.tsx");
    const tourLink = tour.slice(tour.indexOf("<Link"), tour.indexOf("</Link>"));
    expect(tourLink).toContain("min-h-11 min-w-11");
  });

  it("exposes the advanced template disclosure state and controlled region", () => {
    const source = read("../../components/investcalc/template-form-dialog.tsx");
    expect(source).toContain("aria-expanded={showAdvanced}");
    expect(source).toContain('aria-controls={`${formId}-advanced-assumptions`}');
    expect(source).toContain('id={`${formId}-advanced-assumptions`}');
  });

  it("avoids narrow-screen horizontal scrolling on audited surfaces", () => {
    const rail = read("../../components/investcalc/analyzer-step-rail.tsx");
    expect(rail).toContain('ol className="flex flex-wrap');
    expect(rail).not.toContain("overflow-x-auto");

    const calculator = read("../../components/investcalc/investcalc-page.tsx");
    const welcome = calculator.slice(
      calculator.indexOf('{/* "Welcome back" banner'),
      calculator.indexOf("{/* Input tabs", calculator.indexOf('{/* "Welcome back" banner')),
    );
    expect(welcome).toContain("flex min-w-0");
    expect(welcome).toContain("[overflow-wrap:anywhere]");

    const landing = read("../../components/marketing/landing-sections.tsx");
    const comparison = landing.slice(
      landing.indexOf('aria-label="Free and Pro comparison"'),
      landing.indexOf("</table>", landing.indexOf('aria-label="Free and Pro comparison"')),
    );
    expect(comparison).toContain("table-fixed");
    expect(comparison).not.toContain("overflow-x-auto");
    expect(comparison).not.toContain("min-w-[560px]");
    expect(landing).not.toContain("Swipe to compare all three");
  });
});
