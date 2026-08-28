"use client";

/**
 * Scenarios card (DM-1) - on a saved deal, model the SAME property under
 * different strategies (buy-and-hold vs BRRRR vs flip vs STR) as sibling
 * scenarios. Lists the property's scenarios and adds a new one (clone of this
 * deal with a name + strategy), via app/actions/scenarios.ts.
 *
 * Self-contained + invisible-until-useful: it self-hides while the schema
 * migration is pending. A new scenario is a normal saved deal, so it opens in
 * its own deal view.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { FolderOpen, GitCompare, Layers, Loader2, Plus } from "lucide-react";
import {
  addScenarioAction,
  listScenariosAction,
  type ScenarioSummary,
} from "@/app/actions/scenarios";
import { compareScenariosAction } from "@/app/actions/compare";
import { STRATEGY_KINDS, strategyLabel } from "@/lib/strategy-kinds";
import { describeStrategyPreset } from "@/lib/scenario-presets";
import { isScenarioStrategyEnabled } from "@/lib/feature-flags";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RELEASED_STRATEGY_KINDS = STRATEGY_KINDS.filter((kind) =>
  isScenarioStrategyEnabled(kind),
);

export function ScenariosCard({ savedDealId }: { savedDealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [isSaving, startSaving] = useTransition();
  const loadRequestRef = useRef(0);

  const refresh = useMemo(
    () =>
      function load() {
        const requestId = ++loadRequestRef.current;
        setLoaded(false);
        setLoadError(null);
        setHidden(false);
        void listScenariosAction(savedDealId)
          .then((result) => {
            if (requestId !== loadRequestRef.current) return;
            if (result.ok) {
              setScenarios(result.scenarios);
            } else if (result.code === "MIGRATION_PENDING") {
              setHidden(true);
            } else {
              setLoadError(result.message || "We couldn't load scenarios for this deal.");
            }
            setLoaded(true);
          })
          .catch((err) => {
            if (requestId !== loadRequestRef.current) return;
            Sentry.captureException(err, { tags: { feature: "scenarios-load" } });
            setLoadError("We couldn't load scenarios. Check your connection and try again.");
            setLoaded(true);
          });
      },
    [savedDealId]
  );

  useEffect(() => {
    refresh();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [refresh]);

  function handleAdd() {
    startSaving(async () => {
      try {
        const result = await addScenarioAction({
          sourceDealId: savedDealId,
          scenarioName: name.trim() || undefined,
          strategyKind: strategy || null,
        });
        if (!result.ok) {
          if (result.code === "MIGRATION_PENDING") {
            setHidden(true);
            return;
          }
          toast({ title: "Couldn't add scenario", description: result.message, variant: "destructive" });
          return;
        }
        trackEvent("scenario_added", {
          has_strategy: Boolean(strategy),
          strategy_kind: strategy || null,
        });
        setName("");
        setStrategy("");
        setAdding(false);
        toast({
          title: "Scenario created",
          description: "It is a separate saved copy. Open its workspace when you are ready to adjust assumptions.",
        });
        refresh();
        // A scenario is a new saved_analyses row: the persistent dashboard
        // layout's My Deals count badge only updates via a server refetch.
        router.refresh();
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the form
        // stays open with the spinner already gone but no signal — the typed
        // name/strategy are preserved, so a retry just re-clicks Add.
        Sentry.captureException(err, { tags: { feature: "scenarios" } });
        toast({
          title: "Couldn't add scenario",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  }

  function handleCompare() {
    trackEvent("scenarios_compared", { count: scenarios.length });
    startSaving(async () => {
      try {
        const result = await compareScenariosAction(savedDealId);
        if (!result.ok) {
          toast({ title: "Couldn't compare scenarios", description: result.message, variant: "destructive" });
          return;
        }
        // Use a document navigation after the HttpOnly cookie is committed.
        // Keeping another App Router navigation inside this pending transition
        // can leave it waiting indefinitely even after the route is fetched.
        window.location.assign("/dashboard/compare");
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the Compare
        // click silently does nothing. Tell the user it's retryable.
        Sentry.captureException(err, { tags: { feature: "scenarios" } });
        toast({
          title: "Couldn't compare scenarios",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  }

  if (!loaded || hidden) return null;

  if (loadError) {
    return (
      <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 sm:p-5">
        <div role="alert">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load scenarios</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadError} Adding and comparing stay disabled until the saved scenarios are available.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-3 min-h-11" onClick={refresh}>
          Try again
        </Button>
      </section>
    );
  }

  // Show the deal itself as a scenario row even before any siblings exist.
  const rows: ScenarioSummary[] =
    scenarios.length > 0
      ? scenarios
      : [
          {
            id: savedDealId,
            scenarioName: "Base case",
            strategyKind: null,
            title: null,
            isBase: true,
            isSource: true,
          },
        ];
  const sourceName =
    rows.find((row) => row.isSource)?.scenarioName ?? rows[0]?.scenarioName ?? "this analysis";
  const hasBase = rows.some((row) => row.isBase);
  const alternateCount = rows.filter((row) => !row.isBase).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Scenarios</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {hasBase ? "1 base · " : ""}
            {alternateCount} {alternateCount === 1 ? "scenario" : "scenarios"}
          </span>
        </div>
        {scenarios.length >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCompare}
            disabled={isSaving}
            className="min-h-11 gap-1.5 text-xs text-primary"
          >
            <GitCompare aria-hidden className="size-3.5" /> Compare scenarios
          </Button>
        ) : null}
      </div>
      <p className="mb-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        {hasBase
          ? "Base is the original saved analysis. Every scenario is a separate copy linked to this property, so changing one never changes Base or another scenario."
          : "Each scenario is a separate saved analysis linked to this property, so changing one never changes another scenario."}
      </p>

      <ul className="space-y-2">
        {rows.map((s) => {
          const kindLabel = s.isBase ? "Base" : "Scenario";
          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{s.scenarioName}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {kindLabel}
                  </span>
                  {s.strategyKind &&
                  isScenarioStrategyEnabled(s.strategyKind) ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {strategyLabel(s.strategyKind)}
                    </span>
                  ) : null}
                  {s.isSource ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Viewing
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {s.isBase
                    ? "Original saved assumptions for this property."
                    : "Independent copy — edits here do not change Base."}
                </p>
              </div>
              {s.isSource ? (
                <span className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-muted-foreground">
                  Workspace open
                </span>
              ) : (
                // Keep this as a native navigation. Next's client router can
                // abort a same-route dynamic-id transition after prefetching.
                <a
                  href={`/dashboard/saved-analyses/${s.id}`}
                  aria-label={`Open ${s.scenarioName} workspace`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <FolderOpen aria-hidden className="size-3.5" /> Open workspace
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scenario-name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Scenario name
              </Label>
              <Input
                id="scenario-name"
                value={name}
                placeholder="e.g. Lower-rate case"
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scenario-strategy" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Strategy (optional)
              </Label>
              <select
                id="scenario-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                /* text-base below md: iOS Safari zooms the page in on sub-16px
                   form controls (the Input primitive encodes the same rule). */
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
              >
                <option value="">No strategy</option>
                {RELEASED_STRATEGY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {strategyLabel(k)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <p>
              Starts as a separate copy of <span className="font-semibold text-foreground">{sourceName}</span>.
              Later edits stay isolated from every other saved analysis.
            </p>
            {describeStrategyPreset(strategy) ? <p className="mt-1">{describeStrategyPreset(strategy)}</p> : null}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdding(false)}
              disabled={isSaving}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd} disabled={isSaving} className="min-h-11 gap-1.5">
              {isSaving ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Plus aria-hidden className="size-4" />
              )}
              Add scenario
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="mt-4 min-h-11 gap-1.5">
          <Plus aria-hidden className="size-4" /> Add a scenario
        </Button>
      )}
    </section>
  );
}
