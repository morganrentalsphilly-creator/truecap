/**
 * The decision-memo email (sequence step L0) — plain text first, with a
 * simple HTML twin built from the same lines so the two can never disagree.
 *
 * PURE: every value arrives already computed (lib/memo-summary.ts). Every
 * caller-influenced string — the property address is the only one — is
 * escaped here before it reaches HTML.
 */

import { escapeHtml, sanitizeAddressText } from "@/lib/html-escape";
import {
  memoBreakerSentence,
  memoMetricLines,
  memoMoney,
  type MemoSummary,
} from "@/lib/memo-summary";

export type MemoEmailInput = {
  summary: MemoSummary;
  address: string | null | undefined;
  memoUrl: string;
  unsubscribeUrl: string;
  /** EMAIL_POSTAL_ADDRESS; omitted from the footer when blank. */
  postalAddress: string | null;
};

export const MEMO_EMAIL_SUBJECT = "Your TrueCap decision memo";

export function buildMemoEmail(input: MemoEmailInput): { subject: string; text: string; html: string } {
  const address = sanitizeAddressText(input.address);
  const metrics = memoMetricLines(input.summary);
  const breaker = memoBreakerSentence(input.summary);
  const ceiling = input.summary.offerCeiling;
  const intro = `Here are the modeled numbers for ${address || "the property you screened"} at ${memoMoney(input.summary.purchasePrice)}.`;
  const ceilingNote = ceiling
    ? `The Offer Ceiling is the highest price that still meets your targets (${ceiling.targetLabel}).`
    : null;
  const caveat =
    "These are modeled results from the inputs you entered, not a forecast. Replace every estimate with a quote, record, or inspection finding before you make an offer.";
  const postal = input.postalAddress?.trim() || null;

  const text = [
    "Your decision memo",
    "",
    intro,
    "",
    ...metrics.map((m) => `${m.label}: ${m.value}`),
    ...(ceilingNote ? ["", ceilingNote] : []),
    ...(breaker ? ["", breaker] : []),
    "",
    `Open the full read-only memo: ${input.memoUrl}`,
    "",
    caveat,
    "",
    "TrueCap",
    ...(postal ? [postal] : []),
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  const p = (body: string) =>
    `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.6">${body}</p>`;
  const rows = metrics
    .map(
      (m) =>
        `<tr><td style="padding:6px 0;color:#475569;font-size:15px">${escapeHtml(m.label)}</td><td style="padding:6px 0;text-align:right;color:#0F172A;font-size:15px;font-weight:700">${escapeHtml(m.value)}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;padding:28px 24px;background:#fff;border-radius:16px">
<h1 style="margin:0 0 12px;color:#0F172A;font-size:22px;line-height:1.3">Your decision memo</h1>
${p(escapeHtml(intro))}
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px">${rows}</table>
${ceilingNote ? p(escapeHtml(ceilingNote)) : ""}
${breaker ? p(escapeHtml(breaker)) : ""}
<p style="margin:20px 0"><a href="${escapeHtml(input.memoUrl)}" style="display:inline-block;background:#5248D4;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:15px">Open the full memo</a></p>
<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">${escapeHtml(caveat)}</p>
</div>
<p style="margin:0 0 32px;text-align:center;color:#94A3B8;font-size:12px;line-height:18px">TrueCap${postal ? ` · ${escapeHtml(postal)}` : ""}<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#94A3B8">Unsubscribe</a></p>
</body></html>`;

  return { subject: MEMO_EMAIL_SUBJECT, text, html };
}
