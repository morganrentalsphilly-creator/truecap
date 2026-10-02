import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Links inside the three-way comparison's grey footnote (2026-10
 * go-to-market audit, row P2-51): axe link-in-text-block, the one serious
 * violation on the swept blog and tool pages.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("P2-51: the three-way comparison's footnote links are underlined", () => {
  it("uses tc-link on the four links in 'Access and pricing change.'", () => {
    const post = read("app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx");
    const start = post.indexOf("Access and pricing change. Check the official");
    const end = post.indexOf("pages for current terms.", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const footnote = post.slice(start, end);
    expect(footnote.match(/<a\b/g)).toHaveLength(4);
    expect(footnote.match(/className="tc-link"/g)).toHaveLength(4);
    // Colour alone (1.39:1 against the grey text) told them apart before.
    expect(footnote).not.toContain("hover:underline");
    expect(read("app/globals.css")).toMatch(
      /@utility tc-link \{[^}]*text-decoration-line: underline;/,
    );
  });
});
