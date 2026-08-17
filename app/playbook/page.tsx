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
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "The First Offer Playbook",
  description:
    "The written path from screening rentals to a submitted offer: define your Buy Box, read the analysis, set your Max Offer, and make the offer — scripts included.",
  alternates: { canonical: "/playbook" },
  openGraph: {
    title: "The First Offer Playbook — TrueCap",
    description:
      "Define your Buy Box, source candidates, read the analysis, set your Max Offer, submit the offer. The whole path, written down, with scripts.",
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
      "In TrueCap, save these as your Buy Box (a Pro feature) and every analysis gets an automatic pass/fail with reasons — or keep them on a sticky note and check each analysis by hand. The tool matters less than the commitment: from now on, deals are measured against YOUR criteria, not against your mood.",
    ],
    action: "Write the five numbers down. Today, before the next listing.",
  },
  {
    id: "source",
    kicker: "Step 2",
    short: "Source deals",
    title: "Source candidates in volume — screening is a numbers game",
    paragraphs: [
      "The investors who close aren't better pickers; they screen more property. A workable rhythm for a W-2 schedule: fifteen minutes a day, every listing that's new in your target market, each one through a 60-second screen. Most fail instantly — that's the system working, not failing. A pass in 60 seconds costs you nothing; a maybe you carry around for two weeks costs you the next deal.",
      "Where to source: the listing portals for what's public, an investor-friendly agent for what's coming (tell them your Buy Box numbers — a specific ask gets specific answers), and your market's property-tax and pre-foreclosure lists when you're ready to go deeper. Start with the portals; volume beats cleverness at this stage.",
      "Track everything you screen, even the fails. Ten screened deals teach you what your market actually offers at your price point — which is exactly the calibration your Buy Box needs. This is also the honest reason TrueCap's guarantee is conditioned on analyzing ten deals: reps are where confidence comes from.",
    ],
    action: "Screen every new listing in your market this week — aim for ten.",
  },
  {
    id: "read",
    kicker: "Step 3",
    short: "Read the analysis",
    title: "Read the analysis like an underwriter, not a fan",
    paragraphs: [
      "When a deal passes the first screen, slow down exactly once: verify the assumptions before you trust the outputs. TrueCap pre-fills rent from HUD area benchmarks, the rate from FRED's national series, and taxes from state effective rates — sourced starting points, deliberately labeled, all editable. A screening benchmark is not a quote for YOUR property.",
      "Replace four numbers with local evidence before you believe any verdict: the rent (pull 3 comparable actual rentals, not asking rents), the tax bill (the county has the real number), insurance (one phone call), and the rate (a written quote for an investor loan, which is not the owner-occupant headline rate). Everything else — vacancy, maintenance, CapEx, management — keep conservative defaults until the property tells you otherwise.",
      "Then read three outputs in order: cash flow (does it hold with reserves in?), DSCR (will a lender agree?), and the downside case (raise vacancy, drop rent, bump the rate — does it survive?). A deal that only works in the sunny scenario is not a deal; it's a hope with a mortgage.",
    ],
    action: "For your best candidate: verify rent, tax, insurance, and rate with real evidence.",
  },
  {
    id: "max-offer",
    kicker: "Step 4",
    short: "Max Offer",
    title: "Set your Max Offer — the walk-away number decides, not the asking price",
    paragraphs: [
      "Here is the single most protective habit in real estate investing: decide the most you can pay BEFORE you negotiate, and never cross it. Asking price is the seller's opening position; your Max Offer is arithmetic — the highest price at which the deal still clears every number in your Buy Box, with honest expenses and your verified inputs.",
      "Work the math backwards: hold your required cash flow and cash-on-cash fixed, and solve for the purchase price that still delivers them. TrueCap Pro's Max Offer Engine computes this deterministically on every analysis (and the $5 Deal Decision Pack includes it for a single property) — but even by hand in a spreadsheet, the discipline is the same: the number exists before the negotiation starts.",
      "If the Max Offer comes out under asking, that's not a dead deal — that's your opening bid and your ceiling, both known. If it comes out way under asking, you just avoided the expensive mistake, in sixty seconds, for free. Overpaying by even 3% on a $250,000 property is $7,500 gone before the first rent check; the walk-away number is what stands between you and that.",
    ],
    action: "Compute the Max Offer on your best candidate. Write it where you'll see it during negotiation.",
  },
  {
    id: "offer",
    kicker: "Step 5",
    short: "Submit the offer",
    title: "Submit the offer — scripts included",
    paragraphs: [
      "The last blocker is the send button. Two facts make it easier: a written offer with financing and inspection contingencies is the START of a conversation, not a final commitment — you will have an inspection period and a financing condition protecting you. And a rejected offer costs nothing except the fantasy that this was the only property.",
      "To your agent: \"I'd like to submit an offer on [address] at $X — that's my number based on my underwriting, with [financing/inspection] contingencies. If they counter above $Y (your Max Offer), we pass and move to the next one. Can you have it out today?\" Notice what the script does: it commits to the number, pre-declares the ceiling, and books your exit before emotions arrive.",
      "Direct to a seller (off-market): \"I'm a local buyer purchasing rental property in [area]. Based on rents and condition, I can offer $X with a straightforward close. If that's in range, I can send a written offer this week.\" Attach your analysis — a one-page underwrite with sourced assumptions reads as serious money, because it is.",
      "Then — win or lose — go back to Step 2. The pipeline is the strategy; any single deal is just a rep.",
    ],
    action: "Send the offer at or below your Max Offer. Then screen the next deal.",
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
      "The path from screening rental listings to a submitted offer: Buy Box, sourcing, underwriting, Max Offer, offer scripts.",
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
      <main className="bg-background">
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
                address — Buy Box verdict, downside test, Max Offer, lender-ready
                report — and the risk is ours, not yours.
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
