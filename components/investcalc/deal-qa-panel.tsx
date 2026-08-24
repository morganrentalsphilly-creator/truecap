"use client";

/**
 * "Ask about this deal" - compact Q&A card rendered under the
 * recommendation row in the analysis dashboard.
 *
 * Design constraints (deliberate):
 *  - One input, three suggested-question chips, answers inline. No new
 *    tab, no modal, nothing to learn.
 *  - Everyone gets a few free questions/day (limit enforced server-
 *    side); the panel surfaces the upsell only when the limit hits.
 *  - Conversation is per-analysis, in-memory only - editing the form
 *    and re-running clears it (the parent remounts us via key), which
 *    is correct: old answers describe old numbers.
 */

import { useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ArrowUp, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import Link from "next/link";
import { askDealQuestionAction } from "@/app/actions/deal-qa";
import { trackEvent } from "@/lib/analytics";
import type { DealQaExtraContext } from "@/lib/deal-qa-context";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

const SUGGESTED_QUESTIONS = [
  "What would make this a stronger deal?",
  "What are the biggest risks here?",
  "Explain the DSCR like I'm new to this.",
];

type Turn = { question: string; answer: string };

export function DealQaPanel({
  values,
  context,
}: {
  values: InvestmentFormValues;
  /** Optional grounding depth (buy box / Offer Ceiling / projection / comps) already
   *  computed on the dashboard — forwarded with each question so answers
   *  can reference the user's own criteria. Absent pieces are omitted. */
  context?: DealQaExtraContext;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  // Suggested chips: personal variants lead when their grounding exists
  // ("Why does this miss my buy box?" only makes sense once a buy box was
  // actually evaluated), then the static staples fill the remaining slots.
  // Always exactly 3 chips — the card's design constraint.
  const suggestedQuestions = useMemo(() => {
    const personal: string[] = [];
    if (context?.buyBox) {
      personal.push(
        context.buyBox.passes
          ? "How much margin does this deal have vs my buy box?"
          : "Why does this deal miss my buy box?"
      );
    }
    if (context?.mao) personal.push("Is asking above the modeled Offer Ceiling?");
    return [...personal, ...SUGGESTED_QUESTIONS].slice(0, 3);
  }, [context]);

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isAsking) return;
    setIsAsking(true);
    setNotice(null);
    trackEvent("deal_qa_asked", { question_length: trimmed.length });
    try {
      const result = await askDealQuestionAction({ question: trimmed, values, context });
      if (result.ok) {
        // Clear the input only once an answer is in hand. Clearing before the
        // await meant any failure (rate limit, server error, a thrown/rejected
        // action) wiped the typed question with nothing to show for it — the
        // user had to retype to retry, and a failed answer effectively burned
        // their attempt. On every non-success path below the question stays put.
        setQuestion("");
        setTurns((prev) => [...prev.slice(-7), { question: trimmed, answer: result.answer }]);
        if (result.remainingToday !== null && result.remainingToday <= 1) {
          setNotice(
            result.remainingToday === 0
              ? "That was your last free question today."
              : "1 free question left today."
          );
        }
      } else if (result.code === "RATE_LIMITED") {
        setLimitHit(true);
      } else {
        setNotice(result.message);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: "deal-qa" } });
      setNotice("Couldn't get an answer right now. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircleQuestion className="size-4" />
          </span>
          Ask about this deal
          {/* Pill hidden below sm - the AI summary card renders directly
              above with the identical Beta pill; one flag covers the pair
              on phones. */}
          <span className="hidden rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground sm:inline">
            Beta
          </span>
        </p>
      </div>

      {/* Conversation */}
      {turns.length > 0 && (
        <div className="mt-3 space-y-3">
          {turns.map((t, i) => (
            <div key={`${i}-${t.question.slice(0, 24)}`} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">{t.question}</p>
              <p className="whitespace-pre-line rounded-xl bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground">
                {t.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Suggested chips - hidden once a conversation is going */}
      {turns.length === 0 && !limitHit && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isAsking}
              onClick={() => void ask(q)}
              // py-2 on mobile lifts the chip to a ~40px tap target;
              // tightens to py-1.5 on desktop where pointers are precise.
              className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary disabled:opacity-50 sm:py-1.5"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Limit upsell */}
      {limitHit ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-foreground">
            You&apos;ve used today&apos;s free questions. Pro includes unlimited Deal Q&amp;A on
            every analysis.
          </p>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <Sparkles className="size-3.5" />
            See Pro
          </Link>
        </div>
      ) : (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="e.g. What rent would make this cash-flow $300/mo?"
            disabled={isAsking}
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base md:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isAsking || question.trim().length < 2}
            aria-label="Ask"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition disabled:opacity-40"
          >
            {isAsking ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </form>
      )}

      {notice && <p className="mt-2 text-[11px] text-muted-foreground">{notice}</p>}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
        Answers are generated from this analysis&apos;s numbers only. Not financial advice.
      </p>
    </div>
  );
}
