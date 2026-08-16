/**
 * Pending-save-intent flag — carries an anonymous visitor's explicit "Save"
 * click across the auth boundary.
 *
 * Flow: anon user runs an analysis → clicks Save → we set this flag and send
 * them to /auth/login?next=/ → they sign up/in and return to the calculator →
 * the mount-time draft restore sees the flag, auto-runs their analysis, and
 * completes the save. Without it the user lands on a pre-filled but inert
 * form and has to re-Calculate + re-Save manually — a conversion leak
 * at the exact moment they demonstrated the highest intent.
 *
 * localStorage (not the URL) so the flag survives OAuth round-trips and
 * multi-step signup. 30-minute TTL so a stale flag from an abandoned signup
 * weeks ago can't ambush a returning user with an unexpected auto-run.
 * All best-effort: private-mode Safari / disabled storage degrade to the
 * current behavior (draft restores, no auto-run).
 */

const PENDING_SAVE_INTENT_KEY = "truecap_pending_save_intent_v1";
const INTENT_TTL_MS = 30 * 60 * 1000;

export function setPendingSaveIntent(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PENDING_SAVE_INTENT_KEY, String(Date.now()));
    }
  } catch {
    /* best-effort */
  }
}

/** Read-and-clear. Returns true only for a fresh (<30min) intent. */
export function consumePendingSaveIntent(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(PENDING_SAVE_INTENT_KEY);
    if (!raw) return false;
    window.localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < INTENT_TTL_MS;
  } catch {
    return false;
  }
}
