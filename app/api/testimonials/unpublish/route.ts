/**
 * /api/testimonials/unpublish?token=<unpublish_token>
 * The founder's veto: the emailed/logged link opens a one-button confirmation
 * page (GET, no side effects), and the button POSTs the same token to take the
 * quote down. The token is the row's own 48-hex capability secret (never
 * guessable, service-role readable only), so no session is required.
 *
 * GET must stay side-effect free: mail-client link prefetchers, link scanners,
 * and browser prerendering all issue GETs, and any of them would otherwise
 * unpublish the quote the moment the link was delivered.
 */
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { unpublishTestimonialByToken } from "@/lib/testimonials/store";

export const runtime = "nodejs";

const TOKEN_RE = /^[a-f0-9]{48}$/;
const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;
}

function readToken(value: FormDataEntryValue | string | null): string {
  return typeof value === "string" && TOKEN_RE.test(value) ? value : "";
}

export async function GET(request: Request) {
  const token = readToken(new URL(request.url).searchParams.get("token"));
  if (!token) {
    return new NextResponse(page("Unpublish quote", "<p>No published quote matches this link.</p>"), {
      status: 404,
      headers: HTML_HEADERS,
    });
  }
  return new NextResponse(
    page(
      "Unpublish quote",
      `<h1 style="font-size:1.25rem">Take this quote down?</h1><p>The quote stops appearing on the site immediately. Nothing is deleted; the row keeps its history.</p><form method="post" action="/api/testimonials/unpublish"><input type="hidden" name="token" value="${token}"><button type="submit" style="font:inherit;padding:.5rem 1rem">Unpublish this quote</button></form>`,
    ),
    { status: 200, headers: HTML_HEADERS },
  );
}

export async function POST(request: Request) {
  let token = "";
  try {
    const form = await request.formData();
    token = readToken(form.get("token"));
  } catch {
    token = "";
  }
  if (!token) token = readToken(new URL(request.url).searchParams.get("token"));
  try {
    const outcome = await unpublishTestimonialByToken(createAdminSupabaseClient(), token);
    const body =
      outcome === "unpublished"
        ? "This quote is no longer published."
        : outcome === "already_unpublished"
          ? "This quote was already unpublished."
          : "No published quote matches this link.";
    return new NextResponse(page("Unpublish quote", `<p>${body}</p>`), {
      status: outcome === "not_found" ? 404 : 200,
      headers: HTML_HEADERS,
    });
  } catch {
    return new NextResponse(page("Unpublish quote", "<p>Could not process this link right now.</p>"), {
      status: 500,
      headers: HTML_HEADERS,
    });
  }
}
