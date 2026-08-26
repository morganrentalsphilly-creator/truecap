type BrowserStorage = Pick<Storage, "key" | "length" | "removeItem">;

/**
 * Browser-only underwriting continuity data that must never survive a user
 * signing out on a shared device. Preferences and consent are intentionally
 * excluded.
 */
export const SENSITIVE_AUTH_STORAGE_PREFIXES = [
  "truecap_calc_form_draft_v1",
  "truecap_pending_save_intent_v2",
  "truecap_pending_mao_target_v1",
  "truecap_saved_analysis_edit_draft",
  "truecap_saved_analysis_duplicate_draft",
  "truecap_pending_hero_analyze",
  "truecap_saved_analysis_auto_export_pdf",
  "truecap:share-auth-intent:v1",
  "truecap:one-time-pdf-",
  "truecap:batch-triage:v2",
  "truecap_mydeals_view_v1",
] as const;

export function clearSensitiveKeysFromStorage(storage: BrowserStorage): void {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key &&
        SENSITIVE_AUTH_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        keys.push(key);
      }
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Some privacy modes deny storage access. Sign-out must still continue.
  }
}

export function clearSensitiveAuthContinuityStorage(): void {
  if (typeof window === "undefined") return;
  clearSensitiveKeysFromStorage(window.localStorage);
  clearSensitiveKeysFromStorage(window.sessionStorage);
}
