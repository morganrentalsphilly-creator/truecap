"use client";

/**
 * Deal rate-alert email opt-in. Writes profiles.rate_alert_emails, the
 * consent flag the send-rate-alerts cron honors. Optimistic toggle with
 * rollback on failure; renders nothing until the current value loads, and
 * self-hides if the schema migration isn't applied yet.
 */
import { useEffect, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { BellRing } from "lucide-react";
import { getEmailPreferencesAction, setRateAlertEmailsAction } from "@/app/actions/email-preferences";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function RateAlertsToggle({
  variant = "card",
}: {
  /** "card" = full settings section; "inline" = compact contextual nudge
   *  surfaced after a user saves a deal (self-hides once enabled). */
  variant?: "card" | "inline";
} = {}) {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [enabled, setEnabled] = useState(false);
  // Truthful-alerts flag (G1 fallback): server-derived from RATE_ALERTS_MODE
  // via the preferences action. Defaults FALSE so we never promise an email
  // while the send-rate-alerts cron is dormant — copy softens to "launching
  // soon" but the toggle stays functional (consent is still banked). Flips
  // back to the full promise automatically when the env var goes live.
  const [alertsLive, setAlertsLive] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getEmailPreferencesAction()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setEnabled(r.rateAlertEmails);
          setAlertsLive(r.alertsLive);
        } else if (r.code === "MIGRATION_PENDING") setAvailable(false);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (next: boolean) => {
    setEnabled(next); // optimistic
    startTransition(async () => {
      try {
        const r = await setRateAlertEmailsAction(next);
        if (!r.ok) {
          setEnabled(!next); // rollback
          toast({ title: "Couldn't update preference", description: r.message, variant: "destructive" });
        }
      } catch (err) {
        // The action REJECTED rather than returning {ok:false}: a network
        // blip, a cold-start 500, or a tab one deploy behind main (Next
        // throws on an unrecognized Server Action). Without this the
        // optimistic flip sticks — the switch sits "on" while the DB stayed
        // off, a silent lie. Roll back to the real value and tell them it's
        // retryable. Mirrors the guard in login-form.tsx.
        Sentry.captureException(err, { tags: { feature: "rate-alerts" } });
        setEnabled(!next); // rollback
        toast({
          title: "Couldn't update preference",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (!loaded || !available) return null;

  // Inline variant — a contextual, one-time nudge surfaced where the user
  // just saved a deal (the analysis dashboard) instead of buried in
  // /settings. Don't nag anyone who already opted in: once enabled it
  // disappears.
  if (variant === "inline") {
    if (enabled) return null;
    const enableInline = () => {
      setEnabled(true); // optimistic
      startTransition(async () => {
        try {
          const r = await setRateAlertEmailsAction(true);
          if (!r.ok) {
            setEnabled(false);
            toast({
              title: "Couldn't enable alerts",
              description: r.message,
              variant: "destructive",
            });
          } else {
            toast(
              alertsLive
                ? {
                    title: "Rate alerts on",
                    description:
                      "We'll email you only when a rate move flips a saved deal's verdict.",
                  }
                : {
                    title: "You're on the list",
                    description:
                      "Email alerts are launching soon — you'll hear about rate moves that flip a saved deal's verdict.",
                  }
            );
          }
        } catch (err) {
          // Action rejected rather than returning {ok:false} — roll the
          // optimistic enable back off so the nudge doesn't vanish claiming
          // success, and surface a retryable error. Mirrors login-form.tsx.
          Sentry.captureException(err, { tags: { feature: "rate-alerts" } });
          setEnabled(false);
          toast({
            title: "Couldn't enable alerts",
            description: "Something interrupted the request. Check your connection and try again.",
            variant: "destructive",
          });
        }
      });
    };
    return (
      <>
        {/* Below sm: a single inline line, no card chrome - the full card
            was one of several stacked non-number cards between the Overview
            metrics and the Details tabs on phones. Same consent action,
            a fraction of the height. sm+ keeps the card. */}
        <div className="flex items-center gap-2.5 px-1 sm:hidden">
          <BellRing className="size-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
            {alertsLive
              ? "Get an email if a rate move flips this deal's verdict."
              : "Email alerts for rate moves that flip a verdict are launching soon."}
          </p>
          <button
            type="button"
            onClick={enableInline}
            disabled={pending}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-70"
          >
            {pending ? (alertsLive ? "Enabling…" : "Joining…") : alertsLive ? "Notify me" : "Join the list"}
          </button>
        </div>
        <div className="hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-sm sm:block sm:p-6">
          <div className="flex items-start gap-2.5">
            <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground">
                Want a heads-up if this deal changes?
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {alertsLive
                  ? "Mortgage rates move every week. We'll quietly re-underwrite your saved deals and email you only when a move actually flips a verdict — its tier, DSCR band, or cash-flow sign. At most once a week, never spam."
                  : "Mortgage rates move every week. Email alerts are launching soon — join the list now and, once they're live, you'll only hear when a move actually flips a verdict: its tier, DSCR band, or cash-flow sign. At most once a week, never spam."}
              </p>
              <button
                type="button"
                onClick={enableInline}
                disabled={pending}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
              >
                <BellRing className="size-4" />
                {pending
                  ? alertsLive
                    ? "Enabling…"
                    : "Joining…"
                  : alertsLive
                    ? "Email me if rates move this deal"
                    : "Join the alert list"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <BellRing className="mt-0.5 size-4 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">Deal rate alerts</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {alertsLive
                ? "Email me when the 30-year mortgage rate moves enough to change one of my saved deals' verdict — its tier, DSCR band, or cash-flow sign. At most once a week, and only when something actually changed."
                : enabled
                  ? "You're on the list — email alerts are launching soon. Once live, we'll email you when the 30-year mortgage rate moves enough to change one of your saved deals' verdicts. At most once a week."
                  : "Email alerts are launching soon. Flip this on to join the list — once live, we'll email you when the 30-year mortgage rate moves enough to change one of your saved deals' verdicts. At most once a week."}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label="Toggle deal rate alert emails"
        />
      </div>
    </section>
  );
}
