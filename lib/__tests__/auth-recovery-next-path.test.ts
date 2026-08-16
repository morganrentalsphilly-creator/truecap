import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAuthErrorRedirectUrl } from "@/lib/auth-callback";
import { internalNextPathOrNull } from "@/lib/auth-schema";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const action = read("../../app/actions/auth.ts");
const loginForm = read("../../components/auth/login-form.tsx");
const forgotForm = read("../../components/auth/forgot-password-form.tsx");
const updateForm = read("../../components/auth/update-password-form.tsx");
const forgotPage = read("../../app/auth/forgot-password/page.tsx");
const updatePage = read("../../app/auth/update-password/page.tsx");
const profileForm = read("../../components/profile/profile-form.tsx");

describe("password recovery preserves a safe return destination", () => {
  it("keeps a deep product path intact across the two nested email redirects", () => {
    const requested = "/pricing?checkout=pro_annual#plans";
    const safeNext = internalNextPathOrNull(requested) ?? "/dashboard";
    const updatePath = `/auth/update-password?next=${encodeURIComponent(safeNext)}`;
    const emailRedirect = `https://usetruecap.com/auth/callback?next=${encodeURIComponent(updatePath)}`;

    const callbackNext = new URL(emailRedirect).searchParams.get("next");
    expect(callbackNext).toBe(updatePath);
    expect(internalNextPathOrNull(callbackNext)).toBe(updatePath);

    const updateNext = new URL(callbackNext!, "https://usetruecap.com").searchParams.get("next");
    expect(updateNext).toBe(requested);
    expect(internalNextPathOrNull(updateNext)).toBe(requested);
  });

  it("does not loop through update-password after an expired reset link", () => {
    const requested = "/dashboard/saved-analyses/analysis-123?view=returns#cash-flow";
    const updatePath = `/auth/update-password?next=${encodeURIComponent(requested)}`;
    const loginUrl = new URL(
      buildAuthErrorRedirectUrl(
        "https://usetruecap.com",
        "Email link is invalid or has expired",
        updatePath
      )
    );

    const loginNext = loginUrl.searchParams.get("next");
    expect(loginNext).toBe(requested);

    const forgotUrl = new URL(
      `/auth/forgot-password?next=${encodeURIComponent(loginNext!)}`,
      "https://usetruecap.com"
    );
    expect(forgotUrl.searchParams.get("next")).toBe(requested);
    expect(forgotUrl.searchParams.get("next")).not.toContain("/auth/update-password");
  });

  it.each(["//evil.com", "/\\evil.com", "/..//evil.com", "https://evil.com"])(
    "turns unsafe destination %s into the dashboard fallback",
    (requested) => {
      expect(internalNextPathOrNull(requested) ?? "/dashboard").toBe("/dashboard");
    }
  );

  it("threads next from login into forgot password", () => {
    expect(loginForm).toContain(
      "`/auth/forgot-password?next=${encodeURIComponent(safeNextPath)}`"
    );
  });

  it("passes next to the reset action and preserves it on both sign-in links", () => {
    expect(forgotForm).toContain('internalNextPathOrNull(searchParams.get("next"))');
    expect(forgotForm).toContain("safeNextPath ?? undefined");
    expect(forgotForm.match(/href=\{loginHref\}/g)).toHaveLength(2);
  });

  it("builds an encoded callback to update-password with a dashboard fallback", () => {
    expect(action).toContain('internalNextPathOrNull(nextPath) ?? "/dashboard"');
    expect(action).toContain(
      "`/auth/update-password?next=${encodeURIComponent(next)}`"
    );
    expect(action).toContain(
      "`${siteUrl}/auth/callback?next=${encodeURIComponent(updatePasswordPath)}`"
    );
  });

  it("continues the recovery session directly instead of forcing another login", () => {
    expect(updateForm).toContain(
      'internalNextPathOrNull(searchParams.get("next")) ?? "/dashboard"'
    );
    expect(updateForm).toContain("router.replace(safeNextPath)");
    expect(updateForm).not.toContain('router.push("/auth/login")');
    expect(updateForm).toContain("/auth/forgot-password?next=${encodedNextPath}");
    expect(updateForm).toContain("/auth/login?next=${encodedNextPath}");
  });

  it("wraps both search-param client forms in Suspense", () => {
    expect(forgotPage).toContain("<Suspense");
    expect(forgotPage).toContain("<ForgotPasswordForm />");
    expect(updatePage).toContain("<Suspense");
    expect(updatePage).toContain("<UpdatePasswordForm />");
  });

  it("returns signed-in profile resets to the profile", () => {
    const resetCall = profileForm.slice(profileForm.indexOf("requestPasswordResetAction("));
    expect(resetCall.slice(0, 300)).toContain('"/profile"');
  });
});
