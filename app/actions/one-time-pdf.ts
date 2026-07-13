"use server";

/**
 * One-time lender PDF purchase — Stripe Checkout in `payment` mode.
 *
 * Replaces the old mailto + "delivery within 1 business day" flow on
 * /pricing with a fully automated path:
 *
 *   1. User runs a (free) analysis, clicks Export PDF without Pro.
 *   2. PdfPurchaseDialog offers Pro or this $5 one-time purchase.
 *   3. createOneTimePdfCheckoutAction() → Stripe Checkout redirect.
 *      The form values are stashed in localStorage by the client
 *      before redirecting (no DB involved — anonymous buyers welcome).
 *   4. Stripe redirects back to /?pdf_purchase=<session_id>.
 *   5. verifyOneTimePdfPaymentAction() confirms payment server-side,
 *      then the client restores the stashed deal, re-runs the analysis,
 *      and generates the full PDF locally (jsPDF is client-side).
 *
 * No webhook or migration needed: verification is a server-side
 * retrieve of the Checkout Session. Re-using a paid session id only
 * re-unlocks the same already-paid download — harmless.
 *
 * Auth is intentionally NOT required: the one-time PDF is the product
 * for people who don't want an account or subscription.
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe/client";

/**
 * Live $5 one-time price (product prod_UfuK45gdTuqmxw, created
 * 2026-06-09). Env var wins so the price can be rotated from Vercel
 * without a deploy; the fallback keeps the feature working with zero
 * manual env setup.
 */
const ONE_TIME_PDF_PRICE_FALLBACK = "price_1TgYY33yTn6y2v95pIAe2ABs";

function getOneTimePdfPriceId(): string {
  return process.env.STRIPE_PRICE_PDF_ONE_TIME ?? ONE_TIME_PDF_PRICE_FALLBACK;
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type OneTimePdfCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: "SERVER_ERROR"; message: string };

export async function createOneTimePdfCheckoutAction(): Promise<OneTimePdfCheckoutResult> {
  try {
    const stripe = getStripe();
    const siteUrl = getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: getOneTimePdfPriceId(), quantity: 1 }],
      // {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect.
      success_url: `${siteUrl}/?pdf_purchase={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?pdf_purchase=cancelled`,
      // The purpose marker is what verifyOneTimePdfPaymentAction checks,
      // so a session id from some other checkout flow can't unlock a PDF.
      metadata: { purpose: "one_time_pdf" },
    });
    if (!session.url) {
      console.error("[one-time-pdf] Stripe checkout session missing URL");
      return { ok: false, code: "SERVER_ERROR", message: "Unable to start checkout. Please try again." };
    }
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[one-time-pdf] createOneTimePdfCheckoutAction failed:", error);
    // Checkout-create failures are lost sales and console.error is
    // invisible in prod — page on them (same treatment as billing.ts).
    Sentry.captureException(error, {
      tags: { feature: "billing-checkout" },
      extra: { flow: "one_time_pdf" },
    });
    return { ok: false, code: "SERVER_ERROR", message: "Unable to start checkout. Please try again." };
  }
}

const verifySchema = z.object({
  // Checkout Session ids look like cs_live_… / cs_test_…
  sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/),
});

export type OneTimePdfVerifyResult =
  | { ok: true }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "NOT_PAID" | "SERVER_ERROR";
      message: string;
    };

export async function verifyOneTimePdfPaymentAction(
  input: unknown
): Promise<OneTimePdfVerifyResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid checkout session." };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
    if (session.metadata?.purpose !== "one_time_pdf") {
      return { ok: false, code: "VALIDATION_ERROR", message: "Invalid checkout session." };
    }
    if (session.payment_status !== "paid") {
      return {
        ok: false,
        code: "NOT_PAID",
        message: "Payment not completed. If you were charged, contact hello@usetruecap.com.",
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("[one-time-pdf] verifyOneTimePdfPaymentAction failed:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Could not verify payment. Please try again or contact hello@usetruecap.com.",
    };
  }
}
