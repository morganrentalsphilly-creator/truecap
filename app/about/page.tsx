/**
 * /about — who builds TrueCap, and why the math is opinionated.
 *
 * E-E-A-T anchor page. Google's quality guidance (and AI search engines
 * citing us) want a real, findable human behind money-adjacent content;
 * every blog post byline and Article JSON-LD author node points here.
 * The founder is described but never named (their request, 2026-09-07);
 * schema references the site-wide Organization @id instead of a Person.
 * "Who builds this" renders AUTHOR_BIO (lib/author.ts ↔ seo/author.md), the
 * same bio every blog post and /vs page ends with, so the three never drift.
 *
 * Deliberately short and hype-free — this page earns trust by being
 * plain, not by selling. Linked from the footer bottom strip and the
 * homepage's "Built by a rental investor" block (no new top-level nav,
 * per the product principle in CLAUDE.md §1).
 *
 * Layout (DESIGN.md, 2026-09 design pass): PageHero for the head with the
 * page's one primary action, then one Section per block in BuiltByInvestor's
 * stacked reading column (the heading above the text, both on the H1's left
 * edge), and CloseSection on the 2px ink rule. The blocks run builder, tool,
 * how, why, contact. No typography plugin: each block sets its own column.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ActionRow, CloseSection, PageHero } from "@/components/marketing/page-parts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { AUTHOR_BIO } from "@/lib/author";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "About TrueCap" },
  description:
    "How TrueCap is built by one rental investor, and why the analyzer uses editable assumptions, conservative defaults, and transparent formulas.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About TrueCap",
    description:
      "How TrueCap is built by one rental investor, and why the analyzer uses editable assumptions, conservative defaults, and transparent formulas.",
    url: "/about",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "About TrueCap" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About TrueCap",
    description:
      "How TrueCap is built by one rental investor, and why the analyzer uses editable assumptions, conservative defaults, and transparent formulas.",
    images: ["/home.jpg"],
  },
};

/**
 * BuiltByInvestor's reading column (components/marketing/landing-sections.tsx):
 * the heading and its text stacked in one 68ch column, so every block shares
 * the H1's left edge. The `_CLASS` suffix keeps these class strings out of
 * the lastmod content signature (CLASS_CONST_RE in
 * seo/scripts/lib/content-signature.ts).
 */
const COLUMN_CLASS = "max-w-[68ch]";
/** Marketing body under a block's heading. */
const READING_CLASS = "mt-4 text-pretty text-lg leading-relaxed";

