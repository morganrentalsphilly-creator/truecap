"use client";

/**
 * Buy Box verdict - inline card that shows whether the current deal meets the
 * user's saved acquisition criteria. COMPLEMENTS the Screening Index (never
 * replaces it). With multiple buy boxes (DM-2) it screens the deal against
 * every active box, shows a "meets N of M" summary, and details the default
 * box's per-criterion checks. Renders nothing unless:
 *   - the user is authenticated (gated by `enabled`), AND
 *   - they're on Pro with ≥1 active buy box that has criteria.
 * Invisible-until-useful: free users / users without a buy box see nothing.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Loader2, Minus, RefreshCw, Target, X } from "lucide-react";
import { listBuyBoxesForDealAction } from "@/app/actions/user-buy-boxes";
import {
  boxesForPersonalAnalyzerStrategy,
  buyBoxHasCriteria,
  evaluateBuyBoxes,
  selectDecidingBuyBoxResult,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import {
  namedBuyBoxFromDecisionBasis,
  type OfferCeilingDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";
import { buildBuyBoxQaReport, type DealQaBuyBoxReport } from "@/lib/deal-qa-context";
import {
  chooseMaoTargetFromBuyBox,
  describeMaoTarget,
  solveBuyBoxClearingPrice,
} from "@/lib/mao-targets";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** "Your number" line for the FAIL state — either the price that clears
 *  the box, or the reason no price can. */
type YourNumberLine =
  | { kind: "price"; maxPrice: number }
  | { kind: "notPrice"; labels: string[] };

