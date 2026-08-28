import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { isAllCashDownPayment } from "@/lib/financing-classification";
import {
  maoTargetFingerprint,
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { buildMaoTarget } from "@/lib/mao-targets";

type ExternalTargetSourceVerification = {
  /** The exact browser/snapshot target paired with the claimed source. */
  target: unknown;
  /** Released inputs let the server derive the one canonical starter target. */
  values: Pick<InvestmentFormValues, "downPaymentPct">;
};

function matchesCanonicalStarterCriteria(
  verification: ExternalTargetSourceVerification | undefined,
): boolean {
  if (!verification) return false;
  const isCashPurchase = isAllCashDownPayment(
    verification.values.downPaymentPct,
  );
  const submitted = normalizeMaoTargetForFinancing(
    normalizeMaoTarget(verification.target),
    { isCashPurchase },
  );
  if (!submitted) return false;
  const canonical = buildMaoTarget(null, { isCashPurchase });
  return maoTargetFingerprint(submitted) === maoTargetFingerprint(canonical);
}

/**
 * A browser or owner-writable saved JSON object can choose targets, but it
 * cannot prove those targets came from a server-owned Buy Box. It also cannot
 * call arbitrary targets "TrueCap starter criteria" or "screening defaults":
 * either product-owned label survives only when released inputs let this
 * boundary derive and match the exact canonical target. Everything else uses
 * honest selected-target provenance.
 */
export function normalizeExternalOfferCeilingTargetSource(
  value: unknown,
  verification?: ExternalTargetSourceVerification,
): OfferCeilingTargetSource | null {
  const normalized = normalizeOfferCeilingTargetSource(value);
  if (!normalized) return null;
  if (normalized === "buy-box") return "selected-targets";
  if (
    normalized === "starter-criteria" ||
    normalized === "screening-defaults"
  ) {
    return matchesCanonicalStarterCriteria(verification)
      ? normalized
      : "selected-targets";
  }
  return normalized;
}
