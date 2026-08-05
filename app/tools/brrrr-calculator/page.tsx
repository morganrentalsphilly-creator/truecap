import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { BrrrrCalculatorWidget } from "@/components/tools/brrrr-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Free BRRRR Calculator — Refi & Cash Left in Deal",
  description:
    "Free BRRRR calculator. Models purchase, rehab, ARV, refi LTV, and post-refi cash flow. Shows cash left in deal + infinite-return scenarios.",
  keywords: [
    "BRRRR calculator",
    "BRRRR method calculator",
    "BRRRR analysis",
    "buy rehab rent refinance repeat",
    "BRRRR strategy calculator",
    "infinite return calculator",
  ],
  alternates: { canonical: "/tools/brrrr-calculator" },
  openGraph: {
    title: "Free BRRRR Calculator — Refi & Cash Left in Deal",
    description:
      "Model the buy-rehab-rent-refinance cycle in seconds. See cash left in deal and post-refi cash flow before you commit.",
    url: "/tools/brrrr-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap BRRRR calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS = [
  {
    q: "What is the BRRRR method?",
    a: "BRRRR stands for Buy, Rehab, Rent, Refinance, Repeat. You acquire a distressed property at a discount, renovate it to force appreciation, rent it for cash flow, refinance based on the higher after-repair value (ARV) to pull most or all of your capital back out, then repeat with the recycled capital. Done well, it lets you scale a portfolio without continually injecting new capital.",
  },
  {
    q: "What is ARV?",
    a: "ARV is After-Repair Value — what the property would sell for once the rehab is complete. ARV is the single most important number in a BRRRR and the easiest to get wrong. Use recent sold comps within a half mile, of similar size and condition, that closed in the last 90-180 days. Active listings and Zestimates are not reliable comps.",
  },
  {
    q: "What's a 'good' BRRRR — when do I get my money back?",
    a: "A successful BRRRR pulls 80-100% of your invested cash back at the refi. The refi loan amount = ARV × refi LTV (typically 75%). Cash returned = refi loan − original loan paid off − refi closing costs. If your total invested (down + closing + rehab + carrying) is below or equal to that cash returned, you've achieved 'infinite return' — you own a cash-flowing property with little or none of your money in it.",
  },
  {
    q: "What refi LTV should I expect?",
    a: "Most cash-out refi lenders for investment properties cap at 75% LTV (some at 70% or 80%). Conventional non-owner-occupant cash-out is generally 75%. DSCR loan products may go to 80%. Plan for 75% in your underwrite — if you get 80% it's a bonus.",
  },
  {
    q: "How long until I can refinance — what's the seasoning period?",
    a: "Most conventional cash-out refi lenders require 6 months of seasoning (you've owned the property for 6 months). Some DSCR lenders allow refis at 3 months. Plan for 6 months unless you've confirmed a specific lender will go shorter. Carrying costs during this period — taxes, insurance, utilities, loan interest — eat into your returns.",
  },
  {
    q: "What can go wrong with a BRRRR?",
    a: "The three big risks: (1) ARV comes in lower than expected at appraisal, leaving more cash trapped in the deal; (2) Rehab costs blow past budget — always carry 10-20% contingency; (3) Rates rise between purchase and refi, increasing the new mortgage payment and reducing post-refi cash flow. A solid BRRRR can absorb one of these going wrong; two together can sink the deal.",
  },
];

