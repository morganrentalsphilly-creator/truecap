"use client";

/**
 * The scroll story's one piece of JavaScript (OVERHAUL.md §6.2; audit A16).
 * From 1024px the story is ONE pinned sheet that accumulates: a step's rows
 * enter once, as the step reaches the middle of the viewport, and stay.
 *
 * It writes two attributes on the story's root, which globals.css reads:
 * `data-story-armed` while the story was still below the fold when the page
 * hydrated (so no row that is already on screen ever hides to enter), and
 * never under reduced motion; `data-story-reached`, the furthest step
 * reached, which only grows. Without JavaScript, under reduced motion, or
 * when the page opens on the story, the sheet is complete from the start.
 */

import { useEffect, type ReactNode } from "react";

export function StoryObserver({ rootId, children }: { rootId: string; children: ReactNode }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only a story still below the fold is armed: rows that would hide must
    // not be on screen.
    if (root.getBoundingClientRect().top < window.innerHeight) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-story-step]"));
    if (steps.length === 0) return;
    root.dataset.storyArmed = "";
    let reached = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const n = Number((entry.target as HTMLElement).dataset.storyStep);
          if (n > reached) {
            reached = n;
            root.dataset.storyReached = String(n);
          }
        }
        if (reached >= steps.length) observer.disconnect();
      },
      // The band across the middle of the viewport decides the step.
      { rootMargin: "-35% 0px -35% 0px" },
    );
    for (const step of steps) observer.observe(step);
    return () => observer.disconnect();
  }, [rootId]);
  return <>{children}</>;
}
