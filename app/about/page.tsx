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
 * Layout (DESIGN.md, 2026-09 design pass): PageHero for the head, then one
 * Section per block on the homepage's 5/7 split (the heading on the rule,
 * the text beside it from 1024px, stacked below), and the close on the 2px
 * ink rule. No typography plugin: each block sets its own reading column.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-parts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
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
 * The homepage's 5/7 split (FaqSection layout="split", FinalCta). The
 * `_CLASS` suffix keeps these class strings out of the lastmod content
 * signature (CLASS_CONST_RE in seo/scripts/lib/content-signature.ts).
 */
const SPLIT_CLASS =
  "grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]";
/** Marketing body in a reading column. */
const READING_CLASS = "max-w-[68ch] text-pretty text-lg leading-relaxed";

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

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={aboutLd} />

      {/* The skip link's target, as on the homepage (app/page.tsx). */}
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="About TrueCap"
          lede="One builder, one tool, one job: turn an address into an honest answer about whether the rental works."
        />

        <article>
          {/* PageHero already draws the rule under the head. */}
          <Section rule="none" rhythm="tight" aria-labelledby="who-builds-this">
            <div className={SPLIT_CLASS}>
              <SectionHeading id="who-builds-this">Who builds this</SectionHeading>
              {/* The bio every post and /vs page ends with: lib/author.ts, which
                  must equal seo/author.md's Bio. Edit it there, not here. The
                  <p> stays the heading's next sibling (author-byline-bio.test). */}
              <p className={READING_CLASS}>{AUTHOR_BIO}</p>
            </div>
          </Section>

          <Section rhythm="tight" aria-labelledby="how-the-numbers-are-built">
            <div className={SPLIT_CLASS}>
              <SectionHeading id="how-the-numbers-are-built">
                How the numbers are built
              </SectionHeading>
              <p className={READING_CLASS}>
                Every analysis starts from labeled inputs. Rent can start from
                HUD&apos;s Fair Market Rent benchmark for the area and the
                mortgage rate from FRED&apos;s national 30-year series; property
                tax is always your local number, because no benchmark stands in
                for an assessor&apos;s bill. Each starting value carries its
                source label, and you can replace any of them before you rely on
                the result. The output is a decision, not a score: cash flow after
                reserves, DSCR, cap rate, cash-on-cash return, Buy Box fit, and the
                Offer Ceiling &mdash; the highest price that still meets your
                targets &mdash; with the best next step and the assumptions most
                likely to move the answer. The formulas behind all of it are
                published and versioned on the methodology page, so a partner or
                lender can check the math instead of taking the label on faith.
              </p>
            </div>
          </Section>

          <Section rhythm="tight" aria-labelledby="why-the-math-is-opinionated">
            <div className={SPLIT_CLASS}>
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

          <Section rhythm="tight" aria-labelledby="what-truecap-does">
            <div className={SPLIT_CLASS}>
              <SectionHeading id="what-truecap-does">What TrueCap does</SectionHeading>
              <p className={READING_CLASS}>
                Paste a listing and, in about 60 seconds, see whether it works at
                the asking price, what price makes it work, and what could break
                the deal: monthly cash flow, cap rate, cash-on-cash return, DSCR, a
                Deal score, and the Offer Ceiling &mdash; your walk-away price
                based on your targets. The{" "}
                <Link href="/analyze" prefetch={false} className="tc-link">
                  core analyzer
                </Link>{" "}
                is free with no signup, and your first complete decision is
                included. It is built for real estate agents who screen and
                present deals for investor clients, and for investors buying for
                their own portfolio; both use the same analyzer. A{" "}
                <Link href="/pricing" className="tc-link">
                  paid plan
                </Link>{" "}
                adds unlimited saved deals you can edit, the Offer Ceiling and
                downside checks on every deal, 10-year projections, a portfolio
                dashboard, deal comparison, and lender-facing Pro report exports.
                Free keeps up to 5 saved deals.
              </p>
            </div>
          </Section>

          {/* The close opens on the 2px ink rule, as FinalCta does. */}
          <Section rule="heavy" rhythm="tight" aria-labelledby="get-in-touch">
            <div className={SPLIT_CLASS}>
              <SectionHeading id="get-in-touch">Get in touch</SectionHeading>
              <p className={READING_CLASS}>
                TrueCap is a small operation, which means email actually gets read.
                Questions about the math, a number that looks off, or something you
                wish the analyzer did:{" "}
                <a href="mailto:hello@usetruecap.com" className="tc-link">
                  hello@usetruecap.com
                </a>
                .
              </p>
            </div>
          </Section>
        </article>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
