import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";
import { GLOSSARY } from "@/lib/glossary";
import { linkableGlossaryTerms } from "@/lib/seo/link-policy";

/**
 * The site's 404 page (2026-10 go-to-market audit, rows P2-57 and P2-78).
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

describe("P2-57, P2-78: the 404 page", () => {
  const source = code("app/not-found.tsx");
  const html = renderToStaticMarkup(NotFound());

  it("states the glossary's real size, read from the registry", () => {
    const count = linkableGlossaryTerms(Object.values(GLOSSARY)).length;
    // Non-vacuous: the registry is not empty, and the page said 33.
    expect(count).toBeGreaterThan(33);
    expect(textOf(html)).toContain(`Plain-English definitions for ${count} terms.`);
    // No count is typed into the page.
    expect(source).not.toMatch(/definitions for \d/);
    expect(source).not.toMatch(/\b33\b/);
  });

  it("sends 'Market guides' to the markets hub, not to one city", () => {
    expect(html).toMatch(/<a\b[^>]*href="\/markets"[^>]*>[\s\S]*?Market guides/);
    expect(source).not.toContain("/markets/philadelphia");
  });

  it("sets the search field at 16px so iOS does not zoom on focus", () => {
    const input = /<input\b[^>]*type="search"[^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toMatch(/class="[^"]*\btext-base\b/);
    expect(input).not.toMatch(/\btext-(?:xs|sm)\b/);
  });
});
