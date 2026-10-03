/**
 * The sentence a captcha rejection gets (go-to-market audit, row P1-41).
 *
 * Supabase checks the captcha before the credentials. Its own strings
 * ("captcha protection: request disallowed (timeout-or-duplicate)") reached
 * the customer under "Sign in failed" with no hint of what to do. mapAuthError
 * in app/actions/auth.ts now gives one plain sentence. It is not exported
 * (every export of a "use server" module is a callable action), so it is
 * exercised through the actions. Supabase is a fake: no network call is made.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: () => undefined,
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));

import { requestPasswordResetAction, signInAction, signUpAction } from "@/app/actions/auth";

describe("mapAuthError on a captcha rejection", () => {
  const SENTENCE =
    "Couldn't verify you're human. Wait for the check to finish, then try again. If it keeps failing, reload the page.";
  const SUPABASE_STRINGS = [
    "captcha protection: request disallowed (timeout-or-duplicate)",
    "captcha verification process failed",
    "captcha protection: request disallowed (no captcha response (captcha_token) found in request)",
  ];
  const PASSWORD = "Correct-Horse-Battery-42";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(SUPABASE_STRINGS)("sign-in: %s becomes a plain sentence", async (message) => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message } });
    const result = await signInAction({
      email: "investor@example.com",
      password: PASSWORD,
      captchaToken: "spent-token",
    });
    expect(result).toEqual({ ok: false, message: SENTENCE });
  });

  it("sign-up and password reset give the same sentence", async () => {
    const message = SUPABASE_STRINGS[0];
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message } });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { message } });
    expect(
      await signUpAction({
        email: "investor@example.com",
        password: PASSWORD,
        confirmPassword: PASSWORD,
        captchaToken: "spent-token",
      }),
    ).toEqual({ ok: false, message: SENTENCE });
    expect(
      await requestPasswordResetAction({ email: "investor@example.com", captchaToken: "spent-token" }),
    ).toEqual({ ok: false, message: SENTENCE });
  });

  it("does not trip the forms' own message routing", () => {
    // login-form.tsx offers "Reset your password" on /password/ and the resend
    // box on /confirm your email/; sign-up-form.tsx pins /password/ to the
    // password field and offers "Sign in instead" on /already exists|signing in/.
    // A captcha rejection is none of those.
    expect(SENTENCE).not.toMatch(/password|confirm your email|already exists|signing in/i);
    expect(SENTENCE).not.toMatch(/captcha|turnstile|timeout-or-duplicate/i);
  });

  it("leaves the other mapped errors as they were", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    expect(
      await signInAction({ email: "investor@example.com", password: PASSWORD }),
    ).toEqual({ ok: false, message: "Invalid email or password." });
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Email not confirmed" } });
    expect(
      await signInAction({ email: "investor@example.com", password: PASSWORD }),
    ).toEqual({ ok: false, message: "Confirm your email before signing in. Check your inbox." });
  });
});
