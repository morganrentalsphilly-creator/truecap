"use client";

/**
 * Post-checkout landing: Google Ads purchase conversion + "Pro unlocked"
 * acknowledgment.
 *
 * Stripe checkout's success_url points at
 * `/?billing=success&session_id={CHECKOUT_SESSION_ID}` (app/actions/
 * billing.ts) so a new subscriber lands back on the calculator with
 * their auto-saved draft + welcome-back banner — and completes the save
 * they paid for — instead of the old /profile form.
 *
 * Mounted on BOTH homepage variants (they never render together):
 *  - app/page.tsx (STATIC): wrapped in <Suspense>. useSearchParams()
 *    reads the browser URL, so the billing params are seen even though
 *    the HTML is prerendered without them, and the page stays static.
 *  - app/home-authed/page.tsx (DYNAMIC — proxy.ts rewrites "/" here for
 *    signed-in users, i.e. every real post-checkout landing since
 *    checkout requires sign-in): the server resolves `conversionValue`
 *    (plan list price from the Stripe session) for value-based bidding.
 *
 * Behavior when billing=success:
 *  1. Fires the `paid_subscribed` Google Ads conversion EXACTLY ONCE via
 *     BillingConversionTracker — deduped in sessionStorage on the Stripe
 *     checkout session id, which is stable across both render paths and
 *     across refreshes.
 *  2. Shows a one-time dismissible "Pro unlocked" banner. The copy says
 *     Pro is ACTIVATING on purpose: entitlements land via the Stripe
 *     webhook ~1-2s after the redirect, so we never claim the features
 *     are already usable at render time.
 *
 * The billing params are captured on first render and then stripped from
 * the address bar (history.replaceState — no navigation, so the restored
 * calculator draft is untouched). A refresh therefore neither re-fires
 * the conversion nor resurrects a dismissed banner.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { BillingConversionTracker } from "@/components/marketing/billing-conversion-tracker";

export function BillingSuccessBanner({
  /** Plan list price (dollars) resolved server-side on /home-authed; the
   *  static-page mount omits it and the conversion fires with value 0. */
  conversionValue,
}: {
  conversionValue?: number;
}) {
  const searchParams = useSearchParams();
  // Capture the params ONCE — the cleanup effect below strips them from
  // the URL (Next syncs useSearchParams with history.replaceState), and
  // the tracker/banner must not see them vanish mid-flight.
  const initialRef = useRef<{ billing: string | null; sessionId: string | null } | null>(null);
  if (initialRef.current === null) {
    initialRef.current = {
      billing: searchParams.get("billing"),
      sessionId: searchParams.get("session_id"),
    };
  }
  const { billing, sessionId } = initialRef.current;

  const [showBanner, setShowBanner] = useState(false);

  // One-time banner: dismissal is keyed on the checkout session id, so a
  // FUTURE purchase (new session) still gets its acknowledgment while a
  // re-landing on the same URL stays quiet. localStorage (not session-)
  // so the dismissal survives the tab.
  const dismissKey = `tc_pro_unlocked_ack_${sessionId ?? "unknown"}`;

  useEffect(() => {
    if (billing !== "success") return;
    try {
      if (window.localStorage.getItem(dismissKey) === "1") return;
    } catch {
      // localStorage unavailable — still show; dismissal just won't persist.
    }
    setShowBanner(true);
    // Mount-only: `billing`/`dismissKey` are captured from the initial URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Strip the billing params from the address bar after mount. Runs in a
  // PARENT effect, i.e. after the child tracker's effect has already
  // fired the conversion from its captured props. replaceState (not
  // router.replace) so there's no navigation/RSC refetch to disturb the
  // restored draft.
  useEffect(() => {
    if (billing == null && sessionId == null) return;
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("billing") && !url.searchParams.has("session_id")) return;
      url.searchParams.delete("billing");
      url.searchParams.delete("session_id");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      // Cosmetic cleanup only — never let it break the landing.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Non-fatal: the banner is already hidden for this render.
    }
  };

  return (
    <>
      {/* The conversion tracker fires regardless of banner visibility —
          a previously-dismissed banner must never suppress the Ads event
          (the tracker has its own session-id dedup). */}
      <BillingConversionTracker
        billingStatus={billing ?? undefined}
        value={conversionValue}
        transactionId={sessionId ?? undefined}
      />
      {showBanner ? (
        <div role="status" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-[var(--brand-blue-light)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 sm:items-center">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
              <p className="leading-relaxed text-foreground">
                <strong className="font-bold">Pro unlocked —</strong>{" "}
                <span className="text-muted-foreground">
                  your subscription is confirmed and Pro is activating on your account (this can
                  take a few seconds). Pick up where you left off below and save your deal to
                  your dashboard.
                </span>
              </p>
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
