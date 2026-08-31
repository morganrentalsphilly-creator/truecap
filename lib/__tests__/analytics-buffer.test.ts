/**
 * Pre-init buffering in lib/analytics.ts.
 *
 * posthog-js is dynamic-imported off the critical path (initAnalytics is
 * idle-scheduled by PostHogProvider), so every helper must buffer calls
 * made before init resolves and replay them FIFO — otherwise early
 * funnel events (landing_view, the consent decision, identify, the
 * first $pageview) would be silently dropped, exactly what the old
 * `if (!posthog.__loaded) return` guards did.
 *
 * The suite re-imports the module per test (vi.resetModules) because
 * the client/queue/initPromise state is module-level by design.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type LoadedCallback = (ph: typeof posthogMock) => void;
type InitOptions = {
  loaded?: LoadedCallback;
  autocapture?: boolean | { url_ignorelist?: RegExp[] };
  mask_all_text?: boolean;
  mask_all_element_attributes?: boolean;
  save_campaign_params?: boolean;
  save_referrer?: boolean;
  persistence?: string;
  property_denylist?: string[];
  advanced_disable_flags?: boolean;
  before_send?: (event: {
    event: string;
    properties?: Record<string, unknown>;
  }) => { event: string; properties?: Record<string, unknown> } | null;
};

const posthogMock = vi.hoisted(() => {
  const ph = {
    __loaded: false,
    init: vi.fn((_key: string, opts?: InitOptions) => {
      ph.__loaded = true;
      opts?.loaded?.(ph);
    }),
    capture: vi.fn(),
    identify: vi.fn(),
    unregister: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  };
  return ph;
});

vi.mock("posthog-js", () => ({ default: posthogMock }));

let storedConsent: string | null = null;
let storedSession = new Map<string, string>();
let storedLocal = new Map<string, string>();

async function importAnalytics() {
  vi.resetModules();
  return import("@/lib/analytics");
}

beforeEach(() => {
  storedConsent = null;
  storedSession = new Map();
  storedLocal = new Map();
  posthogMock.__loaded = false;
  posthogMock.init.mockClear();
  posthogMock.capture.mockClear();
  posthogMock.identify.mockClear();
  posthogMock.unregister.mockClear();
  posthogMock.reset.mockClear();
  posthogMock.opt_in_capturing.mockClear();
  posthogMock.opt_out_capturing.mockClear();
  // Tests run in the node environment — stub the minimal window surface
  // the module touches (typeof-window guards + localStorage consent read).
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) =>
        key === "truecap_cookie_consent_v1"
          ? storedConsent
          : (storedLocal.get(key) ?? null),
      setItem: (key: string, value: string) => storedLocal.set(key, value),
      removeItem: (key: string) => storedLocal.delete(key),
    },
    sessionStorage: {
      getItem: (key: string) => storedSession.get(key) ?? null,
      setItem: (key: string, value: string) => storedSession.set(key, value),
      removeItem: (key: string) => storedSession.delete(key),
    },
  });
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("pre-init buffering", () => {
  it("fails closed for the current document without persisting an opt-out", async () => {
    const analytics = await importAnalytics();
    analytics.trackEvent("landing_view", { path: "/" });

    analytics.disableAnalyticsForDocument();
    await analytics.initAnalytics();

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
    expect(analytics.trackEvent("analysis_completed")).toBe(false);
  });

  it("buffers trackEvent before init and replays it once init resolves", async () => {
    const analytics = await importAnalytics();

    const dispatched = analytics.trackEvent("landing_view", { path: "/" });
    expect(dispatched).toBe(false); // buffered, not yet dispatched
    expect(posthogMock.capture).not.toHaveBeenCalled();

    await analytics.initAnalytics();

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    expect(posthogMock.capture).toHaveBeenCalledWith("landing_view", {
      path: "/",
    });
  });

  it("captures directly (returns true) after init", async () => {
    const analytics = await importAnalytics();
    await analytics.initAnalytics();

    expect(analytics.trackEvent("analysis_completed")).toBe(true);
    expect(posthogMock.capture).toHaveBeenCalledWith(
      "analysis_completed",
      undefined,
    );
  });

  it("masks DOM content and blocks autocapture on public share routes", async () => {
    const analytics = await importAnalytics();
    await analytics.initAnalytics();

    const options = posthogMock.init.mock.calls[0]?.[1];
    expect(options?.mask_all_text).toBe(true);
    expect(options?.mask_all_element_attributes).toBe(true);
    expect(options?.save_campaign_params).toBe(false);
    expect(options?.save_referrer).toBe(false);
    expect(options?.persistence).toBe("localStorage");
    expect(options?.property_denylist).toContain("title");
    expect(options?.advanced_disable_flags).toBe(true);
    // No DOM autocapture is safer than a route ignorelist: property inputs
    // and bearer URLs never enter an autocapture payload on any route.
    expect(options?.autocapture).toBe(false);

    const beforeSend = options?.before_send;
    expect(beforeSend).toBeTypeOf("function");
    expect(
      beforeSend?.({
        event: "$pageview",
        properties: {
          title: "123 Main Street",
          $current_url: "https://usetruecap.com/d/private-snapshot",
        },
      }),
    ).toEqual({
      event: "$pageview",
      properties: {
        $current_url: "https://usetruecap.com/d/[shared-analysis]",
      },
    });
  });

  it("sanitizes legacy PostHog persistence before SDK initialization", async () => {
    const analytics = await importAnalytics();
    const storageKey = "ph_phc_test_key_posthog";
    storedLocal.set(
      storageKey,
      JSON.stringify({
        distinct_id: "anonymous-1",
        $initial_person_info: {
          r: "https://usetruecap.com/d/private-snapshot",
        },
        nested: { url: "/portal/private-token" },
      }),
    );

    await analytics.initAnalytics();

    expect(JSON.parse(storedLocal.get(storageKey) ?? "{}")).toEqual({
      distinct_id: "anonymous-1",
      nested: { url: "/portal/[token]" },
    });
    expect(posthogMock.unregister).toHaveBeenCalledWith("$initial_person_info");
    expect(posthogMock.unregister).toHaveBeenCalledWith(
      "$initial_campaign_params",
    );
    expect(posthogMock.unregister).toHaveBeenCalledWith(
      "$initial_referrer_info",
    );
  });

  it("replays buffered calls FIFO so consent-before-capture ordering holds", async () => {
    const analytics = await importAnalytics();
    const order: string[] = [];
    posthogMock.opt_in_capturing.mockImplementation(() => {
      order.push("opt_in");
    });
    posthogMock.capture.mockImplementation((event: string) => {
      order.push(`capture:${event}`);
    });
    posthogMock.identify.mockImplementation((id: string) => {
      order.push(`identify:${id}`);
    });

    analytics.setAnalyticsConsent(true);
    analytics.identifyUser("user-1");
    analytics.trackEvent("deal_saved");

    await analytics.initAnalytics();

    expect(order).toEqual(["opt_in", "identify:user-1", "capture:deal_saved"]);
  });

  it("buffers trackPageview and replays with $current_url", async () => {
    const analytics = await importAnalytics();

    analytics.trackPageview("https://usetruecap.com/pricing");
    expect(posthogMock.capture).not.toHaveBeenCalled();

    await analytics.initAnalytics();

    expect(posthogMock.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "https://usetruecap.com/pricing",
    });
  });

  it("stores and replays only a coarse first-touch referral taxonomy", async () => {
    const analytics = await importAnalytics();

    analytics.setFirstTouchAttribution({
      referral_source: "organic_search",
    });
    expect(
      JSON.parse(
        storedSession.get("truecap_first_touch_attribution_v1") ?? "{}",
      ),
    ).toEqual({ referral_source: "organic_search" });
    expect(storedSession.has("truecap_organic_attribution_v1")).toBe(false);

    analytics.trackEvent("organic_landing", {
      route_category: "shared_analysis",
      referral_source: "organic_search",
      landing_page: "/d/private-address-and-financial-snapshot",
      referrer_host: "private.example.com",
    });
    analytics.trackEvent("analysis_completed", {
      route_category: "analyzer",
      calculator_slug: "rental-property",
    });
    await analytics.initAnalytics();

    expect(posthogMock.capture).toHaveBeenCalledWith("organic_landing", {
      route_category: "shared_analysis",
      referral_source: "organic_search",
    });
    expect(posthogMock.capture).toHaveBeenCalledWith("analysis_completed", {
      route_category: "analyzer",
      calculator_slug: "rental-property",
      referral_source: "organic_search",
    });
  });

  it("fails closed when first-touch session storage is tampered with", async () => {
    storedSession.set(
      "truecap_first_touch_attribution_v1",
      JSON.stringify({ referral_source: "customer@example.com" }),
    );
    const analytics = await importAnalytics();

    analytics.trackEvent("analysis_completed", {
      route_category: "analyzer",
      calculator_slug: "rental-property",
    });
    await analytics.initAnalytics();

    expect(posthogMock.capture).toHaveBeenCalledWith("analysis_completed", {
      route_category: "analyzer",
      calculator_slug: "rental-property",
    });
  });

  it("buffers resetAnalytics pre-init", async () => {
    const analytics = await importAnalytics();

    analytics.resetAnalytics();
    expect(posthogMock.reset).not.toHaveBeenCalled();

    await analytics.initAnalytics();
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });

  it("opts in during init when stored consent is granted", async () => {
    storedConsent = "granted";
    const analytics = await importAnalytics();

    await analytics.initAnalytics();

    expect(posthogMock.opt_in_capturing).toHaveBeenCalled();
  });

  it("drops the queue and stays off when the key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const analytics = await importAnalytics();

    analytics.trackEvent("landing_view");
    const result = await analytics.initAnalytics();

    expect(result).toBeNull();
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    // Post-init calls keep no-oping instead of re-buffering forever.
    expect(analytics.trackEvent("deal_saved")).toBe(false);
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("bounds the pre-init queue at 100 calls", async () => {
    const analytics = await importAnalytics();

    for (let i = 0; i < 150; i++) {
      analytics.trackEvent("landing_view", { i });
    }
    await analytics.initAnalytics();

    expect(posthogMock.capture).toHaveBeenCalledTimes(100);
  });

  it("returns the same promise on repeat init calls and inits the SDK once", async () => {
    const analytics = await importAnalytics();

    const [a, b] = await Promise.all([
      analytics.initAnalytics(),
      analytics.initAnalytics(),
    ]);

    expect(a).toBe(b);
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });

  it("no-ops without touching posthog when window is undefined (SSR)", async () => {
    vi.unstubAllGlobals();
    const analytics = await importAnalytics();

    expect(analytics.trackEvent("landing_view")).toBe(false);
    expect(await analytics.initAnalytics()).toBeNull();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });
});
