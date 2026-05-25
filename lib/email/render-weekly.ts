/**
 * Shared utility for rendering the weekly digest email and looking up
 * content files from /emails/content/YYYY-MM-DD.json.
 *
 * Used by:
 *   - app/admin/email-preview/page.tsx (in-browser preview)
 *   - app/api/email/send-test/route.ts (test send)
 *   - app/api/cron/send-weekly-digest/route.ts (scheduled production send)
 *
 * Why all three share this module: render logic, content lookup, and
 * the "what is this week's Monday?" date math should be in one place.
 * Drift between preview and production-send would be a quiet
 * deliverability bug.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import WeeklyDigestEmail, {
  type WeeklyDigestContent,
} from "@/emails/weekly-digest";

const CONTENT_DIR = path.join(process.cwd(), "emails", "content");

/**
 * Return the ISO date string (YYYY-MM-DD) the cron is looking for.
 * Convention: filename = the UTC date the cron fires. The cron's
 * schedule (vercel.json) determines what day of the week this is.
 *
 * So if the cron is scheduled for Tuesdays, content files are named
 * `YYYY-MM-DD.json` for the Tuesday they should send.
 */
export function currentSendDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Legacy alias — kept for compatibility, returns same as currentSendDate. */
export function mondayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Load and validate a content file by date. Returns null if missing. */
export async function loadContent(date: string): Promise<WeeklyDigestContent | null> {
  // Strict regex on the input — defense against path traversal.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  const filePath = path.join(CONTENT_DIR, `${date}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as WeeklyDigestContent;
    // Light shape validation — full schema validation could use zod,
    // but the cost of "I wrote a malformed JSON file" is one bad send,
    // and we'd rather not block on a fancy validator here.
    if (!parsed.subject || !parsed.marketSnapshot || !Array.isArray(parsed.dealSpotter)) {
      console.error("[render-weekly] Content file missing required fields:", date);
      return null;
    }
    return parsed;
  } catch (error) {
    // ENOENT (no file for this week) is expected. Anything else is logged.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("[render-weekly] Failed to read content file:", date, error);
    }
    return null;
  }
}

/** Render the email to HTML using a content object. */
export async function renderWeeklyDigest(
  content: WeeklyDigestContent,
  opts: { unsubscribeUrl?: string; senderAddress?: string } = {}
): Promise<{ html: string; text: string; subject: string }> {
  const senderAddress = opts.senderAddress ?? process.env.EMAIL_SENDER_ADDRESS;
  const element = WeeklyDigestEmail({
    content,
    unsubscribeUrl: opts.unsubscribeUrl,
    senderAddress,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text, subject: content.subject };
}

/** List all available content files (sorted, newest first). */
export async function listContentDates(): Promise<string[]> {
  try {
    const files = await fs.readdir(CONTENT_DIR);
    return files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace(/\.json$/, ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
