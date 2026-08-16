import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ANALYZER_FORM_SELECTOR, containsAnalyzerForm } from "@/lib/analyzer-cta";
import { sanitizeShareValues } from "@/lib/share-link";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("marketing analyzer CTAs", () => {
  it("recognizes only a target that is or contains the analyzer form", () => {
    const nested = {
      matches: vi.fn(() => false),
      querySelector: vi.fn((selector: string) =>
        selector === ANALYZER_FORM_SELECTOR ? {} : null
      ),
    };
    const unrelatedMain = {
      matches: vi.fn(() => false),
      querySelector: vi.fn(() => null),
    };

    expect(containsAnalyzerForm(nested)).toBe(true);
    expect(containsAnalyzerForm(unrelatedMain)).toBe(false);
    expect(containsAnalyzerForm(null)).toBe(false);
  });

  it("uses a real homepage-analyzer link and intercepts it only for a local form", () => {
    const source = read("components/marketing/scroll-to-form-button.tsx");
    expect(source).toContain('<a href={`/#${targetId}`}');
    expect(source).toContain("if (!el || !containsAnalyzerForm(el)) return;");
    expect(source).toContain("event.preventDefault();");
    expect(source).not.toContain('<button type="button"');
  });
});

describe("public analysis shares", () => {
  it("keep Pro calculations out of the anonymous read-only view", () => {
    const source = read("components/investcalc/read-only-analysis-view.tsx");
    for (const paidSurface of [
      "MaxOfferCard",
      "SensitivityGrid",
      "StrategiesPanel",
      "Est. Tax Savings",
      "After-Tax CF",
    ]) {
      expect(source).not.toContain(paidSurface);
    }
  });

  it("returns a real 404 for malformed or invalid share payloads", () => {
    const route = read("app/d/[encoded]/page.tsx");
    const notFoundPage = read("app/d/[encoded]/not-found.tsx");
    expect(route.match(/notFound\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(route).not.toContain("<InvalidLink");
    expect(notFoundPage).toContain("Link couldn&apos;t be opened");
  });

  it("strips the sharer's private template reference before share and clone", () => {
    const values = {
      address: "123 Main St",
      templateId: "11111111-1111-4111-8111-111111111111",
    } as InvestmentFormValues;
    expect(sanitizeShareValues(values)).toEqual({
      address: "123 Main St",
      templateId: undefined,
    });
    expect(values.templateId).toBe("11111111-1111-4111-8111-111111111111");

    const shareButton = read("components/investcalc/share-link-button.tsx");
    const cloneView = read("components/investcalc/read-only-analysis-view.tsx");
    const portal = read("lib/client-portal.ts");
    expect(shareButton).toContain("values: shareValues");
    expect(cloneView).toContain("JSON.stringify(sanitizeShareValues(values))");
    expect(portal).toContain("sanitizeShareValues(normalizedValues)");
  });
});

describe("authenticated route continuity", () => {
  it("forwards a server-trusted path-only destination to dashboard login", () => {
    const middleware = read("lib/supabase/middleware.ts");
    const dashboardLayout = read("app/dashboard/layout.tsx");

    expect(middleware).toContain(
      "headers.set(TRUECAP_RETURN_PATH_HEADER, request.nextUrl.pathname);"
    );
    expect(middleware).not.toContain(
      "headers.set(TRUECAP_RETURN_PATH_HEADER, request.nextUrl.href);"
    );
    expect(middleware.match(/forwardedHeaders\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(dashboardLayout).toContain(
      "(await headers()).get(TRUECAP_RETURN_PATH_HEADER)"
    );
    expect(dashboardLayout).toContain(
      "redirect(`/auth/login?next=${encodeURIComponent(returnPath)}`);"
    );
  });

  it.each([
    ["app/settings/page.tsx", "%2Fsettings"],
    ["app/settings/branding/page.tsx", "%2Fsettings%2Fbranding"],
    ["app/profile/page.tsx", "%2Fprofile"],
  ])("preserves the protected destination in %s", (file, encodedDestination) => {
    expect(read(file)).toContain(
      `redirect("/auth/login?next=${encodedDestination}");`
    );
  });

  it("retains next on callback failures and distinguishes OAuth cancellation", () => {
    const callback = read("app/auth/callback/route.ts");
    const login = read("components/auth/login-form.tsx");
    expect(callback).toContain("buildAuthErrorRedirectUrl(origin, error.message, next)");
    expect(callback).toContain('buildAuthErrorRedirectUrl(origin, "missing_token", next)');
    expect(login).toContain('reason === "oauth_cancelled"');
    expect(login).toContain("Google sign-in canceled");
  });

  it("never leaves recovery loading forever after a rejected session check", () => {
    const update = read("components/auth/update-password-form.tsx");
    expect(update).toContain(".catch(() => {");
    expect(update).toContain("setSessionReady(false)");
    expect(update.match(/flex size-11/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("private calculator handoffs", () => {
  it("captures and removes deal inputs in the head before measurement mounts", () => {
    const layout = read("app/layout.tsx");
    const bootstrapAt = layout.indexOf('id="analyzer-handoff-bootstrap"');
    const measurementAt = layout.indexOf("<GoogleMeasurement />");
    expect(bootstrapAt).toBeGreaterThan(-1);
    expect(measurementAt).toBeGreaterThan(bootstrapAt);

    const sensitiveUrl = read("lib/sensitive-url.ts");
    for (const name of ["address", "price", "rent", "beds"]) {
      expect(sensitiveUrl).toContain(`"${name}",`);
    }
  });
});

describe("subscription return privacy", () => {
  it("moves the Checkout Session out of the URL before Google mounts", () => {
    const layout = read("app/layout.tsx");
    const bootstrapAt = layout.indexOf(
      'id="subscription-checkout-return-bootstrap"'
    );
    const measurementAt = layout.indexOf("<GoogleMeasurement />");
    expect(bootstrapAt).toBeGreaterThan(-1);
    expect(measurementAt).toBeGreaterThan(bootstrapAt);
    expect(read("components/marketing/billing-success-banner.tsx")).toContain(
      "consumeSubscriptionCheckoutReturn(window)"
    );
  });
});

describe("anonymous property-data lookup", () => {
  it("uses a resumable signup path instead of a dead sign-in error", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const property = read("components/investcalc/property-details-section.tsx");
    expect(analyzer).toContain(
      '`/auth/sign-up?next=${encodeURIComponent("/?intent=autofill")}`'
    );
    expect(analyzer).toContain('initParams.get("intent") === "autofill"');
    expect(analyzer).toContain("void handleAutofillFromAddress();");
    expect(analyzer).toContain("Sign up for property facts + rent comps");
    expect(property).toContain('className="mt-2 min-h-11 gap-1.5"');
    expect(property).not.toContain('className="mt-2 h-8 gap-1.5"');
  });
});

describe("anonymous save continuity", () => {
  it("persists a programmatic handoff before auth and completes the original save", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const persistCallbackAt = analyzer.indexOf("const persistDisplayedFormDraft");
    const persistWriteAt = analyzer.indexOf(
      "writeCalcDraftRaw(JSON.stringify(form.getValues()))",
      persistCallbackAt
    );
    const goToLoginAt = dashboard.indexOf("const goToLogin = () => {");
    const persistBeforeAuthAt = dashboard.indexOf("onPersistAnonymousDraft();", goToLoginAt);
    const intentAt = dashboard.indexOf("setPendingSaveIntent();", goToLoginAt);
    const navigateAt = dashboard.indexOf('router.push("/auth/sign-up?next=/")', goToLoginAt);
    const fallbackAt = analyzer.indexOf('if (result.code === "SIGN_IN_REQUIRED")');
    const fallbackPersistAt = analyzer.indexOf("persistDisplayedFormDraft();", fallbackAt);
    const fallbackIntentAt = analyzer.indexOf("setPendingSaveIntent();", fallbackAt);

    expect(analyzer).toContain("if (isProgrammaticResetRef.current) return;");
    expect(analyzer).toContain(
      'if (handoff.address !== undefined) form.setValue("address", handoff.address)'
    );
    expect(persistCallbackAt).toBeGreaterThanOrEqual(0);
    expect(persistWriteAt).toBeGreaterThan(persistCallbackAt);
    expect(analyzer).toContain("onPersistAnonymousDraft={persistDisplayedFormDraft}");
    expect(persistBeforeAuthAt).toBeGreaterThan(goToLoginAt);
    expect(intentAt).toBeGreaterThan(persistBeforeAuthAt);
    expect(navigateAt).toBeGreaterThan(intentAt);
    expect(fallbackPersistAt).toBeGreaterThan(fallbackAt);
    expect(fallbackIntentAt).toBeGreaterThan(fallbackPersistAt);
    expect(analyzer).toContain("const autoDraftRaw = readCalcDraftRaw();");
    expect(analyzer).toContain("form.reset(normalized);");
    expect(analyzer).toContain("isAuthenticated && consumePendingSaveIntent()");
    expect(analyzer).toContain("autoSaveAfterAuthRef.current = true;");
    expect(analyzer).toContain("Re-running and saving your analysis");
    expect(analyzer).toContain("void performSaveDeal();");
    expect(analyzer).not.toContain("Hit Save to keep it.");
  });
});

describe("post-analysis email capture", () => {
  it("recovers from a rejected server action and keeps retry available", () => {
    const source = read("components/marketing/post-analysis-email-prompt.tsx");
    expect(source).toContain("const result = await capturePostAnalysisEmail");
    expect(source).toContain("The request was interrupted. Check your connection and try again.");
    expect(source).toContain('className="absolute right-1 top-1 inline-flex size-11');
  });
});

describe("DSCR trust language", () => {
  it("uses a qualified benchmark rather than promising lender approval", () => {
    const sources = [
      "components/investcalc/metrics-band.tsx",
      "components/investcalc/read-only-analysis-view.tsx",
      "app/d/[encoded]/opengraph-image.tsx",
      "app/glossary/page.tsx",
      "app/tools/dscr-calculator/opengraph-image.tsx",
      "app/tools/rental-cash-flow-calculator/page.tsx",
    ].map(read).join("\n");

    expect(sources).not.toMatch(/bankable|every lender pulls|1\.25\+ is/i);
    expect(sources).toContain("Clears 1.25 benchmark");
    expect(sources).toContain("not a universal approval rule");
  });
});
