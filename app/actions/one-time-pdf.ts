"use server";

/**
 * Browser-bound, deal-bound one-time Deal Decision Pack checkout.
 *
 * Security contract:
 *   1. The validated deal is fingerprinted server-side before checkout.
 *   2. A 256-bit claim secret is returned only in the Server Action response
 *      and stored by the initiating tab in sessionStorage.
 *   3. Stripe returns with a NON-SECRET claim UUID, never a Checkout Session
 *      id. An early layout bootstrap removes that UUID before analytics load.
 *   4. Redemption requires the claim UUID, binding secret, exact validated
 *      deal, optional initiating Supabase identity, and a paid Stripe session.
 *   5. The DB update consumes the claim atomically. The same bound browser may
 *      retry for 24 hours so a transient local jsPDF failure does not strand a
 *      paying customer; copied URLs and Stripe Session ids cannot redeem it.
 *
 * Anonymous buyers remain supported. The server-only claim ledger stores no
 * plaintext address or financial inputs, only a cryptographic fingerprint.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe/client";
import { withTrueCapCheckoutBranding } from "@/lib/stripe/checkout-branding";
import {
  retrieveDecisionPackStripeAccess,
  type DecisionPackAccessDecision,
} from "@/lib/stripe/decision-pack-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  INVESTCALC_SCHEMA_VERSION,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import {
  ONE_TIME_PDF_CLAIM_LIFETIME_MS,
  decideOneTimePdfClaimBinding,
  fingerprintOneTimePdfDeal,
  fingerprintOneTimePdfReportBinding,
  hashOneTimePdfClaimSecret,
} from "@/lib/one-time-pdf-claims";
import {
  resolveLegacyCompatibleOneTimePdfReportBinding,
  resolveOneTimePdfReportBinding,
  type OneTimePdfReportBinding,
} from "@/lib/one-time-pdf-report-binding";
import { evaluateOneTimePdfProCredit } from "@/lib/one-time-pdf-credit";
import {
  buildPackCreditPolicy,
  PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS,
} from "@/lib/pack-credit";
import { schedulePackCreditEmails } from "@/lib/email/pack-credit-emails";
import { createIpRateLimit, getRequestIp } from "@/lib/ip-rate-limit";
import { decisionPackCheckoutEnabled } from "@/lib/decision-pack-checkout-gate";

/** Existing production $5 price; experiments require their own configured id. */
const ONE_TIME_PDF_PRICE_FALLBACK = "price_1TgYY33yTn6y2v95pIAe2ABs";

function getOneTimePdfPriceId(): string | null {
  const { singleDealPriceVariant, singleDeal } = getMarketingOfferConfig();
  const configured = process.env[singleDeal.stripeEnvKey]?.trim();
  if (configured) return configured;
  return singleDealPriceVariant === "current" ? ONE_TIME_PDF_PRICE_FALLBACK : null;
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    // Browser binding remains authoritative for anonymous buyers. An auth
    // lookup outage must not silently turn a paid claim into a bearer token.
    return null;
  }
}

const createCheckoutSchema = z
  .object({
    values: releasedInvestmentFormSchema,
    maxOfferTarget: z.unknown(),
    maxOfferTargetSource: z.enum([
      "buy-box",
      "screening-defaults",
      "starter-criteria",
      "selected-targets",
    ]),
  })
  .strict();

function normalizeClaimReportBinding(
  input: {
    values: InvestmentFormValues;
    maxOfferTarget?: unknown;
    maxOfferTargetSource?: unknown;
  },
  options: { allowLegacyDefault: boolean } = { allowLegacyDefault: false }
): OneTimePdfReportBinding | null {
  return resolveOneTimePdfReportBinding(input, options);
}

export type OneTimePdfCheckoutResult =
  | { ok: true; url: string; claim: { id: string; secret: string } }
  | {
      ok: false;
      code: "FEATURE_DISABLED" | "VALIDATION_ERROR" | "MISSING_PRICE" | "SERVER_ERROR";
      message: string;
    };

