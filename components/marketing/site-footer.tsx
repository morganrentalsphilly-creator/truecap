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
import { FOOTER_CALCULATORS } from "@/lib/calculator-registry";

const FOOTER_COLS: Array<{
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}> = [
  // The Product column used to carry ELEVEN links doing three unrelated
  // jobs — the product itself, the content library, and trust pages — which
  // read as a dump rather than navigation. Split into "Product" (what you
  // buy / how it works) and "Learn" (the content library) below, so each
  // column is scannable and the crawl paths that matter are still one click
  // from every page. Changelog was removed entirely at Morgan's request
  // (2026-08-11): it is a public "is this actively shipped?" signal that
  // mostly advertises release cadence, and he does not want it front-facing.
  // Its route still exists and is still in the sitemap — only the sitewide
  // footer link is gone.
  {
    title: "Product",
    links: [
      { label: "Free analyzer", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "Why TrueCap", href: "/why-truecap" },
      // /methodology (every formula + data source) had zero inbound links
      // from the product itself before the Jul 2026 trust-polish audit —
      // it is the page a skeptical investor wants, so it stays.
      { label: "Methodology", href: "/methodology" },
      // RESTORED 2026-08-03, reversing a deliberate removal. The note that
      // used to sit here said the /vs pages "still exist as SEO landing
      // surfaces (visitors arrive directly from Google)".
      //
      // Measured, that was false. A BFS crawl from `/` reached 370 of 419
      // sitemap URLs; 24 of the 40 /vs pages were unreachable because
      // nothing linked to /vs. And nobody arrived from Google — the site
      // ranked for 0 of 10 target queries. A page with no inbound link
      // cannot be a landing surface. This one link restores the crawl path
      // to the whole comparison library, so it must stay.
      { label: "Compare TrueCap", href: "/vs" },
      // Embed hub — quiet link. Bloggers/agents who care will find it;
      // casual visitors won't notice. Each embed adoption = a permanent
      // backlink, so even one or two clicks per month compound nicely.
      { label: "Embed our calculators", href: "/embed" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "All free tools", href: "/tools" },
      { label: "Blog", href: "/blog" },
      { label: "Rental markets", href: "/markets" },
      { label: "Investing by state", href: "/states" },
      // Glossary was reachable only from its own hub; surfacing it here
      // gives the 44 term pages a sitewide crawl path, the same fix the
      // /vs link above made for the comparison library.
      { label: "Glossary", href: "/glossary" },
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
    // Driven by the calculator registry's footerFeatured flags so this
    // shortlist can never drift from /tools (see lib/calculator-registry.ts).
    links: [
      ...FOOTER_CALCULATORS.map((c) => ({
        label: c.shortTitle,
        href: `/tools/${c.slug}`,
      })),
      // The un-gated spreadsheet download page is not a registry
      // calculator (no widget), so it's linked manually here.
      { label: "Rental spreadsheet (Excel)", href: "/tools/rental-property-spreadsheet" },
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
    // data-site-footer: globals.css pads the footer's bottom while a sticky
    // bottom bar is mounted, so the legal row below stays tappable instead of
    // sitting permanently under the bar at maximum scroll.
    <footer data-site-footer="" className="mt-12 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {/* The newsletter band used to live here. The newsletter was
            canceled (founder decision, 2026-07-15) and NewsletterSignup
            now returns null — but the WRAPPER stayed, so every page on
            the site rendered an empty <div> carrying mb-10 pb-10 and a
            bottom border: a stray horizontal rule with ~80px of dead
            space above the footer sitemap, sitewide. Removing the
            wrapper, not just the component, is what actually deletes it.
            Do not re-add a signup surface here — see CLAUDE.md §3.8. */}

        {/* Brand + sitemap row.
            Grid: 5 cols at lg so brand takes 1 wide column + 4 sitemap
            cols. Each column is the same height because the brand block
            is now intentionally compact (logo + one-line tagline only —
            newsletter moved to its own band above, badges to the bottom
            strip below). */}
        {/* 6 cols at lg: the brand block takes 1, the five sitemap columns
            take the rest. Was grid-cols-5 when there were four sitemap
            columns — splitting Product into Product + Learn added a fifth,
            and leaving the count at 5 would have wrapped the last column
            under the brand on desktop. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {/* Brand block — intentionally short. Logo + one-line tagline. */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center text-xl font-extrabold tracking-tight text-foreground"
            >
              TrueCap<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Underwrite rentals in 60 seconds.
            </p>
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
          The analyzer surfaces the math you&apos;d compute yourself in a spreadsheet, with
          accurate formulas and market-data defaults, but every assumption is editable and
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
              <span>No card to start</span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CreditCard className="size-3.5 text-primary/70" />
              <span>Stripe for paid upgrades</span>
            </li>
          </ul>
          <p className="order-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            {/* /about — quiet E-E-A-T link (who builds TrueCap). Bottom
                strip only, per the no-new-top-level-nav principle; the
                blog bylines are the other inbound path. */}
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <span aria-hidden className="text-muted-foreground/30">
              ·
            </span>
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
            {/* NOTE: llms.txt footer link intentionally removed — it
                looked like a technical artifact to regular visitors
                ("what is that?"). The /llms.txt URL still resolves
                and is referenced from robots.txt + sitemap.ts, so AI
                training crawlers (GPTBot, ClaudeBot, PerplexityBot)
                will still discover it. No SEO loss; cleaner footer. */}
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
