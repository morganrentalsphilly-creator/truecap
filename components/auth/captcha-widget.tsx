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
 */

import { useEffect, useRef } from "react";

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
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<TurnstileApi | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => resolve(window.turnstile ?? null);
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      done();
    }
  });
}

export function CaptchaWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep the latest callback without re-rendering the widget on parent renders
  // (updated in an effect — writing a ref during render breaks React's rules).
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!captchaEnabled) return;
    let widgetId: string | null = null;
    let cancelled = false;
    void loadScript().then((api) => {
      if (cancelled || !api || !containerRef.current) return;
      widgetId = api.render(containerRef.current, {
        sitekey: CAPTCHA_SITE_KEY,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        // Pinned light, not "auto": the auth card is hard-coded white
        // (auth-shell bg-white) and the site ships light-only, so an OS-dark
        // visitor got a jarring black box in the middle of a white form.
        theme: "light",
        size: "flexible",
      });
    });
    return () => {
      cancelled = true;
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