/**
 * Anonymous by design (a visitor can buy the Pack without an account), which
 * also means this action's id ships in the public bundle and is callable in a
 * loop with no cookie. Each call created a real Stripe Checkout Session AND a
 * ledger row, so an unauthenticated caller could pollute the Stripe dashboard
 * and grow the claims table without ever paying. The cap is far above any
 * human purchase pace.
 */
const checkoutRateLimit = createIpRateLimit({
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 20,
});

export async function createOneTimePdfCheckoutAction(
  input: unknown
): Promise<OneTimePdfCheckoutResult> {
  // This is the authoritative shutdown boundary. It intentionally executes
  // before validation, rate limiting, Stripe initialization, or database
  // access, so a direct Server Action call cannot create a Session or ledger
  // row while the Pack is disabled. Existing paid-claim recovery remains live.
  if (!decisionPackCheckoutEnabled()) {
    return {
      ok: false,
      code: "FEATURE_DISABLED",
      message: "One-time reports are temporarily unavailable. TrueCap Pro still includes PDF reports.",
    };
  }

  const parsed = createCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Run a valid analysis before purchasing its report.",
    };
  }
  const reportBinding = normalizeClaimReportBinding(parsed.data);
  if (!reportBinding) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Run a valid analysis before purchasing its report.",
    };
  }

  if (checkoutRateLimit.isOverLimit(await getRequestIp())) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Too many checkout attempts. Please wait a few minutes and try again.",
    };
  }

  let createdStripeSessionId: string | null = null;
  let stripeClient: ReturnType<typeof getStripe> | null = null;
  try {
    const stripe = getStripe();
    stripeClient = stripe;
    // Instantiate before creating a hosted checkout. If the service-role
    // configuration is absent, fail before an unusable Stripe session exists.
    const admin = createAdminSupabaseClient();
    const siteUrl = getSiteUrl();
    const offer = getMarketingOfferConfig();
    const priceId = getOneTimePdfPriceId();
    if (!priceId) {
      Sentry.captureMessage("Deal Decision Pack experiment is missing its Stripe Price", {
        level: "error",
        tags: { feature: "billing-checkout" },
        extra: { variant: offer.singleDealPriceVariant },
      });
      return {
        ok: false,
        code: "MISSING_PRICE",
        message: "This single-deal offer is temporarily unavailable. Please try Pro or contact support.",
      };
    }
    const claimId = randomUUID();
    const claimSecret = randomBytes(32).toString("base64url");
    const claimSecretHash = hashOneTimePdfClaimSecret(claimSecret);
    const dealFingerprint = fingerprintOneTimePdfDeal(parsed.data.values, claimSecret);
    const reportFingerprint = fingerprintOneTimePdfReportBinding(
      parsed.data.values,
      reportBinding.target,
      reportBinding.source,
      claimSecret
    );
    const checkoutCreatedAt = new Date();
    const expiresAt = new Date(
      checkoutCreatedAt.getTime() + ONE_TIME_PDF_CLAIM_LIFETIME_MS
    );
    const userId = await getCurrentUserId();

    const session = await stripe.checkout.sessions.create(withTrueCapCheckoutBranding({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // This public lookup id is useless without the separately-held browser
      // secret and the exact deal that was purchased.
      success_url: `${siteUrl}/?pdf_claim=${encodeURIComponent(claimId)}`,
      cancel_url: `${siteUrl}/?pdf_purchase=cancelled`,
      client_reference_id: claimId,
      metadata: {
        purpose: "one_time_pdf",
        offer: "single_deal_underwrite",
        price_variant: offer.singleDealPriceVariant,
        claim_id: claimId,
      },
    }));
    createdStripeSessionId = session.id;

    if (!session.url) throw new Error("Stripe checkout session missing URL");

    const { error: ledgerError } = await admin
      .from("one_time_pdf_purchase_claims")
      .insert({
        id: claimId,
        checkout_session_id: session.id,
        claim_secret_hash: claimSecretHash,
        deal_fingerprint: dealFingerprint,
        report_fingerprint: reportFingerprint,
        deal_schema_version: INVESTCALC_SCHEMA_VERSION,
        user_id: userId,
        price_variant: offer.singleDealPriceVariant,
        checkout_created_at: checkoutCreatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        // Explicitly dormant. This release records immutable purchase facts
        // on redemption but does not promise or apply a Pro credit.
        pro_credit_status: "not_configured",
      });

    if (ledgerError) {
      Sentry.captureMessage("One-time PDF claim ledger insert failed", {
        level: "error",
        tags: { feature: "one-time-pdf", stage: "claim-ledger-insert" },
        extra: { database_code: ledgerError.code ?? "unknown" },
      });
      // The browser has not received the Checkout URL yet, so expiring it is
      // safe and prevents a payment that the app could not later honor.
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        // Sentry above already pages the actionable ledger failure.
      }
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Secure checkout is temporarily unavailable. Please try again.",
      };
    }

    return {
      ok: true,
      url: session.url,
      claim: { id: claimId, secret: claimSecret },
    };
  } catch (error) {
    if (createdStripeSessionId && stripeClient) {
      try {
        await stripeClient.checkout.sessions.expire(createdStripeSessionId);
      } catch {
        // The primary error below is already reported; expiration is a
        // best-effort guard for a checkout URL the browser never received.
      }
    }
    Sentry.captureException(error, {
      tags: { feature: "billing-checkout", flow: "one_time_pdf" },
      extra: { stripe_session_created: createdStripeSessionId !== null },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to start secure checkout. Please try again.",
    };
  }
}

