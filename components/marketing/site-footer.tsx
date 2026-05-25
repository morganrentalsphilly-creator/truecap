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
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";

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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Brand + sitemap row.
            Grid: 5 cols at lg so brand takes 1 wide column + 4 sitemap
            cols. Each column is the same height because the brand block
            is now intentionally compact (logo + one-line tagline only —
            trust badges moved to the bottom strip). */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand block — intentionally short. Logo + one-line tagline.
              Trust badges have moved to the bottom strip so they don't
              push this column taller than the sitemap columns next to
              it. Spans the full row on small viewports. */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center text-xl font-black tracking-tight text-foreground"
            >
              Truecap<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Underwrite rentals in 60 seconds.
            </p>
            {/* Newsletter signup — compact variant. Lives in the
                brand column so it's the first thing readers see when
                scanning the footer. Email infrastructure powered by
                Resend (env vars required: see docs/NEWSLETTER-SETUP.md). */}
            <div className="mt-5">
              <NewsletterSignup variant="compact" source="footer" />
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

        {/* Honest sub-promise — quiet footnote, doesn't compete with
            the sitemap above or the bottom strip below. */}
        <p className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          <strong className="text-foreground/90">TrueCap is not a financial advisor.</strong>{" "}
          The analyzer surfaces the math you&apos;d compute yourself in a spreadsheet —
          accurate formulas, market-data defaults — but every assumption is editable and
          the underwriting decision is yours.
        </p>

        {/* Bottom strip — copyright, trust badges, legal links + email,
            all on the same horizontal band so the footer ends with a
            single visually-balanced row instead of trailing dead space. */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="order-2 sm:order-1">© {year} TrueCap. All rights reserved.</p>
          {/* Trust badges — moved here so the brand column stays compact
              and the badges are still visible on every page. */}
          <ul className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-semibold sm:order-2">
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
          <p className="order-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <span aria-hidden className="text-muted-foreground/30">
              ·
            </span>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span aria-hidden className="text-muted-foreground/30">
              ·
            </span>
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
