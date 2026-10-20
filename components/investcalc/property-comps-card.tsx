"use client";

/**
 * On-demand sale + rent comps for the analyzed address (RentCast, via
 * getPropertyCompsAction). On-demand by design - each pull costs paid API
 * quota - so nothing fetches until the user clicks. Paid-gated + address-
 * gated for visibility; hides itself if the provider isn't configured yet
 * (NOT_CONFIGURED), keeping it invisible until actually enabled.
 *
 * PAUSED POOL. Live lookups draw on a shared pool of 50 RentCast requests per
 * billing period. The card reads the pool once on mount
 * (getCompsAvailabilityAction: one DB read, no reservation) so an empty pool
 * shows BEFORE a click: a cached or saved set stays on screen with "Comps from
 * Oct 3"; without one, a quiet line replaces the Run button. A CAP_REACHED
 * result after a click lands in the same inline state — never a toast, never
 * red; nothing about the analysis is broken.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Building2, Loader2 } from "lucide-react";
import {
  getCompsAvailabilityAction,
  getPropertyCompsAction,
  getSavedDealCompsAction,
} from "@/app/actions/property-comps";
import type { EnrichmentComp, PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { buildCompWarnings } from "@/lib/comps-summary";
import { getCompsFreshness } from "@/lib/comps-freshness";
import type { PipelineStage } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";

const money = (n: number | null) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

/** "Oct 3" (with the year once it is not this year). Null when unparseable. */
export function formatCompsDate(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

function compMeta(c: EnrichmentComp): string {
  const parts: string[] = [];
  if (c.bedrooms != null) parts.push(`${c.bedrooms}bd`);
  if (c.bathrooms != null) parts.push(`${c.bathrooms}ba`);
  if (c.squareFootage != null) parts.push(`${c.squareFootage.toLocaleString()}sf`);
  if (c.distanceMiles != null) parts.push(`${c.distanceMiles.toFixed(1)}mi`);
  return parts.join(" · ");
}

function CompList({ title, comps, suffix }: { title: string; comps: EnrichmentComp[]; suffix?: string }) {
  if (comps.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-3xs font-bold uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="divide-y divide-border/60">
        {comps.map((c, i) => (
          <li key={`${c.address}-${i}`} className="flex items-center justify-between gap-2 py-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate text-foreground" title={c.address}>
              {c.address}
            </span>
            <span className="hidden shrink-0 text-muted-foreground sm:inline">{compMeta(c)}</span>
            <span className="shrink-0 font-semibold text-foreground">
              {money(c.price)}
              {suffix ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PropertyCompsCard({
  enabled,
  address,
  propertyType,
  bedrooms,
  bathrooms,
  squareFootage,
  currentRent,
  currentPrice,
  savedDealId,
  stage,
  onApply,
  onDataChange,
  onUnavailableChange,
  onPausedChange,
}: {
  enabled: boolean;
  address: string | null;
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  /** The analyzer's current rent + price, to flag when they fall outside comps. */
  currentRent?: number | null;
  currentPrice?: number | null;
  /** When set, comps are saved to + loaded from this deal (persistent set). */
  savedDealId?: string | null;
  /** The deal's pipeline stage, when the hosting surface knows it — tightens
   *  the freshness window (lib/comps-freshness) as the deal nears a binding
   *  number. Absent (the unsaved live analyzer) = loosest window. */
  stage?: PipelineStage | null;
  /** Fill the analyzer form from the pulled facts + estimates. */
  onApply?: (enrichment: PropertyEnrichment) => void;
  /** Reports the comp set this card is showing up to the dashboard so the
   *  Deal Q&A grounding context can include it (no extra fetch — exactly
   *  the data already on screen). */
  onDataChange?: (enrichment: PropertyEnrichment | null) => void;
  /** Reports the NOT_CONFIGURED self-hide up so a hosting ledger row can
   *  hide its shell too — otherwise the row header fronts a card that
   *  renders null (provider not configured on this deployment). */
  onUnavailableChange?: (unavailable: boolean) => void;
  /** Reports the paused pool up so the hosting ledger row's collapsed summary
   *  can say so instead of inviting a pull: the day it is back, null when
   *  paused with no date, undefined when open. */
  onPausedChange?: (pausedUntil: string | null | undefined) => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<PropertyEnrichment | null>(null);
  const [source, setSource] = useState<"cache" | "live" | "saved" | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // The shared pool is paused: the day it is back ("Nov 21"), or null for
  // "paused, date unknown". `undefined` = open.
  const [pausedUntil, setPausedUntil] = useState<string | null | undefined>(undefined);
  const paused = pausedUntil !== undefined;
  const [loading, startLoading] = useTransition();
  useEffect(() => {
    onPausedChange?.(pausedUntil);
    // onPausedChange is a stable setter in practice (see the clear effect
    // below); keying on it would re-report on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausedUntil]);

  // Comps belong to ONE address. When the analyzed address changes, the
  // previous pull must not survive — on screen OR in the Deal Q&A grounding
  // context (which hard-claims "the user ran comps on this address"); a
  // stale set would ground AI answers on the wrong property.
  const lastAddressRef = useRef<string | null>(address);
  useEffect(() => {
    if (lastAddressRef.current === address) return;
    lastAddressRef.current = address;
    setData(null);
    setSource(null);
    setFetchedAt(null);
    setUnavailable(false);
    onDataChange?.(null);
    // onDataChange is a stable setter in practice; keying on it would
    // re-fire the clear on parent re-renders with inline handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Read the shared pool ONCE on mount (signed-in, one DB read, no
  // reservation) so the paused state shows before anyone clicks.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void (async () => {
      try {
        const r = await getCompsAvailabilityAction();
        if (!active || !r.ok) return;
        if (!r.configured) {
          setUnavailable(true);
          onUnavailableChange?.(true);
          return;
        }
        if (!r.available) setPausedUntil(r.resumesOn);
      } catch {
        // Best-effort read; the click path still handles every state.
      }
    })();
    return () => {
      active = false;
    };
    // onUnavailableChange is a stable setter in practice (see the clear
    // effect above); keying on it would re-read the pool on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // On a saved deal, load any previously-saved comp set (no API call / quota).
  useEffect(() => {
    if (!enabled || !savedDealId) return;
    let active = true;
    void (async () => {
      try {
        const r = await getSavedDealCompsAction(savedDealId);
        if (active && r.ok && r.enrichment) {
          // Legacy payloads can predate fetchedAt in the enrichment itself —
          // backfill from the row's fetched_at so the freshness hint still works.
          const enrichment =
            !r.enrichment.fetchedAt && r.fetchedAt
              ? { ...r.enrichment, fetchedAt: r.fetchedAt }
              : r.enrichment;
          setData(enrichment);
          setSource("saved");
          setFetchedAt(enrichment.fetchedAt ?? r.fetchedAt ?? null);
          onDataChange?.(enrichment);
        }
      } catch {
        // Best-effort load of a previously-saved comp set — a thrown action
        // (transient outage, stale-deploy Server Action) just leaves the card
        // in its "Run comps" state rather than surfacing an unhandled promise
        // rejection to Sentry. The user can still pull fresh comps on demand.
      }
    })();
    return () => {
      active = false;
    };
    // onDataChange is a stable setter in practice (see the clear effect
    // above); keying on it would re-load saved comps on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, savedDealId]);

  if (!enabled || !address || unavailable) return null;

  const pull = () => {
    // Captured at click time: a slow RentCast roundtrip must not attach its
    // result to whatever address the analyzer moved on to mid-flight — the
    // same stale-response contract as the saved-comps load effect above
    // (comps ground Deal Q&A answers, so a mismatch is confidently wrong).
    const pulledAddress = address;
    startLoading(async () => {
      try {
        const r = await getPropertyCompsAction({
          address: pulledAddress,
          propertyType,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
          squareFootage: squareFootage ?? undefined,
          dealId: savedDealId ?? undefined,
        });
        // Address changed while the pull was in flight → the result (or its
        // error) belongs to the previous deal; drop it silently — the
        // address-change effect above already cleared the display.
        if (lastAddressRef.current !== pulledAddress) return;
        if (!r.ok) {
          if (r.code === "NOT_CONFIGURED") {
            setUnavailable(true);
            onUnavailableChange?.(true);
            return;
          }
          if (r.code === "CAP_REACHED") {
            // The shared pool is paused. Nothing was sent, nothing is broken:
            // show it inline where the button was. No toast — a red failure
            // toast at the moment they wanted more data is the wrong story,
            // and no plan lifts a site-wide pause, so there is nothing to sell.
            setPausedUntil(r.resumesOn);
            return;
          }
          if (r.code === "ENTITLEMENT_REQUIRED") {
            // The free lookup is spent. Route to plans — unless the pool is
            // paused, where upgrading unlocks nothing.
            toast({
              title: "Free comps lookup used",
              description: r.message,
              action: paused ? undefined : (
                <ToastAction
                  altText="See Pro plans with comps lookups included"
                  onClick={() => {
                    window.location.assign("/pricing");
                  }}
                >
                  See plans
                </ToastAction>
              ),
            });
            return;
          }
          if (r.code === "AUTOPULL_OFF") return;
          toast({ title: "Couldn't pull comps", description: r.message, variant: "destructive" });
          return;
        }
        setData(r.enrichment);
        setSource(r.source);
        setFetchedAt(r.fetchedAt ?? r.enrichment.fetchedAt ?? null);
        onDataChange?.(r.enrichment);
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the button
        // spinner clears with no result and no signal. Honor the same stale-
        // address guard, then surface a retryable toast.
        Sentry.captureException(err, { tags: { feature: "property-comps" } });
        if (lastAddressRef.current !== pulledAddress) return;
        toast({
          title: "Couldn't pull comps",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const compWarnings = data ? buildCompWarnings(data, currentRent, currentPrice) : [];
  // Stage-aware staleness hint (display-only — the Refresh button above is
  // the action; nothing refetches on its own). No stage = loosest window.
  const freshness = data ? getCompsFreshness(data.fetchedAt, stage ?? null) : null;
  const compsDate = formatCompsDate(fetchedAt ?? data?.fetchedAt);
  const pausedLine = pausedUntil
    ? `Live comps are paused until ${pausedUntil}.`
    : "Live comps are paused for now.";

  return (
    <section aria-label="Sale and rent comps" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Sale &amp; rent comps</h3>
        </div>
        {paused ? (
          data && compsDate ? (
            <span data-comps-from="" className="shrink-0 text-xs text-muted-foreground">
              Comps from {compsDate}
            </span>
          ) : null
        ) : (
          <Button
            type="button"
            size="sm"
            variant={data ? "outline" : "default"}
            className="h-8"
            disabled={loading}
            onClick={pull}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : data ? "Refresh" : "Run comps"}
          </Button>
        )}
      </div>

      {!data ? (
        paused ? (
          <p data-comps-paused="" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {pausedLine} Your analysis still runs. Enter beds, baths and price yourself.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Pull live sale and rental comparables for this address - value + rent estimates from nearby
            properties to sanity-check your assumptions.
          </p>
        )
      ) : (
        <div className="mt-3 space-y-3">
          {paused ? (
            <p data-comps-paused="" className="text-2xs leading-relaxed text-muted-foreground">
              {pausedLine} These comps were pulled earlier for this address; your analysis still runs.
            </p>
          ) : freshness?.stale ? (
            <div className="rounded-lg border border-caution/40 bg-caution-light px-3 py-2 text-2xs leading-relaxed text-foreground">
              Comps are {freshness.ageDays} days old — refresh to re-check against today&apos;s
              market.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Est. value</div>
              <div className="mt-1 text-lg font-bold text-foreground">{money(data.valueEstimate)}</div>
              {data.valueRange && (data.valueRange.low != null || data.valueRange.high != null) ? (
                <div className="text-2xs text-muted-foreground">
                  {money(data.valueRange.low)}–{money(data.valueRange.high)}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Est. rent</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(data.rentEstimate)}
                {data.rentEstimate != null ? <span className="text-xs font-medium text-muted-foreground">/mo</span> : null}
              </div>
              {data.rentRange && (data.rentRange.low != null || data.rentRange.high != null) ? (
                <div className="text-2xs text-muted-foreground">
                  {money(data.rentRange.low)}–{money(data.rentRange.high)}
                </div>
              ) : null}
            </div>
          </div>

          {compWarnings.length > 0 ? (
            <div className="space-y-1.5">
              {compWarnings.map((w, i) => (
                <div
                  key={i}
                  className={
                    w.tone === "warn"
                      ? "rounded-lg border border-caution/40 bg-caution-light px-3 py-2 text-2xs leading-relaxed text-foreground"
                      : "rounded-lg border border-border bg-muted/30 px-3 py-2 text-2xs leading-relaxed text-muted-foreground"
                  }
                >
                  {w.text}
                </div>
              ))}
            </div>
          ) : null}

          {onApply ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                onApply(data);
                toast({
                  title: "Applied to your analysis",
                  description: "Filled property facts, active-listing price when available, and estimated market rent. The AVM remains reference-only.",
                });
              }}
            >
              Use eligible facts in my analysis
            </Button>
          ) : null}

          <CompList title="Sale comps" comps={data.saleComps} />
          <CompList title="Rent comps" comps={data.rentComps} suffix="/mo" />

          <p className="text-3xs text-muted-foreground">
            Source: RentCast ·{" "}
            {source === "live" ? "live" : source === "saved" ? "saved to this deal" : "cached"}
            {compsDate ? ` · pulled ${compsDate}` : ""}. Automated estimates - verify against local
            comps before relying on them.
          </p>
        </div>
      )}
    </section>
  );
}