export default function AboutPage() {
  const siteUrl = getSiteUrl();

  // AboutPage only. The Organization + WebSite entities are defined
  // site-wide in app/layout.tsx (@id: `${siteUrl}/#organization` /
  // `${siteUrl}/#website`) — reference them, don't redefine them.
  // Blog post Article JSON-LD points its author node at the Organization
  // (see components/marketing/blog-byline.tsx).
  const aboutLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${siteUrl}/about#page`,
        url: `${siteUrl}/about`,
        name: "About TrueCap",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        mainEntity: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };

  // The page's one primary action, in the hero and again in the close. A
  // plain link, not AnalyzeCtaLink: that island fires the homepage's CTA
  // event, which would mislabel clicks from here.
  const analyzeAction = (
    <ActionRow>
      <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
        Analyze a deal free
      </Link>
    </ActionRow>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={aboutLd} />

      {/* The skip link's target, as on the homepage (app/page.tsx). */}
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="About TrueCap"
          lede="One builder, one tool, one job: turn an address into an honest answer about whether the rental works."
          actions={analyzeAction}
        />

        <article>
          {/* PageHero already draws the rule under the head. */}
          <Section rule="none" rhythm="tight" aria-labelledby="who-builds-this">
            <div className={COLUMN_CLASS}>
              <SectionHeading id="who-builds-this">Who builds this</SectionHeading>
              {/* The bio every post and /vs page ends with: lib/author.ts, which
                  must equal seo/author.md's Bio. Edit it there, not here. The
                  <p> stays the heading's next sibling (author-byline-bio.test). */}
              <p className={READING_CLASS}>{AUTHOR_BIO}</p>
            </div>
          </Section>

          {/* The tool comes right after its builder, as the lede promises. The
              saved-deal phrases stay whole on one source line each
              (pricing-copy-guards.test). */}
          <Section rhythm="tight" aria-labelledby="what-truecap-does">
            <div className={COLUMN_CLASS}>
              <SectionHeading id="what-truecap-does">What TrueCap does</SectionHeading>
              <div className={READING_CLASS}>
                <p>
                  Paste a listing and, in about 60 seconds, see whether it works at
                  the asking price, what price makes it work, and what could break
                  the deal: monthly cash flow, cap rate, cash-on-cash return, DSCR, a
                  Deal score, and the Offer Ceiling &mdash; your walk-away price
                  based on your targets.
                </p>
                <p className="mt-4">
                  The{" "}
                  <Link href="/analyze" prefetch={false} className="tc-link">
                    core analyzer
                  </Link>{" "}
                  is free with no signup, and your first complete decision is
                  included. It is built for real estate agents who screen and
                  present deals for investor clients, and for investors buying for
                  their own portfolio; both use the same analyzer.
                </p>
                <p className="mt-4">
                  A{" "}
                  <Link href="/pricing" className="tc-link">
                    paid plan
                  </Link>{" "}
                  adds unlimited saved deals you can edit, the Offer Ceiling and
                  downside checks on every deal, 10-year projections, a portfolio
                  dashboard, deal comparison, and lender-facing Pro report exports.
                  Free keeps up to 5 saved deals.
                </p>
              </div>
            </div>
          </Section>

          <Section rhythm="tight" aria-labelledby="how-the-numbers-are-built">
            <div className={COLUMN_CLASS}>
              <SectionHeading id="how-the-numbers-are-built">
                How the numbers are built
              </SectionHeading>
              <div className={READING_CLASS}>
                <p>
                  Every analysis starts from labeled inputs. Rent can start from
                  HUD&apos;s Fair Market Rent benchmark for the area and the
                  mortgage rate from FRED&apos;s national 30-year series; property
                  tax is always your local number, because no benchmark stands in
                  for an assessor&apos;s bill. Each starting value carries its
                  source label, and you can replace any of them before you rely on
                  the result.
                </p>
                <p className="mt-4">
                  The output is a decision, not a score: cash flow after
                  reserves, DSCR, cap rate, cash-on-cash return, Buy Box fit, and the
                  Offer Ceiling &mdash; the highest price that still meets your
                  targets &mdash; with the best next step and the assumptions most
                  likely to move the answer.
                </p>
                <p className="mt-4">
                  The formulas behind all of it are published and versioned on the
                  methodology page, so a partner or lender can check the math
                  instead of taking the label on faith.
                </p>
              </div>
            </div>
          </Section>

          <Section rhythm="tight" aria-labelledby="why-the-math-is-opinionated">
            <div className={COLUMN_CLASS}>
              <SectionHeading id="why-the-math-is-opinionated">
                Why the math is opinionated
              </SectionHeading>
              <div className={READING_CLASS}>
                <p>
                  Most rental calculators will produce whatever number you want to
                  see: leave vacancy at zero, skip the CapEx reserve, and everything
                  cash-flows. TrueCap&apos;s defaults lean conservative on purpose.
                  Vacancy, maintenance, and CapEx reserves are in the math from the
                  first run, and the verdict says plainly when a deal doesn&apos;t
                  work at the asking price. Every assumption is editable — the point
                  isn&apos;t to hide the levers, it&apos;s to make the first number
                  you see one you could defend to a lender. A deal that only works
                  with optimistic inputs isn&apos;t a deal, and finding that out on
                  screen is much cheaper than finding out after closing.
                </p>
                <p className="mt-4">
                  Every formula the analyzer uses is documented, down to the
                  conventions, on the{" "}
                  <Link href="/methodology" className="tc-link">
                    methodology page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Section>

          {/* The close on the 2px ink rule (FinalCta's form): the contact line
              on the left, the page's primary action again on the right. */}
          <CloseSection
            heading="Get in touch"
            headingId="get-in-touch"
            lede={
              <>
                TrueCap is a small operation, which means email actually gets read.
                Questions about the math, a number that looks off, or something you
                wish the analyzer did:{" "}
                <a href="mailto:hello@usetruecap.com" className="tc-link">
                  hello@usetruecap.com
                </a>
                .
              </>
            }
            actions={analyzeAction}
          />
        </article>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
