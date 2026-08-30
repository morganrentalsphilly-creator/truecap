"use server";

/**
 * Testimonial submission (2026-08-17 offer rollout).
 *
 * Receives the one-question prompt's answer after a high-signal moment
 * (PDF export, third saved deal). Submissions are STORED ONLY in the separate
 * permissioned_testimonial_submissions workflow — private, unapproved, and
 * service-role-only — and never render anywhere until Morgan reviews one and
 * deliberately promotes it into
 * lib/proof-records.ts with verification + customer approval.
 *
 * Anonymous submissions are allowed for a report buyer without an account,
 * but the database RPC atomically limits a keyed HMAC bucket. Raw IPs are
 * never stored. Intake remains disabled unless the typed rollout flag is on.
 */

import { z } from "zod";
import { createHmac } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getRequestIp } from "@/lib/ip-rate-limit";

const submissionSchema = z
  .object({
    quote: z
      .string()
      .trim()
      .max(1000)
      .refine(
        (value) => value.length === 0 || value.length >= 10,
        "Please write at least 10 characters, or leave the quote blank.",
      )
      .optional(),
    displayName: z.string().trim().max(120).optional(),
    preferredDisplayNameFormat: z
      .enum(["full_name", "first_name_last_initial", "initials", "anonymous"])
      .default("anonymous"),
    roleSegment: z
      .enum(["investor", "house_hacker", "agent", "other"])
      .optional(),
    consentToPublish: z.boolean(),
    sourceEvent: z.enum(["pdf_export", "third_save", "manual"]),
    /** Honeypot — real users never fill this. */
    website: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.preferredDisplayNameFormat !== "anonymous" &&
      !value.displayName?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["displayName"],
        message: "Add the name you want us to use, or choose Anonymous.",
      });
    }
  });

export type TestimonialSubmissionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "FEATURE_DISABLED"
        | "VALIDATION_ERROR"
        | "RATE_LIMITED"
        | "SERVER_ERROR";
      message: string;
    };

function buildRateLimitKey(subject: string): string | null {
  // This key has one purpose and one rotation boundary. Reusing the Supabase
  // service-role credential would turn every stored rate-limit digest into a
  // verifier for a much more privileged secret. Intake fails closed instead.
  const secret = process.env.TESTIMONIAL_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret).update(subject).digest("hex");
}

export async function submitTestimonialAction(
  input: unknown,
): Promise<TestimonialSubmissionResult> {
  if (!isFeatureEnabled("testimonial_collection")) {
    return {
      ok: false,
      code: "FEATURE_DISABLED",
      message: "Customer feedback collection is not available right now.",
    };
  }
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ??
        "Please check your answer and retry.",
    };
  }
  // Honeypot filled → pretend success, store nothing.
  if (parsed.data.website) return { ok: true };

  try {
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const requestSubject = userId
      ? `user:${userId}`
      : `ip:${await getRequestIp()}`;
    const rateLimitKey = buildRateLimitKey(requestSubject);
    if (!rateLimitKey) {
      Sentry.captureMessage("Testimonial rate-limit secret unavailable", {
        level: "error",
        tags: { feature: "testimonials", stage: "rate-limit-config" },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save your note right now. Please try again.",
      };
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.rpc(
      "submit_permissioned_testimonial_submission",
      {
        p_user_id: userId,
        p_rate_limit_key: rateLimitKey,
        p_window_seconds: userId ? 14 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
        p_quote: parsed.data.quote?.trim() || null,
        p_display_name: parsed.data.displayName?.trim() || null,
        p_display_name_format: parsed.data.preferredDisplayNameFormat,
        p_role_segment: parsed.data.roleSegment ?? null,
        p_consent_to_publish: parsed.data.consentToPublish,
        p_source_event: parsed.data.sourceEvent,
      },
    );
    if (error) {
      Sentry.captureMessage("Testimonial submission insert failed", {
        level: "error",
        tags: { feature: "testimonials", stage: "insert" },
        extra: { database_code: error.code ?? "unknown" },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save your note right now. Please try again.",
      };
    }
    if (data === "rate_limited") {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Thanks — we already have your recent note.",
      };
    }
    if (data !== "created") {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save your note right now. Please try again.",
      };
    }
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials" } });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not save your note right now. Please try again.",
    };
  }
}
