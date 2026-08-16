"use client";

import { useEffect, useId, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { BellRing, Eye, ShieldCheck } from "lucide-react";
import {
  getSavedDealWatchAction,
  setSavedDealWatchEnabledAction,
  setSavedDealWatchPreferencesAction,
  type SavedDealWatchSettings,
} from "@/app/actions/saved-deal-watch";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

/**
 * Persisted, feature-flagged Saved Deal Watch opt-in. This surface is
 * intentionally explicit about the dormant operational state: it records a
 * user's choice, but never implies that a provider is polling listings or
 * that an alert delivery worker exists.
 */
export function SavedDealWatchCard({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const titleId = useId();
  const watchSwitchId = useId();
  const inAppSwitchId = useId();
  const emailSwitchId = useId();
  const [settings, setSettings] = useState<SavedDealWatchSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getSavedDealWatchAction(savedDealId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setSettings(result.settings);
        } else if (
          result.code === "FEATURE_DISABLED" ||
          result.code === "MIGRATION_PENDING" ||
          result.code === "ENTITLEMENT_REQUIRED" ||
          result.code === "NOT_FOUND"
        ) {
          setAvailable(false);
        }
        setLoaded(true);
      })
      .catch((error) => {
        Sentry.captureException(error, { tags: { feature: "saved-deal-watch" } });
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [savedDealId]);

  const toggleWatch = (next: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, subscriptionEnabled: next });
    startTransition(async () => {
      try {
        const result = await setSavedDealWatchEnabledAction({
          savedAnalysisId: savedDealId,
          enabled: next,
        });
        if (!result.ok) {
          setSettings(previous);
          toast({
            title: "Couldn't save Watch setup",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        setSettings(result.settings);
        if (next) {
          trackEvent("saved_deal_watch_enabled", { trigger_count: 4 });
          toast({
            title: "Watch preference saved",
            description:
              "Automatic listing checks are not active yet. This deal will not be monitored until the authorized provider is launched.",
          });
        }
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: "saved-deal-watch" } });
        setSettings(previous);
        toast({
          title: "Couldn't save Watch setup",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const updateNotificationPreference = (
    key: "inAppNotificationsEnabled" | "emailNotificationsEnabled",
    next: boolean
  ) => {
    if (!settings) return;
    const previous = settings;
    const optimistic = { ...settings, [key]: next };
    setSettings(optimistic);
    startTransition(async () => {
      try {
        const result = await setSavedDealWatchPreferencesAction({
          savedAnalysisId: savedDealId,
          inAppNotificationsEnabled: optimistic.inAppNotificationsEnabled,
          emailNotificationsEnabled: optimistic.emailNotificationsEnabled,
        });
        if (!result.ok) {
          setSettings(previous);
          toast({
            title: "Couldn't save notification preference",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        setSettings(result.settings);
        toast({
          title: "Future alert preference saved",
          description:
            "No deal-watch notification will be sent while automatic checks and delivery remain inactive.",
        });
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: "saved-deal-watch" } });
        setSettings(previous);
        toast({
          title: "Couldn't save notification preference",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  // The feature flag is also enforced by the server page and every action.
  // Missing schema or access self-hides instead of presenting a dead control.
  if (!loaded || !available || !settings) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Eye aria-hidden className="size-4 shrink-0 text-primary" />
            <h2 id={titleId} className="text-base font-bold text-foreground">
              Saved Deal Watch
            </h2>
          </div>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Save your intent to watch this deal for meaningful changes such as moving within
            your Max Offer or Buy Box.
          </p>
        </div>
        <Switch
          id={watchSwitchId}
          checked={settings.subscriptionEnabled}
          onCheckedChange={toggleWatch}
          disabled={pending}
          aria-label="Save this deal to Saved Deal Watch"
        />
      </div>

      <div
        className="mt-4 rounded-xl border border-warning/35 bg-warning/10 p-3"
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-bold text-foreground">
          {settings.subscriptionEnabled
            ? "Preference saved — monitoring is inactive"
            : "Automatic monitoring is not active"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          TrueCap is not checking listing sites or sending Saved Deal Watch alerts. Automatic
          checks require a licensed data provider and a separately activated delivery worker;
          neither is configured in this release.
        </p>
      </div>

      <label
        htmlFor={watchSwitchId}
        className="mt-3 block cursor-pointer text-xs font-semibold text-foreground"
      >
        {settings.subscriptionEnabled ? "Remove saved Watch preference" : "Save Watch preference"}
      </label>

      {settings.subscriptionEnabled ? (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <label htmlFor={inAppSwitchId} className="min-w-0 cursor-pointer">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <BellRing aria-hidden className="size-3.5 text-primary" />
                Future in-app alerts
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                Record my preference for meaningful events across every deal I save to Watch,
                after the service is activated.
              </span>
            </label>
            <Switch
              id={inAppSwitchId}
              checked={settings.inAppNotificationsEnabled}
              onCheckedChange={(next) =>
                updateNotificationPreference("inAppNotificationsEnabled", next)
              }
              disabled={pending}
              aria-label="Save future in-app Saved Deal Watch alert preference"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <label htmlFor={emailSwitchId} className="min-w-0 cursor-pointer">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <BellRing aria-hidden className="size-3.5 text-primary" />
                Future email alerts
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                Apply this to every deal I save to Watch. This consent is separate from rate
                alerts, portfolio summaries, and marketing email.
              </span>
            </label>
            <Switch
              id={emailSwitchId}
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(next) =>
                updateNotificationPreference("emailNotificationsEnabled", next)
              }
              disabled={pending}
              aria-label="Save future email Saved Deal Watch alert preference"
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Saving either preference sends nothing today. Delivery must re-check your current
              consent before any future notification; turning a preference off remains available
              here at any time.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
