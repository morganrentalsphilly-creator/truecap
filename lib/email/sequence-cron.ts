import "server-only";

/**
 * Funnel-sequence half of the daily lifecycle cron
 * (app/api/cron/send-lifecycle-emails). Loads recipient state from Supabase,
 * asks the pure scheduler (lib/funnel-sequences.ts) what is due, and returns
 * the emails to send plus the past-window steps to retire. The route does the
 * sending so dry/live handling stays in one place.
 *
 * Exits honored here, before anything is queued:
 *   - unsubscribe: email_suppressions (hashed address, both audiences),
 *     memo_leads.unsubscribed_at, profiles.marketing_opt_out;
 *   - conversion: lead → an account with the same confirmed address;
 *     trial → an entitlement-layer paid plan.
 * Every read FAILS CLOSED: if a suppression or opt-out source cannot be read,
 * that audience gets nothing this run.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { hashDripEmail } from "@/lib/email-drip-unsubscribe";
import type { DueSequenceEmail } from "@/lib/email/send-sequence";
import type { SequenceTokens } from "@/lib/email/render-sequence";
import {
  SEQUENCE_SKIPPED_RESEND_ID,
  TRIAL_END_OFFER_LAST_DAY,
  expiredSequenceKeys,
  selectDueSequenceStep,
  type SequenceRecipientState,
  type SequenceVariant,
} from "@/lib/funnel-sequences";
import { sanitizeAddressText } from "@/lib/html-escape";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import { MEMO_LINK_DAYS, normalizeLeadEmail } from "@/lib/memo-lead";
import { buildMemoSummary, memoBreakerSentence, memoMoney } from "@/lib/memo-summary";
import { trialEndOfferConfigured } from "@/lib/trial-end-offer";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";

export type SequenceCronUser = {
  id: string;
  email: string;
  confirmed: boolean;
  /** user_metadata.signup_intent === "agent" (set at sign-up). */
  agentIntent: boolean;
};

export type SequenceRetireRow = {
  user_id?: string;
  lead_id?: string;
  email_key: string;
  resend_id: string;
};

