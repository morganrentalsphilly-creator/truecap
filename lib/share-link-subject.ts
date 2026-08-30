import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingDecisionBasis } from "@/lib/offer-ceiling-decision-basis";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { saveIntentDraftFingerprint } from "@/lib/save-intent";

export type ShareLinkSubject = {
  values: InvestmentFormValues | null;
  savedDealId?: string | null;
  maoTarget?: MaoTarget | null;
  maoTargetSource?: OfferCeilingTargetSource | null;
  adoptedDecisionBasis?: OfferCeilingDecisionBasis | null;
  priceIsEstimated: boolean;
  context: "analysis" | "client-report";
  analyzerStrategyKey?: AnalyzerStrategyKey | null;
  isAuthenticated: boolean;
  /** Exact browser-verified owner. Hashed into the in-memory fingerprint only. */
  authenticatedUserId?: string | null;
  /** Increments whenever the browser auth identity changes or is invalidated. */
  authSessionEpoch: number;
};

/**
 * Privacy-safe, deterministic identity for every input that can change the
 * opaque share minted by the button. The digest is kept only in memory and
 * never exposes an address or financial assumption to a URL or telemetry.
 */
export function shareLinkSubjectFingerprint(
  subject: ShareLinkSubject,
): string {
  return (
    saveIntentDraftFingerprint({
      version: 1,
      values: subject.values,
      savedDealId: subject.savedDealId ?? null,
      maoTarget: subject.maoTarget ?? null,
      maoTargetSource: subject.maoTargetSource ?? null,
      adoptedDecisionBasis: subject.adoptedDecisionBasis ?? null,
      priceIsEstimated: subject.priceIsEstimated,
      context: subject.context,
      analyzerStrategyKey: subject.analyzerStrategyKey ?? null,
      isAuthenticated: subject.isAuthenticated,
      authenticatedUserId: subject.authenticatedUserId ?? null,
      authSessionEpoch: subject.authSessionEpoch,
    }) ?? "invalid-share-subject"
  );
}
