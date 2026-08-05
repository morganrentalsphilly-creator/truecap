import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { RehabEstimatorCard } from "@/components/investcalc/rehab-estimator-card";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Free Rehab Cost Estimator — Budget by Sq Ft",
  description:
    "Free rehab cost estimator for flips, BRRRRs, and value-add rentals. Sq-ft defaults for cosmetic, kitchen, bath, and systems. Plus how to budget accurately.",
  keywords: [
    "rehab cost estimator",
    "rehab calculator",
    "renovation cost calculator",
    "fix and flip rehab estimator",
    "BRRRR rehab budget",
    "rental property rehab",
  ],
  alternates: { canonical: "/tools/rehab-cost-estimator" },
  openGraph: {
    title: "Free Rehab Cost Estimator — Budget by Sq Ft",
    description:
      "Estimate rehab cost in seconds with sq-ft-based defaults for every common work item. Plus a how-to on building a defensible budget.",
    url: "/tools/rehab-cost-estimator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap rehab cost estimator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS = [
  {
    q: "How accurate is a sq-ft-based rehab estimate?",
    a: "Directional, not bid-quality. The defaults in this tool are mid-market 2024-25 contractor pricing surveys. Real bids vary 30-50% based on local labor rates, material availability, scope clarity, and contractor markup. Use this estimator to triage deals; get three real bids before committing.",
  },
  {
    q: "What contingency should I budget?",
    a: "10% on a cosmetic rehab, 15-20% on anything that touches structure, electrical, or plumbing. The bigger the project, the more surprises hide behind walls. Investors who skip contingency consistently blow budgets.",
  },
  {
    q: "Should I include holding costs in the rehab budget?",
    a: "Treat them separately. Rehab cost = labor + materials + permits + dumpster + supervision. Holding costs (mortgage interest, taxes, insurance, utilities while no rent is coming in) are a separate line item. The TrueCap BRRRR and Fix-and-Flip calculators handle both — the rehab cost from this tool flows into the rehab input, holding costs get computed separately from your financing assumptions.",
  },
  {
    q: "How do I estimate a kitchen renovation?",
    a: "Three tiers: (1) refresh — paint cabinets, new hardware, new faucet, $4-7k. (2) Mid-grade — IKEA cabinets, butcher block or quartz tops, new appliances, ~$22-30k. (3) Full custom — custom cabinets, premium countertops, professional installation, $40k+. Most rental flips and BRRRRs land in tier 2.",
  },
  {
    q: "What's a typical full-gut rehab cost?",
    a: "$80-150 per square foot in most US markets, $200-400 in high-cost coastal cities. Full gut = strip to studs, all-new systems (electrical, plumbing, HVAC), new windows, full finish. A 1,500 sqft full gut runs $120-225k mid-market, $300-600k in HCOL cities.",
  },
  {
    q: "Should I get one big bid or itemize?",
    a: "Itemize when you can. A lump-sum bid lets the contractor pad. An itemized bid forces transparency on which line items are real costs vs. markup. For BRRRR investors, itemized bids also make change orders less expensive when the inevitable surprises appear.",
  },
];

