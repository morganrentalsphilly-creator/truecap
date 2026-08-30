import { describe, expect, it } from "vitest";
import { loosensSavedDealWatchConsent } from "@/lib/saved-deal-watch-consent";

describe("Saved Deal Watch directional consent", () => {
  it("treats enabling either previously-false channel as loosening", () => {
    expect(
      loosensSavedDealWatchConsent(
        {
          inAppNotificationsEnabled: false,
          emailNotificationsEnabled: true,
        },
        {
          inAppNotificationsEnabled: true,
          emailNotificationsEnabled: false,
        },
      ),
    ).toBe(true);
    expect(
      loosensSavedDealWatchConsent(null, {
        inAppNotificationsEnabled: false,
        emailNotificationsEnabled: true,
      }),
    ).toBe(true);
  });

  it("permits true-to-false tightening and false-only no-ops", () => {
    expect(
      loosensSavedDealWatchConsent(
        {
          inAppNotificationsEnabled: true,
          emailNotificationsEnabled: true,
        },
        {
          inAppNotificationsEnabled: false,
          emailNotificationsEnabled: true,
        },
      ),
    ).toBe(false);
    expect(
      loosensSavedDealWatchConsent(null, {
        inAppNotificationsEnabled: false,
        emailNotificationsEnabled: false,
      }),
    ).toBe(false);
  });
});
