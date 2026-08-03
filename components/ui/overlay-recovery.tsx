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
 * dialog is never broken. It also runs a tick after the route commits, so
 * Radix's own cleanup gets to go first and this is a no-op in the normal case.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Radix `data-state` values that mean a layer is live on screen. Tooltips
 * report "delayed-open"/"instant-open" rather than "open", so matching only
 * "open" would miss them.
 */
const LIVE_OVERLAY_STATES = ["open", "delayed-open", "instant-open"] as const;

/** Exported for unit testing — the crux of "is this layer actually live?". */
export function isLiveOverlayState(state: string | null | undefined): boolean {
  return (
    typeof state === "string" &&
    (LIVE_OVERLAY_STATES as readonly string[]).includes(state)
  );
}

const LIVE_STATE_SELECTOR = LIVE_OVERLAY_STATES.map(
  (state) => `[data-state="${state}"]`
).join(",");

/**
 * Modal layers — the only things that ever set the body lock we clear. Both
 * the content and the scrim are listed: `display:none` on the content (the
 * dashboard drawer's `lg:hidden`) doesn't unmount the layer, and the scrim is
 * what actually carries react-remove-scroll.
 */
const OPEN_MODAL_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="dialog-overlay"]',
  '[data-slot="sheet-content"]',
  '[data-slot="sheet-overlay"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="alert-dialog-overlay"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
]
  .flatMap((base) =>
    LIVE_OVERLAY_STATES.map((state) => `${base}[data-state="${state}"]`)
  )
  .join(",");

/** Any Radix overlay currently mounted AND open. */
function hasOpenOverlay(): boolean {
  if (document.querySelector(OPEN_MODAL_SELECTOR) !== null) return true;
  // A popper wrapper stays MOUNTED for the rest of the page session once its
  // content has closed — Radix's exit animation never completes for it — so
  // matching the wrapper itself (what this used to do) disarmed the whole
  // safety net after the first tooltip hover or menu open. Only a wrapper
  // whose content is still in a live state counts as "something is open".
  return Array.from(
    document.querySelectorAll("[data-radix-popper-content-wrapper]")
  ).some((wrapper) => wrapper.querySelector(LIVE_STATE_SELECTOR) !== null);
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

/**
 * Re-checks after a navigation. More than one tick because at 0ms a layer that
 * is closing can still legitimately report itself open — and the effect only
 * re-runs on the NEXT navigation, so a single false negative used to strand
 * the lock until a reload.
 */
const HEAL_DELAYS_MS = [0, 150, 400];

/** Settle time before reacting to a body-lock mutation (exit animations). */
const LOCK_SETTLE_MS = 400;

export function OverlayRecovery() {
  const pathname = usePathname();

  useEffect(() => {
    // Timeouts, deliberately NOT requestAnimationFrame: rAF is throttled to
    // zero in background/inactive tabs, so a nav that happens in a background
    // tab would never get healed and the user would return to a dead page.
    // The first tick still lands after Radix's own cleanup effects and the
    // route commit, so this is a no-op in the normal case.
    const timers = HEAL_DELAYS_MS.map((delay) =>
      window.setTimeout(releaseStrandedLock, delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pathname]);

  useEffect(() => {
    // Back/forward navigations and bfcache restores don't always remount the
    // tree, so the pathname effect can miss them.
    const onPageShow = () => releaseStrandedLock();
    // Returning to a tab that was left with a stranded lock.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") releaseStrandedLock();
    };

    // A lock can also strand with NO navigation at all — an open Dialog that
    // gets conditionally unmounted, or a query-string-only router.push (see
    // saved-analyses-page-v2). Two signals cover that: the attributes Radix
    // and react-remove-scroll write, and portal layers appearing/disappearing
    // (Radix portals mount as direct <body> children, and an overlay that goes
    // away without its cleanup running leaves the body untouched — so watching
    // the attributes alone would miss exactly the case we care about).
    // Re-check once things have settled; releaseStrandedLock is a no-op
    // whenever something is genuinely open.
    let pending: number | undefined;
    const observer = new MutationObserver(() => {
      if (pending !== undefined) return;
      pending = window.setTimeout(() => {
        pending = undefined;
        releaseStrandedLock();
      }, LOCK_SETTLE_MS);
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
      // Direct children only — cheap, and that's where portals live.
      childList: true,
    });

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();
      if (pending !== undefined) window.clearTimeout(pending);
    };
  }, []);

  return null;
}
