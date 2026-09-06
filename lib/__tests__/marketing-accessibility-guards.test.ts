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
    expect(contrast(cssToken(globals, "brand-orange-solid"), white)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "brand-orange-text"), cssToken(globals, "brand-orange-light"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(cssToken(globals, "brand-blue-text"), cssToken(globals, "brand-blue-light"))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the accessible variants on every audited failure surface", () => {
    const header = read("components/investcalc/header.tsx");
    expect(header).toContain("bg-[var(--brand-orange-solid)]");
    expect(header).toContain("text-[var(--brand-orange-text)]");

    const landing = read("components/marketing/landing-sections.tsx");
    expect(landing).toContain("text-[var(--brand-orange-text)]");
    expect(landing).toContain("text-[var(--brand-blue-text)]");

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

  it("keeps centralized primary inputs and buttons at least 44px tall", () => {
    const input = read("components/ui/input.tsx");
    expect(input).toMatch(/border-input h-9 min-h-11 /);

    const button = read("components/ui/button.tsx");
    expect(button).toContain("inline-flex min-h-11 min-w-11");
    expect(button).toContain("default: 'h-11 px-4 py-2 has-[>svg]:px-3 md:h-9'");
    expect(button).toContain("lg: 'h-11 rounded-md px-6 has-[>svg]:px-4 md:h-10'");

    const header = read("components/investcalc/header.tsx");
    // Desktop auth buttons are lg+ only; phones get ONE header row with a
    // 44px primary Analyze button and a 44px hamburger.
    expect(header).toContain('className="hidden lg:inline-flex h-9 px-4');
    expect(header).toContain('"lg:hidden h-11 px-4 rounded-full');
    expect(read("components/marketing/marketing-nav.tsx")).toContain(
      "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
    );
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
