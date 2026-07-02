"use server";

/**
 * AI deal-summary server action — generates a short, balanced narrative for a
 * specific analysis, grounded in numbers recomputed server-side.
 *
 * Trust + cost model (mirrors app/actions/deal-qa.ts):
 *  - The client sends only the form VALUES (validated by the calculator's Zod
 *    schema). The analysis is recomputed here via calculateAnalysis, so the
 *    model never sees client-claimed metrics.
 *  - The summary is DETERMINISTIC from the inputs, so we cache it per
 *    input-hash in memory: the first generation for a given deal pays for a
 *    Haiku call; identical deals (any user, same instance) reuse it for free
 *    and don't consume a rate-limit token.
 *  - Cache misses are rate-limited per caller (in-memory, best-effort) —
 *    DEAL_SUMMARY_LIMITS.free/day for visitors + free accounts, .pro/day for
 *    paid. Worst case under instance churn is a few extra Haiku calls (pennies).
 *  - No ANTHROPIC_API_KEY → UNAVAILABLE. The UI hides the card when the
 *    page-level flag says the key is absent (same gate as Deal Q&A).
 */

import { z } from "zod";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import {
  DEAL_SUMMARY_LIMITS,
  DEAL_SUMMARY_SYSTEM_PROMPT,
  hashDealInput,
} from "@/lib/deal-summary";
import {
  buildGroundedDealContext,
  dealQaExtraContextSchema,
} from "@/lib/deal-qa-context";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const inputSchema = z.object({
  values: investmentFormSchema,
  /** Optional client-side grounding depth (buy box / MAO / projection /
   *  comps) — shared shape with Deal Q&A so the pair can't drift. */
  context: dealQaExtraContextSchema.optional(),
});

export type DealSummaryResult =
  | { ok: true; summary: string; remainingToday: number | null; cached: boolean }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "RATE_LIMITED" | "UNAVAILABLE" | "SERVER_ERROR";
      message: string;
    };

// ── In-memory per-day rate limit (cache misses only) ─────────────────
type Counter = { day: string; count: number };
const usage = new Map<string, Counter>();

function takeToken(key: string, limit: number): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const current = usage.get(key);
  const counter = current && current.day === today ? current : { day: today, count: 0 };
  if (counter.count >= limit) return { allowed: false, remaining: 0 };
  counter.count += 1;
  usage.set(key, counter);
  if (usage.size > 5000) {
    for (const [k, v] of usage) {
      if (v.day !== today) usage.delete(k);
    }
  }
  return { allowed: true, remaining: limit - counter.count };
}

// ── In-memory summary cache, keyed by deal input-hash ────────────────
const SUMMARY_CACHE_MAX = 2000;
const summaryCache = new Map<string, string>();

function readCache(hash: string): string | undefined {
  return summaryCache.get(hash);
}

function writeCache(hash: string, summary: string): void {
  summaryCache.set(hash, summary);
  // Bounded FIFO: drop the oldest entries once over the cap.
  if (summaryCache.size > SUMMARY_CACHE_MAX) {
    const overflow = summaryCache.size - SUMMARY_CACHE_MAX;
    let i = 0;
    for (const k of summaryCache.keys()) {
      summaryCache.delete(k);
      i += 1;
      if (i >= overflow) break;
    }
  }
}

async function resolveCallerKeyAndLimit(): Promise<{ key: string; limit: number; isPaid: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const isPaid = await hasPaidPlanSubscription(supabase, user.id);
      return {
        key: `user:${user.id}`,
        limit: isPaid ? DEAL_SUMMARY_LIMITS.pro : DEAL_SUMMARY_LIMITS.free,
        isPaid,
      };
    }
  } catch {
    // Fall through to IP-keyed anonymous limiting.
  }
  let ip = "unknown";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    // headers() unavailable — keep "unknown" (shared bucket).
  }
  return { key: `ip:${ip}`, limit: DEAL_SUMMARY_LIMITS.free, isPaid: false };
}

export async function generateDealSummaryAction(input: unknown): Promise<DealSummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "UNAVAILABLE", message: "AI summary isn't configured right now." };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid deal data." };
  }

  // Cache hit → return free, no rate-limit token spent. Keyed on values +
  // grounding context: the same deal WITH comps/buy-box context produces a
  // different (richer) summary than without.
  const hash = hashDealInput(parsed.data.values, parsed.data.context);
  const cached = readCache(hash);
  if (cached) {
    return { ok: true, summary: cached, remainingToday: null, cached: true };
  }

  const caller = await resolveCallerKeyAndLimit();
  const token = takeToken(caller.key, caller.limit);
  if (!token.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: caller.isPaid
        ? "Daily fair-use limit reached. Try again tomorrow."
        : "You've used today's free AI summaries. Pro includes unlimited summaries.",
    };
  }

  try {
    const result = calculateAnalysis(parsed.data.values);
    const context = buildGroundedDealContext(parsed.data.values, result, parsed.data.context);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.DEAL_QA_MODEL ?? "claude-haiku-4-5-20251001",
        max_tokens: 320,
        // buildGroundedDealContext emits its own section headers
        // ("THE DEAL", "YOUR BUY BOX", ..., "NOT PROVIDED").
        system: `${DEAL_SUMMARY_SYSTEM_PROMPT}\n\n${context}`,
        messages: [
          { role: "user", content: "Summarize this deal." },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[deal-summary] Anthropic API ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, code: "SERVER_ERROR", message: "Couldn't generate a summary right now. Please try again." };
    }

    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const summary = (json.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!summary) {
      return { ok: false, code: "SERVER_ERROR", message: "Couldn't generate a summary right now. Please try again." };
    }

    writeCache(hash, summary);
    return {
      ok: true,
      summary,
      remainingToday: caller.isPaid ? null : token.remaining,
      cached: false,
    };
  } catch (error) {
    console.warn("[deal-summary] generateDealSummaryAction failed:", error);
    return { ok: false, code: "SERVER_ERROR", message: "Couldn't generate a summary right now. Please try again." };
  }
}
