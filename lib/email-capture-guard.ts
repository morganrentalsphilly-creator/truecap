import "server-only";

/**
 * Abuse guard for the anonymous post-analysis email capture.
 *
 * The capture action is a `"use server"` export with no session: anyone who
 * pulls the Next-Action id out of the public bundle can POST it. Each call
 * fires FIVE Resend sends (one immediate + four `scheduled_at`) to a
 * caller-supplied recipient. Without a limit that is an open, 5x-amplified
 * mail relay on TrueCap's sending domain — one bad afternoon away from a
 * blocklisting that would take the whole email estate (lifecycle drips, rate
 * and rent alerts, weekly summaries, lead notifications) down with it.
 *
 * Why not the in-memory bucket pattern from capture-deal-lead.ts: that Map
 * lives in one lambda's heap. Under Vercel autoscaling, N warm instances mean
 * N times the quota and a cold start wipes it — fine for capping spam rows,
 * useless for capping outbound mail. This limiter is a shared Postgres
 * counter (see supabase/migrations/20260802120500_email_capture_guard.sql).
 *
 * FAIL CLOSED: if the RPC errors, is missing (migration not applied yet), or
 * returns anything unexpected, `claimEmailCaptureSlot` returns
 * `{ allowed: false, reason: "UNAVAILABLE" }` and the caller must NOT send.
 * A capture prompt that is temporarily broken is a funnel bug; an unmetered
 * mail relay is an incident.
 *
 * FAIL CLOSED, NOT FAIL DARK: the fail-closed rule covers genuine
 * infrastructure failure only. A *rate-limited attacker* must never be able to
 * convert their own rejections into a site-wide outage, so the SQL charges the
 * global (site-wide) budget only for claims that actually send — rejections on
 * the per-IP or dedup axis cost the site nothing. See the ordering rationale
 * in the migration.
 */

import { createHash } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const EMAIL_CAPTURE_LIMITS = {
  /**
   * One address can be enrolled at most twice per 30 days. Two, not one, so a
   * legitimate user whose first attempt half-failed can resubmit; low enough
   * that a victim can never be re-subscribed into the 5-email sequence
   * repeatedly.
   */
  emailMax: 2,
  emailWindowSeconds: 30 * 24 * 60 * 60,
  /**
   * Per-source axis, and the one that binds first for a scripted loop: 5
   * captures per hour from one source IP (25 Resend sends). Not 3, because a
   * shared egress IP is normal for real users — office NAT, campus wifi,
   * mobile carrier CGNAT — and the 4th genuine first-timer behind one of those
   * must not hit a wall. Real anonymous volume is ~3 analyses/hour SITE-WIDE,
   * so 5/hour from a single IP is already far past any legitimate burst.
   * The "unknown" fallback (no x-forwarded-for) shares one bucket by design:
   * the restrictive choice, and unreachable on Vercel where XFF is always set.
   */
  ipMax: 5,
  ipWindowSeconds: 60 * 60,
  /**
   * Site-wide backstop against an attacker rotating BOTH email and IP.
   * Counts successful claims only (see the migration): a rejected request
   * costs the site nothing, so this is a real send budget, not a request
   * counter. 200 successful captures/hour = 1,000 Resend sends/hour worst
   * case, against a real funnel of ~3 analyses/hour site-wide — roughly two
   * orders of magnitude of headroom, so a legitimate visitor should never see
   * GLOBAL_LIMIT. If one ever does, the Sentry warning on that path is the
   * signal to raise this, not evidence the cap is working.
   */
  globalMax: 200,
  globalWindowSeconds: 60 * 60,
} as const;

export type EmailCaptureClaim =
  | { allowed: true; emailBucketKey: string }
  | {
      allowed: false;
      /**
       * DUPLICATE   — this address is already enrolled (treat as success; do not send)
       * IP_LIMIT    — too many captures from this source
       * GLOBAL_LIMIT— site-wide hourly send budget exhausted
       * UNAVAILABLE — guard could not be consulted; fail closed
       */
      reason: "DUPLICATE" | "IP_LIMIT" | "GLOBAL_LIMIT" | "UNAVAILABLE";
      /** Populated for UNAVAILABLE so the caller can Sentry-report the cause. */
      detail?: string;
    };

