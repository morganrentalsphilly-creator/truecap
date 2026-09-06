import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import { track as vercelTrack } from "@vercel/analytics";
import { CONSENT_STORAGE_KEY, SITE_EVENTS, track } from "@/lib/analytics/site-events";

type TestWindow = {
  dataLayer?: unknown[];
  __tcEvents?: Array<{ event: string; props: Record<string, unknown> }>;
  localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
};

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  const win: TestWindow = {
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => void storage.set(k, v),
      removeItem: (k) => void storage.delete(k),
    },
  };
  (globalThis as unknown as { window: TestWindow }).window = win;
  vi.mocked(vercelTrack).mockClear();
});

afterEach(() => {
  delete (globalThis as unknown as { window?: TestWindow }).window;
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("typed track()", () => {
  it("names the thirteen funnel events", () => {
    expect(SITE_EVENTS).toHaveLength(13);
    expect(SITE_EVENTS).toContain("checkout_completed");
  });

  it("buffers the event for tests and reaches Vercel, but keeps GTM dark without consent", async () => {
    track("analysis_started", { source: "hero", input_type: "address" });
    await flush();
    const win = (globalThis as unknown as { window: TestWindow }).window;
    expect(win.__tcEvents).toEqual([
      expect.objectContaining({ event: "analysis_started", props: { source: "hero", input_type: "address" } }),
    ]);
    expect(win.dataLayer).toBeUndefined();
    expect(vercelTrack).toHaveBeenCalledWith("analysis_started", { source: "hero", input_type: "address" });
  });

  it("pushes to dataLayer only after the visitor granted consent, and never forwards nulls", async () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    track("analysis_completed", { verdict: "Solid", has_ceiling: true });
    await flush();
    const win = (globalThis as unknown as { window: TestWindow }).window;
    expect(win.dataLayer).toEqual([{ event: "analysis_completed", verdict: "Solid", has_ceiling: true }]);

    storage.set(CONSENT_STORAGE_KEY, "denied");
    track("deal_saved", { property_type: undefined });
    await flush();
    expect(win.dataLayer).toHaveLength(1);
    expect(win.__tcEvents?.at(-1)).toEqual(expect.objectContaining({ event: "deal_saved", props: {} }));
  });

  it("is a no-op during server rendering", () => {
    delete (globalThis as unknown as { window?: TestWindow }).window;
    expect(() => track("sample_viewed", { source: "hero" })).not.toThrow();
  });
});
