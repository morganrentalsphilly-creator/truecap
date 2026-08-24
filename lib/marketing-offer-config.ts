/**
 * Marketing offer configuration.
 *
 * These switches change positioning and presentation only. Subscription
 * checkout still resolves its price from STRIPE_PRICE_PRO_MONTHLY /
 * STRIPE_PRICE_PRO_ANNUAL, and the single-deal checkout refuses to start an
 * experiment unless the matching Stripe Price id is configured server-side.
 * That separation prevents a copy test from silently changing billing.
 *
 * NEXT_PUBLIC_* values are intentionally read here because this module is
 * shared by server and client components. They are build-time configuration,
 * never secrets.
 */

export const HOMEPAGE_HEADLINES = {
  decision_system: "Paste an address. Review what matters. Underwrite the rental.",
  a: "Screen a rental and compare asking with its target-dependent Offer Ceiling.",
  b: "See how a rental models under the assumptions shown.",
  walkaway: "Review the Offer Ceiling and the targets that produced it.",
  // Retain the legacy key so an old environment value cannot break the build,
  // but serve qualified decision language instead of an absolute outcome
  // claim.
  never_overpay: "Review the highest modeled price that meets your selected targets.",
} as const;

export type HomepageHeadlineVariant = keyof typeof HOMEPAGE_HEADLINES;

export const PRO_OFFER_NAMES = {
  pro: "TrueCap Pro",
  offer_engine: "TrueCap Offer Engine",
} as const;

export type ProOfferNameVariant = keyof typeof PRO_OFFER_NAMES;

export const SINGLE_DEAL_PRICE_OPTIONS = {
  current: {
    amount: 5,
    priceLabel: "$5",
    stripeEnvKey: "STRIPE_PRICE_PDF_ONE_TIME",
  },
  p9: {
    amount: 9,
    priceLabel: "$9",
    stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_9",
  },
  p15: {
    amount: 15,
    priceLabel: "$15",
    stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_15",
  },
  p19: {
    amount: 19,
    priceLabel: "$19",
    stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_19",
  },
} as const;

export type SingleDealPriceVariant = keyof typeof SINGLE_DEAL_PRICE_OPTIONS;

function pickVariant<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function enabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function safePublicUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function getMarketingOfferConfig() {
  // Underwriting-first positioning is the production default. Keep an
  // explicit false/off kill switch for rollback.
  const positioningOverride = process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING;
  const newHomepagePositioningEnabled = positioningOverride == null
    ? true
    : enabled(positioningOverride);
  const homepageHeadlineVariant = newHomepagePositioningEnabled
    ? "decision_system"
    : pickVariant(
        process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE,
        ["a", "b", "never_overpay"] as const,
        "a"
      );
  const proOfferNameVariant = pickVariant(
    process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME,
    ["pro", "offer_engine"] as const,
    "pro"
  );
  const singleDealPriceVariant = pickVariant(
    process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT,
    ["current", "p9", "p15", "p19"] as const,
    "current"
  );

  // A published terms route is necessary but does not substantiate the net
  // impression of an absolute performance claim. Keep this promise dark by
  // default; production must opt in only after the exact marketing claim and
  // refund operations have a dated approval artifact. The old DISABLED switch
  // remains an emergency kill switch for already-configured environments.
  const guaranteeTermsUrl =
    safePublicUrl(process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL) ??
    "/guarantee";
  // Fail closed regardless of stale deployment environment values. Re-enable
  // only with a separately reviewed policy + operations contract in code.
  const guaranteeEnabled = false;

  return {
    homepageHeadlineVariant,
    homepageHeadline: HOMEPAGE_HEADLINES[homepageHeadlineVariant],
    newHomepagePositioningEnabled,
    proOfferNameVariant,
    proOfferName: PRO_OFFER_NAMES[proOfferNameVariant],
    singleDealPriceVariant,
    singleDeal: SINGLE_DEAL_PRICE_OPTIONS[singleDealPriceVariant],
    guaranteeEnabled,
    guaranteeTermsUrl,
  } as const;
}
