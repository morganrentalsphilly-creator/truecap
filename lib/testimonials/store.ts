import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluatePublishEligibility,
  TESTIMONIAL_ROLES,
  validateQuote,
  type PublicTestimonial,
  type TestimonialRole,
} from "@/lib/testimonials/rules";

/**
 * Testimonial pipeline — IO layer (service role). docs/site-overhaul.md Phase 5.
 * Every read tolerates the migration not being applied yet (relation missing
 * → empty / "unavailable"), so nothing on the site can break before the
 * founder runs supabase/migrations/20260906180000_testimonials_pipeline.sql.
 */

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST204", "42703"]);

export function isMissingRelation(error: { code?: string | null } | null | undefined): boolean {
  return Boolean(error && MISSING_TABLE_CODES.has(error.code ?? ""));
}

export type PromptTrigger = "pdf_export" | "third_save" | "email_link";

type TestimonialRow = {
  id: string;
  user_id: string | null;
  quote: string;
  first_name: string | null;
  role: TestimonialRole | null;
  market: string | null;
  consent: boolean;
  publish_after: string;
  status: "pending" | "published" | "unpublished";
  published_at: string | null;
};

export async function listPublishedTestimonials(
  admin: SupabaseClient,
  limit = 50,
): Promise<PublicTestimonial[]> {
  const { data, error } = await admin
    .from("testimonials")
    .select("id, quote, first_name, role, market, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as Array<Pick<TestimonialRow, "id" | "quote" | "first_name" | "role" | "market" | "published_at">>)
    .filter((row) => row.published_at)
    .map((row) => ({
      id: row.id,
      quote: row.quote,
      firstName: row.first_name,
      role: row.role,
      market: row.market,
      publishedAt: row.published_at as string,
    }));
}

/**
 * The prompt fires ONCE per user, ever — enforced by the primary key on
 * testimonial_prompt_events, not by browser storage.
 */
export async function claimTestimonialPrompt(
  admin: SupabaseClient,
  userId: string,
  trigger: PromptTrigger,
): Promise<"claimed" | "already_shown" | "unavailable"> {
  const { error } = await admin
    .from("testimonial_prompt_events")
    .insert({ user_id: userId, trigger });
  if (!error) return "claimed";
  if (error.code === "23505") return "already_shown";
  if (isMissingRelation(error)) return "unavailable";
  throw error;
}

export async function dismissTestimonialPromptForever(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await admin
    .from("testimonial_prompt_events")
    .upsert(
      { user_id: userId, trigger: "pdf_export", dismissed_forever_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error && !isMissingRelation(error)) throw error;
}

export type SubmitTestimonialInput = {
  userId: string;
  quote: string;
  role?: TestimonialRole | null;
  market?: string | null;
  consent: boolean;
  trigger: PromptTrigger;
};

export type SubmitTestimonialResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason:
        | "too_short"
        | "too_long"
        | "contains_url"
        | "contains_email"
        | "contains_phone"
        | "profanity"
        | "invalid_role"
        | "already_submitted"
        | "unavailable";
    };

async function firstNameFor(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("first_name, display_name")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { first_name: string | null; display_name: string | null } | null;
  const candidate = row?.first_name?.trim() || row?.display_name?.trim().split(/\s+/)[0] || null;
  if (!candidate) return null;
  return candidate.slice(0, 60);
}

export async function submitTestimonial(
  admin: SupabaseClient,
  input: SubmitTestimonialInput,
): Promise<SubmitTestimonialResult> {
  const validation = validateQuote(input.quote);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const role = input.role ?? null;
  if (role !== null && !TESTIMONIAL_ROLES.includes(role)) return { ok: false, reason: "invalid_role" };
  const market = input.market?.replace(/\s+/g, " ").trim().slice(0, 80) || null;
  const firstName = await firstNameFor(admin, input.userId);

  const { data, error } = await admin
    .from("testimonials")
    .insert({
      user_id: input.userId,
      quote: validation.quote,
      first_name: firstName,
      role,
      market,
      consent: input.consent,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "already_submitted" };
    if (isMissingRelation(error)) return { ok: false, reason: "unavailable" };
    throw error;
  }

  const { error: eventError } = await admin
    .from("testimonial_prompt_events")
    .upsert(
      { user_id: input.userId, trigger: input.trigger, submitted_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (eventError && !isMissingRelation(eventError)) throw eventError;

  return { ok: true, id: (data as { id: string } | null)?.id ?? "" };
}

export type PublishJobSummary = {
  scanned: number;
  published: number;
  skipped: Record<string, number>;
  unavailable: boolean;
};

/**
 * Auto-publish: every eligible pending row becomes public; every ineligible
 * one records why (skip_reason) and stays pending, so a later run can
 * publish it once the reason clears (more activity, delay elapsed). Counts
 * only go to the log and Sentry. NO email (hard limit).
 */
export async function runPublishJob(
  admin: SupabaseClient,
  now = new Date(),
): Promise<PublishJobSummary> {
  const summary: PublishJobSummary = { scanned: 0, published: 0, skipped: {}, unavailable: false };

  const { data: pendingRows, error: pendingError } = await admin
    .from("testimonials")
    .select("id, user_id, quote, consent, publish_after, status")
    .eq("status", "pending")
    .eq("consent", true)
    .lte("publish_after", now.toISOString())
    .order("created_at", { ascending: true })
    .limit(100);
  if (pendingError) {
    if (isMissingRelation(pendingError)) {
      summary.unavailable = true;
      return summary;
    }
    throw pendingError;
  }
  const pending = (pendingRows ?? []) as Array<Pick<TestimonialRow, "id" | "user_id" | "quote" | "consent" | "publish_after">>;
  summary.scanned = pending.length;
  if (pending.length === 0) return summary;

  const { data: demoRows } = await admin.from("demo_accounts").select("user_id");
  const demo = new Set(((demoRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));

  const { data: publishedRows, error: publishedError } = await admin
    .from("testimonials")
    .select("quote")
    .eq("status", "published")
    .limit(500);
  if (publishedError) throw publishedError;
  const publishedQuotes = ((publishedRows ?? []) as Array<{ quote: string }>).map((r) => r.quote);

  for (const row of pending) {
    const userId = row.user_id;
    let savedDealCount = 0;
    let exportedReportCount = 0;
    if (userId) {
      const { count } = await admin
        .from("saved_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null);
      savedDealCount = count ?? 0;
      const { data: promptRow } = await admin
        .from("testimonial_prompt_events")
        .select("trigger")
        .eq("user_id", userId)
        .maybeSingle();
      exportedReportCount = (promptRow as { trigger?: string } | null)?.trigger === "pdf_export" ? 1 : 0;
    }

    const decision = evaluatePublishEligibility(
      {
        quote: row.quote,
        consent: row.consent,
        publishAfter: row.publish_after,
        isDemoAccount: userId ? demo.has(userId) : true,
        savedDealCount,
        exportedReportCount,
        existingPublishedQuotes: publishedQuotes,
      },
      now,
    );

    if (decision.publish) {
      const { error } = await admin
        .from("testimonials")
        .update({ status: "published", published_at: now.toISOString(), skip_reason: null })
        .eq("id", row.id)
        .eq("status", "pending");
      if (error) throw error;
      publishedQuotes.push(row.quote);
      summary.published += 1;
    } else {
      const { error } = await admin
        .from("testimonials")
        .update({ skip_reason: decision.reason })
        .eq("id", row.id);
      if (error) throw error;
      summary.skipped[decision.reason] = (summary.skipped[decision.reason] ?? 0) + 1;
    }
  }

  Sentry.captureMessage(
    `[testimonials] publish job: scanned=${summary.scanned} published=${summary.published}`,
    { level: "info", tags: { feature: "testimonials", stage: "publish" }, extra: summary },
  );
  return summary;
}

export async function unpublishTestimonialByToken(
  admin: SupabaseClient,
  token: string,
  reason = "founder veto link",
): Promise<"unpublished" | "not_found" | "already_unpublished"> {
  if (!/^[a-f0-9]{48}$/.test(token)) return "not_found";
  const { data, error } = await admin
    .from("testimonials")
    .select("id, status")
    .eq("unpublish_token", token)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return "not_found";
    throw error;
  }
  const row = data as { id: string; status: string } | null;
  if (!row) return "not_found";
  if (row.status === "unpublished") return "already_unpublished";
  const { error: updateError } = await admin
    .from("testimonials")
    .update({ status: "unpublished", unpublished_at: new Date().toISOString(), unpublish_reason: reason })
    .eq("id", row.id);
  if (updateError) throw updateError;
  return "unpublished";
}

export type UsageCounts = { dealsSaved: number | null };

/**
 * Real rows only: saved deals (not deleted) by accounts that are not demo
 * accounts. The seeded cumulative run figure in app_counters is NOT used —
 * it is an owner-entered total, not a computed count, and it cannot exclude
 * demo accounts.
 */
export async function getUsageCounts(admin: SupabaseClient): Promise<UsageCounts> {
  const { data: demoRows } = await admin.from("demo_accounts").select("user_id");
  const demo = ((demoRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  let query = admin.from("saved_analyses").select("id", { count: "exact", head: true }).is("deleted_at", null);
  if (demo.length > 0) query = query.not("user_id", "in", `(${demo.join(",")})`);
  const { count, error } = await query;
  if (error) return { dealsSaved: null };
  return { dealsSaved: count ?? null };
}

export type FeedbackRecipient = { userId: string; email: string };

/**
 * The guarded feedback-request audience (docs/site-overhaul.md Phase 5.7):
 * ≥ 1 saved deal in the last 90 days; not a demo account; has never seen the
 * in-product prompt; not opted out; never emailed before; confirmed email.
 */
export async function selectFeedbackEmailAudience(
  admin: SupabaseClient,
  now = new Date(),
): Promise<FeedbackRecipient[]> {
  const since = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();
  const { data: dealRows, error: dealError } = await admin
    .from("saved_analyses")
    .select("user_id")
    .is("deleted_at", null)
    .gte("created_at", since);
  if (dealError) throw dealError;
  const candidates = new Set(((dealRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
  if (candidates.size === 0) return [];

  const exclude = new Set<string>();
  for (const table of ["demo_accounts", "testimonial_prompt_events", "feedback_email_sends"]) {
    const { data, error } = await admin.from(table).select("user_id");
    if (error && !isMissingRelation(error)) throw error;
    for (const r of (data ?? []) as Array<{ user_id: string }>) exclude.add(r.user_id);
  }
  const { data: optOutRows, error: optOutError } = await admin
    .from("profiles")
    .select("id")
    .eq("marketing_opt_out", true);
  if (optOutError && !isMissingRelation(optOutError)) throw optOutError;
  for (const r of (optOutRows ?? []) as Array<{ id: string }>) exclude.add(r.id);

  const recipients: FeedbackRecipient[] = [];
  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (!u.email || !u.email_confirmed_at) continue;
      if (!candidates.has(u.id) || exclude.has(u.id)) continue;
      recipients.push({ userId: u.id, email: u.email });
    }
    if (users.length < perPage) break;
  }
  return recipients;
}

/** Claim the one-and-only send for a user; null when already claimed. */
export async function claimFeedbackEmailSend(
  admin: SupabaseClient,
  userId: string,
): Promise<{ formToken: string } | null> {
  const { data, error } = await admin
    .from("feedback_email_sends")
    .insert({ user_id: userId })
    .select("form_token")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  const token = (data as { form_token: string } | null)?.form_token;
  return token ? { formToken: token } : null;
}

export async function recordFeedbackEmailProviderId(
  admin: SupabaseClient,
  userId: string,
  providerMessageId: string | null,
): Promise<void> {
  if (!providerMessageId) return;
  await admin.from("feedback_email_sends").update({ provider_message_id: providerMessageId }).eq("user_id", userId);
}

export async function resolveFeedbackFormToken(
  admin: SupabaseClient,
  token: string,
): Promise<string | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { data, error } = await admin
    .from("feedback_email_sends")
    .select("user_id")
    .eq("form_token", token)
    .maybeSingle();
  if (error) return null;
  return (data as { user_id: string } | null)?.user_id ?? null;
}

export async function setMarketingOptOut(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await admin.from("profiles").update({ marketing_opt_out: true }).eq("id", userId);
  if (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
  return true;
}
