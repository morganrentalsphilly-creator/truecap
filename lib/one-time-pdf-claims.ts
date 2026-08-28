import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";

export const ONE_TIME_PDF_CLAIM_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const ONE_TIME_PDF_RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Recovery ends at the earlier of claim expiry and 24h after consumption. */
export function isOneTimePdfRecoveryAllowed(input: {
  consumedAt: string;
  expiresAt: string;
  nowMs?: number;
}): boolean {
  const consumedAtMs = Date.parse(input.consumedAt);
  const expiresAtMs = Date.parse(input.expiresAt);
  const nowMs = input.nowMs ?? Date.now();
  if (!Number.isFinite(consumedAtMs) || !Number.isFinite(expiresAtMs)) {
    return false;
  }
  return (
    nowMs >= consumedAtMs &&
    nowMs <=
      Math.min(
        expiresAtMs,
        consumedAtMs + ONE_TIME_PDF_RECOVERY_WINDOW_MS
      )
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

/**
 * PII-opaque binding to the exact validated deal inputs. Keying the digest
 * with the separate 256-bit browser secret prevents an exposed ledger from
 * being dictionary-attacked with guessed addresses/prices.
 */
export function fingerprintOneTimePdfDeal(
  values: InvestmentFormValues,
  claimSecret: string
): string {
  return createHmac("sha256", claimSecret)
    .update(stableStringify(values))
    .digest("hex");
}

/**
 * Bind a Pack purchase to the exact report decision the buyer saw at
 * checkout, not just the property's form inputs. Without the target and its
 * provenance in this digest, the same consumed claim could be replayed with
 * different Offer Ceiling criteria during the recovery window.
 */
export function fingerprintOneTimePdfReportBinding(
  values: InvestmentFormValues,
  maxOfferTarget: MaoTarget,
  maxOfferTargetSource: OfferCeilingTargetSource,
  claimSecret: string
): string {
  return createHmac("sha256", claimSecret)
    .update(
      stableStringify({
        values,
        maxOfferTarget,
        maxOfferTargetSource,
      })
    )
    .digest("hex");
}

/** Store only a one-way digest of the browser-bound redemption secret. */
export function hashOneTimePdfClaimSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function claimSecretMatches(secret: string, storedHash: string): boolean {
  const candidate = hashOneTimePdfClaimSecret(secret);
  try {
    const left = Buffer.from(candidate, "hex");
    const right = Buffer.from(storedHash, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export type OneTimePdfClaimBindingRecord = {
  claimSecretHash: string;
  dealFingerprint: string;
  userId: string | null;
  expiresAt: string;
  consumedAt: string | null;
};

export type OneTimePdfClaimBindingDecision =
  | { ok: true; mode: "consume" | "bound-recovery" }
  | {
      ok: false;
      code: "BINDING_MISMATCH" | "IDENTITY_MISMATCH" | "EXPIRED" | "ALREADY_REDEEMED";
    };

/**
 * Pure policy gate used before every Stripe lookup and again after an atomic
 * update race. A consumed claim is never consumed twice; the same bound
 * browser may only recover for 24 hours so a failed local jsPDF download does
 * not strand a paying customer.
 */
export function decideOneTimePdfClaimBinding(input: {
  record: OneTimePdfClaimBindingRecord;
  providedSecret: string;
  dealFingerprint: string;
  currentUserId: string | null;
  now?: Date;
}): OneTimePdfClaimBindingDecision {
  const nowMs = (input.now ?? new Date()).getTime();
  if (
    !claimSecretMatches(input.providedSecret, input.record.claimSecretHash) ||
    input.dealFingerprint !== input.record.dealFingerprint
  ) {
    return { ok: false, code: "BINDING_MISMATCH" };
  }

  if (input.record.userId && input.currentUserId !== input.record.userId) {
    return { ok: false, code: "IDENTITY_MISMATCH" };
  }

  if (input.record.consumedAt) {
    if (isOneTimePdfRecoveryAllowed({
      consumedAt: input.record.consumedAt,
      expiresAt: input.record.expiresAt,
      nowMs,
    })) {
      return { ok: true, mode: "bound-recovery" };
    }
    return { ok: false, code: "ALREADY_REDEEMED" };
  }

  const expiresAtMs = Date.parse(input.record.expiresAt);
  if (!Number.isFinite(expiresAtMs) || nowMs > expiresAtMs) {
    return { ok: false, code: "EXPIRED" };
  }

  return { ok: true, mode: "consume" };
}

/** Just the identity fields; keeps this lib free of the PDF/report types. */
export type ClaimedReportIdentity = {
  property: { address: string; purchasePrice: number };
  units?: Array<{ rent?: number | null }> | null;
};
export type ClaimedFormIdentity = {
  address?: string | null;
  purchasePrice?: number | null;
  units?: Array<{ monthlyRent?: number | null } | null | undefined> | null;
};

/**
 * Does the report we are about to RENDER describe the same property the claim
 * was bought for?
 *
 * THE BUG THIS CLOSES: the fingerprint below is computed over `claim.values`,
 * but the document is composed from `parsed.data.report` — two independent
 * client-supplied objects that nothing compared. A buyer could keep the claim
 * for the deal they actually paid for and post any other report alongside it,
 * turning one Decision Pack purchase into unlimited paid PDFs for arbitrary properties,
 * signed out, for the life of the claim. The comment on the fingerprint check
 * asserted exactly the property the code did not enforce.
 *
 * Comparison only — this reads values, it never recomputes or alters one.
 * Deliberately compares IDENTITY, not the whole document: the report legitimately
 * carries derived figures the form does not (projections, scores, comps), and
 * the buyer is entitled to re-render their own deal after the engine changes.
 */
export function reportMatchesClaimedDeal(
  report: ClaimedReportIdentity,
  values: ClaimedFormIdentity
): boolean {
  const normalizeAddress = (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalizeAddress(report.property.address) !== normalizeAddress(values.address ?? "")) {
    return false;
  }
  if (Math.round(report.property.purchasePrice) !== Math.round(Number(values.purchasePrice ?? 0))) {
    return false;
  }
  // Rent roll: the other lever big enough to make it a materially different
  // property. Totals, not per-unit, so unit re-ordering is not a false reject.
  const claimedRent = (values.units ?? []).reduce(
    (sum, u) => sum + Math.round(Number(u?.monthlyRent ?? 0)),
    0
  );
  const reportedRent = (report.units ?? []).reduce(
    (sum, u) => sum + Math.round(Number(u?.rent ?? 0)),
    0
  );
  // Single-family deals carry their rent outside `units` in the form, so only
  // enforce this when the claim actually has a unit-level rent roll.
  if (claimedRent > 0 && claimedRent !== reportedRent) return false;
  return true;
}
