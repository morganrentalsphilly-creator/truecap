import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  markSubscriptionCanceled,
  upsertSubscriptionFromInvoice,
  upsertSubscriptionFromInvoicePayment,
  upsertSubscriptionFromStripe,
} from "@/lib/stripe/subscription-sync";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { error: claimError } = await admin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
  });

  if (claimError?.code === "23505") {
    // The event row already exists. This can mean either:
    //   (a) we processed it successfully before (processed_at IS NOT NULL)
    //   (b) a previous attempt failed and Stripe is retrying
    //       (processed_at IS NULL, usually error_message IS NOT NULL)
    // Without checking, every Stripe retry of a previously-failed event
    // would short-circuit here and the failure would be permanent — the
    // user's subscription state would silently drift. Re-attempt
    // processing when processed_at is null.
    const { data: existing } = await admin
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (existing?.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Fall through to retry processing for events with processed_at=null.
  } else if (claimError) {
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(admin, session);
        // PostHog funnel event — fires once per successful checkout.
        // `pro_subscribed` is the bottom of the conversion funnel.
        // distinct_id is the Supabase user.id stored in client_reference_id
        // (set by the billing action when the checkout session was created),
        // which links this event to all the anonymous browse + analyzer
        // events from the same user's earlier sessions.
        const distinctId =
          session.client_reference_id ||
          session.metadata?.user_id ||
          (typeof session.customer === "string" ? session.customer : null);
        if (distinctId) {
          // Don't block the webhook response on PostHog — its flush is
          // awaited but capped to a few seconds by the SDK, and errors
          // are swallowed inside captureServerEvent so they can't
          // corrupt the webhook idempotency contract.
          await captureServerEvent({
            distinctId,
            event: "pro_subscribed",
            properties: {
              plan_slug: session.metadata?.plan_slug ?? undefined,
              amount_total: session.amount_total ?? undefined,
              currency: session.currency ?? undefined,
              stripe_session_id: session.id,
              stripe_customer_id:
                typeof session.customer === "string" ? session.customer : undefined,
            },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.pending_update_applied":
      case "customer.subscription.pending_update_expired":
      case "customer.subscription.trial_will_end":
        await upsertSubscriptionFromStripe(admin, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const cancelledSub = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(admin, cancelledSub);
        const cancelDistinctId =
          cancelledSub.metadata?.user_id ??
          (typeof cancelledSub.customer === "string" ? cancelledSub.customer : null);
        if (cancelDistinctId) {
          await captureServerEvent({
            distinctId: cancelDistinctId,
            event: "subscription_cancelled",
            properties: {
              stripe_subscription_id: cancelledSub.id,
              stripe_customer_id:
                typeof cancelledSub.customer === "string" ? cancelledSub.customer : undefined,
            },
          });
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await upsertSubscriptionFromInvoice(admin, event.data.object as Stripe.Invoice);
        break;
      case "invoice_payment.paid":
        await upsertSubscriptionFromInvoicePayment(admin, event.data.object as Stripe.InvoicePayment);
        break;
      case "checkout.session.expired": {
        // User started checkout but didn't complete it within Stripe's
        // 24-hour expiration window. Send a recovery email with a
        // discount code. Industry data: ~15-25% of abandoned checkouts
        // can be recovered with a same-day email + small discount.
        //
        // No-ops gracefully on any missing data: if the session has no
        // captured email (rare but possible if the user closed the tab
        // before entering one), or if RESEND_API_KEY isn't set, we just
        // log a warning and move on. Webhook still returns 200.
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email ??
          session.customer_email ??
          null;
        if (email) {
          try {
            await sendAbandonedCheckoutEmail(email, session);
          } catch (err) {
            // Recovery email failure — non-critical (we keep returning
            // 200 so Stripe doesn't retry the whole webhook), but worth
            // surfacing to Sentry so systemic failures (Resend down,
            // template breakage) are visible. Previously console.warn
            // only, which meant silent failure in production logs.
            console.warn(
              "[stripe-webhook] abandoned-checkout email failed:",
              err instanceof Error ? err.message : String(err)
            );
            Sentry.captureException(err, {
              tags: { feature: "abandoned-checkout-email" },
              extra: { stripe_session_id: session.id, has_email: true },
            });
          }
        }
        // PostHog event so the funnel shows the drop-off.
        const abandonDistinctId =
          session.client_reference_id ||
          session.metadata?.user_id ||
          (typeof session.customer === "string" ? session.customer : null);
        if (abandonDistinctId) {
          await captureServerEvent({
            distinctId: abandonDistinctId,
            event: "checkout_abandoned",
            properties: {
              stripe_session_id: session.id,
              had_email: email != null,
            },
          });
        }
        break;
      }
      default:
        break;
    }

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error_message: null })
      .eq("stripe_event_id", event.id);
  } catch (e) {
    // Webhook handler failure — a real risk for subscription state
    // drift. Previously the only record was the error_message stored in
    // stripe_webhook_events; you'd only find out by querying that table
    // or noticing a user complaint about their subscription being wrong.
    // Sentry capture with tags + event metadata makes this visible at a
    // glance, and the existing error_message + processed_at retry path
    // still works (Stripe sees 500, retries, and the next attempt
    // re-runs the handler via the "processed_at IS NULL" branch above).
    const message = e instanceof Error ? e.message : String(e);
    Sentry.captureException(e, {
      tags: { feature: "stripe-webhook", endpoint: "webhooks" },
      extra: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
      },
    });
    await admin.from("stripe_webhook_events").update({ error_message: message }).eq("stripe_event_id", event.id);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Abandoned-checkout recovery email. Sent via Resend transactional API
 * when Stripe fires a `checkout.session.expired` webhook. Uses inline
 * HTML rather than a React Email template so this file has no React
 * dependency in the Node runtime path.
 *
 * The discount code (default: EXIT50) must exist in your Stripe
 * Dashboard. Override via env var ABANDONED_CART_COUPON_CODE.
 */
async function sendAbandonedCheckoutEmail(
  toEmail: string,
  _session: Stripe.Checkout.Session
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[stripe-webhook] RESEND_API_KEY missing — skipping abandoned-cart email");
    return;
  }
  const from = process.env.EMAIL_FROM || "TrueCap <hello@usetruecap.com>";
  const couponCode = process.env.ABANDONED_CART_COUPON_CODE || "EXIT50";
  const pricingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com"}/pricing?coupon=${couponCode}`;

  const subject = "You almost upgraded — here's 50% off";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;margin-top:32px;border:1px solid #e5e7eb;">
    <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#111827;line-height:1.2;">
      You almost upgraded.
    </h1>
    <p style="margin:0 0 16px 0;color:#374151;line-height:1.6;font-size:15px;">
      You started checkout for TrueCap Pro but didn't quite get there. No worries — life happens.
    </p>
    <p style="margin:0 0 24px 0;color:#374151;line-height:1.6;font-size:15px;">
      We saved your spot. Here's <strong style="color:#5248D4;">50% off your first year</strong> to make finishing easier:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${pricingUrl}" style="display:inline-block;background:#5248D4;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">
        Finish upgrading — 50% off
      </a>
    </div>
    <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px;text-align:center;">
      Code <strong style="color:#111827;">${couponCode}</strong> auto-applies. Cancel anytime.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px 0;">
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
      Got questions? Just reply to this email — I read every one.<br>
      — Morgan, founder, TrueCap
    </p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:11px;margin:24px 0;">
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://usetruecap.com"}" style="color:#9ca3af;">usetruecap.com</a>
  </p>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      reply_to: process.env.EMAIL_REPLY_TO || "hello@usetruecap.com",
    }),
    // 10s timeout — Stripe gives webhook handlers ~30s before it
    // declares failure and retries, so we want to fail fast on a
    // hanging Resend connection rather than risk the whole webhook
    // timing out and being retried unnecessarily.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}
