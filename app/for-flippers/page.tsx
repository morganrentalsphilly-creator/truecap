/**
 * /for-flippers — fix-and-flip planning resources (noindex). The integrated
 * flip model is not offered, so the page says so, then points at the tools
 * that are released. Twin of /for-brrrr: keep the two identical in structure.
 *
 * Set on the persona family's grammar (2026-09 design pass), shared with
 * /for-buy-and-hold and /for-house-hackers: PageHero, ruled sections, then
 * CloseSection with the audience cue on its soft rule.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

import {
  ActionRow,
  CloseSection,
  Note,
  PageHero,
  RuledList,
} from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Header } from "@/components/investcalc/header";

export const metadata: Metadata = {
  title: "Fix-and-flip planning resources",
  description:
    "Use TrueCap's rehab, ARV, and 70% rule tools for early research. An integrated fix-and-flip profit model isn't offered right now.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/for-flippers" },
  openGraph: {
    title: "Fix-and-flip planning resources — TrueCap",
    description:
      "Rehab, ARV, and acquisition-screening tools, with a clear line around what TrueCap doesn't model.",
    url: "/for-flippers",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap fix-and-flip planning resources",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const RESOURCES = [
  {
    title: "Estimate a rehab range",
    body: "Use an early square-footage and scope estimate, then replace it with itemized contractor bids, permits, contingencies, and a realistic schedule.",
    href: "/tools/rehab-cost-estimator",
    cta: "Open rehab estimator",
  },
  {
    title: "Organize ARV assumptions",
    body: "Use comparable sales to support an after-repair value range. Treat the result as a working range, not a sale price.",
    href: "/tools/arv-calculator",
    cta: "Open ARV calculator",
  },
  {
    title: "Run a 70% rule screen",
    body: "Use the rule as a quick filter only. It omits deal-specific financing, carrying, selling, tax, and timing effects.",
    href: "/tools/70-percent-rule-calculator",
    cta: "Open 70% rule calculator",
  },
  {
    title: "Test a rental fallback",
    body: "If holding the property is a real alternative, screen the stabilized rental using reviewed rent, expense, and permanent-financing assumptions.",
    href: "/analyze",
    cta: "Open rental analyzer",
  },
] as const;

export default function ForFlippersPage() {
  return (
    // The homepage shell: overflow-x-clip keeps a wide descendant from
    // scrolling the phone page sideways; each Section paints the paper.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Build the inputs before you trust a project return."
          lede="TrueCap currently offers separate rehab, ARV, and 70% rule tools. Its integrated fix-and-flip analysis—including a dated project ledger, financing draws, holding costs, sale proceeds, and profit—isn't offered right now."
        >
          {/* The scope boundary, in ink on the rule directly under the lede:
              it is the page's reason to exist, not a disclaimer. Note sets a
              caveat's body in Ink 2; this body stays in ink (as it was in the
              removed box), so the boundary is not demoted. */}
          <Note
            title="Steady-state rental analysis — use after renovation is complete."
            className="mt-8"
          >
            <span className="text-foreground">
              The core rental analyzer is not a flip-profit calculator. Model the full
              project timeline and every cash contribution in a dedicated project ledger.
            </span>
          </Note>
        </PageHero>

        <Section aria-labelledby="released-flip-resources">
          <SectionHeading id="released-flip-resources">Resources you can use now</SectionHeading>
          <RuledList
            columns={2}
            className="mt-8"
            items={RESOURCES.map(({ title, body, href, cta }) => ({
              key: title,
              term: title,
              detail: (
                <>
                  <p>{body}</p>
                  {/* prefetch={false}: the rental row opens /analyze, and the
                      analyzer bundle must not prefetch onto a marketing page. */}
                  <Link
                    href={href}
                    prefetch={false}
                    className="tc-link mt-1 inline-flex min-h-11 items-center"
                  >
                    {cta}
                  </Link>
                </>
              ),
            }))}
          />
        </Section>

        <CloseSection
          heading="Learn the screening math"
          headingId="close-heading"
          lede="The educational guide explains how the 70% rule is used and why a complete flip model must also account for time, financing, selling costs, and taxes."
          actions={
            <ActionRow>
              <Link
                href="/blog/70-percent-rule-house-flipping"
                className={buttonVariants({ size: "cta" })}
              >
                Read the 70% rule guide
              </Link>
            </ActionRow>
          }
        >
          {/* Agent-first pass (2026-09): the agent persona page, only where Agent
              Pro is sold (its route redirects otherwise — see site-footer.tsx). */}
          {isAgentProConfigured() ? (
            <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
              Are you an agent working with investor clients?{" "}
              <Link href="/for-agents" className="tc-link -my-3 inline-block py-3">
                See TrueCap for agents
              </Link>
            </p>
          ) : null}
        </CloseSection>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
