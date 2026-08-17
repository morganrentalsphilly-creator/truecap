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
  type SubscriptionSyncResult,
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

  if (!webhookSecret) {
    // Distinct from a signature failure: a missing STRIPE_WEBHOOK_SECRET is
    // OUR config emergency (env rotation mishap), not an attacker's bad
    // request. Per CLAUDE.md §6, a missing required var fails loudly: fatal
    // Sentry alert + 500 so Stripe keeps retrying while someone fixes env,
    // instead of a silent 400 that burns the 72h retry window.
    Sentry.captureMessage("STRIPE_WEBHOOK_SECRET missing — webhook pipeline down", {
      level: "fatal",
      tags: { feature: "stripe-webhook" },
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
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
    //
    // The re-attempt claim is ATOMIC (compare-and-swap on claimed_at, added
    // by migration 20260713120000): a plain select-then-fallthrough let a
    // Stripe retry of a still-in-flight first attempt process the same event
    // twice in parallel (double abandoned-cart email, double PostHog
    // events). Only the delivery whose UPDATE wins a row gets to reprocess;
    // a claim older than 60s is treated as a dead attempt and can be stolen.
    const staleClaimCutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: claimedRows, error: reclaimError } = await admin
      .from("stripe_webhook_events")
      .update({ claimed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id)
      .is("processed_at", null)
      .or(`claimed_at.is.null,claimed_at.lt.${staleClaimCutoff}`)
      .select("stripe_event_id");

    const claimColumnMissing =
      reclaimError != null && (reclaimError.code === "42703" || reclaimError.code === "PGRST204");

    if (claimColumnMissing) {
      // claimed_at doesn't exist yet (migration 20260713120000 not applied).
      // Fall back to the pre-migration select-then-fallthrough behavior so
      // nothing breaks before the column lands.
      const { data: existing, error: recheckError } = await admin
        .from("stripe_webhook_events")
        .select("processed_at")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      if (recheckError) {
        // A failed recheck falls through and reprocesses — safe (handlers
        // are idempotent) but it must be visible, not silently discarded.
        Sentry.captureException(recheckError, {
          tags: { feature: "stripe-webhook", stage: "claim-recheck" },
          extra: { stripe_event_id: event.id, stripe_event_type: event.type },
        });
      }
      if (existing?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Fall through to retry processing for events with processed_at=null.
    } else if (reclaimError) {
      Sentry.captureException(reclaimError, {
        tags: { feature: "stripe-webhook", stage: "claim-reclaim" },
        extra: { stripe_event_id: event.id, stripe_event_type: event.type },
      });
      return NextResponse.json({ error: "Failed to claim event" }, { status: 500 });
    } else if (!claimedRows || claimedRows.length === 0) {
      // We did not win the claim. Either the event is already processed
      // (→ 200 duplicate, Stripe should stop) or another delivery holds a
      // fresh in-flight claim (→ 500 so Stripe retries LATER; a 200 here
      // would seal the event as delivered even if the in-flight attempt
      // ultimately fails, since Stripe never retries after a 2xx).
      const { data: existing } = await admin
        .from("stripe_webhook_events")
        .select("processed_at")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      if (existing?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true });
      }
      return NextResponse.json({ error: "Event is already being processed" }, { status: 500 });
    }
    // Claim won — fall through to retry processing.
  } else if (claimError) {
    // Non-duplicate claim failure (Supabase outage, revoked grant, network):
    // the 500 is correct (Stripe retries), but without Sentry these events
    // leave NO trace anywhere app-side — no row, no alert — and can burn the
    // entire 72h retry window invisibly.
    Sentry.captureException(claimError, {
      tags: { feature: "stripe-webhook", stage: "claim" },
      extra: { stripe_event_id: event.id, stripe_event_type: event.type },
    });
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  // When a paid-event handler SKIPS syncing (a user-binding security
  // rejection — not retryable, so we still 200 to Stripe and still stamp
  // processed_at), record why on the stripe_webhook_events row as
  // error_message = 'skipped: <reason>' so skipped paying-money events stay
  // queryable instead of being indistinguishable from applied ones.
  let syncSkippedReason: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // One-time PDF purchases (anonymous `payment`-mode sessions, see
        // app/actions/one-time-pdf.ts) have no user/customer binding and
        // nothing to sync — the client verifies payment directly via
        // verifyOneTimePdfPaymentAction. Without this skip, every one-time
        // sale logged a spurious "[billing] checkout.session.completed
        // missing customer id" ERROR from the subscription handler.
        if (session.metadata?.purpose === "one_time_pdf") {
          console.log(`[billing] one-time PDF session ${session.id} completed — no subscription sync needed`);
          break;
        }
        const checkoutSyncResult = await handleCheckoutSessionCompleted(admin, session);
        syncSkippedReason = checkoutSyncResult.synced ? null : checkoutSyncResult.reason;
        // Pack credit redemption: the billing action stamped the eligible
        // claim id on the session; mark it applied so it can't be redeemed
        // twice. Best-effort — a failure here leaves the claim 'eligible'
        // (worst case: one extra $5 credit inside its 7-day window), which is
        // preferable to failing a successfully-synced subscription event.
        // The status guard keeps this inside the DB's credit state machine.
        if (checkoutSyncResult.synced && session.metadata?.pack_credit_claim_id) {
          const creditedUserId =
            session.client_reference_id || session.metadata?.user_id || null;
          const { error: creditApplyError } = await admin
            .from("one_time_pdf_purchase_claims")
            .update({
              pro_credit_status: "applied",
              pro_credit_applied_at: new Date().toISOString(),
              pro_credit_reference: session.id,
              ...(creditedUserId ? { pro_credit_user_id: creditedUserId } : {}),
            })
            .eq("id", session.metadata.pack_credit_claim_id)
            .eq("pro_credit_status", "eligible");
          if (creditApplyError) {
            Sentry.captureMessage("Pack credit eligible→applied transition failed", {
              level: "error",
              tags: { feature: "billing-webhook", stage: "pack-credit-apply" },
              extra: {
                claim_id: session.metadata.pack_credit_claim_id,
                database_code: creditApplyError.code ?? "unknown",
              },
            });
          } else if (creditedUserId) {
            await captureServerEvent({
              distinctId: creditedUserId,
              event: "pack_credit_applied",
              properties: {
                claim_id: session.metadata.pack_credit_claim_id,
                plan_slug: session.metadata?.plan_slug ?? undefined,
                stripe_session_id: session.id,
              },
            });
          }
        }
        // PostHog funnel event — fires once per successful checkout.
        // `pro_subscribed` is the bottom of the conversion funnel.
        // distinct_id is the Supabase user.id stored in client_reference_id
        // (set by the billing action when the checkout session was created),
        // which links this event to all the anonymous browse + analyzer
        // events from the same user's earlier sessions.
        // Skipped syncs (unverifiable binding) must NOT fire it — analytics
        // would report a conversion the DB doesn't have, masking the failure.
        const distinctId =
          session.client_reference_id ||
          session.metadata?.user_id ||
          (typeof session.customer === "string" ? session.customer : null);
        if (distinctId && checkoutSyncResult.synced) {
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
          await captureServerEvent({
            distinctId,
            event: "pro_subscription_started",
            properties: {
              plan_slug: session.metadata?.plan_slug ?? undefined,
              trial_granted: session.metadata?.trial_granted === "true",
              amount_total: session.amount_total ?? undefined,
              currency: session.currency ?? undefined,
              stripe_session_id: session.id,
            },
          });
          if (session.metadata?.trial_granted === "true") {
            await captureServerEvent({
              distinctId,
              event: "pro_trial_started",
              properties: {
                plan_slug: session.metadata?.plan_slug ?? undefined,
                stripe_session_id: session.id,
              },
            });
            await captureServerEvent({
              distinctId,
              event: "trial_started",
              properties: {
                plan_slug: session.metadata?.plan_slug ?? undefined,
                attribution_source: "stripe_checkout",
              },
            });
          } else {
            await captureServerEvent({
              distinctId,
              event: "paid_conversion",
              properties: {
                plan_slug: session.metadata?.plan_slug ?? undefined,
                amount_total: session.amount_total ?? undefined,
                currency: session.currency ?? undefined,
                attribution_source: "stripe_checkout",
              },
            });
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.pending_update_applied":
      case "customer.subscription.pending_update_expired":
      case "customer.subscription.trial_will_end": {
        // Stripe does NOT guarantee delivery order, and the processed_at-NULL
        // retry branch above makes reordering routine: a redelivered stale
        // payload (e.g. status=active from before a cancellation) would
        // last-write-wins over newer state and could resurrect a canceled
        // subscription to Pro forever. Re-retrieve current truth and sync
        // THAT — mirroring what upsertSubscriptionFromInvoice already does —
        // so every sync converges to live Stripe state regardless of order.
        const eventSubscription = event.data.object as Stripe.Subscription;
        let subscriptionSyncResult: SubscriptionSyncResult;
        try {
          const freshSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
          subscriptionSyncResult = await upsertSubscriptionFromStripe(admin, freshSubscription);
        } catch (err) {
          const stripeCode = (err as { code?: string } | null)?.code;
          if (stripeCode !== "resource_missing") throw err;
          // The subscription no longer exists in Stripe — treat as deleted.
          subscriptionSyncResult = await markSubscriptionCanceled(admin, eventSubscription);
        }
        syncSkippedReason = subscriptionSyncResult.synced ? null : subscriptionSyncResult.reason;
        break;
      }
      case "customer.subscription.deleted": {
        const cancelledSub = event.data.object as Stripe.Subscription;
        const cancelSyncResult = await markSubscriptionCanceled(admin, cancelledSub);
        syncSkippedReason = cancelSyncResult.synced ? null : cancelSyncResult.reason;
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
      case "invoice.payment_action_required": {
        const invoiceSyncResult = await upsertSubscriptionFromInvoice(
          admin,
          event.data.object as Stripe.Invoice
        );
        syncSkippedReason = invoiceSyncResult.synced ? null : invoiceSyncResult.reason;
        break;
      }
      case "invoice_payment.paid": {
        const invoicePaymentSyncResult = await upsertSubscriptionFromInvoicePayment(
          admin,
          event.data.object as Stripe.InvoicePayment
        );
        syncSkippedReason = invoicePaymentSyncResult.synced ? null : invoicePaymentSyncResult.reason;
        break;
      }
      case "checkout.session.expired": {
        // User started checkout but didn't complete it within Stripe's
        // 24-hour expiration window. The recovery EMAIL (with its "50%
        // off" discount) was removed entirely — founder decision,
        // 2026-07: no discount offers anywhere. We keep ONLY the funnel
        // analytics so the drop-off stays measurable.
        const session = event.data.object as Stripe.Checkout.Session;
        // One-time PDF checkouts (mode: "payment", see app/actions/
        // one-time-pdf.ts) are one-offs from possibly-anonymous users —
        // their abandonment would pollute the subscription funnel.
        // Mirrors the same guard in checkout.session.completed above.
        if (session.metadata?.purpose === "one_time_pdf") {
          break;
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
              had_email:
                (session.customer_details?.email ?? session.customer_email) != null,
            },
          });
        }
        break;
      }
      default:
        break;
    }

    // Stamp processed_at even for skipped paid events (retrying an
    // unverifiable binding won't help), but record WHY in error_message so
    // "could not apply" is queryable and distinguishable from "applied".
    // The update's error MUST be checked: supabase-js does not throw here,
    // and silently continuing to the 200 would leave a fully-applied event
    // looking unprocessed forever (violating the §3.5 contract that
    // processed_at IS NULL means "retry"). On failure we return 500 —
    // handlers are idempotent to a Stripe retry (DB writes are upserts and
    // the claimed_at lease serializes attempts), so retrying until the
    // bookkeeping write also succeeds is strictly safer than a corrupt 200.
    const { error: bookkeepingError } = await admin
      .from("stripe_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        error_message: syncSkippedReason ? `skipped: ${syncSkippedReason}` : null,
      })
      .eq("stripe_event_id", event.id);
    if (bookkeepingError) {
      Sentry.captureException(bookkeepingError, {
        tags: { feature: "stripe-webhook", stage: "processed-at-update" },
        extra: { stripe_event_id: event.id, stripe_event_type: event.type },
      });
      return NextResponse.json({ error: "Failed to record processing result" }, { status: 500 });
    }
  } catch (e) {
    // Webhook handler failure — a real risk for subscription state
    // drift. Previously the only record was the error_message stored in
    // stripe_webhook_events; you'd only find out by querying that table
    // or noticing a user complaint about their subscription being wrong.
    // Sentry capture with tags + event metadata makes this visible at a
    // glance, and the existing error_message + processed_at retry path
    // still works (Stripe sees 500, retries, and the next attempt
    // re-runs the handler via the "processed_at IS NULL" branch above).
    // Supabase/Postgrest errors are PLAIN OBJECTS, not Error instances —
    // String(e) on those stored the useless "[object Object]" (seen on a
    // real failed invoice.paid event), destroying the diagnostic trail.
    // Extract .message when present, else JSON-stringify the object.
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : (() => {
              try {
                return JSON.stringify(e);
              } catch {
                return String(e);
              }
            })();
    Sentry.captureException(e, {
      tags: { feature: "stripe-webhook", endpoint: "webhooks" },
      extra: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
      },
    });
    const { error: errorStampError } = await admin
      .from("stripe_webhook_events")
      .update({ error_message: message })
      .eq("stripe_event_id", event.id);
    if (errorStampError) {
      // Retry still happens (we return 500 below) but the diagnostic trail
      // would be silently lost — surface it.
      Sentry.captureException(errorStampError, {
        tags: { feature: "stripe-webhook", stage: "error-message-update" },
        extra: { stripe_event_id: event.id, stripe_event_type: event.type },
      });
    }
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
