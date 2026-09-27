import "server-only";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import {
  FIRST_TOUCH_REFERRAL_SOURCES,
  LANDING_SECTIONS,
  splitFirstTouchCookie,
  type FirstTouch,
} from "@/lib/first-touch";

/**
 * Server half of first-touch attribution (see lib/first-touch.ts): validate
 * the consent-gated `tc_ft` cookie and persist it once to the account's
 * app_metadata, which only the service role can write (user_metadata is
 * editable by the account holder through `auth.updateUser`).
 */

export const firstTouchCookieSchema = z
  .object({
    source: z.enum(FIRST_TOUCH_REFERRAL_SOURCES),
    section: z.enum(LANDING_SECTIONS),
  })
  .strict();

/** The validated `tc_ft` value, or null for anything that is not two enum tokens. */
export function parseFirstTouchCookieValue(raw: unknown): FirstTouch | null {
  const parts = splitFirstTouchCookie(raw);
  if (!parts) return null;
  const parsed = firstTouchCookieSchema.safeParse(parts);
  return parsed.success ? parsed.data : null;
}

export type StoredFirstTouch = FirstTouch & { v: 1 };

/** The subset of the service-role client this module uses (mockable). */
export type FirstTouchAdminClient = {
  auth: {
    admin: {
      updateUserById(
        uid: string,
        attributes: { app_metadata: Record<string, unknown> },
      ): Promise<{ error: unknown }>;
    };
  };
};

/**
 * Write `app_metadata.tc_first_touch = { source, section, v: 1 }` unless the
 * account already has one (first touch wins, so a replayed callback or a
 * repeat sign-up of an unconfirmed address never rewrites it). The existing
 * app_metadata is spread back so `provider`/`providers` survive whether the
 * Auth API merges or replaces the object. Throws on an Auth API error; the
 * callers catch it, because attribution must never fail a sign-up.
 */
export async function persistFirstTouch(input: {
  admin: FirstTouchAdminClient;
  user: { id: string; app_metadata?: Record<string, unknown> | null };
  firstTouch: FirstTouch;
}): Promise<"written" | "exists"> {
  const existing = input.user.app_metadata ?? {};
  if (existing.tc_first_touch) return "exists";
  const tcFirstTouch: StoredFirstTouch = {
    source: input.firstTouch.source,
    section: input.firstTouch.section,
    v: 1,
  };
  const { error } = await input.admin.auth.admin.updateUserById(input.user.id, {
    app_metadata: { ...existing, tc_first_touch: tcFirstTouch },
  });
  if (error) throw error;
  return "written";
}

/** Short, non-identifying failure detail (an Auth error code or HTTP status). */
function failureReason(error: unknown): string {
  if (error && typeof error === "object") {
    const { code, status, name } = error as Record<string, unknown>;
    if (typeof code === "string" && /^[a-z0-9_]{1,64}$/i.test(code)) return code;
    if (typeof status === "number") return `status_${status}`;
    if (typeof name === "string" && /^[A-Za-z]{1,64}$/.test(name)) return name;
  }
  return "unknown";
}

/**
 * Report a failed attribution write. No user id, email or cookie value is
 * attached: the path and a coarse reason are enough to notice a broken key.
 */
export function reportFirstTouchFailure(
  path: "email_signup" | "google_callback",
  error: unknown,
): void {
  try {
    Sentry.captureMessage("first-touch attribution write failed", {
      level: "warning",
      tags: { feature: "first-touch-attribution", path },
      extra: { reason: failureReason(error) },
    });
  } catch {
    /* reporting must never throw into the auth flow */
  }
}
