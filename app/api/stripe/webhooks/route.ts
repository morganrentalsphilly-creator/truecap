import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
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
      default:
        break;
    }

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error_message: null })
      .eq("stripe_event_id", event.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("stripe_webhook_events").update({ error_message: message }).eq("stripe_event_id", event.id);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
