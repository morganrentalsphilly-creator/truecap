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

const PENDING_SAVE_INTENT_KEY = "truecap_pending_save_intent_v2";
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;

type PendingSaveIntent = {
  createdAt: number;
  draftFingerprint: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

/** Deterministic, non-reversible binding for the exact draft the user chose to save. */
export function saveIntentDraftFingerprint(draft: unknown): string | null {
  try {
    const input = stableStringify(draft);
    let first = 0xdeadbeef;
    let second = 0x41c6ce57;
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index);
      first = Math.imul(first ^ code, 2654435761);
      second = Math.imul(second ^ code, 1597334677);
    }
    first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
    second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
    return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
      .toString(16)
      .padStart(8, "0")}`;
  } catch {
    return null;
  }
}

export function setPendingSaveIntent(draft: unknown): boolean {
  try {
    if (typeof window === "undefined") return false;
    const draftFingerprint = saveIntentDraftFingerprint(draft);
    if (!draftFingerprint) return false;
    const intent: PendingSaveIntent = { createdAt: Date.now(), draftFingerprint };
    window.localStorage.setItem(PENDING_SAVE_INTENT_KEY, JSON.stringify(intent));
    return true;
  } catch {
    return false;
  }
}

function readPendingSaveIntent(now = Date.now()): PendingSaveIntent | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PENDING_SAVE_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSaveIntent>;
    const fresh =
      Number.isFinite(parsed.createdAt) &&
      typeof parsed.createdAt === "number" &&
      now >= parsed.createdAt &&
      now - parsed.createdAt < INTENT_TTL_MS &&
      typeof parsed.draftFingerprint === "string" &&
      /^[a-f0-9]{16}$/.test(parsed.draftFingerprint);
    if (!fresh) window.localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    return fresh ? (parsed as PendingSaveIntent) : null;
  } catch {
    try {
      window.localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    } catch {
      /* best-effort */
    }
    return null;
  }
}

/** Read without clearing. The intent is acknowledged only after persistence. */
export function hasPendingSaveIntent(now = Date.now()): boolean {
  return readPendingSaveIntent(now) !== null;
}

/** Fail closed and clear a latent intent when the restored draft is not the intended one. */
export function pendingSaveIntentMatchesDraft(draft: unknown, now = Date.now()): boolean {
  const intent = readPendingSaveIntent(now);
  if (!intent) return false;
  const fingerprint = saveIntentDraftFingerprint(draft);
  if (!fingerprint || fingerprint !== intent.draftFingerprint) {
    clearPendingSaveIntent();
    return false;
  }
  return true;
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
