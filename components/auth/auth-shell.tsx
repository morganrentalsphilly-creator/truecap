import { AppLogo } from "@/components/brand/app-logo";
import { RuledList } from "@/components/marketing/page-parts";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
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
 * from 1024px the homepage hero's 5/7 grid: the form in the narrow column,
 * the supporting copy as a ruled list in the wide one. No card, no photo and
 * nothing that glows or floats; white is the fields only.
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
          </div>

          <aside className="hidden min-w-0 lg:block">
            <h2 className="font-display max-w-[30ch] text-balance text-2xl text-foreground">
              {panelTitle}
            </h2>
            <p className="mt-3 max-w-[52ch] text-pretty text-base text-muted-foreground">
              {panelDescription}
            </p>

            <RuledList
              className="mt-8"
              items={trustItems.map((item) => ({
                key: item.title,
                term: item.title,
                detail: item.description,
              }))}
            />

            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>Authenticated access</span>
              <span aria-hidden="true">•</span>
              <span>Owner-scoped saved data</span>
              <span aria-hidden="true">•</span>
              <span>Privacy controls</span>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
