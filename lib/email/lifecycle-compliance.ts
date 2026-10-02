import "server-only";

/**
 * The one decision about whether a lifecycle email may leave.
 *
 * A lifecycle email (welcome, the onboarding drip, the Pro nudge, win-back and
 * the trial activation email) is marketing mail. It goes out only when all
 * three hold:
 *
 *   1. LIFECYCLE_EMAILS_MODE is `live`.
 *   2. EMAIL_POSTAL_ADDRESS is set. The footer prints it. The value lives in
 *      the environment only: no address is typed in this repository, and no
 *      fallback or placeholder exists, because a placeholder could ship.
 *   3. The per-user unsubscribe link can be signed: SHARE_LINK_SECRET is set
 *      and the site URL is https. The link is the existing account opt-out
 *      (app/email/unsubscribe/route.ts, scope "marketing-unsubscribe"), which
 *      sets profiles.marketing_opt_out.
 *
 * Every sender calls lifecycleSendGate() and stops when it is closed:
 * app/api/cron/send-lifecycle-emails/route.ts, lib/email/send-lifecycle.ts and
 * the trial activation email in lib/email/trial-emails.ts. A closed gate logs
 * one line that names the condition (describeLifecycleBlock).
 *
 * The same module holds the welcome age guard, so opening the gate after a
 * long block cannot release a backlog: a welcome is sent only while the
 * account is at most WELCOME_MAX_AGE_DAYS old. Past-window drip days were
 * already retired by the catch-up guard in lib/lifecycle-emails.ts.
 */

import { mintSignedToken } from "@/lib/signed-token";
import { UNSUBSCRIBE_TOKEN_SCOPE } from "@/lib/testimonials/feedback-email";
import { DRIP_CATCH_UP_GRACE_DAYS, daysBetween } from "@/lib/lifecycle-emails";

export type LifecycleMode = "off" | "dry" | "live";

export function resolveLifecycleMode(
  raw: string | null | undefined = process.env.LIFECYCLE_EMAILS_MODE,
): LifecycleMode {
  const value = (raw ?? "off").trim().toLowerCase();
  if (value === "live") return "live";
  if (value === "dry" || value === "dry-run") return "dry";
  return "off";
}

/** The sender's postal address, or null when the variable is unset or blank. */
export function readEmailPostalAddress(
  raw: string | null | undefined = process.env.EMAIL_POSTAL_ADDRESS,
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.replace(/\s+/g, " ").trim();
  return value.length > 0 ? value : null;
}

/** The id shape app/email/unsubscribe/route.ts accepts for an account token. */
const USER_ID_SHAPE = /^[0-9a-f-]{36}$/i;
/** A well-formed id used only to test that signing works; no row has it. */
const PROBE_USER_ID = "00000000-0000-4000-8000-000000000000";

/**
 * The signed account opt-out URL for one user, or null when it cannot be
 * built: no signing secret, a site URL that is not https, or an id the
 * unsubscribe route would reject. Null always means "do not send".
 */
export function buildLifecycleUnsubscribeUrl(siteUrl: string, userId: string): string | null {
  if (!USER_ID_SHAPE.test(userId)) return null;
  try {
    const url = new URL("/email/unsubscribe", siteUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const token = mintSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, { u: userId });
    if (!token) return null;
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * RFC 8058 one-click headers. The URL is the only method listed: a mailto
 * entry would depend on a person reading a mailbox, and the route's POST
 * already acts on `List-Unsubscribe=One-Click`.
 */
export function buildLifecycleUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export type LifecycleComplianceBlock = "postal_address_missing" | "unsubscribe_unsignable";
export type LifecycleBlockReason = "mode_off" | "mode_dry" | LifecycleComplianceBlock;

/** What stops a send regardless of the mode, or null when nothing does. */
export function lifecycleComplianceBlock(siteUrl: string): LifecycleComplianceBlock | null {
  if (!readEmailPostalAddress()) return "postal_address_missing";
  if (!buildLifecycleUnsubscribeUrl(siteUrl, PROBE_USER_ID)) return "unsubscribe_unsignable";
  return null;
}

export type LifecycleSendGate =
  | { open: true; postalAddress: string }
  | { open: false; reason: LifecycleBlockReason };

export function lifecycleSendGate(siteUrl: string): LifecycleSendGate {
  const mode = resolveLifecycleMode();
  if (mode !== "live") return { open: false, reason: mode === "dry" ? "mode_dry" : "mode_off" };
  const block = lifecycleComplianceBlock(siteUrl);
  if (block) return { open: false, reason: block };
  // lifecycleComplianceBlock returned null, so the address is present.
  const postalAddress = readEmailPostalAddress();
  if (!postalAddress) return { open: false, reason: "postal_address_missing" };
  return { open: true, postalAddress };
}

/** The condition that failed, in words, for the one log line of a blocked run. */
export function describeLifecycleBlock(reason: LifecycleBlockReason): string {
  switch (reason) {
    case "mode_off":
      return "LIFECYCLE_EMAILS_MODE is off";
    case "mode_dry":
      return "LIFECYCLE_EMAILS_MODE is dry";
    case "postal_address_missing":
      return "EMAIL_POSTAL_ADDRESS is not set";
    case "unsubscribe_unsignable":
      return "the unsubscribe link cannot be signed (SHARE_LINK_SECRET is missing or the site URL is not https)";
  }
}

/**
 * Welcome age guard. The welcome is day 0 of onboarding and gets the drip's
 * own slack: it is sendable while the account is at most
 * 0 + DRIP_CATCH_UP_GRACE_DAYS days old. After that it is retired, never sent.
 */
export const WELCOME_MAX_AGE_DAYS = DRIP_CATCH_UP_GRACE_DAYS;

/** True when a welcome would arrive late. An unreadable sign-up date counts as late. */
export function welcomeWindowPassed(signupAtIso: string, now: Date = new Date()): boolean {
  if (!Number.isFinite(new Date(signupAtIso).getTime())) return true;
  return daysBetween(signupAtIso, now) > WELCOME_MAX_AGE_DAYS;
}
