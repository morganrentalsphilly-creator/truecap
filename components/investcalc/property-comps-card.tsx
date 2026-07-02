"use client";

/**
 * On-demand sale + rent comps for the analyzed address (RentCast, via
 * getPropertyCompsAction). On-demand by design - each pull costs paid API
 * quota - so nothing fetches until the user clicks. Paid-gated + address-
 * gated for visibility; hides itself if the provider isn't configured yet
 * (NOT_CONFIGURED), keeping it invisible until actually enabled.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import { getPropertyCompsAction, getSavedDealCompsAction } from "@/app/actions/property-comps";
import type { EnrichmentComp, PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import { checkCompRange } from "@/lib/comp-range-check";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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

/** Build actionable warnings when the analyzer's rent/price sit outside the
 *  pulled comp ranges - the "make comps actionable" layer. */
function buildCompWarnings(
  data: PropertyEnrichment,
  currentRent: number | null | undefined,
  currentPrice: number | null | undefined
): { tone: "warn" | "info"; text: string }[] {
  const out: { tone: "warn" | "info"; text: string }[] = [];
  const rent = checkCompRange(currentRent, data.rentRange);
  if (rent.status === "above" && rent.pctOutside >= 5) {
    out.push({
      tone: "warn",
      text: `Your ${money(currentRent ?? null)}/mo rent is ${rent.pctOutside}% above the comp range (${money(rent.low)}–${money(rent.high)}). Cash flow may be optimistic - comps support up to about ${money(rent.high)}.`,
    });
  } else if (rent.status === "below" && rent.pctOutside >= 8) {
    out.push({
      tone: "info",
      text: `Your ${money(currentRent ?? null)}/mo rent is ${rent.pctOutside}% below the comp range (${money(rent.low)}–${money(rent.high)}) - you may be under-renting.`,
    });
  }
  const price = checkCompRange(currentPrice, data.valueRange);
  if (price.status === "above" && price.pctOutside >= 5) {
    out.push({
      tone: "warn",
      text: `Your ${money(currentPrice ?? null)} price is ${price.pctOutside}% above the comp value range (${money(price.low)}–${money(price.high)}) - you may be paying above recent sales.`,
    });
  }
  return out;
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
  onApply,
  onDataChange,
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
  /** Fill the analyzer form from the pulled facts + estimates. */
  onApply?: (enrichment: PropertyEnrichment) => void;
  /** Reports the comp set this card is showing up to the dashboard so the
   *  Deal Q&A grounding context can include it (no extra fetch — exactly
   *  the data already on screen). */
  onDataChange?: (enrichment: PropertyEnrichment | null) => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<PropertyEnrichment | null>(null);
  const [source, setSource] = useState<"cache" | "live" | "saved" | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, startLoading] = useTransition();

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
    setUnavailable(false);
    onDataChange?.(null);
    // onDataChange is a stable setter in practice; keying on it would
    // re-fire the clear on parent re-renders with inline handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // On a saved deal, load any previously-saved comp set (no API call / quota).
  useEffect(() => {
    if (!enabled || !savedDealId) return;
    let active = true;
    void (async () => {
      const r = await getSavedDealCompsAction(savedDealId);
      if (active && r.ok && r.enrichment) {
        setData(r.enrichment);
        setSource("saved");
        onDataChange?.(r.enrichment);
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, savedDealId]);

  if (!enabled || !address || unavailable) return null;

  const pull = () => {
    startLoading(async () => {
      const r = await getPropertyCompsAction({
        address,
        propertyType,
        bedrooms: bedrooms ?? undefined,
        bathrooms: bathrooms ?? undefined,
        squareFootage: squareFootage ?? undefined,
        dealId: savedDealId ?? undefined,
      });
      if (!r.ok) {
        if (r.code === "NOT_CONFIGURED") {
          setUnavailable(true);
          return;
        }
        toast({ title: "Couldn't pull comps", description: r.message, variant: "destructive" });
        return;
      }
      setData(r.enrichment);
      setSource(r.source);
      onDataChange?.(r.enrichment);
    });
  };

  const compWarnings = data ? buildCompWarnings(data, currentRent, currentPrice) : [];

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
          variant={data ? "outline" : "default"}
          className="h-8"
          disabled={loading}
          onClick={pull}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : data ? "Refresh" : "Run comps"}
        </Button>
      </div>

      {!data ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Pull live sale and rental comparables for this address - value + rent estimates from nearby
          properties to sanity-check your assumptions.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. value</div>
              <div className="mt-1 text-lg font-bold text-foreground">{money(data.valueEstimate)}</div>
              {data.valueRange && (data.valueRange.low != null || data.valueRange.high != null) ? (
                <div className="text-[11px] text-muted-foreground">
                  {money(data.valueRange.low)}–{money(data.valueRange.high)}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. rent</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {money(data.rentEstimate)}
                {data.rentEstimate != null ? <span className="text-xs font-medium text-muted-foreground">/mo</span> : null}
              </div>
              {data.rentRange && (data.rentRange.low != null || data.rentRange.high != null) ? (
                <div className="text-[11px] text-muted-foreground">
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
                onApply(data);
                toast({
                  title: "Applied to your analysis",
                  description: "Filled facts + estimates from comps - tweak anything that's off.",
                });
              }}
            >
              Use these numbers in my analysis
            </Button>
          ) : null}

          <CompList title="Sale comps" comps={data.saleComps} />
          <CompList title="Rent comps" comps={data.rentComps} suffix="/mo" />

          <p className="text-[10px] text-muted-foreground">
            Source: RentCast · {source === "live" ? "live" : source === "saved" ? "saved to this deal" : "cached"}.
            Automated estimates - verify against local comps before relying on them.
          </p>
        </div>
      )}
    </section>
  );
}
