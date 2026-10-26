import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), fetch: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { track as sdkTrack } from "@vercel/analytics/server";
import { trackServer } from "@/lib/analytics/site-events-server";
import { isServerAnalyticsConfigured } from "@/lib/posthog-server";

const contextSymbol = Symbol.for("@vercel/request-context");
const originalContext = Reflect.get(globalThis, contextSymbol);

beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_URL", "truecap-fixture.vercel.app");
  vi.stubEnv("VERCEL_WEB_ANALYTICS_ENDPOINT", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://usetruecap.com");
  vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockReset().mockImplementation(async () => new Response(null, { status: 204 }));
  mocks.headers.mockReset().mockResolvedValue(new Headers({
    "user-agent": "Synthetic analytics contract test",
    "x-forwarded-for": "192.0.2.1",
    host: "attacker.invalid",
    "x-forwarded-host": "attacker.invalid",
    referer: "https://attacker.invalid/?token=private-referrer",
    cookie: "sb-auth-token=private-session; tc_ft=private-cookie",
    authorization: "Bearer private-header",
  }));
  Reflect.set(globalThis, contextSymbol, { get: () => ({
    url: "https://usetruecap.com/auth/callback?code=private-code&next=%2Fprivate#private-fragment",
    headers: new Headers({ "user-agent": "Synthetic analytics contract test", "x-forwarded-for": "192.0.2.1" }),
  }) });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalContext === undefined) Reflect.deleteProperty(globalThis, contextSymbol);
  else Reflect.set(globalThis, contextSymbol, originalContext);
});

function request(index = 0) {
  const [url, init] = mocks.fetch.mock.calls[index] as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string), headers: new Headers(init.headers) };
}

describe("server analytics transport privacy and SDK contract", () => {
  it("matches the installed SDK wire fields while excluding its raw request-context URL", async () => {
    await sdkTrack("signup_completed", { method: "google" });
    const sdk = request();
    expect(sdk.body.o).toContain("code=private-code");

    expect(await trackServer("signup_completed", { method: "google" })).toBe(true);
    const safe = request(1);
    expect(Object.keys(safe.body).sort()).toEqual(Object.keys(sdk.body).sort());
    expect(safe.body).toEqual({
      o: "https://usetruecap.com/auth/callback", ts: expect.any(Number), r: "",
      en: "signup_completed", ed: { method: "google" },
    });
    expect(safe.url).toBe("https://usetruecap.com/_vercel/insights/event");
    for (const key of ["content-type", "user-agent", "x-vercel-ip", "x-va-server"]) {
      expect(safe.headers.get(key)).toBe(sdk.headers.get(key));
    }
    expect(safe.init.cache).toBe("no-store");
    expect(safe.init.redirect).toBe("error");
  });

  it("never forwards request hosts, URLs, cookies, authorization, or extra properties", async () => {
    const properties = { method: "google" as const, email: "private@example.invalid", address: "private-address" };
    await trackServer("signup_completed", properties);
    const sent = request();
    expect([...sent.headers.keys()].sort()).toEqual(["content-type", "user-agent", "x-va-server", "x-vercel-ip"]);
    expect(JSON.stringify(sent)).not.toMatch(/attacker|private|token|next=|#|cookie|authorization/i);
    expect(sent.body.ed).toEqual({ method: "google" });
  });

  it.each([
    { event: "signup_completed", props: { method: "google" }, path: "/auth/callback" },
    { event: "trial_started", props: { method: "google" }, path: "/auth/callback" },
    { event: "checkout_completed", props: { plan: "pro_monthly", interval: "monthly" }, path: "/api/stripe/webhooks" },
    { event: "trial_offer_redeemed", props: { plan: "pro_annual" }, path: "/api/stripe/webhooks" },
    { event: "memo_sent", props: { has_ceiling: true }, path: "/analyze" },
    { event: "sequence_email_sent", props: { sequence: "trial", step: "T1", variant: "agent" }, path: "/api/cron/send-lifecycle-emails" },
  ] as const)("uses the fixed route for $event", async ({ event, props, path }) => {
    expect(await trackServer(event, props)).toBe(true);
    expect(request().body).toMatchObject({ o: `https://usetruecap.com${path}`, en: event, ed: props });
  });

  it("keeps preview traffic on its deployment even with the production site URL configured", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await trackServer("memo_sent", { has_ceiling: false });
    expect(request().url).toBe("https://truecap-fixture.vercel.app/_vercel/insights/event");
    expect(request().body.o).toBe("https://truecap-fixture.vercel.app/analyze");
  });

  it.each(["", "http://usetruecap.com", "https://secret@usetruecap.com", "https://usetruecap.com/?token=secret", "https://usetruecap.com/private", "https://usetruecap.com/#secret"])(
    "falls back to the deployment when the configured site origin is invalid (%s)", async (value) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
      await trackServer("memo_sent", { has_ceiling: false });
      expect(request().url).toBe("https://truecap-fixture.vercel.app/_vercel/insights/event");
    },
  );

  it.each([
    ["VERCEL", ""], ["VERCEL_ENV", "development"], ["VERCEL_URL", ""],
    ["VERCEL_URL", "http://fixture.invalid"], ["VERCEL_URL", "fixture.invalid/?secret=value"],
  ])("does not send without a valid deployment context (%s)", async (name, value) => {
    vi.stubEnv(name, value);
    expect(await trackServer("memo_sent", { has_ceiling: false })).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("uses the existing deployment-protection bypass only as an outgoing header", async () => {
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "synthetic-bypass");
    await trackServer("memo_sent", { has_ceiling: false });
    expect(request().headers.get("x-vercel-protection-bypass")).toBe("synthetic-bypass");
    expect(JSON.stringify(request().body)).not.toContain("synthetic-bypass");
  });

  it("omits oversized optional attribution headers without dropping the event", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "user-agent": "a".repeat(1_025), "x-forwarded-for": "1".repeat(513) }));
    expect(await trackServer("memo_sent", { has_ceiling: false })).toBe(true);
    expect(request().headers.has("user-agent")).toBe(false);
    expect(request().headers.has("x-vercel-ip")).toBe(false);
  });

  it.each([204, 400, 401, 429, 500])("reports actual HTTP acceptance for status %s", async (status) => {
    mocks.fetch.mockResolvedValue(new Response(null, { status }));
    expect(await trackServer("memo_sent", { has_ceiling: false })).toBe(status === 204);
  });

  it("bounds the request to two seconds and swallows network/redirect/abort failures", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    mocks.fetch.mockRejectedValue(new Error("synthetic transport failure"));
    await expect(trackServer("memo_sent", { has_ceiling: false })).resolves.toBe(false);
    expect(timeout).toHaveBeenCalledWith(2_000);
    expect(request().init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns false if no Next request context exists", async () => {
    mocks.headers.mockRejectedValue(new Error("outside request scope"));
    expect(await trackServer("memo_sent", { has_ceiling: false })).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("distinguishes intentionally disabled PostHog from a configured transport", () => {
    vi.stubEnv("POSTHOG_API_KEY", "");
    expect(isServerAnalyticsConfigured()).toBe(false);
    vi.stubEnv("POSTHOG_API_KEY", "synthetic-project-token");
    expect(isServerAnalyticsConfigured()).toBe(true);
  });
});
