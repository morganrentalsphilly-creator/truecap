/**
 * Testimonial pipeline — pure rules (no IO). docs/site-overhaul.md Phase 5.
 *
 * A quote reaches the public site ONLY when every rule below holds. The
 * cron (app/api/cron/publish-testimonials) gathers the facts and asks
 * `evaluatePublishEligibility`; the prompt's server action asks
 * `validateQuote` before storing anything. Both are unit-tested.
 */

export const QUOTE_MIN = 40;
export const QUOTE_MAX = 280;
export const PUBLISH_DELAY_HOURS = 24;
export const MIN_SAVED_DEALS_FOR_PUBLISH = 3;

export type TestimonialRole = "investor" | "house_hacker" | "agent" | "other";
export const TESTIMONIAL_ROLES: readonly TestimonialRole[] = [
  "investor",
  "house_hacker",
  "agent",
  "other",
];
export const ROLE_LABELS: Record<TestimonialRole, string> = {
  investor: "Investor",
  house_hacker: "House hacker",
  agent: "Agent",
  other: "Investor",
};

const URL_RE = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|us|app|dev)\b/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

/** Deliberately small: the goal is "never publish an obvious slur or expletive", not moderation. */
const PROFANITY = [
  "fuck", "shit", "bitch", "asshole", "bastard", "damn", "cunt", "dick", "piss",
  "nigger", "faggot", "retard", "whore", "slut",
];
const PROFANITY_RE = new RegExp(`\\b(?:${PROFANITY.join("|")})\\w*`, "i");

export type QuoteValidation =
  | { ok: true; quote: string }
  | { ok: false; reason: "too_short" | "too_long" | "contains_url" | "contains_email" | "contains_phone" | "profanity" };

export function validateQuote(raw: string): QuoteValidation {
  const quote = raw.replace(/\s+/g, " ").trim();
  if (quote.length < QUOTE_MIN) return { ok: false, reason: "too_short" };
  if (quote.length > QUOTE_MAX) return { ok: false, reason: "too_long" };
  if (EMAIL_RE.test(quote)) return { ok: false, reason: "contains_email" };
  if (URL_RE.test(quote)) return { ok: false, reason: "contains_url" };
  if (PHONE_RE.test(quote)) return { ok: false, reason: "contains_phone" };
  if (PROFANITY_RE.test(quote)) return { ok: false, reason: "profanity" };
  return { ok: true, quote };
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

/** Jaccard similarity over word sets; ≥ 0.8 counts as a near-duplicate. */
export function quoteSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

export const NEAR_DUPLICATE_THRESHOLD = 0.8;

export function isNearDuplicate(quote: string, existing: readonly string[]): boolean {
  return existing.some((other) => quoteSimilarity(quote, other) >= NEAR_DUPLICATE_THRESHOLD);
}

export type PublishCandidate = {
  quote: string;
  consent: boolean;
  publishAfter: string; // ISO
  isDemoAccount: boolean;
  savedDealCount: number;
  exportedReportCount: number;
  existingPublishedQuotes: readonly string[];
};

export type PublishDecision =
  | { publish: true }
  | {
      publish: false;
      reason:
        | "no_consent"
        | "demo_account"
        | "not_enough_activity"
        | "too_short"
        | "too_long"
        | "contains_url"
        | "contains_email"
        | "contains_phone"
        | "profanity"
        | "near_duplicate"
        | "delay_not_elapsed";
    };

/** All rules must hold; the first failing rule is the recorded skip reason. */
export function evaluatePublishEligibility(c: PublishCandidate, now: Date): PublishDecision {
  if (!c.consent) return { publish: false, reason: "no_consent" };
  if (c.isDemoAccount) return { publish: false, reason: "demo_account" };
  if (c.savedDealCount < MIN_SAVED_DEALS_FOR_PUBLISH && c.exportedReportCount < 1) {
    return { publish: false, reason: "not_enough_activity" };
  }
  const validation = validateQuote(c.quote);
  if (!validation.ok) return { publish: false, reason: validation.reason };
  if (isNearDuplicate(validation.quote, c.existingPublishedQuotes)) {
    return { publish: false, reason: "near_duplicate" };
  }
  if (new Date(c.publishAfter).getTime() > now.getTime()) {
    return { publish: false, reason: "delay_not_elapsed" };
  }
  return { publish: true };
}

/** Public display: first name only, role label, market, month/year. */
export type PublicTestimonial = {
  id: string;
  quote: string;
  firstName: string | null;
  role: TestimonialRole | null;
  market: string | null;
  publishedAt: string;
};

export function formatPublishedMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** The public usage counter's display rule: hide < 100, exact 100–999, round DOWN to the hundred above. */
export function formatUsageCount(count: number | null | undefined): string | null {
  if (count == null || !Number.isFinite(count) || count < 100) return null;
  if (count < 1000) return `${Math.floor(count)}`;
  const rounded = Math.floor(count / 100) * 100;
  return `${rounded.toLocaleString("en-US")}+`;
}
