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
 *
 * Every internal link is an IntentPrefetchLink: it prefetches on hover or
 * keyboard focus, never because it scrolled into view. A default next/link
 * here made each phone visitor who reached the footer download ~30 routes
 * they did not open (see components/marketing/intent-prefetch-link.tsx).
 */

import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { Disclaimer } from "@/components/marketing/disclaimer";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { AppLogo } from "@/components/brand/app-logo";
import { FOOTER_CALCULATORS } from "@/lib/calculator-registry";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";

/**
 * prefetch: false opts a link out of IntentPrefetchLink's hover/focus prefetch.
 * nofollow: true renders rel="nofollow", for a target robots.txt disallows.
 */
type FooterLink = { label: string; href: string; external?: boolean; prefetch?: false; nofollow?: true };

const FOOTER_COLS: Array<{
  title: string;
  links: FooterLink[];
}> = [
  // The Product column used to carry ELEVEN links doing three unrelated
  // jobs — the product itself, the content library, and trust pages — which
  // read as a dump rather than navigation. Split into "Product" (what you
  // buy / how it works) and "Learn" (the content library) below, so each
  // column is scannable and the crawl paths that matter are still one click
  // from every page. Changelog was removed entirely at the founder's request
  // (2026-08-11): it is a public "is this actively shipped?" signal that
  // mostly advertises release cadence, and he does not want it front-facing.
  // Its route still exists and is still in the sitemap — only the sitewide
  // footer link is gone.
  {
    title: "Product",
    links: [
      // Never prefetched, not even on hover: the analyzer bundle stays off
      // marketing pages (docs/site-overhaul.md, Phase 7). Before this flag
      // the footer prefetched /analyze on every page it scrolled into view.
      { label: "Free analyzer", href: "/analyze", prefetch: false },
      { label: "Pricing", href: "/pricing" },
      { label: "Why TrueCap", href: "/why-truecap" },
      { label: "Proof & methodology", href: "/reviews" },
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
      { label: "Rental analysis playbook", href: "/playbook" },
      { label: "Rental markets", href: "/markets" },
      { label: "Investing by state", href: "/states" },
      // Glossary was reachable only from its own hub; surfacing it here
      // gives the 44 term pages a sitewide crawl path, the same fix the
      // /vs link above made for the comparison library.
      { label: "Glossary", href: "/glossary" },
      { label: "Sample decision memo", href: "/sample-decision-memo" },
    ],
  },
  {
    title: "Who it's for",
    // Agents first (2026-09 agent-first pass): the site now speaks to agents
    // with investor clients before investors buying for themselves. The
    // agent link is resolved at render time (whoItsForLinks): /for-agents
    // permanently redirects to /pricing while Agent Pro's Stripe Price is
    // absent, and a sitewide link to a redirect fails the link-graph guard
    // (lib/__tests__/internal-link-graph.test.tsx), so that deployment links
    // the plan cards instead.
    // /for-brrrr and /for-flippers are deliberately noindexed planning stubs
    // (robots index:false, outside the sitemap); the same guard forbids
    // linking them sitewide, so they stay reachable from /for-agents only.
    links: [
      { label: "Buy-and-hold investors", href: "/for-buy-and-hold" },
      { label: "House hackers", href: "/for-house-hackers" },
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
      {
        label: "Rental spreadsheet (Excel)",
        href: "/tools/rental-property-spreadsheet",
      },
    ],
  },
  {
    title: "Account",
    // robots.txt disallows /auth/ (app/robots.ts), so a crawler never fetches
    // these pages and never reads their noindex. Linked from every page
    // without a hint, the bare URLs could be indexed with no snippet.
    // rel="nofollow" tells crawlers not to count these links; the links
    // themselves stay, so every page keeps its way to sign in.
    links: [
      { label: "Sign in", href: "/auth/login", nofollow: true },
      { label: "Create account", href: "/auth/sign-up", nofollow: true },
      { label: "Forgot password", href: "/auth/forgot-password", nofollow: true },
    ],
  },
];

/**
 * The agent entry in "Who it's for" resolves per deployment (see the column
 * comment above): the persona page when Agent Pro is sold here, otherwise the
 * plan cards. Server component, so the env read is safe.
 */
