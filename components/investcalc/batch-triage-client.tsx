"use client";

/**
 * Batch triage UI (Phase 4, batch 3) — paste listings → a screened
 * shortlist. Pro power tool: up to 50 opportunities in one workflow. Underwriting +
 * ranking live in the pure lib/batch-triage engine (client-safe), reached
 * through the Pro-gated screenBatchAction. Re-sorting is instant + local
 * (rankTriageRows is pure) — no server round-trip once the batch is screened.
 *
 * The pasted text + screened result also persist to sessionStorage
 * (lib/batch-triage-storage) and rehydrate on mount, so drilling into a row,
 * Back, or a refresh never wipes a screened batch mid-triage.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { ArrowUpRight, ListChecks, Loader2, SlidersHorizontal, Sparkles } from "lucide-react";
import { screenBatchAction, extractTriageListingsAction, type BatchTriageResult } from "@/app/actions/batch-triage";
import {
  MAX_TRIAGE_ROWS,
  rankTriageRows,
  type TriageRowResult,
  type TriageSort,
} from "@/lib/batch-triage";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import {
  parseStoredTriageBatch,
  serializeTriageBatch,
  TRIAGE_STORAGE_KEY,
} from "@/lib/batch-triage-storage";
import { verdictScreeningLabel } from "@/lib/verdict-display";
import { trackEvent } from "@/lib/analytics";
import { BuyBoxFitBadge } from "@/components/investcalc/buy-box-fit-badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLACEHOLDER = `1700 W Erie Ave, Philadelphia, PA 19140\t265000\t2100\t3
1205 N 5th St, Philadelphia, PA\t245000\t2000\t3
456 Oak Ave, Denver, CO\t420000\t2600\t4`;

function money(n: number | null): string {
  if (n == null) return "—";
  return `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}
function pct(n: number | null): string {
  return n == null ? "—" : `${n.toFixed(1)}%`;
}
function ratio(n: number | null, isCash: boolean): string {
  if (isCash) return "Cash";
  return n == null ? "—" : n.toFixed(2);
}

/**
 * Screening-context verdict label. The override that used to live here (and
 * the reasoning behind it) now lives in lib/verdict-display.ts as
 * verdictScreeningLabel, so every screening surface gets it for free. Kept as
 * a thin alias because the call sites below read better with a local name.
 */
const triageVerdictLabel = verdictScreeningLabel;

function verdictClasses(rec: string | null): string {
  if (rec === "Strong Buy") return "bg-success/10 text-success border-success/30";
  if (rec === "Buy") return "bg-primary/10 text-primary border-primary/30";
  if (rec === "Neutral" || rec === "Risky") return "bg-warning/15 text-warning-foreground border-warning/30";
  if (rec === "Avoid") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
}

function openUrl(row: TriageRowResult): string {
  return buildAnalyzerHandoffUrl(
    {
      address: row.input.address,
      purchasePrice: row.input.purchasePrice,
      monthlyRent: row.input.monthlyRent,
      bedrooms: row.input.bedrooms,
    },
    { utmSource: "batch-triage" }
  );
}

