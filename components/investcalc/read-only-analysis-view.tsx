"use client";

/**
 * Read-only analysis view rendered on the public /d/[encoded] share page.
 *
 * Shows the headline metric tiles, Offer Ceiling card, sensitivity grid, and
 * Strategies tab content (rehab estimator, BRRRR, fix-and-flip). All
 * computed client-side from the encoded form snapshot - no auth, no
 * server actions needed.
 *
 * Hides the four Pro-gated tabs (10-year, tax strategy, exit scenarios,
 * Screening Index) - those become upgrade prompts on the parent page.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import { SharedDealViewerBuyBox } from "@/components/investcalc/shared-deal-viewer-buy-box";
import type { ReportComp, ReportComps } from "@/lib/report-comps";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import {
  clearPendingMaoTarget,
  maoTargetAnalysisFingerprint,
  writePendingMaoTarget,
} from "@/lib/mao-target-editor";
import { describeMaoTarget } from "@/lib/mao-targets";
import type { OfferCeilingAccessPayload } from "@/lib/offer-ceiling-access-contract";
import {
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import { trackEvent } from "@/lib/analytics";
import type { PublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";

interface ReadOnlyAnalysisViewProps {
  values: InvestmentFormValues;
  /** Server-authorized result. Core shares contain no paid result fields. */
  analysis: PublicShareAnalysisPayload;
  /** Owner's stored sale/rent comps (when a saved deal was shared). Backs the
   *  rent/value with real comparables; null hides the section. */
  comps?: ReportComps | null;
  /** Exact acquisition criteria captured with the share. */
  maoTarget?: MaoTarget;
  /** Frozen provenance for the shared target. */
  maoTargetSource?: OfferCeilingTargetSource;
  /** Exact-or-preview result already authorized and calculated by the server. */
  offerCeilingAccess?: OfferCeilingAccessPayload | null;
  /** Prevents current scenario engines from being mixed into a recorded base
   * result captured by an opaque share. */
  recordedResult?: boolean;
  /** False when the sharer kept the exact property identity private. */
  addressIncluded?: boolean;
  /** True when the snapshot's price was an automated estimate (share meta). */
  priceEstimated?: boolean;
}

