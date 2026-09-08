import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY } from "@/lib/analytics/site-events";
import { pushScrollDepthEvent } from "@/components/marketing/scroll-depth-tracker";

type TestWindow = {
  dataLayer?: unknown[];
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
});

afterEach(() => {
  delete (globalThis as unknown as { window?: TestWindow }).window;
});

const win = () => (globalThis as unknown as { window: TestWindow }).window;

/**
 * consent-and-privacy-1 (2026-09-08): GTM replays every dataLayer entry queued
 * before it loads, so a scroll-depth event pushed before the banner decision
 * would reach Google the moment the visitor accepts. The tracker therefore
 * never creates the queue until the stored decision is "granted".
 */
describe("scroll-depth events respect the stored cookie decision", () => {
  it("does not create or fill window.dataLayer before a decision", () => {
    expect(pushScrollDepthEvent(25, "/")).toBe(false);
    expect(win().dataLayer).toBeUndefined();
  });

  it("stays dark after an explicit denial", () => {
    storage.set(CONSENT_STORAGE_KEY, "denied");
    expect(pushScrollDepthEvent(50, "/pricing")).toBe(false);
    expect(win().dataLayer).toBeUndefined();
  });

  it("pushes the GA-shaped event once consent is granted", () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    expect(pushScrollDepthEvent(75, "/analyze")).toBe(true);
    expect(win().dataLayer).toEqual([{ event: "scroll_depth_75", scrollDepthPct: 75, page: "/analyze" }]);
  });

  it("never throws when the dataLayer is not pushable", () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    win().dataLayer = Object.freeze([]) as unknown as unknown[];
    expect(pushScrollDepthEvent(100, "/")).toBe(false);
  });

  it("routes the component's only dataLayer write through the gated helper", () => {
    const source = readFileSync(join(process.cwd(), "components/marketing/scroll-depth-tracker.tsx"), "utf8");
    expect(source).toContain('readStoredAnalyticsConsent() !== "granted"');
    expect((source.match(/dataLayer/g) ?? []).length).toBeGreaterThan(0);
    // Every dataLayer reference lives inside the gated helper, none in the effect.
    const effectBody = source.slice(source.indexOf("useEffect(() => {"));
    expect(effectBody).not.toContain("dataLayer");
  });
});
