import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("decision workspace UX guards", () => {
  it("keeps Settings and Buy Boxes in primary navigation with touch targets", () => {
    const source = read("components/dashboard/Sidebar.tsx");
    expect(source).toContain('label: "Settings"');
    expect(source).toContain('label: "Buy Boxes"');
    expect(source).toContain('href: "/settings#buy-boxes"');
    expect(source).toContain("min-h-11");
  });

  it("explains aggregate cash flow as a current-assumption portfolio scenario", () => {
    const source = read("components/dashboard/DashboardHome.tsx");
    expect(source).toContain("If all ${portfolio.activeCount} active");
    expect(source).toContain("closed at current assumptions");
  });

  it("confirms a user-recorded Pass and restores the exact prior stage on Undo", () => {
    const workspace = read("components/investcalc/deal-stage-select.tsx");
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const compare = read("components/investcalc/compare-deals-client.tsx");

    expect(workspace).toContain('altText="Undo marking deal as Passed"');
    expect(workspace).toContain("updateSavedDealStageAction(savedDealId, stage)");
    expect(list).toContain("previousStage: PipelineStage");
    expect(list).toContain("updateSavedDealStageAction(id, previousStage)");
    expect(list).toContain('altText="Undo marking deal as Passed"');
    expect(compare).not.toMatch(/Mark all.*Passed/i);
    expect(compare).toContain("Near-term score");
    expect(compare).toContain("Long-term score");
  });

  it("announces explicit persistence states instead of promising save-on-blur", () => {
    const source = read("components/investcalc/deal-details-card.tsx");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Saving…");
    expect(source).toContain("Saved just now");
    expect(source).toContain("Couldn’t save");
    expect(source).not.toContain(">Saves on blur<");
  });
});
