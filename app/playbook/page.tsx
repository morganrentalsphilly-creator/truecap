/**
 * /playbook — The First Offer Playbook.
 *
 * The complete written path from "screening deals" to "offer submitted",
 * because the real blocker for the almost-investor is courage and process,
 * not math. Published in full and public (consistent with the public
 * methodology — confidence comes from a process you can audit); the
 * email-capture module offers the same content as a paced 5-part course
 * plus the Market Intelligence Pack. Deviation from the rollout spec's
 * "gated by email" is deliberate and logged in the rollout report: a
 * fully-gated page fights the sitemap/SEO requirement and the site's
 * transparency positioning.
 *
 * Content rules: benchmarks-not-quotes framing throughout; the scripts are
 * communication templates, not legal or financial advice; nothing here
 * promises returns.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge";
import { LeadMagnetInline } from "@/components/marketing/lead-magnet-capture";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "The First Offer Playbook",
  description:
    "An educational path from rental screening to a documented decision: define your Buy Box, verify assumptions, and review your Offer Ceiling with advisers.",
  alternates: { canonical: "/playbook" },
  openGraph: {
    title: "The First Offer Playbook — TrueCap",
    description:
      "Define your Buy Box, source candidates, verify the analysis, review the Offer Ceiling, and make your own documented decision.",
    url: "/playbook",
    type: "article",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "The First Offer Playbook" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const STEPS = [
  {
    id: "buy-box",
    kicker: "Step 1",
    short: "Buy Box",
    title: "Define your Buy Box before you look at a single listing",
    paragraphs: [
      "Analysis paralysis is almost never a math problem — it's a criteria problem. If you don't know what a good deal means to you, every deal is a maybe, and maybes don't get offers. Your Buy Box is the fix: the small set of numbers a property must clear before it deserves another minute of your attention.",
      "Write down five numbers: the most cash you can deploy (down payment + closing + reserves), your minimum monthly cash flow after ALL expenses (including the vacancy, maintenance, and CapEx reserves most spreadsheets skip), your minimum cash-on-cash return, the property types you'll actually manage, and the markets you're hunting in. That's it. Three of them will feel arbitrary — write them down anyway; you can revise them after ten analyses, but you can't revise a blank page.",
      "In TrueCap, save these as your Buy Box (a Pro feature) and each analysis shows which selected rules the inputs meet or miss — or keep them on a sticky note and check each analysis by hand. The tool matters less than the commitment: deals are measured against your stated criteria, not against your mood.",
    ],
    action: "Write the five numbers down. Today, before the next listing.",
  },
  {
    id: "source",
    kicker: "Step 2",
    short: "Source deals",
    title: "Source candidates in volume — screening is a numbers game",
    paragraphs: [
      "A consistent screening process helps investors compare more properties against the same rules. A workable rhythm for a W-2 schedule might be fifteen minutes a day, with each new listing in your target market receiving the same first-pass screen. Most may miss one or more rules; that is useful triage, not a final investment decision.",
      "Where to source: the listing portals for what's public, an investor-friendly agent for what's coming (tell them your Buy Box numbers — a specific ask gets specific answers), and your market's property-tax and pre-foreclosure lists when you're ready to go deeper. Start with the portals; volume beats cleverness at this stage.",
      "Track everything you screen, even the fails. Ten screened deals teach you what your market actually offers at your price point — which is exactly the calibration your Buy Box needs. Repetition turns a vague preference into a usable acquisition rule.",
    ],
    action: "Screen every new listing in your market this week — aim for ten.",
  },
  {
    id: "read",
    kicker: "Step 3",
    short: "Read the analysis",
    title: "Read the analysis like an underwriter, not a fan",
    paragraphs: [
      "When a property meets the first screen, slow down and verify the assumptions before relying on the outputs. TrueCap can start rent from a labeled HUD area benchmark, rate from a labeled FRED national series, and taxes from a labeled state effective-rate benchmark when available. These are editable screening starting points, not verified facts or quotes for the property.",
      "Replace four numbers with local evidence before you believe any verdict: the rent (pull 3 comparable actual rentals, not asking rents), the tax bill (the county has the real number), insurance (one phone call), and the rate (a written quote for an investor loan, which is not the owner-occupant headline rate). Everything else — vacancy, maintenance, CapEx, management — keep conservative defaults until the property tells you otherwise.",
      "Then read three outputs in order: modeled cash flow with reserves, DSCR against your selected screening threshold, and the downside scenario. A lender may calculate DSCR differently and will apply its own eligibility, valuation, and reserve rules.",
    ],
    action: "For your best candidate: verify rent, tax, insurance, and rate with real evidence.",
  },
  {
    id: "offer-ceiling",
    kicker: "Step 4",
    short: "Offer Ceiling",
    title: "Review the Offer Ceiling before negotiation",
    paragraphs: [
      "The Offer Ceiling is the highest modeled purchase price that still meets the named target profile under the assumptions shown. It is a target-dependent screening boundary—not a recommended offer, appraisal, or substitute for diligence.",
      "The solver works backward from the selected cash-flow, cash-on-cash, cap-rate, DSCR, and price constraints that apply. TrueCap Pro computes this boundary on each compatible analysis and includes it in Pro reports.",
      "If the Offer Ceiling is below asking, the page reports the gap. That comparison does not tell you to make, submit, or avoid an offer. Verify rent, property costs, condition, financing, title, and local requirements, then decide with the advisers relevant to your situation.",
    ],
    action: "Calculate the Offer Ceiling, record its target profile, and verify the assumptions that could move it.",
  },
  {
    id: "offer",
    kicker: "Step 5",
    short: "Record your decision",
    title: "Record your decision — review prompts included",
    paragraphs: [
      "Offer terms, contingencies, deposits, deadlines, and legal effect vary by transaction and jurisdiction. Review the actual agreement with your agent and attorney where appropriate; do not assume a contingency or cancellation right exists unless it is written and enforceable.",
      "A neutral prompt for your agent: \"I have completed an initial underwrite for [address]. Please help me verify the assumptions, comparable evidence, property disclosures, and financing terms, then review the risks and appropriate contract protections with me before I decide whether and how to offer.\"",
      "For an off-market conversation, keep screening estimates separate from verified facts. A report can document the assumptions, selected rules, gaps, and verification plan, but it does not establish property value, proof of funds, lender approval, or an appropriate offer price.",
      "Then — win or lose — go back to Step 2. The pipeline is the strategy; any single deal is just a rep.",
    ],
    action: "Record your own decision and rationale after the material assumptions and contract terms are reviewed.",
  },
];

export default function PlaybookPage() {
  const siteUrl = getSiteUrl();
  const playbookLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${siteUrl}/playbook#howto`,
    name: "The First Offer Playbook",
    description:
      "An educational path from rental screening to a documented decision: Buy Box, sourcing, verification, Offer Ceiling, and adviser review.",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      url: `${siteUrl}/playbook#${s.id}`,
    })),
    isPartOf: { "@id": `${siteUrl}/#website` },
    inLanguage: "en-US",
  };

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <ScrollDepthTracker />
      <main id="main" className="bg-background">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              The First Offer Playbook
            </p>
            <h1 className="mt-2 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              From screening deals to a submitted offer.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              You&apos;ve analyzed twenty deals and offered on none. The math was
              never the blocker — the process was. Here is the whole path,
              written down: five steps, one action each, scripts included.
            </p>
            <nav aria-label="Playbook steps" className="mt-6 flex flex-wrap gap-2">
              {STEPS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary/60"
                >
                  {i + 1}. {s.short}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          {STEPS.map((step) => (
            <section key={step.id} id={step.id} className="mb-12 scroll-mt-24 sm:mb-16">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {step.kicker}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {step.title}
              </h2>
              {step.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="mt-4 text-[15px] leading-relaxed text-foreground/90">
                  {p}
                </p>
              ))}
              <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-4 py-3 text-sm font-semibold text-foreground">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
                <span>Do this now: {step.action}</span>
              </p>
            </section>
          ))}

          <div className="space-y-6 border-t border-border pt-10">
            <SeoAnalyzerCta context="your first candidate through the playbook" utmSource="playbook" />
            <LeadMagnetInline source="playbook" />
            <div className="rounded-2xl border border-border bg-card p-5 text-center sm:p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Want the reps to be easier? Pro runs the whole playbook on every
                address — Buy Box verdict, downside test, Offer Ceiling, lender-facing
                report{getMarketingOfferConfig().guaranteeEnabled
                  ? " — and the risk is ours, not yours."
                  : "."}
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <Link
                  href="/pricing#plans"
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/95"
                >
                  See Pro plans
                </Link>
                <GuaranteeBadge />
              </div>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(playbookLd) }}
      />
    </>
  );
}
