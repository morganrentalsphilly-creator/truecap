"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const reviewSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["new", "reviewed", "rejected"]),
    verificationStatus: z.enum([
      "unverified",
      "pending",
      "verified",
      "rejected",
    ]),
    publicationStatus: z.enum([
      "private",
      "pending_approval",
      "approved",
      "rejected",
      "revoked",
    ]),
    administrativeNotes: z.string().trim().max(4000),
  })
  .strict();

export type TestimonialReviewResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateTestimonialReviewAction(
  input: unknown,
): Promise<TestimonialReviewResult> {
  const adminCheck = await checkAdmin();
  if (!adminCheck.ok) return { ok: false, message: "Not authorized." };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the review fields.",
    };
  }

  const admin = createAdminSupabaseClient();
  const { data: current, error: readError } = await admin
    .from("permissioned_testimonial_submissions")
    .select(
      "quote, consent_to_publish, permission_granted_at, display_name, preferred_display_name_format, approved_at, withdrawn_at, publication_status",
    )
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Could not load this submission." };
  }
  if (current.withdrawn_at && parsed.data.publicationStatus !== "revoked") {
    return {
      ok: false,
      message: "A withdrawn submission cannot be re-approved.",
    };
  }
  if (
    parsed.data.publicationStatus === "approved" &&
    (!current.quote?.trim() ||
      current.consent_to_publish !== true ||
      !current.permission_granted_at ||
      parsed.data.verificationStatus !== "verified")
  ) {
    return {
      ok: false,
      message:
        "Approval requires a real quote, timestamped publication permission, and verification. Do not fabricate a quote or permission date.",
    };
  }
  if (
    parsed.data.publicationStatus === "approved" &&
    current.preferred_display_name_format !== "anonymous" &&
    !current.display_name?.trim()
  ) {
    return {
      ok: false,
      message:
        "Approval requires a display name for the submitter's selected format.",
    };
  }

  const now = new Date().toISOString();
  const publicationStatus = parsed.data.publicationStatus;
  let update = admin
    .from("permissioned_testimonial_submissions")
    .update({
      status: parsed.data.status,
      verification_status: parsed.data.verificationStatus,
      publication_status: publicationStatus,
      approved_at:
        publicationStatus === "approved"
          ? (current.approved_at ?? now)
          : current.approved_at,
      withdrawn_at:
        publicationStatus === "revoked" ? (current.withdrawn_at ?? now) : null,
      administrative_notes: parsed.data.administrativeNotes || null,
      reviewed_at: now,
    })
    .eq("id", parsed.data.id);
  // A withdrawal that lands after the read above must still win. This
  // conditional turns the update into a compare-and-set for every non-revoke
  // transition instead of allowing a stale admin tab to clear withdrawn_at.
  if (publicationStatus !== "revoked") {
    update = update.is("withdrawn_at", null);
  }
  const { data: updated, error } = await update.select("id").maybeSingle();

  if (error) {
    Sentry.captureMessage("Testimonial review update failed", {
      level: "error",
      tags: { feature: "testimonials", stage: "admin-review" },
      extra: { database_code: error.code ?? "unknown" },
    });
    return { ok: false, message: "Could not save this review." };
  }
  if (!updated) {
    return {
      ok: false,
      message:
        "This submission was withdrawn or changed while you were reviewing it. Reload before continuing.",
    };
  }

  revalidatePath("/admin/testimonials");
  return { ok: true };
}
