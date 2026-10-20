"use client";

/**
 * "Make it yours" (OVERHAUL.md §6.4): the visitor types a name and picks a
 * brand color, and a mock share page and a mock PDF cover recolor live, with
 * the text color on the brand color chosen for contrast. Client-only and
 * private: nothing is stored or sent, the inputs carry ph-no-capture (and
 * session recording is off site-wide), and no analytics event reads the
 * typed values. The mocks are drawn in CSS from the tokens; they are not the
 * real share page, and the section says so.
 */

import { useId, useState } from "react";
import { textOnBrand } from "@/lib/brand-contrast";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#1853c6";

export function CoBrandPreview({ className }: { className?: string }) {
  const id = useId();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const shown = name.trim() || "Your name or brokerage";
  const onBrand = textOnBrand(color);
  const initials = shown
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

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
        {/* The mock share page. */}
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          aria-label="A mock of the share page, co-branded"
          role="img"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--duration-base)]"
            style={{ backgroundColor: color, color: onBrand }}
          >
            <span className="shrink-0 font-mono text-xs font-bold tracking-wide" aria-hidden>
              {initials || "AB"}
            </span>
            <span className="truncate text-sm font-semibold">Shared by {shown}</span>
          </div>
          <div className="space-y-2 p-4">
            <div className="h-3 w-2/3 bg-band" />
            <div className="h-3 w-1/2 bg-band" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-10 bg-band" />
              <div className="h-10 bg-band" />
              <div className="h-10 bg-band" />
            </div>
            <div className="mt-3 h-9 w-32 rounded-md" style={{ backgroundColor: color }} aria-hidden />
          </div>
        </div>
        {/* The mock PDF cover. */}
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          aria-label="A mock of the PDF cover, co-branded"
          role="img"
        >
          <div className="h-2 transition-colors duration-[var(--duration-base)]" style={{ backgroundColor: color }} />
          <div className="space-y-2 p-4">
            <div className="h-2.5 w-1/2 bg-band" />
            <div className="h-5 w-5/6 bg-band" />
            <div className="h-2.5 w-2/3 bg-band" />
            <div className="mt-6 border-t border-rule-soft pt-3 text-xs">
              <span className="text-muted-foreground">Prepared by</span>
              <span className="block truncate font-semibold" style={{ color }}>
                {shown}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
