/**
 * Render one funnel-sequence step (lib/funnel-sequences.ts) from its JSON
 * content to { subject, text, html }.
 *
 * Same estate as render-lifecycle.ts: copy lives in JSON
 * (emails/lifecycle-content/sequences/<step>.json, an "investor" and an
 * "agent" variant per step) and the HTML is the shared LifecycleEmail
 * template. Plain text is built from the same paragraphs, so the two parts
 * cannot disagree.
 *
 * Content rules:
 *   - a body entry is a string, or { if | unless: <token>, text } to include a
 *     paragraph only when a token has (or lacks) a value;
 *   - {{token}} is replaced from the context. A paragraph that references a
 *     token with no value is dropped rather than sent with a hole in it;
 *   - cta_path is site-relative. The renderer makes it absolute and appends
 *     UTM tags, so every link is tagged and every email has exactly one CTA.
 *
 * Token values are plain text: the template escapes them (React), and the
 * only caller-influenced one — the address — is sanitized by the caller.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import LifecycleEmail, {
  LIFECYCLE_FOOTER_REASON,
  LIFECYCLE_SETTINGS_LABEL,
  MEMO_LEAD_FOOTER_REASON,
} from "@/emails/lifecycle-email";
import type { SequenceId, SequenceVariant } from "@/lib/funnel-sequences";

const SEQUENCE_DIR = path.join(process.cwd(), "emails", "lifecycle-content", "sequences");

export type SequenceTokens = Record<string, string | null | undefined>;

export type SequenceRenderInput = {
  sequence: SequenceId;
  stepKey: string;
  variant: SequenceVariant;
  siteUrl: string;
  /** Signed one-click unsubscribe URL — required; callers fail closed without it. */
  unsubscribeUrl: string;
  /** EMAIL_POSTAL_ADDRESS — required; callers fail closed without it. */
  postalAddress: string;
  tokens: SequenceTokens;
  /** True when the recipient has a deal to point at (selects the CTA). */
  hasDeal?: boolean;
};

export type RenderedSequenceEmail = { subject: string; text: string; html: string; ctaUrl: string };

type BodyEntry = string | { if?: string; unless?: string; text: string };
type VariantContent = {
  subject: string;
  preheader?: string;
  headline: string;
  body: BodyEntry[];
  cta_text: string;
  cta_path: string;
  cta_text_no_deal?: string;
  cta_path_no_deal?: string;
};

function isVariantContent(raw: unknown): raw is VariantContent {
  if (!raw || typeof raw !== "object") return false;
  const c = raw as Record<string, unknown>;
  return (
    typeof c.subject === "string" &&
    typeof c.headline === "string" &&
    typeof c.cta_text === "string" &&
    typeof c.cta_path === "string" &&
    c.cta_path.startsWith("/") &&
    Array.isArray(c.body) &&
    c.body.length > 0
  );
}

export async function loadSequenceContent(
  stepKey: string,
  variant: SequenceVariant,
): Promise<VariantContent | null> {
  if (!/^[LT]\d$/.test(stepKey)) return null;
  try {
    const raw = JSON.parse(
      await fs.readFile(path.join(SEQUENCE_DIR, `${stepKey.toLowerCase()}.json`), "utf8"),
    ) as Record<string, unknown>;
    const content = raw[variant] ?? raw.investor;
    return isVariantContent(content) ? content : null;
  } catch {
    return null;
  }
}

const TOKEN = /\{\{(\w+)\}\}/g;
const has = (tokens: SequenceTokens, name: string) => Boolean(tokens[name]?.trim());

/** Resolve one paragraph, or null when it must be dropped. */
export function resolveParagraph(entry: BodyEntry, tokens: SequenceTokens): string | null {
  const text = typeof entry === "string" ? entry : entry.text;
  if (typeof text !== "string") return null;
  if (typeof entry !== "string") {
    if (entry.if && !has(tokens, entry.if)) return null;
    if (entry.unless && has(tokens, entry.unless)) return null;
  }
  let missing = false;
  const resolved = text.replace(TOKEN, (_, name: string) => {
    if (!has(tokens, name)) {
      missing = true;
      return "";
    }
    return tokens[name]!.trim();
  });
  return missing ? null : resolved;
}

/** Absolute, UTM-tagged CTA link. */
export function buildSequenceCtaUrl(
  siteUrl: string,
  ctaPath: string,
  sequence: SequenceId,
  stepKey: string,
): string {
  const url = new URL(ctaPath, `${siteUrl.replace(/\/+$/, "")}/`);
  url.searchParams.set("utm_source", "lifecycle");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", sequence);
  url.searchParams.set("utm_content", stepKey.toLowerCase());
  return url.toString();
}

export async function renderSequenceEmail(
  input: SequenceRenderInput,
): Promise<RenderedSequenceEmail | null> {
  const content = await loadSequenceContent(input.stepKey, input.variant);
  if (!content) return null;
  const body = content.body
    .map((entry) => resolveParagraph(entry, input.tokens))
    .filter((p): p is string => Boolean(p));
  if (body.length === 0) return null;

  const useNoDeal = input.hasDeal === false && Boolean(content.cta_path_no_deal);
  const ctaText = useNoDeal ? (content.cta_text_no_deal ?? content.cta_text) : content.cta_text;
  const ctaUrl = buildSequenceCtaUrl(
    input.siteUrl,
    useNoDeal ? content.cta_path_no_deal! : content.cta_path,
    input.sequence,
    input.stepKey,
  );

  // Footer mirrors lib/email/render-lifecycle.ts. A memo lead has no account,
  // so it gets its own reason line and no settings link.
  const isLead = input.sequence === "memo_lead";
  const footerReason = isLead ? MEMO_LEAD_FOOTER_REASON : LIFECYCLE_FOOTER_REASON;
  const manageUrl = `${input.siteUrl}/settings`;
  const text = [
    content.headline,
    "",
    ...body.flatMap((p) => [p, ""]),
    `${ctaText}: ${ctaUrl}`,
    "",
    footerReason,
    `Unsubscribe: ${input.unsubscribeUrl}`,
    ...(isLead ? [] : [`${LIFECYCLE_SETTINGS_LABEL}: ${manageUrl}`]),
    input.postalAddress,
  ].join("\n");

  const html = await render(
    LifecycleEmail({
      preheader: content.preheader ?? content.subject,
      headline: content.headline,
      body,
      ctaText,
      ctaUrl,
      signatureNote: null,
      siteUrl: input.siteUrl,
      manageUrl,
      unsubscribeUrl: input.unsubscribeUrl,
      postalAddress: input.postalAddress,
      footerReason,
      showSettingsLink: !isLead,
    }),
  );
  return { subject: content.subject, text, html, ctaUrl };
}
