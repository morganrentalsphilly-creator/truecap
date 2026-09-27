import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Sign-up persistence of the consent-gated first touch: the email action and
 * the OAuth callback's new-Google-account branch each write
 * app_metadata.tc_first_touch = { source, section, v: 1 } with the service
 * role, from a validated tc_ft cookie, and never let that write fail sign-up.
 */

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  signUp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  updateUserById: vi.fn(),
  createAdmin: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  after: vi.fn(),
  trackServer: vi.fn(),
  captureServerEvent: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  sendLifecycleEmailNow: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  captureException: mocks.captureException,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { signUp: mocks.signUp } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdmin,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));
vi.mock("@/lib/analytics/site-events-server", () => ({ trackServer: mocks.trackServer }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: mocks.captureServerEvent }));
vi.mock("@/lib/email/send-lifecycle", () => ({ sendLifecycleEmailNow: mocks.sendLifecycleEmailNow }));
vi.mock("@/lib/analytics/canonical-event-claim", () => ({
  canonicalAnalyticsEventId: (event: string, key: string) => `${event}:${key}`,
  claimCanonicalAnalyticsEvent: mocks.claim,
  releaseCanonicalAnalyticsEventClaim: mocks.release,
}));

import { signUpAction } from "@/app/actions/auth";
import { GET } from "@/app/auth/callback/route";
import { parseFirstTouchCookieValue } from "@/lib/first-touch-server";

const USER_ID = "3f0c2a4e-8d1b-4c6f-9a2e-5b7d9c1e0f11";
const EMAIL = "new-investor@example.com";
const SIGN_UP = {
  email: EMAIL,
  password: "Correct-Horse-Battery-42",
  confirmPassword: "Correct-Horse-Battery-42",
};

function signUpResult(appMetadata: Record<string, unknown> = { provider: "email", providers: ["email"] }) {
  return {
    data: {
      user: { id: USER_ID, email: EMAIL, identities: [{ id: "identity" }], app_metadata: appMetadata },
      session: null,
    },
    error: null,
  };
}

let pendingAfter: Array<() => unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  pendingAfter = [];
  mocks.after.mockImplementation((task: () => unknown) => {
    pendingAfter.push(task);
  });
  mocks.createAdmin.mockReturnValue({ auth: { admin: { updateUserById: mocks.updateUserById } } });
  mocks.updateUserById.mockResolvedValue({ data: { user: {} }, error: null });
  mocks.signUp.mockResolvedValue(signUpResult());
  mocks.cookieGet.mockImplementation((name: string) =>
    name === "tc_ft" ? { name, value: "organic_search.blog" } : undefined,
  );
  mocks.claim.mockResolvedValue(true);
  mocks.captureServerEvent.mockResolvedValue(true);
  mocks.trackServer.mockResolvedValue(undefined);
});

async function runAfterTasks() {
  for (const task of pendingAfter.splice(0)) await task();
}

describe("parseFirstTouchCookieValue (zod)", () => {
  it("accepts two enum tokens and nothing else", () => {
    expect(parseFirstTouchCookieValue("organic_ai.tools")).toEqual({ source: "organic_ai", section: "tools" });
    for (const raw of [undefined, "", "google_oauth.blog", "organic_search./blog", "organic_search.blog.x", `organic_search.${"x".repeat(80)}`, "ORGANIC_SEARCH.BLOG"]) {
      expect(parseFirstTouchCookieValue(raw), String(raw)).toBeNull();
    }
  });
});

describe("signUpAction first-touch persistence", () => {
  it("writes app_metadata.tc_first_touch with the service role, keeping existing app_metadata", async () => {
    await expect(signUpAction(SIGN_UP, "/pricing")).resolves.toEqual({ ok: true, needsEmailConfirmation: true });
    // Scheduled off the response (after()), like the OAuth callback's write.
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).toHaveBeenCalledWith(USER_ID, {
      app_metadata: {
        provider: "email",
        providers: ["email"],
        tc_first_touch: { source: "organic_search", section: "blog", v: 1 },
      },
    });
  });

  it("stores nothing without a consented cookie, or with a tampered one", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    await expect(signUpAction(SIGN_UP)).resolves.toMatchObject({ ok: true });
    mocks.cookieGet.mockReturnValue({ name: "tc_ft", value: "organic_search./blog/private-slug" });
    await expect(signUpAction(SIGN_UP)).resolves.toMatchObject({ ok: true });
    expect(mocks.after).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("never rewrites an existing first touch (a repeat sign-up of an unconfirmed address)", async () => {
    mocks.signUp.mockResolvedValue(
      signUpResult({ provider: "email", tc_first_touch: { source: "paid_search", section: "pricing", v: 1 } }),
    );
    await expect(signUpAction(SIGN_UP)).resolves.toMatchObject({ ok: true });
    await runAfterTasks();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it.each([
    ["the admin write throws", () => mocks.updateUserById.mockRejectedValue(new Error(`boom for ${USER_ID} ${EMAIL}`))],
    ["the Auth API returns an error", () => mocks.updateUserById.mockResolvedValue({ data: null, error: { code: "user_not_found", status: 404, message: EMAIL } })],
    ["the service-role key is missing", () => mocks.createAdmin.mockImplementation(() => { throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); })],
    ["after() is unavailable", () => mocks.after.mockImplementation(() => { throw new Error(`after was called outside a request scope ${EMAIL}`); })],
  ])("still signs the user up when %s, and reports it without PII", async (_label, arrange) => {
    arrange();
    await expect(signUpAction(SIGN_UP)).resolves.toEqual({ ok: true, needsEmailConfirmation: true });
    await runAfterTasks();
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1);
    const [message, context] = mocks.captureMessage.mock.calls[0];
    expect(message).toBe("first-touch attribution write failed");
    expect(context).toMatchObject({ tags: { feature: "first-touch-attribution", path: "email_signup" } });
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain(USER_ID);
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("organic_search");
  });

  it("answers the form without waiting for the attribution write (a hung Auth admin call never holds up sign-up)", async () => {
    mocks.updateUserById.mockReturnValue(new Promise(() => undefined));
    const outcome = await Promise.race([
      signUpAction(SIGN_UP),
      new Promise((resolve) => setTimeout(() => resolve("still pending after 500ms"), 500)),
    ]);
    expect(outcome).toEqual({ ok: true, needsEmailConfirmation: true });
    // The write runs after the response, with the cookie read during the action.
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    void pendingAfter[0]();
    await Promise.resolve();
    expect(mocks.updateUserById).toHaveBeenCalledWith(USER_ID, {
      app_metadata: expect.objectContaining({ tc_first_touch: { source: "organic_search", section: "blog", v: 1 } }),
    });
  });

  it("writes nothing when Supabase rejects the sign-up or obfuscates an existing email", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Password should be at least 12 characters" } });
    await expect(signUpAction(SIGN_UP)).resolves.toMatchObject({ ok: false });
    mocks.signUp.mockResolvedValue({ data: { user: { id: USER_ID, identities: [], app_metadata: {} }, session: null }, error: null });
    await expect(signUpAction(SIGN_UP)).resolves.toMatchObject({ ok: false });
    expect(mocks.after).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });
});

