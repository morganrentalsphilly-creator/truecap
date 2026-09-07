import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/billing/return/route";
import { CHECKOUT_RETURN_COOKIE } from "@/lib/stripe/checkout-return-cookie";
import { isSensitiveTelemetryLocation } from "@/lib/sensitive-url";
import { trackConversion } from "@/lib/analytics/track-conversion";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("checkout return cookie transport", () => {
  it("redirects to a clean document and keeps the session in a bounded secure HttpOnly cookie", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = GET(new NextRequest("https://usetruecap.com/api/billing/return?session_id=cs_test_valid123"));
    expect(response.status).toBe(303);
    const landing = response.headers.get("location")!;
    expect(landing).toBe("https://usetruecap.com/dashboard/new?billing=success");
    expect(isSensitiveTelemetryLocation(landing)).toBe(false);
    expect(response.cookies.get(CHECKOUT_RETURN_COOKIE)).toMatchObject({
      value: "cs_test_valid123", httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it.each(["", "bad", "cs_short", "cs_" + "x".repeat(241)])("never sets a cookie for malformed input %s", (session) => {
    const response = GET(new NextRequest(`https://usetruecap.com/api/billing/return?session_id=${encodeURIComponent(session)}`));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://usetruecap.com/dashboard/new");
    expect(response.cookies.get(CHECKOUT_RETURN_COOKIE)).toBeUndefined();
  });

  it("keeps legacy session-bearing URLs sensitive", () => {
    expect(isSensitiveTelemetryLocation("/dashboard/new?billing=success&session_id=cs_test_valid123")).toBe(true);
  });
});

describe("purchase measurement handoff", () => {
  it("can retry when the consent-gated loader arrives, without sending the session identifier", () => {
    const fakeWindow: { gtag?: ReturnType<typeof vi.fn>; dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", fakeWindow);
    const details = { value: 29.99, currency: "USD", transactionId: "cs_test_private123" };
    expect(trackConversion("paid_subscribed", details)).toBe(false);
    expect(fakeWindow.dataLayer).toBeUndefined();
    fakeWindow.gtag = vi.fn();
    expect(trackConversion("paid_subscribed", details)).toBe(true);
    expect(fakeWindow.gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-8236119484/BCFeCPrZlqwcEIri_9JD", value: 29.99, currency: "USD",
    });
    expect(JSON.stringify([fakeWindow.gtag.mock.calls, fakeWindow.dataLayer])).not.toContain(details.transactionId);
  });

  it("does not report successful delivery when the tag throws", () => {
    vi.stubGlobal("window", { gtag: vi.fn(() => { throw new Error("blocked"); }) });
    expect(trackConversion("paid_subscribed")).toBe(false);
  });
});
