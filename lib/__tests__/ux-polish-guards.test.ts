import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("global skip-link destinations", () => {
  const routes = [
    "app/reviews/page.tsx",
    "app/playbook/page.tsx",
    "app/markets/page.tsx",
    "app/markets/[city]/page.tsx",
    "app/markets/[city]/[strategy]/page.tsx",
    "app/states/page.tsx",
    "app/states/[slug]/page.tsx",
    "app/portal/[token]/page.tsx",
    "app/tools/roi-calculator/page.tsx",
    "app/tools/break-even-calculator/page.tsx",
    "app/tools/closing-cost-calculator/page.tsx",
    "app/tools/vacancy-rate-calculator/page.tsx",
    "app/admin/seo/page.tsx",
    "app/admin/testimonials/page.tsx",
    "app/admin/email-preview/page.tsx",
    "app/d/[encoded]/page.tsx",
    "app/glossary/[slug]/page.tsx",
    "app/error.tsx",
    "app/not-found.tsx",
  ];

  it.each(routes)("keeps #main available on %s", (path) => {
    expect(read(path), path).toMatch(/<main\s+id="main"/);
  });

  it("keeps every admin email-preview return branch inside #main", () => {
    expect(
      read("app/admin/email-preview/page.tsx").match(/<main id="main"/g),
    ).toHaveLength(4);
  });
});

describe("public calculator validation and claims", () => {
  it("wires every live calculator through bounded, described fields", () => {
    const field = read("components/tools/tool-number-field.tsx");
    expect(field).toContain("aria-invalid={error ? true : undefined}");
    expect(field).toContain("aria-describedby={describedBy}");
    expect(field).toContain('role="alert"');

    for (const path of [
      "components/tools/roi-calculator-widget.tsx",
      "components/tools/break-even-calculator-widget.tsx",
      "components/tools/closing-cost-calculator-widget.tsx",
    ]) {
      const source = read(path);
      expect(source, path).toContain("ToolNumberField");
      expect(source, path).toContain("validateToolNumber");
      expect(source, path).toContain('role="status"');
      expect(source, path).toContain("min-h-11");
    }
  });

  it("keeps the quick tools factual instead of recommending an investment", () => {
    const source = [
      read("components/tools/roi-calculator-widget.tsx"),
      read("components/tools/break-even-calculator-widget.tsx"),
      read("components/tools/closing-cost-calculator-widget.tsx"),
    ].join("\n");
    expect(source).not.toMatch(
      /better than most index funds|strong cash flow play|don.t deploy capital/i,
    );
    expect(source).toContain("not a recommendation or a market benchmark");
    expect(source).toContain("No cash-flow break-even");
    expect(source).toContain("Modeled costs from 2% to 4%");
  });
});

