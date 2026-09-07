/**
 * Admin guard utility — used by /admin/* pages and /api/email/* endpoints.
 *
 * Single source of truth for "is this request from an admin?" so we
 * don't sprinkle the email check across multiple files.
 *
 * Admins are defined by env var `ADMIN_EMAILS` — a comma-separated
 * list of emails (case-insensitive match). With the variable unset there
 * are NO admins: every admin page and endpoint fails closed. (A hard-coded
 * fallback address used to live here; it was removed on 2026-09-07 so the
 * public repo carries no personal email. Set ADMIN_EMAILS in Vercel.)
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";

function adminEmailSet(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(fromEnv);
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
