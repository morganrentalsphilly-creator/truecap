"use client";

/**
 * Annual Plan Promo Banner.
 *
 * Thin dismissible bar that surfaces a "save with annual" pitch to
 * cold visitors and monthly subscribers. Sits above the header (or
 * just below depending on layout). Dismiss state persists in
 * localStorage so we don't re-nag a visitor who's already said no.
 *
 * Render rules:
 *   - Hides for anyone who's dismissed it (localStorage flag)
 *   - Hides on auth pages (clean signup/login surfaces)
 *   - Hides on /pricing (the destination — don't promote it from itself)
 *   - Hides on /dashboard/* — that's the signed-in app shell, which is
 *     viewport-locked (lg:h-screen lg:overflow-hidden). A normal-flow banner
 *     above a 100vh shell makes the whole page over-scroll into dead space
 *     below the dashboard. Marketing chrome doesn't belong in the app shell.
 *
 * Copy is intentionally light — not a sales scream. The banner is a
 * passive nudge for the segment that's already considering paying.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const DISMISS_KEY = "truecap_annual_promo_dismissed_v1";

const HIDE_ON_PATHS = ["/pricing", "/auth", "/embed", "/dashboard"];
/** Exact-match hides (startsWith("/") would match everything). The landing
 *  is a paid-ad first touch — a promo banner above the header before the
 *  visitor has seen any value is the wrong first pixel row (mobile density
 *  audit LAND-4). The banner stays on blog//tools//glossary, where
 *  visitors are warmer. */
const HIDE_EXACT_PATHS = ["/"];

export function AnnualPromoBanner() {
  const pathname = usePathname() ?? "/";
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const flag = window.localStorage.getItem(DISMISS_KEY);
      setDismissed(flag === "1");
    } catch {
      // localStorage can throw in private browsing — fail open (show).
      setDismissed(false);
    }
  }, []);

  // Route-based hiding (computed after hydration so server + client
  // agree on first paint).
  if (!hydrated) return null;
  if (dismissed) return null;
  if (HIDE_ON_PATHS.some((p) => pathname.startsWith(p))) return null;
  if (HIDE_EXACT_PATHS.includes(pathname)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="region"
      aria-label="Annual plan promotion"
      className="relative w-full border-b border-primary/20 bg-gradient-to-r from-[var(--brand-blue-light)] via-card to-[var(--brand-blue-light)]"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center text-xs font-semibold text-foreground sm:gap-4 sm:text-sm">
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-primary">
          Annual plan
        </span>
        <p>
          Save <span className="text-primary">2 months free</span> on annual Pro.
          {" "}
          <Link
            href="/pricing"
            className="font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            See pricing →
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss annual plan promo"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
