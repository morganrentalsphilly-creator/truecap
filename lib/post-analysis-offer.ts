const DEFAULT_POST_ANALYSIS_COUPON_CODE = "ANALYZE20";

type PostAnalysisOfferEnv = {
  POST_ANALYSIS_COUPON_CODE?: string;
  POST_ANALYSIS_COUPON_ID?: string;
};

export type PostAnalysisOfferConfig = {
  code: string;
  couponId: string | null;
  /** Marketing may promise the offer only when both values are explicit. */
  canSendPromotion: boolean;
};

export type PostAnalysisOfferResolution =
  | { kind: "none" }
  | { kind: "configured"; code: string; couponId: string }
  | { kind: "misconfigured"; code: string };

/**
 * One source of truth for the post-analysis campaign offer.
 *
 * The legacy ANALYZE20 code remains recognized so already-sent links fail
 * closed when Stripe configuration is missing. New promotional email is sent
 * only when both the public code and Stripe coupon id are explicitly present.
 */
export function getPostAnalysisOfferConfig(
  env: PostAnalysisOfferEnv = {
    POST_ANALYSIS_COUPON_CODE: process.env.POST_ANALYSIS_COUPON_CODE,
    POST_ANALYSIS_COUPON_ID: process.env.POST_ANALYSIS_COUPON_ID,
  }
): PostAnalysisOfferConfig {
  const explicitCode = env.POST_ANALYSIS_COUPON_CODE?.trim();
  const code = (explicitCode || DEFAULT_POST_ANALYSIS_COUPON_CODE).toUpperCase();
  const couponId = env.POST_ANALYSIS_COUPON_ID?.trim() || null;

  return {
    code,
    couponId,
    canSendPromotion: Boolean(explicitCode && couponId),
  };
}

export function resolvePostAnalysisOfferCoupon(
  offer: string | undefined,
  env: PostAnalysisOfferEnv = {
    POST_ANALYSIS_COUPON_CODE: process.env.POST_ANALYSIS_COUPON_CODE,
    POST_ANALYSIS_COUPON_ID: process.env.POST_ANALYSIS_COUPON_ID,
  }
): PostAnalysisOfferResolution {
  if (!offer) return { kind: "none" };

  const config = getPostAnalysisOfferConfig(env);
  if (offer.trim().toUpperCase() !== config.code) return { kind: "none" };
  if (!config.couponId) return { kind: "misconfigured", code: config.code };

  return { kind: "configured", code: config.code, couponId: config.couponId };
}
