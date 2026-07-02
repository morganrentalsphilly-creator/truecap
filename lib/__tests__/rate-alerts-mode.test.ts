/**
 * Pins the truthful-alerts flag (G1 fallback): surfaces only promise alert
 * emails when RATE_ALERTS_MODE is exactly "live" — the same parse (trim +
 * lowercase) the send-rate-alerts cron uses, so copy and sends can never
 * disagree.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { rateAlertEmailsLive } from "../rate-alerts-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rateAlertEmailsLive", () => {
  it("is false when the env var is unset (feature ships dormant)", () => {
    vi.stubEnv("RATE_ALERTS_MODE", "");
    expect(rateAlertEmailsLive()).toBe(false);
  });

  it("is false in off and dry modes", () => {
    vi.stubEnv("RATE_ALERTS_MODE", "off");
    expect(rateAlertEmailsLive()).toBe(false);
    vi.stubEnv("RATE_ALERTS_MODE", "dry");
    expect(rateAlertEmailsLive()).toBe(false);
  });

  it("is true only for live — tolerating whitespace and case like the cron does", () => {
    vi.stubEnv("RATE_ALERTS_MODE", "live");
    expect(rateAlertEmailsLive()).toBe(true);
    vi.stubEnv("RATE_ALERTS_MODE", " LIVE ");
    expect(rateAlertEmailsLive()).toBe(true);
    vi.stubEnv("RATE_ALERTS_MODE", "liveish");
    expect(rateAlertEmailsLive()).toBe(false);
  });
});
