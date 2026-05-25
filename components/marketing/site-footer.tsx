/**
 * Site-wide footer. Used on the homepage and every /tools and /pricing
 * surface. Two jobs:
 *
 *   1. Trust + credibility — the visitor (especially paid traffic) reads
 *      the footer as a signal that this isn't a hobby project. Stripe
 *      badge, SSL, "cancel anytime", real-feeling copyright + links.
 *
 *   2. Sitemap — every conversion-relevant page is linked, which helps
 *      Google index and improves the dwell-time signal that contributes
 *      to Quality Score.
 *
 * Renders nothing if `hide` is passed (we use this to keep the auth
 * pages clean).
 */

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";

const FOOTER_COLS: Array<{
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}> = [
  {
    title: "Product",
    links: [
      { label: "Free analyzer", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "All free tools", href: "/tools" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Who it's for",
    links: [
      { label: "For real estate agents", href: "/for-agents" },
      { label: "For fix & flippers", href: "/for-flippers" },
    ],
  },
  {
    title: "Free calculators",
    links: [
      { label: "Cap rate", href: "/tools/cap-rate-calculator" },
      { label: "Cash-on-cash", href: "/tools/cash-on-cash-calculator" },
      { label: "BRRRR", href: "/tools/brrrr-calculator" },
      { label: "1% rule", href: "/tools/1-percent-rule-calculator" },
      { label: "Rehab cost", href: "/tools/rehab-cost-estimator" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Create account", href: "/auth/sign-up" },
      { label: "Forgot password", href: "/auth/forgot-password" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Brand + sitemap row */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 sm:gap-10">
          {/* Brand block */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex items-center text-xl font-black tracking-tight text-foreground">
              Truecap<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Real estate investment analyzer. Cap rate, CoC, DSCR, projections, tax, and exit —
              in seconds.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Lock className="size-3" /> SSL
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="size-3" /> Cancel anytime
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Powered by Stripe
              </span>
            </div>
          </div>

          {/* Sitemap columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 hover:text-primary hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Honest sub-promise */}
        <div className="mt-10 rounded-2xl border border-border bg-background p-4 text-center text-xs text-muted-foreground sm:p-5">
          <strong className="text-foreground">TrueCap is not a financial advisor.</strong>{" "}
          The analyzer surfaces the math you'd compute yourself with a spreadsheet — accurate
          formulas, market-data defaults — but every assumption is editable and the underwriting
          decision is yours.
        </div>

        {/* Bottom strip */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} TrueCap. All rights reserved.</p>
          <p className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <Link href="/pricing" className="hover:text-foreground hover:underline">Pricing</Link>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <a
              href="mailto:hello@usetruecap.com"
              className="hover:text-foreground hover:underline"
            >
              hello@usetruecap.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
