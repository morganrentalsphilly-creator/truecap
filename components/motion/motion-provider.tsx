"use client";

/**
 * MotionProvider: wraps a client island that animates. LazyMotion with the
 * domAnimation feature set keeps the initial bundle small (the full
 * `motion` component is never imported; islands use `m`), `strict` throws
 * in development if a `motion.*` component slips in, and MotionConfig
 * honours the visitor's reduced-motion preference for every animation
 * inside. Drag and layout animations need domMax: pass `features="max"` on
 * the one island that drags (the price scrubber), which loads it lazily.
 */

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

const loadDomMax = () => import("motion/react").then((mod) => mod.domMax);

export function MotionProvider({
  children,
  features = "animation",
}: {
  children: ReactNode;
  features?: "animation" | "max";
}) {
  return (
    <LazyMotion features={features === "max" ? loadDomMax : domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