const verifySchema = z
  .object({
    claimId: z.string().uuid(),
    claimSecret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    values: releasedInvestmentFormSchema,
    // Both fields are absent only for claims created by the pre-binding client.
    // The shared resolver maps that exact legacy shape to historical defaults.
    maxOfferTarget: z.unknown().optional(),
    maxOfferTargetSource: z.enum([
      "buy-box",
      "screening-defaults",
      "starter-criteria",
      "selected-targets",
    ]).optional(),
  })
  .strict();

type ClaimRow = {
  id: string;
  checkout_session_id: string;
  claim_secret_hash: string;
  deal_fingerprint: string;
  report_fingerprint: string | null;
  user_id: string | null;
  price_variant: string | null;
  expires_at: string;
  consumed_at: string | null;
  pro_credit_status: string | null;
  pro_credit_amount_cents: number | null;
  pro_credit_eligible_until: string | null;
};

export type OneTimePdfProCreditSummary = {
  amountCents: number;
  eligibleUntil: string;
};

/** A claim's still-live credit, for surfacing post-purchase. */
function liveProCredit(
  row: Pick<
    ClaimRow,
    "pro_credit_status" | "pro_credit_amount_cents" | "pro_credit_eligible_until"
  >,
  now: Date = new Date()
): OneTimePdfProCreditSummary | undefined {
  if (
    row.pro_credit_status !== "eligible" ||
    !row.pro_credit_amount_cents ||
    !row.pro_credit_eligible_until ||
    Date.parse(row.pro_credit_eligible_until) <= now.getTime()
  ) {
    return undefined;
  }
  return {
    amountCents: row.pro_credit_amount_cents,
    eligibleUntil: row.pro_credit_eligible_until,
  };
}

type KnownPriceVariant = "current" | "p9" | "p15" | "p19";

function knownPriceVariant(value: string | null | undefined): KnownPriceVariant | undefined {
  return value === "current" || value === "p9" || value === "p15" || value === "p19"
    ? value
    : undefined;
}

