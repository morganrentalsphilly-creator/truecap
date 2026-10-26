"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { screenSavedDealForClientsAction, type ClientDealScreeningResult } from "@/app/actions/client-deal-screening";
import { DealClientSelect } from "@/components/investcalc/deal-client-select";
import { listSavedClientMatchesAction, saveClientDealMatchAction, exportSavedClientMatchAction, prepareClientMatchShareAction, type ClientMatchesResult } from "@/app/actions/client-deal-matches";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import { trackEvent } from "@/lib/analytics";
import { track } from "@/lib/analytics/site-events";

const STATUS = { meets: "Meets selected criteria", misses: "Misses selected criteria", "needs-verification": "Needs verification", "no-criteria": "Set a Buy Box" };

export function ClientDealScreening({ savedDealId, clientId }: { savedDealId: string; clientId: string | null }) {
  const [result, setResult] = useState<ClientDealScreeningResult | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<ClientMatchesResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [share, setShare] = useState<{ matchId: string; result: Extract<Awaited<ReturnType<typeof prepareClientMatchShareAction>>, { ok: true }> } | null>(null);
  // Track the operation itself. A route-wide React transition can outlive
  // the returned action while unrelated streamed content remains pending.
  const startSaving = async (operation: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try { await operation(); } finally { setSaving(false); }
  };
  useEffect(() => {
    let cancelled = false;
    listSavedClientMatchesAction({ savedDealId }).then(next => { if (!cancelled) setSaved(next); })
      .catch(() => { if (!cancelled) setSaved({ ok: false, message: "Couldn't load saved matches. Refresh to try again." }); });
    return () => { cancelled = true; };
  }, [savedDealId]);
  const saveMatch = (clientId: string, buyBoxId: string, sourceFingerprint: string) => startSaving(async () => {
    setNotice(null);
    try {
      const next = await saveClientDealMatchAction({ savedDealId, clientId, buyBoxId, sourceFingerprint });
      if (next.ok) {
        trackEvent("client_match_saved", { source: "saved_deal" });
        track("client_match_saved", { source: "saved_deal" });
        setSaved(next);
        setNotice("Client match saved with its current assumptions and criteria.");
      }
      else setNotice(next.message);
    } catch { setNotice("Couldn't save this match. Your property and existing matches are unchanged."); }
  });
  const exportMatch = (matchId: string) => startSaving(async () => {
    setNotice(null);
    try {
      const next = await exportSavedClientMatchAction({ matchId });
      if (!next.ok) { setNotice(next.message); return; }
      const { downloadPdfFromBase64 } = await import("@/lib/pdf/download");
      downloadPdfFromBase64(next.pdfBase64, next.filename);
      trackEvent("client_match_exported", { source: "saved_deal" });
      track("client_match_exported", { source: "saved_deal" });
      setNotice("Client report downloaded with the saved criteria and financing assumptions.");
    } catch { setNotice("Couldn't export the client report. Your saved match is unchanged."); }
  });
  const prepareShare = (matchId: string) => startSaving(async () => {
    setNotice(null);
    try {
      const next = await prepareClientMatchShareAction({ matchId });
      if (!next.ok) { setNotice(next.message); return; }
      setShare({ matchId, result: next });
      setNotice("Ready to share this match's frozen financing and financial targets. Open Client report to choose address visibility and create or revoke links. Client names and private roster notes are excluded; the PDF includes the full client criteria.");
    } catch { setNotice("Couldn't prepare sharing. Your saved match is unchanged."); }
  });
  const screen = async () => {
    if (pending) return;
    setPending(true);
    try {
      const next = await screenSavedDealForClientsAction({ savedDealId });
      setResult(next);
      if (next.ok) {
        trackEvent("client_matches_generated", { source: "saved_deal", count: next.screens.length });
        track("client_matches_generated", { source: "saved_deal", count: next.screens.length });
      }
    } catch {
      setResult({ ok: false, message: "Couldn't screen clients. Your saved deal is unchanged. Try again." });
    } finally { setPending(false); }
  };
  return <section aria-labelledby="client-screening-title" className="rounded-object border border-border bg-card p-5 shadow-rest sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-prose">
        <h2 id="client-screening-title" className="font-display text-h3-sm">Which clients could this fit?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Screen this saved property against each active client Buy Box. Uses saved client financing preferences when supplied; otherwise uses the deal&apos;s financing. Confirm terms with each client and lender.</p>
      </div>
      <Button type="button" disabled={pending} onClick={screen}>{pending ? "Screening clients…" : result?.ok ? "Refresh screening" : "Screen my clients"}</Button>
    </div>
    {pending ? <p role="status" className="mt-4 text-sm">Checking selected criteria and calculating Offer Ceilings…</p> : null}
    {result && !result.ok ? <p role="alert" className="mt-4 text-sm text-destructive">{result.message}</p> : null}
    {result?.ok ? <>
      <p className="mt-4 text-sm text-muted-foreground">Preliminary screening · current methodology v{result.methodologyVersion}. The saved report remains unchanged. Criteria fit is not a financing approval or an investment recommendation.</p>
      {result.screens.length === 0 ? <p className="mt-4 text-sm">Add an investor client to start. <Link href="/dashboard/clients" className="font-semibold text-primary underline">Manage clients</Link></p> : null}
      <ul className="mt-4 divide-y divide-border">
        {result.screens.map((row) => <li key={`${row.clientId}:${row.buyBoxId}`} className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{row.clientName}{row.buyBoxName ? ` · ${row.buyBoxName}` : ""}</h3>
              <p className="mt-1 text-sm font-semibold">{STATUS[row.status]}</p>
              <p className="mt-2 text-sm text-muted-foreground">{row.financingDescription}</p>
            </div>
            <Link href={`/settings?buyBoxFor=${row.clientId}#buy-boxes`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Edit criteria</Link>
          </div>
          {row.offerCeiling != null ? <p className="mt-3 text-sm">Estimated Offer Ceiling <span className="font-figure font-semibold">{row.offerCeiling.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</span></p> : null}
          <p className="mt-1 text-sm text-muted-foreground">{row.ceilingExplanation}</p>
          {row.buyBoxId && row.sourceFingerprint ? <Button type="button" variant="outline" className="mt-3" disabled={saving} onClick={() => saveMatch(row.clientId, row.buyBoxId!, row.sourceFingerprint!)}>Save client match</Button> : null}
          {row.checks.length ? <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Review every criterion</summary>
            <ul className="space-y-2 text-sm">{row.checks.map((check) => <li key={check.id}>
              <span className="font-semibold">{check.label}</span>: <span className="font-figure">{check.actual}</span> · target <span className="font-figure">{check.target}</span> · {check.pass === true ? "Meets" : check.pass === false ? "Not met" : check.actual}{check.gapText ? ` (${check.gapText})` : ""}
            </li>)}</ul>
          </details> : null}
        </li>)}
      </ul>
      {result.screens.length ? <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <p className="text-sm">Choose the primary client for pipeline follow-up:</p>
        <DealClientSelect savedDealId={savedDealId} clientId={clientId} clients={Array.from(new Map(result.screens.map((row) => [row.clientId, { id: row.clientId, name: row.clientName }])).values())} />
        <p className="w-full text-sm text-muted-foreground">The pipeline has one primary client. Save separate matches below for every client whose criteria you want to keep.</p>
      </div> : null}
    </> : null}
    <div className="mt-5 border-t border-border pt-5">
      <h3 className="font-semibold">Saved client matches</h3>
      <p className="mt-1 text-sm text-muted-foreground">Each match keeps its own financing assumptions and criteria while referencing this property. Recent 100 matches shown. Original reports remain unchanged.</p>
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
      {!saved ? <p role="status" className="mt-3 text-sm">Loading saved matches…</p> : !saved.ok ? <p role="status" className="mt-3 text-sm">{saved.message}</p> : saved.matches.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Screen your clients, then save the matches you want to follow up.</p> : <ul className="mt-3 divide-y divide-border">
        {saved.matches.map(match => <li key={match.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-semibold">{match.screen.clientName} · {match.screen.buyBoxName}</p>
            <p className="mt-1 text-sm">{STATUS[match.screen.status]} · saved {new Date(match.createdAt).toLocaleDateString("en-US")} · v{match.methodologyVersion}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => exportMatch(match.id)}>Export client PDF</Button>
            {share?.matchId === match.id ? <ShareLinkButton values={share.result.values} maoTarget={share.result.maoTarget} maoTargetSource="selected-targets" context="client-report" isAuthenticated /> : <Button type="button" variant="outline" disabled={saving} onClick={() => prepareShare(match.id)}>Prepare client link</Button>}
          </div>
        </li>)}
      </ul>}
    </div>
  </section>;
}
