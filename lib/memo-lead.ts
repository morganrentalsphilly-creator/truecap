import "server-only";

/**
 * Memo leads — shared server helpers (docs/funnel-leaks-plan.md Phase A).
 *
 * A memo lead is an anonymous visitor who asked for their free decision by
 * email. The row (public.memo_leads, service-role only) holds the address and
 * the validated analyzer inputs; every output is recomputed from those inputs
 * whenever it is shown or emailed.
 *
 * The read-only link is a stateless signed token (lib/signed-token.ts, scope
 * "memo-lead") carrying only the row id, so nothing about the deal is in the
 * URL and deleting the row kills the link.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mintSignedToken, readSignedToken } from "@/lib/signed-token";

export const MEMO_LEAD_TOKEN_SCOPE = "memo-lead";
/** Matches the public share default (lib/public-share.ts) and the retention rule. */
export const MEMO_LINK_DAYS = 180;
/**
 * Version of the consent copy shown next to the form. Bump when the helper
 * text in components/marketing/memo-email-capture.tsx changes.
 *   v1: "We'll send this memo plus a few short notes on reading it.
 *        Unsubscribe anytime."
 */
export const MEMO_CONSENT_TEXT_VERSION = "memo-v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Path of the read-only memo page, or null when SHARE_LINK_SECRET is unset. */
export function buildMemoPath(leadId: string): string | null {
  const token = mintSignedToken(MEMO_LEAD_TOKEN_SCOPE, { l: leadId });
  return token ? `/memo/${token}` : null;
}

export function readMemoToken(token: string): string | null {
  const leadId = readSignedToken(MEMO_LEAD_TOKEN_SCOPE, token)?.l;
  return leadId && UUID.test(leadId) ? leadId : null;
}

export function isMemoLinkExpired(memoRequestedAt: string, now: Date = new Date()): boolean {
  const requested = Date.parse(memoRequestedAt);
  if (!Number.isFinite(requested)) return true;
  return now.getTime() - requested > MEMO_LINK_DAYS * 86_400_000;
}

/**
 * A new account whose address matches a memo lead ends the lead sequence and
 * hands the recipient to the trial sequence. Idempotent (only unconverted rows
 * are touched) and best-effort: never throws into the sign-up path.
 */
export async function linkMemoLeadToUser(
  admin: SupabaseClient,
  input: { userId: string; email: string | null | undefined },
): Promise<boolean> {
  if (!input.email) return false;
  try {
    const { data, error } = await admin
      .from("memo_leads")
      .update({ converted_user_id: input.userId, converted_at: new Date().toISOString() })
      .eq("email_normalized", normalizeLeadEmail(input.email))
      .is("converted_user_id", null)
      .select("id");
    return !error && (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
