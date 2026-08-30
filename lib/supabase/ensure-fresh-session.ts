"use client";

/**
 * Ensure the browser Supabase session is fresh enough to make a direct
 * storage/API call, refreshing it when it isn't.
 *
 * Why: browser-side storage calls (deal documents, avatars) authenticate with
 * the CLIENT's in-memory JWT — not the server cookies that keep server actions
 * working. In a long-open or multi-tab session the client token can lapse or
 * belong to an account that changed in another tab, producing the confusing
 * split where a server action works while a direct Storage request is denied.
 *
 * `getFreshSessionUserId` returns the server-verified user id after (at most)
 * one refresh attempt. Storage paths must be built from that value rather than
 * a user id captured when a long-lived card first mounted: another tab can
 * sign out or switch accounts while this one remains open.
 *
 * `ensureFreshSession` remains as the boolean compatibility wrapper used by
 * uploaders that do not construct an owner-scoped object path.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPIRY_MARGIN_MS = 30_000;

export async function getFreshSessionUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return null;
    let session = data.session;
    if (session && (session.expires_at ?? 0) * 1000 > Date.now() + EXPIRY_MARGIN_MS) {
      // Continue to getUser below. getSession reads browser storage and must
      // not be the authority for the identity embedded in an RLS object path.
    } else {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) return null;
      session = refreshed.session;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || user.id !== session.user.id) return null;
    return user.id;
  } catch {
    return null;
  }
}

export async function ensureFreshSession(supabase: SupabaseClient): Promise<boolean> {
  return Boolean(await getFreshSessionUserId(supabase));
}
