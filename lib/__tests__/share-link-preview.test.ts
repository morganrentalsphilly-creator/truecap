import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { SHARE_CARD_IMAGE } from "@/lib/og/share-card";

/**
 * What a texted share link previews as (2026-10 audit row P2-135, the
 * lowest-risk option, chosen 2026-10-03): ONE static, deal-free card for
 * /s/[token] and the legacy /d/[encoded], served from a path robots.txt
 * allows, plus og:site_name on both and og:url on /s.
 *
 * Not chosen, and held out here: a robots Allow for /s/ or /d/, and the
 * sender's name in the preview title.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const withoutComments = (source: string) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/** The body of a page's generateMetadata, comments removed. */
function metadataBody(path: string): string {
  const source = withoutComments(read(path));
  const start = source.indexOf("export async function generateMetadata");
  const end = source.indexOf("export default async function", start);
  expect(start, path).toBeGreaterThan(-1);
  expect(end, path).toBeGreaterThan(start);
  return source.slice(start, end);
}

const SHARE = "app/s/[token]/page.tsx";
const LEGACY = "app/d/[encoded]/page.tsx";
const CARD = "app/og/share/route.tsx";

describe("the one share card", () => {
  it("is named by both share pages, for Open Graph and for Twitter", () => {
    expect(SHARE_CARD_IMAGE.url).toBe("/og/share");
    expect(SHARE_CARD_IMAGE.width).toBe(1200);
    expect(SHARE_CARD_IMAGE.height).toBe(630);
    for (const page of [SHARE, LEGACY]) {
      const body = metadataBody(page);
      expect(body, page).toContain("images: [SHARE_CARD_IMAGE]");
      expect(body, page).toContain("images: [SHARE_CARD_IMAGE.url]");
      expect(body, page).toContain('card: "summary_large_image"');
      expect(body, page).toContain("...OPEN_GRAPH_BASE,");
    }
    // No card file under either share route: Next would serve it at a URL
    // inside /s/ or /d/ (the legacy one's URL carried the encoded snapshot).
    expect(existsSync(join(ROOT, "app/s/[token]/opengraph-image.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "app/d/[encoded]/opengraph-image.tsx"))).toBe(false);
  });

  it("is drawn from constants alone: no request, no params, no share lookup", () => {
    const card = withoutComments(read(CARD));
    expect(card).toContain("export async function GET() {");
    expect(card).not.toMatch(/\b(?:request|params|searchParams|headers\(|cookies\()/);
    const imports = [...card.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(imports.sort()).toEqual(["@/lib/og/newsprint", "next/og"]);
    // The words on the card and its alt text name no deal, place or person.
    for (const text of [card, SHARE_CARD_IMAGE.alt]) {
      expect(text).not.toMatch(/\$\d|\baddress\b|Offer Ceiling|cash flow|DSCR|Shared by|Prepared by/i);
    }
    expect(card).toContain("Property details are not shown in previews.");
  });

  it("is served from a path robots.txt allows, while /s/ and /d/ stay disallowed", () => {
    const rules = robots().rules;
    const list = Array.isArray(rules) ? rules : [rules];
    expect(list.length).toBeGreaterThan(0);
    for (const rule of list) {
      const disallow = Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
      expect(disallow.filter((prefix) => SHARE_CARD_IMAGE.url.startsWith(prefix))).toEqual([]);
      // Options C and D were not chosen: no Allow is added for the share
      // routes, for any crawler.
      expect(disallow).toContain("/s/");
      expect(disallow).toContain("/d/");
      const allow = Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : [];
      expect(allow.filter((prefix) => prefix.startsWith("/s") || prefix.startsWith("/d"))).toEqual([]);
    }
  });
});

describe("share link metadata carries no deal data", () => {
  it("/s echoes only a well-formed token as og:url and never resolves the share", () => {
    const body = metadataBody(SHARE);
    expect(body).toContain("const url = isWellFormedShareToken(token) ? `/s/${token}` : undefined;");
    expect(body).toContain("...(url ? { url } : {}),");
    // Resolving the share for metadata would stamp a view and could put the
    // address in a preview.
    expect(body).not.toMatch(/resolvePublicShare|snapshot|address|getPublicAgentBranding|agent\b/);
    expect(body).toContain('const title = "Shared rental analysis";');
  });

  it("/d reads nothing from its URL and sets no og:url, because its address is the snapshot", () => {
    const body = metadataBody(LEGACY);
    expect(body).toContain("export async function generateMetadata(): Promise<Metadata> {");
    expect(body).not.toMatch(/\bparams\b|\bencoded\b|decodeShareLink|\burl\s*:|canonical/);
  });

  it("keeps both pages out of the index", () => {
    for (const page of [SHARE, LEGACY]) {
      expect(metadataBody(page), page).toMatch(/robots:\s*\{\s*index: false,\s*follow: false/);
    }
  });
});
