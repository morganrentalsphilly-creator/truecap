import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmbedPage from "@/app/embed/[slug]/page";
import EmbedHubPage from "@/app/embed/page";
import { EMBED_LIST } from "@/lib/embed-registry";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function renderHub(): string {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", CANONICAL_SITE_URL);
  return renderToStaticMarkup(EmbedHubPage());
}

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * The /embed family on the design system (DESIGN.md, 2026-09 design pass).
 * The baseline hub was a card stack (fact tiles, a boxed "HOW TO EMBED"
 * panel, a card per calculator, a boxed FAQ with no FAQPage node, a solid
 * Signal Blue close band) with trailing ArrowUpRight icons on its links, and
 * the partner iframe's call to action carried the same icon. Every assertion
 * below fails on that baseline except the ones marked "kept", which guard
 * behaviour the restyle had to preserve.
 */
describe("/embed hub design pass", () => {
  const hub = read("app/embed/page.tsx");

  it("builds the page from the shared parts", () => {
    for (const part of ["<PageHero", "<StepList", "<FaqSection", "<CloseSection", "<Section"]) {
      expect(hub, part).toContain(part);
    }
  });

  it("sets the four facts as a ruled strip: Rule on top, soft rules between rows", () => {
    const main = renderHub().match(/<main\b[\s\S]*<\/main>/)?.[0] ?? "";
    const strip = main.match(/<dl class="([^"]*)">([\s\S]*?)<\/dl>/);
    expect(strip?.[1]).toMatch(/\bborder-t\b[^"]*\bborder-border\b/);
    const cells = [...(strip?.[2] ?? "").matchAll(/<div class="([^"]*)">/g)].map((m) => m[1]);
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      // DESIGN.md: "Soft rule (1px) between rows"; the full Rule is for heads
      // and sections, and the one-row strip from 640px ends on the hero's Rule.
      expect(cell).toMatch(/(?:^|\s)border-b\s[^"]*\bborder-rule-soft\b/);
      expect(cell).toMatch(/(?:^|\s)sm:border-b-0(?:\s|$)/);
      expect(cell).not.toMatch(/\bborder-border\b/);
    }
  });

  it("keeps the hub's structured data as it was: visible Q&A, no FAQPage node", () => {
    // The base hub showed these questions with no JSON-LD at all. The restyle
    // moved them into FaqSection; adding a FAQPage claim is an SEO decision
    // the design pass does not make, so FaqSection is told not to emit one.
    const html = renderHub();
    const visible = [
      ...html.matchAll(/<details\b[^>]*><summary\b[^>]*>([\s\S]*?)<\/summary>/g),
    ].map((match) => textOf(match[1]));
    expect(visible.length).toBeGreaterThan(0);
    for (const q of visible) expect(q.endsWith("?"), q).toBe(true);
    const faqPages = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ]
      .map((match) => JSON.parse(match[1]))
      .filter((node) => node["@type"] === "FAQPage");
    expect(faqPages).toHaveLength(0);
  });

  it("puts no icon inside any link of the page body and keeps one H1", () => {
    // The page body only: the shared header's logo link is not this page's.
    const html = renderHub().match(/<main\b[\s\S]*<\/main>/)?.[0] ?? "";
    const anchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(anchor[1], textOf(anchor[1])).not.toContain("<svg");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("closes on one filled button, the analyzer link, with no icon", () => {
    const html = renderHub();
    const close = html.match(/<a\b[^>]*href="\/analyze\?utm_source=embed-hub-cta"[^>]*>([\s\S]*?)<\/a>/);
    expect(close?.[1]).toBe("Try the full TrueCap analyzer");
    // Kept: prefetch={false} and the literal href (analyzer-link-destinations).
    expect(hub).toMatch(/href="\/analyze\?utm_source=embed-hub-cta"\s+prefetch=\{false\}/);
  });

  it("kept: exactly one Disclaimer, SiteFooter's", () => {
    expect(hub).not.toMatch(/<Disclaimer\b/);
    expect(hub).toContain("<SiteFooter />");
    expect(hub).not.toMatch(/disclaimer=\{false\}/);
  });
});

describe("/embed/[slug] iframe design pass", () => {
  it.each(EMBED_LIST.map((entry) => [entry.slug] as const))(
    "%s: the footer holds two plain links, no icon, no pill",
    async (slug) => {
      const html = renderToStaticMarkup(
        await EmbedPage({ params: Promise.resolve({ slug }) }),
      );
      const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
      const anchors = [...footer.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
      expect(anchors.map((anchor) => textOf(anchor[2]))).toEqual([
        "Powered by TrueCap",
        "Underwrite a full property in TrueCap",
      ]);
      for (const anchor of anchors) {
        expect(anchor[1]).toMatch(/class="[^"]*\btc-link\b[^"]*\bmin-h-11\b/);
        expect(anchor[1]).not.toMatch(/rounded-|focus-visible:outline-none/);
        expect(anchor[2]).not.toContain("<svg");
      }
    },
  );

  it("kept: stays chrome-free (no site header, footer or Disclaimer)", () => {
    const frame = read("app/embed/[slug]/page.tsx");
    for (const chrome of ["<Header", "<SiteFooter", "<Disclaimer", "<Section", "PAGE_CONTAINER"]) {
      expect(frame, chrome).not.toContain(chrome);
    }
  });
});

describe("the embed family carries no retired chrome", () => {
  it.each([
    "app/embed/page.tsx",
    "app/embed/[slug]/page.tsx",
    "app/embed/brand/[token]/page.tsx",
    "components/embed/embed-powered-by-link.tsx",
    "components/embed/embed-referral-tracker.tsx",
  ])("%s", (path) => {
    const source = read(path);
    expect(source).not.toMatch(/lucide-react/);
    expect(source).not.toMatch(/\b(?:uppercase|tracking-widest|tracking-wide|tracking-tight|text-2xs|text-3xs|text-xs)\b/);
    expect(source).not.toMatch(/\b(?:rounded-xl|rounded-2xl|rounded-3xl|shadow-sm|font-extrabold|font-bold)\b/);
    expect(source).not.toMatch(/bg-gradient-|→/);
  });
});