export type SequenceCronPlan = {
  due: DueSequenceEmail[];
  retire: SequenceRetireRow[];
  /** Lead ids whose address now belongs to a confirmed account. */
  convertedLeads: Array<{ leadId: string; userId: string }>;
  /** Audiences skipped because an exit source could not be read. */
  blocked: string[];
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 1000;

/**
 * Read EVERY row of a query. PostgREST caps an unpaginated select at 1,000
 * rows, and a truncated read here is not a cosmetic problem: a suppression
 * past row 1,000 would be mailed, and a trial past row 1,000 would be
 * skipped. `page` must apply a stable order. Returns null on any error so
 * callers fail closed.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; from < PAGE_SIZE * 500; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !Array.isArray(data)) return null;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
  return null; // implausibly large — refuse rather than act on a partial read
}

/** Tokens the copy can reference for a deal's inputs; all plain text. */
export function dealTokens(
  rawValues: unknown,
  rawTarget: unknown,
  includeOfferCeiling: boolean,
): SequenceTokens {
  const parsed = releasedInvestmentFormSchema.safeParse(rawValues);
  if (!parsed.success) return {};
  try {
    const summary = buildMemoSummary(parsed.data, {
      maoTarget: normalizeMaoTarget(rawTarget),
      includeOfferCeiling,
    });
    return {
      address: sanitizeAddressText(parsed.data.address) || "your deal",
      breaker_sentence: memoBreakerSentence(summary),
      cash_flow: memoMoney(summary.monthlyCashFlow),
      offer_ceiling: summary.offerCeiling ? memoMoney(summary.offerCeiling.maxPrice) : null,
      ceiling_target: summary.offerCeiling?.targetLabel ?? null,
    };
  } catch {
    return {};
  }
}

/** "October 26" — the last day the trial-end offer applies (UTC). */
export function trialOfferEndsLabel(trialStartedAt: string): string | null {
  const start = new Date(trialStartedAt).getTime();
  if (!Number.isFinite(start)) return null;
  return new Date(start + TRIAL_END_OFFER_LAST_DAY * DAY_MS).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function loadSuppressedHashes(admin: SupabaseClient): Promise<Set<string> | null> {
  const rows = await fetchAllRows<{ email_hash: string }>((from, to) =>
    admin.from("email_suppressions").select("email_hash").order("email_hash").range(from, to),
  );
  return rows ? new Set(rows.map((r) => r.email_hash)) : null;
}

export async function planSequenceEmails(
  admin: SupabaseClient,
  input: {
    users: SequenceCronUser[];
    paidUserIds: ReadonlySet<string>;
    sentByUser: ReadonlyMap<string, string[]>;
    sentByLead: ReadonlyMap<string, string[]>;
    /** The cron's own opt-out rule (profiles.marketing_opt_out, and no
     *  profile row = no email), so both halves of the run agree. */
    mayEmailUser: (userId: string) => boolean;
    now: Date;
  },
): Promise<SequenceCronPlan> {
  const plan: SequenceCronPlan = { due: [], retire: [], convertedLeads: [], blocked: [] };
  const { now } = input;

  const suppressed = await loadSuppressedHashes(admin);
  if (!suppressed) {
    plan.blocked.push("all:suppressions_unavailable");
    return plan;
  }

  // ── Trial sequence (accounts) ────────────────────────────────────────────
  const evaluations = await fetchAllRows<{ user_id: string; started_at: string }>((from, to) =>
    admin
      .from("product_evaluations")
      .select("user_id, started_at")
      .order("user_id")
      .range(from, to),
  );
  if (!evaluations) {
    plan.blocked.push("trial:state_unavailable");
  } else {
    const trialStart = new Map<string, string>();
    for (const row of evaluations) trialStart.set(row.user_id, row.started_at);
    const offerOn = trialEndOfferConfigured();

    for (const user of input.users) {
      const startAt = trialStart.get(user.id);
      // No evaluation row = no trial (e.g. accounts with subscription history).
      if (!startAt || !user.confirmed) continue;
      const state: SequenceRecipientState = {
        sequence: "trial",
        startAt,
        sentKeys: input.sentByUser.get(user.id) ?? [],
        unsubscribed:
          !input.mayEmailUser(user.id) || suppressed.has(hashDripEmail(user.email)),
        converted: input.paidUserIds.has(user.id),
      };
      for (const key of expiredSequenceKeys(state, now)) {
        plan.retire.push({ user_id: user.id, email_key: key, resend_id: SEQUENCE_SKIPPED_RESEND_ID });
      }
      const step = selectDueSequenceStep(state, now);
      if (!step) continue;

      const variant: SequenceVariant = user.agentIntent ? "agent" : "investor";
      let tokens: SequenceTokens = {};
      let hasDeal: boolean | undefined;
      if (step.key === "T1" || step.key === "T3") {
        const { data: deal } = await admin
          .from("saved_analyses")
          .select("form_snapshot")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        hasDeal = Boolean(deal);
        // The exact ceiling stays behind the app's own access checks; the
        // email only needs the downside sentence.
        if (deal && step.key === "T1") tokens = dealTokens(deal.form_snapshot, null, false);
        if (hasDeal) tokens.has_deal = "yes";
      }
      if ((step.key === "T4" || step.key === "T5") && offerOn && variant === "investor") {
        const ends = trialOfferEndsLabel(startAt);
        if (ends) tokens = { ...tokens, trial_offer: "yes", offer_ends: ends };
      }
      plan.due.push({
        recipient: { kind: "user", userId: user.id, email: user.email },
        sequence: "trial",
        stepKey: step.key,
        variant,
        tokens,
        hasDeal,
      });
    }
  }

  // ── Memo-lead sequence (anonymous addresses) ─────────────────────────────
  type LeadRow = {
    id: string;
    email: string;
    email_hash: string;
    snapshot: unknown;
    intent: string;
    created_at: string;
  };
  const leads = await fetchAllRows<LeadRow>((from, to) =>
    admin
      .from("memo_leads")
      .select("id, email, email_hash, snapshot, intent, created_at")
      .is("unsubscribed_at", null)
      .is("converted_user_id", null)
      .order("id")
      .range(from, to),
  );
  if (!leads) {
    plan.blocked.push("memo_lead:state_unavailable");
    return plan;
  }
  const confirmedUserByEmail = new Map<string, string>();
  for (const user of input.users) {
    if (user.confirmed) confirmedUserByEmail.set(normalizeLeadEmail(user.email), user.id);
  }
  for (const lead of leads) {
    const leadId = lead.id;
    const email = lead.email;
    // Backstop for the sign-up hook: the address now has an account.
    const userId = confirmedUserByEmail.get(normalizeLeadEmail(email));
    if (userId) {
      plan.convertedLeads.push({ leadId, userId });
      continue;
    }
    const state: SequenceRecipientState = {
      sequence: "memo_lead",
      startAt: lead.created_at,
      sentKeys: input.sentByLead.get(leadId) ?? [],
      unsubscribed: suppressed.has(lead.email_hash),
      converted: false,
    };
    for (const key of expiredSequenceKeys(state, now)) {
      plan.retire.push({ lead_id: leadId, email_key: key, resend_id: SEQUENCE_SKIPPED_RESEND_ID });
    }
    const step = selectDueSequenceStep(state, now);
    if (!step) continue;
    const snapshot = (lead.snapshot ?? {}) as { values?: unknown; maoTarget?: unknown };
    plan.due.push({
      recipient: { kind: "lead", leadId, email },
      sequence: "memo_lead",
      stepKey: step.key,
      variant: lead.intent === "agent" ? "agent" : "investor",
      // The memo already showed this lead their ceiling for these inputs.
      tokens: dealTokens(snapshot.values, snapshot.maoTarget, true),
    });
  }
  return plan;
}

/** Retention: unconverted leads are deleted 180 days after their last memo
 *  request (their log rows cascade). Returns rows deleted, or null on error. */
export async function purgeExpiredMemoLeads(
  admin: SupabaseClient,
  now: Date,
): Promise<number | null> {
  const cutoff = new Date(now.getTime() - MEMO_LINK_DAYS * DAY_MS).toISOString();
  const { data, error } = await admin
    .from("memo_leads")
    .delete()
    .is("converted_user_id", null)
    .lt("memo_requested_at", cutoff)
    .select("id");
  return error ? null : (data?.length ?? 0);
}
