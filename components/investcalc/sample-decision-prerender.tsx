/**
 * The sample's answer in the HTML of /analyze (audit A2, benchmarks P14 and
 * P4). "See the sample deal" used to open on seconds of an empty form (2 to
 * 5.5 s on live phones) while 59 scripts and a server action produced a
 * decision that is public and fixed. This card is that decision, set from
 * the engine (calculateSampleDealOutcome) at build time.
 *
 * SERVER COMPONENT, hidden by default. A head script (lib/sample-prerender.ts)
 * sets data-sample on <html> before first paint when the URL asks for the
 * sample, and app/globals.css then shows this card in place of the analyzer.
 * When the analyzer's own sample result mounts (#decision-summary-title is in
 * the DOM), the same rule swaps them in one paint. The markup mirrors the
 * live card's first screen (components/investcalc/focused-decision-summary.tsx,
 * analysis-dashboard.tsx's sample strip, inside InvestCalcPage's main), so the
 * swap moves nothing; the live card skips its entrance over it. The what-if
 * track is drawn at rest; the actions are inert until the live card arrives.
 * Only the live card carries #decision-summary-title.
 */

import Link from "next/link";
import { ChevronDown, CircleHelp, CopyPlus, Edit3, Save, SlidersHorizontal, X } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { buttonVariants } from "@/components/ui/button";
import {
  METRIC_TONE_TEXT_CLASS,
  cashFlowTone,
  formatDscr,
} from "@/lib/financial-presentation";
import { describeMaoTarget } from "@/lib/mao-targets";
import { meetsMaoTarget } from "@/lib/mao-target-evaluation";
import { buildOfferCeilingPresentation } from "@/lib/offer-ceiling";
import {
  PRICE_TRACK_LABEL_CLASS as LABEL,
  priceTrackDomain,
  trackLabelLeft,
  trackLabelsAnchored,
  trackLabelsFitNarrow,
} from "@/lib/price-track-domain";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { cn } from "@/lib/utils";

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** The live card's action classes (focused-decision-summary.tsx), at rest. */
const WRAPPING_ACTION =
  "h-auto min-h-11 w-full gap-2 whitespace-normal rounded-md py-2 text-center leading-tight sm:h-11 sm:w-auto sm:whitespace-nowrap sm:py-0";
const GLOSSARY_LABEL = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1";

