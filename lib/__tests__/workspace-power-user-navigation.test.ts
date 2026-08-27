import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("saved deal power-user navigation", () => {
  it("keeps a semantic, keyboard-safe workspace map available while scrolling", () => {
    const nav = read("components/investcalc/deal-workspace-anchor-chips.tsx");
    const page = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const notes = read("components/investcalc/deal-notes-panel.tsx");

    expect(nav).toContain('aria-label="Deal workspace sections"');
    expect(nav).toContain('className="sticky top-16');
    expect(nav).toContain("overflow-x-auto");
    expect(nav).toContain('aria-current={isActive ? "location" : undefined}');
    expect(nav).toContain('focus-visible:ring-2');
    expect(nav).toContain('{ id: "deal-overview", label: "Overview", always: true }');

    expect(page).toContain('id="deal-overview" className="min-w-0 scroll-mt-36"');
    expect(page).toContain("this is a direct child of main");
    for (const id of [
      "deal-scenarios",
      "deal-due-diligence",
      "deal-documents",
      "deal-notes",
      "deal-comments",
    ]) {
      expect(page).toContain(`id="${id}" className="scroll-mt-36"`);
    }
    expect(notes).toContain('htmlFor="deal-notes-input"');
    expect(notes).toContain('id="deal-notes-input"');
  });

  it("labels Base and linked scenarios without implying edits cross-contaminate", () => {
    const card = read("components/investcalc/scenarios-card.tsx");
    const actions = read("app/actions/scenarios.ts");

    expect(actions).toContain("isBase: row.scenario_name == null");
    expect(card).toContain('isBase: true');
    expect(card).toContain("Base is the original saved analysis");
    expect(card).toContain("changing one never changes Base or another scenario");
    expect(card).toContain("Independent copy — edits here do not change Base.");
    expect(card).toContain("Later edits stay isolated from every other saved analysis.");
    expect(card).toContain("Open workspace");
    expect(card).toContain("Workspace open");
    expect(card).toMatch(
      /<a\s+href=\{`\/dashboard\/saved-analyses\/\$\{s\.id\}`\}/,
    );
    expect(card).not.toMatch(/>\s*Open\s*</);
  });

  it("makes editable versus recorded-analysis actions explicit", () => {
    const handoff = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    const page = read("app/dashboard/saved-analyses/[id]/page.tsx");

    expect(handoff).toContain('{recorded ? "View recorded analysis" : "Edit assumptions"}');
    expect(handoff).toContain("Duplicate as new scenario");
    expect(page).toContain("recorded={methodologyResolution.usesRecordedSnapshot}");
  });

  it("keeps scenario controls usable as 44px touch targets", () => {
    const card = read("components/investcalc/scenarios-card.tsx");

    expect(card).toContain('className="h-11 text-sm"');
    expect(card).toContain('className="h-11 w-full');
    expect(card).toContain('className="min-h-11 gap-1.5 text-xs text-primary"');
    expect(card).toContain('className="inline-flex min-h-11 items-center gap-1.5');
  });
});