function successfulVerification(
  row: Pick<ClaimRow, "id" | "price_variant">,
  recovered: boolean,
  proCredit?: OneTimePdfProCreditSummary
): OneTimePdfVerifyResult {
  const priceVariant = knownPriceVariant(row.price_variant);
  return {
    ok: true,
    claimId: row.id,
    recovered,
    ...(priceVariant ? { priceVariant } : {}),
    ...(proCredit ? { proCredit } : {}),
  };
}

export type OneTimePdfVerifyResult =
  | {
      ok: true;
      claimId: string;
      recovered: boolean;
      priceVariant?: KnownPriceVariant;
      /** Present when this purchase carries a live credit toward Pro. */
      proCredit?: OneTimePdfProCreditSummary;
    }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "NOT_PAID"
        | "ACCESS_SUSPENDED"
        | "ACCESS_REVOKED"
        | "BINDING_MISMATCH"
        | "IDENTITY_MISMATCH"
        | "EXPIRED"
        | "ALREADY_REDEEMED"
        | "SERVER_ERROR";
      message: string;
    };

type BindingFailureCode =
  | "BINDING_MISMATCH"
  | "IDENTITY_MISMATCH"
  | "EXPIRED"
  | "ALREADY_REDEEMED";

function bindingFailureResult(code: BindingFailureCode): OneTimePdfVerifyResult {
  const messages = {
    BINDING_MISMATCH:
      "This purchase does not match this browser and deal. Return to the tab that started checkout or contact hello@usetruecap.com.",
    IDENTITY_MISMATCH:
      "Sign in with the account that started this purchase, then retry verification.",
    EXPIRED:
      "This secure report claim has expired. Contact hello@usetruecap.com with your checkout email.",
    ALREADY_REDEEMED:
      "This one-time report was already redeemed. Contact hello@usetruecap.com if the download failed.",
  } as const;
  return { ok: false, code, message: messages[code] };
}

function stripeAccessFailureResult(
  decision: Exclude<DecisionPackAccessDecision, { state: "allowed" }>
): OneTimePdfVerifyResult {
  switch (decision.state) {
    case "invalid":
      return { ok: false, code: "VALIDATION_ERROR", message: "Invalid secure report claim." };
    case "not_paid":
      return {
        ok: false,
        code: "NOT_PAID",
        message:
          "Payment is not confirmed yet. Retry shortly, or contact hello@usetruecap.com if you were charged.",
      };
    case "suspended":
      return {
        ok: false,
        code: "ACCESS_SUSPENDED",
        message:
          "Report access is paused while a payment dispute is unresolved. Contact hello@usetruecap.com for help.",
      };
    case "revoked":
      return {
        ok: false,
        code: "ACCESS_REVOKED",
        message:
          "Report access is no longer available because this payment was refunded or a dispute was lost. Contact hello@usetruecap.com if this looks incorrect.",
      };
    case "unavailable":
      return {
        ok: false,
        code: "SERVER_ERROR",
        message:
          "Could not confirm the payment's current status. Please retry or contact hello@usetruecap.com.",
      };
  }
}

async function loadClaim(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  claimId: string
): Promise<{ row: ClaimRow | null; errorCode?: string }> {
  const { data, error } = await admin
    .from("one_time_pdf_purchase_claims")
    .select(
      "id, checkout_session_id, claim_secret_hash, deal_fingerprint, report_fingerprint, user_id, price_variant, expires_at, consumed_at, pro_credit_status, pro_credit_amount_cents, pro_credit_eligible_until"
    )
    .eq("id", claimId)
    .maybeSingle();
  if (error) return { row: null, errorCode: error.code ?? "unknown" };
  return { row: (data as ClaimRow | null) ?? null };
}

/**
 * Existing claims created before report_fingerprint shipped are bound once,
 * at their first successful consumption/recovery. The database trigger permits
 * only null -> value in that lifecycle window and makes the value immutable.
 */
