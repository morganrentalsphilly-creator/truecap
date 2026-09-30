"use client";

/**
 * The site's primary navigation, agent-first (2026-09 pass):
 * Analyze | For agents | For investors | Pricing | Learn.
 *
 * Both audiences get a named destination because a visitor decides "is this
 * for me?" from the first screen; the homepage hero speaks to agents, so the
 * investor entry point has to be unmissable in the header. "For agents"
 * resolves through agentsHref(): the persona page where Agent Pro is sold,
 * the plan cards otherwise (see components/marketing/agent-pro-config.tsx).
 *
 * Why this exists: the header carried NO marketing nav at all. A visitor on the
 * homepage could reach /pricing (via the Pro pill) and nothing else — every
 * other page (methodology, the /vs comparisons, the blog, free educational tools,
 * the glossary) was reachable only from the footer. That is a large part of why
 * the site read as several disconnected products rather than one.
 *
 * "Learn" is a dropdown rather than four more top-level items on purpose: those
 * pages are the SEO surface and must stay one click away, but they should not
 * compete with the product for a first-time visitor's attention. Every URL is
 * unchanged, and the footer keeps its full link graph — this only ADDS paths in,
 * so nothing can be orphaned by it.
 *
 * Signed-in users don't see it: they get the dashboard sidebar, and marketing
 * chrome would only crowd the app.
 *
 * The current page's link carries aria-current="page" and is set in Signal
 * Blue (DESIGN.md: blue marks "the active nav item"); "Learn" turns blue on
 * any page under one of its links. The state is applied after hydration: the
 * server renders every link at rest, because a page reached through the
 * proxy's rewrite ("/" or "/analyze" to /home-authed) is rendered for another
 * pathname than the browser shows, and a server-side guess would not match
 * the client (a hydration mismatch). Static pages stay static.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { agentsHref, useAgentProConfigured } from "@/components/marketing/agent-pro-config";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LEARN_LINKS: { label: string; href: string; hint: string }[] = [
  { label: "How we calculate", href: "/methodology", hint: "Every formula, shown" },
  { label: "Free calculators", href: "/tools", hint: "Mortgage, GRM, vacancy, rehab…" },
  { label: "Compare tools", href: "/vs", hint: "TrueCap vs the alternatives" },
  { label: "Guides", href: "/blog", hint: "How to underwrite, explained" },
  { label: "Glossary", href: "/glossary", hint: "Plain-English definitions" },
];

const linkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center text-base font-medium text-muted-foreground transition-colors hover:text-foreground";

/** The current page's link, marked by aria-current, in Signal Blue. */
const CURRENT_LINK = "aria-[current=page]:text-primary aria-[current=page]:hover:text-primary-deep";

const subscribeToNothing = () => () => {};

/**
 * The pathname once hydrated, null before: the server and the hydrating
 * client both render every link at rest (see the note at the top).
 */
function useHydratedPathname(): string | null {
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const pathname = usePathname();
  return hydrated ? pathname : null;
}

/**
 * aria-current for a link: "page" on the page it points at. A link with a
 * fragment ("/pricing#plans", the agent entry where Agent Pro is not sold)
 * points into another page's section, so it never marks the page.
 * Exported for lib/__tests__/shared-visual-guards.test.tsx.
 */
export function currentFor(pathname: string | null, href: string): "page" | undefined {
  return pathname !== null && !href.includes("#") && pathname === href ? "page" : undefined;
}

/** Whether a page sits under one of Learn's links (exported for the same test). */
export function isUnderLearn(pathname: string | null): boolean {
  return (
    pathname !== null &&
    LEARN_LINKS.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
  );
}

export function MarketingNav() {
  const forAgents = agentsHref(useAgentProConfigured());
  const pathname = useHydratedPathname();
  const navLink = cn(linkClass, CURRENT_LINK);
  return (
    <nav aria-label="Main" className="hidden items-center gap-5 lg:flex">
      {/* "Analyze" is the product itself — the public analyzer at /analyze. */}
      <Link href="/analyze" prefetch={false} aria-current={currentFor(pathname, "/analyze")} className={navLink}>
        Analyze
      </Link>
      <Link href={forAgents} aria-current={currentFor(pathname, forAgents)} className={navLink}>
        For agents
      </Link>
      <Link href="/for-investors" aria-current={currentFor(pathname, "/for-investors")} className={navLink}>
        For investors
      </Link>
      <Link href="/pricing" aria-current={currentFor(pathname, "/pricing")} className={navLink}>
        Pricing
      </Link>
      <DropdownMenu>
        {/* A button, not a link to the page, so it carries no aria-current:
            its blue says the page sits in one of its sections, and the
            menu item for the page itself carries aria-current. */}
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1",
            linkClass,
            isUnderLearn(pathname) && "text-primary hover:text-primary-deep",
          )}
        >
          Learn
          <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {LEARN_LINKS.map((l) => (
            <DropdownMenuItem key={l.href} asChild>
              <Link
                href={l.href}
                aria-current={currentFor(pathname, l.href)}
                className="group/learn flex flex-col items-start gap-0.5"
              >
                <span className="text-sm font-semibold text-foreground group-aria-[current=page]/learn:text-primary">
                  {l.label}
                </span>
                <span className="text-sm text-muted-foreground">{l.hint}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

/**
 * Mobile counterpart — ONE header row. The header shows logo + a primary
 * "Analyze" button; everything else (Pricing, the Learn pages, sign in /
 * sign up) lives behind this hamburger. The old flat second row pushed the
 * hero below the fold on phones.
 */
export function MarketingMobileMenu() {
  const [open, setOpen] = useState(false);
  const forAgents = agentsHref(useAgentProConfigured());
  const pathname = useHydratedPathname();
  const itemClass =
    "flex min-h-12 flex-col justify-center rounded-md px-3 py-2 text-base font-semibold text-foreground transition-colors hover:bg-accent aria-[current=page]:text-primary";
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        data-marketing-mobile-menu-trigger=""
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,88vw)] gap-0 overflow-y-auto px-4 pb-6 pt-4">
        {/* Title row is padded to the close button's 44px hit box so the two
            sit on one line instead of the title hugging the drawer corner. */}
        <SheetTitle className="flex min-h-11 items-center px-3 pr-12 text-lg">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Site navigation and account links
        </SheetDescription>
        <nav aria-label="Main" data-marketing-mobile-nav="" className="mt-4 flex flex-col gap-1">
          <Link
            href="/analyze"
            prefetch={false}
            aria-current={currentFor(pathname, "/analyze")}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            Analyze a deal
          </Link>
          <Link
            href={forAgents}
            aria-current={currentFor(pathname, forAgents)}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            For agents
          </Link>
          <Link
            href="/for-investors"
            aria-current={currentFor(pathname, "/for-investors")}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            For investors
          </Link>
          <Link
            href="/pricing"
            aria-current={currentFor(pathname, "/pricing")}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            Pricing
          </Link>
          <p className="mt-3 border-t border-rule-soft px-3 pt-3 text-sm font-semibold text-muted-foreground">
            Learn
          </p>
          {LEARN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={currentFor(pathname, l.href)}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <span>{l.label}</span>
              <span className="mt-0.5 text-sm font-normal text-muted-foreground">{l.hint}</span>
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-input px-4 text-base font-semibold text-foreground transition-colors hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
              onClick={() => setOpen(false)}
            >
              Create account
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
