"use client";

/**
 * Re-fetch server-component data when the user returns to this tab.
 *
 * "Open Analysis" always opens the analyzer in a NEW tab, so the My Deals
 * list / deal workspace the user came from stays mounted with server-fetched
 * data. A re-save over there only announces itself via a same-tab
 * CustomEvent — this island is the cross-tab half: on tab focus /
 * visibility, router.refresh() re-renders the server components in place
 * (client state like filters and selections survives), so the row the user
 * just updated shows the saved numbers instead of the pre-edit ones.
 *
 * Renders nothing. Mounted by server components (app/dashboard/
 * saved-analyses/page.tsx and its [id] workspace page) as their client
 * island.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** At most one refresh per window — focus + visibilitychange often fire
 *  together, and rapid tab-flipping must not hammer the server. */
const REFRESH_ON_RETURN_THROTTLE_MS = 15_000;

export function RefreshOnReturn() {
  const router = useRouter();
  // Seeded with mount time: the data was fetched moments ago, so a focus
  // event right after load has nothing newer to fetch.
  const lastRefreshAtRef = useRef(Date.now());

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAtRef.current < REFRESH_ON_RETURN_THROTTLE_MS) return;
      lastRefreshAtRef.current = now;
      router.refresh();
    };
    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", maybeRefresh);
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
  }, [router]);

  return null;
}