export function BatchTriageClient({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pending, startScreening] = useTransition();
  const [extracting, startExtracting] = useTransition();
  const [result, setResult] = useState<Extract<BatchTriageResult, { ok: true }> | null>(null);
  const [sort, setSort] = useState<TriageSort>("score");
  const [passersOnly, setPassersOnly] = useState(false);

  // Rehydrate a previously screened batch. Done in an effect (not a state
  // initializer) so the server render and first client render match — the
  // one-frame empty state is the price of no hydration mismatch.
  useEffect(() => {
    try {
      const stored = parseStoredTriageBatch(window.sessionStorage.getItem(TRIAGE_STORAGE_KEY));
      if (!stored) return;
      setText(stored.text);
      if (stored.result) {
        setResult(stored.result);
        setSort(stored.result.sort);
      }
    } catch {
      // Storage unavailable (private mode / disabled) — persistence is
      // best-effort; the screen still works, it just won't survive a refresh.
    }
  }, []);

  // Persist {text, result} on change (small payload — ≤MAX_TRIAGE_ROWS rows).
  // The first pass is skipped: on mount this effect runs with the initial
  // empty state, BEFORE the rehydrate effect's setState lands, and must not
  // clobber the stored batch it's about to restore.
  const persistArmedRef = useRef(false);
  useEffect(() => {
    if (!persistArmedRef.current) {
      persistArmedRef.current = true;
      return;
    }
    try {
      if (text === "" && result === null) {
        window.sessionStorage.removeItem(TRIAGE_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(TRIAGE_STORAGE_KEY, serializeTriageBatch({ text, result }));
      }
    } catch {
      // Quota / private mode — fail silently (see the rehydrate effect).
    }
  }, [text, result]);

  const screen = () => {
    startScreening(async () => {
      try {
        const r = await screenBatchAction({ text });
        if (!r.ok) {
          toast({ title: "Couldn't screen", description: r.message, variant: "destructive" });
          return;
        }
        setResult(r);
        setSort(r.sort);
        setPassersOnly(false);
        trackEvent("shortlist_screened", { rows: r.rows?.length ?? 0 });
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the Screen
        // spinner clears with no result and no signal. The pasted text is
        // preserved, so a retry just re-clicks Screen.
        Sentry.captureException(err, { tags: { feature: "batch-triage" } });
        toast({
          title: "Couldn't screen",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Paste messy listing text (descriptions, an email) → AI normalizes it into
  // the structured lines IN PLACE; the user then reviews + hits Screen. Never
  // auto-screens (extraction can misread).
  const extract = () => {
    startExtracting(async () => {
      try {
        const r = await extractTriageListingsAction({ text });
        if (!r.ok) {
          toast({ title: "Couldn't extract", description: r.message, variant: "destructive" });
          return;
        }
        if (r.count === 0) {
          toast({ title: "No listings found", description: "Couldn't spot any property listings in that text." });
          return;
        }
        setText(r.text);
        toast({
          title: `Extracted ${r.count} ${r.count === 1 ? "listing" : "listings"}`,
          description: "Review the rows, then Screen deals.",
          variant: "success",
        });
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the Extract
        // spinner clears with no change and no signal. The pasted text is left
        // as-is, so a retry just re-clicks Extract.
        Sentry.captureException(err, { tags: { feature: "batch-triage" } });
        toast({
          title: "Couldn't extract",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const rows = useMemo(() => {
    if (!result) return [];
    const ranked = rankTriageRows(result.rows, sort);
    return passersOnly ? ranked.filter((r) => r.buyBoxFit?.anyPass) : ranked;
  }, [result, sort, passersOnly]);

  const sortOptions: { id: TriageSort; label: string }[] = [
    { id: "score", label: "Score" },
    { id: "cashFlow", label: "Cash flow" },
    ...(result?.buyBoxActive ? ([{ id: "fit" as const, label: "Buy-box fit" }]) : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          <ListChecks className="size-5 text-primary" />
          Screen a shortlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste up to {MAX_TRIAGE_ROWS} listings — one per line, columns{" "}
          <span className="font-semibold text-foreground">Address · Price · Rent · Beds</span>{" "}
          (tab, pipe, or comma separated). We underwrite each on today&apos;s rate + your
          state&apos;s tax and rank the survivors
          {result?.buyBoxActive ? " against your buy box" : ""}.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={PLACEHOLDER}
        aria-label="Listings to screen"
        className="w-full resize-y rounded-xl border border-border bg-card p-3 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {aiEnabled
            ? "Tip: paste a listing description or email and hit Auto-extract, or paste columns straight from a spreadsheet."
            : "Tip: paste straight from a spreadsheet — the columns line up automatically."}
        </p>
        <div className="flex items-center gap-2">
          {aiEnabled ? (
            <button
              type="button"
              onClick={extract}
              disabled={extracting || pending || text.trim() === ""}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-primary" />}
              Auto-extract from text
            </button>
          ) : null}
          <button
            type="button"
            onClick={screen}
            disabled={pending || extracting || text.trim() === ""}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/95 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />}
            Screen deals
          </button>
        </div>
      </div>

      {result ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Screened {result.screenedCount} {result.screenedCount === 1 ? "listing" : "listings"}
              {result.truncated ? ` (first ${MAX_TRIAGE_ROWS} of your paste)` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {result.buyBoxActive ? (
                <button
                  type="button"
                  onClick={() => setPassersOnly((v) => !v)}
                  aria-pressed={passersOnly}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                    passersOnly
                      ? "border-[var(--brand-green)]/40 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SlidersHorizontal className="size-3.5" />
                  Meets my buy box
                </button>
              ) : null}
              <div role="group" aria-label="Sort by" className="flex items-center gap-1 rounded-lg bg-muted p-1">
                {sortOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={sort === o.id}
                    onClick={() => setSort(o.id)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition",
                      sort === o.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {passersOnly ? "None of these meet your buy box yet." : "Nothing to show."}
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Listing</th>
                      <th className="px-3 py-2.5">Verdict</th>
                      <th className="px-3 py-2.5 text-right">Score</th>
                      <th className="px-3 py-2.5 text-right">Cash flow</th>
                      <th className="px-3 py-2.5 text-right">CoC</th>
                      <th className="px-3 py-2.5 text-right">Cap</th>
                      <th className="px-3 py-2.5 text-right">DSCR</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, i) => (
                      <tr key={`${row.input.address}-${i}`} className={cn(!row.ok && "opacity-60")}>
                        <td className="max-w-[280px] px-4 py-3">
                          <div className="truncate font-medium text-foreground" title={row.input.address}>
                            {row.input.address}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{money(row.input.purchasePrice)}</span>
                            <BuyBoxFitBadge fit={row.buyBoxFit ?? undefined} />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {row.ok ? (
                            <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", verdictClasses(row.recommendation))}>
                              {row.recommendation ? triageVerdictLabel(row.recommendation) : "—"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Needs rent</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{row.score ?? "—"}</td>
                        <td className={cn("px-3 py-3 text-right font-mono tabular-nums", (row.netCashFlowMonthly ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>
                          {money(row.netCashFlowMonthly)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{pct(row.cocReturnPct)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{pct(row.capRatePct)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{ratio(row.dscr, row.isCashPurchase)}</td>
                        <td className="px-3 py-3 text-right">
                          {/* New tab (the My Deals "Open Analysis" convention,
                              see refresh-on-return.tsx): the screened batch
                              stays mounted while the user drills into rows. */}
                          {/* min-h-11 + canceling negative margin/padding = 44px
                              touch band (WCAG 2.5.8) without growing the row —
                              the touch-band convention what-if-sliders.tsx set. */}
                          <Link
                            href={openUrl(row)}
                            prefetch={false}
                            target="_blank"
                            rel="noopener"
                            className="-my-2 inline-flex min-h-11 items-center gap-1 py-2 text-xs font-semibold text-primary hover:underline"
                          >
                            Open <ArrowUpRight className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mt-4 space-y-3 sm:hidden">
                {rows.map((row, i) => (
                  <div key={`${row.input.address}-${i}`} className={cn("rounded-2xl border border-border bg-card p-4", !row.ok && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-foreground" title={row.input.address}>{row.input.address}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{money(row.input.purchasePrice)}</div>
                      </div>
                      {row.ok ? (
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold", verdictClasses(row.recommendation))}>
                          {row.score}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">Needs rent</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Cash flow</div><div className={cn("font-mono font-semibold", (row.netCashFlowMonthly ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>{money(row.netCashFlowMonthly)}</div></div>
                      <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">CoC</div><div className="font-mono font-semibold text-foreground">{pct(row.cocReturnPct)}</div></div>
                      <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">DSCR</div><div className="font-mono font-semibold text-foreground">{ratio(row.dscr, row.isCashPurchase)}</div></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <BuyBoxFitBadge fit={row.buyBoxFit ?? undefined} />
                      {/* 44px touch band (min-h-11 + canceling -my/py) — this is
                          the card's only action; visual height unchanged. */}
                      <Link href={openUrl(row)} prefetch={false} target="_blank" rel="noopener" className="-my-2 ml-auto inline-flex min-h-11 items-center gap-1 py-2 text-xs font-semibold text-primary hover:underline">
                        Open in analyzer <ArrowUpRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.parseErrors.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">{result.parseErrors.length} line{result.parseErrors.length === 1 ? "" : "s"} couldn&apos;t be read:</p>
              <ul className="mt-1 space-y-0.5">
                {result.parseErrors.slice(0, 5).map((e) => (
                  <li key={e.line} className="truncate">
                    Line {e.line}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
