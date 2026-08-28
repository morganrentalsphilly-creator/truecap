/**
 * CAPTCHA COVERAGE GUARD.
 *
 * Supabase Attack Protection is enabled project-wide, so EVERY call to
 * signInWithPassword / signUp / resetPasswordForEmail / resend is rejected
 * unless it carries a captchaToken. That rejection is not always visible:
 * requestPasswordResetAction and resendConfirmationAction deliberately swallow
 * errors so they cannot be used to probe which emails have accounts — so a
 * missing token produced a SILENT failure ("Reset link sent" with no email) or
 * a raw Supabase string leaking into a toast.
 *
 * This bit twice in one day: the login form's "Resend confirmation", and the
 * signed-in /profile "Send reset link" card. Both were surfaces added before
 * captcha existed. This guard asserts the whole class instead of the instances:
 *   1. every captcha-gated Supabase call in app/actions/auth.ts forwards a token;
 *   2. every CALLER of those actions passes one.
 */
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const authSrc = read("app/actions/auth.ts");

/** The Supabase methods Supabase's captcha setting protects. */
const GATED_SUPABASE_CALLS = [
  "signInWithPassword",
  "auth.signUp",
  "resetPasswordForEmail",
  "auth.resend",
] as const;

/** The server actions that wrap them. */
const GATED_ACTIONS = [
  "signInAction",
  "signUpAction",
  "requestPasswordResetAction",
  "resendConfirmationAction",
] as const;

function tsxFiles(): string[] {
  return execSync("git ls-files app components", { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(
      (f) =>
        /\.(ts|tsx)$/.test(f) &&
        !f.includes("__tests__") &&
        existsSync(join(ROOT, f)),
    );
}

describe("every captcha-gated Supabase call forwards a token", () => {
  it.each(GATED_SUPABASE_CALLS)("%s passes captchaToken", (method) => {
    const i = authSrc.indexOf(method);
    expect(i, `${method} not found in app/actions/auth.ts`).toBeGreaterThan(-1);
    // The token is spread into the call's options within a short window.
    const window = authSrc.slice(i, i + 700);
    expect(
      window.includes("captchaToken"),
      `${method} does not forward captchaToken — Supabase will reject it and the ` +
        `failure may be swallowed, telling the user something was sent when it wasn't.`
    ).toBe(true);
  });
});

describe("every caller of a captcha-gated action passes a token", () => {
  const files = tsxFiles();

  it("finds the caller corpus", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(GATED_ACTIONS)("%s: all call sites pass captchaToken", (action) => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (rel === "app/actions/auth.ts") continue; // the definition site
      const src = read(rel);
      let from = 0;
      for (;;) {
        const i = src.indexOf(`${action}(`, from);
        if (i === -1) break;
        from = i + 1;
        // Skip imports — they mention the name without calling it.
        const lineStart = src.lastIndexOf("\n", i) + 1;
        if (/^\s*import\b/.test(src.slice(lineStart, i))) continue;
        // The argument object follows within a few lines.
        if (!src.slice(i, i + 400).includes("captchaToken")) {
          offenders.push(`${rel}:${src.slice(0, i).split("\n").length}`);
        }
      }
    }
    expect(
      offenders,
      `${action} is called without a captchaToken at: ${offenders.join(", ")}. ` +
        `Supabase enforces captcha on this endpoint, so the call will fail — and for ` +
        `the reset/resend actions the failure is swallowed and reported as success.`
    ).toEqual([]);
  });
});

describe("the captcha widget cannot lock users out", () => {
  const widget = read("components/auth/captcha-widget.tsx");

  it("times out rather than waiting forever on a blocked Cloudflare", () => {
    // No ceiling meant an ad blocker or proxy left the submit button disabled
    // permanently, with no message.
    expect(widget).toMatch(/setTimeout\(/);
    expect(widget).toContain("SCRIPT_TIMEOUT_MS");
  });

  it("reports unavailability so forms can stop gating submit", () => {
    expect(widget).toContain("onUnavailable");
  });

  it.each([
    ["login", "components/auth/login-form.tsx"],
    ["sign-up", "components/auth/sign-up-form.tsx"],
    ["forgot-password", "components/auth/forgot-password-form.tsx"],
    ["profile password card", "components/profile/profile-form.tsx"],
  ])("%s stops gating submit when the captcha is unavailable", (_label, file) => {
    const src = read(file);
    expect(src).toContain("onUnavailable");
    expect(src).toMatch(/Unavailable\s*&&\s*!/);
  });
});
