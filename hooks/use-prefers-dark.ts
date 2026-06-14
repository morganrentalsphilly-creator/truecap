"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the OS `prefers-color-scheme: dark` setting.
 *
 * Used by the dashboard's chart / SVG components, where colors are passed to
 * recharts as SVG presentation attributes (which do NOT resolve CSS var()),
 * so they can't be themed purely in CSS like the rest of the dashboard.
 *
 * Returns false on the server and the first client render (avoids a
 * hydration mismatch), then syncs to the real value on mount.
 */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersDark;
}
