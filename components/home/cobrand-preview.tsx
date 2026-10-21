"use client";

/**
 * "Make it yours" (OVERHAUL.md §6.4): the visitor types a name and picks a
 * brand color, and a mock share page and a mock PDF cover recolor live, with
 * the text color on the brand color chosen for contrast. Client-only and
 * private: nothing is stored or sent, the inputs carry ph-no-capture (and
 * session recording is off site-wide), and no analytics event reads the
 * typed values.
 *
 * The mocks are composed from the real parts with the sample deal's own
 * figures, handed in by the server (lib/sample-deal-ledger.ts through
 * landing-sections.tsx): the share page's "Shared by" band, the memo's
 * verdict, the Offer Ceiling on the highlight stroke with its label as a tag
 * in the brand color, and the two target chips; the PDF cover's first lines
 * under its brand bar, and its "Prepared by" block. They are not the real
 * share page or PDF, and the section says so.
 */

import { useId, useState } from "react";
import { textOnBrand } from "@/lib/brand-contrast";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#1853c6";

/** The sample deal as the mocks print it; every figure is the engine's, formatted on the server. */
export type CoBrandSample = {
  /** The sample's customer-facing name. */
  title: string;
  /** The decision at asking, in the product's own words. */
  verdict: string;
  /** "$236,000" */
  offerCeiling: string;
  /** "Asking price is $29,000 above the ceiling." */
  gap: string;
  /** The Buy Box targets and their state at asking. */
  chips: { label: string; state: string; pass: boolean }[];
  /** The cover's meta line: type, price, year built. */
  coverMeta: string;
};

/**
 * Initials for the band: the first letters of the first two words when the
 * name is exactly two words ("Jane Doe" → JD); otherwise the first letter
 * alone, so "The Smith Group" reads T, not TS.
 */
export function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = (w: string) => w[0]?.toUpperCase() ?? "";
  return words.length === 2 ? `${first(words[0])}${first(words[1])}` : first(words[0]);
}

export function CoBrandPreview({ sample, className }: { sample: CoBrandSample; className?: string }) {
  const id = useId();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const shown = name.trim() || "Your name or brokerage";
  const onBrand = textOnBrand(color);
  const initials = brandInitials(shown);
  const brand = { backgroundColor: color, color: onBrand };

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10", className)}>
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()} data-cobrand-form="">
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-semibold">
            Your name or brokerage
          </label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="off"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type to see it on the page"
            className="ph-no-capture mt-1.5 h-12 w-full rounded-md border border-input bg-field px-4 text-base"
            data-ph-no-capture=""
          />
        </div>
        <div>
          <label htmlFor={`${id}-color`} className="text-sm font-semibold">
            Brand color
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              id={`${id}-color`}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="ph-no-capture size-11 cursor-pointer rounded-md border border-input bg-field p-1"
              data-ph-no-capture=""
            />
            <span className="font-mono text-sm text-muted-foreground" aria-live="polite">
              {color} · text on it {onBrand === "#ffffff" ? "white" : "graphite"}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Nothing you type here is saved or sent. Co-branding comes with Pro and Agent Pro.
        </p>
      </form>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* The mock share page: the band, then the memo's decision. */}
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          aria-label={`A mock of the share page, co-branded: ${sample.verdict}; Offer Ceiling ${sample.offerCeiling}`}
          role="img"
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]"
            style={brand}
          >
            <span className="shrink-0 font-mono text-xs font-medium" aria-hidden>
              {initials || "AB"}
            </span>
            <span className="truncate text-sm font-semibold">Shared by {shown}</span>
          </div>
          <div className="p-4">
            <p className="flex justify-between gap-3 border-b border-border pb-2 font-mono text-xs text-muted-foreground">
              <span>Decision memo</span>
              <span className="truncate">{sample.title}</span>
            </p>
            <p className="mt-3 font-display text-balance text-lg sm:text-xl">{sample.verdict}</p>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-foreground pt-2.5">
              <span
                className="rounded-sm px-1.5 py-0.5 text-sm font-semibold transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]"
                style={brand}
              >
                Offer Ceiling
              </span>
              <span className="highlight-stroke font-display font-figure text-key-sm">{sample.offerCeiling}</span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{sample.gap}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-rule-soft pt-2.5 text-xs font-semibold">
              {sample.chips.map((chip) => (
                <li
                  key={chip.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap",
                    chip.pass ? "text-positive" : "text-highlight-text",
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  <span className="font-figure">{chip.label}</span>
                  <span className="font-figure">· {chip.state}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* The mock PDF cover: the brand bar, the cover's first lines, the Prepared by block. */}
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          aria-label={`A mock of the PDF cover, co-branded: investment analysis, ${sample.title}, prepared by ${shown}`}
          role="img"
        >
          <div
            className="h-2 transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]"
            style={{ backgroundColor: color }}
          />
          <div className="p-4">
            {/* The cover prints this label in the brand color; the mock keeps
                it in ink, since a light brand color on the white card would
                not clear AA at this size. The bar above carries the color. */}
            <p className="text-xs font-semibold text-muted-foreground">Investment analysis</p>
            <p className="mt-2 font-display text-balance text-lg">{sample.title}</p>
            <p className="mt-1 font-figure text-xs text-muted-foreground">{sample.coverMeta}</p>
            <div className="mt-6 border-t border-rule-soft pt-3 text-xs">
              <span className="text-muted-foreground">Prepared by</span>
              <span className="block truncate font-semibold">{shown}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
