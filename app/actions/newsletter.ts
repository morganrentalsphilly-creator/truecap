"use server";

import { captureServerEvent } from "@/lib/posthog-server";

/**
 * Newsletter subscription server action.
 *
 * POSTs to the Resend Audiences API to add the email as a contact in
 * the configured TrueCap newsletter audience. Resend handles the
 * actual newsletter delivery + unsubscribe management on their end —
 * we just collect the email and hand it off.
 *
 * Required env vars (set in Vercel project settings):
 *   - RESEND_API_KEY: your Resend secret key (starts with `re_`)
 *   - RESEND_AUDIENCE_ID: the UUID of the audience you created
 *
 * If either env var is missing, the action returns a generic SERVER_ERROR
 * so visitors never see internal config issues. The error is logged
 * server-side so you can diagnose from Vercel logs.
 *
 * Defensive against duplicates: Resend returns 200/201 on re-subscribe
 * (treats it as idempotent). We surface a friendly "you're already
 * subscribed" message either way so users aren't confused.
 */

import { z } from "zod";

const inputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Enter a valid email")
    .max(320, "That email looks too long")
    .email("Enter a valid email"),
  /** Origin of the signup — useful later when we want to segment
   *  campaigns by which surface drove the conversion. Optional. */
  source: z.enum(["footer", "blog", "homepage", "other"]).optional(),
});

export type NewsletterSubscribeInput = z.infer<typeof inputSchema>;

export type NewsletterSubscribeResult =
  | { ok: true; message: string }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "ALREADY_SUBSCRIBED" | "SERVER_ERROR" | "NOT_CONFIGURED";
      message: string;
    };

/** Resend's Audiences API endpoint shape. */
type ResendContactResponse = {
  id?: string;
  email?: string;
  /** Resend returns the error in `{ statusCode, name, message }` shape on failure. */
  statusCode?: number;
  name?: string;
  message?: string;
};

export async function subscribeToNewsletterAction(
  input: unknown
): Promise<NewsletterSubscribeResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    // Don't expose internal config state — log + return generic error.
    console.error(
      "[newsletter] Missing env vars — RESEND_API_KEY=%s, RESEND_AUDIENCE_ID=%s",
      apiKey ? "set" : "missing",
      audienceId ? "set" : "missing"
    );
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Newsletter signup is temporarily unavailable. Try again in a few minutes.",
    };
  }

  try {
    const response = await fetch(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parsed.data.email,
          unsubscribed: false,
        }),
        // Don't let a slow Resend response block the user — 6s is
        // very generous; their API is usually <1s.
        signal: AbortSignal.timeout(6000),
      }
    );

    const body = (await response.json().catch(() => ({}))) as ResendContactResponse;

    // 200/201 = created. Resend returns 200 even on "already exists"
    // in some cases (treats POST as upsert).
    if (response.ok) {
      await captureServerEvent({
        distinctId: parsed.data.email,
        event: "newsletter_subscribed",
        properties: { source: parsed.data.source ?? "other" },
      });
      return {
        ok: true,
        message: "You're in. Check your inbox for a welcome.",
      };
    }

    // 422 typically means "validation failed" — usually a malformed
    // email that slipped past zod, or the audience doesn't exist.
    if (response.status === 422) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: body.message ?? "That email didn't work. Try a different address.",
      };
    }

    // 409 = already subscribed. Surface as success-ish so user isn't
    // alarmed.
    if (response.status === 409) {
      return {
        ok: true,
        message: "You're already subscribed — thanks for the second time!",
      };
    }

    // Any other non-OK: log and return generic error.
    console.error(
      "[newsletter] Resend API returned %d: %s",
      response.status,
      body.message ?? "(no message)"
    );
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "We hit a snag. Try again in a moment.",
    };
  } catch (error) {
    // Network error, timeout, etc.
    console.error("[newsletter] Network/timeout error:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "We couldn't reach our email service. Try again in a moment.",
    };
  }
}
