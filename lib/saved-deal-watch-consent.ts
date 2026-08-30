export type SavedDealWatchConsent = {
  inAppNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
};

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
