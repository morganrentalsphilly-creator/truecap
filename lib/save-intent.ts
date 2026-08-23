/**
 * Pending-save-intent flag — carries an anonymous visitor's explicit "Save"
 * click across the auth boundary.
 *
 * Flow: anon user runs an analysis → clicks Save → we set this flag and send
 * them to /auth/login?next=/ → they sign up/in and return to the calculator →
 * the mount-time draft restore sees the flag, auto-runs their analysis, and
 * automatically saves it. Without it the user lands on a pre-filled but
 * inert form and has to repeat Calculate + Save — a conversion leak
 * at the exact moment they demonstrated the highest intent.
 *
 * localStorage (not the URL) so the flag survives OAuth round-trips and
 * multi-step signup. 24-hour TTL accommodates email confirmation while still
 * ensuring an abandoned intent cannot surprise someone days later.
 * weeks ago can't ambush a returning user with an unexpected auto-run.
 * All best-effort: private-mode Safari / disabled storage degrade to the
 * current behavior (draft restores, no auto-run).
 */

const PENDING_SAVE_INTENT_KEY = "truecap_pending_save_intent_v1";
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;

export function setPendingSaveIntent(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PENDING_SAVE_INTENT_KEY, String(Date.now()));
    }
  } catch {
    /* best-effort */
  }
}

/** Read without clearing. The intent is acknowledged only after persistence. */
export function hasPendingSaveIntent(now = Date.now()): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(PENDING_SAVE_INTENT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    const fresh = Number.isFinite(ts) && now >= ts && now - ts < INTENT_TTL_MS;
    if (!fresh) window.localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    return fresh;
  } catch {
    return false;
  }
}

export function clearPendingSaveIntent(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    }
  } catch {
    /* best-effort */
  }
}

/** Backwards-compatible read-and-clear helper for legacy call sites. */
export function consumePendingSaveIntent(): boolean {
  const pending = hasPendingSaveIntent();
  if (pending) clearPendingSaveIntent();
  return pending;
}
