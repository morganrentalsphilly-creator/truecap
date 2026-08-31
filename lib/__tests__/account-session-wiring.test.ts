import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("authenticated account-session wiring", () => {
  it.each([
    "app/dashboard/layout.tsx",
    "app/settings/layout.tsx",
    "app/profile/layout.tsx",
  ])("rebuilds %s when the verified browser account changes", (path) => {
    const source = read(path);
    expect(source).toContain("<AccountSessionBoundary expectedUserId={user.id}>");
  });

  it("redirects every verified /home-authed user into the bound dashboard before rendering the anonymous analyzer fallback", () => {
    const source = read("app/home-authed/page.tsx");
    const verifiedUserBranch = source.indexOf("if (user) {");
    const dashboardRedirect = source.indexOf(
      "redirect(`/dashboard/new${query ? `?${query}` : \"\"}`);",
      verifiedUserBranch,
    );
    const analyzerFallback = source.indexOf("<InvestCalcPage", dashboardRedirect);

    expect(verifiedUserBranch).toBeGreaterThan(-1);
    expect(dashboardRedirect).toBeGreaterThan(verifiedUserBranch);
    expect(analyzerFallback).toBeGreaterThan(dashboardRedirect);
    expect(source.slice(dashboardRedirect, dashboardRedirect + 100)).toContain(
      'redirect(`/dashboard/new${query ? `?${query}` : ""}`);\n  }',
    );
    expect(source.slice(analyzerFallback, analyzerFallback + 1_500)).toContain(
      "isAuthenticated={Boolean(user)}",
    );
  });

  it("verifies the browser identity before the analyzer dispatches its save and binds the server action to it", () => {
    const source = read("components/investcalc/investcalc-page.tsx");
    const verify = source.indexOf(
      "await getFreshSessionUser(saveAuthSupabase)",
    );
    const dispatch = source.indexOf("const result = await saveDealAction(", verify);
    expect(verify).toBeGreaterThan(-1);
    expect(dispatch).toBeGreaterThan(verify);
    expect(source.slice(dispatch, dispatch + 4_000)).toContain(
      "expectedUserId: accountUserIdAtSubmit",
    );
    expect(source).toContain("accountAuthEpochRef.current += 1");
    expect(source).toContain("isCurrentAccountMutation({");
  });

  it("makes exact account identity mandatory before saveDealAction reaches persistence", () => {
    const source = read("app/actions/saved-analyses.ts");
    const auth = source.indexOf("await supabase.auth.getUser()");
    const binding = source.indexOf(
      "expectedAccountUserMatches(options?.expectedUserId, user.id)",
      auth,
    );
    const firstSavedAnalysesQuery = source.indexOf(
      '.from("saved_analyses")',
      binding,
    );
    expect(binding).toBeGreaterThan(auth);
    expect(firstSavedAnalysesQuery).toBeGreaterThan(binding);
  });

  it.each([
    "app/actions/agent-clients.ts",
    "app/actions/email-preferences.ts",
    "app/actions/user-defaults.ts",
    "app/actions/user-buy-boxes.ts",
    "app/actions/financing-profiles.ts",
    "app/actions/analysis-templates.ts",
    "app/actions/branding.ts",
    "app/actions/testimonials.ts",
    "app/actions/property-comps.ts",
    "app/actions/deal-qa.ts",
    "app/actions/deal-summary.ts",
    "app/actions/product-evaluation.ts",
  ])("binds create/account-global writes in %s to the rendered user", (path) => {
    const source = read(path);
    expect(source).toContain("expectedAccountUserMatches(");
    expect(source).toContain("accountSessionChangedResult()");
  });
});
