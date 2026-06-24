"use client";

/**
 * Deal rate-alert email opt-in. Writes profiles.rate_alert_emails, the
 * consent flag the send-rate-alerts cron honors. Optimistic toggle with
 * rollback on failure; renders nothing until the current value loads, and
 * self-hides if the schema migration isn't applied yet.
 */
import { useEffect, useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getEmailPreferencesAction()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setEnabled(r.rateAlertEmails);
        else if (r.code === "MIGRATION_PENDING") setAvailable(false);
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
      const r = await setRateAlertEmailsAction(next);
      if (!r.ok) {
        setEnabled(!next); // rollback
        toast({ title: "Couldn't update preference", description: r.message, variant: "destructive" });
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
        const r = await setRateAlertEmailsAction(true);
        if (!r.ok) {
          setEnabled(false);
          toast({
            title: "Couldn't enable alerts",
            description: r.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Rate alerts on",
            description:
              "We'll email you only when a rate move flips a saved deal's verdict.",
          });
        }
      });
    };
    return (
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-2.5">
          <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              Want a heads-up if this deal changes?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Mortgage rates move every week. We&apos;ll quietly re-underwrite your
              saved deals and email you only when a move actually flips a verdict —
              its tier, DSCR band, or cash-flow sign. At most once a week, never spam.
            </p>
            <button
              type="button"
              onClick={enableInline}
              disabled={pending}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
            >
              <BellRing className="size-4" />
              {pending ? "Enabling…" : "Email me if rates move this deal"}
            </button>
          </div>
        </div>
      </div>
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
              Email me when the 30-year mortgage rate moves enough to change one of my saved deals&apos;
              verdict — its tier, DSCR band, or cash-flow sign. At most once a week, and only when
              something actually changed.
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
