"use client";

/**
 * "Email me this decision memo" — one field, inline under the anonymous
 * visitor's free decision (docs/funnel-leaks-plan.md Phase A).
 *
 * An inline card, not an overlay: it sits after the result, never covers it,
 * and the result is fully usable whether or not the send succeeds. Turnstile
 * loads only once the visitor focuses the field, so the analyzer's first
 * paint never waits on Cloudflare.
 *
 * Consent copy below is versioned: change it and bump
 * MEMO_CONSENT_TEXT_VERSION in lib/memo-lead.ts.
 */

import { useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { captureMemoLeadAction } from "@/app/actions/memo-lead-capture";
import { CaptchaWidget, captchaEnabled } from "@/components/auth/captcha-widget";
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

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (status === "submitting") return;
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
    [captchaToken, email, getValues, maoTarget, status, website],
  );

  const waitingOnCaptcha =
    captchaEnabled && captchaWanted && !captchaToken && !captchaUnavailable;

  return (
    <section
      aria-labelledby="memo-email-capture-title"
      className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      {status === "success" ? (
        <div role="status">
          <div className="flex items-center gap-2 text-[var(--metric-positive,#16a34a)]">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h3 id="memo-email-capture-title" className="text-base font-extrabold">
              Memo sent
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Check your inbox in a minute. The email links back to this decision.
          </p>
        </div>
      ) : (
        <>
          <h3
            id="memo-email-capture-title"
            className="text-base font-extrabold text-foreground"
          >
            Email me this decision memo
          </h3>
          <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
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
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <button
              type="submit"
              disabled={status === "submitting" || email.trim().length === 0 || waitingOnCaptcha}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send the memo"}
            </button>
          </form>
          {captchaWanted ? (
            <div className="mt-2">
              <CaptchaWidget
                key={captchaNonce}
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
