"use client";

/**
 * Post-checkout landing: Google Ads purchase conversion + "Pro unlocked"
 * acknowledgment + entitlement self-heal.
 *
 * Stripe checkout's success_url points at /api/billing/return, which parks
 * the Checkout Session id in a short-lived httpOnly cookie and 303s to
 * `/dashboard/new?billing=success` (app/actions/billing.ts,
 * lib/stripe/checkout-return-cookie.ts) so a new subscriber lands back in the
 * signed-in analyzer with the app shell still available — on a URL the
 * privacy gate lets the Google tags load on. The id reaches this component
 * only inside the verified server-action result; it is never read from the
 * URL.
 *
 * The normal mount is app/dashboard/new/page.tsx. app/page.tsx retains a
 * static, fail-closed compatibility mount for legacy return URLs. Both mount
 * it prop-less: the server action below is the only Stripe lookup and the
 * only source of the conversion value and purchased tier.
 *
 * Behavior when billing=success:
 *  1. Verifies the Checkout Session server-side against Stripe, the signed-in
 *     user, the current plan Price, and a 24-hour return window. Crafted query
 *     strings fail closed and trigger no banner, analytics, conversion, or poll.
 *  2. Fires the `paid_subscribed` Google Ads conversion EXACTLY ONCE via
 *     BillingConversionTracker — deduped in sessionStorage on the verified
 *     Stripe checkout session id.
 *  3. Shows a one-time dismissible "Pro unlocked" banner. The initial copy
 *     says Pro is ACTIVATING on purpose: entitlements land via the Stripe
 *     webhook ~1-2s after the redirect, so we never claim the features
 *     are already usable at render time.
 *  4. ENTITLEMENT SELF-HEAL: polls isProActiveAction (a read-only wrapper
 *     around hasPaidPlanSubscription) every ~2s for up to ~20s. The moment
 *     the webhook-written subscription row is visible, router.refresh()
 *     re-reads the server-resolved entitlements — the page stops treating
 *     the buyer as free without a manual reload — and the banner copy
 *     upgrades to "Pro is live" with deep links into what they unlocked.
 *     This is refresh-on-detect ONLY: nothing client-side ever grants an
 *     entitlement; the server gates stay authoritative.
 *  5. While the poll is pending it raises the post-checkout upsell
 *     suppression signal (hooks/use-post-checkout-upsell-suppression.ts)
 *     so MomentOfValueUpsell / ProInlineGate never pitch a free trial to
 *     someone who paid seconds ago. The signal fails OPEN: it's cleared on
 *     poll timeout and on unmount, and non-buyers never see it raised.
 *
 * The billing params are captured on first render and stripped from the
 * address bar (history.replaceState — no navigation, so the restored
 * calculator draft is untouched) once verification SETTLES with ok or
 * INVALID_RETURN. A refresh therefore neither re-fires the conversion nor
 * resurrects a dismissed banner. On SERVER_ERROR (Stripe/DB blip) the param
 * is deliberately left in place: the action keeps the return cookie for
 * retry, and `billing=success` is not a sensitive parameter, so a reload
 * re-runs verification instead of silently losing the purchase landing.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { BillingConversionTracker } from "@/components/marketing/billing-conversion-tracker";
import { isProActiveAction, verifyCheckoutReturnAction } from "@/app/actions/billing";
import { setPostCheckoutUpsellSuppression } from "@/hooks/use-post-checkout-upsell-suppression";
import { trackEvent } from "@/lib/analytics";
import { scrollBehavior } from "@/lib/utils";

/** First check fires immediately, then ~2s apart up to 10 total ≈ an 18s
 *  window — generous next to the webhook's typical 1-2s, cheap enough not
 *  to matter if it times out. */
const PRO_ACTIVATION_POLL_INTERVAL_MS = 2000;
const PRO_ACTIVATION_POLL_MAX_ATTEMPTS = 10;

/** Remove `billing` / `session_id` from the address bar without navigating.
 *  Cosmetic cleanup only — never let it break the landing. */
function stripBillingParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("billing") && !url.searchParams.has("session_id")) return;
    url.searchParams.delete("billing");
    url.searchParams.delete("session_id");
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    // Cosmetic cleanup only.
  }
}

