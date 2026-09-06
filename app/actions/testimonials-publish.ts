"use server";

/**
 * Consented-testimonial pipeline (docs/site-overhaul.md Phase 5).
 *
 *   claimTestimonialPromptAction   — the prompt may show ONCE per user, ever
 *   submitPublishableTestimonialAction — stores the sentence + consent;
 *                                        publication happens 24h+ later by
 *                                        the publish cron if every rule holds
 *   dismissTestimonialPromptAction — "never ask again"
 *
 * Signed-in users only: the eligibility rules (saved deals, exported
 * reports, demo-account exclusion) all key on the account.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QUOTE_MAX, TESTIMONIAL_ROLES } from "@/lib/testimonials/rules";
import {
  claimTestimonialPrompt,
  dismissTestimonialPromptForever,
  submitTestimonial,
  type PromptTrigger,
} from "@/lib/testimonials/store";

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

const triggerSchema = z.enum(["pdf_export", "third_save", "email_link"]);

export type ClaimPromptResult = { show: boolean; reason?: "signed_out" | "already_shown" | "unavailable" };

export async function claimTestimonialPromptAction(input: unknown): Promise<ClaimPromptResult> {
  const trigger = triggerSchema.safeParse(input);
  if (!trigger.success) return { show: false, reason: "unavailable" };
  const userId = await currentUserId();
  if (!userId) return { show: false, reason: "signed_out" };
  try {
    const outcome = await claimTestimonialPrompt(createAdminSupabaseClient(), userId, trigger.data);
    if (outcome === "claimed") return { show: true };
    return { show: false, reason: outcome };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials", stage: "claim-prompt" } });
    return { show: false, reason: "unavailable" };
  }
}

const submitSchema = z
  .object({
    quote: z.string().trim().min(1).max(QUOTE_MAX * 2),
    role: z.enum(TESTIMONIAL_ROLES as [string, ...string[]]).optional(),
    market: z.string().trim().max(80).optional(),
    consent: z.boolean(),
    trigger: triggerSchema,
    /** Honeypot — real users never fill this. */
    website: z.string().max(200).optional(),
  })
  .strict();

export type SubmitPublishableTestimonialResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "VALIDATION_ERROR" | "ALREADY_SUBMITTED" | "UNAVAILABLE" | "SERVER_ERROR";
      message: string;
    };

const REASON_MESSAGES: Record<string, string> = {
  too_short: "A little more, please — at least 40 characters.",
  too_long: "Please keep it under 280 characters.",
  contains_url: "Please leave links out of the sentence.",
  contains_email: "Please leave email addresses out of the sentence.",
  contains_phone: "Please leave phone numbers out of the sentence.",
  profanity: "Please rephrase that sentence.",
  invalid_role: "Please pick a role from the list.",
};

export async function submitPublishableTestimonialAction(
  input: unknown,
): Promise<SubmitPublishableTestimonialResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Please check your answer and try again." };
  }
  if (parsed.data.website) return { ok: true }; // honeypot: pretend, store nothing
  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Sign in to send your note." };
  }
  try {
    const result = await submitTestimonial(createAdminSupabaseClient(), {
      userId,
      quote: parsed.data.quote,
      role: (parsed.data.role as (typeof TESTIMONIAL_ROLES)[number] | undefined) ?? null,
      market: parsed.data.market ?? null,
      consent: parsed.data.consent,
      trigger: parsed.data.trigger as PromptTrigger,
    });
    if (result.ok) return { ok: true };
    if (result.reason === "already_submitted") {
      return { ok: false, code: "ALREADY_SUBMITTED", message: "Thanks — we already have your note." };
    }
    if (result.reason === "unavailable") {
      return { ok: false, code: "UNAVAILABLE", message: "Feedback isn't available right now." };
    }
    return { ok: false, code: "VALIDATION_ERROR", message: REASON_MESSAGES[result.reason] ?? "Please check your answer." };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials", stage: "submit" } });
    return { ok: false, code: "SERVER_ERROR", message: "Could not save your note right now. Please try again." };
  }
}

export async function dismissTestimonialPromptAction(): Promise<{ ok: true }> {
  const userId = await currentUserId();
  if (!userId) return { ok: true };
  try {
    await dismissTestimonialPromptForever(createAdminSupabaseClient(), userId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "testimonials", stage: "dismiss" } });
  }
  return { ok: true };
}
