import { AppLogo } from "@/components/brand/app-logo";
import { HeroSheet } from "@/components/home/hero-sheet";
import { RuledList } from "@/components/marketing/page-parts";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { buildSampleDealLedger } from "@/lib/sample-deal-ledger";
import { buildSampleDealSweep } from "@/lib/sample-deal-sweep";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  /** A string, or a node that renders one (the sign-up page's headline
   *  depends on what the visitor was doing). */
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelTitle?: string;
  panelDescription?: string;
  className?: string;
};

const trustItems = [
  {
    title: "Screen the deal",
    description: "See cash flow, cap rate, CoC, DSCR, Buy Box fit, and a Deal score.",
  },
  {
    title: "Transparent starting data",
    description: "HUD rent and FRED rate benchmarks are labeled and editable. Property tax stays a manual, locally verified input.",
  },
  {
    title: "Private saved work",
    description: "Authenticated access, owner-scoped saved data and privacy controls.",
  },
];

/**
 * The sign-in, sign-up and password screens (DESIGN.md "Token strategy": the
 * auth screens read the same tokens as the rest of the site). Paper page, the
 * site's page container, one logo on the header's single bottom rule, and
 * from 1024px the homepage hero's 5/7 grid: the form in the narrow column
 * with the supporting copy as a ruled list under it, and the sample sheet in
 * the wide one, so the two columns end near each other (2026-11 site
 * elevation; the list used to run on under the sheet, beside empty paper).
 * Below 1024px the screen is the form alone. No card, no photo and nothing
 * that glows or floats; white is the fields and the sheet only.
 * lib/__tests__/auth-design-pass.test.ts pins this.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  panelTitle = "Know what the model needs before you record a decision.",
  panelDescription = "Labeled assumptions. Buy Box fit. Your work saved securely.",
  className,
}: AuthShellProps) {
  // The live mini instrument beside the form (OVERHAUL.md §8, Phase 6): the
  // homepage's sample-deal sheet, server-rendered at the ceiling from the
  // precomputed sweep, so a visitor signing in sees the product it unlocks.
  const ledger = buildSampleDealLedger();
  const sweep = buildSampleDealSweep();
  return (
    <main id="main" className="min-h-[100dvh] bg-background text-foreground">
      <div className={PAGE_CONTAINER}>
        {/* One logo at every width, so the page never shows the mark twice.
            Its tagline shows below lg only, where the aside is hidden. */}
        <div className="border-b border-border py-3 sm:py-4">
          <AppLogo priority subtitleClassName="mt-1 text-sm lg:hidden" />
        </div>

        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-x-16",
            className
          )}
        >
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-display text-balance text-section-sm text-foreground sm:text-section">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 text-pretty text-base text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>

            {children}
            {footer ? <div className="pt-5 text-sm text-muted-foreground">{footer}</div> : null}

            {/* From 1024px only, after everything the form needs: nothing
                is added above the submit button, and a phone shows the form
                and its footer as before. */}
            <div className="mt-10 hidden lg:block">
              <RuledList
                items={trustItems.map((item) => ({
                  key: item.title,
                  term: item.title,
                  detail: item.description,
                }))}
              />

              {/* The line needs 442px. The form column is narrower than that
                  from 1024px to 1279px, where it wrapped with a bullet left
                  hanging at the end of the first line; there the three
                  phrases stack without bullets, and from 1280px they run on
                  one line again. (This block is hidden below 1024px.) */}
              <p className="mt-6 flex flex-col items-start gap-x-2 gap-y-1 text-sm text-muted-foreground xl:flex-row xl:flex-wrap xl:items-center">
                <span>Authenticated access</span>
                <span aria-hidden="true" className="hidden xl:inline">•</span>
                <span>Owner-scoped saved data</span>
                <span aria-hidden="true" className="hidden xl:inline">•</span>
                <span>Privacy controls</span>
              </p>
            </div>
          </div>

          <aside className="hidden min-w-0 lg:block">
            <h2 className="font-display max-w-[30ch] text-balance text-2xl text-foreground xl:max-w-none">
              {panelTitle}
            </h2>
            <p className="mt-3 max-w-[52ch] text-pretty text-base text-muted-foreground xl:max-w-none">
              {panelDescription}
            </p>

            {ledger && sweep ? (
              <div className="mt-5">
                <HeroSheet ledger={ledger} sweep={sweep} walkthroughHref="/#how-it-works" />
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