function TargetFit({ meets, target }: { meets: boolean; target: string }) {
  return (
    <p
      className={cn(
        "mt-1 inline-flex items-center gap-1.5 text-xs font-medium",
        meets ? "text-positive" : "text-caution-text",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {meets ? "Meets" : "Misses"} {target}
    </p>
  );
}

export function SampleDecisionPrerender() {
  const { analysis, maxOffer } = calculateSampleDealOutcome();
  if (!maxOffer) return null;
  const fixture = SAMPLE_DEAL_FIXTURE;
  const values = fixture.values;
  const asking = Number(values.purchasePrice);
  const ceiling = maxOffer.maxPrice;
  const presentation = buildOfferCeilingPresentation({
    values,
    result: maxOffer,
    source: "selected-targets",
  });
  const target = fixture.maoTarget;
  const meets = meetsMaoTarget(analysis, target, values);
  const gap = asking - ceiling;
  const { pct } = priceTrackDomain(asking, ceiling);
  // The live track's dimension labels (result-price-scrubber.tsx), through
  // the same helpers and classes: each on its own tick when the two prices
  // are far enough apart, the gap under the dashed segment from 640px to
  // 1024px, where the readout beside the ceiling takes it over.
  const ceilingText = `Ceiling ${money(ceiling)}`;
  const askingText = `Asking ${money(asking)}`;
  const anchored = trackLabelsAnchored(pct(asking), pct(ceiling));
  const narrow = anchored && !trackLabelsFitNarrow(ceilingText.length, askingText.length);
  const labelClass = (tone: string) =>
    anchored ? cn(LABEL.anchoredLabel, narrow && LABEL.narrowLabel, tone) : tone;
  const labelStyle = (at: number, text: string) =>
    anchored ? { left: trackLabelLeft(pct(at), text.length) } : undefined;
  const ceilingLabel = (
    <span className={labelClass("text-highlight-text")} style={labelStyle(ceiling, ceilingText)}>
      {ceilingText}
    </span>
  );
  const askingLabel = (
    <span className={labelClass("text-muted-foreground")} style={labelStyle(asking, askingText)}>
      {askingText}
    </span>
  );
  const gapUnderLine = anchored && gap > 0;
  // Radix places its 20px thumb inside the track's bounds; the same offset
  // keeps the static diamond exactly where the live one lands.
  const thumbLeft = (p: number) => `calc(${p}% + ${10 - p / 5}px)`;
  const dscrApplies = analysis.monthlyPayment > 0;

  return (
    <div data-sample-prerender="" className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mt-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border py-2">
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                Sample deal: the full Pro report is unlocked.
              </p>
              <Link
                href="/pricing"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 shrink-0 rounded-md px-3 text-sm")}
              >
                Get Pro
              </Link>
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
                <X className="size-4" />
              </span>
            </div>
            <section className="space-y-3">
              <div>
                <section
                  aria-labelledby="sample-decision-prerender-title"
                  className="rounded-lg border border-border bg-card p-5 shadow-md max-[250px]:p-3 sm:p-6"
                >
                  <div className="space-y-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-sm font-semibold leading-snug text-muted-foreground">
                          {fixture.display.shortAddress}
                        </p>
                      </div>
                      <h2
                        id="sample-decision-prerender-title"
                        className="mt-1 font-display text-balance text-2xl text-foreground sm:text-3xl"
                      >
                        {meets ? "Meets sample targets at asking" : "Doesn't meet sample targets at asking"}
                      </h2>
                    </div>

                    <div className="border-t-2 border-foreground pt-3">
                      {/* The live card's ceiling row: from 1024px one grid,
                          the labels on one baseline and the figure, the gap
                          and asking on the next. No readout, and the single
                          column, when asking is at or below the ceiling. */}
                      <div
                        className={
                          gap > 0
                            ? "lg:grid lg:grid-cols-[minmax(max-content,5fr)_minmax(0,7fr)] lg:items-baseline lg:gap-x-10"
                            : undefined
                        }
                      >
                        <div className={gap > 0 ? "min-w-0 lg:contents" : "min-w-0"}>
                          <p className="flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground lg:col-start-1 lg:row-start-1">
                            <span>Offer Ceiling</span>
                            {gap > 0 ? (
                              <span className="tc-meta text-muted-foreground sm:hidden">
                                Gap {money(gap)}
                              </span>
                            ) : null}
                          </p>
                          <p className="font-display text-key-sm text-foreground [overflow-wrap:anywhere] max-[250px]:text-3xl sm:mt-1 lg:text-key lg:col-start-1 lg:row-start-2">
                            {/* The live card's figure component, so the box is the same. */}
                            <AnimatedNumber value={ceiling} kind="usd" className="highlight-stroke" />
                          </p>
                        </div>
                        {gap > 0 ? (
                          <div className="hidden lg:contents" data-ceiling-readout="">
                            <p className="text-sm font-semibold text-foreground lg:col-start-2 lg:row-start-1">Gap</p>
                            <p className="flex min-w-0 flex-wrap items-baseline gap-x-4 lg:col-start-2 lg:row-start-2">
                              <span className="font-display font-figure text-key-sm text-foreground">{money(gap)}</span>
                              <span className="text-sm text-muted-foreground">
                                Asking <span className="font-figure font-semibold text-foreground">{money(asking)}</span>
                              </span>
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="sm:mt-2">
                        <div className={cn("relative mx-1 pb-0", gapUnderLine && LABEL.gapRoomUntilLg)}>
                          <div
                            className={anchored ? cn(LABEL.anchoredRow, narrow && LABEL.narrowRow) : LABEL.edgeRow}
                            aria-hidden
                          >
                            {ceiling <= asking ? (
                              <>
                                {ceilingLabel}
                                {!anchored && gap > 0 ? (
                                  <span className={LABEL.edgeGapUntilLg}>Gap {money(gap)}</span>
                                ) : null}
                                {askingLabel}
                              </>
                            ) : (
                              <>
                                {askingLabel}
                                {ceilingLabel}
                              </>
                            )}
                          </div>
                          <span aria-hidden className="relative mt-[-6px] mb-[-14px] flex h-11 w-full items-center">
                            <span className="relative h-[2px] w-full grow bg-foreground">
                              <span
                                data-meets-fill=""
                                className="absolute top-1/2 left-0 h-2 origin-left -translate-y-1/2 bg-highlight/85"
                                style={{ width: `${pct(ceiling)}%` }}
                              />
                              <span
                                className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-highlight-text"
                                style={{ left: `${pct(ceiling)}%` }}
                              />
                              <span
                                className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-foreground"
                                style={{ left: `${pct(asking)}%` }}
                              />
                              <span className="absolute top-1/2 left-0 h-3 w-px -translate-y-1/2 bg-foreground" />
                              <span className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-foreground" />
                              {gap > 0 ? (
                                <span
                                  className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-highlight-text"
                                  style={{ left: `${pct(ceiling)}%`, width: `${pct(asking) - pct(ceiling)}%` }}
                                />
                              ) : null}
                            </span>
                            <span className="absolute -translate-x-1/2" style={{ left: thumbLeft(pct(asking)) }}>
                              <span className="block size-5 rotate-45 rounded-none border-2 border-primary bg-card shadow-xs" />
                            </span>
                          </span>
                          {gapUnderLine ? (
                            <span
                              aria-hidden
                              className={LABEL.gapUntilLg}
                              style={{ left: `${(pct(ceiling) + pct(asking)) / 2}%` }}
                            >
                              Gap {money(gap)}
                            </span>
                          ) : null}
                          <p className="sr-only">
                            {gap > 0
                              ? `Asking ${money(asking)} is ${money(gap)} above the Offer Ceiling ${money(ceiling)}.`
                              : `Asking ${money(asking)} is within the Offer Ceiling ${money(ceiling)}.`}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground sm:text-sm">
                        Targets: {describeMaoTarget(target)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        The highest price that still meets the criteria shown.
                      </p>
                      <details className="group tc-accordion mt-2 border-t border-border pt-1">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-xs font-semibold text-primary [&::-webkit-details-marker]:hidden">
                          How this ceiling was calculated
                          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="space-y-1.5 pb-1 text-2xs leading-relaxed text-muted-foreground">
                          <p>Under sample targets · Exact ceiling</p>
                          <p>
                            Underwriting model v{analysis.methodologyVersion ?? "current"} · 10-year projection{" "}
                            {analysis.tenYearProjectionVersion
                              ? `method v${analysis.tenYearProjectionVersion}`
                              : "method not recorded"}
                          </p>
                          <p>
                            Binding:{" "}
                            {presentation.bindingConstraints.map((item) => item.criterion).join(" + ") ||
                              "No constraint resolved"}
                          </p>
                          {presentation.nextConstraint ? (
                            <p>Next constraint: {presentation.nextConstraint.criterion}</p>
                          ) : null}
                          <p>
                            Screening range:{" "}
                            {presentation.range.lower == null ? "no feasible downside price" : money(presentation.range.lower)}
                            {" – "}
                            {presentation.range.upper == null ? "no feasible upside price" : money(presentation.range.upper)} if{" "}
                            {presentation.range.label}.
                          </p>
                          <p>
                            When price changes, percentage-based down payment, closing costs, tax, insurance, and debt
                            scale with it. Rent and dollar-based tax, insurance, HOA, utilities, and repairs stay fixed.
                          </p>
                        </div>
                      </details>
                    </div>

                    <div
                      className="grid grid-cols-1 gap-x-6 gap-y-3 min-[280px]:grid-cols-2"
                      role="group"
                      aria-label="First-year investment snapshot"
                    >
                      <div className="border-t border-border pt-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          <span className={GLOSSARY_LABEL}>
                            Cash flow after reserves
                            <CircleHelp aria-hidden className="h-3 w-3 text-foreground" />
                          </span>
                        </p>
                        <p
                          className={cn(
                            "mt-1 font-display text-xl sm:text-2xl",
                            METRIC_TONE_TEXT_CLASS[cashFlowTone(analysis.netCashFlow)] ?? "text-foreground",
                          )}
                        >
                          <AnimatedNumber value={analysis.netCashFlow} kind="usdPerMonth" />
                        </p>
                        {typeof target.monthlyCashFlow === "number" ? (
                          <TargetFit
                            meets={analysis.netCashFlow >= target.monthlyCashFlow}
                            target={`${money(target.monthlyCashFlow)}/mo target`}
                          />
                        ) : null}
                      </div>
                      <div className="border-t border-border pt-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          <span className={GLOSSARY_LABEL}>
                            Model DSCR
                            <CircleHelp aria-hidden className="h-3 w-3 text-foreground" />
                          </span>
                        </p>
                        <p className="mt-1 font-display text-xl text-foreground sm:text-2xl">
                          {dscrApplies ? <AnimatedNumber value={analysis.dscr} kind="ratio" /> : formatDscr(analysis.dscr, false)}
                        </p>
                        {dscrApplies && typeof target.dscr === "number" ? (
                          <TargetFit meets={analysis.dscr >= target.dscr} target={`${target.dscr.toFixed(2)} target`} />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* The live card's actions, at rest: inert until it arrives. */}
                  <div
                    inert
                    className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 min-[320px]:grid-cols-2 sm:flex sm:flex-wrap"
                  >
                    <span className={cn(buttonVariants(), WRAPPING_ACTION)}>
                      <SlidersHorizontal className="size-4" aria-hidden />
                      Tune targets
                      <ChevronDown className="size-4" aria-hidden />
                    </span>
                    <span className={cn(buttonVariants({ variant: "outline" }), WRAPPING_ACTION)}>
                      <Edit3 className="size-4" aria-hidden />
                      Edit assumptions
                    </span>
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-11 w-full gap-2 rounded-md max-[250px]:h-auto max-[250px]:whitespace-normal max-[250px]:py-2 max-[250px]:text-center max-[250px]:leading-tight sm:w-auto",
                      )}
                    >
                      <Save className="size-4" aria-hidden />
                      Save
                    </span>
                    <span className={cn(buttonVariants({ variant: "outline" }), WRAPPING_ACTION)}>
                      <CopyPlus className="size-4 max-sm:hidden" aria-hidden />
                      Next deal · keep assumptions
                    </span>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
