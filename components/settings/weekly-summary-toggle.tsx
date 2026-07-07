"use client";

/**
 * Weekly summary email opt-in. Writes profiles.weekly_summary_emails, the
 * consent flag the send-weekly-summary cron honors — its OWN consent
 * surface, separate from rate alerts. Optimistic toggle with rollback on
 * failure; renders nothing until the current value loads, and self-hides
 * if the weekly_summary migration isn't applied yet (the preferences
 * action omits the weekly fields in that case). Follows
 * components/settings/rate-alerts-toggle.tsx exactly.
 */
import { useEffect, useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import {
  getEmailPreferencesAction,
  setWeeklySummaryEmailsAction,
} from "@/app/actions/email-preferences";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function WeeklySummaryToggle() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [enabled, setEnabled] = useState(false);
  // Truthful-copy flag: server-derived from WEEKLY_SUMMARY_MODE via the
  // preferences action. Defaults FALSE so we never promise an email while
  // the send-weekly-summary cron is dormant — copy softens to "launching
  // soon, join the list" but the toggle stays functional (consent is still
  // banked). Flips back to the full promise automatically when the env var
  // goes live (same alertsLive derivation the rate-alerts toggle uses).
  const [summaryLive, setSummaryLive] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getEmailPreferencesAction()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          // weeklySummaryEmails is ABSENT when the migration isn't applied —
          // hide the card (MIGRATION_PENDING tolerance, per-column).
          if (r.weeklySummaryEmails === undefined) setAvailable(false);
          else {
            setEnabled(r.weeklySummaryEmails);
            setSummaryLive(Boolean(r.weeklySummaryLive));
          }
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
      const r = await setWeeklySummaryEmailsAction(next);
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
          <CalendarClock className="mt-0.5 size-4 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">Weekly portfolio summary</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {summaryLive
                ? "Email me a short weekly recap of my deals — pipeline cash flow, owned-portfolio equity, rate moves that changed a verdict, and due-diligence deadlines. Once a week, and only when there's something to say."
                : enabled
                  ? "You're on the list — weekly summaries are launching soon. Once live, you'll get a short weekly recap of your deals: pipeline cash flow, owned-portfolio equity, rate moves, and deadlines. Once a week, only when there's something to say."
                  : "Weekly summaries are launching soon. Flip this on to join the list — once live, you'll get a short weekly recap of your deals: pipeline cash flow, owned-portfolio equity, rate moves, and deadlines. Once a week, only when there's something to say."}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label="Toggle weekly portfolio summary emails"
        />
      </div>
    </section>
  );
}
