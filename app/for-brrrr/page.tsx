/**
 * /for-brrrr — BRRRR planning resources (noindex). The integrated BRRRR
 * model is dark, so the page says so, then points at the tools that are
 * released. Twin of /for-flippers: keep the two identical in structure.
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
  title: "BRRRR planning resources",
  description:
    "Research a BRRRR deal stage by stage in the TrueCap analyzer — rehab budget, ARV, DSCR, and stabilized rental returns. An integrated BRRRR lifecycle model isn't offered right now.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/for-brrrr" },
  openGraph: {
    title: "BRRRR planning resources — TrueCap",
    description:
      "Work through rehab, ARV, DSCR, and stabilized rental returns in the analyzer, with a clear line around what it doesn't model.",
    url: "/for-brrrr",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap BRRRR planning resources",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const RESOURCES = [
  {
    title: "Build a rehab range",
    body: "Use the standalone estimator as an early budget anchor, then replace its assumptions with contractor bids and a contingency appropriate to the project.",
    href: "/tools/rehab-cost-estimator",
    cta: "Open rehab estimator",
  },
  {
    title: "Research the after-repair value",
    body: "Use the ARV worksheet to organize comparable-sale assumptions. An appraisal or qualified local valuation should support a refinance decision.",
    href: "/tools/arv-calculator",
    cta: "Open ARV calculator",
  },
  {
    title: "Check refinance debt coverage",
    body: "Test a lender-specific loan amount, rate, term, and qualifying NOI. Refinance proceeds and requirements vary by lender and borrower.",
    href: "/analyze",
    cta: "Check refinance DSCR",
  },
  {
    title: "Screen the stabilized rental",
    body: "Run the core analyzer only with the expected post-renovation rent, expenses, value, and permanent financing assumptions clearly reviewed.",
    href: "/analyze",
    cta: "Open rental analyzer",
  },
] as const;

export default function ForBrrrrPage() {
  return (
    // The homepage shell: overflow-x-clip keeps a wide descendant from
    // scrolling the phone page sideways; each Section paints the paper.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Research each stage without pretending it is one finished model."
          lede="TrueCap's analyzer covers rehab budget, ARV, DSCR, and stabilized rental returns as separate steps. Its integrated BRRRR lifecycle analysis—including acquisition financing, refinance proceeds, capital recovery, and post-refinance returns—isn't offered right now."
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
              The core analyzer does not join a construction-period cash-flow ledger to
              a later cash-out refinance. Track every capital contribution and lender fee
              separately before making an investment decision.
            </span>
          </Note>
        </PageHero>

        <Section aria-labelledby="released-resources">
          <SectionHeading id="released-resources">Resources you can use now</SectionHeading>
          <RuledList
            columns={2}
            className="mt-8"
            items={RESOURCES.map(({ title, body, href, cta }) => ({
              key: title,
              term: title,
              detail: (
                <>
                  <p>{body}</p>
                  {/* prefetch={false}: two rows open /analyze, and the
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
          heading="Learn the BRRRR workflow"
          headingId="close-heading"
          lede="The educational guide explains the sequence, key inputs, and failure modes. It is not a substitute for a lender quote, appraisal, scope of work, or project-level cash-flow model."
          actions={
            <ActionRow>
              <Link
                href="/blog/brrrr-method-explained"
                className={buttonVariants({ size: "cta" })}
              >
                Read the BRRRR guide
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
