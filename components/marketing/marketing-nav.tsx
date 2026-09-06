"use client";

/**
 * The site's primary navigation — four destinations, in the order of the
 * story: Analyze | Pricing | Learn. Agent Pro stays out of public navigation
 * until its complete workflow is explicitly released.
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
 */

import Link from "next/link";
import { useState } from "react";
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
  "inline-flex min-h-11 min-w-11 items-center justify-center text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground";

export function MarketingNav() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-5 lg:flex">
      {/* "Analyze" is the product itself — the public analyzer at /analyze. */}
      <Link href="/analyze" prefetch={false} className={linkClass}>
        Analyze
      </Link>
      <Link href="/pricing" className={linkClass}>
        Pricing
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className={`inline-flex items-center gap-1 ${linkClass}`}>
          Learn
          <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {LEARN_LINKS.map((l) => (
            <DropdownMenuItem key={l.href} asChild>
              <Link href={l.href} className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold text-foreground">{l.label}</span>
                <span className="text-xs text-muted-foreground">{l.hint}</span>
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
  const itemClass =
    "flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        data-marketing-mobile-menu-trigger=""
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,88vw)] overflow-y-auto">
        <SheetTitle>Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Site navigation and account links
        </SheetDescription>
        <nav aria-label="Main" data-marketing-mobile-nav="" className="mt-4 flex flex-col gap-1">
          <Link href="/analyze" prefetch={false} className={itemClass} onClick={() => setOpen(false)}>
            Analyze a deal
          </Link>
          <Link href="/pricing" className={itemClass} onClick={() => setOpen(false)}>
            Pricing
          </Link>
          <p className="mt-3 px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Learn
          </p>
          {LEARN_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={itemClass} onClick={() => setOpen(false)}>
              <span>{l.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{l.hint}</span>
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen(false)}
            >
              Sign up free
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
