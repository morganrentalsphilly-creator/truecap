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
  title: "Changelog",
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

type Category = "Feature" | "Improvement" | "Fix" | "Content" | "Doc";

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
  Doc: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted/60" },
};

const ENTRIES: Entry[] = [
  {
    date: "2026-07-13",
    category: "Feature",
    title: "Your buy box now answers 'so what price WOULD work?'",
    description:
      "When a deal fails your buy box, the verdict card now solves for the highest price that clears your criteria — 'Your number: $272,000' — right on the live analyzer. The Max Offer stress-test also seeds its targets from your buy box instead of generic defaults. Rate-alert emails deep-link each deal to a one-click re-underwrite at the new rate.",
  },
  {
    date: "2026-07-13",
    category: "Improvement",
    title: "Negative live previews suggest the break-even price",
    description:
      "While you type, a deal that doesn't cash-flow now shows 'Breaks even near $X — try that as your offer price' instead of just a red number. Persona pages (/for-brrrr, /for-house-hackers, and friends) pre-select the right strategy when you land on the calculator, and pricing defaults to the monthly view.",
  },
  {
    date: "2026-07-13",
    category: "Content",
    title: "Six new blog posts — ARV, exit cap rate, the 70% rule, and more",
    description:
      "New deep-dives on calculating ARV with the comps method, picking an exit cap rate, the 70% rule for flips and BRRRR, operating expense ratio benchmarks, debt-to-income on investment properties, and buying a rental with tenants in place. Blog catalog now at 66 posts.",
  },
  {
    date: "2026-07-07",
    category: "Feature",
    title: "The Desktop Cockpit — results beside the form, not below it",
    description:
      "On wide screens the analyzer now works like a cockpit: the form on the left, your verdict forming live on the right, no scrolling between edits and answers. Honest extremes ('best case' and 'worst case' at once), a single headline answer with one Why, and an 'Analyze another like this' shortcut that keeps your assumptions.",
  },
  {
    date: "2026-07-06",
    category: "Feature",
    title: "The Verdict Ledger — the analysis reads top-down like an answer",
    description:
      "Full results redesign: one answer card up top (verdict, deal score, the three numbers that decide it), then an accordion ledger of everything else — cash flow waterfall, 10-year view, tax strategy, exit scenarios, stress tests — each row openable without losing your place. A 'Where these numbers came from' row shows the provenance of every input.",
  },
  {
    date: "2026-07-05",
    category: "Improvement",
    title: "Smoother first analysis — multi-family, missing rent, duplicates",
    description:
      "Multi-family no longer walls you out mid-form, a rent recovery path kicks in when HUD has no estimate for the address, 'Duplicate' copies a deal without losing its property type, and the live verdict lights up the moment price + rent exist.",
  },
  {
    date: "2026-07-02",
    category: "Feature",
    title: "Screen Listings — paste a week of listings, get a shortlist",
    description:
      "New Pro power tool at Dashboard → Screen Listings: paste up to 10 listings (free text works — AI extracts the numbers), and every row gets a verdict, deal score, and buy-box fit so you drill into winners instead of underwriting everything.",
  },
  {
    date: "2026-07-02",
    category: "Feature",
    title: "Your buy box everywhere + Deal Q&A that cites its sources",
    description:
      "Buy-box fit badges now appear on My Deals, the dashboard, compare, and shared links; the Pro PDF carries your box so lenders see your criteria. Deal Q&A answers only from this deal's own numbers, comps, max offer, and projections — it will say 'run comps to answer that' rather than guess. Plus: CSV export of My Deals, a lender-reserves note on cash-to-close, and an HUD rent reality-check for multi-family units.",
  },
  {
    date: "2026-07-02",
    category: "Improvement",
    title: "One-click 'Save these as my defaults'",
    description:
      "Tuned your assumptions on a deal? A chip now offers to save the 13 overlay fields (vacancy, management, maintenance, growth rates, financing) as your personal defaults so deal #7 starts from your numbers, not ours.",
  },
  {
    date: "2026-05-25",
    category: "Feature",
    title: "Three new blog posts — best states, 1031, 50% rule",
    description:
      "'Best states for rental property investors in 2026' is a hub piece that cross-links every existing market page; ranks for broad state-level queries and distributes link equity to the city-level guides. '1031 exchange basics' walks individual investors through the 45/180-day windows, QI requirement, like-kind, boot, and reverse-exchange mechanics. 'The 50% rule for rentals' is a tactical post on when the classic triage heuristic actually works and when it lies (TX, FL, pre-1940 stock, STR, high-HOA). Blog catalog now at 12 posts.",
  },
  {
    date: "2026-05-25",
    category: "Feature",
    title: "Three more local-SEO market pages — Detroit, Memphis, Phoenix",
    description:
      "Detroit (legendary cash flow + BRRRR with honest warnings about out-of-state risk), Memphis (turnkey rental capital + TN tax math), Phoenix (high-growth Sun Belt + HOA + STR notes). Same depth as the existing 9 markets. Brings the local-SEO surface to 12 covered metros.",
  },
  {
    date: "2026-05-25",
    category: "Feature",
    title: "Two more blog posts — house hacking + property management decision",
    description:
      "'House hacking explained' walks first-time buyers through FHA 3.5% down, owner-occupant rules, year-2 transition math. 'Should I use a property management company?' lays out the honest break-even math on PM fees vs. self-management. Both target bottom-funnel high-intent queries. Blog catalog now at 9 posts.",
  },
  {
    date: "2026-05-25",
    category: "Doc",
    title: "Solo-executable marketing playbook (docs/MARKETING-PLAYBOOK.md)",
    description:
      "Weekly 5-6 hour playbook Morgan can run alone — three loops (community, content, newsletter), 90-day check-in metrics, what NOT to do, minimum viable weekly schedule. The content queue at the bottom is 8 blog topics ranked by search volume, ready to commission one at a time.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "New analyses pre-fill from your saved defaults",
    description:
      "If you've set personal defaults on /settings (vacancy %, mgmt %, maintenance %, financing, growth rates), every new analysis now opens pre-filled with those values instead of the generic engine defaults. Server-side fetch on the homepage means no flash of generic values before yours overlay. Applies to fresh analyses and to 'New Analysis' resets.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Proactive accessibility + performance fixes",
    description:
      "Pre-applied common Lighthouse + WCAG AA wins before the official audits: aria-labels on icon-only Dashboard/share/template-dialog buttons, label on dashboard search + share URL inputs, removed low-contrast muted-foreground/80 + opacity-70 combinations on body text and toast close buttons, added preconnect for maps.googleapis.com, and a global prefers-reduced-motion CSS rule that respects the OS-level motion preference across all animations.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "First-deal welcome on saved-analyses",
    description:
      "Brand-new users with zero saved deals now see a welcoming 'Save your first deal' message with a clear explanation of what the saved-analyses page is for — instead of the search-y 'No saved analyses found' message that assumed they were filtering. Filtered-empty case keeps its own message.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Bottom dashboard affordances calmed",
    description:
      "Loan Amortization and Compare Financing Scenarios are now perfect siblings — same skeleton, sentence-case titles, no jagged right-side metadata (was a '30 YR' pill on one, slider icon on the other). They read as 'quiet additional views' instead of two more cards demanding attention.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Analysis dashboard density pass",
    description:
      "Tighter sublines under each metric tile (smaller text, lower contrast — supporting context, not headline copy). Reduced vertical spacing between sections of the Cash Flow tab and the gap within the 3-column breakdown so the analysis output reads cleaner top-to-bottom without losing any data.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Deal notes save-after-switch race",
    description:
      "If you blurred the notes textarea then switched to a different saved deal before the save finished, the old deal's content could be marked as the new deal's saved state. Now the save action checks the deal id before persisting, so cross-deal saves discard silently.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Calculate now scrolls to top of results, not page bottom",
    description:
      "Clicking Calculate used to scroll all the way to the footer, which buried the headline metrics + recommendation card under the entire dashboard. Now scrolls to the top of the results dashboard with a small breathing-room offset.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Pricing simplified — removed Team Pro tile",
    description:
      "Team Pro requires real multi-user data model work to do properly. Removed the tile and kept only the one-time PDF report option, which is genuinely useful for non-subscribers and easy to hand-process at current volume. Team can come back when real demand validates the build.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Cap Rate metric tile shows correct sign + color",
    description:
      "The Cap Rate tile was hardcoded to always show a + sign and always render green — even when cap rate was negative (loss-making property). Now: + sign and green only when cap rate ≥ 5%, neutral foreground color between 0-5%, red - sign when negative. Matches the existing CoC and Cash Flow tile behavior.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Dashboard bottom section visually unified",
    description:
      "Loan Amortization and Compare Financing Scenarios now look like sibling cards at the bottom of the Cash Flow tab — same border, padding, chevron icon, and typography. Previously the Compare Financing was a small outline button floating after the Amortization card, which looked sloppy. The ▸ unicode glyph (which rotated unevenly across fonts) was replaced with proper ChevronRight icons.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Deal notes on every saved deal",
    description:
      "Free-text notes per saved deal — seller context, agent commentary, inspector findings, your offer reasoning. Saves automatically on blur. Lives at the top of the analysis dashboard when you re-open a saved deal.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Your analysis defaults on /settings",
    description:
      "Set your preferred vacancy %, management %, maintenance %, CapEx %, financing assumptions, growth rates once on the Settings page — new analyses will pre-fill from these instead of the generic engine defaults. Every field optional.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Three competitor comparison pages",
    description:
      "/vs/dealcheck, /vs/stessa, /vs/mashvisor — honest side-by-side feature matrices with TL;DR pick-which guidance. High commercial-intent SEO targets for investors comparison-shopping.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Five new market pages — Tampa, Charlotte, Indianapolis, Kansas City, Dallas",
    description:
      "Substantive city-specific guides: neighborhood cap-rate maps, local property-tax math, market-specific risks (Tampa insurance, KC reassessment, DFW MUDs, IN property-tax cap). Each ~1,200 words with FAQs and FAQPage schema.org markup for rich-result eligibility.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Two new blog posts",
    description:
      "'How to spot a bad rental deal in 60 seconds — 7 red flags' and 'Cash-on-cash vs IRR: which one tells the truth?' Both hit high-intent investor queries. Bumps the blog catalog to 7 posts.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Annual plan promo banner",
    description:
      "Thin dismissible banner above the site promoting annual Pro savings. Hides on /pricing and /auth/*; dismiss persists in localStorage so we never re-nag someone who said no.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Team plan + one-time PDF tiles on /pricing",
    description:
      "Added 'Other options' section under the feature matrix: a Team Pro tile for brokerages with 3+ seats and a one-time single-deal PDF report tile for non-subscribers who just need one lender package. Both link to hello@usetruecap.com for hand-processing until Stripe prices are wired.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Footer rebalanced — compact brand block, badges in bottom strip",
    description:
      "Brand column was making the footer feel lopsided because it ran taller than the sitemap columns next to it. Brand description trimmed to a single tagline, trust badges relocated to the bottom strip alongside the copyright. All 5 footer columns are now the same height and the footer ends with one clean horizontal band instead of trailing whitespace.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Three new persona landing pages",
    description:
      "Added /for-buy-and-hold (largest segment), /for-house-hackers (FHA + multi-unit owner-occupants), and /for-brrrr (value-add capital recyclers). Each one explains the specific math TrueCap does for that strategy and the matching Pro features. Plus cross-links between all 5 persona pages so a visitor can find their strategy in one click.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Footer polish + 'Who it's for' expansion",
    description:
      "Five persona links now in the 'Who it's for' column: buy-and-hold, house hackers, BRRRR, fix-and-flippers, real estate agents. Brand block has more breathing room, trust badges tightened to a cleaner inline strip (SSL / Cancel anytime / Stripe billing), and the financial-advisor disclaimer was toned down from a heavy bordered card to a soft footnote so the sitemap reads first.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Save status now distinguishes 'Unsaved changes' from 'Preview'",
    description:
      "The status pill on the analysis header now reads 'Saved' (green) when everything is persisted, 'Unsaved changes' (orange) when you've edited a saved deal but haven't re-saved, and 'Preview' (amber) for brand-new analyses. Hover for the full explanation.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Browser prompt if you try to leave with unsaved edits",
    description:
      "If you've edited a saved deal and try to close the tab or navigate away, the browser now warns you so you don't accidentally lose work. Only fires on saved deals with pending edits — never spams for fresh previews or anonymous sessions.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Footer streamlined",
    description:
      "Pruned the Markets column and the Glossary/Methodology/Changelog links from the Product column. Reduces footer noise on every page — pages still exist and remain reachable from search engines + internal links.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Loan amortization mini-view",
    description:
      "Click 'Loan amortization' inside the Cash Flow tab to see a year-by-year breakdown of interest paid, principal paid, and ending loan balance. Collapsed by default so the dashboard stays clean. Self-hides on cash purchases.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Confirm before 'New Analysis' wipes your work",
    description:
      "Clicking New Analysis used to silently nuke the form. Now it asks for confirmation if you have un-saved work, so a misclick can't destroy what you're underwriting.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Mobile polish on new dashboard components",
    description:
      "Waterfall headline tiles now wrap properly on narrow screens. Mortgage compare close button + 'Why this score?' disclosure both hit 44px tap-target standard.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Cmd+Enter (Ctrl+Enter) to calculate",
    description:
      "Power-user keyboard shortcut: anywhere inside the calculator form, press Cmd+Enter on Mac or Ctrl+Enter on Windows/Linux to fire the analysis. No more reaching for the mouse to re-run a deal.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Mortgage compare: cleaner edge-case behavior",
    description:
      "DSCR now shows 'N/A' on cash purchases and 'Negative NOI' (red) when the property is operating at a loss — instead of a confusing negative DSCR number. The '+5pp down' alternative scenario is suppressed when you're already at 95%+ down so the comparison grid stays informative.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Portfolio rollup + waterfall polish",
    description:
      "Portfolio rollup no longer tints exactly-zero cash flow green (now neutral). Cash flow waterfall ARIA label correctly describes outflow vs gross rent on shortfall deals for screen readers.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Analysis dashboard wrapped in error boundary",
    description:
      "If any visualization component (waterfall, mortgage compare, score breakdown, projections) ever throws on a weird input, the dashboard falls back to a 'your numbers are safe' card showing the four headline metrics — the user never sees a blank page mid-analysis.",
  },
  {
    date: "2026-05-24",
    category: "Feature",
    title: "Starter strategy templates",
    description:
      "Five prebuilt starting points — Long-term rental, House hack, FHA 3.5% owner-occupant, BRRRR, Short-term rental — each opens the template editor pre-populated with strategy-correct defaults (down %, rate, vacancy, mgmt fee, depreciation years, etc.). Customize once, save, reuse on every deal. Eliminates the blank-page problem on the templates surface.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Dedicated Net Cash Flow card on Cash Flow tab",
    description:
      "Bottom-line monthly + annual + after-tax cash flow is now a prominent standalone card at the top of the Cash Flow tab — big numbers, color-coded green/red — restored from the older layout. Sits above the waterfall so the answer comes before the explanation.",
  },
  {
    date: "2026-05-24",
    category: "Improvement",
    title: "Net cash flow back-to-prominent in cash flow waterfall",
    description:
      "The waterfall card now shows Gross Rent and Net Cash Flow side-by-side at the top of the card in big numbers — green when positive, red on shortfall — so the bottom-line answer is the first thing you see. Per-segment breakdown stays below as supporting detail.",
  },
  {
    date: "2026-05-24",
    category: "Fix",
    title: "Removed glitchy 'Start from' templates row",
    description:
      "The 3 strategy template chips (Long-term rental / House hack / FHA 3.5% down) were causing more confusion than value. Cut. The 'Try a sample deal' button stays — it's the primary friction-killer.",
  },
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
    title: "Deal Score + AI verdict (free)",
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Changelog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            What&apos;s new in TrueCap — features, improvements, fixes, and
            content. Updated as we ship.
          </p>
        </header>

        <ol className="space-y-5">
          {ENTRIES.map((entry, idx) => {
            // Defensive: fall back to the Content style if a category
            // somehow doesn't exist in CATEGORY_STYLES (next.config has
            // ignoreBuildErrors: true, so a TS-illegal category value
            // can slip past compile and crash the prerender at runtime).
            const style = CATEGORY_STYLES[entry.category] ?? CATEGORY_STYLES.Content;
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
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
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
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
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
