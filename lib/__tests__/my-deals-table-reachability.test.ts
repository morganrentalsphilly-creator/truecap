import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * On My Deals the desktop table (xl:block) is wider than its container and the
 * ACTIONS column — the row's primary control — used to sit past the right edge.
 *
 * Measured on a real 1440px laptop against the live account:
 *   container 1119px, table 1782px  -> 663px hidden
 *   the "Open" button rendered at x=1789, i.e. ~350px beyond the viewport
 *   sticky/pinned cells: 0
 * Six columns were unreachable without discovering horizontal scroll: Price,
 * DSCR, Cash to close, STATUS, ACTIONS and the Saved column the table was
 * SORTED BY. Turning the two optional columns off does not fix it — the table
 * is still 1593px at defaults.
 *
 * Actions is now the last column and is pinned to the right edge.
 */

const source = readFileSync(
  join(process.cwd(), "components/investcalc/saved-analyses-page-v2.tsx"),
  "utf8",
);

const lines = source.split("\n");

function desktopTableHeaders(): string[] {
  const start = source.indexOf('<div className="hidden overflow-x-auto xl:block">');
  expect(start, "the desktop deal table was restructured").toBeGreaterThan(-1);
  const a = source.indexOf("<thead", start);
  const b = source.indexOf("</thead>", a);
  const out: string[] = [];
  for (const m of source.slice(a, b).matchAll(/<(SortableTh|th)\b/g)) {
    const seg = source.slice(a + m.index!, a + m.index! + 400);
    if (m[1] === "SortableTh") {
      out.push("SORT:" + (/label="([^"]+)"/.exec(seg)?.[1] ?? "?"));
    } else {
      const inner = /<th[^>]*>\s*(?:\{[^}]*\}\s*)?([A-Za-z][A-Za-z ]{0,24})/.exec(seg);
      out.push(inner?.[1]?.trim() ?? "(blank)");
    }
  }
  return out;
}

function rowCellClasses(): string[] {
  const actionsIdx = lines.findIndex((l) => l.includes("sticky right-0 z-10 bg-card pr-2"));
  expect(actionsIdx, "the pinned Actions cell is gone").toBeGreaterThan(-1);
  let tr = actionsIdx;
  while (tr > 0 && !lines[tr].trimStart().startsWith("<tr")) tr -= 1;
  let end = actionsIdx;
  while (end < lines.length && lines[end].trim() !== "</tr>") end += 1;
  const out: string[] = [];
  for (let n = tr; n <= end; n += 1) {
    if (lines[n].trimStart().startsWith("<td")) {
      out.push(/className="([^"]*)"/.exec(lines[n])?.[1] ?? "(none)");
    }
  }
  return out;
}

describe("the deal table's primary action stays reachable", () => {
  it("keeps Actions as the LAST column", () => {
    // Pinning a column that is not last buries whatever follows it — the
    // Saved column was originally after Actions for exactly this reason.
    const heads = desktopTableHeaders();
    expect(heads[heads.length - 1]).toBe("Actions");
  });

  it("pins the Actions header and cell to the right edge", () => {
    expect(source).toMatch(/<th className="sticky right-0 z-10 bg-card[^"]*">\s*\n\s*Actions/);
    expect(source).toContain('<td className="sticky right-0 z-10 bg-card pr-2');
  });

  it("gives the pinned cell an opaque background", () => {
    // Without one, scrolled rows show through the pinned column.
    const th = source.slice(source.indexOf('<th className="sticky right-0'));
    expect(th.slice(0, 200)).toContain("bg-card");
  });

  it("keeps header and body cell counts aligned", () => {
    // The real hazard of reordering columns: a header/cell mismatch silently
    // shifts every value one column over. Counting both is what catches it.
    expect(rowCellClasses().length).toBe(desktopTableHeaders().length);
  });

  it("puts Saved immediately before Status, ahead of Actions", () => {
    const heads = desktopTableHeaders();
    const saved = heads.indexOf("SORT:Saved");
    const status = heads.indexOf("Status");
    const actions = heads.indexOf("Actions");
    expect(saved).toBeGreaterThan(-1);
    expect(saved).toBeLessThan(status);
    expect(status).toBeLessThan(actions);
  });
});
