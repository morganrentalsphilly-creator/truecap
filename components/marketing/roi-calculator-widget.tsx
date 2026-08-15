"use client";

/**
 * Interactive ROI calculator for /pricing.
 *
 * Answers "is it worth $X/mo?" with prospect-controlled inputs. They enter
 * deal flow, hourly time value, and minutes saved versus their current
 * workflow; the widget estimates monthly time value and price breakeven.
 *
 * Key honesty constraints:
 *   - Time saved is editable; the UI does not present a universal saving as
 *     fact.
 *   - No speculative value is assigned to avoided losses, negotiated price,
 *     financing, or investment returns.
 *   - The live Stripe price is preferred, with a dev-safe fallback.
 */

import { useMemo, useState } from "react";
import { Clock, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateOfferValueEstimate } from "@/lib/offer-value-estimate";

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
/** Editable starting point, not a promised saving. */
const DEFAULT_MINUTES_SAVED_PER_DEAL = "60";
/** Placeholder Pro monthly price for the breakeven math. */
const PRO_MONTHLY_PRICE = 29;

/**
 * Persona presets — a starting point for the two editable inputs (deal
 * volume + time value), not separate math. Numbers are deliberately
 * conservative and editable: investors run a handful of deals a month;
 * agents underwrite more listings on behalf of clients but value their
 * time a bit lower; flippers run fewer, higher-stakes deals.
 */
const PRESETS = [
  { id: "investor", label: "Investor", deals: "5", rate: "75" },
  { id: "agent", label: "Agent", deals: "12", rate: "60" },
  { id: "flipper", label: "Flipper", deals: "4", rate: "90" },
] as const;

type Props = {
  /**
   * Pro monthly price loaded server-side from Stripe. Falls back to
   * the hardcoded placeholder if undefined (Stripe key missing in dev,
   * or Stripe API hiccup). Always passed in dollars, never cents.
   */
  proMonthlyPrice?: number;
  /** Current configured one-time underwrite label for the low-volume verdict. */
  singleDealPriceLabel?: string;
};

export function RoiCalculatorWidget({ proMonthlyPrice, singleDealPriceLabel = "$5" }: Props) {
  // Coalesce: prefer the real Stripe price, fall back to the hardcoded
  // placeholder so the widget never displays "$0" or NaN math when the
  // Stripe load returned null for any reason.
  const effectivePrice = proMonthlyPrice && proMonthlyPrice > 0 ? proMonthlyPrice : PRO_MONTHLY_PRICE;
  const [dealsInput, setDealsInput] = useState(DEFAULT_DEALS_PER_MONTH);
  const [rateInput, setRateInput] = useState(DEFAULT_HOURLY_RATE);
  const [minutesInput, setMinutesInput] = useState(DEFAULT_MINUTES_SAVED_PER_DEAL);

  const result = useMemo(() => {
    const deals = num(dealsInput);
    const rate = num(rateInput);
    const minutesSavedPerDeal = num(minutesInput);
    const estimate = calculateOfferValueEstimate({
      dealsPerMonth: deals,
      hourlyRate: rate,
      minutesSavedPerDeal,
      monthlyPrice: effectivePrice,
    });
    return { deals, rate, minutesSavedPerDeal, ...estimate };
  }, [dealsInput, rateInput, minutesInput, effectivePrice]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold uppercase tracking-widest text-muted-foreground sm:text-sm">
          Estimate the time value of TrueCap Pro
        </h3>
        <span className="hidden rounded-full bg-[var(--brand-green-light)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] sm:inline-flex">
          Your numbers
        </span>
      </div>

      {/* Persona presets — one tap to seed the two inputs below, then
          edit freely. Highlighted when the inputs match a preset. */}
      <div className="mt-4">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Start from a preset
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="ROI presets">
          {PRESETS.map((preset) => {
            const active = preset.deals === dealsInput && preset.rate === rateInput;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDealsInput(preset.deals);
                  setRateInput(preset.rate);
                }}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs — stacked on mobile, three-up on sm+ */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            Minutes saved per deal
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
            className="block h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Estimated minutes saved per deal"
          />
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
          value={fmtMoney(result.timeValue)}
          tone="success"
        />
        <ResultTile
          icon={TrendingUp}
          label="ROI vs Pro"
          value={result.valueMultiple >= 1 ? `${result.valueMultiple.toFixed(1)}×` : "—"}
          tone={result.valueMultiple >= 5 ? "success" : "primary"}
        />
      </div>

      {/* Verdict line — only renders meaningfully when inputs are non-zero */}
      {result.deals > 0 && result.rate > 0 && result.minutesSavedPerDeal > 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-4 text-sm text-foreground">
          {result.timeValue >= effectivePrice ? (
            <p className="leading-relaxed">
              With your inputs, the estimated time value covers Pro&apos;s monthly price after{" "}
              <strong>{result.breakevenDeals < 1 ? "less than 1" : Math.ceil(result.breakevenDeals)} {Math.ceil(result.breakevenDeals) === 1 ? "deal" : "deals"}</strong>.
            </p>
          ) : (
            <p className="leading-relaxed">
              At your inputs, Free or a {singleDealPriceLabel} Single-Deal Underwrite may be the better fit today.
              Move to Pro when Max Offer, repeat underwriting, comparison, and saved workflows become valuable.
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
        Illustrative estimate based only on the inputs above. Change the time
        saving to match your current workflow. It does not estimate investment
        returns, negotiated savings, or avoided losses. Annual billing may
        lower the effective monthly price.
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
