import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export const ONE_TIME_PDF_CLAIM_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const ONE_TIME_PDF_RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    const consumedAtMs = Date.parse(input.record.consumedAt);
    if (
      Number.isFinite(consumedAtMs) &&
      nowMs >= consumedAtMs &&
      nowMs - consumedAtMs <= ONE_TIME_PDF_RECOVERY_WINDOW_MS
    ) {
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
