/**
 * The homepage hero for cold visitors: the sample deal on a drafting sheet,
 * with the price to drag (DESIGN.md "The homepage", Blueprint; OVERHAUL.md
 * §6.1).
 *
 * Desktop: a 5/7 grid from 1024px, headline and the address form on the
 * left, the sheet in the wider column. The display size eases between 900
 * and 1280px (--text-display) so the headline keeps to four lines and the
 * form stays in the first screen of a 1095x760 window. The investor cue sits
 * ABOVE the address form at every width (founder ruling, 2026-10-03), so the
 * cookie banner cannot cover it on a short phone. Below 1024px: one column,
 * the sheet (its price track and Offer Ceiling first) directly under the form
 * and the risk line, the listing helper line under the sheet (audit A8).
 *
 * SERVER COMPONENT. The sheet is set from the engine's own sample-deal output
 * at build time (lib/sample-deal-ledger.ts, lib/sample-deal-sweep.ts) and
 * ships as HTML at the ceiling state; the price scrubber island hydrates onto
 * it. The other client island is <HeroAddressForm />.
 */

import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { HERO_LISTING_EXPECTATION } from "@/lib/hero-copy";
import { HeroSheet } from "@/components/home/hero-sheet";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { buildSampleDealLedger } from "@/lib/sample-deal-ledger";
import { buildSampleDealSweep } from "@/lib/sample-deal-sweep";
import { cn } from "@/lib/utils";

/** The walkthrough section's anchor (HowTrueCapWorks in landing-sections). */
export const HOMEPAGE_WALKTHROUGH_ID = "how-it-works";

export function MarketingHero() {
  const { homepageHeadline, newHomepagePositioningEnabled } =
    getMarketingOfferConfig();
  const ledger = buildSampleDealLedger();
  const sweep = buildSampleDealSweep();
  return (
    // data-page-hero: this bottom rule is the one rule under the hero; the
    // story Section after it drops its own (components/marketing/section.tsx).
    <section data-page-hero="" className="truecap-marketing-shell border-b border-border bg-background bg-sheet-grid">
      <div
        className={cn(
          PAGE_CONTAINER,
          "grid grid-cols-[minmax(0,1fr)] gap-x-12 pb-12 pt-4 sm:pb-16 sm:pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-y-10 lg:pb-18 lg:pt-8 xl:gap-x-16 xl:pt-14",
        )}
      >
        {/* Below 1024px this column's children join the hero grid
            (display: contents), so the sheet can follow the form and the
            helper line can follow the sheet (audit A8, founder decision
            2026-10-21): on a phone the price track and the Offer Ceiling sit
            directly under the address form. */}
        <div className="contents lg:block lg:min-w-0">
          {/* break-words + hyphens-auto: at zoom-sensitive widths (a 195px
              column) a ten-letter word like "forwarding" is wider than the
              line; the browser may then break or hyphenate it rather than
              overflow (e2e/public-product.spec.ts "reading order"). No effect
              at any width where the words fit. */}
          <h1 className="font-display hyphens-auto break-words text-balance text-display-sm text-foreground lg:text-display">
            {homepageHeadline}
          </h1>
          <p className="mt-4 max-w-[46ch] text-pretty text-lg leading-normal text-muted-foreground sm:mt-5">
            {newHomepagePositioningEnabled
              ? "Screen the listing, check your client's targets, and see the highest price that meets them."
              : "Enter an address, the asking price and a bedroom count for a first-pass screen with labeled, editable assumptions. Pro adds the Offer Ceiling: the highest price that still meets your targets."}
          </p>
          {/* The math supports the decision; it is not the headline. */}
          {newHomepagePositioningEnabled ? (
            <p
              data-hero-supporting-metrics=""
              className={cn(
                "mt-2 text-sm font-medium text-muted-foreground",
                ledger && "hidden sm:block",
              )}
            >
              Cash flow · Cap rate · Cash-on-cash return · DSCR · Editable
              assumptions
            </p>
          ) : null}

          {/* The investor cue (2026-09 agent-first pass): the hero addresses
              the agent, so the investor buying for their own portfolio gets
              one unmissable line pointing at the investor hub. It sits ABOVE
              the form (audit row P1-01): under the form it was covered by
              the cookie banner at 390x664, 393x659, 375x667 and 375x629. No
              rule and 12px margins, so at 375x629 the primary button still
              ends above the banner. */}
          <p data-hero-investor-cue="" className="mt-3 text-base">
            Buying for yourself?{" "}
            {/* A 44px tap target from padding that the negative margin takes
                back out of the line box, so the cue keeps its body leading. */}
            <IntentPrefetchLink href="/for-investors" className="tc-link -my-3 inline-block py-3">
              For investors
            </IntentPrefetchLink>
          </p>

          {/* The one primary action; its secondary is the sample-deal link.
              mt-3 on phones (the form's own default is mt-5): the cue above
              it is the gap. From 640px the form keeps its sm:mt-7. */}
          <HeroAddressForm className="mt-3" listingExpectation={false} />

          {/* The full risk reversal stays next to the primary action at every
              viewport: paid mobile traffic must not have to infer account or
              card requirements. */}
          <p className="mt-3 text-sm text-muted-foreground">
            Free. No account. Your first full decision is included.
          </p>

          {/* Helper line: after the form at every width, so it never moves
              the field or the button; below 1024px it follows the sheet. */}
          <p
            data-hero-listing-expectation=""
            className="mt-2 max-w-[62ch] text-pretty text-sm text-muted-foreground max-lg:order-2 max-lg:mt-5"
          >
            {HERO_LISTING_EXPECTATION}
          </p>
        </div>

        {ledger && sweep ? (
          <div className="min-w-0 max-lg:order-1 max-lg:mt-6 lg:pt-1.5">
            <HeroSheet ledger={ledger} sweep={sweep} walkthroughHref={`#${HOMEPAGE_WALKTHROUGH_ID}`} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
