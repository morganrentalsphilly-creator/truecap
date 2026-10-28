import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { savedDealPath, savedDealUrlTransition } from "@/lib/saved-deal-url";
import { trackConversionBeforeLeaving } from "@/lib/analytics/track-conversion";
import { isSensitiveTelemetryLocation } from "@/lib/sensitive-url";

const ID = "3f2c1a9e-7b4d-4c2e-9a1f-0d6e5b8c7a21";
const OTHER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("savedDealPath", () => {
  it("sets, replaces and removes the deal while keeping other parameters", () => {
    expect(savedDealPath("https://usetruecap.com/dashboard/new", ID)).toBe(
      `/dashboard/new?savedDeal=${ID}`,
    );
    expect(
      savedDealPath(`https://usetruecap.com/dashboard/new?fresh=1&savedDeal=${OTHER}#r`, ID),
    ).toBe(`/dashboard/new?fresh=1&savedDeal=${ID}#r`);
    expect(savedDealPath(`/dashboard/new?savedDeal=${ID}&fresh=1`, null)).toBe(
      "/dashboard/new?fresh=1",
    );
  });

  it("never leaves the origin, whatever the href", () => {
    expect(savedDealPath("https://elsewhere.example/x?y=1", ID)).toBe(`/x?y=1&savedDeal=${ID}`);
  });
});

describe("savedDealUrlTransition", () => {
  it("opens a new document when this one may be running telemetry", () => {
    const transition = savedDealUrlTransition("https://usetruecap.com/dashboard/new", ID, true);
    expect(transition).toEqual({ kind: "new-document", path: `/dashboard/new?savedDeal=${ID}` });
    // The destination is sensitive, so the new document starts with every
    // telemetry provider off.
    if (transition.kind !== "new-document") throw new Error("unreachable");
    expect(isSensitiveTelemetryLocation(transition.path)).toBe(true);
  });

  it("rewrites the URL in place when no telemetry script can be present", () => {
    expect(savedDealUrlTransition("https://usetruecap.com/dashboard/new?next=%2Fx", ID, false)).toEqual({
      kind: "replace-state",
      path: `/dashboard/new?next=%2Fx&savedDeal=${ID}`,
    });
  });

  it("leaves a URL that already names the deal alone, telemetry or not", () => {
    for (const telemetry of [true, false]) {
      expect(
        savedDealUrlTransition(`https://usetruecap.com/dashboard/new?savedDeal=${ID}`, ID, telemetry),
      ).toEqual({ kind: "unchanged" });
    }
  });

  it("treats a different deal in the URL as a change", () => {
    expect(
      savedDealUrlTransition(`https://usetruecap.com/dashboard/new?savedDeal=${OTHER}`, ID, true).kind,
    ).toBe("new-document");
  });
});

type GtmWindow = {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (...args: unknown[]) => void;
  google_tag_manager?: Record<string, unknown>;
};

describe("trackConversionBeforeLeaving", () => {
  let win: GtmWindow;
  beforeEach(() => {
    vi.useFakeTimers();
    win = {};
    (globalThis as unknown as { window: GtmWindow }).window = win;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as unknown as { window?: GtmWindow }).window;
  });

  it("resolves at once when no Google tag runs in the document", async () => {
    let resolved = false;
    void trackConversionBeforeLeaving("deal_saved").then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
    // The event is still queued for a container that may boot later.
    expect(win.dataLayer).toEqual([expect.objectContaining({ event: "tc_deal_saved" })]);
    expect(win.dataLayer?.[0]).not.toHaveProperty("eventCallback");
  });

  it("waits for GTM's eventCallback when GTM is running", async () => {
    win.google_tag_manager = {};
    let resolved = false;
    void trackConversionBeforeLeaving("deal_saved", {}, 1500).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);
    const push = win.dataLayer?.[0] as { eventCallback?: (id: string) => void };
    expect(typeof push.eventCallback).toBe("function");
    // GTM calls it once per container.
    push.eventCallback?.("GTM-TCBNRMBG");
    push.eventCallback?.("AW-8236119484");
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it("gives up after the timeout so a stalled tag never traps the user", async () => {
    win.google_tag_manager = {};
    let resolved = false;
    void trackConversionBeforeLeaving("deal_saved", {}, 1500).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(1499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});

describe("first save in a telemetry document", () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

  it("opens the saved deal as a new document instead of rewriting this one's URL", () => {
    const page = read("components/investcalc/investcalc-page.tsx");
    const save = page.slice(page.indexOf("const performSaveDeal = async"));
    const success = save.slice(0, save.indexOf('if (result.code === "SIGN_IN_REQUIRED")'));
    // The in-place rewrite only runs on the replace-state branch.
    expect(success).toMatch(
      /if \(urlTransition\.kind === "replace-state"\) \{\s*replaceSavedDealUrl\(result\.id\);/,
    );
    expect(success.match(/replaceSavedDealUrl\(result\.id\)/g)).toHaveLength(1);
    // The sends go out before the navigation, and the conversion is awaited.
    expect(success.indexOf('trackConversionBeforeLeaving("deal_saved")')).toBeLessThan(
      success.indexOf("openSavedDealDocument(urlTransition.path, conversionSent)"),
    );
    expect(page).toContain("await Promise.all([conversionSent, whenSiteEventsHandedOff()]);");
    expect(page).toContain("window.location.replace(path);");
    // Input stays paused from the click until the document unloads.
    expect(save).toContain("setInputPausedForSave(true);");
    expect(page).toContain("inert={inputPausedForSave ? true : undefined}");
  });

  it("counts every telemetry mount in the shared flag", () => {
    for (const file of [
      "components/analytics/posthog-provider.tsx",
      "components/analytics/vercel-analytics.tsx",
      "components/analytics/google-measurement.tsx",
    ]) {
      expect(read(file)).toContain("markThirdPartyTelemetryMounted()");
    }
    expect(read("components/analytics/posthog-provider.tsx")).toContain(
      "documentMayHaveThirdPartyTelemetry()",
    );
  });
});