async function ensureClaimReportBinding(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  row: ClaimRow,
  expectedFingerprint: string
): Promise<boolean> {
  if (row.report_fingerprint) {
    return row.report_fingerprint === expectedFingerprint;
  }
  if (!row.consumed_at) return true;

  const { data, error } = await admin
    .from("one_time_pdf_purchase_claims")
    .update({ report_fingerprint: expectedFingerprint })
    .eq("id", row.id)
    .eq("claim_secret_hash", row.claim_secret_hash)
    .eq("consumed_at", row.consumed_at)
    .is("report_fingerprint", null)
    .select("report_fingerprint")
    .maybeSingle();
  if (error) return false;
  if (data?.report_fingerprint === expectedFingerprint) return true;

  // A simultaneous recovery may have won the null -> value race. It is safe
  // only when it chose the same immutable report binding.
  const raced = await loadClaim(admin, row.id);
  return raced.row?.report_fingerprint === expectedFingerprint;
}

/**
 * Best-effort post-consumption bookkeeping: capture the Stripe buyer email
 * (pack checkout always collects one; the app previously discarded it) and,
 * when the pack-credit policy is configured, transition the claim
 * not_configured→eligible with the fields the DB state machine requires.
 *
 * MUST NEVER block the PDF: a paying customer's report outranks credit
 * bookkeeping, so every failure lands in Sentry and returns undefined. The
 * status guard on the update keeps retries inside the trigger-enforced state
 * machine, and a missing buyer_email column (migration not yet applied)
 * degrades to the credit-only update.
 */
async function recordPackPurchaseExtrasBestEffort(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  input: {
    claimId: string;
    paidAt: string;
    amountCents: number;
    currency: string;
    userId: string | null;
    buyerEmail: string | null;
  }
): Promise<OneTimePdfProCreditSummary | undefined> {
  try {
    const decision = evaluateOneTimePdfProCredit({
      purchase: {
        paidAt: input.paidAt,
        purchaseAmountCents: input.amountCents,
        purchaseCurrency: input.currency,
      },
      policy: buildPackCreditPolicy(),
    });

    // Grant ONLY what redemption can actually deliver (review findings
    // 2026-08-17): findEligiblePackCredit matches claims bound to a signed-in
    // user AND worth exactly the configured $5 coupon. An anonymous purchase
    // or a price-experiment variant therefore stays 'not_configured' — no
    // credit row, no promise emails, no toast — instead of promising an
    // automatic credit checkout can never attach.
    const grantable =
      decision.status === "eligible" &&
      Boolean(input.userId) &&
      decision.amountCents === PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS;
    const creditFields =
      decision.status === "eligible" && grantable
        ? {
            pro_credit_status: "eligible",
            pro_credit_policy_version: decision.policyVersion,
            pro_credit_amount_cents: decision.amountCents,
            pro_credit_eligible_until: decision.eligibleUntil,
            pro_credit_user_id: input.userId,
          }
        : {};
    const emailFields = input.buyerEmail ? { buyer_email: input.buyerEmail } : {};
    if (Object.keys(creditFields).length === 0 && Object.keys(emailFields).length === 0) {
      return undefined;
    }

    const applyUpdate = (fields: Record<string, unknown>) =>
      admin
        .from("one_time_pdf_purchase_claims")
        .update(fields)
        .eq("id", input.claimId)
        .eq("pro_credit_status", "not_configured");

    let { error } = await applyUpdate({ ...creditFields, ...emailFields });
    // Missing buyer_email column (migration 20260817180000 not applied yet):
    // PostgREST surfaces it as PGRST204 (schema cache) or 42703 (raw SQL).
    // Grant the credit alone rather than losing both writes.
    if (
      (error?.code === "PGRST204" || error?.code === "42703") &&
      Object.keys(creditFields).length > 0 &&
      Object.keys(emailFields).length > 0
    ) {
      ({ error } = await applyUpdate(creditFields));
    }
    if (error) {
      Sentry.captureMessage("Pack purchase credit/email bookkeeping failed", {
        level: "error",
        tags: { feature: "one-time-pdf", stage: "pack-credit-grant" },
        extra: { database_code: error.code ?? "unknown" },
      });
      return undefined;
    }

    if (decision.status !== "eligible" || !grantable) return undefined;

    // Credit countdown emails (day 0 + day 5) — idempotent because a claim
    // consumes exactly once; only reached when the credit really exists AND
    // is redeemable by this (signed-in) buyer.
    if (input.buyerEmail) {
      await schedulePackCreditEmails({
        email: input.buyerEmail,
        amountCents: decision.amountCents,
        eligibleUntil: decision.eligibleUntil,
      });
    }
    return { amountCents: decision.amountCents, eligibleUntil: decision.eligibleUntil };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "one-time-pdf", stage: "pack-credit-grant" },
    });
    return undefined;
  }
}

