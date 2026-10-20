/**
 * The motion system (DESIGN.md "Motion"): the durations, easings and presets
 * every animated component shares. The CSS side of the same system is the
 * --duration-* and --ease-* tokens in app/globals.css; keep the two in step.
 *
 * Rules: animate transform and opacity only; the default (resting) state is
 * the complete page, so nothing above the fold starts hidden; one authored
 * moment per surface, not an entrance on every section; reduced motion wins
 * everywhere (MotionProvider sets reducedMotion="user").
 */

import type { Transition, Variants } from "motion/react";

/** Milliseconds, matching --duration-* in globals.css. */
export const DURATION = {
  fast: 0.15,
  base: 0.22,
  slow: 0.42,
  draw: 0.7,
} as const;

/** Cubic beziers, matching --ease-* in globals.css. */
export const EASE = {
  out: [0.2, 0.8, 0.2, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

/** A quick, precise state change: hover, press, a chip flipping. */
export const stateTransition: Transition = {
  duration: DURATION.fast,
  ease: EASE.out,
};

/** The spring a figure or a handle settles on: mass, a little damping, no bounce past the target. */
export const settleSpring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.8,
};

/** The reveal for a section's content as it enters the viewport: from a visible, slightly lowered state. */
export const revealVariants: Variants = {
  hidden: { opacity: 0.001, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.out },
  },
};

/** Children of a Stagger reveal, one after the other. */
export const staggerContainer = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** How far into the viewport an element must be before it reveals. */
export const REVEAL_VIEWPORT = { once: true, amount: 0.25 } as const;
