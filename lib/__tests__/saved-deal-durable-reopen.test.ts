import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const section = (source: string, start: string, end: string) =>
  source.slice(source.indexOf(start), source.indexOf(end));

describe("durable saved-deal reopen", () => {
  it("opens an owner-scoped, refresh-safe URL instead of a one-use storage payload", () => {
    const opener = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    const openFunction = opener.slice(
      opener.indexOf("export async function openSavedDealInAnalysisTab"),
      opener.indexOf("export function OpenFullAnalysisButton"),
    );

    expect(openFunction).toContain(
      "`/dashboard/new?savedDeal=${encodeURIComponent(id)}`",
    );
    expect(openFunction).not.toContain("writeNonceKeyedHandoffPayload");
    expect(openFunction).not.toContain("getSavedDealForEditingAction");
  });

  it("resolves the stable ID on the authenticated server route and hydrates the analyzer", () => {
    const dashboardAnalyzer = read("app/dashboard/new/page.tsx");
    const analyzer = read("components/investcalc/investcalc-page.tsx");

    expect(dashboardAnalyzer).toContain(
      "getSavedDealForEditingAction(requestedSavedDealId)",
    );
    expect(dashboardAnalyzer).toContain("initialSavedDeal={initialSavedDeal}");
    expect(analyzer).toContain("initialSavedDeal = null");
    expect(analyzer).toContain("initialSavedDeal.ok");
    expect(analyzer).toContain('url.searchParams.set("savedDeal", savedDealId)');
    expect(analyzer).toContain('url.searchParams.delete("savedDeal")');
  });

  it("uses same-tab links for primary saved-deal opens while keeping duplication isolated", () => {
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const opener = read(
      "components/investcalc/open-saved-deal-in-analyzer.tsx",
    );
    const workspaceOpen = section(
      opener,
      "export function OpenFullAnalysisButton",
      "export function ReunderwriteAsScenarioButton",
    );

    expect(list).not.toContain("const handleOpenAnalysisClick");
    expect(
      list.match(
        /href=\{`\/dashboard\/new\?savedDeal=\$\{encodeURIComponent\(item\.id\)\}`\}/g,
      )?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(workspaceOpen).toContain("<Link");
    expect(workspaceOpen).toContain(
      "`/dashboard/new?savedDeal=${encodeURIComponent(savedDealId)}`",
    );
    expect(workspaceOpen).not.toContain("openAnalyzerHandoffWindow");
    expect(workspaceOpen).not.toContain('target="_blank"');
    expect(opener).toContain("duplicateSavedDealInAnalyzer");
    expect(opener).toContain("openAnalyzerHandoffWindow");
  });

  it("keeps primary saved-deal controls at the 44px touch-target baseline", () => {
    const list = read("components/investcalc/saved-analyses-page-v2.tsx");
    const banner = read("components/investcalc/next-action-banner.tsx");

    expect(list).toContain('className="h-11 flex-1 rounded-xl');
    expect(list).toContain('className="h-11 w-11 shrink-0 rounded-xl');
    expect(list).toContain('className="h-11 rounded-lg px-3 text-xs"');
    expect(list).toContain('className="h-11 w-11 rounded-lg p-0"');
    expect(banner).toContain("inline-flex min-h-11");
  });
});