export async function verifyOneTimePdfPaymentAction(
  input: unknown
): Promise<OneTimePdfVerifyResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid secure report claim." };
  }
  const submittedReportBinding = normalizeClaimReportBinding(parsed.data, {
    allowLegacyDefault: true,
  });
  if (!submittedReportBinding) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid secure report claim." };
  }

  try {
    const admin = createAdminSupabaseClient();
    const currentUserId = await getCurrentUserId();
    const dealFingerprint = fingerprintOneTimePdfDeal(
      parsed.data.values,
      parsed.data.claimSecret
    );
    const initial = await loadClaim(admin, parsed.data.claimId);
    if (initial.errorCode) {
      Sentry.captureMessage("One-time PDF claim ledger read failed", {
        level: "error",
        tags: { feature: "one-time-pdf", stage: "claim-ledger-read" },
        extra: { database_code: initial.errorCode },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not verify payment. Please retry in a moment.",
      };
    }
    if (!initial.row) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Invalid secure report claim." };
    }

    // A null fingerprint proves this row predates target-aware checkout. Bind
    // it only to the canonical target/source the historical Pack actually used;
    // a holder may not turn migration recovery into a new target selection.
    const reportBinding = initial.row.report_fingerprint
      ? submittedReportBinding
      : resolveLegacyCompatibleOneTimePdfReportBinding(parsed.data);
    if (!reportBinding) return bindingFailureResult("BINDING_MISMATCH");
    const reportFingerprint = fingerprintOneTimePdfReportBinding(
      parsed.data.values,
      reportBinding.target,
      reportBinding.source,
      parsed.data.claimSecret
    );

    const firstDecision = decideOneTimePdfClaimBinding({
      record: {
        claimSecretHash: initial.row.claim_secret_hash,
        dealFingerprint: initial.row.deal_fingerprint,
        userId: initial.row.user_id,
        expiresAt: initial.row.expires_at,
        consumedAt: initial.row.consumed_at,
      },
      providedSecret: parsed.data.claimSecret,
      dealFingerprint,
      currentUserId,
    });
    if (!firstDecision.ok) return bindingFailureResult(firstDecision.code);
    if (
      initial.row.report_fingerprint &&
      initial.row.report_fingerprint !== reportFingerprint
    ) {
      return bindingFailureResult("BINDING_MISMATCH");
    }

    // Checkout's `payment_status` remains paid after a refund. Re-read the
    // current Session, Charge refund totals, and Dispute states for EVERY
    // first redemption and bounded recovery before releasing access.
    const stripe = getStripe();
    const stripeAccess = await retrieveDecisionPackStripeAccess(
      stripe,
      initial.row.checkout_session_id,
      initial.row.id
    );
    if (stripeAccess.state !== "allowed") {
      return stripeAccessFailureResult(stripeAccess);
    }
    const session = stripeAccess.session;

    if (firstDecision.mode === "bound-recovery") {
      if (!(await ensureClaimReportBinding(admin, initial.row, reportFingerprint))) {
        return bindingFailureResult("BINDING_MISMATCH");
      }
      // Credit (if any) was granted when the claim was first consumed;
      // re-surface it so a retried download still shows the offer.
      return successfulVerification(initial.row, true, liveProCredit(initial.row));
    }
    if (
      !Number.isInteger(session.amount_total) ||
      (session.amount_total ?? 0) <= 0 ||
      !session.currency ||
      !/^[a-z]{3}$/i.test(session.currency)
    ) {
      Sentry.captureMessage("Paid one-time PDF session has invalid purchase facts", {
        level: "error",
        tags: { feature: "one-time-pdf", stage: "stripe-payment-facts" },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Payment was found but the report could not be released. Contact hello@usetruecap.com.",
      };
    }

    const consumedAt = new Date().toISOString();
    let consumeQuery = admin
      .from("one_time_pdf_purchase_claims")
      .update({
        user_id: initial.row.user_id ?? currentUserId,
        paid_at: consumedAt,
        consumed_at: consumedAt,
        purchase_amount_cents: session.amount_total,
        purchase_currency: session.currency.toLowerCase(),
        // New rows are already bound at checkout. This also atomically binds
        // a pre-migration row to the first report target/source it consumes.
        report_fingerprint: reportFingerprint,
      })
      .eq("id", initial.row.id)
      .eq("claim_secret_hash", initial.row.claim_secret_hash)
      .eq("deal_fingerprint", initial.row.deal_fingerprint)
      .gt("expires_at", consumedAt)
      .is("consumed_at", null);
    consumeQuery = initial.row.report_fingerprint
      ? consumeQuery.eq(
          "report_fingerprint",
          initial.row.report_fingerprint
        )
      : consumeQuery.is("report_fingerprint", null);
    const { data: consumedRows, error: consumeError } = await consumeQuery
      .select("id, price_variant, report_fingerprint");

    if (consumeError) {
      Sentry.captureMessage("One-time PDF atomic claim consumption failed", {
        level: "error",
        tags: { feature: "one-time-pdf", stage: "claim-consume" },
        extra: { database_code: consumeError.code ?? "unknown" },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Payment was confirmed but the secure report could not be released. Please retry.",
      };
    }

    const consumed = (
      consumedRows as Array<Pick<ClaimRow, "id" | "price_variant">> | null
    )?.[0];
    if (consumed) {
      const proCredit = await recordPackPurchaseExtrasBestEffort(admin, {
        claimId: consumed.id,
        paidAt: consumedAt,
        amountCents: session.amount_total as number,
        currency: session.currency.toLowerCase(),
        userId: initial.row.user_id ?? currentUserId,
        buyerEmail: session.customer_details?.email ?? null,
      });
      return successfulVerification(consumed, false, proCredit);
    }

    // Another request won the atomic consume race. Re-read and allow only the
    // same browser/deal through the bounded recovery policy.
    const raced = await loadClaim(admin, initial.row.id);
    if (raced.errorCode || !raced.row) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not confirm secure report release. Please retry.",
      };
    }
    const racedDecision = decideOneTimePdfClaimBinding({
      record: {
        claimSecretHash: raced.row.claim_secret_hash,
        dealFingerprint: raced.row.deal_fingerprint,
        userId: raced.row.user_id,
        expiresAt: raced.row.expires_at,
        consumedAt: raced.row.consumed_at,
      },
      providedSecret: parsed.data.claimSecret,
      dealFingerprint,
      currentUserId,
    });
    if (!racedDecision.ok) return bindingFailureResult(racedDecision.code);
    if (racedDecision.mode !== "bound-recovery") {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not confirm secure report release. Please retry.",
      };
    }
    if (!(await ensureClaimReportBinding(admin, raced.row, reportFingerprint))) {
      return bindingFailureResult("BINDING_MISMATCH");
    }
    return successfulVerification(raced.row, true, liveProCredit(raced.row));
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "one-time-pdf", stage: "verify" },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not verify payment. Please try again or contact hello@usetruecap.com.",
    };
  }
}

// Keeps the validated input type visible to action consumers without exposing
// the server-only ledger implementation to the browser bundle.
export type OneTimePdfBoundDeal = InvestmentFormValues;
