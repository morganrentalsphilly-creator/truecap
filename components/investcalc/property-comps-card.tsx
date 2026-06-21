"use client";

/**
 * On-demand sale + rent comps for the analyzed address (RentCast, via
 * getPropertyCompsAction). On-demand by design — each pull costs paid API
 * quota — so nothing fetches until the user clicks. Paid-gated + address-
 * gated for visibility; hides itself if the provider isn't configured yet
 * (NOT_CONFIGURED), keeping it invisible until actually enabled.
 */
import { useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import { getPropertyCompsAction } from "@/app/actions/property-comps";
import type { EnrichmentComp, PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
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

export function PropertyCompsCard({
  enabled,
  address,
  propertyType,
  bedrooms,
  bathrooms,
  squareFootage,
  onApply,
}: {
  enabled: boolean;
  address: string | null;
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  /** Fill the analyzer form from the pulled facts + estimates. */
  onApply?: (enrichment: PropertyEnrichment) => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<PropertyEnrichment | null>(null);
  const [source, setSource] = useState<"cache" | "live" | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, startLoading] = useTransition();

  if (!enabled || !address || unavailable) return null;

  const pull = () => {
    startLoading(async () => {
      const r = await getPropertyCompsAction({
        address,
        propertyType,
        bedrooms: bedrooms ?? undefined,
        bathrooms: bathrooms ?? undefined,
        squareFootage: squareFootage ?? undefined,
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
    });
  };

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
          {loading ? <Loader2 className="size-4 animate-spin" /> : data ? "Refresh" : "Pull comps"}
        </Button>
      </div>

      {!data ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Pull live sale and rental comparables for this address — value + rent estimates from nearby
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

          {onApply ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                onApply(data);
                toast({
                  title: "Applied to your analysis",
                  description: "Filled facts + estimates from comps — tweak anything that's off.",
                });
              }}
            >
              Use these numbers in my analysis
            </Button>
          ) : null}

          <CompList title="Sale comps" comps={data.saleComps} />
          <CompList title="Rent comps" comps={data.rentComps} suffix="/mo" />

          <p className="text-[10px] text-muted-foreground">
            Source: RentCast · {source === "cache" ? "cached" : "live"}. Automated estimates — verify
            against local comps before relying on them.
          </p>
        </div>
      )}
    </section>
  );
}
