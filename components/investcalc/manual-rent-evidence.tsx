"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { track } from "@/lib/analytics/site-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listRentEvidenceAction, saveRentEvidenceAction, archiveRentEvidenceAction } from "@/app/actions/manual-rent-evidence";
import type { RentEvidence } from "@/lib/manual-rent-evidence";

const empty = () => ({ address: "", sourceLabel: "", sourceUrl: "", observedOn: new Date().toISOString().slice(0, 10), monthlyRent: "", bedrooms: "", bathrooms: "", sqft: "", monthlyAdjustment: "0", adjustmentNotes: "" });
export function ManualRentEvidence({ savedDealId }: { savedDealId: string }) {
  const [items, setItems] = useState<RentEvidence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty);
  const [showArchived, setShowArchived] = useState(false);
  const [pending, setPending] = useState(false);
  const start = async (operation: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    try { await operation(); } finally { setPending(false); }
  };
  useEffect(() => {
    let cancelled = false;
    listRentEvidenceAction({ savedDealId }).then(result => {
      if (cancelled) return;
      if (result.ok) setItems(result.evidence); else setError(result.message);
    }).catch(() => { if (!cancelled) setError("Couldn't load comparable references. Refresh to try again."); });
    return () => { cancelled = true; };
  }, [savedDealId]);
  const save = () => start(async () => {
    setError(null); setNotice(null);
    const optional = (value: string) => value.trim() ? Number(value) : null;
    try {
      const result = await saveRentEvidenceAction({ ...draft, savedDealId, sourceUrl: draft.sourceUrl.trim() || null, monthlyRent: Number(draft.monthlyRent), bedrooms: optional(draft.bedrooms), bathrooms: optional(draft.bathrooms), sqft: optional(draft.sqft), monthlyAdjustment: Number(draft.monthlyAdjustment) });
      if (!result.ok) { setError(result.message); return; }
      trackEvent("rental_evidence_saved", { source: "saved_deal" });
      track("rental_evidence_saved", { source: "saved_deal" });
      setItems(result.evidence); setDraft(empty()); setNotice("Comparable reference saved. The property's rent assumption is unchanged.");
    } catch { setError("Couldn't save. Your inputs are still here; try again."); }
  });
  const archive = (item: RentEvidence) => start(async () => {
    try {
      const result = await archiveRentEvidenceAction({ savedDealId, id: item.id, archived: !item.isArchived });
      if (result.ok) { setItems(result.evidence); setNotice(item.isArchived ? "Reference restored." : "Reference archived. You can restore it below."); }
      else setError(result.message);
    } catch { setError("Couldn't update this reference. Try again."); }
  });
  const visible = items?.filter(item => showArchived || !item.isArchived) ?? [];
  const adjusted = items?.filter(item => !item.isArchived).map(item => item.monthlyRent + item.monthlyAdjustment) ?? [];
  const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return <section aria-labelledby="manual-rent-evidence-title" className="rounded-object border border-border bg-card p-5 sm:p-6">
    <h2 id="manual-rent-evidence-title" className="font-display text-h3-sm">Review rental comparables</h2>
    <p className="mt-2 text-sm text-muted-foreground">Save references you reviewed, with dates and adjustment reasons. These are your entries, not verified provider estimates. Compare location, condition, size, lease terms and included utilities before changing your rent assumption.</p>
    {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
    {items === null && !error ? <p role="status" className="mt-3 text-sm">Loading references…</p> : null}
    {items ? <>
      {adjusted.length ? <p className="mt-3 text-sm">Entered adjusted rents: <strong className="font-figure">{money(Math.min(...adjusted))}–{money(Math.max(...adjusted))}/mo</strong>. This range is not a rent estimate.</p> : null}
      <details className="mt-4 border-t border-border pt-2">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Add a comparable reference</summary>
        <form className="mt-2 space-y-3" onSubmit={event => { event.preventDefault(); save(); }}>
          {([
            ["address", "Comparable address", "text", true], ["sourceLabel", "Source or document reference", "text", true],
            ["sourceUrl", "Source link (optional)", "url", false], ["observedOn", "Date observed", "date", true],
            ["monthlyRent", "Comparable monthly rent ($)", "number", true], ["bedrooms", "Comparable bedrooms (optional)", "number", false],
            ["bathrooms", "Comparable bathrooms (optional)", "number", false], ["sqft", "Comparable square feet (optional)", "number", false],
            ["monthlyAdjustment", "Monthly rent adjustment ($)", "number", true],
          ] as const).map(([key, label, type, required]) => <div key={key} className="space-y-1">
            <Label htmlFor={`rent-evidence-${key}`}>{label}</Label>
            <Input id={`rent-evidence-${key}`} type={type} required={required} step={type === "number" ? "any" : undefined} value={draft[key]} className="min-h-11" onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
          </div>)}
          <div className="space-y-1">
            <Label htmlFor="rent-evidence-notes">Adjustment reasons and differences</Label>
            <textarea id="rent-evidence-notes" className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm" maxLength={2000} required={Number(draft.monthlyAdjustment) !== 0} value={draft.adjustmentNotes} onChange={event => setDraft({ ...draft, adjustmentNotes: event.target.value })} />
            <p className="text-sm text-muted-foreground">Use a positive adjustment when the subject would rent for more than the comparable; use a negative adjustment when it would rent for less. Explain every nonzero adjustment.</p>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Saving reference…" : "Save comparable reference"}</Button>
        </form>
      </details>
      <ul className="mt-3 divide-y divide-border">{visible.map(item => <li key={item.id} className="space-y-2 py-4">
        <p className="font-semibold">{item.address}{item.isArchived ? " · archived" : ""}</p>
        <p className="text-sm">{money(item.monthlyRent)}/mo · adjustment {money(item.monthlyAdjustment)}/mo · adjusted {money(item.monthlyRent + item.monthlyAdjustment)}/mo</p>
        <p className="text-sm text-muted-foreground">{item.bedrooms ?? "Unknown"} beds · {item.bathrooms ?? "Unknown"} baths · {item.sqft ?? "Unknown"} sq ft · observed {item.observedOn}</p>
        <p className="text-sm">Source: {item.sourceLabel}</p>
        {item.adjustmentNotes ? <p className="whitespace-pre-wrap text-sm">{item.adjustmentNotes}</p> : null}
        <div className="flex flex-wrap gap-3">
          {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Open source</a> : null}
          <Button type="button" variant="outline" disabled={pending} onClick={() => archive(item)}>{item.isArchived ? "Restore reference" : "Archive reference"}</Button>
        </div>
      </li>)}</ul>
      {items.some(item => item.isArchived) ? <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />Show archived references</label> : null}
      <p className="mt-3 text-sm text-muted-foreground">Recent 100 references shown. Review your analysis separately to adopt a new rent assumption; saved reports and client matches do not change automatically.</p>
    </> : null}
  </section>;
}
