"use client";

/**
 * "Email me this decision memo" — one field, inline under the anonymous
 * visitor's free decision (docs/funnel-leaks-plan.md Phase A).
 *
 * Inline, never an overlay: it is the second path of the save card under the
 * decision card (components/marketing/signup-prompt-card.tsx sets the card
 * and the rule above it; this component draws no chrome of its own), it never
 * covers the result, and the result is fully usable whether or not the send
 * succeeds. Its button is the card's secondary one and is never greyed out
 * waiting for input: pressing it early says what is missing. Turnstile
 * loads only once the visitor focuses the field, so the analyzer's first
 * paint never waits on Cloudflare.
 *
 * Consent copy below is versioned: change it and bump
 * MEMO_CONSENT_TEXT_VERSION in lib/memo-lead.ts.
 */

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { captureMemoLeadAction } from "@/app/actions/memo-lead-capture";
import {
  CaptchaWidget,
  MEMO_CAPTCHA_SITE_KEY,
  memoCaptchaEnabled,
} from "@/components/auth/captcha-widget";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { track } from "@/lib/analytics/site-events";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";

type Props = {
  /** Reads the analyzer inputs the visible result was computed from. */
  getValues: () => InvestmentFormValues | null;
  maoTarget: MaoTarget | null;
};

function readAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const pick = (key: string) => params.get(key)?.slice(0, 120) || undefined;
    return {
      sourcePage: window.location.pathname.slice(0, 200),
      referrer: document.referrer ? document.referrer.slice(0, 300) : undefined,
      utm: {
        source: pick("utm_source"),
        medium: pick("utm_medium"),
        campaign: pick("utm_campaign"),
        term: pick("utm_term"),
        content: pick("utm_content"),
      },
    };
  } catch {
    return { sourcePage: undefined, referrer: undefined, utm: undefined };
  }
}

/** Said when Send is pressed before the invisible human check has answered;
 *  the sign-up form's own sentence for the same wait. */
const HUMAN_CHECK_PENDING =
  "We're still checking that you're human. It takes a few seconds. Try again.";

export function MemoEmailCapture({ getValues, maoTarget }: Props) {
  const [email, setEmail] = useState("");
  /** Honeypot — hidden from real users; the server silently drops a filled one. */
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captchaWanted, setCaptchaWanted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  /** Bumped after a failed submit: a Turnstile token is single-use, so the
   *  widget is remounted to issue a fresh one for the retry. */
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const waitingOnCaptcha =
    memoCaptchaEnabled && captchaWanted && !captchaToken && !captchaUnavailable;
  // The human check answered: the "still checking" line has nothing to say.
  useEffect(() => {
    if (captchaToken) setErrorMsg((current) => (current === HUMAN_CHECK_PENDING ? null : current));
  }, [captchaToken]);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (status === "submitting") return;
      // The button is not disabled while the invisible human check runs, so a
      // press that beats its token is answered here and nothing is sent (the
      // request would only be refused by the server's own check).
      if (waitingOnCaptcha) {
        setErrorMsg(HUMAN_CHECK_PENDING);
        return;
      }
      setStatus("submitting");
      setErrorMsg(null);
      track("memo_requested", { source: "analyze_result" });
      const result = await captureMemoLeadAction({
        email,
        values: getValues(),
        maoTarget: maoTarget ?? undefined,
        website,
        captchaToken: captchaToken ?? undefined,
        ...readAttribution(),
      }).catch(() => null);
      if (result?.ok) {
        setStatus("success");
        trackEvent("email_capture_submitted", { source: "memo" });
        return;
      }
      setStatus("error");
      setCaptchaToken(null);
      setCaptchaNonce((n) => n + 1);
      setErrorMsg(
        result?.message ??
          "We couldn't email your memo right now. Your result is still here — please try again in a minute.",
      );
    },
    [captchaToken, email, getValues, maoTarget, status, waitingOnCaptcha, website],
  );

  return (
    <section aria-labelledby="memo-email-capture-title" data-memo-capture="">
      {status === "success" ? (
        <div role="status">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <h4 id="memo-email-capture-title" className="text-base font-semibold">
              Memo sent
            </h4>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Check your inbox in a minute. The email links back to this decision.
          </p>
        </div>
      ) : (
        <>
          <h4
            id="memo-email-capture-title"
            className="text-base font-semibold text-foreground"
          >
            Email me this decision memo
          </h4>
          <form onSubmit={onSubmit} className="mt-2 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-start">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />
            <div className="flex-1">
              <label htmlFor="memo-email" className="sr-only">
                Email address
              </label>
              <input
                id="memo-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setCaptchaWanted(true)}
                disabled={status === "submitting"}
                aria-invalid={status === "error" || undefined}
                aria-describedby={errorMsg ? "memo-email-error" : "memo-email-hint"}
                className="min-h-11 w-full rounded-md border border-input bg-field px-3 py-2 text-base outline-none transition-colors duration-150 focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm"
              />
            </div>
            {/* The card's secondary action (Google above is the filled one).
                Disabled only while a request is in flight: an empty field is
                answered by the browser's own "fill out this field". */}
            <Button
              type="submit"
              variant="outline"
              disabled={status === "submitting"}
              className="h-11 shrink-0 rounded-md px-4 text-sm font-semibold"
            >
              {status === "submitting" ? "Sending…" : "Send the memo"}
            </Button>
          </form>
          {captchaWanted ? (
            <div className="mt-2">
              <CaptchaWidget
                key={captchaNonce}
                siteKey={MEMO_CAPTCHA_SITE_KEY}
                onToken={setCaptchaToken}
                onUnavailable={() => setCaptchaUnavailable(true)}
              />
            </div>
          ) : null}
          {errorMsg ? (
            <p id="memo-email-error" role="alert" className="mt-2 text-xs text-destructive">
              {errorMsg}
            </p>
          ) : null}
          <p id="memo-email-hint" className="mt-2 text-xs text-muted-foreground">
            We&apos;ll send this memo plus a few short notes on reading it. Unsubscribe anytime.
          </p>
        </>
      )}
    </section>
  );
}
