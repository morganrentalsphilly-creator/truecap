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

export function RateAlertsToggle() {
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
