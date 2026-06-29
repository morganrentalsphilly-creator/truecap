import "server-only";

/**
 * Tamper-proofing for a share link's OWNER ATTRIBUTION (co-branding + lead
 * capture + the owner's saved comps).
 *
 * A /d/[encoded] payload carries meta.ownerId + meta.dealId, but the payload is
 * just base64 of JSON — anyone can decode it, swap in another user's id, and
 * re-encode to wrap a deal in that user's brand and harvest leads to them. So
 * the sharer's server mints an HMAC over {ownerId, dealId, valuesHash} at share
 * time, and the public viewer must verify it before trusting those fields.
 *
 * - valuesHash binds the signature to THIS deal's numbers, so a real signature
 *   can't be lifted onto a different (e.g. doctored) analysis.
 * - SHARE_LINK_SECRET is the key. If it's unset, signing + verification both
 *   no-op (return null / false) and co-branding simply stays off — fail-safe.
 * - Timing-safe comparison; never throws (best-effort, like the branding read).
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Deterministic short digest of the deal values (recursively key-sorted so it
 *  is stable across JSON round-trips). */
export function hashShareValues(values: InvestmentFormValues): string {
  const canonical = stableStringify(values);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 24);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function payloadString(ownerId: string, dealId: string | null | undefined, valuesHash: string): string {
  return `${ownerId}.${dealId ?? ""}.${valuesHash}`;
}

/** Mint the signature. Returns null when SHARE_LINK_SECRET is unset (→ the
 *  caller omits meta.sig and the share renders generic). */
export function signShareAttribution(input: {
  ownerId: string;
  dealId?: string | null;
  valuesHash: string;
}): string | null {
  const secret = process.env.SHARE_LINK_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(payloadString(input.ownerId, input.dealId, input.valuesHash))
    .digest("hex");
}

/** Verify a signature against the (re-derived) attribution. False when the
 *  secret is unset, the sig is absent/malformed, or it doesn't match. */
export function verifyShareAttribution(input: {
  ownerId?: string | null;
  dealId?: string | null;
  valuesHash: string;
  sig?: string | null;
}): boolean {
  const secret = process.env.SHARE_LINK_SECRET;
  if (!secret || !input.ownerId || !input.sig) return false;
  const expected = createHmac("sha256", secret)
    .update(payloadString(input.ownerId, input.dealId, input.valuesHash))
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(input.sig, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
