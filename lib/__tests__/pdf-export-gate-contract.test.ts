import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE PDF EXPORT GATE MUST LIVE ON THE SERVER.
 *
 * For most of this app's life the report was composed in the browser and the
 * only thing standing between a free user and the paid PDF was a React prop
 * (`canExportPdf`). That is not a gate: the prop can be flipped in devtools,
 * and the generator module could be imported straight out of the page bundle
 * and called.
 *
 * These are SOURCE-LEVEL contract tests, deliberately. The property they
 * defend — "no client component can produce a PDF by itself" — is a property
 * of the import graph, not of any single function's behaviour, so a unit test
 * on a function cannot express it. If one of these fails, the export gate has
 * probably regressed to the client; do not delete the assertion to make it
 * pass.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** Strip comments so prose ABOUT the pattern never satisfies a check for it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const serverAction = stripComments(read("app/actions/generate-report-pdf.ts"));
const generator = stripComments(read("lib/pdf-generator.ts"));
const analyzer = stripComments(read("components/investcalc/investcalc-page.tsx"));
const savedAnalyses = stripComments(
  read("components/investcalc/saved-analyses-page-v2.tsx")
);
const loadImage = stripComments(read("lib/pdf/load-image.ts"));

const CLIENT_SURFACES: Array<[string, string]> = [
  ["investcalc-page", analyzer],
  ["saved-analyses-page-v2", savedAnalyses],
];

describe("PDF export gate lives on the server", () => {
  it("declares the action as a server module", () => {
    expect(serverAction.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("checks the pdf_export entitlement before rendering anything", () => {
    expect(serverAction).toContain('hasPlanFeature(entitlements, "pdf_export")');
    expect(serverAction).toContain("getEntitlementsForUser");
    // The gate must run BEFORE the generator is even imported.
    expect(serverAction.indexOf("checkGate")).toBeLessThan(
      serverAction.indexOf("generateInvestmentPDFBlob")
    );
  });

  it("rejects an unauthenticated caller that holds no valid claim", () => {
    expect(serverAction).toContain("SIGN_IN_REQUIRED");
    expect(serverAction).toContain("ENTITLEMENT_REQUIRED");
  });

  it("fails CLOSED when the one-time claim ledger cannot be read", () => {
    // The catch inside claimGrantsExport must return false, never true.
    const fn = serverAction.slice(
      serverAction.indexOf("async function claimGrantsExport"),
      serverAction.indexOf("async function checkGate")
    );
    expect(fn).toContain("return false");
    expect(fn).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*return true/);
  });

  it("binds a one-time claim to a paid, unexpired, deal-matched purchase", () => {
    expect(serverAction).toContain("claimSecretMatches");
    expect(serverAction).toContain("fingerprintOneTimePdfDeal");
    expect(serverAction).toContain("data.consumed_at");
  });

  it("resolves branding server-side rather than trusting the caller", () => {
    expect(serverAction).toContain("getBranding");
    // A `branding` field on the input schema would let any caller co-brand.
    expect(serverAction).not.toMatch(/^\s*branding:\s*brandingSchema/m);
  });
});

describe("no client surface can compose a PDF by itself", () => {
  for (const [name, source] of CLIENT_SURFACES) {
    it(`${name} imports the generator only as a type`, () => {
      // A value import of the generator would put jsPDF back in the browser
      // and make a client-side render possible again.
      const valueImports = source.match(
        /import\s+(?!type\b)[^;]*from\s+["']@\/lib\/pdf-generator["']/g
      );
      expect(valueImports).toBeNull();

      const dynamicImports = source.match(/await\s+import\(\s*["']@\/lib\/pdf-generator["']\s*\)/g);
      expect(dynamicImports).toBeNull();
    });

    it(`${name} routes export through the gated server action`, () => {
      expect(source).toContain("generateReportPdfAction");
    });
  }
});

describe("the generator stays free of the DOM", () => {
  it("does not reach for document, window, Image, FileReader or a canvas", () => {
    for (const forbidden of [
      "document.createElement",
      "document.body",
      "new Image(",
      "new FileReader(",
      "getContext(",
      "toDataURL(",
      "requestAnimationFrame(",
      "doc.save(",
    ]) {
      expect(generator.includes(forbidden)).toBe(false);
    }
  });

  it("no longer depends on chart.js", () => {
    expect(generator).not.toContain('from "chart.js"');
    expect(generator).toContain("@/lib/pdf/vector-charts");
  });
});

describe("server-side logo fetching is allowlisted", () => {
  it("constrains the host before any request is made", () => {
    // branding.logo_url is user-supplied and host-unconstrained (see
    // lib/branding-values.ts), so a server-side fetch of it is SSRF.
    expect(loadImage).toContain("isAllowedLogoUrl");
    expect(loadImage).toContain("allowedOrigins");
    expect(loadImage).toContain("branding-logos");
    expect(loadImage).toContain('url.protocol !== "https:"');
  });

  it("does not follow redirects on the server", () => {
    expect(loadImage).toContain('redirect: isServer ? "error" : "follow"');
  });

  it("checks the allowlist before fetching, not after", () => {
    expect(loadImage.indexOf("isAllowedLogoUrl(source)")).toBeLessThan(
      loadImage.indexOf("readBytes(source)")
    );
  });
});
