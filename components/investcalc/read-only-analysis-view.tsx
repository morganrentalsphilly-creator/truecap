"use client";

/**
 * Read-only analysis view rendered on the public /d/[encoded] share page.
 *
 * Shows the headline metric tiles, MAO card, sensitivity grid, and
 * Strategies tab content (rehab estimator, BRRRR, fix-and-flip). All
 * computed client-side from the encoded form snapshot - no auth, no
 * server actions needed.
 *
 * Hides the four Pro-gated tabs (10-year, tax strategy, exit scenarios,
 * deal score) - those become upgrade prompts on the parent page.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { MaxOfferCard } from "@/components/investcalc/max-offer-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";
import type { ReportComp, ReportComps } from "@/lib/report-comps";

interface ReadOnlyAnalysisViewProps {
  values: InvestmentFormValues;
  result: AnalysisResult;
  /** Owner's stored sale/rent comps (when a saved deal was shared). Backs the
   *  rent/value with real comparables; null hides the section. */
  comps?: ReportComps | null;
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
          !positive && !negative && "text-foreground"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

const money0 = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

function CompRow({ c }: { c: ReportComp }) {
  const facts = [
    c.bedrooms != null ? `${c.bedrooms} bd` : null,
    c.bathrooms != null ? `${c.bathrooms} ba` : null,
    c.squareFootage != null ? `${c.squareFootage.toLocaleString("en-US")} sqft` : null,
    c.distanceMiles != null ? `${c.distanceMiles.toFixed(1)} mi` : null,
  ].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">{c.address || "Nearby comp"}</p>
        {facts ? <p className="truncate text-[11px] text-muted-foreground">{facts}</p> : null}
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{money0(c.price)}</span>
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
    r && (r.low != null || r.high != null) ? `${money0(r.low)} – ${money0(r.high)}` : null;
  const valueRange = range(comps.valueRange);
  const rentRange = range(comps.rentRange);

  return (
    <section aria-label="Market comps" className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Backed by market comps</h2>
        <p className="text-[11px] text-muted-foreground">Nearby sales &amp; rentals via RentCast — reference only.</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. value</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{money0(comps.valueEstimate)}</p>
            {valueRange ? <p className="text-[11px] text-muted-foreground">{valueRange}</p> : null}
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. rent</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {comps.rentEstimate == null ? "—" : `${money0(comps.rentEstimate)}/mo`}
            </p>
            {rentRange ? <p className="text-[11px] text-muted-foreground">{rentRange}</p> : null}
          </div>
        </div>
        {sale.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Comparable sales</p>
            <ul className="divide-y divide-border/70">{sale.map((c, i) => <CompRow key={`s-${i}`} c={c} />)}</ul>
          </div>
        ) : null}
        {rent.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Comparable rentals</p>
            <ul className="divide-y divide-border/70">{rent.map((c, i) => <CompRow key={`r-${i}`} c={c} />)}</ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ReadOnlyAnalysisView({ values, result, comps }: ReadOnlyAnalysisViewProps) {
  const router = useRouter();
  // "Make this mine": hand the FULL deal to the calculator via its autosave
  // draft (restored on mount via normalizeInvestmentFormSnapshot), so the
  // highest-intent viewer lands on a populated analysis instead of a blank
  // homepage. Key must match CALC_FORM_DRAFT_KEY in investcalc-page.tsx.
  const makeThisMine = () => {
    try {
      window.localStorage.setItem("truecap_calc_form_draft_v1", JSON.stringify(values));
    } catch {
      /* storage unavailable — fall through to a clean calculator */
    }
    router.push("/?utm_source=shared_deal&utm_medium=clone");
  };
  return (
    <div className="space-y-5">
      {/* Headline metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <MetricTile
          label="Monthly Cash Flow"
          value={fmtCash(result.netCashFlow)}
          positive={result.netCashFlow >= 0}
          negative={result.netCashFlow < 0}
        />
        <MetricTile
          label="CoC Return"
          value={fmtPct(result.cocReturn)}
          positive={result.cocReturn >= 0}
          negative={result.cocReturn < 0}
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
              ? "Bankable (≥1.25)"
              : result.dscr >= 1.0
              ? "Tight (≥1.0)"
              : "Underwater"
          }
          positive={result.monthlyPayment > 0 && result.dscr >= 1.25}
          negative={result.monthlyPayment > 0 && result.dscr < 1.25}
        />
        <MetricTile
          label="Est. Tax Savings"
          value={fmtCash(result.taxSavingsMonthly)}
          sub="/month"
        />
        <MetricTile
          label="After-Tax CF"
          value={fmtCash(result.afterTaxCF)}
          sub="/month"
        />
      </div>

      {/* Primary conversion action for a high-intent viewer: clone the deal
          into the calculator (full inputs preloaded) instead of sending them
          to a blank homepage. */}
      <button
        type="button"
        onClick={makeThisMine}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Make this deal mine — open it in the calculator →
      </button>

      {comps ? <SharedDealComps comps={comps} /> : null}

      <MaxOfferCard values={values} />
      <SensitivityGrid values={values} />

      {/* Strategies section - embedded inline rather than in a tab so the
          read-only viewer doesn't have hidden content. */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Strategy calculators
          </h2>
        </div>
        <StrategiesPanel values={values} result={result} />
      </div>

      {/* Viral loop: this public share page is seen by partners, lenders,
          and other investors. Convert them into TrueCap users. */}
      <Link
        href="/?utm_source=shared_deal&utm_medium=share_link"
        className="block rounded-2xl bg-primary p-6 sm:p-8 text-center text-primary-foreground no-underline transition-opacity hover:opacity-90"
      >
        <p className="text-lg sm:text-xl font-extrabold">Analyzed with TrueCap</p>
        <p className="mt-1 text-sm sm:text-base opacity-90">
          Run your own rental deal free. Cap rate, cash flow, and DSCR from
          just an address in 60 seconds.
        </p>
        <span className="mt-4 inline-block rounded-xl bg-primary-foreground px-4 py-2.5 text-sm font-bold text-primary">
          Try TrueCap free →
        </span>
      </Link>

      {/* Advice guardrail - this page is shared to lenders/partners/clients and
          shows verdict + recommendation language, but has no SiteFooter. */}
      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        This shared analysis is an automated estimate for screening only, not an
        appraisal, and not financial, tax, or investment advice. Figures depend on
        assumptions that may be out of date; verify independently before making any
        decision.
      </p>
    </div>
  );
}
