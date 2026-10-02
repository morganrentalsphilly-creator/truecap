import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
