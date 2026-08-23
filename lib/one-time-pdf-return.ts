/**
 * Browser handoff constants for the one-time PDF Stripe redirect.
 *
 * The purchase claim id in the return URL is deliberately non-secret, while
 * its high-entropy binding secret lives only in same-tab sessionStorage.
 * An inline bootstrap generated here runs before analytics scripts and moves
 * even legacy `pdf_purchase=cs_...` values out of the address bar immediately.
 */
export const ONE_TIME_PDF_RETURN_KEY = "truecap:one-time-pdf-return-v2";
export const ONE_TIME_PDF_DRAFT_KEY = "truecap:one-time-pdf-draft-v2";
export const ONE_TIME_PDF_LEGACY_DRAFT_KEY = "truecap:one-time-pdf-draft";
export const ONE_TIME_PDF_ACTIVE_CLAIM_KEY = "truecap:one-time-pdf-active-claim";

export function oneTimePdfClaimSecretKey(claimId: string): string {
  return `truecap:one-time-pdf-claim:${claimId}`;
}

/** Decode the versioned same-tab secret envelope written before Checkout. */
export function parseOneTimePdfClaimSecret(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return value.v === 1 &&
      typeof value.secret === "string" &&
      /^[A-Za-z0-9_-]{43}$/.test(value.secret)
      ? value.secret
      : null;
  } catch {
    return null;
  }
}

export type OneTimePdfReturnState =
  | { v: 2; kind: "claim"; claimId: string; capturedAt: number }
  | { v: 2; kind: "cancelled"; capturedAt: number }
  | { v: 2; kind: "legacy"; capturedAt: number };

export function parseOneTimePdfReturnState(raw: string | null): OneTimePdfReturnState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.v !== 2 || typeof value.capturedAt !== "number") return null;
    if (
      value.kind === "claim" &&
      typeof value.claimId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(value.claimId)
    ) {
      return {
        v: 2,
        kind: "claim",
        claimId: value.claimId,
        capturedAt: value.capturedAt,
      };
    }
    if (value.kind === "cancelled" || value.kind === "legacy") {
      return { v: 2, kind: value.kind, capturedAt: value.capturedAt };
    }
  } catch {
    // Corrupt storage is treated as absent and removed by the caller.
  }
  return null;
}

/**
 * Executes during HTML parsing, before GTM/gtag/PostHog/Vercel Analytics.
 * The legacy Checkout Session id is intentionally NOT copied into storage:
 * it used to be a reusable bearer capability and is now failed closed.
 */
export function oneTimePdfReturnBootstrapScript(): string {
  return `(function(){try{var u=new URL(window.location.href);var c=u.searchParams.get('pdf_claim');var p=u.searchParams.get('pdf_purchase');if(!c&&!p)return;var r=c?{v:2,kind:'claim',claimId:c,capturedAt:Date.now()}:p==='cancelled'?{v:2,kind:'cancelled',capturedAt:Date.now()}:{v:2,kind:'legacy',capturedAt:Date.now()};try{window.sessionStorage.setItem(${JSON.stringify(ONE_TIME_PDF_RETURN_KEY)},JSON.stringify(r));}catch(_storageError){}u.searchParams.delete('pdf_claim');u.searchParams.delete('pdf_purchase');window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}catch(_error){try{var q=new URLSearchParams(window.location.search);q.delete('pdf_claim');q.delete('pdf_purchase');window.history.replaceState(window.history.state,'',window.location.pathname+(q.toString()?'?'+q.toString():'')+window.location.hash);}catch(_ignored){}}})();`;
}
