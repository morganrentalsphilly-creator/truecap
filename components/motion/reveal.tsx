"use client";

/**
 * Reveal and Stagger: a block that eases in once as it enters the viewport.
 * Both render their children visible on the server, so a page without
 * JavaScript, a crawler and a reduced-motion visitor all get the finished
 * state; the animation only takes over after hydration, from a state that is
 * already readable (opacity 0.001 is never seen: the viewport check runs on
 * mount). Use for below-the-fold content only: the LCP element never reveals.
 */

import { m } from "motion/react";
import type { ReactNode } from "react";
import { REVEAL_VIEWPORT, revealVariants, staggerContainer } from "@/lib/motion";
import { MotionProvider } from "@/components/motion/motion-provider";

type Tag = "div" | "section" | "ul" | "li" | "figure" | "p";

export function Reveal({
  as = "div",
  className,
  children,
  delay = 0,
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  const Comp = m[as];
  return (
    <MotionProvider>
      <Comp
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT}
        variants={revealVariants}
        transition={delay ? { delay } : undefined}
      >
        {children}
      </Comp>
    </MotionProvider>
  );
}

/** A list whose items reveal one after the other; wrap each item in StaggerItem. */
export function Stagger({
  as = "div",
  className,
  children,
  stagger = 0.06,
  delay = 0,
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
  stagger?: number;
  delay?: number;
}) {
  const Comp = m[as];
  return (
    <MotionProvider>
      <Comp
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT}
        variants={staggerContainer(stagger, delay)}
      >
        {children}
      </Comp>
    </MotionProvider>
  );
}

export function StaggerItem({
  as = "div",
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
}) {
  const Comp = m[as];
  return (
    <Comp className={className} variants={revealVariants}>
      {children}
    </Comp>
  );
}