const fmtCash = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function MetricTile({
  label,
  value,
  sub,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-5 flex flex-col gap-1">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
          positive && "text-[var(--metric-positive)]",
          negative && "text-[var(--metric-negative)]",
          !positive && !negative && "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

const money0 = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : `$${Math.round(n).toLocaleString("en-US")}`;

function CompRow({ c }: { c: ReportComp }) {
  const facts = [
    c.bedrooms != null ? `${c.bedrooms} bd` : null,
    c.bathrooms != null ? `${c.bathrooms} ba` : null,
    c.squareFootage != null
      ? `${c.squareFootage.toLocaleString("en-US")} sqft`
      : null,
    c.distanceMiles != null ? `${c.distanceMiles.toFixed(1)} mi` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {c.address || "Nearby comp"}
        </p>
        {facts ? (
          <p className="truncate text-[11px] text-muted-foreground">{facts}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
        {money0(c.price)}
      </span>
    </li>
  );
}

/**
 * Read-only "backed by comps" section on the shared deal page. Renders the
 * owner's stored RentCast value/rent estimates + a few comparables, so a
 * recipient (spouse, partner, lender) sees the rent/value is grounded in real
 * nearby sales — the credibility layer the audit flagged as dying at the share
 * boundary. Self-hides via the parent (only rendered when comps exist).
 */
function SharedDealComps({ comps }: { comps: ReportComps }) {
  const sale = comps.saleComps.slice(0, 4);
  const rent = comps.rentComps.slice(0, 4);
  const range = (r: { low: number | null; high: number | null } | null) =>
    r && (r.low != null || r.high != null)
      ? `${money0(r.low)} – ${money0(r.high)}`
      : null;
  const valueRange = range(comps.valueRange);
  const rentRange = range(comps.rentRange);

  return (
    <section
      aria-label="Market comps"
      className="bg-card rounded-2xl border border-border shadow-sm"
    >
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Backed by market comps
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Nearby sales &amp; rentals via RentCast — reference only.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Est. value
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {money0(comps.valueEstimate)}
            </p>
            {valueRange ? (
              <p className="text-[11px] text-muted-foreground">{valueRange}</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Est. rent
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {comps.rentEstimate == null
                ? "—"
                : `${money0(comps.rentEstimate)}/mo`}
            </p>
            {rentRange ? (
              <p className="text-[11px] text-muted-foreground">{rentRange}</p>
            ) : null}
          </div>
        </div>
        {sale.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Comparable sales
            </p>
            <ul className="divide-y divide-border/70">
              {sale.map((c, i) => (
                <CompRow key={`s-${i}`} c={c} />
              ))}
            </ul>
          </div>
        ) : null}
        {rent.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Comparable rentals
            </p>
            <ul className="divide-y divide-border/70">
              {rent.map((c, i) => (
                <CompRow key={`r-${i}`} c={c} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ReadOnlyAnalysisView({
  values,
  analysis,
  comps,
  maoTarget,
  maoTargetSource = "selected-targets",
  offerCeilingAccess = null,
  recordedResult = false,
  addressIncluded = true,
  priceEstimated = false,
}: ReadOnlyAnalysisViewProps) {
  const router = useRouter();
  const result = analysis.result;
  const proResult = analysis.access === "pro" ? analysis.result : null;
  const adoptedMaoTarget =
    maoTarget && isAdoptedOfferCeilingTargetSource(maoTargetSource)
      ? maoTarget
      : undefined;
  const offerCeiling =
    adoptedMaoTarget && offerCeilingAccess?.access === "exact"
      ? (offerCeilingAccess.exact?.presentation ?? null)
      : null;
  const rangePreview =
    adoptedMaoTarget && offerCeilingAccess?.access === "preview"
      ? offerCeilingAccess.range
      : null;
  const assumptionBreakpoints = useMemo(
    () => (recordedResult ? [] : computeAssumptionImpact(values).slice(0, 3)),
    [recordedResult, values],
  );
  const criteriaMet = adoptedMaoTarget
    ? meetsMaoTarget(result, adoptedMaoTarget)
    : null;
  const decisionLabel =
    criteriaMet == null
      ? "Preliminary underwriting"
      : criteriaMet
        ? "Meets selected rules at asking"
        : "Does not meet selected rules at asking";
  const ceilingDisplay = offerCeiling
    ? fmtCash(offerCeiling.ceiling)
    : offerCeilingAccess?.access === "exact" && maoTarget
      ? "Not reachable"
      : rangePreview
        ? !rangePreview.downsideFeasible || rangePreview.lower == null
          ? "No feasible downside case"
          : `${fmtCash(rangePreview.lower)}–${fmtCash(rangePreview.upper)}`
        : "Unavailable";
  const priceGap = offerCeiling
    ? offerCeiling.listPriceGap > 0
      ? `${fmtCash(offerCeiling.listPriceGap)} above ceiling`
      : offerCeiling.listPriceGap < 0
        ? `${fmtCash(Math.abs(offerCeiling.listPriceGap))} below ceiling`
        : "At the ceiling"
    : rangePreview
      ? !rangePreview.downsideFeasible || rangePreview.lower == null
        ? "Downside misses targets at every supported price"
        : Number(values.purchasePrice) > rangePreview.upper
          ? `${fmtCash(Number(values.purchasePrice) - rangePreview.upper)} above preview`
          : Number(values.purchasePrice) < rangePreview.lower
            ? `${fmtCash(rangePreview.lower - Number(values.purchasePrice))} below preview`
            : "Inside preview range"
      : "Not available";
  // "Make this mine": hand the FULL deal to the calculator via its autosave
  // draft (restored on mount via normalizeInvestmentFormSnapshot), so the
  // highest-intent viewer lands on a populated analysis instead of a blank
  // homepage. Key must match CALC_FORM_DRAFT_KEY in investcalc-page.tsx.
  const makeThisMine = () => {
    const cloneValues = addressIncluded ? values : { ...values, address: "" };
    try {
      window.localStorage.setItem(
        "truecap_calc_form_draft_v1",
        JSON.stringify(cloneValues),
      );
    } catch {
      /* storage unavailable — fall through to a clean calculator */
    }
    const analysisFingerprint = maoTargetAnalysisFingerprint(cloneValues);
    if (addressIncluded && adoptedMaoTarget && analysisFingerprint) {
      writePendingMaoTarget(adoptedMaoTarget, {
        analysisFingerprint,
        source: maoTargetSource,
      });
    } else {
      clearPendingMaoTarget();
    }
    trackEvent("shared_scenario_forked", {});
    router.push("/?utm_source=shared_deal&utm_medium=clone");
  };
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="shared-decision-title"
        className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Decision
            </p>
            <h2
              id="shared-decision-title"
              className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {decisionLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {priceEstimated ? "Estimated price" : "Asking"}{" "}
              {fmtCash(Number(values.purchasePrice))}
              {priceEstimated
                ? " (automated estimate — not an asking price)"
                : ""}
              . This read-only share is a screening record, not a decision;
              independently verify every material assumption before recording a
              decision.
            </p>
          </div>

          <div className="rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Offer Ceiling
            </p>
            <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-primary">
              {ceilingDisplay}
            </p>
            {adoptedMaoTarget ? (
              <>
                <p className="mt-1 text-xs font-semibold text-foreground">
                  Under the targets captured with this share
                  {offerCeiling
                    ? " · exact ceiling"
                    : rangePreview
                      ? " · coarse range preview"
                      : ""}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                  Targets: {describeMaoTarget(adoptedMaoTarget)}
                </p>
                {offerCeiling ? (
                  <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                    <p>
                      Binding:{" "}
                      {offerCeiling.bindingConstraints
                        .map((item) => item.criterion)
                        .join(" + ") || "No constraint resolved"}
                    </p>
                    {offerCeiling.nextConstraint ? (
                      <p>
                        Next constraint: {offerCeiling.nextConstraint.criterion}
                      </p>
                    ) : null}
                    <p>
                      Screening range:{" "}
                      {offerCeiling.range.lower == null
                        ? "no feasible downside price"
                        : fmtCash(offerCeiling.range.lower)}
                      –
                      {offerCeiling.range.upper == null
                        ? "no feasible upside price"
                        : fmtCash(offerCeiling.range.upper)}{" "}
                      if {offerCeiling.range.label}.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                No Offer Ceiling was calculated because this share did not
                capture an adopted target. Open a new analysis to review and
                adopt your own rules without rewriting this historical result.
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {adoptedMaoTarget
                ? "Highest modeled price that still meets the targets captured with this share under the assumptions shown."
                : "A supported Offer Ceiling requires captured target criteria."}{" "}
              This is not a recommended offer or an appraisal.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Criteria fit
            </p>
            <p className="mt-1 text-sm font-extrabold text-foreground">
              {criteriaMet == null
                ? "No adopted target"
                : criteriaMet
                  ? "Meets"
                  : "Misses"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Decision readiness
            </p>
            <p className="mt-1 text-sm font-extrabold text-foreground">
              Screening only
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Margin of safety
            </p>
            <p className="mt-1 text-sm font-extrabold text-foreground">
              {priceGap}
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Next action
            </p>
            <p className="mt-1 text-sm font-extrabold text-foreground">
              {assumptionBreakpoints[0]
                ? `Verify ${assumptionBreakpoints[0].label.toLowerCase()}`
                : "Verify material assumptions"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            What could break the deal
          </p>
          {assumptionBreakpoints.length > 0 ? (
            <ol className="mt-2 grid gap-1 text-sm font-semibold text-foreground sm:grid-cols-3">
              {assumptionBreakpoints.map((driver, index) => (
                <li key={`${driver.label}-${index}`}>
                  <span className="text-muted-foreground">{index + 1}.</span>{" "}
                  {driver.label} {driver.deltaLabel} moves cash flow about ±
                  {fmtCash(driver.cashFlowSwing / 2)}/mo
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm font-semibold text-foreground">
              Verify rent, property taxes, insurance, vacancy, and repair
              reserves against current source documents. Sensitivity figures are
              intentionally not regenerated inside this recorded share.
            </p>
          )}
        </div>
      </section>

      {/* Headline metric tiles */}
      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:gap-3",
          proResult ? "sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-4",
        )}
      >
        <MetricTile
          label="Monthly Cash Flow"
          value={fmtCash(result.netCashFlow)}
          positive={result.netCashFlow >= 0}
          negative={result.netCashFlow < 0}
        />
        <MetricTile
          label="CoC Return"
          value={
            result.totalCashRequired <= 0 ? "N/A" : fmtPct(result.cocReturn)
          }
          sub={
            result.totalCashRequired <= 0
              ? "No modeled cash invested"
              : undefined
          }
          positive={result.totalCashRequired > 0 && result.cocReturn >= 0}
          negative={result.totalCashRequired > 0 && result.cocReturn < 0}
        />
        <MetricTile
          label="Cap Rate"
          value={fmtPct(result.capRate)}
          positive={result.capRate >= 0}
          negative={result.capRate < 0}
        />
        <MetricTile
          label="DSCR"
          // Cash purchases have no debt service so DSCR is undefined.
          // calc-analysis returns 0 in that case - surface a clear sub
          // rather than a misleading "Underwater" badge.
          value={result.monthlyPayment <= 0 ? "—" : result.dscr.toFixed(2)}
          sub={
            result.monthlyPayment <= 0
              ? "Cash purchase"
              : result.dscr >= 1.25
                ? "Common screening threshold (≥1.25)"
                : result.dscr >= 1.0
                  ? "Tight (≥1.0)"
                  : "Underwater"
          }
          positive={result.monthlyPayment > 0 && result.dscr >= 1.25}
          negative={result.monthlyPayment > 0 && result.dscr < 1.25}
        />
        {proResult ? (
          <>
            <MetricTile
              label="Illustrative Tax Effect"
              value={fmtCash(proResult.taxSavingsMonthly)}
              sub={
                proResult.taxSavingsMonthly > 0
                  ? "Estimated benefit / month"
                  : proResult.taxSavingsMonthly < 0
                    ? "Estimated liability / month"
                    : "No modeled effect"
              }
            />
            <MetricTile
              label="Illustrative After-Tax CF"
              value={fmtCash(proResult.afterTaxCF)}
              sub="/month estimate"
            />
          </>
        ) : null}
      </div>

      {/* The VIEWER's own buy box verdict on this shared deal — renders only
          for a signed-in viewer with an active buy box; anonymous viewers see
          nothing here. Sits right above "Make this mine" so a personal miss
          ("0.8pp short") flows into "import it and adjust". */}
      {addressIncluded ? (
        <SharedDealViewerBuyBox values={values} result={result} />
      ) : null}

      {/* Primary conversion action for a high-intent viewer: clone the deal
          into the calculator (full inputs preloaded) instead of sending them
          to a blank homepage. */}
      <button
        type="button"
        onClick={makeThisMine}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        {addressIncluded
          ? "Make this deal mine — open it in the calculator →"
          : "Open these assumptions — add the property address →"}
      </button>

      {comps ? <SharedDealComps comps={comps} /> : null}

      {proResult && !recordedResult ? (
        <>
          <SensitivityGrid values={values} />

          <details className="bg-card rounded-2xl border border-border shadow-sm">
            <summary className="flex min-h-11 cursor-pointer items-center px-5 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Advanced/Beta strategy modeling
            </summary>
            <p className="border-t border-border px-5 pt-4 text-xs leading-relaxed text-muted-foreground">
              Rehab, refinance, flip, and short-term-rental outputs are
              secondary scenarios with incomplete market, lender, regulatory, or
              contractor evidence. Verify them independently.
            </p>
            <StrategiesPanel values={values} result={proResult} />
          </details>
        </>
      ) : recordedResult ? (
        <section
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          aria-labelledby="recorded-share-scenarios-title"
        >
          <h2
            id="recorded-share-scenarios-title"
            className="text-base font-bold text-foreground"
          >
            Scenario tools are separate from this recorded result
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            This link preserves the numbers captured when it was created. Clone
            the assumptions into a new analysis to run today&rsquo;s sensitivity
            and strategy scenarios without rewriting this historical record.
          </p>
        </section>
      ) : (
        <section
          className="rounded-2xl border border-primary/25 bg-[var(--brand-blue-light)] p-5 sm:p-6"
          aria-labelledby="shared-pro-analysis-title"
        >
          <h2
            id="shared-pro-analysis-title"
            className="text-base font-bold text-foreground"
          >
            Exact Offer Ceiling, sensitivity, and advanced strategy modeling are
            paid tools
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            This free shared view includes the deal&rsquo;s core underwriting.
            Open the property in TrueCap to tune assumptions or unlock the
            advanced decision tools.
          </p>
          <Link
            href="/?utm_source=shared_deal&utm_medium=pro_gate"
            className="mt-3 inline-flex min-h-11 items-center font-bold text-primary hover:underline"
          >
            Analyze this property in TrueCap →
          </Link>
        </section>
      )}

      {/* Viral loop: this public share page is seen by partners, lenders,
          and other investors. Convert them into TrueCap users. */}
      <Link
        href="/?utm_source=shared_deal&utm_medium=share_link"
        className="block rounded-2xl bg-primary p-6 sm:p-8 text-center text-primary-foreground no-underline transition-opacity hover:opacity-90"
      >
        <p className="text-lg sm:text-xl font-extrabold">
          Analyzed with TrueCap
        </p>
        <p className="mt-1 text-sm sm:text-base opacity-90">
          Run your own rental deal free. Cap rate, cash flow, and DSCR from just
          an address in 60 seconds.
        </p>
        <span className="mt-4 inline-block rounded-xl bg-primary-foreground px-4 py-2.5 text-sm font-bold text-primary">
          Try TrueCap free →
        </span>
      </Link>

      {/* Advice guardrail - this page is shared to lenders/partners/clients and
          shows verdict + recommendation language, but has no SiteFooter. */}
      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        This shared analysis is an automated estimate for screening only, not an
        appraisal, and not financial, tax, or investment advice. Figures depend
        on assumptions that may be out of date; verify independently before
        making any decision.
      </p>
    </div>
  );
}
