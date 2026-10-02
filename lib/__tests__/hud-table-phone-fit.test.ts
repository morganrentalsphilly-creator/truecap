import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The HUD rent tables on market and state pages at phone widths (2026-10
 * go-to-market audit, rows P2-54 and P2-79).
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("P2-54, P2-79: HUD rent tables fit a phone, and cue the scroll if they cannot", () => {
  // The ZIP table and the state city table had a 24rem minimum width: at 390px
  // the market page cut its whole 3-bedroom column (78px) and the state page
  // cut the figures mid-number (28px), with no cue. Measured on production on
  // 2026-10-02 with the minimum removed: both fit at 390, 360 and 320px, the
  // column heads wrapping to two lines; the bedroom table (18rem) fits at 360
  // and still overflows at 320, where the pinned column and the caption help.
  it.each([
    ["components/marketing/safe-market-page.tsx", 2],
    ["app/states/[slug]/page.tsx", 1],
  ] as const)("%s", (path, tables) => {
    const source = code(path);
    const mounts = [...source.matchAll(/<ScrollX([^>]*)>\s*<table([^>]*)>/g)];
    expect(mounts).toHaveLength(tables);
    for (const [, scroll, table] of mounts) {
      expect(table, "no fixed minimum width").not.toMatch(/\bmin-w-/);
      expect(table).toMatch(/className="w-full text-sm"/);
      expect(scroll).toMatch(/\bcue\b/);
      expect(scroll).toMatch(/\bstickyFirstColumn\b/);
    }
    // The pinned header cell is the solid band (scroll-x.tsx sets bg-muted on
    // it), so the rest of the header row is the same solid band, not 50%.
    expect(source).not.toContain("bg-muted/50");
  });

  it("the state table sits on the card its pinned cells are filled with", () => {
    expect(read("components/ui/scroll-x.tsx")).toContain("[&_table_td:first-child]:bg-card");
    expect(code("app/states/[slug]/page.tsx")).toMatch(
      /<ScrollX cue stickyFirstColumn label="Table" className="[^"]*\bbg-card\b/,
    );
    // The market tables are inside the FMR section's card already.
    expect(code("components/marketing/safe-market-page.tsx")).toMatch(
      /data-market-fmr=""\s+className="[^"]*\bbg-card\b/,
    );
  });
});
