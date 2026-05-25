/**
 * POST /api/email/send-test
 *
 * Sends a single test email to a specified address (default: the
 * admin's logged-in email). Used by the admin preview page to verify
 * the email looks right in a real inbox before the cron sends it to
 * the full audience.
 *
 * Auth: admin-only via lib/admin-guard.ts (Supabase session cookie).
 *
 * Body:
 *   { date: "YYYY-MM-DD", to?: "..." }
 *
 * Returns:
 *   { ok: true, id?: string } on success
 *   { ok: false, message: string } on failure
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/admin-guard";
import { loadContent, renderWeeklyDigest } from "@/lib/email/render-weekly";

const inputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  to: z.string().email().optional(),
});

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "TrueCap <hello@usetruecap.com>";

export async function POST(request: Request) {
  const admin = await checkAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: admin.reason === "UNAUTHENTICATED" ? 401 : 403 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "RESEND_API_KEY is not set in Vercel." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const recipient = parsed.data.to ?? admin.email;
  const content = await loadContent(parsed.data.date);
  if (!content) {
    return NextResponse.json(
      { ok: false, message: `No content file found for ${parsed.data.date}.` },
      { status: 404 }
    );
  }

  const { html, text, subject } = await renderWeeklyDigest(content, {
    // For test sends we use a clearly-placeholder unsubscribe URL so
    // an accidental click doesn't unsubscribe the admin from the
    // real audience.
    unsubscribeUrl: "https://usetruecap.com#test-send-unsubscribe-placeholder",
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: `[TEST] ${subject}`,
        html,
        text,
        tags: [{ name: "purpose", value: "admin-test-send" }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const respBody = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok) {
      console.error("[send-test] Resend returned", response.status, respBody);
      return NextResponse.json(
        {
          ok: false,
          message: respBody.message ?? `Resend returned ${response.status}.`,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, id: respBody.id });
  } catch (error) {
    console.error("[send-test] Network error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Network error.",
      },
      { status: 502 }
    );
  }
}
