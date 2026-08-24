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

  it("keeps Decision Center comparisons factual instead of issuing investment directives", () => {
    const source = read("components/dashboard/DashboardHome.tsx");

    expect(source).toContain("Highest screening index");
    expect(source).toContain("Highest modeled upside");
    expect(source).toContain("The Screening Index is a secondary heuristic, not an");
    expect(source).toContain("verify every material assumption before relying on a comparison");
    expect(source).not.toMatch(/>\s*Best deal\s*</i);
    expect(source).not.toMatch(/>\s*Best upside\s*</i);
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

  it("keeps primary dashboard links at the 44px touch-target baseline", () => {
    const topbar = read("components/dashboard/Topbar.tsx");
    const home = read("components/dashboard/DashboardHome.tsx");
    const leads = read("components/dashboard/DealLeadsCard.tsx");
    const topDeals = read("components/dashboard/TopDeals.tsx");
    const due = read("components/dashboard/due-this-week-card.tsx");

    expect(topbar).toContain('className="hidden min-h-11 items-center');
    expect(home).not.toMatch(/className="h-(?:9|10) [^"]*rounded-xl/);
    expect(home).toContain('className="inline-flex min-h-11 items-center text-xs font-semibold text-primary');
    expect(leads).toContain('className="inline-flex min-h-11 items-center');
    expect(topDeals.match(/inline-flex min-h-11 items-center/g)?.length).toBeGreaterThanOrEqual(2);
    expect(due).toContain("inline-flex min-h-11 min-w-11");
    expect(due.match(/inline-flex min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