export function BillingSuccessBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Capture the params ONCE via a lazy useState initializer — the verify
  // effect below strips them from the URL once verification settles (Next
  // syncs useSearchParams with history.replaceState), and the tracker/banner
  // must not see them vanish mid-flight. State (not a ref) so reading the captured values during
  // render is legal (react-hooks/refs).
  const [{ billing }] = useState(() => ({
    billing: searchParams.get("billing"),
  }));

  const [showBanner, setShowBanner] = useState(false);
  const [verifiedReturn, setVerifiedReturn] = useState<{
    checkoutSessionId: string;
    conversionValue?: number;
    purchasedPlanSlug: string;
  } | null>(null);
  // The Session id exists client-side only after the server bound it to this
  // user; every dedup key below derives from it.
  const sessionId = verifiedReturn?.checkoutSessionId ?? null;
  const boughtAgentPro =
    verifiedReturn?.purchasedPlanSlug.startsWith("agent_pro") ?? false;
  // Flips true the moment the poll sees the subscription row — upgrades the
  // banner copy from "activating…" to "Pro is live" with unlock deep links.
  const [activationState, setActivationState] = useState<"checking" | "live" | "taking_longer">("checking");
  const proLive = activationState === "live";

  const refreshAccess = useCallback(async () => {
    setActivationState("checking");
    try {
      const result = await isProActiveAction();
      if (result.ok && result.active) {
        setActivationState("live");
        router.refresh();
        return true;
      }
    } catch {
      // The verified Checkout Session still proves the purchase return; a
      // transient entitlement read should remain recoverable, not disappear.
    }
    setActivationState("taking_longer");
    return false;
  }, [router]);

  // One-time banner: dismissal is keyed on the checkout session id, so a
  // FUTURE purchase (new session) still gets its acknowledgment while a
  // re-landing on the same URL stays quiet. localStorage (not session-)
  // so the dismissal survives the tab.
  const dismissKey = `tc_pro_unlocked_ack_${sessionId ?? "unknown"}`;

  // Query parameters are untrusted. Do not acknowledge a purchase or emit any
  // event until the server has retrieved this recent Session from Stripe and
  // bound it to the signed-in user and exact plan Price.
  //
  // The params come off the URL only after the action SETTLES:
  //  - ok / INVALID_RETURN: the return is consumed (or was never valid), so a
  //    refresh must not re-run it.
  //  - SERVER_ERROR / SIGN_IN_REQUIRED / rejected promise: the action kept the
  //    return cookie for retry, so keep `?billing=success` too — otherwise a
  //    reload lands on a clean URL, `billing !== "success"` short-circuits,
  //    and the cookie expires unused.
  useEffect(() => {
    if (billing == null) return;
    if (billing !== "success") {
      stripBillingParamsFromUrl();
      return;
    }

    let cancelled = false;
    void verifyCheckoutReturnAction({})
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setVerifiedReturn({
            checkoutSessionId: result.checkoutSessionId,
            purchasedPlanSlug: result.purchasedPlanSlug,
            ...(result.conversionValue != null
              ? { conversionValue: result.conversionValue }
              : {}),
          });
        }
        if (result.ok || result.code === "INVALID_RETURN") {
          stripBillingParamsFromUrl();
        }
      })
      .catch(() => {
        // Fail closed. A transient verification failure produces no success
        // UI or analytics; the Stripe webhook remains the entitlement source.
        // The URL keeps `billing=success` so a reload retries.
      });

    return () => {
      cancelled = true;
    };
  }, [billing]);

  // Canonical Checkout return event. The Stripe Session id is used only in
  // local sessionStorage for deduplication; it is never sent to PostHog.
  useEffect(() => {
    if (!verifiedReturn) return;
    const key = `tc_checkout_returned_${sessionId ?? "unknown"}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable — the analytics wrapper remains a safe no-op when
      // consent or configuration does not permit capture.
    }
    trackEvent("checkout_returned", {
      plan_tier: boughtAgentPro ? "agent_pro" : "pro",
    });
  }, [boughtAgentPro, sessionId, verifiedReturn]);

  useEffect(() => {
    if (!verifiedReturn) return;
    try {
      if (window.localStorage.getItem(dismissKey) === "1") return;
    } catch {
      // localStorage unavailable — still show; dismissal just won't persist.
    }
    setShowBanner(true);
  }, [dismissKey, verifiedReturn]);

  // Entitlement self-heal poll. Runs whenever billing=success — even if the
  // banner itself was previously dismissed — because the stale-entitlement
  // page is the problem, not the banner. Hard-stops on: detection (refresh),
  // attempt cap (fail open), or unmount (cleanup clears interval + signal).
  useEffect(() => {
    if (!verifiedReturn) return;

    let cancelled = false;
    let inFlight = false;
    let attempts = 0;

    // Suppress the free-trial upsells while we don't yet know the webhook
    // has landed. Cleared on timeout/unmount below — fail open.
    setPostCheckoutUpsellSuppression(true);

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      attempts += 1;
      let active = false;
      try {
        const result = await isProActiveAction();
        active = result.ok && result.active;
      } catch {
        // Transient action failure — treat as "not yet" and keep polling.
      }
      inFlight = false;
      if (cancelled) return;
      if (active) {
        cancelled = true;
        clearInterval(intervalId);
        setActivationState("live");
        // Re-read the server-resolved entitlements: this is the self-heal.
        // The suppression signal stays up only until unmount — after the
        // refresh the upsells retire themselves via real entitlements.
        router.refresh();
        return;
      }
      if (attempts >= PRO_ACTIVATION_POLL_MAX_ATTEMPTS) {
        cancelled = true;
        clearInterval(intervalId);
        // The Checkout Session is verified, so do not pitch another purchase.
        // Move to an explicit recoverable state instead of leaving
        // "activating for a few seconds" on screen indefinitely.
        setActivationState("taking_longer");
      }
    };

    const intervalId = setInterval(() => {
      void poll();
    }, PRO_ACTIVATION_POLL_INTERVAL_MS);
    // First check immediately — the webhook usually beats the redirect.
    void poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      setPostCheckoutUpsellSuppression(false);
    };
  }, [router, verifiedReturn]);

  // A delayed webhook often lands after the initial bounded poll. Recheck
  // when the customer returns to the tab instead of requiring a blind reload.
  useEffect(() => {
    if (activationState !== "taking_longer" || !verifiedReturn) return;
    const recheck = () => {
      if (document.visibilityState === "visible") void refreshAccess();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [activationState, refreshAccess, verifiedReturn]);

  const dismiss = () => {
    setShowBanner(false);
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Non-fatal: the banner is already hidden for this render.
    }
  };

  // "Pro is live" deep links. The unlocked surfaces (Save + Export PDF in
  // the results toolbar, the 10-Year Projections ledger row) live further
  // down THIS page, so these scroll rather than navigate — falling back to
  // the calculator top when no analysis has been run yet.
  const scrollToEl = (el: Element | null) => {
    const target =
      el ??
      document.querySelector("[data-analysis-results='true']") ??
      document.getElementById("main");
    target?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };
  const goToSaveDeal = () =>
    scrollToEl(document.querySelector("[data-analysis-results='true']"));
  const goToProjections = () => scrollToEl(document.getElementById("analysis-tab-projections"));
  const goToPdfExport = () =>
    scrollToEl(document.querySelector("[data-analysis-results='true']"));

  const unlockLinkClass = "text-left text-sm font-semibold text-primary hover:underline";

  return (
    <>
      {/* The conversion tracker fires regardless of banner visibility —
          a previously-dismissed banner must never suppress the Ads event
          (the tracker has its own session-id dedup). It receives "success"
          only after the Stripe-bound server verification succeeds. */}
      <BillingConversionTracker
        billingStatus={verifiedReturn ? "success" : undefined}
        value={verifiedReturn?.conversionValue}
        transactionId={verifiedReturn ? (sessionId ?? undefined) : undefined}
      />
      {showBanner ? (
        <div role="status" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-[var(--brand-blue-light)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                {proLive ? (
                  <>
                    <p className="leading-relaxed text-foreground">
                      <strong className="font-bold">{boughtAgentPro ? "Agent Pro is live —" : "Pro is live —"}</strong>{" "}
                      <span className="text-muted-foreground">
                        {`here's what you unlocked:`}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {boughtAgentPro ? (
                        <a href="/settings" className={unlockLinkClass}>
                          Set up your client roster
                        </a>
                      ) : null}
                      <button type="button" onClick={goToSaveDeal} className={unlockLinkClass}>
                        Save this deal
                      </button>
                      <button type="button" onClick={goToProjections} className={unlockLinkClass}>
                        10-year projections
                      </button>
                      <button type="button" onClick={goToPdfExport} className={unlockLinkClass}>
                        Branded PDF export
                      </button>
                    </div>
                  </>
                ) : activationState === "taking_longer" ? (
                  <>
                    <p className="leading-relaxed text-foreground">
                      <strong className="font-bold">Your payment is confirmed.</strong>{" "}
                      <span className="text-muted-foreground">
                        Account access is taking longer than expected. Your purchase is safe; refresh access below or manage billing while TrueCap catches up.
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void refreshAccess()}
                        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        Refresh access
                      </button>
                      <a
                        href="/profile#billing"
                        className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground"
                      >
                        Manage billing
                      </a>
                      <a
                        href="mailto:hello@usetruecap.com?subject=Subscription%20activation"
                        className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/5"
                      >
                        Contact support
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="leading-relaxed text-foreground">
                    <strong className="font-bold">{boughtAgentPro ? "Agent Pro unlocked —" : "Pro unlocked —"}</strong>{" "}
                    <span className="text-muted-foreground">
                      your subscription is confirmed and Pro is activating on your account (this
                      can take a few seconds). Pick up where you left off below and save your
                      deal to your dashboard.
                    </span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss Pro confirmation banner"
              className="self-end rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-card hover:text-foreground sm:self-auto sm:py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
