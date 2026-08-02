"use client";

/**
 * Self-heals a "frozen page" caused by a stranded overlay lock.
 *
 * Radix modal overlays (Dialog, Sheet, AlertDialog — and DropdownMenu when
 * explicitly made modal) set `pointer-events: none` on <body> while open and
 * restore it in a cleanup effect. If the overlay unmounts before that cleanup
 * runs — the classic case is a route change while it's open, which App Router
 * client navigation makes easy — the style stays. The page still SCROLLS but
 * nothing is clickable, which reads to a user as a total freeze that only a
 * reload fixes. The founder hit this in production on 2026-07-15.
 *
 * The root cause for menus is fixed at the source (components/ui/dropdown-menu
 * defaults to modal={false}); this is defense in depth for the overlays that
 * must stay modal.
 *
 * Safety: it only ever clears the lock when NOTHING is actually open — it
 * looks for a live Radix overlay in the DOM first — so a legitimately-open
 * dialog is never broken. It also runs on a rAF after the route commits, so
 * Radix's own cleanup gets to go first and this is a no-op in the normal case.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Any Radix overlay currently mounted AND open. */
function hasOpenOverlay(): boolean {
  return document.querySelector(
    [
      "[data-radix-popper-content-wrapper]",
      '[data-slot="dialog-content"][data-state="open"]',
      '[data-slot="sheet-content"][data-state="open"]',
      '[data-slot="alert-dialog-content"][data-state="open"]',
      '[role="dialog"][data-state="open"]',
      '[role="menu"][data-state="open"]',
    ].join(",")
  ) !== null;
}

function releaseStrandedLock() {
  if (hasOpenOverlay()) return;
  const body = document.body;
  // Radix writes these inline; only clear what it actually stranded.
  if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
  // react-remove-scroll (used by Dialog/Sheet) strands these when it can't
  // run its own restore.
  if (body.hasAttribute("data-scroll-locked")) {
    body.removeAttribute("data-scroll-locked");
    if (body.style.overflow === "hidden") body.style.overflow = "";
  }
}

export function OverlayRecovery() {
  const pathname = usePathname();

  useEffect(() => {
    // A timeout, deliberately NOT requestAnimationFrame: rAF is throttled to
    // zero in background/inactive tabs, so a nav that happens in a background
    // tab would never get healed and the user would return to a dead page.
    // The 0ms tick still lands after Radix's own cleanup effects and the route
    // commit, so this is a no-op in the normal case.
    const t = window.setTimeout(releaseStrandedLock, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    // Back/forward navigations and bfcache restores don't always remount the
    // tree, so the pathname effect can miss them.
    const onPageShow = () => releaseStrandedLock();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
