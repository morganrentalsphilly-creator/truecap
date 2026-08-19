import "server-only";

/**
 * Best-effort per-IP limiter for UNAUTHENTICATED server actions.
 *
 * WHY THIS EXISTS: a Next.js Server Action id ships in the public client
 * bundle, so any anonymous action is a callable HTTP endpoint the moment the
 * page loads — no cookie, no UI, no CSRF token required. Actions that write a
 * row or call a paid third-party API therefore need a brake even when they
 * are "just the share button".
 *
 * DELIBERATELY IN-MEMORY, per serverless instance. It is a cost/abuse brake,
 * not an authorization control:
 *   - Worst case under instance churn or a distributed caller is a multiple
 *     of the cap, not an unbounded flood.
 *   - It never blocks a legitimate user: the caps are far above human pace.
 *   - Anything needing a real guarantee (the email send budget) already uses
 *     the durable Postgres guard in lib/email-capture-guard.ts instead.
 *
 * Extracted from the copy in app/actions/capture-deal-lead.ts, which proved
 * the shape; that file's own limiter is left alone so its tuning stays local.
 */

export type IpRateLimit = {
  /** True when this IP has exceeded the cap inside the current window. */
  isOverLimit: (ip: string) => boolean;
};

export function createIpRateLimit({
  windowMs,
  maxPerWindow,
  maxTrackedIps = 5000,
}: {
  windowMs: number;
  maxPerWindow: number;
  maxTrackedIps?: number;
}): IpRateLimit {
  const buckets = new Map<string, { windowStart: number; count: number }>();

  return {
    isOverLimit(ip: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(ip);
      if (!bucket || now - bucket.windowStart > windowMs) {
        buckets.set(ip, { windowStart: now, count: 1 });
        return false;
      }
      bucket.count += 1;
      // Opportunistic sweep so a long-lived instance can't grow unbounded.
      if (buckets.size > maxTrackedIps) {
        for (const [key, value] of buckets) {
          if (now - value.windowStart > windowMs) buckets.delete(key);
        }
      }
      return bucket.count > maxPerWindow;
    },
  };
}

/**
 * Caller IP from the proxy headers, or a shared fallback key.
 *
 * The fallback deliberately collapses unknown callers into ONE bucket: if we
 * cannot tell requests apart, they should share an allowance rather than each
 * receive a fresh one.
 */
export async function getRequestIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    // headers() unavailable outside a request scope.
    return "unknown";
  }
}
