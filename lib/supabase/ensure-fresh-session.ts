"use client";

/**
 * Ensure the browser Supabase session is fresh enough to make a direct
 * storage/API call, refreshing it when it isn't.
 *
 * Why: browser-side storage calls (deal documents, avatars) authenticate with
 * the CLIENT's in-memory JWT — not the server cookies that keep server actions
 * working. In a long-open tab the client token can silently lapse (the
 * multi-tab Web Locks contention in our own Sentry ignore list starves the
 * auto-refresh), producing the confusing split where notes save fine while
 * every upload dies with an RLS "you don't have access" toast.
 *
 * Returns true when a usable session exists after (at most) one refresh
 * attempt. Callers show a clear "sign in again" message on false instead of a
 * misleading permissions error.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPIRY_MARGIN_MS = 30_000;

export async function ensureFreshSession(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session && (session.expires_at ?? 0) * 1000 > Date.now() + EXPIRY_MARGIN_MS) {
      return true;
    }
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    return !error && Boolean(refreshed.session);
  } catch {
    return false;
  }
}
