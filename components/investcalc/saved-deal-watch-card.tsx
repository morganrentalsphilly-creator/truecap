"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

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
  const savedDealIdRef = useRef<string | null>(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
    setLoaded(false);
    setAvailable(true);
    setSettings(null);
    return () => {
      if (savedDealIdRef.current !== savedDealId) return;
      savedDealIdRef.current = null;
      mutationRequestRef.current = null;
    };
  }, [savedDealId]);

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
        } else {
          toast({
            title: "Couldn't load Watch setup",
            description: result.message,
            variant: "destructive",
          });
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
  }, [savedDealId, toast]);

  const toggleWatch = (next: boolean) => {
    if (!settings) return;
    const previous = settings;
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("saved-deal-watch-toggle");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setSettings({ ...settings, subscriptionEnabled: next });
    startTransition(async () => {
      try {
        const result = await setSavedDealWatchEnabledAction({
          savedAnalysisId: dealAtSubmit,
          enabled: next,
        });
        if (!requestStillOwnsDeal()) return;
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
        if (!requestStillOwnsDeal()) return;
        setSettings(previous);
        toast({
          title: "Couldn't save Watch setup",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
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
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("saved-deal-watch-preference");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setSettings(optimistic);
    startTransition(async () => {
      try {
        const result = await setSavedDealWatchPreferencesAction({
          savedAnalysisId: dealAtSubmit,
          preference: key,
          enabled: next,
        });
        if (!requestStillOwnsDeal()) return;
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
        if (!requestStillOwnsDeal()) return;
        setSettings(previous);
        toast({
          title: "Couldn't save notification preference",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
      }
    });
  };

  // The feature flag is also enforced by the server page and every action.
  // Missing schema or access self-hides instead of presenting a dead control.
  if (!loaded || !available || !settings) return null;
  // A user who never opted in should not see a paid control after downgrade.
  // Retained rows remain visible because consent must stay revocable.
  if (!settings.canEnable && !settings.hasStoredConfiguration) return null;
  const showNotificationPreferences =
    settings.subscriptionEnabled ||
    settings.inAppNotificationsEnabled ||
    settings.emailNotificationsEnabled;

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
              Saved Deal Watch preview
            </h2>
          </div>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Join the waitlist for meaningful-change alerts, such as a deal moving within its
            Offer Ceiling or Buy Box rules.
          </p>
        </div>
        <Switch
          id={watchSwitchId}
          checked={settings.subscriptionEnabled}
          onCheckedChange={toggleWatch}
          disabled={
            pending || (!settings.canEnable && !settings.subscriptionEnabled)
          }
          aria-label={settings.subscriptionEnabled ? "Leave Saved Deal Watch waitlist" : "Join Saved Deal Watch waitlist"}
        />
      </div>

      <div
        className="mt-4 rounded-xl border border-warning/35 bg-warning/10 p-3"
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-bold text-foreground">
           {settings.subscriptionEnabled
             ? "Waitlist preference saved — Automatic monitoring is inactive"
             : "Preview only — Automatic monitoring is not active"}
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
        {settings.subscriptionEnabled
          ? "Leave waitlist"
          : settings.canEnable
            ? "Join waitlist"
            : "Watch requires Pro"}
      </label>

      {!settings.canEnable ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Your current plan cannot add Watch consent. Any retained opt-in or
          notification preference can still be turned off here.
        </p>
      ) : null}

      {showNotificationPreferences ? (
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
              disabled={
                pending ||
                (!settings.canEnable && !settings.inAppNotificationsEnabled)
              }
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
              disabled={
                pending ||
                (!settings.canEnable && !settings.emailNotificationsEnabled)
              }
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
