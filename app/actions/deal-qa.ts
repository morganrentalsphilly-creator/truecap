"use server";

/**
 * Deal Q&A server action — answers natural-language questions about a
 * specific analysis, grounded in numbers recomputed server-side.
 *
 * Trust model:
 *  - The client sends the form VALUES (validated by the same Zod
 *    schema the calculator uses). The analysis is recomputed here via
 *    calculateAnalysis — the model never sees client-claimed metrics,
 *    so a tampered request can't make the AI bless fake numbers beyond
 *    what the user could type into the public form anyway.
 *  - The client MAY also forward an optional grounding-context block
 *    (buy-box evaluation, MAO, projection headline, pulled comps) that
 *    already exists client-side on the dashboard. It's zod-validated and
 *    size-bounded (lib/deal-qa-context) and adds DEPTH only — a tampered
 *    block is the same self-deception class as typing a fake rent. It
 *    has zero effect on auth, rate limits, or entitlements.
 *  - Anonymous + free users get DEAL_QA_LIMITS.free questions/day
 *    (taste of Pro — mirrors the sample-deal preview philosophy).
 *    Paid plans get DEAL_QA_LIMITS.pro/day as a fair-use cap.
 *  - Rate limiting is in-memory per serverless instance (best effort).
 *    Worst case under instance churn a determined user gets a few
 *    extra Haiku calls — pennies. Don't add a DB table for this.
 *  - No ANTHROPIC_API_KEY → UNAVAILABLE. The UI hides the panel when
 *    the page-level flag says the key is absent, so users only see
 *    this code path during a key rotation gone wrong.
 */

import { z } from "zod";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { DEAL_QA_LIMITS, DEAL_QA_SYSTEM_PROMPT } from "@/lib/deal-qa";
import {
  buildGroundedDealContext,
  dealQaExtraContextSchema,
} from "@/lib/deal-qa-context";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const inputSchema = z.object({
  question: z.string().trim().min(2).max(DEAL_QA_LIMITS.questionChars),
  values: investmentFormSchema,
  /** Optional client-side grounding depth (buy box / MAO / projection /
   *  comps). Size-bounded by the schema; omitted pieces are fine. */
  context: dealQaExtraContextSchema.optional(),
});

export type DealQaResult =
  | { ok: true; answer: string; remainingToday: number | null }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "RATE_LIMITED" | "UNAVAILABLE" | "SERVER_ERROR";
      message: string;
    };

// ── In-memory per-day rate limit ─────────────────────────────────────
type Counter = { day: string; count: number };
const usage = new Map<string, Counter>();

function takeToken(key: string, limit: number): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const current = usage.get(key);
  const counter = current && current.day === today ? current : { day: today, count: 0 };
  if (counter.count >= limit) return { allowed: false, remaining: 0 };
  counter.count += 1;
  usage.set(key, counter);
  // Opportunistic cleanup so the map can't grow unbounded on a
  // long-lived instance.
  if (usage.size > 5000) {
    for (const [k, v] of usage) {
      if (v.day !== today) usage.delete(k);
    }
  }
  return { allowed: true, remaining: limit - counter.count };
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
        limit: isPaid ? DEAL_QA_LIMITS.pro : DEAL_QA_LIMITS.free,
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
  return { key: `ip:${ip}`, limit: DEAL_QA_LIMITS.free, isPaid: false };
}

export async function askDealQuestionAction(input: unknown): Promise<DealQaResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Deal Q&A isn't configured right now.",
    };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid question or deal data." };
  }

  const caller = await resolveCallerKeyAndLimit();
  const token = takeToken(caller.key, caller.limit);
  if (!token.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: caller.isPaid
        ? "Daily fair-use limit reached. Try again tomorrow."
        : "You've used today's free questions. Pro includes unlimited Deal Q&A.",
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
        // Haiku: fast + cheap; a grounded-numbers explainer doesn't
        // need a frontier model. Override via env for experiments.
        model: process.env.DEAL_QA_MODEL ?? "claude-haiku-4-5-20251001",
        max_tokens: 400,
        // buildGroundedDealContext emits its own section headers
        // ("THE DEAL", "YOUR BUY BOX", ..., "NOT PROVIDED").
        system: `${DEAL_QA_SYSTEM_PROMPT}\n\n${context}`,
        messages: [{ role: "user", content: parsed.data.question }],
      }),
      // Generous but bounded — Vercel function timeout is the real cap.
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[deal-qa] Anthropic API ${res.status}: ${body.slice(0, 200)}`);
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Couldn't get an answer right now. Please try again.",
      };
    }

    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const answer = (json.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!answer) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Couldn't get an answer right now. Please try again.",
      };
    }

    return {
      ok: true,
      answer,
      // null = effectively unlimited from the UI's perspective.
      remainingToday: caller.isPaid ? null : token.remaining,
    };
  } catch (error) {
    console.warn("[deal-qa] askDealQuestionAction failed:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Couldn't get an answer right now. Please try again.",
    };
  }
}
