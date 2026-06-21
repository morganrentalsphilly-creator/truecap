/**
 * Render a lifecycle email from its JSON content.
 *
 * Resolves the right content file for a DueLifecycleEmail, renders the
 * shared template (emails/lifecycle-email.tsx) to HTML + a plain-text
 * alternative, and returns the subject. Used by the lifecycle cron
 * (app/api/cron/send-lifecycle-emails) for both dry previews and live
 * sends — one place so preview and production never drift.
 *
 * Content sources (same shape: subject, preheader, headline, body[],
 * cta_text, cta_url, signature_note?):
 *   welcome / pro_nudge / winback -> emails/lifecycle-content/*.json
 *   drip day N                    -> emails/daily-campaign-content/day-NN.json
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import LifecycleEmail from "@/emails/lifecycle-email";
import type { DueLifecycleEmail } from "@/lib/lifecycle-emails";

const LIFECYCLE_DIR = path.join(process.cwd(), "emails", "lifecycle-content");
const DRIP_DIR = path.join(process.cwd(), "emails", "daily-campaign-content");

type RawContent = {
  subject?: unknown;
  preheader?: unknown;
  headline?: unknown;
  body?: unknown;
  cta_text?: unknown;
  cta_url?: unknown;
  signature_note?: unknown;
};

export type LifecycleEmailContent = {
  subject: string;
  preheader: string;
  headline: string;
  body: string[];
  ctaText: string;
  ctaUrl: string;
  signatureNote: string | null;
};

function contentFilePath(due: DueLifecycleEmail): string | null {
  switch (due.kind) {
    case "welcome":
      return path.join(LIFECYCLE_DIR, "welcome.json");
    case "pro_nudge":
      return path.join(LIFECYCLE_DIR, "pro-nudge.json");
    case "winback":
      return path.join(LIFECYCLE_DIR, "winback.json");
    case "drip": {
      if (typeof due.dripDay !== "number") return null;
      const nn = String(due.dripDay).padStart(2, "0");
      return path.join(DRIP_DIR, `day-${nn}.json`);
    }
    default:
      return null;
  }
}

function coerceContent(raw: RawContent): LifecycleEmailContent | null {
  const subject = typeof raw.subject === "string" ? raw.subject : null;
  const headline = typeof raw.headline === "string" ? raw.headline : null;
  const ctaText = typeof raw.cta_text === "string" ? raw.cta_text : null;
  const ctaUrl = typeof raw.cta_url === "string" ? raw.cta_url : null;
  const body = Array.isArray(raw.body)
    ? raw.body.filter((p): p is string => typeof p === "string")
    : [];
  if (!subject || !headline || !ctaText || !ctaUrl || body.length === 0) return null;
  return {
    subject,
    preheader: typeof raw.preheader === "string" ? raw.preheader : subject,
    headline,
    body,
    ctaText,
    ctaUrl,
    signatureNote: typeof raw.signature_note === "string" ? raw.signature_note : null,
  };
}

/** Load + validate the content file backing a due lifecycle email. */
export async function loadLifecycleContent(
  due: DueLifecycleEmail
): Promise<LifecycleEmailContent | null> {
  const filePath = contentFilePath(due);
  if (!filePath) return null;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return coerceContent(JSON.parse(raw) as RawContent);
  } catch {
    return null;
  }
}

function toPlainText(c: LifecycleEmailContent, manageUrl: string): string {
  return [
    c.headline,
    "",
    ...c.body,
    "",
    `${c.ctaText}: ${c.ctaUrl}`,
    "",
    `Manage email preferences: ${manageUrl}`,
  ].join("\n");
}

/** Render a due lifecycle email to { subject, html, text }, or null if content is missing. */
export async function renderLifecycleEmail(
  due: DueLifecycleEmail,
  siteUrl: string
): Promise<{ subject: string; html: string; text: string } | null> {
  const content = await loadLifecycleContent(due);
  if (!content) return null;
  const manageUrl = `${siteUrl}/settings`;
  const html = await render(
    LifecycleEmail({
      preheader: content.preheader,
      headline: content.headline,
      body: content.body,
      ctaText: content.ctaText,
      ctaUrl: content.ctaUrl,
      signatureNote: content.signatureNote,
      siteUrl,
      manageUrl,
    })
  );
  return { subject: content.subject, html, text: toPlainText(content, manageUrl) };
}