export function BuyBoxVerdictCard({
  enabled,
  metrics,
  values,
  onFitChange,
  onQaContextChange,
  onLoadStateChange,
  analyzerStrategyKey,
  adoptedDecisionBasis,
  retryToken = 0,
  onRetry,
}: {
  enabled: boolean;
  metrics: BuyBoxDealMetrics | null;
  /** Current form values — lets the FAIL state answer "so what price
   *  WOULD work?" via the Offer Ceiling solver (same basis as the saved-deal
   *  workspace's max-offer line). Optional: surfaces without form values
   *  (shared-deal viewer) simply don't render the line. */
  values?: InvestmentFormValues | null;
  /** Reports the evaluated fit up to the analysis dashboard (true/false =
   *  evaluated, null = no active box / can't evaluate) so the Next Action
   *  banner on the SAME surface can honor the buy box — otherwise this
   *  card could say "Misses your buy box" one card below a banner saying
   *  "make your offer". */
  onFitChange?: (anyPass: boolean | null) => void;
  /** Reports the SAME evaluation as a compact Deal Q&A grounding block
   *  (plus the primary box's numeric thresholds, the canonical Offer Ceiling basis),
   *  so AI answers are grounded in exactly what this card shows on screen.
   *  null = no active box / not evaluated. */
  onQaContextChange?: (report: DealQaBuyBoxReport | null) => void;
  /** True only after the current user's usable Buy Boxes have resolved. The
   *  parent uses this to prevent Save/Share/PDF from capturing the fallback
   *  target during the async account lookup. */
  onLoadStateChange?: (state: "loading" | "ready" | "error") => void;
  /** Only personal boxes for this exact analyzer strategy (plus deliberately
   *  unscoped boxes) may influence the verdict or Offer Ceiling target. */
  analyzerStrategyKey?: AnalyzerStrategyKey | null;
  /** Exact immutable basis adopted before this analysis ran. `null` is an
   * explicit instruction not to substitute whichever live Buy Box happens to
   * pass today; `undefined` retains the account-overlay behavior used by the
   * standalone shared-deal viewer. */
  adoptedDecisionBasis?: OfferCeilingDecisionBasis | null;
  /** Parent-owned retry counter lets the top-of-result notice and this inline
   *  card trigger the same scoped lookup without a full-page refresh. */
  retryToken?: number;
  onRetry?: () => void;
}) {
  const [boxes, setBoxes] = useState<NamedBuyBox[] | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "resolved" | "error">(
    "idle"
  );
  // Mobile-only progressive disclosure for the per-criterion grid — the
  // headline + personal line answer "does it fit?"; the grid is detail.
  const [showChecks, setShowChecks] = useState(false);
  const lastDeliveryKeyRef = useRef<string | null | undefined>(undefined);
  const frozenDecisionBox = useMemo(
    () => namedBuyBoxFromDecisionBasis(adoptedDecisionBasis),
    [adoptedDecisionBasis],
  );

  useEffect(() => {
    if (!enabled) {
      setBoxes([]);
      setLookupState("resolved");
      return;
    }
    // The analyzer passes this prop explicitly. Evaluate the one frozen box
    // selected before Run; never re-query and switch to a different passing
    // box after the result exists. A custom/legacy basis intentionally yields
    // no Buy Box verdict rather than inventing current-profile provenance.
    if (adoptedDecisionBasis !== undefined) {
      setBoxes(frozenDecisionBox ? [frozenDecisionBox] : []);
      setLookupState("resolved");
      lastDeliveryKeyRef.current = undefined;
      onFitChange?.(null);
      onQaContextChange?.(null);
      return;
    }
    // The only account-overlay consumer is a public/shared deal. It must send
    // the full canonical values so the server can bind evaluation access to the
    // exact immutable deal key; metrics alone are forgeable and insufficient.
    if (!values) {
      setBoxes([]);
      setLookupState("resolved");
      onFitChange?.(null);
      onQaContextChange?.(null);
      onLoadStateChange?.("ready");
      return;
    }
    setBoxes(null);
    setLookupState("loading");
    // A retry can resolve to the same report as the prior success. It still
    // must redeliver `ready` after the transient failure.
    lastDeliveryKeyRef.current = undefined;
    onFitChange?.(null);
    onQaContextChange?.(null);
    onLoadStateChange?.("loading");
    let cancelled = false;
    void listBuyBoxesForDealAction(values)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setBoxes([]);
          setLookupState("error");
          onFitChange?.(null);
          onQaContextChange?.(null);
          onLoadStateChange?.("error");
          return;
        }
        // Only adopt personal boxes for this exact analysis lens (plus boxes
        // deliberately saved without a strategy). Client-assigned criteria and
        // mismatched strategies must never drive a personal verdict or ceiling.
        if (result.canUse) {
          setBoxes(
            boxesForPersonalAnalyzerStrategy(
              result.boxes,
              analyzerStrategyKey,
            ).filter(
              (b) => b.isActive && buyBoxHasCriteria(b)
            )
          );
        } else {
          setBoxes([]);
        }
        setLookupState("resolved");
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[buy-box-verdict] load failed:", err);
          setBoxes([]);
          setLookupState("error");
          onFitChange?.(null);
          onQaContextChange?.(null);
          // Fail closed: a transient account lookup must never let Save,
          // Share, or PDF capture a canonical fallback that silently drops
          // the user's Buy Box criteria.
          onLoadStateChange?.("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    analyzerStrategyKey,
    adoptedDecisionBasis,
    enabled,
    frozenDecisionBox,
    onFitChange,
    onLoadStateChange,
    onQaContextChange,
    retryToken,
    values,
  ]);

  const evaluated = useMemo(() => {
    if (!boxes || boxes.length === 0 || !metrics) return null;
    const results = evaluateBuyBoxes(boxes, metrics).filter((r) => r.result.active);
    if (results.length === 0) return null;
    return { results, summary: summarizeBuyBoxFit(results) };
  }, [boxes, metrics]);

  const decidingBox = evaluated ? selectDecidingBuyBoxResult(evaluated.results) : null;
  const anyPass = decidingBox ? decidingBox.result.passes : null;

  // Deal Q&A grounding report — same evaluation, prompt-ready shape. The
  // JSON key guard makes re-sends idempotent even if `metrics` (an inline
  // object prop) gets a fresh identity every parent render, so this can
  // never set-state-loop the dashboard.
  const qaReport = useMemo(
    () => (evaluated ? buildBuyBoxQaReport(evaluated.results, evaluated.summary) : null),
    [evaluated]
  );
  useEffect(() => {
    if (lookupState !== "resolved") return;
    const key = JSON.stringify({ anyPass, qaReport });
    if (key === lastDeliveryKeyRef.current) return;
    lastDeliveryKeyRef.current = key;
    // Deliver fit + exact target report before marking the lookup ready. React
    // batches these parent updates, so no committed frame can enable
    // Save/Share/PDF against the fallback target.
    onFitChange?.(anyPass);
    onQaContextChange?.(qaReport);
    onLoadStateChange?.("ready");
  }, [anyPass, lookupState, onFitChange, onLoadStateChange, onQaContextChange, qaReport]);

  // "Your number" — computed ONLY in the fail state (the memo body bails
  // first, so the iterative solver never runs on a passing deal). Closes
  // the loop the per-criterion gaps leave open: what price WOULD clear
  // this box? Same basis + solver as the saved-deal workspace's max-offer
  // line (lib/mao-targets), so the two surfaces can't disagree. A
  // property-type / market miss can't be fixed by price — say that
  // instead (it's already on screen in the failed checks, so it's free).
  const yourNumber = useMemo<YourNumberLine | null>(() => {
    if (!values || !metrics || !evaluated) return null;
    const primary = selectDecidingBuyBoxResult(evaluated.results);
    if (!primary) return null;
    const r = primary.result;
    if (r.passes || r.failedLabels.length === 0) return null;
    const nonPrice = r.checks.filter(
      (c) => c.pass === false && (c.id === "propertyType" || c.id === "state")
    );
    if (nonPrice.length > 0) {
      return { kind: "notPrice", labels: nonPrice.map((c) => c.label.toLowerCase()) };
    }
    try {
      const maxPrice = solveBuyBoxClearingPrice(values, primary.box, {
        isCashPurchase: metrics.isCashPurchase,
      });
      if (maxPrice == null) return null;
      const asking =
        typeof values.purchasePrice === "number" && values.purchasePrice > 0
          ? values.purchasePrice
          : null;
      // Solved at/above asking (solver slack / $500 rounding) → the miss
      // isn't price-driven after all; don't advise a "cut" to a higher number.
      if (asking == null || maxPrice >= asking) return null;
      return { kind: "price", maxPrice };
    } catch {
      // Degenerate inputs (cash deal, $0 rent, price at the solver floor)
      // must never break the verdict card — just skip the line.
      return null;
    }
  }, [values, metrics, evaluated]);

  if (enabled && lookupState === "loading") {
    return (
      <section
        aria-label="Buy Box rules"
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-[var(--brand-blue-light)] p-4 text-sm text-foreground sm:p-5"
      >
        <Loader2
          className="mt-0.5 size-4 shrink-0 animate-spin text-primary"
          aria-hidden
        />
        <div>
          <p className="font-bold">Loading strategy-matched Buy Box rules…</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Base underwriting remains visible. TrueCap will not claim a Buy
            Box-backed Offer Ceiling until the matching rules resolve.
          </p>
        </div>
      </section>
    );
  }

  if (enabled && lookupState === "error") {
    return (
      <section
        aria-label="Buy Box rules unavailable"
        role="alert"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Buy Box rules are temporarily unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
              No Buy Box fit or Offer Ceiling is being claimed.
              You can still save, share, or export the base underwriting;
              your own targets stay labeled separately.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={!onRetry}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-background px-3 text-xs font-bold text-amber-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="size-4" aria-hidden />
            Retry Buy Box
          </button>
        </div>
      </section>
    );
  }

  if (!evaluated) return null;

  // Detail the same deciding box that supplies the Offer Ceiling: the first
  // passing box, otherwise the highest-priority box. The N-of-M line remains
  // an aggregate summary and is deliberately labeled separately.
  const primary = selectDecidingBuyBoxResult(evaluated.results);
  if (!primary) return null;
  const r = primary.result;
  const multi = evaluated.results.length > 1;
  const { summary } = evaluated;
  const yourNumberCriteria = (() => {
    if (!yourNumber || yourNumber.kind !== "price" || !metrics) return null;
    const target = chooseMaoTargetFromBuyBox(primary.box, {
      isCashPurchase: metrics.isCashPurchase,
    });
    return target ? describeMaoTarget(target) : "this buy box’s price criteria";
  })();

  const headline = r.passes
    ? "Meets your targets at asking"
    : r.failedLabels.length > 0
      ? "Doesn't meet your targets at asking"
      : "Can't determine Buy Box fit yet";
  const applicableCount = r.checks.filter((c) => c.pass !== null).length;

  return (
    <section
      aria-label="Buy Box fit"
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        r.passes
          ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)]"
          : r.failedLabels.length > 0
            ? "border-amber-300 bg-amber-50"
            : "border-border bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {multi ? "Your buy boxes" : "Your buy box"}
          </h3>
        </div>
        <Link
          href="/settings"
          prefetch={false}
          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Edit
        </Link>
      </div>

      {multi ? (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Meets{" "}
          <span className={summary.passingCount > 0 ? "text-[var(--brand-green)]" : "text-amber-700"}>
            {summary.passingCount} of {summary.activeCount}
          </span>{" "}
          of your buy boxes
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            r.passes ? "bg-[var(--brand-green)] text-white" : "bg-amber-500 text-white"
          )}
        >
          {r.passes ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        </span>
        <p className={cn("text-base font-bold", r.passes ? "text-[var(--brand-green)]" : "text-amber-800")}>
          {headline}
        </p>
        {multi ? (
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {primary.box.name}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {r.passedCount}/{applicableCount} criteria met
        </span>
      </div>

        {r.personalLine ? (
        <p className="mt-2 text-xs font-medium text-foreground/80">{r.personalLine}</p>
      ) : null}
      {!r.passes && r.failedLabels.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Misses on {r.failedLabels.join(", ")}.
        </p>
      ) : null}

      {/* The gaps above say what misses; this says what to DO about it —
          the highest price that clears this box (or that price can't fix
          it). Non-null only in the fail state (see the memo). */}
      {yourNumber ? (
        yourNumber.kind === "price" ? (
          <p className="mt-1.5 text-xs text-foreground/80">
            <span className="font-bold text-foreground">
              Offer Ceiling: {money(yourNumber.maxPrice)}
            </span>{" "}
            — the highest price that still meets {primary.box.name} under the assumptions shown.
            {yourNumberCriteria ? (
              <span className="mt-0.5 block">Criteria: {yourNumberCriteria}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Price isn&apos;t the blocker — this deal misses on {yourNumber.labels.join(" and ")} at
            any price.
          </p>
        )
      ) : null}

      {/* At 375px the full criterion grid made this card ~300px tall in a
          stack of five cards before the first metric; the verdict line +
          personal gap already answer the question, so the grid is
          tap-to-expand on phones (always expanded from sm:). */}
      <button
        type="button"
        onClick={() => setShowChecks((v) => !v)}
        aria-expanded={showChecks}
        className="mt-2 flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:hidden"
      >
        {showChecks ? "Hide criteria" : `Show all ${r.checks.length} criteria`}
        <ChevronDown className={cn("size-3.5 transition-transform", showChecks && "rotate-180")} />
      </button>

      <div className={cn("mt-3 grid-cols-2 gap-2 sm:mt-3 sm:grid sm:grid-cols-3", showChecks ? "grid" : "hidden sm:grid")}>
        {r.checks.map((c) => (
          <div key={c.id} className="rounded-lg border border-border/70 bg-card px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-foreground">{c.label}</span>
              {c.pass === true ? (
                <Check className="size-3.5 text-[var(--brand-green)]" />
              ) : c.pass === false ? (
                <X className="size-3.5 text-red-600" />
              ) : (
                <Minus className="size-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{c.actual}</span>{" "}
              <span className="text-muted-foreground">vs {c.target}</span>
            </div>
            {c.gapText ? (
              <div
                className={cn(
                  "mt-0.5 text-[10px] font-semibold",
                  c.pass === false ? "text-red-600" : "text-[var(--brand-green)]"
                )}
              >
                {c.gapText}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
