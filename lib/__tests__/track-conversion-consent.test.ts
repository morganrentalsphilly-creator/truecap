import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackConversion, type ConversionKey } from "@/lib/analytics/track-conversion";
import { CONSENT_STORAGE_KEY } from "@/lib/analytics/site-events";

const EVENTS: ConversionKey[] = ["calc_completed", "signup", "pdf_exported", "deal_saved", "paid_subscribed"];
const UNLABELED_EVENTS = EVENTS.filter((event) => event !== "paid_subscribed");
const storage = new Map<string, string>();
let browser: {
  localStorage: { getItem: ReturnType<typeof vi.fn> };
  gtag?: ReturnType<typeof vi.fn>;
  dataLayer?: unknown[];
};

beforeEach(() => {
  storage.clear();
  browser = {
    localStorage: { getItem: vi.fn((key: string) => storage.get(key) ?? null) },
    gtag: vi.fn(),
  };
  vi.stubGlobal("window", browser);
});

afterEach(() => vi.unstubAllGlobals());

describe("legacy Google conversions respect current consent", () => {
  it.each(EVENTS)("does not create a pre-consent or denied queue for %s even with gtag loaded", (event) => {
    for (const decision of [null, "denied", "invalid", "GRANTED"]) {
      if (decision === null) storage.delete(CONSENT_STORAGE_KEY);
      else storage.set(CONSENT_STORAGE_KEY, decision);
      expect(trackConversion(event), String(decision)).toBe(false);
      expect(browser.dataLayer, String(decision)).toBeUndefined();
      expect(browser.gtag, String(decision)).not.toHaveBeenCalled();
    }
  });

  it.each(UNLABELED_EVENTS)("queues only the allowed payload for consented %s without requiring gtag", (event) => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    delete browser.gtag;
    expect(trackConversion(event, { value: 0, currency: "USD", transactionId: "private-session-id" })).toBe(true);
    expect(browser.dataLayer).toEqual([{ event: `tc_${event}`, value: 0, currency: "USD" }]);
  });

  it.each(EVENTS)("checks withdrawal on every %s call and never replays denied calls after regrant", (event) => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    expect(trackConversion(event, { value: 1 })).toBe(true);
    const beforeWithdrawal = [...browser.dataLayer!];
    const callsBeforeWithdrawal = browser.gtag!.mock.calls.length;

    storage.set(CONSENT_STORAGE_KEY, "denied");
    expect(trackConversion(event, { value: 2 })).toBe(false);
    storage.delete(CONSENT_STORAGE_KEY);
    expect(trackConversion(event, { value: 3 })).toBe(false);
    expect(browser.dataLayer).toEqual(beforeWithdrawal);
    expect(browser.gtag).toHaveBeenCalledTimes(callsBeforeWithdrawal);

    storage.set(CONSENT_STORAGE_KEY, "granted");
    expect(browser.dataLayer).toEqual(beforeWithdrawal);
    expect(trackConversion(event, { value: 4 })).toBe(true);
    expect(browser.dataLayer).toEqual([
      { event: `tc_${event}`, value: 1, currency: "USD" },
      { event: `tc_${event}`, value: 4, currency: "USD" },
    ]);
  });

  it("does not retain a pre-grant event to replay when GTM becomes available", () => {
    delete browser.gtag;
    expect(trackConversion("calc_completed", { value: 1 })).toBe(false);
    storage.set(CONSENT_STORAGE_KEY, "granted");
    expect(browser.dataLayer).toBeUndefined();
    expect(trackConversion("calc_completed", { value: 2 })).toBe(true);
    expect(browser.dataLayer).toEqual([{ event: "tc_calc_completed", value: 2, currency: "USD" }]);
  });

  it("fails closed when storage becomes unreadable, including after a grant", () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    browser.localStorage.getItem.mockImplementation(() => { throw new Error("storage unavailable"); });
    for (const event of EVENTS) expect(trackConversion(event)).toBe(false);
    expect(browser.dataLayer).toBeUndefined();
    expect(browser.gtag).not.toHaveBeenCalled();
  });

  it("does not claim an unlabeled handoff when dataLayer cannot accept the event", () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    browser.dataLayer = Object.freeze([]) as unknown as unknown[];
    expect(trackConversion("signup")).toBe(false);
    expect(browser.dataLayer).toEqual([]);
  });

  it("allows a consented purchase retry after the lazy tag loads without forwarding its local dedup key", () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    delete browser.gtag;
    const details = { value: 29.99, currency: "USD", transactionId: "private-session-id" };
    expect(trackConversion("paid_subscribed", details)).toBe(false);
    expect(browser.dataLayer).toBeUndefined();
    browser.gtag = vi.fn();
    expect(trackConversion("paid_subscribed", details)).toBe(true);
    expect(browser.gtag).toHaveBeenCalledExactlyOnceWith("event", "conversion", {
      send_to: "AW-8236119484/BCFeCPrZlqwcEIri_9JD", value: 29.99, currency: "USD",
    });
    expect(browser.dataLayer).toEqual([{ event: "tc_paid_subscribed", value: 29.99, currency: "USD" }]);
  });

  it("is a no-op while rendering on the server", () => {
    vi.stubGlobal("window", undefined);
    for (const event of EVENTS) expect(trackConversion(event)).toBe(false);
  });
});
