import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  markSubscriptionCanceled,
  upsertSubscriptionFromStripe,
} from "@/lib/stripe/subscription-sync";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existing) {
    const { error: insertErr } = await admin.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      type: event.type,
    });
    if (insertErr?.code === "23505") {
      const { data: race } = await admin
        .from("stripe_webhook_events")
        .select("processed_at")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      if (race?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else if (insertErr) {
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscriptionFromStripe(admin, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await markSubscriptionCanceled(admin, event.data.object as Stripe.Subscription);
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
