import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEmbedAttributionHref,
  embedFrameTitle,
} from "@/lib/embed-attribution";
import {
  EMBEDDABLE_CALCULATORS,
  EMBEDDABLE_COUNT,
} from "@/lib/calculator-registry";

const ROOT = join(import.meta.dirname, "../..");

describe("embed attribution", () => {
  it("uses one calculator-specific, privacy-safe campaign contract", () => {
    for (const calculator of EMBEDDABLE_CALCULATORS) {
      const href = buildEmbedAttributionHref({
        siteUrl: "https://usetruecap.com",
        toolPath: `/tools/${calculator.slug}`,
        calculatorSlug: calculator.slug,
      });
      const url = new URL(href);
      expect(url.origin).toBe("https://usetruecap.com");
      expect(url.pathname).toBe(`/tools/${calculator.slug}`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        utm_source: "embed",
        utm_medium: "referral",
        utm_campaign: calculator.slug,
      });
      expect(href).not.toMatch(/(?:address|email|name|price|rent|ref)=/i);
    }
    expect(EMBEDDABLE_CALCULATORS).toHaveLength(EMBEDDABLE_COUNT);
  });

  it("rejects mismatched, malformed, and insecure attribution inputs", () => {
    expect(() =>
      buildEmbedAttributionHref({
        siteUrl: "https://usetruecap.com",
        toolPath: "/tools/arv-calculator",
        calculatorSlug: "other-calculator",
      }),
    ).toThrow(/match/i);
    expect(() =>
      buildEmbedAttributionHref({
        siteUrl: "https://usetruecap.com",
        toolPath: "/tools/arv-calculator",
        calculatorSlug: "../private",
      }),
    ).toThrow(/slug/i);
    expect(() =>
      buildEmbedAttributionHref({
        siteUrl: "http://example.com",
        toolPath: "/tools/arv-calculator",
        calculatorSlug: "arv-calculator",
      }),
    ).toThrow(/HTTPS/i);
  });

  it("allows HTTP only for the loopback origins used by local previews", () => {
    for (const siteUrl of [
      "http://localhost:3100",
      "http://127.0.0.1:3100",
      "http://[::1]:3100",
    ]) {
      expect(
        new URL(
          buildEmbedAttributionHref({
            siteUrl,
            toolPath: "/tools/arv-calculator",
            calculatorSlug: "arv-calculator",
          }),
        ).origin,
      ).toBe(siteUrl);
    }
  });

  it("generates a calculator-specific frame title", () => {
    expect(embedFrameTitle("ARV Calculator")).toBe("ARV Calculator by TrueCap");
  });

  it("keeps snippets lazy, sandboxed, responsive, and campaign-tagged", () => {
    const code = readFileSync(
      join(ROOT, "components/embed/embed-code-block.tsx"),
      "utf8",
    );
    const page = readFileSync(join(ROOT, "app/embed/[slug]/page.tsx"), "utf8");
    const referral = readFileSync(
      join(ROOT, "components/embed/embed-referral-tracker.tsx"),
      "utf8",
    );
    expect(code).toContain('loading="lazy"');
    expect(code).toContain('style="width:100%; max-width:640px;');
    expect(code).toContain(
      'sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation"',
    );
    expect(code).toContain('referrerpolicy="no-referrer"');
    expect(code).toContain('title="${embedFrameTitle(title)}"');
    expect(code).toContain("buildEmbedAttributionHref");
    expect(code).toContain('e.origin!=="${embedOrigin}"');
    expect(code).toContain("e.source!==f.contentWindow");
    expect(code).toContain("Number.isFinite(d.height)");
    expect(code).toContain(
      "Math.min(2400,Math.max(${defaultHeight},d.height))",
    );
    expect(code).not.toContain('title="TrueCap calculator"');
    expect(page).toContain("buildEmbedAttributionHref");
    expect(referral).toContain("Underwrite a full property in TrueCap");
  });
});
