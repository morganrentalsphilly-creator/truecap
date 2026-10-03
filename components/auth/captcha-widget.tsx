"use client";

/**
 * Cloudflare Turnstile widget for the auth forms — the anti-credential-stuffing
 * guard the 2026-08-11 audit called for.
 *
 * DARK UNTIL CONFIGURED: renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
 * absent (it's inlined at build time), so shipping this code changes zero
 * behavior until the key exists. That makes the rollout order safe:
 *   1. this code deploys (inert);
 *   2. NEXT_PUBLIC_TURNSTILE_SITE_KEY is added in Vercel + redeploy → the
 *      widget appears and tokens flow to the auth actions (Supabase still
 *      ignores them while its captcha setting is off);
 *   3. ONLY THEN is captcha enabled in the Supabase dashboard (with the
 *      Turnstile SECRET key) — at which point Supabase starts requiring the
 *      tokens the forms are already sending.
 * Flipping step 3 before step 2 would break login for everyone — the forms
 * would have no widget and no token. The settings walkthrough says this too.
 *
 * Uses Turnstile's explicit render API so React owns the container. The token
 * is reported up via onToken; Turnstile tokens expire (~5 min), and the
 * expired-callback reports null so the form disables submit until re-solved.
 *
 * A TOKEN WORKS ONCE. Supabase checks the captcha before the credentials and
 * Cloudflare rejects a replayed token ("timeout-or-duplicate"), so a token
 * that has travelled with one server call is spent whether that call
 * succeeded or failed. The widget therefore exposes reset() through its ref:
 * every form calls it after each server call that carried the token. reset()
 * reports null first (submit is disabled again) and then asks Turnstile for a
 * new token, which arrives through the same callback. It is never called on
 * unmount: unmount removes the widget.
 */

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** True when the deployment has a captcha configured — forms use this to know
 *  whether to wait for a token before enabling submit. */
export const captchaEnabled = CAPTCHA_SITE_KEY.length > 0;

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "light";
      size: "flexible";
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

/** What a form holds on the widget: `ref.current?.reset()` after every server
 *  call that carried the token. */
export type CaptchaWidgetHandle = {
  reset: () => void;
};

/**
 * Throw away the token a server call just used and ask Turnstile for a new
 * one. The null goes out FIRST, so the form's submit is disabled before the
 * new challenge starts and no click can send the spent token (or none at all)
 * in between; the new token then arrives through the widget's own callback.
 * With no rendered widget (captcha not configured, script blocked, widget not
 * mounted yet) there is nothing to ask, and only the null is reported.
 */
export function resetCaptcha(
  api: Pick<TurnstileApi, "reset"> | null | undefined,
  widgetId: string | null,
  onToken: (token: string | null) => void,
): void {
  onToken(null);
  if (!api || !widgetId) return;
  try {
    api.reset(widgetId);
  } catch {
    /* widget already gone */
  }
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Give up on Cloudflare after this long. Without a ceiling a blocked or slow
 *  request to challenges.cloudflare.com never settles, and the submit button —
 *  which waits on a token — stays disabled forever. */
const SCRIPT_TIMEOUT_MS = 8000;

function loadScript(): Promise<TurnstileApi | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (api: TurnstileApi | null) => {
      if (settled) return;
      settled = true;
      resolve(api);
    };
    // Corporate proxies, ad blockers and network blips all produce a request
    // that simply never completes; treat that as "no captcha available".
    const timer = setTimeout(() => finish(null), SCRIPT_TIMEOUT_MS);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => {
      clearTimeout(timer);
      finish(window.turnstile ?? null);
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        finish(null);
      },
      { once: true }
    );
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      done();
    }
  });
}

export function CaptchaWidget({
  onToken,
  onUnavailable,
  ref,
}: {
  /** Gives the form `reset()`; see CaptchaWidgetHandle. */
  ref?: Ref<CaptchaWidgetHandle>;
  onToken: (token: string | null) => void;
  /**
   * Fired when Turnstile cannot run at all (script blocked, timed out, or the
   * widget errored). The form uses this to STOP gating submit on a token:
   * a captcha the user cannot solve must not become a permanent lockout.
   * Supabase still enforces server-side, so this cannot be used to bypass —
   * the request simply fails there with a clear message instead of the button
   * being dead with no explanation.
   */
  onUnavailable?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep the latest callback without re-rendering the widget on parent renders
  // (updated in an effect — writing a ref during render breaks React's rules).
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  // The rendered widget's id, kept for reset(). Null until Turnstile has
  // rendered and again after unmount.
  const widgetIdRef = useRef<string | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (!captchaEnabled) return;
        resetCaptcha(window.turnstile, widgetIdRef.current, (token) =>
          onTokenRef.current(token),
        );
      },
    }),
    [],
  );

  useEffect(() => {
    if (!captchaEnabled) return;
    let widgetId: string | null = null;
    let cancelled = false;
    void loadScript().then((api) => {
      if (cancelled) return;
      if (!api || !containerRef.current) {
        onUnavailableRef.current?.();
        return;
      }
      widgetId = api.render(containerRef.current, {
        sitekey: CAPTCHA_SITE_KEY,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => {
          onTokenRef.current(null);
          onUnavailableRef.current?.();
        },
        // Pinned light, not "auto": the auth page is the light paper
        // (auth-shell bg-background) and the site ships light-only, so an
        // OS-dark visitor got a jarring black box in the middle of a light form.
        theme: "light",
        size: "flexible",
      });
      widgetIdRef.current = widgetId;
    });
    return () => {
      cancelled = true;
      widgetIdRef.current = null;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* widget already gone */
        }
      }
    };
  }, []);

  if (!captchaEnabled) return null;
  return <div ref={containerRef} className="min-h-[65px]" />;
}
