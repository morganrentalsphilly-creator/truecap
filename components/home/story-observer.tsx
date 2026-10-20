"use client";

/**
 * The scroll story's one piece of JavaScript (OVERHAUL.md §6.2): as the three
 * steps scroll past, it writes the active step's number onto the story's
 * root (`data-active-step`), and CSS in globals.css shows that step's frame in
 * the pinned panel from 1024px. Without JavaScript, or on phones, every step
 * keeps its own frame in flow, so the story is complete either way.
 */

import { useEffect, type ReactNode } from "react";

export function StoryObserver({ rootId, children }: { rootId: string; children: ReactNode }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || typeof IntersectionObserver === "undefined") return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-story-step]"));
    if (steps.length === 0) return;
    const ratios = new Map<HTMLElement, number>();
    const pick = () => {
      let best: HTMLElement | null = null;
      let bestRatio = 0;
      for (const step of steps) {
        const ratio = ratios.get(step) ?? 0;
        if (ratio > bestRatio) {
          best = step;
          bestRatio = ratio;
        }
      }
      if (best) root.dataset.activeStep = best.dataset.storyStep;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target as HTMLElement, entry.intersectionRatio);
        pick();
      },
      // The band across the middle of the viewport decides the step.
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const step of steps) observer.observe(step);
    return () => observer.disconnect();
  }, [rootId]);
  return <>{children}</>;
}
