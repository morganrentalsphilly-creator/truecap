"use client";

/**
 * Deal details - optional investor labels for a saved deal: a nickname (used
 * as the deal's display name across My Deals when set) plus market +
 * neighborhood for organizing a portfolio by area. Free per-deal annotation
 * (no entitlement), saves on blur, mirrors the Deal Notes / Due Diligence
 * cards. Renders a graceful notice until the labels migration is applied.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { getDealLabelsAction, updateDealLabelsAction, type DealLabels } from "@/app/actions/deal-labels";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const EMPTY: DealLabels = { nickname: null, market: null, neighborhood: null };

export function DealDetailsCard({ savedDealId }: { savedDealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [labels, setLabels] = useState<DealLabels>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMigrationPending(false);
    void getDealLabelsAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setLabels(r.labels);
        else if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [savedDealId]);

  // Save only the changed field (partial patch) so editing one field on blur
  // never clobbers another whose latest value isn't in this render's state.
  const save = (patch: Partial<DealLabels>) => {
    const dealAtSubmit = savedDealId;
    startSaving(async () => {
      const r = await updateDealLabelsAction(dealAtSubmit, patch);
      if (dealAtSubmit !== savedDealId) return;
      if (!r.ok) {
        if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
        else toast({ title: "Could not save deal details", description: r.message, variant: "destructive" });
        return;
      }
      setLabels(r.labels);
      // The nickname leads the workspace h1 and the My Deals rows — both are
      // server-rendered, so without a refresh the Router Cache keeps serving
      // the old name on back-navigation until some other mutation purges it.
      router.refresh();
    });
  };

  if (!loaded) return null;

  if (migrationPending) {
    return (
      <section
        aria-label="Deal details"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <MapPin className="mr-1.5 inline size-3.5" />
        Deal nickname, market &amp; neighborhood will be available once the latest schema update is applied.
      </section>
    );
  }

  const fields: { key: keyof DealLabels; label: string; placeholder: string }[] = [
    { key: "nickname", label: "Nickname", placeholder: "e.g. The blue duplex" },
    { key: "market", label: "Market", placeholder: "e.g. Philadelphia" },
    { key: "neighborhood", label: "Neighborhood", placeholder: "e.g. Fishtown" },
  ];

  return (
    <section aria-label="Deal details" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Deal details</h3>
        </div>
        {isSaving ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Saves on blur</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</span>
            <Input
              type="text"
              defaultValue={labels[f.key] ?? ""}
              placeholder={f.placeholder}
              maxLength={80}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if ((labels[f.key] ?? "") === value) return; // unchanged
                save({ [f.key]: value || null });
              }}
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A nickname shows in place of the address across My Deals. Market &amp; neighborhood are optional columns there.
      </p>
    </section>
  );
}
