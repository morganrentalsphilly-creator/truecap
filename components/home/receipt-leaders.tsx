"use client";

/**
 * The receipt flow's leaders (components/home/receipt-flow.tsx): three dashed
 * cobalt lines from the sources into the result, drawn once as the section
 * enters the viewport, on every engine, with Motion's pathLength.
 *
 * The drawn state is the default. The server renders the leaders complete
 * (no mask), so a page without JavaScript, a crawler and a reduced-motion
 * visitor all see the finished drawing; a section already on screen when the
 * island mounts keeps it too, so nothing in view ever disappears to redraw.
 * Only when the section is still below the fold does the island arm the
 * draw: each dashed leader is revealed through an SVG mask whose stroke
 * Motion draws from 0 to 1 when the leaders scroll into view, so the dash
 * pattern survives the drawing and the leader rests dashed. While a source's
 * popover is open its leader goes solid and the figure it feeds brightens
 * (globals.css, by the attributes below).
 */

import { m, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { MotionProvider } from "@/components/motion/motion-provider";
import { DURATION, EASE } from "@/lib/motion";

export type ReceiptLeaderKey = "rent" | "rate" | "tax";

const LEADERS: { key: ReceiptLeaderKey; d: string }[] = [
  { key: "rent", d: "M0 40 C 60 40, 60 120, 120 120" },
  { key: "rate", d: "M0 120 H120" },
  { key: "tax", d: "M0 200 C 60 200, 60 120, 120 120" },
];

export function ReceiptLeaders() {
  const id = useId();
  const reduced = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const svg = ref.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    // Below the fold (or scrolled past): draw on entry. Otherwise it is
    // already in view, complete, and stays that way.
    const inView = box.top < window.innerHeight && box.bottom > 0;
    if (!inView) setArmed(true);
  }, [reduced]);

  return (
    <MotionProvider>
      <svg
        ref={ref}
        viewBox="0 0 120 240"
        preserveAspectRatio="none"
        className="hidden h-full w-full lg:block"
        aria-hidden
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
                <m.path
                  d={leader.d}
                  pathLength={1}
                  fill="none"
                  stroke="white"
                  strokeWidth="6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: DURATION.draw, ease: EASE.out, delay: index * 0.08 }}
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
    </MotionProvider>
  );
}
