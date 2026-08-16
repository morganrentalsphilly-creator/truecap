/**
 * Stateless share links.
 *
 * Encodes the analysis form snapshot into a URL-safe string the public
 * read-only view (/d/[encoded]) can decode and render. No database,
 * no RLS, no auth — anyone with the link can view the analysis.
 *
 * Trade-off vs a DB-backed share token: URLs are longer (~1-2 KB) but
 * the architecture is dead-simple and there's nothing to migrate or
 * keep in sync. We can replace this with short tokens later without
 * breaking existing links (we'd just keep both decoders working).
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Stable schema for what we encode in a share link. */
export type SharePayload = {
  v: 1; // version, so we can evolve without breaking old links
  values: InvestmentFormValues;
  /** Optional metadata for the public viewer. */
  meta?: {
    sharedAt?: string; // ISO timestamp
    title?: string;    // e.g. address for the page <title>
    /** The signed-in sharer's user id, when available. Lets the public
     *  viewer co-brand the page and route a captured lead to that owner
     *  (T6). Optional + additive — old v:1 links without it still decode. */
    ownerId?: string;
    /** The saved deal's id, when sharing a saved analysis. Lets the public
     *  viewer pull the deal's stored sale/rent comps (verified against
     *  ownerId). Optional + additive — old v:1 links still decode. */
    dealId?: string;
    /** HMAC over {ownerId, dealId, valuesHash}, minted server-side at share
     *  time (lib/share-attribution.ts). The public viewer must verify it
     *  before trusting ownerId/dealId for co-branding + comps — otherwise a
     *  hand-edited payload could impersonate any owner's brand and harvest
     *  leads. Optional + additive: old/unsigned links still decode, they just
     *  render the generic TrueCap view. */
    sig?: string;
  };
};

/**
 * Keep account-owned workflow references out of a public, reversible payload.
 * A template id belongs to the sharer; carrying it into a recipient's cloned
 * draft both exposes an internal identifier and makes a Free recipient's next
 * Save fail the template entitlement/ownership guard.
 */
export function sanitizeShareValues(
  values: InvestmentFormValues
): InvestmentFormValues {
  return { ...values, templateId: undefined };
}

/** URL-safe base64 (RFC 4648 §5): "+" → "-", "/" → "_", strip padding. */
function toBase64Url(input: string): string {
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  if (typeof window !== "undefined" && window.atob) {
    return decodeURIComponent(escape(window.atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function encodeShareLink(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  return toBase64Url(json);
}

export function decodeShareLink(encoded: string): SharePayload | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json) as SharePayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.v !== 1) return null;
    if (!parsed.values || typeof parsed.values !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Construct the absolute share URL from an encoded payload. */
export function buildShareUrl(encoded: string, base?: string): string {
  const origin =
    base ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://usetruecap.com");
  return `${origin.replace(/\/$/, "")}/d/${encoded}`;
}
