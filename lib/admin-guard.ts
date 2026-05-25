/**
 * Admin guard utility — used by /admin/* pages and /api/email/* endpoints.
 *
 * Single source of truth for "is this request from an admin?" so we
 * don't sprinkle the email check across multiple files.
 *
 * Admins are defined by env var `ADMIN_EMAILS` — a comma-separated
 * list of emails (case-insensitive match). Falls back to the founder
 * email if the env var isn't set (defense in depth so a misconfigured
 * env doesn't accidentally expose admin endpoints to the public).
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";

const FOUNDER_EMAIL_FALLBACK = "morganrentalsphilly@gmail.com";

function adminEmailSet(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) {
    return new Set(fromEnv);
  }
  return new Set([FOUNDER_EMAIL_FALLBACK]);
}

export type AdminCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" };

/** Check the current request's Supabase session and verify it's an admin. */
export async function checkAdmin(): Promise<AdminCheckResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }
  const email = (user.email ?? "").toLowerCase();
  if (!adminEmailSet().has(email)) {
    return { ok: false, reason: "FORBIDDEN" };
  }
  return { ok: true, email };
}
