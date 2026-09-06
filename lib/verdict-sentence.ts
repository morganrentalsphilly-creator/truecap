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
  // Keep the stored recommendation mapped so stale/unknown values still fail
  // through the canonical display boundary. It is deliberately not used to
  // infer a user decision or an offer instruction.
  verdictDisplay(input.recommendation);
  const price =
    typeof input.purchasePrice === "number" && input.purchasePrice > 0
      ? input.purchasePrice
      : null;
  const offer =
    typeof input.maxOffer === "number" && input.maxOffer > 0 ? input.maxOffer : null;
  // Both numbers known — state the modeled relationship, never an instruction
  // to buy, offer, pursue, or pass.
  if (price && offer) {
    const gap = Math.round(price - offer);
    if (gap > 0) {
      return {
        text: `Asking is ${money(gap)} above the modeled Offer Ceiling of ${money(offer)}.`,
        hasOffer: true,
      };
    }
    return {
      text:
        gap < 0
          ? `Asking is ${money(Math.abs(gap))} below the modeled Offer Ceiling of ${money(offer)}.`
          : `Asking equals the modeled Offer Ceiling of ${money(offer)}.`,
      hasOffer: true,
    };
  }

  // Price only (Free tier, or the solver found no supported ceiling).
  if (price) {
    return {
      text: `Review your targets and assumptions at the ${money(price)} asking price.`,
      hasOffer: false,
    };
  }

  return { text: "Review your targets and assumptions.", hasOffer: false };
}
