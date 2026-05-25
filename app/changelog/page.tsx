/**
 * /changelog — public release notes.
 *
 * Two jobs:
 *
 *   1. Trust signal — prospects evaluating TrueCap want to know "is
 *      this an actively-shipped product or abandoned?" A live
 *      changelog with dated entries answers that immediately.
 *
 *   2. Re-engagement — existing users have a reason to come back to
 *      see what's new. Email it after big shipments for retention.
 *
 * Entries are a hardcoded array. Add to the top as new things ship.
 * Categories ('Feature', 'Improvement', 'Fix', 'Content') help users
 * scan for what's relevant to them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Wrench, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Changelog | TrueCap",
  description:
    "What's new in TrueCap — features, improvements, fixes, and content. Updated as we ship.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "TrueCap Changelog",
    description: "What's new in TrueCap — features, improvements, fixes, and content.",
    url: "/changelog",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap changelog" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Category = "Feature" | "Improvement" | "Fix" | "Content";

type Entry = {
  date: string; // ISO date
  category: Category;
  title: string;
  description: string;
};

const CATEGORY_STYLES: Record<Category, { icon: typeof Sparkles; color: string; bg: string }> = {
  Feature: { icon: Sparkles, color: "text-primary", bg: "bg-[var(--brand-blue-light)]" },
  Improvement: { icon: Zap, color: "text-[var(--brand-green)]", bg: "bg-[var(--brand-green)]/10" },
  Fix: { icon: Wrench, color: "text-[var(--metric-negative)]", bg: "bg-[var(--metric-negative)]/10" },
  Content: { icon: FileText, color: "text-foreground", bg: "bg-muted" },
};

const ENTRIES: Entry[] = [
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Templates no longer wipe form data",
    description:
      "Clicking a strategy template (Long-term rental / House hack / FHA) used to clear the address, purchase price, rent, and beds you'd already typed — making the calculator appear broken. Templates now only update the financing & expense defaults; your property data is preserved.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Compare deals no longer locks up",
    description:
      "The compare page used to AWAIT a Supabase write on every render — on slow connections this hung the whole page. The write is now fire-and-forget. Also: double-click guard on Compare Selected button, plus stale-cookie recovery if the cookie holds deals that no longer exist.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Owner-occupant scoring labels — corrected",
    description:
      "Score breakdown now uses the right thresholds and max-points for owner-occupant deals (30-point cash-flow tier with $300/mo bands, not the investor 25-point / $1,000 band). DSCR breakdown also reads 'N/A — all-cash purchase' on cash deals instead of the misleading 'Above 1.25'.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Blog moved out of top header",
    description:
      "Blog link no longer crowds the auth'd-user header next to Dashboard. Still linked from the footer Product column and from every blog post's related-posts footer — discoverability intact.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Portfolio rollup on saved-analyses dashboard",
    description:
      "Sticky header strip across saved deals: total monthly cash flow, total deal value, weighted cap rate, weighted CoC. Turns the saved-deals list into a portfolio command center. Self-hides for <2 deals.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Cash flow waterfall — where every rent dollar goes",
    description:
      "Single-glance horizontal bar showing gross rent decomposed into vacancy, every OpEx line, debt service, and net cash flow (or shortfall). Sits above the existing detailed breakdown. Mobile-friendly legend layout.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Mortgage scenario A/B comparison (Pro)",
    description:
      "Click-to-open side-by-side: current financing vs +5pp down, 15-year term, DSCR loan at +1.5%. Compares monthly P&I, cash flow, DSCR, CoC, and cash required. Free users see a one-line teaser pointing at /pricing.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Deal verdict explanation — 'Why this score?'",
    description:
      "Each subscore tile now has a plain-English subline ('Above 1.25 — clears lender threshold'), and a collapsible block explains how the score was computed and what would move it. Default surface stays clean — disclosure is opt-in.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Inline benchmarks under key metrics",
    description:
      "Cap rate, CoC, and Monthly Cash Flow tiles now show a market-context subline ('Above 8% — top quartile') alongside the number. Matches DSCR's existing inline benchmark pattern.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Quick-start strategy templates",
    description:
      "Three one-click presets on the empty calculator: Long-term rental, House hack, FHA 3.5% down. Each seeds strategy-correct defaults (down %, vacancy, mgmt) so you don't have to remember 'for FHA I need...'",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Homepage hero cleanup — less crowded, same conversion intent",
    description:
      "Removed the standalone deals-ticker (trust tiles already cover this), hid the product mockup on mobile (~500px scroll saved), tightened the persona row to 2 clickable links, removed duplicate SSL line and the scroll arrow. Hero is faster to scan on first paint.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Persona landing pages — /for-agents + /for-flippers",
    description:
      "Tightly-targeted landing pages with persona-specific value props and use cases. Designed as paid-ad landing surfaces where ad copy and LP messaging align ('Underwrite for your investor clients' → agents, 'Model your next flip in 60 seconds' → flippers).",
  },
  {
    date: "2026-05-24",
    category: "Content",
    title: "/markets/philadelphia — first local-SEO landing",
    description:
      "Substantive Philly-specific page: cap rate benchmarks by neighborhood, PA property tax mechanics, BRRRR-in-Philly notes, rental licensing requirements, and 6 city-specific FAQs. Prototype for additional markets if this performs.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Onboarding tour for new signups",
    description:
      "Floating 3-step card walks first-signup users through Try Sample → Save your first deal → See what Pro unlocks. Only fires for authenticated users with zero saved deals; persists dismiss to localStorage.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Real 'deals analyzed this week' trust ticker",
    description:
      "Aggregate count from Supabase rendered as a small badge in the hero. Threshold-gated so low numbers don't anti-prove — only shows when count exceeds 25. Cached server-side, refreshes every 5 minutes.",
  },
  {
    date: "2026-05-24",
    category: "Content",
    title: "/methodology page — every formula and data source",
    description:
      "Comprehensive transparency page explaining exactly how TrueCap computes cap rate, CoC, DSCR, projections, tax savings, and exit scenarios. Plus where the auto-fill data comes from (HUD FMR, FRED, state property tax) and the conventions we chose.",
  },
  {
    date: "2026-05-24",
    category: "Content",
    title: "5th blog post + Real Estate Glossary",
    description:
      "Strategy deep-dive: 'Cash flow vs appreciation — which actually wins in 2026?'. Plus a new /glossary page with 23 plain-English term definitions, each cross-linked to the matching calculator and deeper-dive blog post.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Cookie consent (Google Consent Mode v2)",
    description:
      "GDPR/CCPA-compliant banner. Tracking cookies stay denied until the user explicitly accepts. Google Ads + Analytics still receive anonymous pings so we get bounce signal without setting personal-data cookies before consent.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Homepage hero now ships zero JS",
    description:
      "Converted the marketing hero from a client component to a server component. The single click handler that needed client behavior is now a tiny isolated island. Real LCP improvement on the page every paid-traffic visitor lands on first.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Blog posts get a sticky CTA",
    description:
      "Long-form readers now see a persistent 'Open analyzer' bar after scrolling past the article hero. Catches high-intent readers mid-engagement so they don't have to scroll to the bottom to find a conversion path.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Interactive ROI calculator on /pricing",
    description:
      "Plug in your deals-per-month and hourly rate; the pricing page shows time saved, dollar value, and how many deals Pro pays for itself after. Uses your real Stripe-loaded price for live accuracy.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Post-analysis signup prompt for anonymous users",
    description:
      "After a free analysis, anonymous visitors now see a 'Save [your address] for later' card with one-tap Google signup. Soft conversion ask — even users not ready for Pro can save their work and come back.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Welcome-back banner shows your saved address",
    description:
      "The auto-save banner now reads 'Welcome back — your draft for [1700 W Erie Ave] is ready' so returning users instantly recognize their work. One-click 'start fresh' for shared-device cases.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Comprehensive mobile UX pass",
    description:
      "Calculator number fields now use the numeric keypad on iOS/Android (no more QWERTY hell). All tap targets meet the 44pt standard. Tables overflow-x scroll on narrow viewports. Hero copy adapts at 375px. Password show/hide buttons 5x larger tap area.",
  },
  {
    date: "2026-05-24",
    category: "Content",
    title: "4 anchor blog posts on rental underwriting",
    description:
      "60-second underwriting walkthrough. Cap rate vs cash-on-cash vs DSCR comparison. DSCR loans explained. What's a good cap rate in 2026. Each post deep-links to the matching calculator and funnels into the full analyzer.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Google sign-in (one-tap signup)",
    description:
      "Sign up or log in with your Google account — no email confirmation round-trip, no password to invent. Existing email/password accounts merge automatically when the email matches.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Auto-save calculator drafts",
    description:
      "Your inputs are now saved automatically as you type. Get distracted, close the tab, come back tomorrow — your draft is restored with a 'Welcome back, your draft for [address] is ready' banner. Includes a one-click 'start fresh' affordance for shared devices.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Two new free calculators",
    description:
      "Mortgage payment calculator (full PITI breakdown with investment-property rate context) and GRM (Gross Rent Multiplier) calculator (10-second screening ratio). Nine free calculators now live at /tools.",
  },
  {
    date: "2026-05-23",
    category: "Feature",
    title: "Pro feature gating overhaul",
    description:
      "MAO solver, sensitivity grid, BRRRR + fix-and-flip strategies, and shareable read-only deal links moved to Pro. Free users still see locked previews so they know what's available.",
  },
  {
    date: "2026-05-23",
    category: "Improvement",
    title: "Try a sample deal — one-click demo",
    description:
      "Cold visitors see a 'Try a sample deal' button next to the analyzer's H1. One click pre-fills a realistic Philadelphia rental and runs the full analysis. Best friction-killer we shipped this month.",
  },
  {
    date: "2026-05-23",
    category: "Improvement",
    title: "Annual/Monthly toggle on /pricing",
    description:
      "Pricing page now shows annual + monthly side-by-side with a toggle that swaps the visible price, period, and savings badge. Defaults to annual (anchors on the higher-LTV plan).",
  },
  {
    date: "2026-05-22",
    category: "Content",
    title: "Five new SEO calculator pages",
    description:
      "Standalone pages for cap rate, cash-on-cash, BRRRR, 1% rule, and rehab cost estimator — each with a working widget, long-form content, FAQ schema, and a funnel into the full analyzer.",
  },
  {
    date: "2026-05-21",
    category: "Feature",
    title: "Shareable read-only deal links (Pro)",
    description:
      "Generate a one-click read-only link to share an analysis with your lender or partner. Each link renders a dedicated /d/[encoded] page with a custom OG preview image showing address + key metrics + verdict.",
  },
  {
    date: "2026-05-20",
    category: "Feature",
    title: "Address auto-fill (HUD + FRED + state tax)",
    description:
      "Type a property address; we auto-fill market rent from HUD Fair Market Rent, current 30-yr fixed rate from FRED, and effective property tax from your state's averages. All editable.",
  },
  {
    date: "2026-05-19",
    category: "Feature",
    title: "10-year projection with tax strategy",
    description:
      "Pro users get a full 10-year cash flow projection including rent growth, expense growth, mortgage paydown, depreciation tax savings, and after-tax cash flow.",
  },
  {
    date: "2026-05-18",
    category: "Feature",
    title: "Deal Score + AI verdict (Pro)",
    description:
      "Every analyzed property gets a 0-100 score with risk level (Conservative / Balanced / Aggressive / High Risk) and a plain-English explanation of why the deal scored where it did.",
  },
  {
    date: "2026-05-17",
    category: "Feature",
    title: "Lender-ready PDF export (Pro)",
    description:
      "Generate a branded multi-page PDF report — cover, verdict, all metrics, 10-year projection, tax strategy, exit scenarios. Ready to send to lenders, partners, or your future self.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight">
            Changelog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            What&apos;s new in TrueCap — features, improvements, fixes, and
            content. Updated as we ship.
          </p>
        </header>

        <ol className="space-y-5">
          {ENTRIES.map((entry, idx) => {
            const style = CATEGORY_STYLES[entry.category];
            const Icon = style.icon;
            const date = new Date(entry.date);
            return (
              <li
                key={`${entry.date}-${idx}`}
                className="bg-card border border-border rounded-2xl p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      style.bg,
                      style.color
                    )}
                  >
                    <Icon className="size-3" />
                    {entry.category}
                  </span>
                  <time
                    dateTime={entry.date}
                    className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold"
                  >
                    {date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground leading-snug">
                  {entry.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {entry.description}
                </p>
              </li>
            );
          })}
        </ol>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-black mb-2">
            Want to be first to see what&apos;s new?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Sign up for a free account — we&apos;ll surface new features in-product
            as they ship, and you&apos;ll get to use them immediately.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Create free account
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