describe("OAuth callback: new Google account", () => {
  function googleUser(overrides: Record<string, unknown> = {}) {
    const now = new Date(Date.now() - 5_000).toISOString();
    return {
      id: USER_ID,
      email: EMAIL,
      created_at: now,
      last_sign_in_at: now,
      app_metadata: { provider: "google", providers: ["google"] },
      ...overrides,
    };
  }

  function callbackRequest(cookie?: string) {
    return new NextRequest("https://usetruecap.com/auth/callback?code=pkce-code&next=/pricing", {
      headers: cookie ? { cookie } : {},
    });
  }

  it("saves the validated first touch and reports its source as referral_source", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
    const response = await GET(callbackRequest("tc_ft=organic_ai.glossary; sb-x-auth-token=abc"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://usetruecap.com/pricing");
    await runAfterTasks();

    expect(mocks.updateUserById).toHaveBeenCalledWith(USER_ID, {
      app_metadata: {
        provider: "google",
        providers: ["google"],
        tc_first_touch: { source: "organic_ai", section: "glossary", v: 1 },
      },
    });
    const events = mocks.captureServerEvent.mock.calls.map(([call]) => call);
    expect(events.map((e) => e.event)).toEqual(["account_created", "product_evaluation_started"]);
    for (const e of events) expect(e.properties).toEqual({ referral_source: "organic_ai" });
    // The canonical claims still gate every event.
    expect(mocks.claim).toHaveBeenCalledTimes(2);
    expect(mocks.trackServer).toHaveBeenCalledWith("signup_completed", { method: "google" });
  });

  it("falls back to direct (never google_oauth) and stores nothing without a valid cookie", async () => {
    for (const cookie of [undefined, "tc_ft=google_oauth.blog", "tc_ft=organic_search.%2Fblog"]) {
      vi.clearAllMocks();
      mocks.after.mockImplementation((task: () => unknown) => {
        pendingAfter.push(task);
      });
      mocks.createAdmin.mockReturnValue({ auth: { admin: { updateUserById: mocks.updateUserById } } });
      mocks.claim.mockResolvedValue(true);
      mocks.captureServerEvent.mockResolvedValue(true);
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
      await GET(callbackRequest(cookie));
      await runAfterTasks();
      expect(mocks.updateUserById, String(cookie)).not.toHaveBeenCalled();
      const properties = mocks.captureServerEvent.mock.calls.map(([call]) => call.properties);
      expect(properties, String(cookie)).toEqual([{ referral_source: "direct" }, { referral_source: "direct" }]);
    }
  });

  it("does nothing for a returning Google login or an email confirmation", async () => {
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    for (const user of [
      googleUser({ created_at: old }),
      googleUser({ app_metadata: { provider: "email", providers: ["email"] } }),
    ]) {
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user }, error: null });
      await GET(callbackRequest("tc_ft=organic_search.blog"));
    }
    // Only the welcome email is scheduled; no attribution and no funnel events.
    await runAfterTasks();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.captureServerEvent).not.toHaveBeenCalled();
  });

  it("keeps the redirect and the analytics when the attribution write fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
    mocks.updateUserById.mockRejectedValue(new Error("auth api down"));
    const response = await GET(callbackRequest("tc_ft=organic_search.home"));
    expect(response.headers.get("location")).toBe("https://usetruecap.com/pricing");
    await runAfterTasks();
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "first-touch attribution write failed",
      expect.objectContaining({ tags: { feature: "first-touch-attribution", path: "google_callback" } }),
    );
    expect(mocks.captureServerEvent).toHaveBeenCalledTimes(2);
  });
});
