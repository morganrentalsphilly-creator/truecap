/**
 * <Verdict> — the ONLY component that renders a deal's verdict word.
 *
 * Replaces four duplicated label tables and three raw-enum leaks (the deal
 * workspace badge, the client portal a buyer sees, and the compare picker
 * row). If you need to show a verdict anywhere, render this; do not reach
 * for VERDICT_DISPLAY directly unless you need the string for a non-JSX
 * context (PDF, CSV, email, OG image).
 *
 * A11Y: every variant renders an icon AND text, so tone/colour is never the
 * only carrier of meaning. The visible label is the decision wording; an
 * sr-only prefix says "Verdict:" so a screen-reader user hears what the word
 * refers to without the surrounding visual context.
 *
 * Pure presentation — takes the INTERNAL recommendation value and maps it via
 * lib/verdict-display. It never computes a verdict.
 */

import { CheckCircle2, MinusCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VERDICT_TONE_CLASSES,
  verdictDisplay,
  type VerdictTone,
} from "@/lib/verdict-display";

const TONE_ICONS: Record<VerdictTone, typeof CheckCircle2> = {
  positive: CheckCircle2,
  neutral: MinusCircle,
  caution: AlertTriangle,
  negative: XCircle,
};

export type VerdictProps = {
  /** INTERNAL stored value: "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid". */
  recommendation: string | null | undefined;
  /**
   * badge   — default pill for lists, cards, tables.
   * compact — dense table cells and mobile pills (uses shortLabel).
   * hero    — the results-page headline treatment.
   */
  variant?: "badge" | "compact" | "hero";
  className?: string;
};

export function Verdict({ recommendation, variant = "badge", className }: VerdictProps) {
  const display = verdictDisplay(recommendation);
  const Icon = TONE_ICONS[display.tone];

  if (variant === "hero") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Icon aria-hidden className="size-6 shrink-0" />
        <span className="sr-only">Screening result: </span>
        <span>{display.label}</span>
      </span>
    );
  }

  const isCompact = variant === "compact";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        isCompact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        VERDICT_TONE_CLASSES[display.tone],
        className
      )}
    >
      <Icon aria-hidden className={isCompact ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
      <span className="sr-only">Screening result: </span>
      <span>{isCompact ? display.shortLabel : display.label}</span>
    </span>
  );
}
