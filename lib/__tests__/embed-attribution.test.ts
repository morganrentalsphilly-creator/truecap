import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEmbedAttributionHref,
  buildEmbedPoweredByHref,
  embedFrameTitle,
} from "@/lib/embed-attribution";
import {
  EMBEDDABLE_CALCULATORS,
  EMBEDDABLE_COUNT,
} from "@/lib/calculator-registry";
import { buildEmbedSnippet, EMBED_IFRAME_SANDBOX } from "@/lib/embed-snippet";

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

  it("points the Powered-by credit at the bare, canonical tool page", () => {
    for (const calculator of EMBEDDABLE_CALCULATORS) {
      expect(buildEmbedPoweredByHref(calculator.slug)).toBe(
        `https://usetruecap.com/tools/${calculator.slug}`,
      );
    }
    expect(() => buildEmbedPoweredByHref("../private")).toThrow(/slug/i);
    expect(() => buildEmbedPoweredByHref("arv-calculator?x=1")).toThrow(/slug/i);
  });

  it("keeps snippets lazy, sandboxed, responsive, and resize-safe", () => {
    // The generator's OUTPUT is what partners paste, so assert on it rather
    // than on the source text of whichever file happens to build it.
    const snippet = buildEmbedSnippet({
      slug: "arv-calculator",
      title: "ARV Calculator",
      siteUrl: "https://usetruecap.com",
      defaultHeight: 640,
    });
    expect(snippet).toContain('src="https://usetruecap.com/embed/arv-calculator"');
    expect(snippet).toContain('loading="lazy"');
    expect(snippet).toContain('style="width:100%; max-width:640px;');
    expect(snippet).toContain(`sandbox="${EMBED_IFRAME_SANDBOX}"`);
    // A target=_blank link inside a sandboxed frame is dropped unless popups
    // are allowed, and a popup that keeps the sandbox cannot download files.
    expect(EMBED_IFRAME_SANDBOX.split(" ").sort()).toEqual(
      [
        "allow-forms",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-same-origin",
        "allow-scripts",
        "allow-top-navigation-by-user-activation",
      ].sort(),
    );
    expect(snippet).toContain('referrerpolicy="no-referrer"');
    expect(snippet).toContain('title="ARV Calculator by TrueCap"');
    expect(snippet).not.toContain('title="TrueCap calculator"');
    expect(snippet).toContain('e.origin!=="https://usetruecap.com"');
    expect(snippet).toContain("e.source!==f.contentWindow");
    expect(snippet).toContain('d.slug!=="arv-calculator"');
    expect(snippet).toContain("Number.isFinite(d.height)");
    expect(snippet).toContain("Math.min(2400,Math.max(640,d.height))");
    // Old pastes keep resizing only while the id and message type hold.
    expect(snippet).toContain('id="truecap-embed-arv-calculator"');
    expect(snippet).toContain('d.type!=="truecap:embed:resize"');
    expect(snippet).not.toMatch(/nofollow|utm_/);
  });

  it("keeps the in-iframe call to action campaign-tagged", () => {
    const page = readFileSync(join(ROOT, "app/embed/[slug]/page.tsx"), "utf8");
    const referral = readFileSync(
      join(ROOT, "components/embed/embed-referral-tracker.tsx"),
      "utf8",
    );
    expect(page).toContain("buildEmbedAttributionHref");
    expect(referral).toContain("Underwrite a full property in TrueCap");
  });
});
