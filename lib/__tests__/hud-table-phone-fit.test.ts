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
  // Wave 5 (template fan-out) moved the tables off their cards and onto rules:
  // the table and its ScrollX wrapper take the shared DATA_TABLE_* class
  // strings in components/marketing/safe-market-page.tsx, so the rules below
  // read those strings as well as the mounts.
  const TEMPLATE = "components/marketing/safe-market-page.tsx";
  const classConst = (name: string): string => {
    const match = new RegExp(`export const ${name} =\\s*"([^"]*)"`).exec(code(TEMPLATE));
    expect(match, name).not.toBeNull();
    return match![1]!;
  };

  it.each([
    ["components/marketing/safe-market-page.tsx", 2],
    ["app/states/[slug]/page.tsx", 1],
  ] as const)("%s", (path, tables) => {
    const source = code(path);
    const mounts = [...source.matchAll(/<ScrollX([^>]*)>\s*<table([^>]*)>/g)];
    expect(mounts).toHaveLength(tables);
    for (const [, scroll, table] of mounts) {
      expect(table, "no fixed minimum width").not.toMatch(/\bmin-w-/);
      expect(table).toMatch(/className=\{DATA_TABLE_CLASS\}/);
      expect(scroll).toMatch(/\bcue\b/);
      expect(scroll).toMatch(/\bstickyFirstColumn\b/);
      expect(scroll).toMatch(/className=\{DATA_TABLE_SCROLL_CLASS\}/);
    }
    // No half-transparent header band: the head row sits on the paper, on a rule.
    expect(source).not.toContain("bg-muted/50");
  });

  it("the shared table strings set no minimum width", () => {
    const table = classConst("DATA_TABLE_CLASS");
    expect(table.split(" ")).toContain("w-full");
    expect(table).not.toMatch(/\bmin-w-/);
    for (const name of [
      "DATA_TABLE_HEAD_ROW_CLASS",
      "DATA_TABLE_HEAD_CELL_CLASS",
      "DATA_TABLE_HEAD_FIGURE_CLASS",
      "DATA_TABLE_ROW_CLASS",
      "DATA_TABLE_LABEL_CELL_CLASS",
      "DATA_TABLE_FIGURE_CELL_CLASS",
      "DATA_TABLE_PRIOR_FIGURE_CELL_CLASS",
    ]) {
      const value = classConst(name);
      expect(value, name).not.toMatch(/\bmin-w-|\bwhitespace-nowrap\b/);
      // Sentence-case heads at 14px or more (DESIGN.md): no 10 or 11px step, no uppercase.
      expect(value, name).not.toMatch(/\btext-(?:2xs|3xs|xs)\b|\buppercase\b/);
    }
  });

  it("the pinned cells are filled with the paper the tables sit on", () => {
    // ScrollX fills its pinned cells with the raised card and the band by
    // default; the tables are on the paper now (no card around the FMR
    // section or the state table), so the wrapper's class overrides both.
    expect(read("components/ui/scroll-x.tsx")).toContain("[&_table_td:first-child]:bg-card");
    const scroll = classConst("DATA_TABLE_SCROLL_CLASS").split(" ");
    expect(scroll).toContain("[&_table_td:first-child]:bg-background");
    expect(scroll).toContain("[&_table_th:first-child]:bg-background");
    for (const path of [TEMPLATE, "app/states/[slug]/page.tsx"]) {
      expect(code(path), path).not.toMatch(/\bbg-card\b/);
      expect(code(path), path).not.toMatch(/\bbg-muted\b/);
    }
  });
});