/** Minimal shape of `supabase.rpc` — injectable so the logic is unit-testable. */
export type GuardRpc = (
  fn: string,
  params: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>;

/** Service-role RPC caller. Constructed lazily so tests never need env vars. */
function adminRpc(): GuardRpc {
  const admin = createAdminSupabaseClient();
  return async (fn, params) => {
    const { data, error } = await admin.rpc(fn, params);
    return { data, error };
  };
}

/**
 * Bucket keys are hashes, never raw values: the counter table must not double
 * as a plaintext contact list. The static prefix is a domain separator, not a
 * secret — anyone who can read this table already holds the service-role key.
 */
const KEY_NAMESPACE = "truecap:email-capture:v1";

/**
 * Surface namespaces keep per-surface email caps independent: someone who
 * gave their email to the post-analysis checklist ("pae") can still request
 * the Market Intelligence Pack ("mip") — but each surface's own 30-day
 * duplicate cap holds. IP and global buckets are shared across surfaces by
 * passing the same namespace behavior through the SAME RPC, so total
 * outbound volume stays bounded no matter how many surfaces exist.
 */
export type CaptureSurface = "pae" | "mip";

export function buildBucketKey(
  kind: "email" | "ip",
  value: string,
  surface: CaptureSurface = "pae"
): string {
  const normalized =
    kind === "email" ? value.trim().toLowerCase() : value.trim().toLowerCase() || "unknown";
  const digest = createHash("sha256")
    .update(`${KEY_NAMESPACE}:${kind}:${normalized}`)
    .digest("hex")
    .slice(0, 32);
  // Email caps are per-surface; IP abuse caps are shared across surfaces.
  const prefix = kind === "email" ? surface : "pae";
  return `${prefix}:${kind}:${digest}`;
}

/** Single row, rotated by the hour bucket so the window is self-evident.
 *  Shared across all capture surfaces — one sitewide outbound budget. */
export function buildGlobalBucketKey(now: Date = new Date()): string {
  return `pae:global:${now.toISOString().slice(0, 13)}`;
}

/** Maps the RPC's status string onto a decision. Unknown status → fail closed. */
export function interpretClaimStatus(
  status: unknown,
  emailBucketKey: string
): EmailCaptureClaim {
  switch (status) {
    case "ok":
      return { allowed: true, emailBucketKey };
    case "duplicate":
      return { allowed: false, reason: "DUPLICATE" };
    case "ip_limited":
      return { allowed: false, reason: "IP_LIMIT" };
    case "global_limited":
      return { allowed: false, reason: "GLOBAL_LIMIT" };
    default:
      return {
        allowed: false,
        reason: "UNAVAILABLE",
        detail: `unexpected claim status: ${JSON.stringify(status)}`,
      };
  }
}

/**
 * Reserve one capture slot. Returns `allowed: false` for every non-`ok`
 * outcome — including infrastructure failure. Callers must not send email
 * unless `allowed === true`.
 */
export async function claimEmailCaptureSlot(args: {
  email: string;
  ip: string;
  surface?: CaptureSurface;
  rpc?: GuardRpc;
  now?: Date;
}): Promise<EmailCaptureClaim> {
  const emailBucketKey = buildBucketKey("email", args.email, args.surface ?? "pae");
  const ipBucketKey = buildBucketKey("ip", args.ip, args.surface ?? "pae");
  const globalBucketKey = buildGlobalBucketKey(args.now ?? new Date());

  let rpc: GuardRpc;
  if (args.rpc) {
    rpc = args.rpc;
  } else {
    try {
      rpc = adminRpc();
    } catch (err) {
      // Missing SUPABASE_* env — cannot meter, so do not send.
      return {
        allowed: false,
        reason: "UNAVAILABLE",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  try {
    const { data, error } = await rpc("claim_email_capture", {
      p_global_key: globalBucketKey,
      p_email_key: emailBucketKey,
      p_ip_key: ipBucketKey,
      p_global_max: EMAIL_CAPTURE_LIMITS.globalMax,
      p_global_window_seconds: EMAIL_CAPTURE_LIMITS.globalWindowSeconds,
      p_email_max: EMAIL_CAPTURE_LIMITS.emailMax,
      p_email_window_seconds: EMAIL_CAPTURE_LIMITS.emailWindowSeconds,
      p_ip_max: EMAIL_CAPTURE_LIMITS.ipMax,
      p_ip_window_seconds: EMAIL_CAPTURE_LIMITS.ipWindowSeconds,
    });
    if (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      return { allowed: false, reason: "UNAVAILABLE", detail: message };
    }
    return interpretClaimStatus(data, emailBucketKey);
  } catch (err) {
    return {
      allowed: false,
      reason: "UNAVAILABLE",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Give back the EMAIL bucket bump when nothing was actually sent, so a user
 * whose capture died on a Resend outage isn't locked out for 30 days. The
 * global and IP buckets are deliberately NOT refunded: refunding the axes an
 * attacker controls would turn this into a free bypass.
 *
 * Best-effort — never throws, never blocks the response.
 */
export async function releaseEmailCaptureSlot(
  emailBucketKey: string,
  rpc?: GuardRpc
): Promise<void> {
  try {
    const call = rpc ?? adminRpc();
    await call("release_capture_bucket", { p_key: emailBucketKey });
  } catch {
    /* best-effort refund — a stuck bucket expires on its own window */
  }
}
