import "server-only";

/** Anonymous drip opt-outs share a suppression across both capture surfaces.
 * Scheduled provider IDs are retained so an opt-out also cancels queued mail.
 * The static hash namespace separates purposes; it is not a secret or encryption.
 * Both tables are service-role only (migration 20260907130000).
 */
import { createHash } from "crypto";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mintSignedToken } from "@/lib/signed-token";

export const DRIP_UNSUBSCRIBE_TOKEN_SCOPE = "drip-unsubscribe";
export type DripSurface = "post-analysis" | "lead-magnet";
const RESEND_API = "https://api.resend.com";

function report(operation: string, extra: Record<string, unknown> = {}) {
  // Database/provider error messages can contain recipient data. Log only
  // the operation and explicitly selected, non-personal diagnostics.
  Sentry.captureMessage(`email-drip-unsubscribe: ${operation}`, {
    level: "error",
    tags: { feature: "email-drip-unsubscribe" },
    extra,
  });
}

export function hashDripEmail(email: string): string {
  return createHash("sha256")
    .update(`truecap:drip-unsubscribe:v1:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function isDripEmailHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Missing secret or a non-HTTPS origin disables sending, never mailto-only. */
export function buildDripUnsubscribeUrl(siteUrl: string, email: string): string | null {
  try {
    const url = new URL("/email/unsubscribe", siteUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const token = mintSignedToken(DRIP_UNSUBSCRIBE_TOKEN_SCOPE, { e: hashDripEmail(email) });
    if (!token) return null;
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return null;
  }
}

export function buildDripUnsubscribeHeaders(args: {
  unsubscribeUrl: string;
  mailbox: string;
}): Record<string, string> {
  return {
    "List-Unsubscribe": `<${args.unsubscribeUrl}>, <mailto:${args.mailbox}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function readResendMessageId(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { id?: unknown } | null;
    return typeof body?.id === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(body.id) ? body.id : null;
  } catch {
    return null;
  }
}

/** A failed read is unavailable, never permission to send. */
export async function isDripEmailSuppressed(admin: SupabaseClient, emailHash: string): Promise<boolean> {
  try {
    const { data, error } = await admin.from("email_suppressions")
      .select("email_hash").eq("email_hash", emailHash).maybeSingle();
    if (error) throw new Error("suppression read failed");
    return Boolean(data);
  } catch {
    report("suppression check unavailable; sending blocked");
    throw new Error("Drip suppression unavailable");
  }
}

async function cancelProviderMessage(resendId: string, apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const url = `${RESEND_API}/emails/${encodeURIComponent(resendId)}`;
    const response = await fetch(`${url}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return true;
    // A retry after a successful cancel can be rejected as invalid state.
    // Only provider evidence of cancellation makes that terminal. In particular,
    // authentication errors, throttling and missing IDs must remain retryable.
    if (response.status === 400 || response.status === 409) {
      const state = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (state.ok) {
        const body = await state.json() as { last_event?: string };
        if (body.last_event === "canceled") return true;
      }
    }
    report("provider cancellation failed", { status: response.status });
  } catch {
    report("provider cancellation unavailable");
  }
  return false;
}

async function markCancelled(admin: SupabaseClient, resendId: string): Promise<boolean> {
  try {
    const { error } = await admin.from("email_drip_schedules")
      .update({ cancelled_at: new Date().toISOString() }).eq("resend_id", resendId);
    if (error) throw new Error("cancellation update failed");
    return true;
  } catch {
    report("cancellation bookkeeping failed");
    return false;
  }
}

/** Record every accepted ID, then check suppression again. If unsubscribe
 * committed before the insert, this check cancels the racing send. If it
 * commits after the insert, the unsubscribe handler can see the row itself.
 * On a database failure, cancel the known future message and stop the sequence.
 */
export async function recordDripSchedule(admin: SupabaseClient, args: {
  emailHash: string;
  surface: DripSurface;
  resendId: string;
  scheduledAt: string | null;
  apiKey: string;
}): Promise<"recorded" | "suppressed"> {
  let recorded = false;
  try {
    const { error } = await admin.from("email_drip_schedules").insert({
      email_hash: args.emailHash,
      surface: args.surface,
      resend_id: args.resendId,
      scheduled_at: args.scheduledAt,
    });
    if (error) throw new Error("schedule insert failed");
    recorded = true;
    if (!await isDripEmailSuppressed(admin, args.emailHash)) return "recorded";
  } catch {
    report("schedule persistence or suppression check failed", { surface: args.surface });
    if (args.scheduledAt) {
      const cancelled = await cancelProviderMessage(args.resendId, args.apiKey);
      if (cancelled && recorded) await markCancelled(admin, args.resendId);
      if (!cancelled) report("untracked or unchecked message needs cancellation", { resendId: args.resendId });
    }
    throw new Error("Drip schedule could not be safely recorded");
  }
  if (args.scheduledAt) {
    if (!await cancelProviderMessage(args.resendId, args.apiKey) ||
        !await markCancelled(admin, args.resendId)) {
      report("racing enrolment cancellation incomplete");
      throw new Error("Drip cancellation incomplete");
    }
  }
  return "suppressed";
}

export type DripSuppressionResult = {
  suppressed: boolean;
  cancelled: number;
  /** Includes inability to list/update queued sends, not only provider errors. */
  failed: number;
};

export async function suppressDripEmail(
  admin: SupabaseClient,
  emailHash: string,
  resendApiKey: string | null,
): Promise<DripSuppressionResult> {
  if (!isDripEmailHash(emailHash)) return { suppressed: false, cancelled: 0, failed: 1 };
  try {
    const { error } = await admin.from("email_suppressions").upsert(
      { email_hash: emailHash, source: "unsubscribe-link" },
      { onConflict: "email_hash", ignoreDuplicates: true },
    );
    if (error) throw new Error("suppression insert failed");
  } catch {
    report("could not persist suppression");
    return { suppressed: false, cancelled: 0, failed: 1 };
  }

  let pending: Array<{ resend_id: string }>;
  try {
    const { data, error } = await admin.from("email_drip_schedules")
      .select("resend_id").eq("email_hash", emailHash).is("cancelled_at", null)
      .gt("scheduled_at", new Date().toISOString());
    if (error) throw new Error("pending sends query failed");
    pending = data ?? [];
  } catch {
    report("could not list queued sends");
    return { suppressed: true, cancelled: 0, failed: 1 };
  }

  let cancelled = 0;
  let failed = 0;
  for (const row of pending) {
    if (await cancelProviderMessage(row.resend_id, resendApiKey) &&
        await markCancelled(admin, row.resend_id)) cancelled += 1;
    else failed += 1;
  }
  if (failed) report("queued cancellation incomplete", { failed, cancelled, resendConfigured: Boolean(resendApiKey) });
  return { suppressed: true, cancelled, failed };
}
