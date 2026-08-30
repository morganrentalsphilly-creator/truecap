export type SavedDealWatchConsent = {
  inAppNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
};

export const SAVED_DEAL_WATCH_PREFERENCE_KEYS = [
  "inAppNotificationsEnabled",
  "emailNotificationsEnabled",
] as const;

export type SavedDealWatchPreferenceKey =
  (typeof SAVED_DEAL_WATCH_PREFERENCE_KEYS)[number];

export type SavedDealWatchPreferencePatch = {
  preference: SavedDealWatchPreferenceKey;
  enabled: boolean;
};

export function applySavedDealWatchPreferencePatch(
  current: SavedDealWatchConsent | null,
  patch: SavedDealWatchPreferencePatch,
): SavedDealWatchConsent {
  return {
    inAppNotificationsEnabled:
      patch.preference === "inAppNotificationsEnabled"
        ? patch.enabled
        : Boolean(current?.inAppNotificationsEnabled),
    emailNotificationsEnabled:
      patch.preference === "emailNotificationsEnabled"
        ? patch.enabled
        : Boolean(current?.emailNotificationsEnabled),
  };
}

/** A one-channel database patch makes disjoint cross-tab changes commute.
 * Never include the other consent column from a stale browser snapshot. */
export function savedDealWatchPreferenceDatabasePatch(
  patch: SavedDealWatchPreferencePatch,
):
  | { in_app_notifications_enabled: boolean }
  | { email_notifications_enabled: boolean } {
  return patch.preference === "inAppNotificationsEnabled"
    ? { in_app_notifications_enabled: patch.enabled }
    : { email_notifications_enabled: patch.enabled };
}

/**
 * Consent is loosened only when at least one channel changes false -> true.
 * Keeping a true channel unchanged while disabling another is tightening, as
 * is a fully-false no-op when no retained row exists.
 */
export function loosensSavedDealWatchConsent(
  current: SavedDealWatchConsent | null,
  next: SavedDealWatchConsent,
): boolean {
  return (
    (next.inAppNotificationsEnabled &&
      !current?.inAppNotificationsEnabled) ||
    (next.emailNotificationsEnabled &&
      !current?.emailNotificationsEnabled)
  );
}
