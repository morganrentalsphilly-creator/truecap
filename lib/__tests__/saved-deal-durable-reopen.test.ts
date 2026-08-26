import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("durable saved-deal reopen", () => {
  it("opens an owner-scoped, refresh-safe URL instead of a one-use storage payload", () => {
    const opener = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    const openFunction = opener.slice(
      opener.indexOf("export async function openSavedDealInAnalysisTab"),
      opener.indexOf("export function OpenFullAnalysisButton"),
    );

    expect(openFunction).toContain("`/?savedDeal=${encodeURIComponent(id)}`");
    expect(openFunction).not.toContain("writeNonceKeyedHandoffPayload");
    expect(openFunction).not.toContain("getSavedDealForEditingAction");
  });

  it("resolves the stable ID on the authenticated server route and hydrates the analyzer", () => {
    const home = read("app/home-authed/page.tsx");
    const analyzer = read("components/investcalc/investcalc-page.tsx");

    expect(home).toContain("getSavedDealForEditingAction(requestedSavedDealId)");
    expect(home).toContain("initialSavedDeal={initialSavedDeal}");
    expect(analyzer).toContain("initialSavedDeal = null");
    expect(analyzer).toContain("initialSavedDeal.ok");
    expect(analyzer).toContain('url.searchParams.set("savedDeal", savedDealId)');
    expect(analyzer).toContain('url.searchParams.delete("savedDeal")');
  });
});
