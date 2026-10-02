import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** The dashboard rail's one text label (2026-10 go-to-market audit, row P2-67). */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("P2-67: the dashboard sidebar label is legible", () => {
  it("is sentence case at 12px and 70% alpha, not 10px tracked capitals at 40%", () => {
    const sidebar = code("components/dashboard/Sidebar.tsx");
    expect(sidebar).toContain(
      '<div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/70">Main menu</div>',
    );
    expect(sidebar).not.toContain("MAIN MENU");
    expect(sidebar).not.toMatch(/text-sidebar-foreground\/40">/);
  });
});
