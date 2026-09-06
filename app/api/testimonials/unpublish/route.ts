/**
 * GET /api/testimonials/unpublish?token=<unpublish_token>
 * The founder's veto: one click takes a published quote down. The token is
 * the row's own 48-hex capability secret (never guessable), so no session is
 * required. Idempotent.
 */
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { unpublishTestimonialByToken } from "@/lib/testimonials/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const outcome = await unpublishTestimonialByToken(createAdminSupabaseClient(), token);
    const body =
      outcome === "unpublished"
        ? "This quote is no longer published."
        : outcome === "already_unpublished"
          ? "This quote was already unpublished."
          : "No published quote matches this link.";
    return new NextResponse(body, {
      status: outcome === "not_found" ? 404 : 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  } catch {
    return new NextResponse("Could not process this link right now.", { status: 500 });
  }
}
