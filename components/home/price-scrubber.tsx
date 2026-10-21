"use client";

/**
 * "Drag the price" (OVERHAUL.md §6.1): the sample deal's schematic, a price
 * track and the readout, all reading from the engine's precomputed sweep. The
 * server renders this island at the Offer Ceiling, so the figures are in the
 * HTML and the page works without JavaScript; after hydration the handle
 * drags (pointer, touch, arrow keys), the figures roll through NumberFlow,
 * each target chip flips between "Meets" and "Misses by $X", and the verdict
 * follows. On first view the handle glides once from asking to the ceiling;
 * under reduced motion it simply rests at the ceiling. The slider announces
 * its value when a drag ends, never per tick.
 *
 * Order on the sheet: the schematic (its two out-flows move with the price
 * and their arrows weigh more above the ceiling), the price track with its
 * help line, then the caller's key figure (the Offer Ceiling on the highlight
 * stroke, so the answer sits inside the first screen), then the readout the
 * drag animates, then the source chips.
 *
 * The handle is a 20px diamond (the thumb element itself, rotated), so the
 * site's 3px focus ring draws as a diamond around it; the slider root is the
 * 44px-tall pointer target, since Radix takes the pointer on the root. On
 * press the diamond fills cobalt and grows; on release it settles back.
 *
 * No engine code here: the sweep is a list of points the server computed
 * with calculateAnalysis() in $1,000 steps (lib/sample-deal-sweep.ts).
 */

import * as SliderPrimitive from "@radix-ui/react-slider";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { SourcePopover, type SourceLabel } from "@/components/motion/source-popover";
import { Schematic } from "@/components/home/schematic";
import type { CompactSweepPoint } from "@/lib/sample-deal-sweep";
import { cn } from "@/lib/utils";