export default function BrrrrCalculatorPage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap BRRRR Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/brrrr-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BRRRR Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free BRRRR calculator. Models purchase, rehab, ARV, refi LTV, and post-refi cash flow. Shows cash left in deal + infinite-return scenarios.",
    url: `${siteUrl}/tools/brrrr-calculator`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "TrueCap",
      url: "https://usetruecap.com",
    },
    featureList: [
      "Buy-Rehab-Rent-Refinance-Repeat math",
      "All-in cost vs ARV refi",
      "Cash-out + remaining capital",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/brrrr-calculator" toolName="BRRRR calculator" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />

      <div className="min-h-screen bg-background">
        <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <header className="mb-6 sm:mb-8">
            <Link href="/tools" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              BRRRR Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Buy, Rehab, Rent, Refinance, Repeat. Model the cash-out refi
              before you commit — see how much of your capital you&apos;ll
              get back, and whether the post-refi rent still cash-flows.
            </p>
          </header>

          <BrrrrCalculatorWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">The BRRRR strategy, briefly</h2>
            <p>
              BRRRR is the scaling strategy. Instead of saving a new down
              payment for every property — a 20% down requirement on a
              $250k house is $50k of cash, every time — BRRRR investors
              recycle the same capital across multiple properties by buying
              under market, forcing appreciation through rehab, refinancing
              based on the new value, and pulling most of the original
              capital back out. See the dedicated workflow for{" "}
              <Link href="/for-brrrr" className="text-primary font-semibold hover:underline">BRRRR operators</Link>{" "}
              for the full pipeline view.
            </p>

            <h2 className="text-2xl sm:text-3xl">Each letter in detail</h2>
            <h3>Buy</h3>
            <p>
              The deal is made or lost here. BRRRRs need to be purchased
              under market — typically through off-market channels (direct
              mail, wholesalers, foreclosure auctions). On-market MLS deals
              rarely have enough room for a successful BRRRR.
            </p>
            <h3>Rehab</h3>
            <p>
              The rehab forces equity. Your rehab needs to deliver enough
              ARV bump to make the refi math work. Track every expense.
              Build in 10-20% contingency on top of your contractor bid —
              surprises happen on every project.
            </p>
            <h3>Rent</h3>
            <p>
              The post-rehab rent matters in two ways: it has to support
              the new mortgage payment after refi ({" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
              ≥ 1.0 minimum, 1.25+ for most lenders), and it determines
              whether the property is worth holding long-term once your
              capital is out.
            </p>
            <h3>Refinance</h3>
            <p>
              The refi turns paper equity into real cash you can deploy.
              Most cash-out refi lenders require 6 months of seasoning and
              cap LTV at 75%. The refi loan amount = ARV × 75% (or whatever
              your LTV cap is). Subtract the original loan you&apos;re
              paying off plus refi closing costs to get the cash returned.
            </p>
            <h3>Repeat</h3>
            <p>
              With your capital recycled, you can start the cycle on
              another property. Done well, this lets you scale from one
              property to many without continually saving new capital.
            </p>

            <h2 className="text-2xl sm:text-3xl">What &ldquo;infinite return&rdquo; means</h2>
            <p>
              If your refi pulls all your invested cash back out, you own
              a cash-flowing property with $0 of your money in it. Annual
              cash flow ÷ $0 = infinite return. That&apos;s the BRRRR
              holy grail.
            </p>
            <p>
              In practice, most BRRRRs leave $5-15k in the deal. That&apos;s
              still a great outcome — recycling 80-95% of your capital lets
              you scale 5-10× faster than traditional buy-and-hold.
            </p>

            <h2 className="text-2xl sm:text-3xl">Common BRRRR mistakes</h2>
            <h3>Optimistic ARV</h3>
            <p>
              The single most common BRRRR failure: the appraisal comes in
              below your assumed ARV, the refi loan is smaller than
              expected, and more of your capital is trapped. Always use
              recent sold comps, not Zestimates or active listings.
            </p>
            <h3>Underestimating rehab</h3>
            <p>
              Every renovation has surprises. Walls hide rot, electrical
              isn&apos;t to code, plumbing needs replacement. Carry 10-20%
              contingency above your contractor bid. If the contractor says
              $45k, plan for $52k. Our guide on{" "}
              <Link href="/blog/how-to-estimate-rehab-costs" className="text-primary font-semibold hover:underline">how to estimate rehab costs</Link>{" "}
              walks through per-sq-ft benchmarks and the line items that
              most often blow budgets.
            </p>
            <h3>Ignoring carrying costs</h3>
            <p>
              From close to refi, you&apos;re paying mortgage, taxes,
              insurance, and utilities with no rent coming in. Six months
              of carrying costs can be $5-10k. Forgetting this in the
              budget leaves you short at the refi.
            </p>
            <h3>Refi rate shock</h3>
            <p>
              Rates change. The 6.5% you underwrote for the refi might be
              7.5% when you actually close. Stress-test your post-refi cash
              flow at a 1pp higher rate. For the deeper refi math
              (DSCR, LTV, cash-out timing), see our walkthrough on{" "}
              <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">how to refinance a rental property</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="bg-card border border-border rounded-lg p-4 group">
                  <summary className="font-semibold text-foreground cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
                </details>
              ))}
            </div>
          </article>

          <section className="mt-10 sm:mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">BRRRRs deserve a saved pipeline</h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              Running ten BRRRRs to find one that works? TrueCap saves
              every analysis, compares them side by side, and exports the
              best ones as one-page PDFs to share with your lender.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Save your BRRRRs — up to 5 free, unlimited with Pro",
                "Compare 2–4 side by side (Pro)",
                "10-year post-refi projection with rent growth (Pro)",
                "Tax savings + exit scenario modeling (Pro)",
                "Rehab cost estimator with sq-ft defaults",
                "Free to start",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              Open the full TrueCap analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Backlink engine — quiet, collapsed, renders nothing if this

              tool has no embeddable widget. See the component header. */}

          <ToolEmbedInvite slug="brrrr-calculator" />


          <ToolsConversionCta calculatorName="BRRRR calculator" hook="In TrueCap, the BRRRR analyzer plugs into your real numbers (rent, op-ex, financing) and shows post-refi cash flow + cash-left-in-deal + infinite-return alerts. Save and share." />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">TrueCap</Link>{" "}
            — institutional-grade rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
