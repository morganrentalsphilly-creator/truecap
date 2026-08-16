/**
 * /about — who builds TrueCap, and why the math is opinionated.
 *
 * E-E-A-T anchor page. Google's quality guidance (and AI search engines
 * citing us) want a real, findable human behind money-adjacent content;
 * every blog post byline and Article JSON-LD author node points here.
 * The Person entity is anchored at `${siteUrl}/about#morgan` so schema
 * across the site can reference one consistent @id.
 *
 * Deliberately short and hype-free — this page earns trust by being
 * plain, not by selling. Linked from the footer bottom strip only
 * (no new top-level nav, per the product principle in CLAUDE.md §1).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About",
  description:
    "TrueCap is built by Morgan Page, a Philadelphia rental investor who underwrites his own deals with it. Why the defaults are conservative, what the analyzer does, and how to reach him.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About TrueCap — who builds it and why the math is conservative",
    description:
      "TrueCap is built by Morgan Page, a Philadelphia rental investor who underwrites his own deals with it.",
    url: "/about",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "About TrueCap" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function AboutPage() {
  const siteUrl = getSiteUrl();

  // AboutPage + Person. The Organization + WebSite entities are defined
  // site-wide in app/layout.tsx (@id: `${siteUrl}/#organization` /
  // `${siteUrl}/#website`) — reference them, don't redefine them.
  // Blog post Article JSON-LD points its author node at
  // `${siteUrl}/about#morgan` (see components/marketing/blog-byline.tsx).
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
        mainEntity: { "@id": `${siteUrl}/about#morgan` },
        inLanguage: "en-US",
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/about#morgan`,
        name: "Morgan Page",
        url: `${siteUrl}/about`,
        description:
          "Philadelphia rental investor and the founder of TrueCap. Builds the analyzer he underwrites his own deals with.",
        jobTitle: "Founder",
        worksFor: { "@id": `${siteUrl}/#organization` },
        email: "hello@usetruecap.com",
        // sameAs intentionally omitted — Morgan supplies his public
        // profile URLs (LinkedIn / X / BiggerPockets / etc.). When he
        // does, add them here as:
        //   sameAs: ["https://www.linkedin.com/in/…", …],
        // Do NOT invent or guess profile links; a wrong sameAs is worse
        // than none.
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            About TrueCap
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            One builder, one tool, one job: turn an address into an honest
            answer about whether the rental works.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_strong]:text-foreground">
          <h2 className="text-2xl sm:text-3xl">Who builds this</h2>
          <p>
            TrueCap is built by one person: <strong>Morgan Page</strong>, a
            rental investor in Philadelphia. It started as the tool he wanted
            for his own underwriting — a way to get from an address to a
            defensible answer in about a minute — and it&apos;s still how he
            runs the deals he considers.
          </p>

          <h2 className="text-2xl sm:text-3xl">Why the math is opinionated</h2>
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
          <p>
            Every formula the analyzer uses is documented, down to the
            conventions, on the{" "}
            <Link href="/methodology" className="font-bold text-foreground hover:underline">
              methodology page
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">What TrueCap does</h2>
          <p>
            Type an address and get a full underwrite in about 60 seconds:
            monthly cash flow, cap rate, cash-on-cash return, DSCR, 10-year
            projections, and a plain-English verdict. The{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              core analyzer
            </Link>{" "}
            is free with no signup. A{" "}
            <Link href="/pricing" className="font-bold text-foreground hover:underline">
              paid plan
            </Link>{" "}
            adds saved deals, a portfolio dashboard, deal comparison, and
            lender-facing Deal Decision Pack exports.
          </p>

          <h2 className="text-2xl sm:text-3xl">Get in touch</h2>
          <p>
            TrueCap is a small operation, which means email actually gets
            read. Questions about the math, a number that looks off, or
            something you wish the analyzer did:{" "}
            <a
              href="mailto:hello@usetruecap.com"
              className="font-bold text-foreground hover:underline"
            >
              hello@usetruecap.com
            </a>
            .
          </p>
        </article>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