describe("dashboard accessibility and recovery", () => {
  it("distinguishes search failures and keeps focus on one combobox pattern", () => {
    const source = read("components/dashboard/Topbar.tsx");
    expect(source).toContain("setSearchError");
    expect(source).toContain("Saved-deal search failed");
    expect(source).toContain("Couldn’t search saved deals");
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain('role="combobox"');
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="alert"');
  });

  it("exposes a semantic loading state without announcing every skeleton", () => {
    const source = read("app/dashboard/loading.tsx");
    expect(source).toContain('<main id="main" aria-busy="true"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-hidden="true" className="contents"');
  });

  it("names the workspace My Deals and gives route errors a retry", () => {
    expect(read("app/dashboard/saved-analyses/page.tsx")).toContain(
      'title: "My Deals"',
    );
    expect(
      normalizeSource(read("components/investcalc/saved-analyses-page-v2.tsx")),
    ).toContain(normalizeSource(">My Deals</h1>"));
    expect(read("app/dashboard/page.tsx")).toContain("<RetryRouteButton");
    expect(read("app/dashboard/saved-analyses/page.tsx")).toContain(
      "<RetryRouteButton",
    );
    expect(read("app/dashboard/templates/page.tsx")).toContain(
      "<RetryRouteButton",
    );
    expect(
      read("app/dashboard/compare/page.tsx").match(/<RetryRouteButton/g),
    ).toHaveLength(2);
    expect(read("components/dashboard/retry-route-button.tsx")).toContain(
      "router.refresh()",
    );
  });

  it("uses deal-count-aware mobile comparison columns", () => {
    const source = read("components/investcalc/compare-deals-client.tsx");
    // Every comparison surface may grow as truthful rows are added; guard the
    // shared responsive helper, not an incidental number of call sites.
    expect(source).toContain("comparisonGridColumns(deals.length)");
    expect(source).not.toMatch(/grid-cols-\$\{/);
    expect(read("lib/compare-responsive.ts")).toContain(
      'return "grid-cols-2 sm:grid-cols-4"',
    );
  });

  it("keeps document confirmation actions at least 44px tall", () => {
    const source = read("components/investcalc/deal-documents-card.tsx");
    // Scope to the confirm popover itself: the extraction panel added later
    // in the file has its own min-h-11 buttons, which are not what this pin
    // guards. Bound the slice at the popover's close.
    const start = source.indexOf("Delete this document?");
    const end = source.indexOf("</PopoverContent>", start);
    const confirmation = source.slice(start, end);
    expect(confirmation.match(/className="min-h-11"/g)).toHaveLength(2);
  });
});

describe("non-pointer help and concise announcements", () => {
  it("opens quick-screen definitions by keyboard or tap", () => {
    const source = read("components/investcalc/analysis-dashboard.tsx");
    expect(source).not.toContain("title={c.hint}");
    expect(source).toContain(
      "aria-label={`${c.label}: ${c.value}. Show definition`}",
    );
    expect(source).toContain("<PopoverContent");
  });

  it("announces only the Offer Ceiling summary, not the whole result card", () => {
    const source = read("components/investcalc/focused-decision-summary.tsx");
    expect(source).toContain("const offerCeilingAnnouncement");
    expect(source).toContain("{offerCeilingAnnouncement}");
    expect(source).not.toMatch(
      /<div\s+aria-live="polite"\s+aria-atomic="true"/,
    );
  });

  it("uses AA-safe small text on the focused result's blue panels", () => {
    const source = read("components/investcalc/focused-decision-summary.tsx");
    expect(source).toContain(
      "uppercase tracking-widest text-[var(--brand-blue-text)]",
    );
    expect(normalizeSource(source)).toContain(
      normalizeSource(
        'uppercase tracking-widest text-foreground/75">Best next step',
      ),
    );
    expect(normalizeSource(source)).toContain(
      normalizeSource(
        'leading-relaxed text-foreground/80">{resolvedNextAction.reason}',
      ),
    );
  });
});

describe("browser capability recovery and crawl path", () => {
  it("redirects the unreleased tax calculator to educational material", () => {
    const source = read("app/tools/rental-property-tax-calculator/page.tsx");
    expect(source).toContain(
      'HISTORICAL_TOOL_REDIRECTS["rental-property-tax-calculator"]',
    );
    expect(source).not.toContain("RentalPropertyTaxCalculatorWidget");
    expect(source).not.toContain("SoftwareApplication");
  });

  it("surfaces blocked tabs and storage, and avoids async PDF popups", () => {
    const handoff = read(
      "components/investcalc/open-saved-deal-in-analyzer.tsx",
    );
    const deals = read("components/investcalc/saved-analyses-page-v2.tsx");
    expect(handoff).toContain("POPUP_BLOCKED_MESSAGE");
    expect(handoff).toContain("HANDOFF_STORAGE_BLOCKED_MESSAGE");
    expect(handoff).toContain("if (!targetWindow) return { ok: false");
    expect(deals).toContain("downloadPdfFromBase64");
    expect(deals).not.toContain("window.location.assign(pdfUrl)");
  });

  it("warns when Google address suggestions fail without blocking typed input", () => {
    const source = read("components/investcalc/address-autocomplete.tsx");
    expect(source).toContain("setAutocompleteWarning");
    expect(source).toContain("You can still type or paste the full address.");
    expect(source).toContain("id={autocompleteWarningId}");
    expect(source).toContain("window.__googleMapsPlacesLoading = undefined");
  });

  it("links the sitemap sample memo from the homepage sample context", () => {
    expect(read("components/marketing/hero-address-form.tsx")).toContain(
      'href="/sample-decision-memo"',
    );
  });
});

describe("conversion touch targets", () => {
  it("keeps the invalid-share recovery action at least 44px tall", () => {
    expect(read("app/d/[encoded]/page.tsx")).toContain(
      'className="mt-6 inline-flex min-h-11',
    );
  });

  it.each(["components/marketing/seo-analyzer-cta.tsx"])(
    "keeps audited links at least 44 CSS pixels tall in %s",
    (path) => {
      expect(read(path), path).toContain("min-h-11");
    },
  );

  it.each([
    "components/marketing/blog-sticky-cta.tsx",
    "components/marketing/tools-conversion-cta.tsx",
  ])(
    "delegates audited wrapper links to the accessible shared CTA in %s",
    (path) => {
      expect(read(path), path).toContain("<SeoAnalyzerCta");
    },
  );
});