function whoItsForLinks(links: readonly FooterLink[]): FooterLink[] {
  return [
    {
      label: "Real estate agents",
      href: isAgentProConfigured() ? "/for-agents" : "/pricing#plans",
    },
    ...links,
  ];
}

function footerColumns() {
  return FOOTER_COLS.map((col) =>
    col.title === "Who it's for" ? { ...col, links: whoItsForLinks(col.links) } : col,
  );
}

export function SiteFooter({
  hideAccountLinks = false,
  disclaimer = true,
}: { hideAccountLinks?: boolean; disclaimer?: boolean } = {}) {
  // The "Account" column offers Sign in / Create account / Forgot password.
  // Rendering it to a signed-in user invites them to sign in from inside the
  // product. Callers that know the session pass hideAccountLinks.
  const year = new Date().getFullYear();
  return (
    // data-site-footer: globals.css pads the footer's bottom while a sticky
    // bottom bar is mounted, so the legal row below stays tappable instead of
    // sitting permanently under the bar at maximum scroll.
    // DESIGN.md "Footer": paper, rules over the column groups, sentence-case
    // column heads, one Disclaimer with unchanged text.
    <footer
      data-site-footer=""
      className="mt-12 border-t border-border bg-background"
    >
      <div className={`${PAGE_CONTAINER} py-12 sm:py-16`}>
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
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* Brand block — intentionally short. Logo + one-line tagline. */}
          <div className="col-span-full border-t border-foreground pt-2 lg:col-span-1">
            {/* The same mark as the header (components/brand/app-logo), so the
                page carries one wordmark; the link stays the footer's own. */}
            <IntentPrefetchLink href="/" className="inline-flex min-h-11 min-w-11 items-center">
              <AppLogo href="" subtitle="" />
            </IntentPrefetchLink>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Underwrite a rental before you make an offer.
            </p>
          </div>

          {/* Sitemap columns */}
          {footerColumns()
            .filter((col) => !(hideAccountLinks && col.title === "Account"))
            .map((col) => (
            <div key={col.title} className="border-t border-border pt-2">
              <h2 className="py-2.5 text-base font-semibold leading-snug text-foreground">
                {col.title}
              </h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <IntentPrefetchLink
                      href={link.href}
                      prefetch={link.prefetch}
                      rel={link.nofollow ? "nofollow" : undefined}
                      className="inline-flex min-h-11 min-w-11 items-center text-base text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </IntentPrefetchLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* THE disclaimer — once per marketing page, here near the bottom.
            Pages whose results view carries its own copy pass
            disclaimer={false} (docs/voice.md rule 3). */}
        {disclaimer ? (
          <Disclaimer className="mt-12" />
        ) : null}

        {/* Bottom strip — copyright, trust badges, legal links + email,
            all on the same horizontal band so the footer ends with a
            single visually-balanced row instead of trailing dead space. */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p className="order-2 sm:order-1">
            © {year} TrueCap. All rights reserved.
          </p>
          {/* Trust badges — moved here so the brand column stays compact
              and the badges are still visible on every page. */}
          <ul className="order-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:order-2">
            <li>SSL encrypted</li>
            <li>No card to start</li>
            <li>Stripe for paid upgrades</li>
          </ul>
          <p className="order-3 flex flex-wrap items-center gap-x-5 gap-y-1 sm:justify-end">
            {/* /about — quiet E-E-A-T link (who builds TrueCap). Bottom
                strip only, per the no-new-top-level-nav principle; the
                blog bylines are the other inbound path. */}
            <IntentPrefetchLink
              href="/about"
              className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-foreground"
            >
              About
            </IntentPrefetchLink>
            <IntentPrefetchLink
              href="/privacy"
              className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-foreground"
            >
              Privacy
            </IntentPrefetchLink>
            <IntentPrefetchLink
              href="/terms"
              className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-foreground"
            >
              Terms
            </IntentPrefetchLink>
            {/* NOTE: llms.txt footer link intentionally removed — it
                looked like a technical artifact to regular visitors
                ("what is that?"). The /llms.txt URL still resolves
                and is referenced from robots.txt + sitemap.ts, so AI
                training crawlers (GPTBot, ClaudeBot, PerplexityBot)
                will still discover it. No SEO loss; cleaner footer. */}
            <a
              href="mailto:hello@usetruecap.com"
              className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-foreground"
            >
              hello@usetruecap.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