export default function RehabEstimatorPage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap Rehab Cost Estimator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/rehab-cost-estimator`,
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
    name: "Rehab Cost Estimator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free rehab cost estimator for flips, BRRRRs, and value-add rentals. Sq-ft defaults for cosmetic, kitchen, bath, and systems. Plus how to budget accurately.",
    url: `${siteUrl}/tools/rehab-cost-estimator`,
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
      "Per-sqft + per-room rehab cost estimates",
      "Light, medium, heavy renovation tiers",
      "Cosmetic, kitchen, bath, and systems work",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/rehab-cost-estimator" toolName="Rehab cost estimator" />
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
              Rehab Cost Estimator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Sq-ft-based pricing for every common rehab work item — paint,
              flooring, kitchens, baths, roofs, HVAC, electrical, plumbing.
              Mid-market defaults you can override. Use it to triage flips
              and BRRRRs before committing to detailed contractor bids.
            </p>
          </header>

          <RehabEstimatorCard />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">Why an estimator at all?</h2>
            <p>
              You can&apos;t underwrite a flip or BRRRR without a rehab
              number. You also can&apos;t get a real contractor bid on every
              property you&apos;re considering. The fix is a sq-ft-based
              estimator: directional enough to filter the universe of
              potential deals down to the 10% worth a real bid.
            </p>
            <p>
              This tool ships with 2024-25 mid-market defaults for every
              common rehab work item. Pick the scope, the calculator does
              the math, you get a number in seconds. Then add a contingency
              percentage (10-20% is standard) and you have a defensible
              budget. For the full methodology behind these numbers, read{" "}
              <Link href="/blog/how-to-estimate-rehab-costs" className="font-semibold text-primary hover:underline">how to estimate rehab costs</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">How to use the estimator</h2>
            <ol>
              <li>
                <strong>Set the sqft and bath count.</strong> Defaults to
                the property values if available; you can override.
              </li>
              <li>
                <strong>Click &ldquo;Pick work items&rdquo;</strong> to
                expand the catalog and select what the property needs.
              </li>
              <li>
                <strong>Adjust the contingency percentage.</strong> 10% for
                light cosmetic, 15-20% for anything touching systems or
                structure.
              </li>
              <li>
                <strong>Use the total as your underwriting input.</strong>{" "}
                When you run the full{" "}
                <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">BRRRR calculator</Link>{" "}
                or Fix-and-Flip in TrueCap, the
                rehab estimator&apos;s total flows in as the default. New to
                the strategy? Start with{" "}
                <Link href="/blog/brrrr-method-explained" className="font-semibold text-primary hover:underline">the BRRRR method explained</Link>.
              </li>
            </ol>

            <h2 className="text-2xl sm:text-3xl">Cost categories explained</h2>
            <h3>Cosmetic ($3-15/sqft)</h3>
            <p>
              The cheap stuff that makes a rental show well: interior paint,
              new flooring (LVP is the rental standard), updated light
              fixtures and hardware, basic landscaping. Most rentals only
              need cosmetic work between tenants.
            </p>
            <h3>Kitchen ($5k refresh → $40k+ full reno)</h3>
            <p>
              The single biggest single-room cost driver. Three tiers:
              refresh (paint cabinets, hardware, faucet), mid-grade (IKEA
              cabinets, quartz, new appliances), or custom. Investors should
              almost never do custom kitchens in a rental.
            </p>
            <h3>Bath ($3k refresh → $16k full reno per bath)</h3>
            <p>
              Costs multiply by bath count. A house with 2 baths and a full
              bath reno is $30-40k. The tool multiplies bath items by bath
              count automatically.
            </p>
            <h3>Systems ($1.5k-12k per item)</h3>
            <p>
              Roof, HVAC, water heater, electrical panel, plumbing. These
              are the items that turn a deal from &ldquo;cosmetic flip&rdquo;
              into &ldquo;heavy rehab.&rdquo; They&apos;re also where
              inspection-discovered surprises live.
            </p>
            <h3>Structural ($8k-12k typical)</h3>
            <p>
              New windows, exterior repair, foundation work. Sometimes
              uncovered after demo; budget contingency to absorb at least
              one structural surprise.
            </p>

            <h2 className="text-2xl sm:text-3xl">Common rehab budgeting mistakes</h2>
            <h3>1. Skipping contingency</h3>
            <p>
              Every rehab has at least one surprise. Plumbing was wrong, the
              floor needed replacement instead of refinishing, the
              contractor found rot. Without 10-20% contingency, that one
              surprise eats your margin.
            </p>
            <h3>2. Ignoring soft costs</h3>
            <p>
              Permits, dumpster rentals, temporary power, project management
              fees, lockbox + key copies — soft costs add up to 5-10% on top
              of the materials and labor estimate. The defaults in this
              tool roll those in.
            </p>
            <h3>3. Underestimating bath multiplication</h3>
            <p>
              A 3-bath house with a $9.5k mid-grade bath reno per bath is
              $28.5k just on bathrooms. Investors often anchor on
              &ldquo;one bath&rdquo; cost and forget to multiply.
            </p>
            <h3>4. Confusing &ldquo;estimate&rdquo; with &ldquo;bid&rdquo;</h3>
            <p>
              This estimator is for underwriting and triage. Before
              committing, get three written bids from licensed contractors.
              Real bids vary 30-50% from this estimator depending on the
              market and the contractor.
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
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Plug the estimate into a full BRRRR or flip</h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              The rehab number is one input. TrueCap runs the full BRRRR
              (cash-out math, post-refi cash flow, infinite return detection)
              and Fix-and-Flip (net profit, ROI, annualized, profit per day)
              with the rehab estimate flowing in automatically.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Rehab estimator total flows into BRRRR + Flip inputs",
                "BRRRR: cash left in deal, post-refi CF, infinite-return detection",
                "Fix-and-Flip: net profit, ROI, annualized ROI, profit/day, break-even ARV",
                "Save up to 5 deals free — unlimited with Pro",
                "Compare side-by-side (Pro)",
                "Export a lender-ready PDF — $5 one-time, or unlimited with Pro",
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

          <ToolEmbedInvite slug="rehab-cost-estimator" />


          <ToolsConversionCta calculatorName="Rehab estimator" hook="TrueCap connects rehab budget straight into the BRRRR + fix-and-flip analyzers — so you can see whether the rehab pays for itself after refi or sale." />

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