export type ScrubberSource = {
  label: string;
  value?: string;
  source: SourceLabel;
  basis: string;
  replaceWith?: string;
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function PriceScrubber({
  points,
  asking,
  ceiling,
  target,
  atAsking,
  inputs,
  sources,
  keyFigure,
}: {
  points: CompactSweepPoint[];
  asking: number;
  ceiling: number;
  target: { monthlyCashFlow: number | null; dscr: number | null };
  /** The engine's figures at asking, already formatted, for the comparison column. */
  atAsking: { cashFlow: string; dscr: string; coc: string; meets: boolean };
  inputs: { rent: string; rate: string; downPaymentPct: string; bedrooms: number };
  sources: ScrubberSource[];
  /** The sheet's one total, set between the price track and the readout (server-rendered by the caller). */
  keyFigure?: ReactNode;
}) {
  const id = useId();
  const low = points[0][0];
  const high = points[points.length - 1][0];
  const [price, setPrice] = useState(ceiling);
  const [announcement, setAnnouncement] = useState("");
  // Radix renders its thumb hidden until it has measured on the client, so a
  // static diamond stands at the ceiling in the HTML and steps aside once the
  // island has mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const interacted = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const point = useMemo(() => {
    let best = points[0];
    for (const p of points) if (Math.abs(p[0] - price) < Math.abs(best[0] - price)) best = p;
    return best;
  }, [points, price]);
  const [, cashFlow, dscr, coc, meetsFlag, mortgage, operating] = point;
  const meets = meetsFlag === 1;
  const cfTarget = target.monthlyCashFlow;
  const cfMeets = cfTarget == null || cashFlow >= cfTarget;
  const dscrMeets = target.dscr == null || dscr >= target.dscr;
  const isCeiling = point[0] === ceiling;
  const isAsking = point[0] === asking;
  const aboveCeiling = point[0] > ceiling;

  const valueText = (p: CompactSweepPoint) => {
    const miss = cfTarget != null && p[1] < cfTarget ? `misses the ${usd(cfTarget)} target by ${usd(cfTarget - p[1])}` : `meets the ${cfTarget != null ? usd(cfTarget) + " " : ""}target`;
    return `${usd(p[0])}: cash flow ${usd(p[1])} a month, ${miss}`;
  };

  // First view: glide from asking to the ceiling once, unless the visitor
  // prefers reduced motion or has already taken the handle.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let started = false;
    const run = () => {
      if (started || interacted.current) return;
      started = true;
      const from = asking;
      const to = ceiling;
      const duration = 1100;
      const t0 = performance.now();
      const tick = (now: number) => {
        if (interacted.current) return;
        const t = Math.min(1, (now - t0) / duration);
        const v = from + (to - from) * easeOut(t);
        setPrice(Math.round(v / 1000) * 1000);
        if (t < 1) frame = requestAnimationFrame(tick);
        else setPrice(to);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          // A beat after the figures paint, so the glide reads as the answer
          // arriving rather than the page loading.
          window.setTimeout(run, 500);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [asking, ceiling]);

  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  // A target's state, struck forward in its color: text with a dot, never a
  // box inside the sheet (every state is in the DOM; the active one shows).
  const chip = (ok: boolean, text: ReactNode) => (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1.5 text-xs font-semibold leading-none whitespace-nowrap",
        ok ? "text-positive" : "text-highlight-text",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {text}
    </span>
  );

  return (
    <div ref={rootRef} className="min-w-0" data-price-scrubber="">
      <Schematic
        rent={inputs.rent}
        rate={inputs.rate}
        downPaymentPct={inputs.downPaymentPct}
        bedrooms={inputs.bedrooms}
        // The out-flows are the sweep's own figures; an older payload without
        // them shows the flow with no figure rather than a typed number.
        mortgageLabel={mortgage != null ? <AnimatedNumber value={mortgage} kind="usdPerMonth" /> : null}
        operatingLabel={operating != null ? <AnimatedNumber value={operating} kind="usdPerMonth" /> : null}
        cashFlowLabel={
          <>
            <AnimatedNumber value={cashFlow} kind="usdPerMonth" /> at <AnimatedNumber value={point[0]} kind="usd" />
          </>
        }
        aboveCeiling={aboveCeiling}
      />

      {/* The price track: a dimension line with the meets-range highlighted. */}
      <div
        className="relative mx-2 mt-5 pt-6 pb-5"
        onPointerDownCapture={() => {
          interacted.current = true;
        }}
        onKeyDownCapture={() => {
          interacted.current = true;
        }}
      >
        <span
          className="absolute top-0 -translate-x-1/2 font-mono text-xs whitespace-nowrap text-highlight-text"
          style={{ left: `${pct(ceiling)}%` }}
          aria-hidden
        >
          <span className="hidden sm:inline">Offer Ceiling </span>
          <span className="sm:hidden">Ceiling </span>
          {usd(ceiling)}
          <span className="mx-auto mt-0.5 block h-2 w-px bg-current" />
        </span>
        <span
          className="absolute top-0 -translate-x-1/2 font-mono text-xs whitespace-nowrap text-muted-foreground"
          style={{ left: `${pct(asking)}%` }}
          aria-hidden
        >
          Asking {usd(asking)}
          <span className="mx-auto mt-0.5 block h-2 w-px bg-current" />
        </span>
        <SliderPrimitive.Root
          // 44px tall: Radix takes the pointer on the root, so the whole band
          // around the track is the drag target, whatever the thumb's size.
          className="relative flex h-11 w-full touch-none items-center select-none"
          min={low}
          max={high}
          step={1000}
          value={[price]}
          onValueChange={([v]) => {
            interacted.current = true;
            setPrice(v);
          }}
          onValueCommit={([v]) => {
            const p = points.find((pt) => pt[0] === v) ?? point;
            setAnnouncement(valueText(p));
          }}
        >
          <SliderPrimitive.Track className="relative h-[2px] w-full grow bg-foreground">
            {/* The range of prices that meets the Buy Box, in the highlight. */}
            <span
              aria-hidden
              className="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-highlight/85"
              style={{ width: `${pct(ceiling)}%` }}
            />
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
            <span aria-hidden className="absolute top-1/2 left-0 h-3 w-px -translate-y-1/2 bg-foreground" />
            <span aria-hidden className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-foreground" />
            {mounted ? null : (
              <span
                aria-hidden
                data-static-handle=""
                className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-primary bg-card shadow-xs"
                style={{ left: `${pct(ceiling)}%` }}
              />
            )}
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="Offer price"
            // Radix sets aria-valuenow from the thumb's collection index, which
            // is unknown on the server, so the attribute is missing until
            // hydration (and without JavaScript); the value is known here.
            aria-valuenow={point[0]}
            aria-valuetext={valueText(point)}
            aria-describedby={`${id}-help`}
            // The thumb IS the diamond: a 20px square turned 45°, so the
            // site's focus ring (globals.css, 3px cobalt at 2px) follows its
            // edges instead of circling it. Hover grows it a little; press
            // fills it cobalt and grows it more; release eases it back at the
            // fast duration (the settle). Touch has no hover, so after a tap
            // it settles to rest.
            className="block size-5 rotate-45 cursor-grab rounded-none border-2 border-primary bg-card shadow-xs transition-[scale,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:scale-110 active:scale-125 active:cursor-grabbing active:bg-primary motion-reduce:transition-none"
          />
        </SliderPrimitive.Root>
        <span className="absolute bottom-0 left-0 font-mono text-xs text-muted-foreground" aria-hidden>
          {usd(low)}
        </span>
        <span className="absolute right-0 bottom-0 font-mono text-xs text-muted-foreground" aria-hidden>
          {usd(high)}
        </span>
      </div>
      <p id={`${id}-help`} className="max-w-[62ch] text-sm text-muted-foreground">
        At <span className="font-figure font-semibold text-foreground"><AnimatedNumber value={point[0]} kind="usd" /></span>
        {isCeiling
          ? " · the highest price that still meets the Buy Box"
          : isAsking
            ? " · the asking price"
            : meets
              ? " · meets the Buy Box"
              : " · misses the Buy Box"}
        . Drag the handle or use the arrow keys.
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {/* The sheet's one total, before the readout: the answer is in the
          first screen (1440×900 and 1095×760), and the rows that the drag
          animates sit fully visible under it. */}
      {keyFigure}

      {/* The readout: the engine's figures at asking beside the figures at
          the handle's price, with each target's chip. A table, so the
          comparison reads in order without JavaScript and for a screen reader. */}
      <table className="mt-5 w-full border-collapse border-t border-border text-base">
        <caption className="sr-only">The sample deal at its asking price and at the price on the handle</caption>
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            <th scope="col" className="py-2 text-left font-semibold">
              <span className="sr-only">Line item</span>
            </th>
            <th scope="col" className="w-[6.5rem] py-2 pl-2 text-right font-semibold sm:w-32">
              At asking
            </th>
            <th scope="col" className="w-[6.5rem] py-2 pl-2 text-right font-semibold text-foreground sm:w-36">
              <span className="sr-only">At </span>
              <span aria-hidden>At </span>
              <AnimatedNumber value={point[0]} kind="usd" />
            </th>
          </tr>
        </thead>
        <tbody className="font-figure">
          <tr className="border-b border-rule-soft">
            <th scope="row" className="py-3 pr-2 text-left font-medium">
              Cash flow after reserves
              {cfTarget != null ? (
                <span className="block text-sm font-normal text-muted-foreground">Target ≥&nbsp;{usd(cfTarget)}/mo</span>
              ) : null}
            </th>
            <td className="py-3 pl-2 text-right align-top">{atAsking.cashFlow}</td>
            <td className="py-3 pl-2 text-right align-top">
              <AnimatedNumber value={cashFlow} kind="usdPerMonth" className="font-semibold" />
              {cfTarget != null ? (
                <span className="block">
                  {chip(cfMeets, cfMeets ? "Meets" : `Misses by ${usd(cfTarget - cashFlow)}`)}
                </span>
              ) : null}
            </td>
          </tr>
          <tr className="border-b border-rule-soft">
            <th scope="row" className="py-3 pr-2 text-left font-medium">
              DSCR
              {target.dscr != null ? (
                <span className="block text-sm font-normal text-muted-foreground">Target ≥&nbsp;{target.dscr}</span>
              ) : null}
            </th>
            <td className="py-3 pl-2 text-right align-top">{atAsking.dscr}</td>
            <td className="py-3 pl-2 text-right align-top">
              <AnimatedNumber value={dscr} kind="ratio" className="font-semibold" />
              {target.dscr != null ? <span className="block">{chip(dscrMeets, dscrMeets ? "Meets" : "Misses")}</span> : null}
            </td>
          </tr>
          <tr className="border-b border-rule-soft">
            <th scope="row" className="py-3 pr-2 text-left font-medium">
              Cash-on-cash
              <span className="block text-sm font-normal text-muted-foreground">Year 1</span>
            </th>
            <td className="py-3 pl-2 text-right align-top">{atAsking.coc}</td>
            <td className="py-3 pl-2 text-right align-top">
              <AnimatedNumber value={coc} kind="percent" className="font-semibold" />
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-3 pr-2 text-left font-medium">
              Meets the Buy Box
            </th>
            <td className={cn("py-3 pl-2 text-right font-semibold", atAsking.meets ? "text-positive" : "text-highlight-text")}>
              {atAsking.meets ? "Yes" : "No"}
            </td>
            <td className={cn("py-3 pl-2 text-right font-semibold", meets ? "text-positive" : "text-highlight-text")}>
              {meets ? "Yes" : "No"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Where each starting value comes from: a chip opens its source. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-rule-soft pt-3" aria-label="Where the starting values come from">
        {sources.map((s) => (
          <li key={s.label}>
            <SourcePopover source={s.source} basis={s.basis} replaceWith={s.replaceWith} className="min-h-10 rounded-none px-0 font-mono text-xs text-muted-foreground decoration-dotted hover:text-foreground">
              <span>
                {s.label}
                {s.value ? (
                  <>
                    {" "}
                    <b className="font-medium text-foreground">{s.value}</b>
                  </>
                ) : null}
                {" · "}
                {s.source}
              </span>
            </SourcePopover>
          </li>
        ))}
      </ul>
    </div>
  );
}
