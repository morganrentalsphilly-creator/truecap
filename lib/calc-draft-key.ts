/**
 * Where the analyzer's in-progress form draft lives in localStorage
 * (2026-11 audit C7).
 *
 * The draft used to sit under one key for the whole browser. On a shared
 * device that made it whoever-opens-the-page-next's draft: it was removed
 * only by the sign-out click handler, so a session that simply expired left
 * one account's unfinished deal for the next account to restore.
 *
 * A signed-in account's draft is now stored under a key that carries its user
 * id. Anonymous visitors keep the original key. Work started anonymously
 * still follows the visitor into the account they sign in to (the "save this
 * deal" sign-in handoff depends on that): the first read after sign-in moves
 * the anonymous draft under the account's key. That same move is the one-time
 * migration for drafts written before this change.
 *
 * Sign-out still clears every one of these keys: lib/client-auth-storage.ts
 * removes by the shared prefix.
 */

/** The original, anonymous key. Also the prefix of every account key. */
export const CALC_FORM_DRAFT_KEY = "truecap_calc_form_draft_v1";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The key for this owner's draft: an account's own, or the anonymous one. */
export function calcDraftKeyFor(ownerId: string | null | undefined): string {
  const id = typeof ownerId === "string" ? ownerId.trim() : "";
  return id ? `${CALC_FORM_DRAFT_KEY}:${id}` : CALC_FORM_DRAFT_KEY;
}

/**
 * Move a draft left under the anonymous key to the signed-in owner's key.
 * The anonymous draft wins over an older account draft on purpose: it is the
 * work the visitor did immediately before signing in. No-op for anonymous
 * visitors and when there is nothing to move. Never throws.
 */
export function adoptAnonymousCalcDraft(
  storage: DraftStorage,
  ownerId: string | null | undefined,
): void {
  const key = calcDraftKeyFor(ownerId);
  if (key === CALC_FORM_DRAFT_KEY) return;
  try {
    const anonymous = storage.getItem(CALC_FORM_DRAFT_KEY);
    if (anonymous === null) return;
    storage.setItem(key, anonymous);
    storage.removeItem(CALC_FORM_DRAFT_KEY);
  } catch {
    // Storage denied or full: the draft is best-effort.
  }
}
