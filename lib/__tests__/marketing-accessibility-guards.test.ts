import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

type LinearRgb = [number, number, number];

function oklchToLinearRgb(lightness: number, chroma: number, hue: number): LinearRgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel))) as LinearRgb;
}

function cssToken(source: string, name: string): LinearRgb {
  const match = source.match(
    new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`)
  );
  expect(match, `missing --${name} OKLCH token`).not.toBeNull();
  return oklchToLinearRgb(Number(match![1]), Number(match![2]), Number(match![3]));
}

function relativeLuminance([red, green, blue]: LinearRgb): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: LinearRgb, background: LinearRgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

describe("marketing small-text contrast", () => {
  const globals = read("app/globals.css");

  it("keeps the narrow text variants above WCAG AA's 4.5:1 threshold", () => {
    const white: LinearRgb = [1, 1, 1];
    expect(contrast(cssToken(globals, "muted-foreground"), white)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "primary-foreground"), cssToken(globals, "primary"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast(cssToken(globals, "brand-orange-solid"), white)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "brand-orange-text"), cssToken(globals, "brand-orange-light"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "brand-blue-text"), cssToken(globals, "brand-blue-light"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "foreground"), cssToken(globals, "brand-green-light"))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the accessible variants on every audited failure surface", () => {
    const header = read("components/investcalc/header.tsx");
    expect(header).toContain("bg-[var(--brand-orange-solid)]");
    expect(header).toContain("text-[var(--brand-orange-text)]");

    const landing = read("components/marketing/landing-sections.tsx");
    expect(landing).toContain("text-[var(--brand-orange-text)]");
    expect(landing).toContain("text-[var(--brand-blue-text)]");
    expect(landing).toContain(
      'featured ? "text-[var(--brand-blue-text)]" : "text-muted-foreground"'
    );
    expect(landing).toContain(
      'bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-blue-text)]'
    );

    const pricing = read("components/marketing/pricing-toggle-plans.tsx");
    expect(pricing).toContain(': "text-muted-foreground line-through"');
    expect(pricing).not.toContain('"text-muted-foreground/60 line-through"');

    const ticker = read("components/marketing/deals-analyzed-ticker.tsx");
    expect(ticker).toContain(
      'text-[10px] font-medium text-foreground sm:text-[11px]'
    );
    expect(ticker).toContain("(50,000 historical + live measured)");
    expect(ticker).toContain("(50,000 historical; live counter unavailable)");

    const philadelphia = read("app/markets/philadelphia/page.tsx");
    expect(philadelphia).toContain('className="text-sm sm:text-base mb-4"');
    expect(philadelphia).not.toContain('className="text-sm sm:text-base opacity-90 mb-4"');

    const capRateTool = read("app/tools/cap-rate-calculator/page.tsx");
    expect(capRateTool).toContain('className="text-sm sm:text-base mb-4"');
    expect(capRateTool).toContain('className="text-sm space-y-1.5 mb-5"');
    expect(capRateTool).not.toContain('className="text-sm space-y-1.5 mb-5 opacity-90"');

    expect(read("components/investcalc/investcalc-page.tsx")).toContain(
      "text-[var(--brand-blue-text)] underline-offset-2"
    );
    expect(read("components/investcalc/live-verdict-panel.tsx")).toContain(
      "tracking-widest text-[var(--brand-blue-text)]"
    );
  });
});

describe("competitor outbound links", () => {
  it("links the Privy comparison to the current TLS-valid official domain", () => {
    const source = read("app/vs/privy/page.tsx");
    expect(source).toContain('href="https://www.privy.pro/"');
    expect(source).not.toContain("getprivy.com");
  });
});

describe("marketing landmarks and mobile targets", () => {
  it("keeps the Why TrueCap content inside the document's main landmark", () => {
    const source = read("app/why-truecap/page.tsx");
    const mainStart = source.indexOf('<main id="main">');
    const mainEnd = source.indexOf("</main>", mainStart);

    expect(mainStart).toBeGreaterThan(-1);
    expect(source.indexOf("<VsCompetitors />")).toBeGreaterThan(mainStart);
    expect(source.indexOf("<HomepageFaq structuredData={false} />")).toBeLessThan(mainEnd);
    expect(source.indexOf("<SiteFooter />")).toBeGreaterThan(mainEnd);
  });

  it("gives the promo dismiss control a 44px target while retaining its 28px visual", () => {
    const source = read("components/marketing/annual-promo-banner.tsx");
    expect(source).toContain(
      'className="group absolute right-0 top-1/2 inline-flex size-11'
    );
    expect(source).toContain(
      'className="inline-flex size-7 items-center justify-center rounded-full'
    );
  });

  it("removes the hidden mobile pricing link from keyboard navigation", () => {
    const source = read("components/investcalc/header.tsx");
    expect(source).toMatch(
      /<Link href="\/pricing" className="hidden xl:block">\s*<div className="flex items-center gap-2/
    );
    expect(source).not.toContain(
      '<Link href="/pricing">\n            <div className="hidden xl:flex'
    );
  });

  it("makes the wide Philadelphia benchmark table an identified keyboard-scroll region", () => {
    const source = read("app/markets/philadelphia/page.tsx");
    const regionAt = source.indexOf(
      'aria-label="Philadelphia cap rate benchmarks by neighborhood"'
    );
    const region = source.slice(Math.max(0, regionAt - 500), regionAt + 100);

    expect(regionAt).toBeGreaterThan(-1);
    expect(region).toContain("overflow-x-auto");
    expect(region).toContain("focus-visible:ring-2");
    expect(region).toContain("tabIndex={0}");
    expect(region).toContain('role="region"');
  });

  it("gives the homepage address field a persistent explicit label", () => {
    const source = read("components/marketing/hero-address-form.tsx");
    expect(source).toContain(
      '<label htmlFor="hero-property-address" className="sr-only">'
    );
    expect(source).toContain('inputId="hero-property-address"');
  });

  it("keeps centralized primary inputs and buttons at least 44px tall on mobile", () => {
    const input = read("components/ui/input.tsx");
    expect(input).toMatch(/border-input h-11 .* md:h-9 md:text-sm/);

    const button = read("components/ui/button.tsx");
    expect(button).toContain("default: 'h-11 px-4 py-2 has-[>svg]:px-3 md:h-9'");
    expect(button).toContain("lg: 'h-11 rounded-md px-6 has-[>svg]:px-4 md:h-10'");

    const header = read("components/investcalc/header.tsx");
    expect(header).toContain('className="h-11 px-3 sm:h-9 sm:px-4');
    expect(header).toContain('"h-11 px-4 sm:h-9 sm:px-5 rounded-full');

    const listingLink = read("components/investcalc/listing-link-input.tsx");
    expect(listingLink.match(/inline-flex min-h-11 items-center/g)).toHaveLength(2);
    expect(listingLink).toContain(
      'className="min-h-11 min-w-0 flex-1 rounded-lg border border-input'
    );
    expect(listingLink).toContain(
      'className="min-h-11 shrink-0 rounded-lg bg-primary'
    );

    const cookieBanner = read("components/marketing/cookie-consent-banner.tsx");
    expect(cookieBanner.match(/className="inline-flex h-11 items-center/g)).toHaveLength(2);
    expect(cookieBanner).toContain('className="inline-flex size-11 shrink-0');
  });
});

describe("anonymous blog feature links", () => {
  it("preserves saved-deals intent through signup", () => {
    const source = read("app/blog/1031-exchange-basics/page.tsx");
    expect(source).toContain(
      'href="/auth/sign-up?next=%2Fdashboard%2Fsaved-analyses"'
    );
    expect(source).not.toContain('href="/dashboard/saved-analyses"');
  });

  it("preserves Pro-template intent through signup and pricing", () => {
    const source = read("app/blog/house-hacking-explained/page.tsx");
    expect(source).toContain(
      'href="/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly%23plans"'
    );
    expect(source).not.toContain('href="/dashboard/templates"');
  });
});
