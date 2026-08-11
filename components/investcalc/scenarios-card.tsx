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

import { useEffect, useMemo, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompare, Layers, Loader2, Plus } from "lucide-react";
import {
  addScenarioAction,
  listScenariosAction,
  type ScenarioSummary,
} from "@/app/actions/scenarios";
import { compareScenariosAction } from "@/app/actions/compare";
import { STRATEGY_KINDS, strategyLabel } from "@/lib/strategy-kinds";
import { describeStrategyPreset } from "@/lib/scenario-presets";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScenariosCard({ savedDealId }: { savedDealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [isSaving, startSaving] = useTransition();

  const refresh = useMemo(
    () =>
      function load() {
        void listScenariosAction(savedDealId)
          .then((result) => {
            if (result.ok) {
              setScenarios(result.scenarios);
            } else if (result.code === "MIGRATION_PENDING" || result.code === "NOT_FOUND") {
              setHidden(true);
            }
            setLoaded(true);
          })
          .catch(() => setLoaded(true));
      },
    [savedDealId]
  );

  useEffect(() => {
    refresh();
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
        toast({ title: "Scenario added", description: "Open it to adjust assumptions for that strategy." });
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
        // Success redirects to /dashboard/compare; only an error returns here.
        if (result && !result.ok) {
          toast({ title: "Couldn't compare scenarios", description: result.message, variant: "destructive" });
        }
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

  // Show the deal itself as a scenario row even before any siblings exist.
  const rows: ScenarioSummary[] =
    scenarios.length > 0
      ? scenarios
      : [{ id: savedDealId, scenarioName: "Base case", strategyKind: null, title: null, isSource: true }];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Scenarios</h2>
        </div>
        {scenarios.length >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCompare}
            disabled={isSaving}
            className="gap-1.5 text-xs text-primary"
          >
            <GitCompare className="size-3.5" /> Compare
          </Button>
        ) : null}
      </div>
      <p className="mb-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Model this property under different strategies. Each scenario is its own saved analysis sharing
        this address, so you can compare buy-and-hold vs BRRRR vs flip side by side.
      </p>

      <ul className="space-y-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{s.scenarioName}</span>
              {s.strategyKind ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {strategyLabel(s.strategyKind)}
                </span>
              ) : null}
              {s.isSource ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  Current
                </span>
              ) : null}
            </div>
            {s.isSource ? null : (
              <Link
                href={`/dashboard/saved-analyses/${s.id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open
              </Link>
            )}
          </li>
        ))}
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
                placeholder="e.g. BRRRR"
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm"
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
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
              >
                <option value="">No strategy</option>
                {STRATEGY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {strategyLabel(k)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {describeStrategyPreset(strategy) ??
              "Starts as a copy of this deal's numbers - open it to adjust the assumptions for that strategy."}
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd} disabled={isSaving} className="gap-1.5">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add scenario
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="mt-4 gap-1.5">
          <Plus className="size-4" /> Add a scenario
        </Button>
      )}
    </section>
  );
}
