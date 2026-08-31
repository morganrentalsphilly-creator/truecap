import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)])/g, "$1");

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
    expect(source).toContain("If all ${portfolio.totalCount} active");
    expect(source).toContain("closed at current assumptions");
    expect(source).toContain(
      "Known total across ${portfolio.cashFlowSampleCount} of ${portfolio.totalCount} active deals",
    );
    expect(source).toContain("portfolio.cashFlowSampleCount === 0");
  });

  it("keeps Decision Center comparisons factual instead of issuing investment directives", () => {
    const source = read("components/dashboard/DashboardHome.tsx");

    expect(source).toContain("Highest screening index");
    expect(source).toContain("Highest modeled upside");
    expect(source.replace(/\s+/g, " ")).toContain(
      "The Screening Index is a secondary heuristic, not an",
    );
    expect(source.replace(/\s+/g, " ")).toContain(
      "verify every material assumption before relying on a comparison",
    );
    expect(source).not.toMatch(/>\s*Best deal\s*</i);
    expect(source).not.toMatch(/>\s*Best upside\s*</i);
  });

  it("confirms a user-recorded Pass and restores the exact prior stage on Undo", () => {
    const workspace = read("components/investcalc/deal-stage-select.tsx");
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const compare = read("components/investcalc/compare-deals-client.tsx");
    const normalizedWorkspace = normalizeSource(workspace);
    const normalizedList = normalizeSource(list);

    const workspaceConfirmation = normalizedWorkspace.indexOf(
      "confirmPipelineStageChange({",
    );
    const workspaceWrite = normalizedWorkspace.indexOf(
      "updateSavedDealStageAction(savedDealId,next,",
    );
    const listConfirmation = normalizedList.indexOf("confirmPipelineStageChange({");
    const listWrite = normalizedList.indexOf(
      "updateSavedDealStageAction(id,stage,",
    );

    expect(workspaceConfirmation).toBeGreaterThan(-1);
    expect(workspaceWrite).toBeGreaterThan(workspaceConfirmation);
    expect(listConfirmation).toBeGreaterThan(-1);
    expect(listWrite).toBeGreaterThan(listConfirmation);
    // Both surfaces confirm a Pass through the in-app dialog (the injected
    // functions moved off window.confirm when native dialogs were retired).
    expect(workspace).toContain("confirmDialog({ title, body");
    expect(list).toContain("confirmDialog({ title, body");
    expect(workspace).toContain("promptForPipelinePassReason({");
    expect(list).toContain("promptForPipelinePassReason({");
    expect(workspace).toContain('title: "Pass reason required"');
    expect(list).toContain('title: "Pass reason required"');

    expect(workspace).toContain('altText="Undo marking deal as Passed"');
    expect(workspace).toContain('className="min-h-11"');
    expect(workspace).toContain(
      'className="h-11 w-[150px] rounded-md text-xs"',
    );
    expect(normalizedWorkspace).toContain(
      normalizeSource(
        'updateSavedDealStageAction(savedDealId, stage, { note: "Pass decision undone." })',
      ),
    );
    expect(list).toContain("previousStage: PipelineStage");
    expect(normalizedList).toContain(
      normalizeSource(
        'updateSavedDealStageAction(id, previousStage, { note: "Pass decision undone." })',
      ),
    );
    expect(list).toContain('altText="Undo marking deal as Passed"');
    expect(list).toContain('className="min-h-11"');
    expect(compare).not.toMatch(/Mark all.*Passed/i);
    expect(compare).not.toContain("Near-term score");
    expect(compare).not.toContain("Long-term score");
    expect(compare).not.toContain("<Trophy");
    expect(compare).toContain("Review assumption matrix");
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
    expect(home).toContain(
      'className="inline-flex min-h-11 items-center text-xs font-semibold text-primary',
    );
    expect(leads).toContain('className="inline-flex min-h-11 items-center');
    expect(
      topDeals.match(/inline-flex min-h-11 items-center/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(due).toContain("inline-flex min-h-11 min-w-11");
    expect(due.match(/inline-flex min-h-11/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("keeps every Analyze another property action inside the dashboard workflow", () => {
    const home = read("components/dashboard/DashboardHome.tsx");
    const analyzeActions = home.replace(/\s+/g, "").match(
      /label:"Analyzeanotherproperty",href:"[^"]+"/g,
    );

    expect(analyzeActions?.length).toBe(2);
    expect(analyzeActions).toEqual([
      'label:"Analyzeanotherproperty",href:"/dashboard/new?fresh=1"',
      'label:"Analyzeanotherproperty",href:"/dashboard/new?fresh=1"',
    ]);
  });

  it("makes every deal-workspace next action directly executable", () => {
    const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const banner = read("components/investcalc/next-action-banner.tsx");

    expect(workspace).toContain(
      '{ label: "Add close date", href: "#owned-equity" }',
    );
    expect(workspace).toContain(
      '{ label: "Open checklist", href: "#deal-due-diligence" }',
    );
    expect(workspace).toContain(
      "label: methodologyResolution.usesRecordedSnapshot",
    );
    expect(workspace).toContain("cta={nextActionCta}");
    expect(banner).toContain('import Link from "next/link"');
    expect(banner).toContain("inline-flex min-h-11");
  });

  it("keeps advanced desktop filters collapsed without hiding utility actions", () => {
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");

    expect(list).toContain(
      "const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false)",
    );
    expect(list).toContain('aria-controls="desktop-deal-filters"');
    expect(list).toContain(
      'className={desktopFiltersOpen ? "contents" : "hidden"}',
    );
    expect(list).toContain("Export CSV");
    expect(list).toContain("Columns");
  });

  it("resets a specialist property model together with its strategy", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");

    expect(analyzer).toContain(
      'activeStrategyKeyRef.current\n        ? "single-family"',
    );
    expect(analyzer).toContain(
      "visually become Buy & Hold while retaining owner-occupant math",
    );
  });
});
