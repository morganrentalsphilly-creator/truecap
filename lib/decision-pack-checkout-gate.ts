/**
 * Fail-closed availability contract for NEW Deal Decision Pack checkouts.
 *
 * Re-enabling requires two independent, exact opt-ins:
 *   1. the existing public product-release flag; and
 *   2. a server-only checkout switch.
 *
 * Existing paid claims and report recovery do not use this helper. The switch
 * prevents creation of new Stripe Checkout Sessions only.
 */

const ENABLED_VALUES = new Set(["1", "true", "enabled"]);

function explicitlyEnabled(value: string | null | undefined): boolean {
  return typeof value === "string" && ENABLED_VALUES.has(value.trim().toLowerCase());
}

export function decisionPackCheckoutEnabled(input?: {
  publicReleaseFlag?: string | null;
  serverCheckoutFlag?: string | null;
}): boolean {
  const publicReleaseFlag = input
    ? input.publicReleaseFlag
    : process.env.NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK;
  const serverCheckoutFlag = input
    ? input.serverCheckoutFlag
    : process.env.TRUECAP_DECISION_PACK_CHECKOUT_ENABLED;

  return explicitlyEnabled(publicReleaseFlag) && explicitlyEnabled(serverCheckoutFlag);
}
