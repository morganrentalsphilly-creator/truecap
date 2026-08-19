"use client";

/**
 * Founding Pricing Banner.
 *
 * Honest-urgency top bar for the Methodology v1.0 window: subscribers who
 * lock in now keep today's Pro rate when pricing rises with the v2
 * methodology release. The claim is verifiable — "v1.0" links to the public
 * versioned methodology — and there is deliberately NO countdown, "limited
 * spots", or any manufactured scarcity (founder rule: honest urgency only).
 *
 * Replaces the AnnualPromoBanner mount in app/layout.tsx for the duration of
 * the founding window (one top banner at a time; the annual-savings pitch
 * remains visible on /pricing itself). Swap the layout mount back to
 * <AnnualPromoBanner /> to end the window.
 *
 * Render rules (mirrors annual-promo-banner.tsx):
 *   - Hides after dismissal (localStorage, own versioned key)
 *   - Hides on "/" exactly — the paid-ad landing's first pixel row is not
 *     for banners (mobile density audit LAND-4, recorded founder decision)
 *   - Hides on /auth, /embed, /dashboard (clean surfaces / app shell)
 *   - UNLIKE the annual banner it stays on /pricing: the price-lock context
 *     is most useful exactly where the visitor is weighing the price.
 *
 * The $29.99 figure mirrors the live STRIPE_PRICE_PRO_MONTHLY price. If the
 * Pro price ever changes, remove this banner in the same change — that event
 * is precisely the end of the founding window it advertises.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "truecap_founding_pricing_dismissed_v1";

// Prefix-matched. /settings, /profile and /admin are AUTHENTICATED product
// surfaces. /d, /s and /portal are SHARED pages a stranger (or an agent's
// client) opens: they carry their own promo strip, and on a co-branded
// portal TrueCap's price bar would sit above the agent's own branding.
const HIDE_ON_PATHS = [
  "/auth", "/embed", "/dashboard", "/settings", "/profile", "/admin",
  "/d", "/s", "/portal",
];
const HIDE_EXACT_PATHS = ["/"];

export function FoundingPricingBanner() {
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

  if (!hydrated) return null;
  if (dismissed) return null;
  if (HIDE_ON_PATHS.some((p) => pathname.startsWith(p))) return null;
  if (HIDE_EXACT_PATHS.includes(pathname)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    trackEvent("founding_banner_dismissed");
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="region"
      aria-label="Founding pricing"
      className="relative w-full border-b border-primary/20 bg-gradient-to-r from-[var(--brand-blue-light)] via-card to-[var(--brand-blue-light)]"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center text-xs font-semibold text-foreground sm:gap-4 sm:text-sm">
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-primary">
          Founding pricing
        </span>
        <p>
          TrueCap is at{" "}
          <Link
            href="/methodology#version-history"
            className="font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            onClick={() => trackEvent("founding_banner_clicked", { target: "methodology" })}
          >
            Methodology v1.0
          </Link>
          . Lock <span className="text-primary">$29.99/mo</span> before pricing
          rises with v2 — subscribers keep their rate.{" "}
          {pathname.startsWith("/pricing") ? null : (
            <Link
              href="/pricing"
              className="font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              onClick={() => trackEvent("founding_banner_clicked", { target: "pricing" })}
            >
              See pricing →
            </Link>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss founding pricing banner"
        className="group absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground"
      >
        <span className="inline-flex size-7 items-center justify-center rounded-full transition-colors group-hover:bg-muted group-hover:text-foreground">
          <X className="size-3.5" />
        </span>
      </button>
    </div>
  );
}
