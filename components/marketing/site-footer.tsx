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
import { Lock, ShieldCheck, CreditCard } from "lucide-react";

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
      { label: "Buy-and-hold investors", href: "/for-buy-and-hold" },
      { label: "House hackers", href: "/for-house-hackers" },
      { label: "BRRRR operators", href: "/for-brrrr" },
      { label: "Fix & flippers", href: "/for-flippers" },
      { label: "Real estate agents", href: "/for-agents" },
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
        {/* Brand + sitemap row.
            Grid: 6 cols at lg so brand can take 2 + four sitemap cols
            each take 1. Avoids the cramped look of trying to fit a
            wide brand block into a single narrow column. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 sm:gap-y-12">
          {/* Brand block — takes 2 cols at lg so the description + trust
              badges have room to breathe. Spans the full row on smaller
              viewports. */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center text-xl font-black tracking-tight text-foreground">
              Truecap<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Real estate investment analyzer. Cap rate, CoC, DSCR, projections,
              tax, and exit — in seconds.
            </p>
            {/* Trust badges — pill-style with subtle icon tinting so they
                feel like part of the brand rather than visual clutter. */}
            <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary/70" />
                <span>SSL encrypted</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary/70" />
                <span>Cancel anytime</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary/70" />
                <span>Stripe billing</span>
              </li>
            </ul>
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
                      className="text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Honest sub-promise — toned down to a soft inline footnote
            instead of a heavy bordered card. Same content, less visual
            weight, doesn't compete with the sitemap. */}
        <p className="mt-12 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          <strong className="text-foreground/90">TrueCap is not a financial advisor.</strong>{" "}
          The analyzer surfaces the math you&apos;d compute yourself in a spreadsheet — accurate
          formulas, market-data defaults — but every assumption is editable and the
          underwriting decision is yours.
        </p>

        {/* Bottom strip */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} TrueCap. All rights reserved.</p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            <Link href="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <a
              href="mailto:hello@usetruecap.com"
              className="transition-colors hover:text-foreground"
            >
              hello@usetruecap.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
