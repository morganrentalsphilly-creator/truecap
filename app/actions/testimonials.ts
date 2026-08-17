"use server";

/**
 * Testimonial submission (2026-08-17 offer rollout).
 *
 * Receives the one-question prompt's answer after a high-signal moment
 * (PDF export, third saved deal). Submissions are STORED ONLY — status
 * 'new', service-role table with no RLS policies — and never render
 * anywhere until Morgan reviews one and promotes it into
 * lib/proof-records.ts with verification + customer approval.
 *
 * Anonymous submissions are allowed (a $5 Pack buyer has no account):
 * honeypot + length caps bound abuse, and authed users are deduped to one
 * submission per 14 days. This is feedback intake, not email capture, so it
 * deliberately does NOT draw from the email-capture-guard global budget.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const submissionSchema = z
  .object({
    quote: z.string().trim().min(10, "Tell us a sentence or two.").max(1000),
    displayName: z.string().trim().max(120).optional(),
    roleSegment: z.enum(["investor", "house_hacker", "agent", "other"]).optional(),
    consentToPublish: z.boolean(),
    sourceEvent: z.enum(["pdf_export", "third_save", "manual"]),
    /** Honeypot — real users never fill this. */
    website: z.string().max(0).optional(),
  })
  .strict();

export type TestimonialSubmissionResult =
  | { ok: true }
  | { ok: false; code: "VALIDATION_ERROR" | "RATE_LIMITED" | "SERVER_ERROR"; message: string };

export async function submitTestimonialAction(
  input: unknown
): Promise<TestimonialSubmissionResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Please check your answer and retry.",
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

    const admin = createAdminSupabaseClient();

    if (userId) {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("testimonial_submissions")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (recent) {
        return {
          ok: false,
          code: "RATE_LIMITED",
          message: "Thanks — we already have your recent note.",
        };
      }
    }

    const { error } = await admin.from("testimonial_submissions").insert({
      user_id: userId,
      quote: parsed.data.quote,
      display_name: parsed.data.displayName || null,
      role_segment: parsed.data.roleSegment ?? null,
      consent_to_publish: parsed.data.consentToPublish,
      source_event: parsed.data.sourceEvent,
    });
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
