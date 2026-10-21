"use client";

/**
 * The receipt flow's leaders (components/home/receipt-flow.tsx): three dashed
 * cobalt lines from the sources into the result, drawn once as the section
 * enters the viewport, on every engine, with a CSS keyframe on the mask's
 * stroke (globals.css `tc-leader-draw`). No animation library: a static
 * import of Motion here put its whole runtime (layout projection, presence)
 * into a shared chunk that every route then loaded, 82 KB on the wire
 * (polish pass, 2026-10-20).
 *
 * The drawn state is the default. The server renders the leaders complete
 * (no mask), so a page without JavaScript, a crawler and a reduced-motion
 * visitor all see the finished drawing; a section already on screen when the
 * island mounts keeps it too, so nothing in view ever disappears to redraw.
 * Only when the section is still below the fold does the island arm the
 * draw: each dashed leader is revealed through an SVG mask whose stroke the
 * keyframe draws from hidden to full when the leaders scroll into view, so
 * the dash pattern survives the drawing and the leader rests dashed. While a
 * source's popover is open its leader goes solid and the figure it feeds
 * brightens (globals.css, by the attributes below).
 */

import { useEffect, useId, useRef, useState } from "react";

export type ReceiptLeaderKey = "rent" | "rate" | "tax";

const LEADERS: { key: ReceiptLeaderKey; d: string }[] = [
  { key: "rent", d: "M0 40 C 60 40, 60 120, 120 120" },
  { key: "rate", d: "M0 120 H120" },
  { key: "tax", d: "M0 200 C 60 200, 60 120, 120 120" },
];

export function ReceiptLeaders() {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const box = svg.getBoundingClientRect();
    // Below the fold (or scrolled past): draw on entry. Otherwise it is
    // already in view, complete, and stays that way.
    const inView = box.top < window.innerHeight && box.bottom > 0;
    if (inView || typeof IntersectionObserver === "undefined") return;
    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 120 240"
      preserveAspectRatio="none"
      className="hidden h-full w-full lg:block"
      aria-hidden
      data-receipt-leaders={armed ? (playing ? "play" : "armed") : "drawn"}
    >
      {armed ? (
        <defs>
          {LEADERS.map((leader, index) => (
            <mask
              key={leader.key}
              id={`${id}-${leader.key}`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="120"
              height="240"
            >
              <path
                className="tc-leader-mask"
                d={leader.d}
                pathLength={1}
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ "--tc-leader-index": index } as React.CSSProperties}
              />
            </mask>
          ))}
        </defs>
      ) : null}
      {LEADERS.map((leader) => (
        <path
          key={leader.key}
          data-receipt-leader={leader.key}
          className="tc-leader fill-none stroke-primary"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
          d={leader.d}
          pathLength="1"
          mask={armed ? `url(#${id}-${leader.key})` : undefined}
        />
      ))}
    </svg>
  );
}
