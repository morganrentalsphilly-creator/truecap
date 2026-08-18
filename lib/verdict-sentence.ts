/**
 * The results-page verdict as an imperative SENTENCE.
 *
 * The old hero rendered a verdict chip ("Pass") and left the reader to work
 * out what to do about it. This composes the same values into an instruction:
 * what to do, at what price, versus what they were asked to pay.
 *
 * PURE + DISPLAY-ONLY. Every number is passed in already computed — this
 * module never solves a Max Offer, never scores, never rounds a value into a
 * different number than the card above it shows.
 */

import { verdictDisplay } from "@/lib/verdict-display";

export type VerdictSentenceInput = {
  /** INTERNAL recommendation value ("Strong Buy" … "Avoid"). */
  recommendation: string | null | undefined;
  /** Asking / entered purchase price. */
  purchasePrice: number | null | undefined;
  /** Solved Max Offer, when available (Pro; null on Free or unsolvable). */
  maxOffer: number | null | undefined;
};

export type VerdictSentence = {
  /** The imperative sentence. Always present. */
  text: string;
  /** True when the sentence names a Max Offer (drives emphasis). */
  hasOffer: boolean;
};

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function buildVerdictSentence(input: VerdictSentenceInput): VerdictSentence {
  const display = verdictDisplay(input.recommendation);
  const price =
    typeof input.purchasePrice === "number" && input.purchasePrice > 0
      ? input.purchasePrice
      : null;
  const offer =
    typeof input.maxOffer === "number" && input.maxOffer > 0 ? input.maxOffer : null;
  const negative = display.tone === "negative" || display.tone === "caution";

  // Both numbers known — the full instruction, including the gap.
  if (price && offer) {
    const gap = Math.round(price - offer);
    if (negative) {
      return {
        text: `Don't buy at ${money(price)}. Offer ${money(offer)} or walk.`,
        hasOffer: true,
      };
    }
    if (gap > 0) {
      return {
        text: `${display.label}. Your max offer is ${money(offer)} — ${money(gap)} below asking.`,
        hasOffer: true,
      };
    }
    // Solver clears at or above asking: the deal works at the asking price.
    return {
      text: `${display.label}. It clears your targets at the ${money(price)} asking price.`,
      hasOffer: true,
    };
  }

  // Price only (Free tier, or the solver found no price that clears).
  if (price) {
    return {
      text: negative
        ? `Don't buy at ${money(price)} on these numbers.`
        : `${display.label} at ${money(price)}.`,
      hasOffer: false,
    };
  }

  // Nothing but the verdict — still phrased as a decision, never a category.
  return { text: `${display.label}.`, hasOffer: false };
}
