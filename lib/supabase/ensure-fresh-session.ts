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
 * `getFreshSessionUser` returns the server-verified user id after (at most) one
 * refresh attempt, or a typed failure that distinguishes a real sign-out from
 * an account switch or a temporary verification failure. Storage paths must be
 * built only from the successful result rather than a user id captured when a
 * long-lived card first mounted.
 *
 * The older nullable/boolean exports remain compatibility wrappers. New
 * browser mutations must use the discriminated result so a transient outage
 * is never presented as a sign-out.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPIRY_MARGIN_MS = 30_000;

export type FreshSessionVerificationStep =
  | "get-session"
  | "refresh-session"
  | "get-user";

/**
 * A telemetry-safe wrapper for an unexpected Supabase Auth failure. It keeps
 * only bounded machine fields and deliberately omits the upstream message,
 * URL, token, and response body so callers can report it without customer
 * data. Its stable message also avoids the global browser-network ignore list.
 */
export class FreshSessionVerificationError extends Error {
  readonly step: FreshSessionVerificationStep;
  readonly upstreamName?: string;
  readonly upstreamCode?: string;
  readonly upstreamStatus?: number;

  constructor(step: FreshSessionVerificationStep, upstream: unknown) {
    super(`Browser session verification unavailable during ${step}.`);
    this.name = "FreshSessionVerificationError";
    this.step = step;

    if (!upstream || typeof upstream !== "object") return;
    const record = upstream as Record<string, unknown>;
    this.upstreamName = safeMachineToken(record.name);
    this.upstreamCode = safeMachineToken(record.code);
    this.upstreamStatus = safeHttpStatus(record.status);
  }
}

export type FreshSessionUserResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "signed_out" }
  | { ok: false; reason: "identity_mismatch" }
  | {
      ok: false;
      reason: "unavailable";
      error: FreshSessionVerificationError;
    };

function safeMachineToken(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(value)) {
    return undefined;
  }
  return value;
}

function safeHttpStatus(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}

function isSignedOutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const name = safeMachineToken(record.name);
  const code = safeMachineToken(record.code);
  return (
    name === "AuthSessionMissingError" ||
    code === "session_not_found" ||
    code === "refresh_token_not_found"
  );
}

function unavailable(
  step: FreshSessionVerificationStep,
  error: unknown,
): FreshSessionUserResult {
  return {
    ok: false,
    reason: "unavailable",
    error: new FreshSessionVerificationError(step, error),
  };
}

export async function getFreshSessionUser(
  supabase: SupabaseClient,
): Promise<FreshSessionUserResult> {
  let step: FreshSessionVerificationStep = "get-session";
  try {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return isSignedOutError(sessionError)
        ? { ok: false, reason: "signed_out" }
        : unavailable(step, sessionError);
    }
    let session = data.session;
    if (session && (session.expires_at ?? 0) * 1000 > Date.now() + EXPIRY_MARGIN_MS) {
      // Continue to getUser below. getSession reads browser storage and must
      // not be the authority for the identity embedded in an RLS object path.
    } else {
      step = "refresh-session";
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error) {
        return isSignedOutError(error)
          ? { ok: false, reason: "signed_out" }
          : unavailable(step, error);
      }
      if (!refreshed.session) return { ok: false, reason: "signed_out" };
      session = refreshed.session;
    }

    step = "get-user";
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      return isSignedOutError(userError)
        ? { ok: false, reason: "signed_out" }
        : unavailable(step, userError);
    }
    if (!user) return { ok: false, reason: "signed_out" };
    if (user.id !== session.user.id) {
      return { ok: false, reason: "identity_mismatch" };
    }
    return { ok: true, userId: user.id };
  } catch (error) {
    return unavailable(step, error);
  }
}

export async function getFreshSessionUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const result = await getFreshSessionUser(supabase);
  return result.ok ? result.userId : null;
}

export async function ensureFreshSession(supabase: SupabaseClient): Promise<boolean> {
  const result = await getFreshSessionUser(supabase);
  return result.ok;
}
