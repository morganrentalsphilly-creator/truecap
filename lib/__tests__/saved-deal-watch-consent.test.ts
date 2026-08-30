import { describe, expect, it } from "vitest";
import {
  applySavedDealWatchPreferencePatch,
  loosensSavedDealWatchConsent,
  savedDealWatchPreferenceDatabasePatch,
} from "@/lib/saved-deal-watch-consent";

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

  it("makes concurrent disjoint channel revocations converge to both false", () => {
    const initial = {
      in_app_notifications_enabled: true,
      email_notifications_enabled: true,
    };
    const inAppOff = savedDealWatchPreferenceDatabasePatch({
      preference: "inAppNotificationsEnabled",
      enabled: false,
    });
    const emailOff = savedDealWatchPreferenceDatabasePatch({
      preference: "emailNotificationsEnabled",
      enabled: false,
    });

    expect(Object.keys(inAppOff)).toEqual(["in_app_notifications_enabled"]);
    expect(Object.keys(emailOff)).toEqual(["email_notifications_enabled"]);
    expect({ ...initial, ...inAppOff, ...emailOff }).toEqual({
      in_app_notifications_enabled: false,
      email_notifications_enabled: false,
    });
    expect({ ...initial, ...emailOff, ...inAppOff }).toEqual({
      in_app_notifications_enabled: false,
      email_notifications_enabled: false,
    });
  });

  it("derives entitlement direction from the retained row plus only the requested channel", () => {
    const retained = {
      inAppNotificationsEnabled: true,
      emailNotificationsEnabled: true,
    };
    const next = applySavedDealWatchPreferencePatch(retained, {
      preference: "emailNotificationsEnabled",
      enabled: false,
    });
    expect(next).toEqual({
      inAppNotificationsEnabled: true,
      emailNotificationsEnabled: false,
    });
    expect(loosensSavedDealWatchConsent(retained, next)).toBe(false);
  });
});
