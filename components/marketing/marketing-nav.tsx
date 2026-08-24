"use client";

/**
 * The site's primary navigation — four destinations, in the order of the
 * story: Analyze | Pricing | For Agents | Learn.
 *
 * Why this exists: the header carried NO marketing nav at all. A visitor on the
 * homepage could reach /pricing (via the Pro pill) and nothing else — every
 * other page (methodology, the /vs comparisons, the blog, 19 free calculators,
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
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LEARN_LINKS: { label: string; href: string; hint: string }[] = [
  { label: "How we calculate", href: "/methodology", hint: "Every formula, shown" },
  { label: "Free calculators", href: "/tools", hint: "Cap rate, DSCR, BRRRR…" },
  { label: "Compare tools", href: "/vs", hint: "TrueCap vs the alternatives" },
  { label: "Guides", href: "/blog", hint: "How to underwrite, explained" },
  { label: "Glossary", href: "/glossary", hint: "Plain-English definitions" },
];

const linkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground";

export function MarketingNav() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-5 lg:flex">
      {/* "Analyze" is the product itself — the homepage analyzer. */}
      <Link href="/" className={linkClass}>
        Analyze
      </Link>
      <Link href="/pricing" className={linkClass}>
        Pricing
      </Link>
      <Link href="/for-agents" className={linkClass}>
        For Agents
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
 * Mobile counterpart — a flat row of the same destinations under the header.
 * A dropdown on a phone hides the SEO pages behind two taps, so Learn resolves
 * to the methodology page and the rest stay in the footer, which mobile users
 * reach by scrolling anyway.
 */
export function MarketingNavMobile() {
  return (
    <nav
      aria-label="Main"
      className="flex items-center gap-4 overflow-x-auto border-b border-border bg-card/60 px-4 py-2 lg:hidden"
    >
      <Link href="/" className={`${linkClass} whitespace-nowrap`}>
        Analyze
      </Link>
      <Link href="/pricing" className={`${linkClass} whitespace-nowrap`}>
        Pricing
      </Link>
      <Link href="/for-agents" className={`${linkClass} whitespace-nowrap`}>
        For Agents
      </Link>
      <Link href="/methodology" className={`${linkClass} whitespace-nowrap`}>
        Learn
      </Link>
    </nav>
  );
}
