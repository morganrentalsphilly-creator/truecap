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
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ListChecks,
  Loader2,
  MapPin,
  PencilLine,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  screenBatchAction,
  extractTriageListingsAction,
  type BatchTriageResult,
} from "@/app/actions/batch-triage";
import {
  MAX_TRIAGE_ROWS,
  formatScreenableTriageRows,
  formatTriagePreviewRowsAsText,
  parseTriagePreviewInput,
  previewRowToScreenableListing,
  rankTriageRows,
  resolvedTriageLocation,
  validateTriagePreviewRow,
  type TriagePreviewField,
  type TriagePreviewRow,
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
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";
import { BuyBoxFitBadge } from "@/components/investcalc/buy-box-fit-badge";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLACEHOLDER = `100 Example Ave, Philadelphia, PA 19140\t265000\t2100\t3
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
  if (isCash) return NO_DEBT_SERVICE_DSCR_LABEL;
  return n == null ? "—" : n.toFixed(2);
}

function gapToAsking(row: TriageRowResult): string {
  if (row.askingGap == null) return "—";
  if (Math.abs(row.askingGap) < 1) return "At ceiling";
  return row.askingGap > 0
    ? `${money(row.askingGap)} over`
    : `${money(Math.abs(row.askingGap))} below`;
}

function fastestPath(row: TriageRowResult): string {
  if (!row.ok) return "Add monthly rent";
  if (row.requiredRentUnreachable) return "Rent alone won’t clear targets";
  if (row.requiredMonthlyRent == null) return "Verify assumptions";
  if ((row.requiredRentDelta ?? 0) <= 0) return "Current rent meets targets";
  return `${money(row.requiredMonthlyRent)}/mo rent (+${money(row.requiredRentDelta)})`;
}

function issueFor(row: TriagePreviewRow, field: TriagePreviewField) {
  return row.issues.find((issue) => issue.field === field);
}

/**
 * Screening-context verdict label. The override that used to live here (and
 * the reasoning behind it) now lives in lib/verdict-display.ts as
 * verdictScreeningLabel, so every screening surface gets it for free. Kept as
 * a thin alias because the call sites below read better with a local name.
 */
const triageVerdictLabel = verdictScreeningLabel;

function verdictClasses(rec: string | null): string {
  if (rec === "Strong Buy")
    return "bg-success/10 text-success border-success/30";
  if (rec === "Buy") return "bg-primary/10 text-primary border-primary/30";
  if (rec === "Neutral" || rec === "Risky")
    return "bg-warning/15 text-warning-foreground border-warning/30";
  if (rec === "Avoid")
    return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
}

function openUrl(row: TriageRowResult): string {
  return buildAnalyzerHandoffUrl(
    {
      address: row.input.address,
      purchasePrice: row.input.purchasePrice,
      monthlyRent: row.input.monthlyRent,
      bedrooms: row.input.bedrooms,
      interestRate: row.assumptionContext?.interestRatePct,
      propertyTaxPct: row.assumptionContext?.propertyTaxPct,
    },
    { utmSource: "batch-triage" },
  );
}

function rowAssumptionLabel(row: TriageRowResult): string {
  const context = row.assumptionContext;
  if (!context) return "Legacy screen — re-screen to verify rate and tax";
  const rateSource = context.rateSource === "fred" ? "FRED" : "default";
  const taxSource =
    context.taxSource === "state-static"
      ? `${context.state ?? "state"} legacy estimate — replace with your local number`
      : "default — replace with your local number";
  return `${context.interestRatePct.toFixed(2)}% rate (${rateSource}) · ${context.propertyTaxPct.toFixed(2)}% tax (${taxSource})`;
}

type EditablePreviewField = Exclude<TriagePreviewField, "row">;

function PreviewInput({
  row,
  field,
  label,
  surface,
  onChange,
}: {
  row: TriagePreviewRow;
  field: EditablePreviewField;
  label: string;
  surface: "card" | "table";
  onChange: (value: string) => void;
}) {
  const issue = issueFor(row, field);
  const inputId = `${row.id}-${field}-${surface}`;
  const issueId = issue ? `${inputId}-issue` : undefined;
  const value = row[field];
  const numeric = field !== "address";
  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:sr-only"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={issue?.severity === "error" || undefined}
        aria-describedby={issueId}
        className={cn(
          "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring md:text-sm",
          issue?.severity === "error" ? "border-destructive" : "border-border",
        )}
      />
      {issue ? (
        <p
          id={issueId}
          className={cn(
            "mt-1 text-[10px] leading-snug",
            issue.severity === "error" ? "text-destructive" : "text-amber-700",
          )}
        >
          {issue.message}
        </p>
      ) : null}
    </div>
  );
}

function PreviewRowContext({ row }: { row: TriagePreviewRow }) {
  const location = resolvedTriageLocation(row.address);
  const rowIssues = row.issues.filter((issue) => issue.field === "row");
  return (
    <div className="mt-2 space-y-1 text-[11px]">
      <p
        className={cn(
          "inline-flex items-center gap-1.5",
          location.label ? "text-muted-foreground" : "text-amber-700",
        )}
      >
        <MapPin className="size-3.5" aria-hidden />
        {location.label
          ? `Assumption location: ${location.label} · ${location.state} tax assumptions`
          : "Location unresolved — verify city/state before screening"}
      </p>
      {rowIssues.map((issue) => (
        <p
          key={issue.message}
          className="flex items-start gap-1.5 text-amber-700"
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
          {issue.message}
        </p>
      ))}
    </div>
  );
}

export function BatchTriageClient({
  aiEnabled = false,
}: {
  aiEnabled?: boolean;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pending, startScreening] = useTransition();
  const [extracting, startExtracting] = useTransition();
  const [result, setResult] = useState<Extract<
    BatchTriageResult,
    { ok: true }
  > | null>(null);
  const [previewRows, setPreviewRows] = useState<TriagePreviewRow[] | null>(
    null,
  );
  const [sort, setSort] = useState<TriageSort>("score");
  const [passersOnly, setPassersOnly] = useState(false);

  // Rehydrate a previously screened batch. Done in an effect (not a state
  // initializer) so the server render and first client render match — the
  // one-frame empty state is the price of no hydration mismatch.
  useEffect(() => {
    try {
      const stored = parseStoredTriageBatch(
        window.sessionStorage.getItem(TRIAGE_STORAGE_KEY),
      );
      if (!stored) return;
      setText(stored.text);
      setPreviewRows(parseTriagePreviewInput(stored.text));
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
        window.sessionStorage.setItem(
          TRIAGE_STORAGE_KEY,
          serializeTriageBatch({ text, result }),
        );
      }
    } catch {
      // Quota / private mode — fail silently (see the rehydrate effect).
    }
  }, [text, result]);

  const review = () => {
    const parsed = parseTriagePreviewInput(text);
    if (parsed.length === 0) {
      toast({
        title: "Nothing to review",
        description: "Paste at least one listing first.",
      });
      return;
    }
    setPreviewRows(parsed.slice(0, MAX_TRIAGE_ROWS));
    setResult(null);
  };

  const updatePreviewRow = (
    id: string,
    field: Exclude<TriagePreviewField, "row">,
    value: string,
  ) => {
    setPreviewRows((current) => {
      if (!current) return current;
      const next = current.map((row) =>
        row.id === id
          ? validateTriagePreviewRow({
              ...row,
              [field]: value,
              // Editing is an explicit human review of the extracted columns,
              // so parser ambiguity is resolved once the row is touched.
              sourceIssue: undefined,
            })
          : row,
      );
      setText(formatTriagePreviewRowsAsText(next));
      return next;
    });
    setResult(null);
  };

  const screen = () => {
    if (!previewRows) {
      review();
      return;
    }
    const screenableText = formatScreenableTriageRows(previewRows);
    if (!screenableText) {
      toast({
        title: "Fix the highlighted rows",
        description:
          "At least one row needs a complete address, valid purchase price, and monthly rent.",
        variant: "warning",
      });
      return;
    }
    startScreening(async () => {
      try {
        const r = await screenBatchAction({ text: screenableText });
        if (!r.ok) {
          toast({
            title: "Couldn't screen",
            description: r.message,
            variant: "destructive",
          });
          return;
        }
        setResult(r);
        setText(formatTriagePreviewRowsAsText(previewRows));
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
          description:
            "Something interrupted the request. Check your connection and try again.",
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
          toast({
            title: "Couldn't extract",
            description: r.message,
            variant: "destructive",
          });
          return;
        }
        if (r.count === 0) {
          toast({
            title: "No listings found",
            description: "Couldn't spot any property listings in that text.",
          });
          return;
        }
        setText(r.text);
        setPreviewRows(parseTriagePreviewInput(r.text));
        setResult(null);
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
          description:
            "Something interrupted the request. Check your connection and try again.",
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

  const previewScreenableCount = useMemo(
    () =>
      previewRows?.filter((row) => previewRowToScreenableListing(row) != null)
        .length ?? 0,
    [previewRows],
  );
  const previewErrorCount = useMemo(
    () =>
      previewRows?.reduce(
        (count, row) =>
          count +
          row.issues.filter((issue) => issue.severity === "error").length,
        0,
      ) ?? 0,
    [previewRows],
  );

  const sortOptions: { id: TriageSort; label: string }[] = [
    { id: "score", label: "Deal score" },
    { id: "cashFlow", label: "Cash flow" },
    ...(result?.buyBoxActive
      ? [{ id: "fit" as const, label: "Buy-box fit" }]
      : []),
  ];
  const resultContext = result?.rows.find(
    (row) => row.assumptionContext?.screenedAt,
  )?.assumptionContext;
  const screenedAtMs = resultContext?.screenedAt
    ? Date.parse(resultContext.screenedAt)
    : NaN;
  const resultIsStale =
    Number.isFinite(screenedAtMs) &&
    Date.now() - screenedAtMs > 6 * 60 * 60 * 1000;
  const fallbackRows =
    result?.rows.filter(
      (row) => row.assumptionContext?.enrichmentStatus !== "live",
    ).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          <ListChecks className="size-5 text-primary" />
          Screen a shortlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste up to {MAX_TRIAGE_ROWS} listings — one per line, columns{" "}
          <span className="font-semibold text-foreground">
            Address · Price · Rent · Beds
          </span>{" "}
          (tab, pipe, or comma separated). We use the current FRED rate when
          available, disclose the generic preliminary tax fallback, and rank the
          survivors
          {result?.buyBoxActive ? " against your buy box" : ""}.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreviewRows(null);
          setResult(null);
        }}
        rows={6}
        spellCheck={false}
        placeholder={PLACEHOLDER}
        aria-label="Listings to screen"
        className="min-h-32 w-full resize-y rounded-xl border border-border bg-card p-3 font-mono text-base text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
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
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {extracting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4 text-primary" />
              )}
              Auto-extract from text
            </button>
          ) : null}
          <button
            type="button"
            onClick={previewRows ? screen : review}
            disabled={pending || extracting || text.trim() === ""}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md outline-none hover:bg-primary/95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : previewRows ? (
              <ListChecks className="size-4" />
            ) : (
              <PencilLine className="size-4" />
            )}
            {previewRows
              ? `Screen ${previewScreenableCount} ${previewScreenableCount === 1 ? "deal" : "deals"}`
              : "Review listings"}
          </button>
        </div>
      </div>

      {previewRows ? (
        <section
          aria-labelledby="triage-review-heading"
          className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="triage-review-heading"
                className="text-base font-extrabold text-foreground"
              >
                Review before screening
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Confirm the four inputs and the resolved market. Missing rent is
                kept visible but won&apos;t be underwritten with a made-up
                default.
              </p>
            </div>
            <div
              className="flex flex-wrap items-center gap-2 text-xs"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success">
                <CheckCircle2 className="size-3.5" aria-hidden />{" "}
                {previewScreenableCount} included
              </span>
              {previewErrorCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 font-semibold text-destructive">
                  <AlertTriangle className="size-3.5" aria-hidden />{" "}
                  {previewErrorCount}{" "}
                  {previewErrorCount === 1 ? "error" : "errors"}
                </span>
              ) : null}
            </div>
          </div>

          {/* Cards through tablet widths; the editable table only takes over
              when its four columns fit without horizontal overflow. */}
          <div className="mt-4 space-y-3 lg:hidden">
            {previewRows.map((row, index) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Listing {index + 1}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <PreviewInput
                      row={row}
                      field="address"
                      label="Address"
                      surface="card"
                      onChange={(value) =>
                        updatePreviewRow(row.id, "address", value)
                      }
                    />
                  </div>
                  <PreviewInput
                    row={row}
                    field="purchasePrice"
                    label="Price"
                    surface="card"
                    onChange={(value) =>
                      updatePreviewRow(row.id, "purchasePrice", value)
                    }
                  />
                  <PreviewInput
                    row={row}
                    field="monthlyRent"
                    label="Monthly rent"
                    surface="card"
                    onChange={(value) =>
                      updatePreviewRow(row.id, "monthlyRent", value)
                    }
                  />
                  <PreviewInput
                    row={row}
                    field="bedrooms"
                    label="Beds"
                    surface="card"
                    onChange={(value) =>
                      updatePreviewRow(row.id, "bedrooms", value)
                    }
                  />
                </div>
                <PreviewRowContext row={row} />
              </article>
            ))}
          </div>

          <div className="mt-4 hidden lg:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Editable listing preview</caption>
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th scope="col" className="w-[42%] pb-2 pr-2">
                    Address
                  </th>
                  <th scope="col" className="w-[18%] px-2 pb-2">
                    Price
                  </th>
                  <th scope="col" className="w-[18%] px-2 pb-2">
                    Rent
                  </th>
                  <th scope="col" className="w-[12%] px-2 pb-2">
                    Beds
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-3 pr-2">
                      <PreviewInput
                        row={row}
                        field="address"
                        label="Address"
                        surface="table"
                        onChange={(value) =>
                          updatePreviewRow(row.id, "address", value)
                        }
                      />
                      <PreviewRowContext row={row} />
                    </td>
                    <td className="px-2 py-3">
                      <PreviewInput
                        row={row}
                        field="purchasePrice"
                        label="Price"
                        surface="table"
                        onChange={(value) =>
                          updatePreviewRow(row.id, "purchasePrice", value)
                        }
                      />
                    </td>
                    <td className="px-2 py-3">
                      <PreviewInput
                        row={row}
                        field="monthlyRent"
                        label="Monthly rent"
                        surface="table"
                        onChange={(value) =>
                          updatePreviewRow(row.id, "monthlyRent", value)
                        }
                      />
                    </td>
                    <td className="px-2 py-3">
                      <PreviewInput
                        row={row}
                        field="bedrooms"
                        label="Beds"
                        surface="table"
                        onChange={(value) =>
                          updatePreviewRow(row.id, "bedrooms", value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Screened {result.screenedCount}{" "}
              {result.screenedCount === 1 ? "listing" : "listings"}
              {result.truncated
                ? ` (first ${MAX_TRIAGE_ROWS} of your paste)`
                : ""}
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                {result.buyBoxActive
                  ? "Each Offer Ceiling is the highest price that still meets the Buy Box criteria shown on that row."
                  : "Core underwriting is shown without an Offer Ceiling. Adopt return targets in a Buy Box and TrueCap calculates one for every row."}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {result.buyBoxActive ? (
                <button
                  type="button"
                  onClick={() => setPassersOnly((v) => !v)}
                  aria-pressed={passersOnly}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    passersOnly
                      ? "border-[var(--brand-green)]/40 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="size-3.5" />
                  Meets my buy box
                </button>
              ) : null}
              <div
                role="group"
                aria-label="Sort by"
                className="flex items-center gap-1 rounded-lg bg-muted p-1"
              >
                {sortOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={sort === o.id}
                    onClick={() => setSort(o.id)}
                    className={cn(
                      "min-h-11 rounded-md px-3 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                      sort === o.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 flex flex-col gap-2 rounded-xl border p-3 text-xs sm:flex-row sm:items-center sm:justify-between",
              fallbackRows > 0 || resultIsStale
                ? "border-warning/35 bg-warning/10"
                : "border-border bg-muted/30",
            )}
          >
            <div>
              <p className="font-semibold text-foreground">
                {resultContext?.screenedAt
                  ? `Screened ${new Date(resultContext.screenedAt).toLocaleString()}`
                  : "Screening assumptions need a refresh"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Exact rate and tax assumptions appear on each row and carry into
                the full analyzer.
                {fallbackRows > 0
                  ? ` ${fallbackRows} ${fallbackRows === 1 ? "row used" : "rows used"} one or more clearly labeled defaults.`
                  : ""}
                {resultIsStale
                  ? " Rates may have changed since this saved screen."
                  : ""}
              </p>
            </div>
            {resultIsStale || !resultContext?.screenedAt ? (
              <button
                type="button"
                onClick={screen}
                disabled={pending || !previewRows}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 font-semibold text-foreground disabled:opacity-60"
              >
                Re-screen with current assumptions
              </button>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {passersOnly
                ? "None of these meet your buy box yet."
                : "Nothing to show."}
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">
                        Listing
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        Screening result
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        Deal score
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        Cash flow
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        DSCR
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        Offer Ceiling
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">
                        Gap
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        Fastest path
                      </th>
                      <th scope="col" className="px-3 py-2.5">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, i) => (
                      <tr
                        key={`${row.input.address}-${i}`}
                        className={cn(!row.ok && "opacity-60")}
                      >
                        <td className="max-w-[280px] px-4 py-3">
                          <div
                            className="truncate font-medium text-foreground"
                            title={row.input.address}
                          >
                            {row.input.address}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{money(row.input.purchasePrice)}</span>
                            <BuyBoxFitBadge fit={row.buyBoxFit ?? undefined} />
                          </div>
                          <div
                            className={cn(
                              "mt-1 text-[10px] leading-snug",
                              row.assumptionContext?.enrichmentStatus === "live"
                                ? "text-muted-foreground"
                                : "text-warning-foreground",
                            )}
                          >
                            {rowAssumptionLabel(row)}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {row.ok ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                                verdictClasses(row.recommendation),
                              )}
                            >
                              {row.recommendation
                                ? triageVerdictLabel(row.recommendation)
                                : "—"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Needs rent
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">
                          {row.score ?? "—"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-mono tabular-nums",
                            (row.netCashFlowMonthly ?? 0) >= 0
                              ? "text-success"
                              : "text-[var(--metric-negative)]",
                          )}
                        >
                          {money(row.netCashFlowMonthly)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">
                          {ratio(row.dscr, row.isCashPurchase)}
                        </td>
                        <td
                          className="px-3 py-3 text-right font-mono font-semibold tabular-nums text-foreground"
                          title={row.targetLabel ?? undefined}
                        >
                          <span>{money(row.maxOffer)}</span>
                          {row.targetLabel ? (
                            <span className="mt-0.5 block max-w-40 text-[9px] font-sans font-normal leading-tight text-muted-foreground">
                              {row.targetLabel}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right text-xs font-semibold tabular-nums",
                            (row.askingGap ?? 0) > 0
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {gapToAsking(row)}
                        </td>
                        <td className="max-w-[180px] px-3 py-3 text-xs leading-snug text-foreground">
                          {fastestPath(row)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {/* Same-tab navigation is the private handoff boundary:
                              exact row inputs move through sessionStorage while
                              the rendered href remains safe to copy or inspect. */}
                          {/* min-h-11 + canceling negative margin/padding = 44px
                              touch band (WCAG 2.5.8) without growing the row —
                              the touch-band convention what-if-sliders.tsx set. */}
                          <AnalyzerHandoffLink
                            handoffHref={openUrl(row)}
                            prefetch={false}
                            onClick={() =>
                              trackEvent("shortlist_item_promoted", {
                                source: "triage",
                              })
                            }
                            className="-my-2 inline-flex min-h-11 items-center gap-1 rounded-md py-2 text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Open <ArrowUpRight className="size-3.5" />
                          </AnalyzerHandoffLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mt-4 space-y-3 lg:hidden">
                {rows.map((row, i) => (
                  <div
                    key={`${row.input.address}-${i}`}
                    className={cn(
                      "rounded-2xl border border-border bg-card p-4",
                      !row.ok && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="truncate font-semibold text-foreground"
                          title={row.input.address}
                        >
                          {row.input.address}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {money(row.input.purchasePrice)}
                        </div>
                        <div
                          className={cn(
                            "mt-1 text-[10px] leading-snug",
                            row.assumptionContext?.enrichmentStatus === "live"
                              ? "text-muted-foreground"
                              : "text-warning-foreground",
                          )}
                        >
                          {rowAssumptionLabel(row)}
                        </div>
                      </div>
                      {row.ok ? (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                              verdictClasses(row.recommendation),
                            )}
                          >
                            {row.recommendation
                              ? triageVerdictLabel(row.recommendation)
                              : "—"}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            Deal score {row.score ?? "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Needs rent
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Cash flow
                        </div>
                        <div
                          className={cn(
                            "font-mono font-semibold",
                            (row.netCashFlowMonthly ?? 0) >= 0
                              ? "text-success"
                              : "text-[var(--metric-negative)]",
                          )}
                        >
                          {money(row.netCashFlowMonthly)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          CoC
                        </div>
                        <div className="font-mono font-semibold text-foreground">
                          {pct(row.cocReturnPct)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          DSCR
                        </div>
                        <div className="font-mono font-semibold text-foreground">
                          {ratio(row.dscr, row.isCashPurchase)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-muted/40 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Offer Ceiling
                        </div>
                        <div
                          className="mt-0.5 font-mono font-semibold text-foreground"
                          title={row.targetLabel ?? undefined}
                        >
                          {money(row.maxOffer)}
                        </div>
                        {row.targetLabel ? (
                          <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                            {row.targetLabel}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-xl bg-muted/40 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Gap to asking
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 font-semibold",
                            (row.askingGap ?? 0) > 0
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {gapToAsking(row)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl border border-border bg-background p-3 text-xs">
                      <span className="font-bold text-foreground">
                        Fastest path:{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {fastestPath(row)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <BuyBoxFitBadge fit={row.buyBoxFit ?? undefined} />
                      {/* 44px touch band (min-h-11 + canceling -my/py) — this is
                          the card's only action; visual height unchanged. */}
                      <AnalyzerHandoffLink
                        handoffHref={openUrl(row)}
                        prefetch={false}
                        onClick={() =>
                          trackEvent("shortlist_item_promoted", {
                            source: "triage",
                          })
                        }
                        className="-my-2 ml-auto inline-flex min-h-11 items-center gap-1 rounded-md py-2 text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Open in analyzer <ArrowUpRight className="size-3.5" />
                      </AnalyzerHandoffLink>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.parseErrors.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                {result.parseErrors.length} line
                {result.parseErrors.length === 1 ? "" : "s"} couldn&apos;t be
                read:
              </p>
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
