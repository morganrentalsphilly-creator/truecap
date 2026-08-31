"use client";

/**
 * On-demand sale + rent comps for the analyzed address (RentCast, via
 * getPropertyCompsAction). On-demand by design - each pull costs paid API
 * quota - so nothing fetches until the user clicks. Paid-gated + address-
 * gated for visibility; hides itself if the provider isn't configured yet
 * (NOT_CONFIGURED), keeping it invisible until actually enabled.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import * as Sentry from "@sentry/nextjs";
import { Building2, Loader2 } from "lucide-react";
import { getPropertyCompsAction, getSavedDealCompsAction } from "@/app/actions/property-comps";
import type { EnrichmentComp, PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { buildCompWarnings } from "@/lib/comps-summary";
import { getCompsFreshness } from "@/lib/comps-freshness";
import type { PipelineStage } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { isCurrentMountedMutation } from "@/lib/deal-workspace-mutation-lifecycle";
import {
  propertyCompsRequestStillOwnsSubject,
  propertyCompsUnderwritingFingerprint,
} from "@/lib/property-comps-query";
import { useExpectedAccountUserId } from "@/components/auth/account-session-boundary";

const money = (n: number | null) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

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
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</div>
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
}) {
  const { toast } = useToast();
  const expectedUserId = useExpectedAccountUserId();
  const [data, setData] = useState<PropertyEnrichment | null>(null);
  const [dataFingerprint, setDataFingerprint] = useState<string | null>(null);
  const [source, setSource] = useState<"cache" | "live" | "saved" | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, startLoading] = useTransition();
  const queryFingerprint = propertyCompsUnderwritingFingerprint({
    address,
    propertyType,
    bedrooms,
    bathrooms,
    squareFootage,
  });

  // Comps belong to one exact provider query and workspace, not just one
  // address. Sync identity during the route commit so an old same-address pull
  // with different type/beds/baths/sqft cannot paint, toast, persist, apply, or
  // ground Deal Q&A on the newly shaped underwriting query.
  const queryFingerprintRef = useRef(queryFingerprint);
  const dataQueryFingerprintRef = useRef<string | null>(null);
  const savedDealIdRef = useRef<string | null>(savedDealId ?? null);
  const onDataChangeRef = useRef(onDataChange);
  const onUnavailableChangeRef = useRef(onUnavailableChange);
  const pullRequestRef = useRef<symbol | null>(null);
  useLayoutEffect(
    () => () => {
      pullRequestRef.current = null;
    },
    [],
  );
  useLayoutEffect(() => {
    onDataChangeRef.current = onDataChange;
    onUnavailableChangeRef.current = onUnavailableChange;
  }, [onDataChange, onUnavailableChange]);
  useLayoutEffect(() => {
    const nextDealId = savedDealId ?? null;
    if (
      queryFingerprintRef.current === queryFingerprint &&
      savedDealIdRef.current === nextDealId
    ) {
      return;
    }
    queryFingerprintRef.current = queryFingerprint;
    savedDealIdRef.current = nextDealId;
    dataQueryFingerprintRef.current = null;
    pullRequestRef.current = null;
    setData(null);
    setDataFingerprint(null);
    setSource(null);
    setUnavailable(false);
    onDataChangeRef.current?.(null);
    onUnavailableChangeRef.current?.(false);
  }, [queryFingerprint, savedDealId]);

  // On a saved deal, load any previously-saved comp set (no API call / quota).
  useEffect(() => {
    if (!enabled || !savedDealId) return;
    const dealIdAtLoad = savedDealId;
    const fingerprintAtLoad = queryFingerprint;
    let active = true;
    void (async () => {
      try {
        const r = await getSavedDealCompsAction({
          dealId: dealIdAtLoad,
          address,
          propertyType,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
          squareFootage: squareFootage ?? undefined,
        });
        if (
          active &&
          savedDealIdRef.current === dealIdAtLoad &&
          queryFingerprintRef.current === fingerprintAtLoad &&
          r.ok &&
          r.enrichment
        ) {
          // Legacy payloads can predate fetchedAt in the enrichment itself —
          // backfill from the row's fetched_at so the freshness hint still works.
          const enrichment =
            !r.enrichment.fetchedAt && r.fetchedAt
              ? { ...r.enrichment, fetchedAt: r.fetchedAt }
              : r.enrichment;
          dataQueryFingerprintRef.current = fingerprintAtLoad;
          setData(enrichment);
          setDataFingerprint(fingerprintAtLoad);
          setSource("saved");
          onDataChangeRef.current?.(enrichment);
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
  }, [
    address,
    bathrooms,
    bedrooms,
    enabled,
    propertyType,
    queryFingerprint,
    savedDealId,
    squareFootage,
  ]);

  if (!enabled || !address || unavailable) return null;

  const visibleData =
    data && dataFingerprint === queryFingerprint ? data : null;

  const pull = () => {
    // Captured at click time: a slow RentCast roundtrip must not attach its
    // result to whatever address the analyzer moved on to mid-flight — the
    // same stale-response contract as the saved-comps load effect above
    // (comps ground Deal Q&A answers, so a mismatch is confidently wrong).
    const pulledAddress = address;
    const pulledDealId = savedDealId ?? null;
    const pulledFingerprint = queryFingerprint;
    const requestToken = Symbol("property-comps-pull");
    pullRequestRef.current = requestToken;
    const pullStillOwnsWorkspace = () =>
      propertyCompsRequestStillOwnsSubject({
        requestedFingerprint: pulledFingerprint,
        currentFingerprint: queryFingerprintRef.current,
        requestedDealId: pulledDealId,
        currentDealId: savedDealIdRef.current,
      }) &&
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: pullRequestRef.current,
      });
    startLoading(async () => {
      try {
        const r = await getPropertyCompsAction({
          address: pulledAddress,
          propertyType,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
          squareFootage: squareFootage ?? undefined,
          dealId: pulledDealId ?? undefined,
          expectedUserId: expectedUserId ?? undefined,
        });
        // Workspace changed while the pull was in flight → the result (or its
        // error) belongs to the previous deal; drop it silently. The route
        // identity effect above already cleared the display.
        if (!pullStillOwnsWorkspace()) return;
        if (!r.ok) {
          if (r.code === "NOT_CONFIGURED") {
            setUnavailable(true);
            onUnavailableChangeRef.current?.(true);
            return;
          }
          // Hitting the plan limit is not an error the user caused — a red
          // failure toast at the moment they wanted more data buried the
          // upgrade path. Route it constructively; real failures stay red.
          if (r.code === "ENTITLEMENT_REQUIRED" || r.code === "CAP_REACHED") {
            toast({
              title:
                r.code === "ENTITLEMENT_REQUIRED"
                  ? "Free comps lookup used"
                  : "Monthly comps limit reached",
              description: r.message,
              action: (
                <ToastAction
                  altText="See Pro plans with 50 comps lookups per month"
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
          toast({ title: "Couldn't pull comps", description: r.message, variant: "destructive" });
          return;
        }
        dataQueryFingerprintRef.current = pulledFingerprint;
        setData(r.enrichment);
        setDataFingerprint(pulledFingerprint);
        setSource(r.source);
        onDataChangeRef.current?.(r.enrichment);
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the button
        // spinner clears with no result and no signal. Honor the same stale-
        // address guard, then surface a retryable toast.
        if (!pullStillOwnsWorkspace()) return;
        Sentry.captureException(err, { tags: { feature: "property-comps" } });
        toast({
          title: "Couldn't pull comps",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (pullRequestRef.current === requestToken) {
          pullRequestRef.current = null;
        }
      }
    });
  };

  const compWarnings = visibleData
    ? buildCompWarnings(visibleData, currentRent, currentPrice)
    : [];
  // Stage-aware staleness hint (display-only — the Refresh button above is
  // the action; nothing refetches on its own). No stage = loosest window.
  const freshness = visibleData
    ? getCompsFreshness(visibleData.fetchedAt, stage ?? null)
    : null;

  return (
    <section aria-label="Sale and rent comps" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Sale &amp; rent comps</h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant={visibleData ? "outline" : "default"}
          className="h-8"
          disabled={loading}
          onClick={pull}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : visibleData ? "Refresh" : "Run comps"}
        </Button>
      </div>

      {!visibleData ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Pull live sale and rental comparables for this address - value + rent estimates from nearby
          properties to sanity-check your assumptions.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {freshness?.stale ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
              Comps are {freshness.ageDays} days old — refresh to re-check against today&apos;s
              market.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. value</div>
              <div className="mt-1 text-lg font-bold text-foreground">{money(visibleData.valueEstimate)}</div>
              {visibleData.valueRange && (visibleData.valueRange.low != null || visibleData.valueRange.high != null) ? (
                <div className="text-[11px] text-muted-foreground">
                  {money(visibleData.valueRange.low)}–{money(visibleData.valueRange.high)}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. rent</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(visibleData.rentEstimate)}
                {visibleData.rentEstimate != null ? <span className="text-xs font-medium text-muted-foreground">/mo</span> : null}
              </div>
              {visibleData.rentRange && (visibleData.rentRange.low != null || visibleData.rentRange.high != null) ? (
                <div className="text-[11px] text-muted-foreground">
                  {money(visibleData.rentRange.low)}–{money(visibleData.rentRange.high)}
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
                      ? "rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-foreground"
                      : "rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
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
                if (dataQueryFingerprintRef.current !== queryFingerprintRef.current) return;
                onApply(visibleData);
                toast({
                  title: "Applied to your analysis",
                  description: "Filled property facts, active-listing price when available, and estimated market rent. The AVM remains reference-only.",
                });
              }}
            >
              Use eligible facts in my analysis
            </Button>
          ) : null}

          <CompList title="Sale comps" comps={visibleData.saleComps} />
          <CompList title="Rent comps" comps={visibleData.rentComps} suffix="/mo" />

          <p className="text-[10px] text-muted-foreground">
            Source: RentCast · {source === "live" ? "live" : source === "saved" ? "saved to this deal" : "cached"}.
            Automated estimates - verify against local comps before relying on them.
          </p>
        </div>
      )}
    </section>
  );
}
