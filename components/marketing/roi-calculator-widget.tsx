"use client";

/**
 * Interactive ROI calculator for /pricing.
 *
 * Defangs the universal SaaS objection — "is it worth $X/mo?" — by
 * turning it into the visitor's own math. They input their deal flow
 * and hourly rate; the widget shows time saved per month, dollar
 * value of that time at their rate, and how quickly Pro pays for
 * itself.
 *
 * Key honesty constraints:
 *   - Conservative assumption: 90 minutes saved per deal vs manual
 *     spreadsheet underwriting. Defensible — a full underwrite from
 *     scratch (cap rate, CoC, DSCR, projection, tax math) takes 1-2+
 *     hours; TrueCap collapses it to 1-2 minutes.
 *   - We don't claim "value beyond time saved" (avoided bad deals,
 *     better negotiating position, lender-ready PDFs) — those are
 *     real but unquantifiable in a generic calculator.
 *   - Pro monthly price is hardcoded to $29 here as a placeholder;
 *     wire the real Stripe-fetched price from /pricing in a follow-up.
 */

import { useMemo, useState } from "react";
import { Clock, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

const fmtHours = (n: number) => {
  const rounded = Math.round(n * 10) / 10;
  return rounded === 1 ? "1 hour" : `${rounded} hours`;
};

/**
 * Conservative defaults: 5 deals/mo for an active investor, $75/hr
 * professional time-value. Either input can be edited.
 */
const DEFAULT_DEALS_PER_MONTH = "5";
const DEFAULT_HOURLY_RATE = "75";
/** Minutes saved per deal vs manual spreadsheet underwriting. */
const MINUTES_SAVED_PER_DEAL = 90;
/** Placeholder Pro monthly price for the breakeven math. */
const PRO_MONTHLY_PRICE = 29;

type Props = {
  /**
   * Pro monthly price loaded server-side from Stripe. Falls back to
   * the hardcoded placeholder if undefined (Stripe key missing in dev,
   * or Stripe API hiccup). Always passed in dollars, never cents.
   */
  proMonthlyPrice?: number;
};

export function RoiCalculatorWidget({ proMonthlyPrice }: Props) {
  // Coalesce: prefer the real Stripe price, fall back to the hardcoded
  // placeholder so the widget never displays "$0" or NaN math when the
  // Stripe load returned null for any reason.
  const effectivePrice = proMonthlyPrice && proMonthlyPrice > 0 ? proMonthlyPrice : PRO_MONTHLY_PRICE;
  const [dealsInput, setDealsInput] = useState(DEFAULT_DEALS_PER_MONTH);
  const [rateInput, setRateInput] = useState(DEFAULT_HOURLY_RATE);

  const result = useMemo(() => {
    const deals = num(dealsInput);
    const rate = num(rateInput);
    const hoursSaved = (deals * MINUTES_SAVED_PER_DEAL) / 60;
    const dollarValue = hoursSaved * rate;
    const breakevenDeals = dollarValue > 0 ? effectivePrice / (rate * (MINUTES_SAVED_PER_DEAL / 60)) : Infinity;
    const roiMultiplier = effectivePrice > 0 ? dollarValue / effectivePrice : 0;
    return { deals, rate, hoursSaved, dollarValue, breakevenDeals, roiMultiplier };
  }, [dealsInput, rateInput, effectivePrice]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold uppercase tracking-widest text-muted-foreground sm:text-sm">
          What you save with TrueCap Pro
        </h3>
        <span className="hidden rounded-full bg-[var(--brand-green-light)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] sm:inline-flex">
          Your numbers
        </span>
      </div>

      {/* Inputs — stacked on mobile, side-by-side on sm+ */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            Deals you analyze per month
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={dealsInput}
            onChange={(e) => setDealsInput(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Deals analyzed per month"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            Your hourly time value
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="block h-11 w-full rounded-xl border border-border bg-background pl-7 pr-3 text-base tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Your hourly time value in dollars"
            />
          </div>
        </label>
      </div>

      {/* Results — 3-up on sm+, stacked on mobile */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <ResultTile
          icon={Clock}
          label="Time saved per month"
          value={fmtHours(result.hoursSaved)}
          tone="primary"
        />
        <ResultTile
          icon={DollarSign}
          label="Value at your rate"
          value={fmtMoney(result.dollarValue)}
          tone="success"
        />
        <ResultTile
          icon={TrendingUp}
          label="ROI vs Pro"
          value={result.roiMultiplier >= 1 ? `${result.roiMultiplier.toFixed(1)}×` : "—"}
          tone={result.roiMultiplier >= 5 ? "success" : "primary"}
        />
      </div>

      {/* Verdict line — only renders meaningfully when inputs are non-zero */}
      {result.deals > 0 && result.rate > 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-4 text-sm text-foreground">
          {result.dollarValue >= effectivePrice ? (
            <p className="leading-relaxed">
              At {result.deals} {result.deals === 1 ? "deal" : "deals"} per month, TrueCap Pro pays for
              itself <strong>after {result.breakevenDeals < 1 ? "less than 1" : Math.ceil(result.breakevenDeals)} {Math.ceil(result.breakevenDeals) === 1 ? "deal" : "deals"}</strong>.
              The rest of the month is pure return.
            </p>
          ) : (
            <p className="leading-relaxed">
              Pro costs ${effectivePrice}/mo. At your inputs that&apos;s break-even territory —
              the bigger win for low-volume investors is avoiding a single bad deal, which TrueCap&apos;s
              red-flag detection helps with even before time savings.
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
        Assumes <strong>90 minutes saved per deal</strong> vs. building the
        same analysis manually in a spreadsheet (cap rate, CoC, DSCR,
        10-yr projection, tax math, exit scenarios). Conservative — most
        investors save more. Pro price shown is the monthly tier; annual
        works out to even better ROI.
      </p>
    </div>
  );
}

function ResultTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success";
}) {
  const valueColor = tone === "success" ? "text-[var(--metric-positive)]" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-4 shrink-0", valueColor)} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className={cn("mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl", valueColor)}>
        {value}
      </div>
    </div>
  );
}
