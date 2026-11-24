import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");

describe("pricing responsive hierarchy", () => {
  it("uses ruled rows on phones and a table only from the small breakpoint", () => {
    // Phones: one ruled row per feature (DESIGN.md: rules, not a stack of
    // cards), hidden from 640px. The table appears only from 640px.
    // Re-anchored: app/pricing/page.tsx — the rows open on a 1px graphite
    // line (Phase 5).
    expect(page).toContain('<ul className="mt-8 border-t border-foreground sm:hidden">');
    expect(page).toContain('<li key={label} className="border-b border-rule-soft py-3">');
    expect(page).toContain(
      '<ScrollX label="Table" className="mt-8 hidden border-t border-foreground sm:block">',
    );
    expect(page).toContain("MobileFeatureValue");
    expect(page).not.toContain('min-w-[520px]');
    // The scroll reveal is retired on marketing pages (one motion per page).
    expect(page).not.toContain("tc-reveal");
  });

  it("keeps exhaustive comparison data in one shared list", () => {
    expect(page.match(/const FEATURE_COMPARISON/g)).toHaveLength(1);
    expect(page.match(/FEATURE_COMPARISON\.map/g)).toHaveLength(2);
  });

  // 2026-11 site elevation (R2): on a phone a yes-or-no feature is one line
  // of marks under a legend of the plan names; a feature with a text value
  // keeps the stacked row pinned above, its tiers one per line.
  it("sets a yes-or-no feature as one line of marks under a legend on phones", () => {
    const list = page.slice(
      page.indexOf('<ul className="mt-8 border-t border-foreground sm:hidden">'),
      page.indexOf('<ScrollX label="Table"'),
    );
    // One mark column per plan: three with Agent Pro, two without it. The
    // label column takes the rest and can shrink, so no phone pans sideways.
    for (const columns of [3, 2]) {
      const grid = `grid grid-cols-[minmax(0,1fr)_repeat(${columns},3.25rem)]`;
      expect(list).toContain(`"${grid} items-end gap-x-1 border-b border-border py-2 text-center text-xs font-semibold"`);
      expect(list).toContain(`"${grid} items-center gap-x-1 border-b border-rule-soft py-2.5"`);
    }
    // The legend is the list's first child, repeats the plan names and is
    // hidden from assistive tech, because each mark names its own plan.
    const legend = list.slice(list.indexOf("<li"), list.indexOf("</li>"));
    expect(list.indexOf("<li")).toBeLessThan(list.indexOf("FEATURE_COMPARISON.map"));
    expect(legend).toContain('aria-hidden="true"');
    expect(legend).toContain("<span>Free</span>");
    // Re-anchored: app/pricing/page.tsx — the legend's Pro name sits on the
    // band from the heavy rule down, as the table's Pro head does, so the
    // tinted cells below read as its column (QA pricing-phone-legend-not-on-band).
    expect(legend).toContain(
      '<span className="-my-2 flex items-end justify-center self-stretch bg-band py-2">{proOfferName}</span>',
    );
    expect(legend.match(/bg-band/g)).toHaveLength(1);
    expect(legend).toContain("{agentProConfigured ? <span>Agent Pro</span> : null}");
    expect(legend).not.toContain("sticky");
    // The compact branch is taken only when every plan's value is yes or no.
    expect(list).toContain('typeof free === "boolean"');
    expect(list).toContain('typeof pro === "boolean"');
    expect(list).toContain('(!agentProConfigured || typeof agentPro === "boolean")');
    expect(list).toContain('<MobileFeatureMark plan={proOfferName} included={pro} band />');
    // A stacked row sets each plan's name beside its value, in one pair of
    // columns, so the legend's mark columns are the list's only plan columns
    // (QA pricing-phone-matrix-column-conflict): no thirds, with or without
    // Agent Pro.
    expect(list).toContain('<dl className="mt-1.5 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-sm">');
    expect(list.match(/<div className="contents">/g)).toHaveLength(3);
    expect(list).not.toMatch(/grid-cols-[23]\b/);
    // The alerts row is still left out while the alerts are not live.
    expect(list).toContain('!alertsLive && label === "Rate-drop alerts on saved deals"');
  });

  it("names the plan and the answer in every compact mark", () => {
    const mark = page.slice(page.indexOf("function MobileFeatureMark("), page.indexOf("function MobileFeatureValue("));
    expect(mark.length).toBeGreaterThan(200);
    // An icon-only cell reads as empty to a screen reader and a crawler.
    expect(mark).toContain('<span className="sr-only">{`${plan}: ${included ? "Included" : "Not included"}`}</span>');
    expect(mark).toContain("<Check aria-hidden");
    expect(mark).toMatch(/<span aria-hidden className="text-muted-foreground">–<\/span>/);
    expect(mark).toContain("flex items-center justify-center self-stretch bg-band");
  });

  it("sets the Pro column of the table on the band, from its head down", () => {
    const table = page.slice(page.indexOf('<ScrollX label="Table"'), page.indexOf("</ScrollX>"));
    expect(table).toContain('<th scope="col" className="bg-band px-4 py-2.5 text-center font-display text-xl">');
    expect(table.match(/bg-band/g)).toHaveLength(1);
    expect(table).toContain("<Cell value={free} />");
    expect(table).toContain("<Cell value={pro} band />");
    expect(table).toContain("<Cell value={agentProCell(label, pro)} />");
    expect(page).toContain('band ? "bg-band px-4 py-2.5 text-center" : "px-4 py-2.5 text-center"');
    // The Feature head and the row labels keep the text voice.
    expect(table).toContain('<th scope="col" className="py-2.5 pr-4 text-left font-semibold">');
    expect(table).toContain('<th scope="row" className="py-2.5 pr-4 text-left font-normal">');
  });
});
